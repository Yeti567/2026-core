/**
 * Test COR Roadmap Functionality
 * Tests the COR roadmap page and element display
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

async function testRoadmapPage() {
  console.log('\n🗺️  TEST: COR Roadmap Page');
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${BASE_URL}/cor-roadmap`, {
      method: 'GET',
      redirect: 'manual',
    });

    if (response.status === 200) {
      const html = await response.text();
      const hasElements = html.includes('Element') || html.includes('COR');
      const hasTimeline = html.includes('Timeline') || html.includes('timeline');
      const hasDocumentation = html.includes('Documentation') || html.includes('Required');
      const hasDependencies = html.includes('Dependencies') || html.includes('Depends');
      
      // Check for all 14 elements
      const elementCount = (html.match(/Element \d+/g) || []).length;
      const hasAll14 = elementCount >= 14;

      logResult('Roadmap Page', true, 'Roadmap page loads', {
        hasElements,
        hasTimeline,
        hasDocumentation,
        hasDependencies,
        elementCount,
        hasAll14,
      });
      return hasAll14;
    } else if (response.status === 307 || response.status === 302) {
      logResult('Roadmap Page', true, 'Roadmap page redirects to login (expected for unauthenticated)');
      return true;
    } else {
      logResult('Roadmap Page', false, `Unexpected status: ${response.status}`);
      return false;
    }
  } catch (error: any) {
    logResult('Roadmap Page', false, `Error: ${error.message}`);
    return false;
  }
}

async function testRoadmapData() {
  console.log('\n📊 TEST: Roadmap Data Structure');
  console.log('='.repeat(60));

  try {
    // Import the roadmap data (this would need to be done server-side or via API)
    // For now, we'll check if the page contains expected element names
    const response = await fetch(`${BASE_URL}/cor-roadmap`, {
      method: 'GET',
      redirect: 'manual',
    });

    if (response.status === 200 || response.status === 307 || response.status === 302) {
      const html = response.status === 200 ? await response.text() : '';
      
      const expectedElements = [
        'Health & Safety Policy',
        'Hazard Assessment',
        'Safe Work Practices',
        'Safe Job Procedures',
        'Company Safety Rules',
        'Personal Protective Equipment',
        'Preventative Maintenance',
        'Training & Communication',
        'Workplace Inspections',
        'Incident Investigation',
        'Emergency Preparedness',
        'Statistics & Records',
        'Legislation & Compliance',
        'Management Review',
      ];

      const foundElements = expectedElements.filter(name => 
        html.includes(name) || html.includes(name.replace('&', 'and'))
      );

      logResult('Roadmap Data', foundElements.length === 14, `Found ${foundElements.length}/14 elements`, {
        found: foundElements.length,
        expected: 14,
        missing: expectedElements.filter(name => 
          !html.includes(name) && !html.includes(name.replace('&', 'and'))
        ),
      });

      return foundElements.length === 14;
    } else {
      logResult('Roadmap Data', true, 'Page requires authentication (expected)');
      return true;
    }
  } catch (error: any) {
    logResult('Roadmap Data', false, `Error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting COR Roadmap Tests');
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

  await testRoadmapPage();
  await testRoadmapData();

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
    console.log('\n🎉 All tests passed! COR Roadmap is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }

  console.log('\n📝 Next Steps:');
  console.log('1. Navigate to: http://localhost:3000/cor-roadmap');
  console.log('2. Review all 14 COR elements');
  console.log('3. Check documentation requirements');
  console.log('4. Review dependencies and recommended order');
  console.log('5. View the 9-month timeline');
}

// Run tests
runAllTests().catch(console.error);
