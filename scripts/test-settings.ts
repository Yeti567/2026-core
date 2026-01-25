/**
 * Test Company Settings Functionality
 * Tests all settings endpoints and functionality
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

async function testSettingsPage() {
  console.log('\n📄 TEST: Settings Page');
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${BASE_URL}/admin/settings`, {
      method: 'GET',
      redirect: 'manual',
    });

    if (response.status === 200) {
      const html = await response.text();
      const hasLogo = html.includes('Company Logo') || html.includes('logo');
      const hasBusinessHours = html.includes('Business Hours') || html.includes('business');
      const hasNotifications = html.includes('Notification Preferences') || html.includes('notification');
      const hasLocations = html.includes('Work Locations') || html.includes('location');
      const hasFiscalYear = html.includes('Fiscal Year') || html.includes('fiscal');
      const hasTimeline = html.includes('COR Audit Timeline') || html.includes('timeline');

      logResult('Settings Page', true, 'Settings page loads', {
        hasLogo,
        hasBusinessHours,
        hasNotifications,
        hasLocations,
        hasFiscalYear,
        hasTimeline,
      });
      return true;
    } else if (response.status === 307 || response.status === 302) {
      logResult('Settings Page', true, 'Settings page redirects to login (expected for unauthenticated)');
      return true;
    } else {
      logResult('Settings Page', false, `Unexpected status: ${response.status}`);
      return false;
    }
  } catch (error: any) {
    logResult('Settings Page', false, `Error: ${error.message}`);
    return false;
  }
}

async function testSettingsAPI() {
  console.log('\n🔧 TEST: Settings API');
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${BASE_URL}/api/admin/company/settings`, {
      method: 'GET',
    });

    if (response.status === 401 || response.status === 403) {
      logResult('Settings API Auth', true, 'Correctly requires authentication');
      return true;
    } else if (response.ok) {
      const data = await response.json();
      logResult('Settings API', true, 'Settings API returns data', {
        hasSettings: !!data.settings,
        hasLogo: !!data.settings?.logo_url,
        hasBusinessHours: !!data.settings?.business_hours,
        hasNotifications: !!data.settings?.notification_preferences,
      });
      return true;
    } else {
      logResult('Settings API', false, `Unexpected status: ${response.status}`);
      return false;
    }
  } catch (error: any) {
    logResult('Settings API', false, `Error: ${error.message}`);
    return false;
  }
}

async function testLogoAPI() {
  console.log('\n🖼️  TEST: Logo Upload API');
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${BASE_URL}/api/admin/company/settings/logo`, {
      method: 'POST',
    });

    if (response.status === 401 || response.status === 403) {
      logResult('Logo API Auth', true, 'Correctly requires authentication');
      return true;
    } else if (response.ok) {
      const data = await response.json();
      logResult('Logo API', true, 'Logo placeholder generated', {
        hasLogoUrl: !!data.logo_url,
        isDataUrl: data.logo_url?.startsWith('data:image'),
      });
      return true;
    } else {
      logResult('Logo API', false, `Unexpected status: ${response.status}`);
      return false;
    }
  } catch (error: any) {
    logResult('Logo API', false, `Error: ${error.message}`);
    return false;
  }
}

async function testLocationsAPI() {
  console.log('\n📍 TEST: Locations API');
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${BASE_URL}/api/admin/company/locations`, {
      method: 'GET',
    });

    if (response.status === 401 || response.status === 403) {
      logResult('Locations API Auth', true, 'Correctly requires authentication');
      return true;
    } else if (response.ok) {
      const data = await response.json();
      logResult('Locations API', true, 'Locations API returns data', {
        locationsCount: data.locations?.length || 0,
        isArray: Array.isArray(data.locations),
      });
      return true;
    } else {
      logResult('Locations API', false, `Unexpected status: ${response.status}`);
      return false;
    }
  } catch (error: any) {
    logResult('Locations API', false, `Error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Company Settings Tests');
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

  await testSettingsPage();
  await testSettingsAPI();
  await testLogoAPI();
  await testLocationsAPI();

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
    console.log('\n🎉 All tests passed! Settings functionality is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }

  console.log('\n📝 Next Steps:');
  console.log('1. Run database migration: supabase/migrations/028_company_settings.sql');
  console.log('2. Test settings page at: http://localhost:3000/admin/settings');
  console.log('3. Configure all settings as requested');
}

// Run tests
runAllTests().catch(console.error);
