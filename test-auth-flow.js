const fs = require('fs');
const path = require('path');

// Load credentials
const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, 'e2e/test-credentials.json'), 'utf-8'));

async function testAuthFlow() {
  const BASE_URL = credentials.baseUrl;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 AUTHENTICATION FLOW TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Email: ${credentials.email}`);
  console.log('');

  try {
    // Step 1: Login
    console.log('1️⃣ Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      })
    });

    const loginData = await loginResponse.json();
    console.log(`   Status: ${loginResponse.status}`);
    console.log(`   Response:`, JSON.stringify(loginData, null, 2).substring(0, 200));

    // Get cookies from response
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    console.log(`   Set-Cookie: ${setCookieHeader ? 'present' : 'missing'}`);

    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }

    // Extract auth-token from set-cookie
    let authToken = '';
    if (setCookieHeader) {
      const match = setCookieHeader.match(/auth-token=([^;]+)/);
      if (match) {
        authToken = match[1];
        console.log(`   Auth token: ${authToken.substring(0, 20)}...`);
      }
    }

    console.log('✅ Login successful\n');

    // Step 2: Test diagnostic endpoint
    console.log('2️⃣ Testing diagnostic endpoint...');
    const diagResponse = await fetch(`${BASE_URL}/api/debug/check-all`, {
      headers: {
        'Cookie': `auth-token=${authToken}`
      }
    });

    console.log(`   Status: ${diagResponse.status}`);
    const diagText = await diagResponse.text();
    try {
      const diagData = JSON.parse(diagText);
      console.log(`   Response:`, JSON.stringify(diagData, null, 2));
    } catch {
      console.log(`   Response (not JSON): ${diagText.substring(0, 500)}`);
    }

    // Step 3: Test a protected page
    console.log('\n3️⃣ Testing admin page...');
    const adminResponse = await fetch(`${BASE_URL}/admin`, {
      headers: {
        'Cookie': `auth-token=${authToken}`
      },
      redirect: 'manual'
    });

    console.log(`   Status: ${adminResponse.status}`);
    console.log(`   Location: ${adminResponse.headers.get('location') || 'none'}`);
    
    if (adminResponse.status === 200) {
      const html = await adminResponse.text();
      const hasError = html.includes('Internal Server Error') || html.includes('500');
      const hasContent = html.includes('Admin Panel') || html.includes('admin');
      console.log(`   Has error: ${hasError}`);
      console.log(`   Has content: ${hasContent}`);
      if (hasError) {
        // Find the error context
        const errorIndex = html.indexOf('500');
        if (errorIndex > -1) {
          console.log(`   Error context: ...${html.substring(Math.max(0, errorIndex - 50), errorIndex + 50)}...`);
        }
      }
    }

    // Step 4: Test dashboard
    console.log('\n4️⃣ Testing dashboard...');
    const dashResponse = await fetch(`${BASE_URL}/dashboard`, {
      headers: {
        'Cookie': `auth-token=${authToken}`
      },
      redirect: 'manual'
    });

    console.log(`   Status: ${dashResponse.status}`);
    console.log(`   Location: ${dashResponse.headers.get('location') || 'none'}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TEST COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuthFlow();
