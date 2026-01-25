/**
 * Supabase RLS Security Audit Runner
 * 
 * This script runs security audit queries against your Supabase database
 * to verify RLS configuration, policies, and access controls.
 * 
 * Usage:
 *   npx tsx scripts/run-rls-audit.ts
 * 
 * Requirements:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - tsx installed: npm install -D tsx
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease ensure these are set in your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface AuditResult {
  query: string;
  name: string;
  success: boolean;
  data?: any[];
  error?: string;
  expectedResult?: string;
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
    name: 'Company Isolation Policies',
    query: `
      SELECT 
        tablename,
        policyname,
        cmd as command,
        qual as using_clause
      FROM pg_policies 
      WHERE schemaname = 'public'
        AND (
          qual LIKE '%get_user_company_id%' OR
          qual LIKE '%company_id%'
        )
      ORDER BY tablename, policyname;
    `,
    expectedResult: 'Many rows (most tables should have company isolation)',
  },
  {
    name: 'Role-Based Access Policies',
    query: `
      SELECT 
        tablename,
        policyname,
        roles,
        cmd as command,
        qual as using_clause
      FROM pg_policies 
      WHERE schemaname = 'public'
        AND roles IS NOT NULL
        AND roles != '{authenticated}'
      ORDER BY tablename, policyname;
    `,
    expectedResult: 'Rows for admin/supervisor-specific policies',
  },
  {
    name: 'SECURITY DEFINER Functions',
    query: `
      SELECT 
        routine_schema,
        routine_name,
        routine_type,
        security_type
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
        AND security_type = 'DEFINER'
      ORDER BY routine_name;
    `,
    expectedResult: 'Some functions (helper functions)',
  },
  {
    name: 'Sensitive Tables Policy Coverage',
    query: `
      WITH sensitive_tables AS (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
          AND tablename IN (
            'user_profiles', 'workers', 'documents', 
            'form_submissions', 'worker_certifications',
            'auditsoft_connections', 'push_subscriptions',
            'maintenance_records', 'equipment_inventory',
            'documents', 'document_versions', 'form_templates'
          )
      )
      SELECT 
        st.tablename,
        COUNT(p.policyname) as policy_count,
        STRING_AGG(DISTINCT p.cmd::text, ', ') as operations
      FROM sensitive_tables st
      LEFT JOIN pg_policies p ON st.tablename = p.tablename AND p.schemaname = 'public'
      GROUP BY st.tablename
      ORDER BY st.tablename;
    `,
    expectedResult: 'All tables should have multiple policies',
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
  console.log('🔍 Starting Supabase RLS Security Audit...\n');
  console.log(`📊 Supabase URL: ${supabaseUrl}\n`);

  const results: AuditResult[] = [];

  for (const { name, query, expectedResult, critical } of auditQueries) {
    try {
      console.log(`Running: ${name}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: query 
      });

      // If RPC doesn't work, try direct query (may require different approach)
      if (error) {
        // Try alternative: use PostgREST if available, or direct connection
        throw new Error(`Query execution failed: ${error.message}`);
      }

      const rowCount = Array.isArray(data) ? data.length : 0;
      const status = critical && rowCount > 0 ? '❌ CRITICAL' : rowCount === 0 ? '✅ PASS' : '⚠️ REVIEW';

      results.push({
        query,
        name,
        success: true,
        data: Array.isArray(data) ? data : [],
        expectedResult,
      });

      console.log(`  ${status} - Found ${rowCount} row(s)`);
      if (expectedResult) {
        console.log(`  Expected: ${expectedResult}`);
      }
      
      if (critical && rowCount > 0 && Array.isArray(data)) {
        console.log(`  ⚠️  CRITICAL ISSUE: ${name}`);
        console.log(`  Data:`, JSON.stringify(data, null, 2));
      }
      
      console.log('');
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      results.push({
        query,
        name,
        success: false,
        error: errorMessage,
        expectedResult,
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
    Array.isArray(r.data) && 
    r.data.length > 0 && 
    auditQueries.find(q => q.name === r.name)?.critical
  ).length;

  console.log(`✅ Successful queries: ${successful}/${results.length}`);
  console.log(`❌ Failed queries: ${failed}/${results.length}`);
  console.log(`🚨 Critical issues found: ${criticalIssues}`);

  if (criticalIssues > 0) {
    console.log('\n⚠️  ACTION REQUIRED: Critical security issues detected!');
    console.log('   Please review the results above and fix issues immediately.');
  }

  // Save results to file
  const fs = await import('fs/promises');
  const reportPath = 'supabase-rls-audit-results.json';
  await fs.writeFile(
    reportPath,
    JSON.stringify(results, null, 2),
    'utf-8'
  );
  console.log(`\n📄 Detailed results saved to: ${reportPath}`);

  return results;
}

// Note: This script requires a custom RPC function or direct database access
// Since Supabase doesn't expose raw SQL execution via client, we need an alternative approach
console.warn(`
⚠️  NOTE: This script requires one of the following:
   1. A custom RPC function 'exec_sql' in Supabase (not recommended for security)
   2. Direct PostgreSQL connection (using pg library)
   3. Manual execution in Supabase SQL Editor (recommended)

For now, please use the manual review guide:
   - See: SUPABASE_MANUAL_REVIEW_GUIDE.md
   - SQL Script: scripts/manual-rls-review.sql
`);

// Uncomment to run (after setting up proper database access):
// runAudit().catch(console.error);

export { runAudit };
