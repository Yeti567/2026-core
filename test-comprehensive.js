const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// Test data
const testCompany = {
  company_name: 'Test Construction Corp',
  wsib_number: 'TEST-12345-6789',
  company_email: 'info@testconstruction.com',
  address: '123 Test Street',
  city: 'Testville',
  province: 'Ontario',
  postal_code: 'T1A 2B3',
  phone: '555-0123',
  industry: 'Construction',
  employee_count: 50,
  years_in_business: 10,
  main_services: ['General Contracting', 'Renovations', 'New Builds'],
  registrant_name: 'John Test',
  registrant_email: 'john@testconstruction.com',
  registrant_position: 'Project Manager',
  password: 'TestPassword123!'
};

const testUser = {
  email: 'john@testconstruction.com',
  password: 'TestPassword123!'
};

async function testRegistration() {
  console.log('🧪 Testing Registration...');
  try {
    const response = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCompany)
    });
    
    const data = await response.json();
    console.log('Registration Response:', response.status, data);
    return response.ok;
  } catch (error) {
    console.error('Registration Error:', error);
    return false;
  }
}

async function testLogin() {
  console.log('🧪 Testing Login...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    const data = await response.json();
    console.log('Login Response:', response.status, data);
    return response.ok;
  } catch (error) {
    console.error('Login Error:', error);
    return false;
  }
}

async function testAPIEndpoints() {
  console.log('🧪 Testing API Endpoints...');
  
  const endpoints = [
    '/api/auth/login',
    '/api/register',
    '/api/auth/me',
    '/api/admin/departments',
    '/api/admin/employees',
    '/api/admin/equipment',
    '/api/audit/compliance',
    '/api/audit/evidence',
    '/api/audit/action-plan'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const text = await response.text();
      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? JSON.parse(text) : text;
      
      results.push({ endpoint, status: response.status, success: response.ok, contentType: response.headers.get('content-type') });
      console.log(`${endpoint}: ${response.status} - ${response.ok ? '✅' : '❌'} (${response.headers.get('content-type')})`);
      
      if (!response.ok && response.status === 404) {
        console.log(`  Response body: ${text.substring(0, 200)}...`);
      }
    } catch (error) {
      results.push({ endpoint, status: 'ERROR', success: false });
      console.log(`${endpoint}: ERROR - ${error.message}`);
    }
  }
  
  return results;
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Testing...\n');
  
  const results = {
    registration: await testRegistration(),
    login: await testLogin(),
    apiEndpoints: await testAPIEndpoints()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('Registration:', results.registration ? '✅ PASS' : '❌ FAIL');
  console.log('Login:', results.login ? '✅ PASS' : '❌ FAIL');
  console.log('API Endpoints:');
  results.apiEndpoints.forEach(result => {
    console.log(`  ${result.endpoint}: ${result.success ? '✅' : '❌'} (${result.status})`);
  });
  
  return results;
}

// Run tests
runAllTests().catch(console.error);
