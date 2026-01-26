const http = require('http');

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
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Body length:', body.length);
    console.log('Body preview:', body.substring(0, 200));
    
    try {
      const json = JSON.parse(body);
      console.log('Parsed JSON:', json);
    } catch (e) {
      console.log('Not JSON - HTML response detected');
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.write(JSON.stringify(testData));
req.end();
