/**
 * Invitation Schema Tests
 * 
 * Tests the worker_invitations table and related functions:
 * - Company registration
 * - Token generation
 * - Invitation creation
 * - Duplicate prevention
 * - Cross-company isolation
 * 
 * Run with: npx tsx test/auth/invitation-schema-test.ts
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗');
  process.exit(1);
}

// Create service role client (bypasses RLS for testing)
const supabase = createClient(supabaseUrl, serviceRoleKey);

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function log(test: string, passed: boolean, details?: string) {
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} ${test}`);
  if (details && !passed) {
    console.log(`     └─ ${details}`);
  }
  results.push({ name: test, passed, details });
}

async function testInvitationSchema() {
  console.log('🧪 Testing Invitation Schema...\n');

  let companyId: string | null = null;
  let company2Id: string | null = null;
  let invitationId: string | null = null;

  try {
    // =========================================================================
    // TEST 1: Company Registration
    // =========================================================================
    console.log('TEST 1: Company Registration');
    
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: 'Test Construction Ltd',
        wsib_number: '123456789',
        company_email: 'admin@testconstruction.com',
        address: '123 Test Street',
        city: 'Ottawa',
        province: 'ON',
        postal_code: 'K1A 0A1',
        phone: '(613) 555-1234',
        registration_status: 'active'
      })
      .select()
      .single();

    log('Company created', !!company && !companyError, companyError?.message);
    
    if (company) {
      companyId = company.id;
      log('Company has ID', !!company.id);
      log('Company has WSIB', company.wsib_number === '123456789');
      log('Company status is active', company.registration_status === 'active');
    }

    // =========================================================================
    // TEST 2: Token Generation
    // =========================================================================
    console.log('\nTEST 2: Token Generation');

    const { data: token1, error: tokenError1 } = await supabase.rpc('generate_invitation_token');
    log('Token generated', !!token1 && !tokenError1, tokenError1?.message);
    log('Token is 32 characters', token1?.length === 32, `Length: ${token1?.length}`);
    log('Token is hexadecimal', /^[a-f0-9]+$/i.test(token1 || ''));

    // Generate second token to verify uniqueness
    const { data: token2 } = await supabase.rpc('generate_invitation_token');
    log('Tokens are unique', token1 !== token2);

    // =========================================================================
    // TEST 3: Create Worker Invitation
    // =========================================================================
    console.log('\nTEST 3: Create Worker Invitation');

    if (!companyId || !token1) {
      console.log('  ⚠️ Skipping - no company or token');
    } else {
      const { data: invitation, error: invError } = await supabase
        .from('worker_invitations')
        .insert({
          company_id: companyId,
          email: 'worker@testconstruction.com',
          first_name: 'John',
          last_name: 'Worker',
          position: 'Concrete Finisher',
          role: 'worker',
          invitation_token: token1
        })
        .select()
        .single();

      log('Invitation created', !!invitation && !invError, invError?.message);
      
      if (invitation) {
        invitationId = invitation.id;
        log('Status is pending', invitation.status === 'pending');
        log('Has expiration date', !!invitation.expires_at);
        
        // Check expiration is ~7 days from now
        const expiresAt = new Date(invitation.expires_at);
        const now = new Date();
        const daysDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        log('Expires in ~7 days', daysDiff >= 6 && daysDiff <= 8, `Days: ${daysDiff.toFixed(1)}`);
        
        log('Has created_at', !!invitation.created_at);
        log('Role is worker', invitation.role === 'worker');
      }
    }

    // =========================================================================
    // TEST 4: Duplicate Invitation Prevention
    // =========================================================================
    console.log('\nTEST 4: Duplicate Invitation Prevention');

    if (!companyId) {
      console.log('  ⚠️ Skipping - no company');
    } else {
      const { data: newToken } = await supabase.rpc('generate_invitation_token');
      
      const { error: duplicateError } = await supabase
        .from('worker_invitations')
        .insert({
          company_id: companyId,
          email: 'worker@testconstruction.com', // Same email as TEST 3
          first_name: 'Jane',
          last_name: 'Duplicate',
          position: 'Supervisor',
          role: 'supervisor',
          invitation_token: newToken
        });

      log('Duplicate pending invitation blocked', !!duplicateError);
      
      if (duplicateError) {
        log('Error is constraint violation', 
          duplicateError.message.includes('unique') || 
          duplicateError.message.includes('exclude') ||
          duplicateError.code === '23P01' ||
          duplicateError.code === '23505'
        );
      }
    }

    // =========================================================================
    // TEST 5: Cross-Company Isolation
    // =========================================================================
    console.log('\nTEST 5: Cross-Company Isolation (Service Role)');

    // Create second company
    const { data: company2, error: company2Error } = await supabase
      .from('companies')
      .insert({
        name: 'Other Company Ltd',
        wsib_number: '987654321',
        company_email: 'admin@othercompany.com',
        registration_status: 'active'
      })
      .select()
      .single();

    log('Second company created', !!company2 && !company2Error, company2Error?.message);
    
    if (company2) {
      company2Id = company2.id;
    }

    // Note: With service role, we CAN insert cross-company (no RLS restriction)
    // This test verifies the service role bypass works as expected
    // In production, client-side would be blocked by RLS
    if (company2Id) {
      const { data: crossToken } = await supabase.rpc('generate_invitation_token');
      
      const { data: crossInvite, error: crossError } = await supabase
        .from('worker_invitations')
        .insert({
          company_id: company2Id,
          email: 'worker@othercompany.com',
          first_name: 'Cross',
          last_name: 'Company',
          position: 'Worker',
          role: 'worker',
          invitation_token: crossToken
        })
        .select()
        .single();

      // Service role SHOULD be able to create this (no RLS)
      log('Service role can insert any company', !!crossInvite && !crossError);
      
      // Clean up cross-company invitation
      if (crossInvite) {
        await supabase.from('worker_invitations').delete().eq('id', crossInvite.id);
      }
    }

    // =========================================================================
    // TEST 6: Invitation Details Function
    // =========================================================================
    console.log('\nTEST 6: Get Invitation Details Function');

    if (!token1) {
      console.log('  ⚠️ Skipping - no token');
    } else {
      const { data: details, error: detailsError } = await supabase
        .rpc('get_invitation_details', { p_invitation_token: token1 });

      log('Function returns result', !!details && !detailsError, detailsError?.message);
      
      if (details) {
        log('Result has valid flag', 'valid' in details);
        log('Invitation is valid', details.valid === true);
        
        if (details.invitation) {
          log('Has company name', !!details.invitation.company_name);
          log('Has worker info', !!details.invitation.first_name && !!details.invitation.last_name);
        }
      }
    }

    // =========================================================================
    // TEST 7: Invalid Token Handling
    // =========================================================================
    console.log('\nTEST 7: Invalid Token Handling');

    const { data: invalidResult } = await supabase
      .rpc('get_invitation_details', { p_invitation_token: 'invalid_token_12345' });

    log('Invalid token returns valid=false', invalidResult?.valid === false);
    log('Invalid token has error message', !!invalidResult?.error);

    // =========================================================================
    // TEST 8: Expiration Check Function
    // =========================================================================
    console.log('\nTEST 8: Expiration Check Function');

    const { data: expiredCount, error: expireError } = await supabase
      .rpc('check_invitation_expired');

    log('Expiration function works', expireError === null);
    log('Returns count', typeof expiredCount === 'number');

    // =========================================================================
    // TEST 9: Role Constraints
    // =========================================================================
    console.log('\nTEST 9: Role Constraints');

    if (!companyId) {
      console.log('  ⚠️ Skipping - no company');
    } else {
      const { data: roleToken } = await supabase.rpc('generate_invitation_token');
      
      // Test invalid role
      const { error: invalidRoleError } = await supabase
        .from('worker_invitations')
        .insert({
          company_id: companyId,
          email: 'invalid@test.com',
          first_name: 'Invalid',
          last_name: 'Role',
          position: 'Test',
          role: 'invalid_role' as any, // Invalid role
          invitation_token: roleToken
        });

      log('Invalid role rejected', !!invalidRoleError);
    }

    // =========================================================================
    // CLEANUP
    // =========================================================================
    console.log('\n🧹 Cleaning up test data...');

    if (invitationId) {
      await supabase.from('worker_invitations').delete().eq('id', invitationId);
    }
    if (companyId) {
      await supabase.from('worker_invitations').delete().eq('company_id', companyId);
      await supabase.from('companies').delete().eq('id', companyId);
    }
    if (company2Id) {
      await supabase.from('worker_invitations').delete().eq('company_id', company2Id);
      await supabase.from('companies').delete().eq('id', company2Id);
    }

    console.log('  ✓ Cleanup complete');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\n  Total:  ${total}`);
  console.log(`  Passed: ${passed} ✅`);
  console.log(`  Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`\n  Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n  Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`    ❌ ${r.name}`);
      if (r.details) console.log(`       └─ ${r.details}`);
    });
  }

  console.log('\n🎉 Invitation schema tests complete!\n');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
testInvitationSchema();
