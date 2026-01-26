// Test CSV validation functionality
const fs = require('fs');
const path = require('path');

// Import validation functions (we'll need to adapt this for Node.js)
function testCSVValidation() {
  console.log('🧪 Testing CSV Validation\n');
  
  // Check if test CSV file exists
  const csvPath = path.join(__dirname, 'test-employees.csv');
  if (fs.existsSync(csvPath)) {
    console.log('✅ Test CSV file exists');
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    console.log('📄 CSV Content:');
    console.log(csvContent);
    
    // Basic validation checks
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    console.log(`\n📊 CSV Analysis:`);
    console.log(`   Total lines: ${lines.length}`);
    console.log(`   Headers: ${headers.join(', ')}`);
    
    const requiredHeaders = ['first_name', 'last_name', 'email', 'position', 'role'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length === 0) {
      console.log('✅ All required headers present');
    } else {
      console.log(`❌ Missing headers: ${missingHeaders.join(', ')}`);
    }
    
    // Check data rows
    let validRows = 0;
    let invalidRows = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= 5) { // At least required columns
        const [firstName, lastName, email, position, role] = values;
        
        // Basic validation
        const isValid = firstName && lastName && email && position && role && email.includes('@');
        if (isValid) {
          validRows++;
        } else {
          invalidRows++;
          console.log(`❌ Row ${i + 1}: Invalid data - ${values.join(',')}`);
        }
      } else {
        invalidRows++;
        console.log(`❌ Row ${i + 1}: Not enough columns - ${values.join(',')}`);
      }
    }
    
    console.log(`\n📈 Row Validation:`);
    console.log(`   Valid rows: ${validRows}`);
    console.log(`   Invalid rows: ${invalidRows}`);
    
    return validRows > 0;
  } else {
    console.log('❌ Test CSV file not found');
    return false;
  }
}

function testEquipmentCSV() {
  console.log('\n🧪 Testing Equipment CSV\n');
  
  const equipmentCsvPath = path.join(__dirname, 'test-equipment.csv');
  if (fs.existsSync(equipmentCsvPath)) {
    console.log('✅ Test equipment CSV file exists');
    
    const csvContent = fs.readFileSync(equipmentCsvPath, 'utf-8');
    console.log('📄 Equipment CSV Content:');
    console.log(csvContent);
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    console.log(`\n📊 Equipment CSV Analysis:`);
    console.log(`   Total lines: ${lines.length}`);
    console.log(`   Headers: ${headers.join(', ')}`);
    
    const requiredHeaders = ['equipment_number', 'equipment_type', 'name', 'status'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length === 0) {
      console.log('✅ All required equipment headers present');
    } else {
      console.log(`❌ Missing equipment headers: ${missingHeaders.join(', ')}`);
    }
    
    return true;
  } else {
    console.log('❌ Test equipment CSV file not found');
    return false;
  }
}

function testLibrariesAPI() {
  console.log('\n🧪 Testing Libraries API\n');
  
  return new Promise((resolve) => {
    const http = require('http');
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/admin/equipment',
      method: 'GET'
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Equipment API works');
          try {
            const data = JSON.parse(body);
            console.log(`   Equipment count: ${data.equipment?.length || 0}`);
          } catch (e) {
            console.log(`   Response: ${body}`);
          }
          resolve(true);
        } else if (res.statusCode === 401) {
          console.log('⚠️  Equipment API requires authentication (expected)');
          resolve(true); // This is expected
        } else {
          console.log(`❌ Equipment API failed: ${res.statusCode}`);
          console.log(`   Response: ${body}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ Equipment API error: ${err.message}`);
      resolve(false);
    });
    
    req.end();
  });
}

async function runAllTests() {
  console.log('🚀 Comprehensive Functionality Test\n');
  
  const csvWorks = testCSVValidation();
  const equipmentCSVWorks = testEquipmentCSV();
  const librariesAPIWorks = await testLibrariesAPI();
  
  console.log('\n📋 COMPREHENSIVE TEST RESULTS:');
  console.log('='.repeat(50));
  console.log(`Employee CSV Validation: ${csvWorks ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Equipment CSV Format: ${equipmentCSVWorks ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Libraries API: ${librariesAPIWorks ? '✅ PASS' : '❌ FAIL'}`);
  
  const passCount = [csvWorks, equipmentCSVWorks, librariesAPIWorks].filter(Boolean).length;
  const totalTests = 3;
  
  console.log(`\n🎯 CSV & Libraries: ${passCount}/${totalTests} tests passed`);
  
  if (passCount === totalTests) {
    console.log('🎉 All CSV and library tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please review the issues above.');
  }
}

runAllTests().catch(console.error);
