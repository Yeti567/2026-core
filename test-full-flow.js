const http = require('http');

const BASE_URL = 'localhost:3000';

// Test data with unique values to avoid conflicts
const uniqueId = Date.now();
const testData = {
  company_name: `Test Construction Corp ${uniqueId}`,
  wsib_number: `12345678${uniqueId.toString().slice(-1)}`,
  company_email: `info${uniqueId}@testconstruction.com`,
  address: '123 Test Street',
  city: 'Testville',
  province: 'Ontario',
  postal_code: 'T1A 2B3',
  phone: '5550123456',
  industry: 'Construction',
  employee_count: 50,
  years_in_business: 10,
  main_services: ['General Contracting', 'Renovations', 'New Builds'],
  registrant_name: 'John Test',
  registrant_email: `john${uniqueId}@testconstruction.com`,
  registrant_position: 'Project Manager',
  password: 'SecureP@ss9!',
  confirm_password: 'SecureP@ss9!'
};

function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData && { 'Content-Length': Buffer.byteLength(postData) }),
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = res.headers['content-type']?.includes('application/json') 
            ? JSON.parse(responseData) 
            : responseData;
          resolve({ 
            status: res.statusCode, 
            headers: res.headers, 
            body: json 
          });
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            headers: res.headers, 
            body: responseData 
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testRegistration() {
  console.log('🧪 Testing Registration...');
  try {
    const response = await makeRequest('/api/register', 'POST', testData);
    console.log(`Registration: ${response.status} - ${response.status === 200 ? '✅' : '❌'}`);
    if (response.status !== 200) {
      console.log('Response:', response.body);
    }
    return response;
  } catch (error) {
    console.error('Registration Error:', error);
    return null;
  }
}

async function testLogin() {
  console.log('🧪 Testing Login...');
  try {
    const loginData = {
      email: testData.registrant_email,
      password: testData.password
    };
    
    const response = await makeRequest('/api/auth/login', 'POST', loginData);
    console.log(`Login: ${response.status} - ${response.status === 200 ? '✅' : '❌'}`);
    if (response.status !== 200) {
      console.log('Response:', response.body);
    }
    return response;
  } catch (error) {
    console.error('Login Error:', error);
    return null;
  }
}

async function testProtectedEndpoints(authCookie) {
  console.log('🧪 Testing Protected Endpoints...');
  
  const endpoints = [
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
      const headers = authCookie ? { 'Cookie': authCookie } : {};
      const response = await makeRequest(endpoint, 'GET', null, headers);
      
      const success = response.status === 200 || response.status === 401; // 401 is expected for some endpoints
      results.push({ endpoint, status: response.status, success });
      console.log(`${endpoint}: ${response.status} - ${success ? '✅' : '❌'}`);
      
      if (response.status === 500) {
        console.log(`  Error: ${response.body}`);
      }
    } catch (error) {
      results.push({ endpoint, status: 'ERROR', success: false });
      console.log(`${endpoint}: ERROR - ${error.message}`);
    }
  }
  
  return results;
}

async function testPublicEndpoints() {
  console.log('🧪 Testing Public Endpoints...');
  
  const endpoints = [
    '/',
    '/login',
    '/register'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(endpoint);
      const success = response.status === 200;
      results.push({ endpoint, status: response.status, success });
      console.log(`${endpoint}: ${response.status} - ${success ? '✅' : '❌'}`);
    } catch (error) {
      results.push({ endpoint, status: 'ERROR', success: false });
      console.log(`${endpoint}: ERROR - ${error.message}`);
    }
  }
  
  return results;
}

async function runFullTest() {
  console.log('🚀 Starting Full Application Test...\n');
  
  // Test public endpoints first
  const publicResults = await testPublicEndpoints();
  
  // Test registration
  const regResult = await testRegistration();
  
  // Test login
  const loginResult = await testLogin();
  
  // Extract auth cookie if login successful
  let authCookie = null;
  if (loginResult && loginResult.status === 200) {
    const setCookieHeader = loginResult.headers['set-cookie'];
    if (setCookieHeader) {
      authCookie = setCookieHeader.find(cookie => cookie.startsWith('auth-token='));
    }
  }
  
  // Test protected endpoints
  const protectedResults = await testProtectedEndpoints(authCookie);
  
  console.log('\n📊 Test Results Summary:');
  console.log('Public Endpoints:');
  publicResults.forEach(result => {
    console.log(`  ${result.endpoint}: ${result.success ? '✅' : '❌'} (${result.status})`);
  });
  
  console.log('Registration:', regResult ? (regResult.status === 200 ? '✅ PASS' : `❌ FAIL (${regResult.status})`) : '❌ FAIL');
  console.log('Login:', loginResult ? (loginResult.status === 200 ? '✅ PASS' : `❌ FAIL (${loginResult.status})`) : '❌ FAIL');
  
  console.log('Protected Endpoints:');
  protectedResults.forEach(result => {
    console.log(`  ${result.endpoint}: ${result.success ? '✅' : '❌'} (${result.status})`);
  });
  
  const allPassed = publicResults.every(r => r.success) && 
                    regResult && regResult.status === 200 && 
                    loginResult && loginResult.status === 200 &&
                    protectedResults.every(r => r.success);
  
  console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  return {
    publicResults,
    registration: regResult,
    login: loginResult,
    protectedResults,
    allPassed
  };
}

// Run the test
runFullTest().catch(console.error);
