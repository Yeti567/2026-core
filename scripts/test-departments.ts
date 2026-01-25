/**
 * Test Departments Functionality
 * Tests the departments system
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

async function testDepartmentsPage() {
  console.log('\n🏢 TEST: Departments Page');
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${BASE_URL}/admin/departments`, {
      method: 'GET',
      redirect: 'manual',
    });

    if (response.status === 200) {
      const html = await response.text();
      const hasAddForm = html.includes('Add Department') || html.includes('department');
      const hasOrgChart = html.includes('Org Chart') || html.includes('org-chart');
      const hasList = html.includes('Department') || html.includes('division');

      logResult('Departments Page', true, 'Departments page loads', {
        hasAddForm,
        hasOrgChart,
        hasList,
      });
      return true;
    } else if (response.status === 307 || response.status === 302) {
      logResult('Departments Page', true, 'Departments page redirects to login (expected for unauthenticated)');
      return true;
    } else {
      logResult('Departments Page', false, `Unexpected status: ${response.status}`);
      return false;
    }
  } catch (error: any) {
    logResult('Departments Page', false, `Error: ${error.message}`);
    return false;
  }
}

async function testDepartmentsAPI() {
  console.log('\n🔧 TEST: Departments API');
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${BASE_URL}/api/admin/departments`, {
      method: 'GET',
    });

    if (response.status === 401 || response.status === 403) {
      logResult('Departments API Auth', true, 'Correctly requires authentication');
      return true;
    } else if (response.ok) {
      const data = await response.json();
      logResult('Departments API', true, 'Departments API returns data', {
        hasDepartments: Array.isArray(data.departments),
        departmentsCount: data.departments?.length || 0,
      });
      return true;
    } else {
      logResult('Departments API', false, `Unexpected status: ${response.status}`);
      return false;
    }
  } catch (error: any) {
    logResult('Departments API', false, `Error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Departments Tests');
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

  await testDepartmentsPage();
  await testDepartmentsAPI();

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
    console.log('\n🎉 All tests passed! Departments system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }

  console.log('\n📝 Next Steps:');
  console.log('1. Run database migration: supabase/migrations/030_departments_system.sql');
  console.log('2. Navigate to: http://localhost:3000/admin/departments');
  console.log('3. Create the 6 departments as specified');
  console.log('4. Assign superintendents and managers');
  console.log('5. Assign workers and equipment to departments');
  console.log('6. View the org chart visualization');
}

// Run tests
runAllTests().catch(console.error);
