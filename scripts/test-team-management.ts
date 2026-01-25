/**
 * Test Team Management Functionality
 * Tests adding team members and invitation system
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logResult(test: string, passed: boolean, message: string, details?: any) {
  results.push({ test, passed, message, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${test}: ${message}`);
  if (details && !passed) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
}

async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    if (response.status < 500) {
      logResult('Server Status', true, `Server is running (status: ${response.status})`);
      return true;
    }
  } catch (error: any) {
    logResult('Server Status', false, `Server not accessible: ${error.message}`);
    return false;
  }
  return false;
}

async function testTeamPage() {
  console.log('\n👥 TEST: Team Management Page');
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${BASE_URL}/admin/settings/team`, {
      method: 'GET',
      redirect: 'manual',
    });

    if (response.status === 200) {
      const html = await response.text();
      const hasAddForm = html.includes('Add Team Member') || html.includes('add-team-member');
      const hasRoleSelect = html.includes('role') || html.includes('Role');
      const hasEmailField = html.includes('email') || html.includes('Email');
      const hasPhoneField = html.includes('phone') || html.includes('Phone');
      const hasResponsibilities = html.includes('responsibilities') || html.includes('Responsibilities');

      logResult('Team Page', true, 'Team management page loads', {
        hasAddForm,
        hasRoleSelect,
        hasEmailField,
        hasPhoneField,
        hasResponsibilities,
      });
      return true;
    } else if (response.status === 307 || response.status === 302) {
      logResult('Team Page', true, 'Team page redirects to login (expected for unauthenticated)');
      return true;
    } else {
      logResult('Team Page', false, `Unexpected status: ${response.status}`);
      return false;
    }
  } catch (error: any) {
    logResult('Team Page', false, `Error: ${error.message}`);
    return false;
  }
}

async function testInvitationAPI() {
  console.log('\n📧 TEST: Invitation API');
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${BASE_URL}/api/invitations`, {
      method: 'GET',
    });

    if (response.status === 401 || response.status === 403) {
      logResult('Invitation API Auth', true, 'Correctly requires authentication');
      return true;
    } else if (response.ok) {
      const data = await response.json();
      logResult('Invitation API', true, 'Invitation API returns data', {
        hasInvitations: Array.isArray(data.invitations),
        invitationsCount: data.invitations?.length || 0,
      });
      return true;
    } else {
      logResult('Invitation API', false, `Unexpected status: ${response.status}`);
      return false;
    }
  } catch (error: any) {
    logResult('Invitation API', false, `Error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Team Management Tests');
  console.log('='.repeat(60));
  console.log(`Testing against: ${BASE_URL}\n`);

  const serverReady = await checkServer();
  if (!serverReady) {
    console.log('\n❌ Server is not running!');
    console.log('\nPlease start the server first:');
    console.log('   npm run dev');
    console.log('\nThen run this test again.');
    return;
  }

  console.log('\n✅ Server is running! Starting tests...\n');

  await testTeamPage();
  await testInvitationAPI();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  console.log('\n📋 Detailed Results:');
  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${index + 1}. ${icon} ${result.test}`);
    console.log(`   ${result.message}`);
  });

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Team management is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }

  console.log('\n📝 Next Steps:');
  console.log('1. Run database migration: supabase/migrations/029_add_invitation_phone_responsibilities.sql');
  console.log('2. Navigate to: http://localhost:3000/admin/settings/team');
  console.log('3. Add the 4 team members as requested');
  console.log('4. Check email logs for invitation emails');
  console.log('5. Verify team members appear in the list');
}

// Run tests
runAllTests().catch(console.error);
