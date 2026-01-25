/**
 * Quick Verification Script
 * Checks if server is running and tests key endpoints
 */

const BASE_URL = 'http://localhost:3000';

async function quickVerify() {
  console.log('🔍 Quick System Verification');
  console.log('='.repeat(60));
  console.log(`Testing: ${BASE_URL}\n`);

  const checks = [];

  // Check 1: Server is running
  try {
    const response = await fetch(`${BASE_URL}`, { method: 'GET' });
    checks.push({
      name: 'Server Running',
      passed: response.status < 500,
      message: `Server responded with status ${response.status}`
    });
  } catch (error: any) {
    checks.push({
      name: 'Server Running',
      passed: false,
      message: `Server not accessible: ${error.message}`
    });
    console.log('❌ Server is not running. Please start with: npm run dev\n');
    return;
  }

  // Check 2: Registration endpoint exists
  try {
    const response = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    });
    // Should return 400 (validation error) not 404
    checks.push({
      name: 'Registration API',
      passed: response.status !== 404,
      message: response.status === 404 ? 'Endpoint not found' : `Endpoint exists (status: ${response.status})`
    });
  } catch (error: any) {
    checks.push({
      name: 'Registration API',
      passed: false,
      message: `Error: ${error.message}`
    });
  }

  // Check 3: Welcome page route exists
  try {
    const response = await fetch(`${BASE_URL}/welcome`, {
      method: 'GET',
      redirect: 'manual'
    });
    checks.push({
      name: 'Welcome Page',
      passed: response.status !== 404,
      message: response.status === 404 ? 'Page not found' : `Page exists (status: ${response.status})`
    });
  } catch (error: any) {
    checks.push({
      name: 'Welcome Page',
      passed: false,
      message: `Error: ${error.message}`
    });
  }

  // Check 4: Dashboard route exists
  try {
    const response = await fetch(`${BASE_URL}/dashboard`, {
      method: 'GET',
      redirect: 'manual'
    });
    checks.push({
      name: 'Dashboard Page',
      passed: response.status !== 404,
      message: response.status === 404 ? 'Page not found' : `Page exists (status: ${response.status})`
    });
  } catch (error: any) {
    checks.push({
      name: 'Dashboard Page',
      passed: false,
      message: `Error: ${error.message}`
    });
  }

  // Check 5: Phases API exists
  try {
    const response = await fetch(`${BASE_URL}/api/phases`, {
      method: 'GET'
    });
    checks.push({
      name: 'Phases API',
      passed: response.status !== 404,
      message: response.status === 404 ? 'Endpoint not found' : `Endpoint exists (status: ${response.status})`
    });
  } catch (error: any) {
    checks.push({
      name: 'Phases API',
      passed: false,
      message: `Error: ${error.message}`
    });
  }

  // Summary
  console.log('\n📊 Verification Results:');
  console.log('='.repeat(60));
  
  checks.forEach(check => {
    const icon = check.passed ? '✅' : '❌';
    console.log(`${icon} ${check.name}: ${check.message}`);
  });

  const passed = checks.filter(c => c.passed).length;
  const total = checks.length;

  console.log(`\n✅ Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All checks passed! System is ready for testing.');
    console.log('\nNext steps:');
    console.log('1. Run migration: supabase/migrations/027_add_company_industry.sql');
    console.log('2. Test registration at: http://localhost:3000/register');
    console.log('3. Follow docs/MANUAL_TESTING_CHECKLIST.md');
  } else {
    console.log('\n⚠️  Some checks failed. Please review above.');
  }
}

quickVerify().catch(console.error);
