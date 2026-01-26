const http = require('http');

const testPage = (path, description) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET'
    };
    
    const req = http.request(options, (res) => {
      console.log(`${res.statusCode < 400 ? '✅' : '❌'} ${description}: ${path} (${res.statusCode})`);
      resolve(res.statusCode < 400);
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${description}: ${path} (Error: ${err.message})`);
      resolve(false);
    });
    
    req.end();
  });
};

const testRegistration = () => {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      company_name: 'Test Construction',
      wsib_number: '123456789',
      company_email: 'info@testconstruction.ca',
      address: '123 Test St',
      city: 'Test City',
      province: 'ON',
      postal_code: 'A1A1A1',
      phone: '(613) 555-0123',
      registrant_name: 'Test User',
      registrant_position: 'Owner',
      registrant_email: 'admin@testconstruction.ca',
      password: 'SecurePass9@Company',
      confirm_password: 'SecurePass9@Company'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Company Registration API works');
          try {
            const result = JSON.parse(body);
            console.log(`   Company ID: ${result.companyId}`);
            console.log(`   Email: ${result.email}`);
          } catch (e) {
            console.log(`   Response: ${body}`);
          }
        } else {
          console.log(`❌ Company Registration failed: ${res.statusCode}`);
          console.log(`   Response: ${body}`);
        }
        resolve(res.statusCode === 200);
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ Company Registration error: ${err.message}`);
      resolve(false);
    });
    
    req.write(data);
    req.end();
  });
};

async function runTests() {
  console.log('🧪 Testing Website Functionality\n');
  
  const pages = [
    { path: '/', description: 'Home page' },
    { path: '/login', description: 'Login page' },
    { path: '/register', description: 'Registration page' },
    { path: '/admin', description: 'Admin dashboard' },
    { path: '/dashboard', description: 'User dashboard' },
    { path: '/onboarding/upload-employees', description: 'Employee upload' },
    { path: '/admin/libraries', description: 'Libraries page' }
  ];
  
  let successCount = 0;
  for (const page of pages) {
    if (await testPage(page.path, page.description)) {
      successCount++;
    }
  }
  
  console.log(`\n📊 Navigation: ${successCount}/${pages.length} pages working`);
  
  const registrationWorks = await testRegistration();
  
  console.log(`\n📋 FINAL RESULTS:`);
  console.log(`Navigation Links: ${successCount >= pages.length * 0.8 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Company Registration: ${registrationWorks ? '✅ PASS' : '❌ FAIL'}`);
  
  const overallPass = successCount >= pages.length * 0.8 && registrationWorks;
  console.log(`\n🎯 Overall: ${overallPass ? '✅ PASS' : '❌ FAIL'}`);
}

runTests().catch(console.error);
