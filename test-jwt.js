const http = require('http');

// Test login and token extraction
const testData = {
  email: 'testuser1769469371970@testconstruction.com',
  password: 'SecureP@ss9!'
};

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(JSON.stringify(testData))
  }
};

const req = http.request(options, (res) => {
  console.log('Login Status:', res.statusCode);
  
  // Extract token
  const setCookieHeader = res.headers['set-cookie'];
  if (setCookieHeader) {
    const authCookie = setCookieHeader.find(cookie => cookie.startsWith('auth-token='));
    if (authCookie) {
      const token = authCookie.split('auth-token=')[1].split(';')[0];
      console.log('Token length:', token.length);
      console.log('Token preview:', token.substring(0, 50) + '...');
      
      // Test the token with a simple API call
      testTokenWithAPI(token);
    } else {
      console.log('No auth-token cookie found');
    }
  } else {
    console.log('No set-cookie header found');
  }
});

req.write(JSON.stringify(testData));
req.end();

function testTokenWithAPI(token) {
  console.log('\n🧪 Testing token with API...');
  
  const testOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/me',
    method: 'GET',
    headers: {
      'authorization': `Bearer ${token}`
    }
  };

  const testReq = http.request(testOptions, (res) => {
    console.log('API Status:', res.statusCode);
    
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        console.log('API Response:', json);
      } catch (e) {
        console.log('API Response (raw):', body.substring(0, 200));
      }
    });
  });

  testReq.on('error', (e) => {
    console.error('API Test Error:', e);
  });

  testReq.end();
}
