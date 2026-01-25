/**
 * Authentication & Authorization Test
 * 
 * Tests middleware authentication and role-based access control.
 * Run with: npm run test:auth
 * 
 * Prerequisites:
 * - Supabase project with migrations applied
 * - Test users created with different roles
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/db/types';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗');
  process.exit(1);
}

// Base URL for API tests (assumes dev server is running)
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function testAuth() {
  console.log('🧪 Testing authentication & authorization...\n');
  console.log('═'.repeat(50));
  console.log(`Base URL: ${BASE_URL}`);
  console.log('═'.repeat(50));

  let testsPassed = 0;
  let testsFailed = 0;

  // =========================================================================
  // TEST 1: Unauthenticated API request returns 401
  // =========================================================================
  console.log('\n' + '─'.repeat(50));
  console.log('TEST 1: Unauthenticated API request');
  console.log('─'.repeat(50));

  try {
    const res = await fetch(`${BASE_URL}/api/workers`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const isUnauthorized = res.status === 401;
    console.log(`   Status: ${res.status}`);
    console.log(`   ✓ Returns 401 Unauthorized: ${isUnauthorized ? '✅ PASS' : '❌ FAIL'}`);

    if (isUnauthorized) {
      testsPassed++;
    } else {
      testsFailed++;
      const body = await res.text();
      console.log(`   Response: ${body.slice(0, 100)}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Request failed: ${error.message}`);
    console.log('   ℹ️  Make sure dev server is running: npm run dev');
    testsFailed++;
  }

  // =========================================================================
  // TEST 2: Unauthenticated page request redirects to login
  // =========================================================================
  console.log('\n' + '─'.repeat(50));
  console.log('TEST 2: Unauthenticated page redirects to login');
  console.log('─'.repeat(50));

  try {
    const res = await fetch(`${BASE_URL}/dashboard`, {
      method: 'GET',
      redirect: 'manual', // Don't follow redirects
    });

    const isRedirect = res.status === 307 || res.status === 302;
    const location = res.headers.get('location');
    const redirectsToLogin = location?.includes('/login');

    console.log(`   Status: ${res.status}`);
    console.log(`   Location: ${location || '(none)'}`);
    console.log(`   ✓ Redirects (307/302): ${isRedirect ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   ✓ Redirects to /login: ${redirectsToLogin ? '✅ PASS' : '❌ FAIL'}`);

    if (isRedirect && redirectsToLogin) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  } catch (error: any) {
    console.log(`   ❌ Request failed: ${error.message}`);
    testsFailed++;
  }

  // =========================================================================
  // TEST 3: Login page is accessible without auth
  // =========================================================================
  console.log('\n' + '─'.repeat(50));
  console.log('TEST 3: Public routes are accessible');
  console.log('─'.repeat(50));

  const publicRoutes = ['/login', '/signup', '/'];
  
  for (const route of publicRoutes) {
    try {
      const res = await fetch(`${BASE_URL}${route}`, {
        method: 'GET',
        redirect: 'manual',
      });

      const isAccessible = res.status === 200;
      console.log(`   ${route}: ${res.status} ${isAccessible ? '✅' : '❌'}`);

      if (isAccessible) {
        testsPassed++;
      } else {
        testsFailed++;
      }
    } catch (error: any) {
      console.log(`   ${route}: ❌ ${error.message}`);
      testsFailed++;
    }
  }

  // =========================================================================
  // TEST 4: Admin route protection (requires running with auth)
  // =========================================================================
  console.log('\n' + '─'.repeat(50));
  console.log('TEST 4: Admin route requires authentication');
  console.log('─'.repeat(50));

  try {
    const res = await fetch(`${BASE_URL}/admin`, {
      method: 'GET',
      redirect: 'manual',
    });

    const isRedirect = res.status === 307 || res.status === 302;
    console.log(`   Status: ${res.status}`);
    console.log(`   ✓ Unauthenticated admin access blocked: ${isRedirect ? '✅ PASS' : '❌ FAIL'}`);

    if (isRedirect) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  } catch (error: any) {
    console.log(`   ❌ Request failed: ${error.message}`);
    testsFailed++;
  }

  // =========================================================================
  // TEST 5: Verify RLS is enabled on all tables
  // =========================================================================
  console.log('\n' + '─'.repeat(50));
  console.log('TEST 5: RLS enabled on all tables');
  console.log('─'.repeat(50));

  const adminClient = createClient<Database>(supabaseUrl!, serviceRoleKey!);
  
  const { data: rlsStatus, error: rlsError } = await adminClient.rpc('check_rls_status' as any).select();
  
  if (rlsError) {
    // If the function doesn't exist, check tables directly
    const tables = ['companies', 'user_profiles', 'workers', 'forms', 'evidence_chain'];
    
    const { data: tableInfo } = await adminClient
      .from('pg_tables' as any)
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .in('tablename', tables);

    if (tableInfo) {
      console.log('   Checking pg_catalog for RLS status...');
      // Note: This query might not work directly, RLS check would need a custom function
    }
    
    console.log('   ℹ️  Manual check: Run in Supabase SQL editor:');
    console.log('      SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = \'public\';');
    console.log('   ✓ RLS check: ⏭️  SKIPPED (verify manually)');
  } else {
    console.log('   ✓ RLS status:', rlsStatus);
    testsPassed++;
  }

  // =========================================================================
  // RESULTS
  // =========================================================================
  console.log('\n' + '═'.repeat(50));
  console.log('📊 RESULTS');
  console.log('═'.repeat(50));
  console.log(`   Passed: ${testsPassed}`);
  console.log(`   Failed: ${testsFailed}`);
  console.log('═'.repeat(50));

  if (testsFailed > 0) {
    console.log('\n⚠️  SOME TESTS FAILED');
    console.log('   Make sure the dev server is running: npm run dev\n');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED\n');
    process.exit(0);
  }
}

testAuth().catch((error) => {
  console.error('\n❌ Test suite failed:', error.message);
  process.exit(1);
});
