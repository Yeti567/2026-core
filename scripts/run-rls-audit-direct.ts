/**
 * Direct PostgreSQL RLS Audit Runner
 * 
 * This script connects directly to PostgreSQL to run security audit queries.
 * Requires direct database connection (not via Supabase REST API).
 * 
 * Usage:
 *   npx tsx scripts/run-rls-audit-direct.ts
 * 
 * Requirements:
 *   - DATABASE_URL in .env.local (PostgreSQL connection string)
 *   - pg library: npm install pg @types/pg
 *   - tsx: npm install -D tsx
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL || 
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error('❌ Missing DATABASE_URL environment variable');
  console.error('   Please set DATABASE_URL in .env.local');
  console.error('   Format: postgresql://user:password@host:port/database');
  process.exit(1);
}

interface AuditResult {
  name: string;
  success: boolean;
  rowCount: number;
  data?: any[];
  error?: string;
  expectedResult: string;
  critical?: boolean;
}

const auditQueries: Array<{
  name: string;
  query: string;
  expectedResult: string;
  critical?: boolean;
}> = [
  {
    name: 'Tables Without RLS',
    query: `
      SELECT 
        schemaname,
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND rowsecurity = false
      ORDER BY tablename;
    `,
    expectedResult: '0 rows (all tables should have RLS enabled)',
    critical: true,
  },
  {
    name: 'Weak RLS Policies (USING (true))',
    query: `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd as command,
        qual as using_clause,
        with_check
      FROM pg_policies 
      WHERE schemaname = 'public'
        AND qual = 'true'
      ORDER BY tablename, policyname;
    `,
    expectedResult: '0-5 rows (review each - should only be public reference data)',
  },
  {
    name: 'Public Access (anon role)',
    query: `
      SELECT 
        table_schema,
        table_name,
        grantee,
        privilege_type
      FROM information_schema.table_privileges 
      WHERE table_schema = 'public' 
        AND grantee = 'anon'
      ORDER BY table_name, privilege_type;
    `,
    expectedResult: '0 rows or minimal (only public reference data)',
    critical: true,
  },
  {
    name: 'Public Functions',
    query: `
      SELECT 
        r.routine_schema,
        r.routine_name,
        r.routine_type,
        r.security_type,
        r.data_type as return_type,
        rp.privilege_type
      FROM information_schema.routines r
      JOIN information_schema.routine_privileges rp 
        ON r.routine_schema = rp.routine_schema 
        AND r.routine_name = rp.routine_name
      WHERE r.routine_schema = 'public'
        AND rp.grantee = 'anon'
      ORDER BY r.routine_name;
    `,
    expectedResult: '0-2 rows (invitation flow functions)',
  },
  {
    name: 'Tables Without Policies',
    query: `
      SELECT 
        t.tablename,
        COUNT(p.policyname) as policy_count,
        STRING_AGG(DISTINCT p.cmd::text, ', ') as operations_covered
      FROM pg_tables t
      LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
      WHERE t.schemaname = 'public'
        AND t.rowsecurity = true
      GROUP BY t.tablename
      HAVING COUNT(p.policyname) = 0
      ORDER BY t.tablename;
    `,
    expectedResult: '0 rows (all tables should have policies)',
    critical: true,
  },
  {
    name: 'Security Summary',
    query: `
      SELECT 
        'Tables with RLS' as check_type,
        COUNT(*)::text as count,
        CASE 
          WHEN COUNT(*) = (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public')
          THEN '✅ All tables have RLS'
          ELSE '⚠️ Some tables missing RLS'
        END as status
      FROM pg_tables 
      WHERE schemaname = 'public' AND rowsecurity = true

      UNION ALL

      SELECT 
        'Total RLS Policies' as check_type,
        COUNT(*)::text as count,
        'Policies configured' as status
      FROM pg_policies 
      WHERE schemaname = 'public'

      UNION ALL

      SELECT 
        'Tables with Public Access' as check_type,
        COUNT(DISTINCT table_name)::text as count,
        CASE 
          WHEN COUNT(DISTINCT table_name) = 0
          THEN '✅ No public access'
          ELSE '⚠️ Review public access'
        END as status
      FROM information_schema.table_privileges 
      WHERE table_schema = 'public' AND grantee = 'anon'

      UNION ALL

      SELECT 
        'Public Functions' as check_type,
        COUNT(*)::text as count,
        CASE 
          WHEN COUNT(*) <= 2
          THEN '✅ Minimal public functions'
          ELSE '⚠️ Review public functions'
        END as status
      FROM information_schema.routines r
      WHERE r.routine_schema = 'public'
        AND EXISTS (
          SELECT 1 
          FROM information_schema.routine_privileges rp
          WHERE rp.routine_schema = r.routine_schema
            AND rp.routine_name = r.routine_name
            AND rp.grantee = 'anon'
        );
    `,
    expectedResult: 'Summary with ✅ status indicators',
  },
];

async function runAudit() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    console.log('🔍 Starting Supabase RLS Security Audit...\n');

    const results: AuditResult[] = [];

    for (const { name, query, expectedResult, critical } of auditQueries) {
      try {
        console.log(`Running: ${name}...`);
        
        const result = await client.query(query.trim());
        const rowCount = result.rows.length;
        const status = critical && rowCount > 0 ? '❌ CRITICAL' : rowCount === 0 ? '✅ PASS' : '⚠️ REVIEW';

        results.push({
          name,
          success: true,
          rowCount,
          data: result.rows,
          expectedResult,
          critical,
        });

        console.log(`  ${status} - Found ${rowCount} row(s)`);
        if (expectedResult) {
          console.log(`  Expected: ${expectedResult}`);
        }
        
        if (critical && rowCount > 0) {
          console.log(`  ⚠️  CRITICAL ISSUE: ${name}`);
          if (result.rows.length <= 5) {
            console.log(`  Data:`, JSON.stringify(result.rows, null, 2));
          } else {
            console.log(`  First 5 rows:`, JSON.stringify(result.rows.slice(0, 5), null, 2));
          }
        }
        
        console.log('');
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error';
        results.push({
          name,
          success: false,
          rowCount: 0,
          error: errorMessage,
          expectedResult,
          critical,
        });
        console.log(`  ❌ ERROR: ${errorMessage}\n`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 AUDIT SUMMARY');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const criticalIssues = results.filter(r => 
      r.success && 
      r.rowCount > 0 && 
      r.critical
    ).length;

    console.log(`✅ Successful queries: ${successful}/${results.length}`);
    console.log(`❌ Failed queries: ${failed}/${results.length}`);
    console.log(`🚨 Critical issues found: ${criticalIssues}`);

    if (criticalIssues > 0) {
      console.log('\n⚠️  ACTION REQUIRED: Critical security issues detected!');
      console.log('   Please review the results above and fix issues immediately.');
    }

    // Save results to file
    const { writeFile } = await import('fs/promises');
    const reportPath = 'supabase-rls-audit-results.json';
    await writeFile(
      reportPath,
      JSON.stringify(results, null, 2),
      'utf-8'
    );
    console.log(`\n📄 Detailed results saved to: ${reportPath}`);

    return results;
  } catch (error: any) {
    console.error('❌ Database connection error:', error.message);
    console.error('\n💡 Tip: Make sure DATABASE_URL is set correctly in .env.local');
    console.error('   Format: postgresql://user:password@host:port/database');
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run audit
runAudit().catch(console.error);
