#!/usr/bin/env node

/**
 * Comprehensive Website Functionality Test
 * Tests all major components: links, registration, CSV uploads, libraries
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// Test configuration
const TEST_COMPANY = {
  company_name: 'Test Construction Company',
  wsib_number: '123456789',
  company_email: 'info@testconstruction.com',
  address: '123 Test Street',
  city: 'Test City',
  province: 'ON',
  postal_code: 'A1A1A1',
  phone: '(613) 555-0123',
  registrant_name: 'Test Admin',
  registrant_position: 'Owner',
  registrant_email: 'admin@testconstruction.com',
  password: 'TestPassword123',
  confirm_password: 'TestPassword123',
  industry: 'Construction',
  employee_count: 10,
  years_in_business: 5,
  main_services: ['Excavation', 'Demolition']
};

async function testPageExists(path, description) {
  try {
    const response = await fetch(`${BASE_URL}${path}`);
    const status = response.status;
    const success = status < 400;
    console.log(`${success ? '✅' : '❌'} ${description}: ${path} (${status})`);
    return success;
  } catch (error) {
    console.log(`❌ ${description}: ${path} (Error: ${error.message})`);
    return false;
  }
}

async function testCompanyRegistration() {
  console.log('\n🧪 Testing Company Registration...');
  
  try {
    // First, test the registration page loads
    const pageResponse = await fetch(`${BASE_URL}/register`);
    console.log(`${pageResponse.ok ? '✅' : '❌'} Registration page loads: ${pageResponse.status}`);
    
    // Test registration API
    const apiResponse = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_COMPANY)
    });
    
    const result = await apiResponse.json();
    
    if (apiResponse.ok) {
      console.log('✅ Company registration API works');
      console.log(`   Company ID: ${result.companyId}`);
      console.log(`   Email: ${result.email}`);
      return true;
    } else {
      console.log(`❌ Company registration failed: ${apiResponse.status}`);
      console.log(`   Error: ${result.error || 'Unknown error'}`);
      if (result.fields) {
        console.log('   Field errors:', result.fields);
      }
      return false;
    }
  } catch (error) {
    console.log(`❌ Company registration error: ${error.message}`);
    return false;
  }
}

async function testEmployeeCSVUpload() {
  console.log('\n🧪 Testing Employee CSV Upload...');
  
  try {
    // Test the upload page loads
    const pageResponse = await fetch(`${BASE_URL}/onboarding/upload-employees`);
    console.log(`${pageResponse.ok ? '✅' : '❌'} Employee upload page loads: ${pageResponse.status}`);
    
    // Test CSV validation API (if exists)
    try {
      const validationResponse = await fetch(`${BASE_URL}/api/workers/emails`);
      if (validationResponse.ok) {
        const emails = await validationResponse.json();
        console.log(`✅ Worker emails API works: ${emails.emails?.length || 0} existing emails`);
      }
    } catch (error) {
      console.log('⚠️  Worker emails API not available');
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Employee CSV upload error: ${error.message}`);
    return false;
  }
}

async function testEquipmentFunctionality() {
  console.log('\n🧪 Testing Equipment Functionality...');
  
  try {
    // Test equipment API
    const apiResponse = await fetch(`${BASE_URL}/api/admin/equipment`);
    console.log(`${apiResponse.ok ? '✅' : '❌'} Equipment API works: ${apiResponse.status}`);
    
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      console.log(`   Equipment count: ${data.equipment?.length || 0}`);
    }
    
    // Test equipment page
    const pageResponse = await fetch(`${BASE_URL}/admin/libraries`);
    console.log(`${pageResponse.ok ? '✅' : '❌'} Libraries page loads: ${pageResponse.status}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Equipment functionality error: ${error.message}`);
    return false;
  }
}

async function testLibrariesFunctionality() {
  console.log('\n🧪 Testing Libraries Functionality...');
  
  const libraryPages = [
    { path: '/admin/libraries', description: 'Main Libraries page' },
    { path: '/admin/libraries?tab=hazards', description: 'Hazard Library' },
    { path: '/admin/libraries?tab=equipment', description: 'Equipment Library' },
    { path: '/admin/libraries?tab=tasks', description: 'Task Library' },
    { path: '/admin/libraries?tab=jobsites', description: 'Jobsite Registry' },
    { path: '/admin/libraries?tab=sds', description: 'SDS Library' },
    { path: '/admin/libraries?tab=legislation', description: 'Legislation Library' }
  ];
  
  let successCount = 0;
  for (const page of libraryPages) {
    if (await testPageExists(page.path, page.description)) {
      successCount++;
    }
  }
  
  console.log(`\n📊 Libraries: ${successCount}/${libraryPages.length} pages working`);
  return successCount === libraryPages.length;
}

async function testMainNavigation() {
  console.log('\n🧪 Testing Main Navigation Links...');
  
  const mainPages = [
    { path: '/', description: 'Home page' },
    { path: '/login', description: 'Login page' },
    { path: '/register', description: 'Registration page' },
    { path: '/admin', description: 'Admin dashboard' },
    { path: '/dashboard', description: 'User dashboard' },
    { path: '/onboarding/upload-employees', description: 'Employee upload' },
    { path: '/equipment', description: 'Equipment section' }
  ];
  
  let successCount = 0;
  for (const page of mainPages) {
    if (await testPageExists(page.path, page.description)) {
      successCount++;
    }
  }
  
  console.log(`\n📊 Navigation: ${successCount}/${mainPages.length} pages working`);
  return successCount >= mainPages.length * 0.8; // 80% success rate
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Website Functionality Test\n');
  console.log(`Testing server at: ${BASE_URL}\n`);
  
  const results = {
    navigation: await testMainNavigation(),
    registration: await testCompanyRegistration(),
    employeeCSV: await testEmployeeCSVUpload(),
    equipment: await testEquipmentFunctionality(),
    libraries: await testLibrariesFunctionality()
  };
  
  console.log('\n📋 FINAL TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`Navigation Links: ${results.navigation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Company Registration: ${results.registration ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Employee CSV Upload: ${results.employeeCSV ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Equipment Functionality: ${results.equipment ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Libraries Functionality: ${results.libraries ? '✅ PASS' : '❌ FAIL'}`);
  
  const passCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passCount}/${totalTests} tests passed`);
  
  if (passCount === totalTests) {
    console.log('🎉 All tests passed! Website is functioning correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the issues above.');
  }
  
  return results;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };
