// Simple test to isolate the issue
const http = require('http');

const testData = {
  company_name: 'Test Construction Corp',
  wsib_number: 'TEST-12345-6789',
  company_email: 'info@testconstruction.com',
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
  registrant_email: 'john@testconstruction.com',
  registrant_position: 'Project Manager',
  password: 'SecureP@ss9!',
  confirm_password: 'SecureP@ss9!'
};

function testRegistration() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(testData);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Response body:', data);
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', (e) => {
      console.error(`Problem with request: ${e.message}`);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

testRegistration()
  .then(result => {
    console.log('Test completed:', result);
  })
  .catch(error => {
    console.error('Test failed:', error);
  });
