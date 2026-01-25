/**
 * Multi-Tenant Isolation Test
 * 
 * Tests that the safe query wrapper correctly isolates data between companies.
 * Run with: npm run test:isolation
 * 
 * Prerequisites:
 * - Supabase project with migrations applied
 * - SUPABASE_SERVICE_ROLE_KEY set (bypasses RLS for test setup)
 */

import { createClient } from '@supabase/supabase-js';
import { createSafeQuery, createSuperAdminQuery } from '../../lib/db/safe-query';
import type { Database } from '../../lib/db/types';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗');
  process.exit(1);
}

async function testIsolation() {
  // Service role client bypasses RLS for test setup
  const supabase = createClient<Database>(supabaseUrl!, serviceRoleKey!);

  console.log('🧪 Testing multi-tenant isolation...\n');
  console.log('═'.repeat(50));

  let companyA: { id: string } | null = null;
  let companyB: { id: string } | null = null;
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // =========================================================================
    // SETUP: Create two test companies
    // =========================================================================
    console.log('\n📦 Setting up test data...');

    const { data: companyAData, error: companyAError } = await supabase
      .from('companies')
      .insert({ name: 'Test Company A', wsib_number: 'WSIB-A-001' })
      .select()
      .single();

    if (companyAError) throw new Error(`Failed to create Company A: ${companyAError.message}`);
    companyA = companyAData;
    console.log(`   ✓ Created Company A: ${companyA.id.slice(0, 8)}...`);

    const { data: companyBData, error: companyBError } = await supabase
      .from('companies')
      .insert({ name: 'Test Company B', wsib_number: 'WSIB-B-001' })
      .select()
      .single();

    if (companyBError) throw new Error(`Failed to create Company B: ${companyBError.message}`);
    companyB = companyBData;
    console.log(`   ✓ Created Company B: ${companyB.id.slice(0, 8)}...`);

    // Add workers to each company
    const { error: workersError } = await supabase.from('workers').insert([
      { company_id: companyA.id, first_name: 'Alice', last_name: 'Anderson', email: 'alice@companya.com' },
      { company_id: companyA.id, first_name: 'Adam', last_name: 'Adams', email: 'adam@companya.com' },
      { company_id: companyB.id, first_name: 'Bob', last_name: 'Brown', email: 'bob@companyb.com' },
    ]);

    if (workersError) throw new Error(`Failed to create workers: ${workersError.message}`);
    console.log('   ✓ Created test workers (2 for A, 1 for B)');

    // =========================================================================
    // TEST 1: Company A can only see its own workers
    // =========================================================================
    console.log('\n' + '─'.repeat(50));
    console.log('TEST 1: Company A isolation');
    console.log('─'.repeat(50));

    const queryA = createSafeQuery(supabase, companyA.id, 'admin');
    const workersA = await queryA.workers.list();

    if (workersA.error) {
      console.log(`   ❌ Query failed: ${workersA.error.message}`);
      testsFailed++;
    } else {
      const count = workersA.data?.length || 0;
      const hasAlice = workersA.data?.some(w => w.first_name === 'Alice');
      const hasAdam = workersA.data?.some(w => w.first_name === 'Adam');
      const hasBob = workersA.data?.some(w => w.first_name === 'Bob');

      console.log(`   Workers found: ${count}`);
      console.log(`   ✓ Count is 2: ${count === 2 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   ✓ Contains Alice: ${hasAlice ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   ✓ Contains Adam: ${hasAdam ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   ✓ Does NOT contain Bob: ${!hasBob ? '✅ PASS' : '❌ FAIL (DATA LEAK!)'}`);

      if (count === 2 && hasAlice && hasAdam && !hasBob) {
        testsPassed++;
      } else {
        testsFailed++;
      }
    }

    // =========================================================================
    // TEST 2: Company B can only see its own workers
    // =========================================================================
    console.log('\n' + '─'.repeat(50));
    console.log('TEST 2: Company B isolation');
    console.log('─'.repeat(50));

    const queryB = createSafeQuery(supabase, companyB.id, 'admin');
    const workersB = await queryB.workers.list();

    if (workersB.error) {
      console.log(`   ❌ Query failed: ${workersB.error.message}`);
      testsFailed++;
    } else {
      const count = workersB.data?.length || 0;
      const hasBob = workersB.data?.some(w => w.first_name === 'Bob');
      const hasAlice = workersB.data?.some(w => w.first_name === 'Alice');

      console.log(`   Workers found: ${count}`);
      console.log(`   ✓ Count is 1: ${count === 1 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   ✓ Contains Bob: ${hasBob ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   ✓ Does NOT contain Alice: ${!hasAlice ? '✅ PASS' : '❌ FAIL (DATA LEAK!)'}`);

      if (count === 1 && hasBob && !hasAlice) {
        testsPassed++;
      } else {
        testsFailed++;
      }
    }

    // =========================================================================
    // TEST 3: Super admin can see ALL workers
    // =========================================================================
    console.log('\n' + '─'.repeat(50));
    console.log('TEST 3: Super admin cross-company access');
    console.log('─'.repeat(50));

    const superAdminQuery = createSuperAdminQuery(supabase, 'super_admin');
    const allWorkers = await superAdminQuery.workers.list();

    if (allWorkers.error) {
      console.log(`   ❌ Query failed: ${allWorkers.error.message}`);
      testsFailed++;
    } else {
      const count = allWorkers.data?.length || 0;
      const hasAlice = allWorkers.data?.some(w => w.first_name === 'Alice');
      const hasBob = allWorkers.data?.some(w => w.first_name === 'Bob');

      console.log(`   Workers found: ${count}`);
      console.log(`   ✓ Count >= 3: ${count >= 3 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   ✓ Contains Alice: ${hasAlice ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   ✓ Contains Bob: ${hasBob ? '✅ PASS' : '❌ FAIL'}`);

      if (count >= 3 && hasAlice && hasBob) {
        testsPassed++;
      } else {
        testsFailed++;
      }
    }

    // =========================================================================
    // TEST 4: Non-super_admin cannot use super admin query
    // =========================================================================
    console.log('\n' + '─'.repeat(50));
    console.log('TEST 4: Super admin role check');
    console.log('─'.repeat(50));

    try {
      createSuperAdminQuery(supabase, 'admin');
      console.log(`   ✓ Throws error for non-super_admin: ❌ FAIL (no error thrown)`);
      testsFailed++;
    } catch (error: any) {
      const correctError = error.message.includes('Super admin role required');
      console.log(`   ✓ Throws error for non-super_admin: ${correctError ? '✅ PASS' : '❌ FAIL'}`);
      if (correctError) {
        testsPassed++;
      } else {
        testsFailed++;
      }
    }

    // =========================================================================
    // TEST 5: getById enforces company isolation
    // =========================================================================
    console.log('\n' + '─'.repeat(50));
    console.log('TEST 5: getById isolation');
    console.log('─'.repeat(50));

    // Get Bob's ID
    const { data: bobData } = await supabase
      .from('workers')
      .select('id')
      .eq('first_name', 'Bob')
      .single();

    if (bobData) {
      // Company A should NOT be able to get Bob by ID
      const { data: shouldBeNull, error } = await queryA.workers.getById(bobData.id);
      
      const blocked = !shouldBeNull || error;
      console.log(`   ✓ Company A cannot get Company B's worker by ID: ${blocked ? '✅ PASS' : '❌ FAIL (DATA LEAK!)'}`);
      
      if (blocked) {
        testsPassed++;
      } else {
        testsFailed++;
      }
    }

  } finally {
    // =========================================================================
    // CLEANUP
    // =========================================================================
    console.log('\n' + '─'.repeat(50));
    console.log('🧹 Cleaning up test data...');

    if (companyA || companyB) {
      const companyIds = [companyA?.id, companyB?.id].filter(Boolean);
      
      await supabase.from('workers').delete().in('company_id', companyIds);
      await supabase.from('companies').delete().in('id', companyIds);
      
      console.log('   ✓ Test data removed');
    }
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
    console.log('\n❌ SOME TESTS FAILED - Review isolation implementation\n');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED - Multi-tenant isolation is working!\n');
    process.exit(0);
  }
}

testIsolation().catch((error) => {
  console.error('\n❌ Test suite failed:', error.message);
  process.exit(1);
});
