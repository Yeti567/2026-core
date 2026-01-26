const http = require('http');

const BASE_URL = 'localhost:3000';

// Test user credentials from the previous step
const testCredentials = {
  email: 'testuser1769469371970@testconstruction.com',
  password: 'SecureP@ss9!',
  companyId: '345c138b-59dc-45bf-b73a-4e89adb1232d'
};

const testData = {
  departments: [
    { name: 'Safety Department', description: 'Manages safety protocols and compliance' },
    { name: 'Operations', description: 'Daily construction operations' },
    { name: 'Maintenance', description: 'Equipment maintenance and repairs' },
    { name: 'Quality Control', description: 'Quality assurance and inspections' }
  ],
  equipment: [
    {
      name: 'Excavator CAT 320',
      type: 'Heavy Equipment',
      category: 'Earth Moving',
      serial_number: 'CAT320-2024-001',
      purchase_date: '2023-01-15',
      status: 'active',
      location: 'Main Yard',
      maintenance_interval: 250
    },
    {
      name: 'Safety Harness Set - Type A',
      type: 'Safety Equipment',
      category: 'Fall Protection',
      serial_number: 'SH-A-2024-001',
      purchase_date: '2024-01-01',
      status: 'active',
      location: 'Safety Office',
      maintenance_interval: 180
    },
    {
      name: 'Concrete Mixer - Portable',
      type: 'Construction Equipment',
      category: 'Concrete',
      serial_number: 'CM-P-2024-001',
      purchase_date: '2023-06-15',
      status: 'maintenance',
      location: 'Maintenance Shop',
      maintenance_interval: 100
    },
    {
      name: 'Tower Crane - Liebherr',
      type: 'Heavy Equipment',
      category: 'Lifting',
      serial_number: 'TC-L-2024-001',
      purchase_date: '2022-03-20',
      status: 'active',
      location: 'Site A',
      maintenance_interval: 500
    },
    {
      name: 'Hard Hats - Premium',
      type: 'Safety Equipment',
      category: 'Head Protection',
      serial_number: 'HH-P-2024-001',
      purchase_date: '2024-01-01',
      status: 'active',
      location: 'Site Office',
      maintenance_interval: 365
    }
  ],
  employees: [
    {
      name: 'Sarah Johnson',
      email: 'sarah.j@testconstruction.com',
      position: 'Safety Manager',
      department: 'Safety Department',
      role: 'safety_manager',
      phone: '555-0101',
      hire_date: '2023-01-15',
      status: 'active'
    },
    {
      name: 'Mike Wilson',
      email: 'mike.w@testconstruction.com',
      position: 'Equipment Operator',
      department: 'Operations',
      role: 'member',
      phone: '555-0102',
      hire_date: '2023-03-20',
      status: 'active'
    },
    {
      name: 'Lisa Chen',
      email: 'lisa.c@testconstruction.com',
      position: 'Maintenance Technician',
      department: 'Maintenance',
      role: 'member',
      phone: '555-0103',
      hire_date: '2023-06-01',
      status: 'active'
    },
    {
      name: 'Tom Roberts',
      email: 'tom.r@testconstruction.com',
      position: 'Quality Inspector',
      department: 'Quality Control',
      role: 'quality_inspector',
      phone: '555-0104',
      hire_date: '2023-09-15',
      status: 'active'
    },
    {
      name: 'Emma Davis',
      email: 'emma.d@testconstruction.com',
      position: 'Project Coordinator',
      department: 'Operations',
      role: 'member',
      phone: '555-0105',
      hire_date: '2024-01-01',
      status: 'active'
    }
  ],
  documents: [
    {
      title: 'Company Safety Manual 2024',
      type: 'Safety Manual',
      description: 'Comprehensive safety procedures and protocols for all construction activities',
      control_number: 'SAFE-2024-001',
      effective_date: '2024-01-01',
      expiry_date: '2025-01-01',
      version: '2.1',
      category: 'Safety'
    },
    {
      title: 'Equipment Maintenance Schedule',
      type: 'Maintenance Record',
      description: 'Scheduled maintenance procedures for all heavy equipment',
      control_number: 'MAINT-2024-001',
      effective_date: '2024-01-01',
      expiry_date: '2024-12-31',
      version: '1.0',
      category: 'Maintenance'
    },
    {
      title: 'Quality Control Procedures',
      type: 'Quality Manual',
      description: 'Quality assurance standards and inspection procedures',
      control_number: 'QUAL-2024-001',
      effective_date: '2024-02-01',
      expiry_date: '2025-02-01',
      version: '1.5',
      category: 'Quality'
    }
  ]
};

let authCookie = null;

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
        ...(authCookie && { 'Cookie': authCookie }),
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

async function login() {
  console.log('🔐 Logging in with test user...');
  try {
    const response = await makeRequest('/api/auth/login', 'POST', {
      email: testCredentials.email,
      password: testCredentials.password
    });
    
    if (response.status === 200) {
      console.log('✅ Login successful');
      
      // Extract the JWT token from the set-cookie header
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        const authCookie = setCookieHeader.find(cookie => cookie.startsWith('auth-token='));
        if (authCookie) {
          const token = authCookie.split('auth-token=')[1].split(';')[0];
          console.log('✅ Extracted JWT token');
          
          // Update makeRequest to include the authorization header
          const originalMakeRequest = makeRequest;
          makeRequest = function(path, method = 'GET', data = null, headers = {}) {
            return originalMakeRequest(path, method, data, {
              'authorization': `Bearer ${token}`,
              ...headers
            });
          };
          
          return true;
        }
      }
      
      console.log('❌ No auth token found in response');
      return false;
    } else {
      console.log('❌ Login failed:', response.body);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    return false;
  }
}

async function testDepartments() {
  console.log('\n🏗️ Testing Department Management...');
  let createdDeptIds = [];
  
  // Create departments
  for (const dept of testData.departments) {
    try {
      const response = await makeRequest('/api/admin/departments', 'POST', dept);
      if (response.status === 200 || response.status === 201) {
        console.log(`✅ Created department: ${dept.name}`);
        if (response.body.data?.id) {
          createdDeptIds.push(response.body.data.id);
        }
      } else {
        console.log(`❌ Failed to create ${dept.name}:`, response.body);
      }
    } catch (error) {
      console.error(`❌ Error creating department ${dept.name}:`, error);
    }
  }
  
  // List departments
  try {
    const response = await makeRequest('/api/admin/departments', 'GET');
    if (response.status === 200) {
      console.log(`✅ Retrieved ${response.body.data?.length || 0} departments`);
    } else {
      console.log('❌ Failed to list departments:', response.body);
    }
  } catch (error) {
    console.error('❌ Error listing departments:', error);
  }
  
  return createdDeptIds.length > 0;
}

async function testEquipment() {
  console.log('\n🔧 Testing Equipment Management...');
  let createdEquipmentIds = [];
  
  // Add equipment
  for (const equipment of testData.equipment) {
    try {
      const response = await makeRequest('/api/admin/equipment', 'POST', equipment);
      if (response.status === 200 || response.status === 201) {
        console.log(`✅ Added equipment: ${equipment.name}`);
        if (response.body.data?.id) {
          createdEquipmentIds.push(response.body.data.id);
        }
      } else {
        console.log(`❌ Failed to add ${equipment.name}:`, response.body);
      }
    } catch (error) {
      console.error(`❌ Error adding equipment ${equipment.name}:`, error);
    }
  }
  
  // List equipment
  try {
    const response = await makeRequest('/api/admin/equipment', 'GET');
    if (response.status === 200) {
      console.log(`✅ Retrieved ${response.body.data?.length || 0} equipment items`);
    } else {
      console.log('❌ Failed to list equipment:', response.body);
    }
  } catch (error) {
    console.error('❌ Error listing equipment:', error);
  }
  
  return createdEquipmentIds.length > 0;
}

async function testEmployees() {
  console.log('\n👥 Testing Employee Management...');
  let createdEmployeeIds = [];
  
  // Add employees
  for (const employee of testData.employees) {
    try {
      const response = await makeRequest('/api/admin/employees', 'POST', employee);
      if (response.status === 200 || response.status === 201) {
        console.log(`✅ Added employee: ${employee.name}`);
        if (response.body.data?.id) {
          createdEmployeeIds.push(response.body.data.id);
        }
      } else {
        console.log(`❌ Failed to add ${employee.name}:`, response.body);
      }
    } catch (error) {
      console.error(`❌ Error adding employee ${employee.name}:`, error);
    }
  }
  
  // List employees
  try {
    const response = await makeRequest('/api/admin/employees', 'GET');
    if (response.status === 200) {
      console.log(`✅ Retrieved ${response.body.data?.length || 0} employees`);
    } else {
      console.log('❌ Failed to list employees:', response.body);
    }
  } catch (error) {
    console.error('❌ Error listing employees:', error);
  }
  
  return createdEmployeeIds.length > 0;
}

async function testDocuments() {
  console.log('\n📄 Testing Document Management...');
  let createdDocIds = [];
  
  // Upload documents
  for (const doc of testData.documents) {
    try {
      const response = await makeRequest('/api/documents', 'POST', doc);
      if (response.status === 200 || response.status === 201) {
        console.log(`✅ Uploaded document: ${doc.title}`);
        if (response.body.data?.id) {
          createdDocIds.push(response.body.data.id);
        }
      } else {
        console.log(`❌ Failed to upload ${doc.title}:`, response.body);
      }
    } catch (error) {
      console.error(`❌ Error uploading document ${doc.title}:`, error);
    }
  }
  
  // List documents
  try {
    const response = await makeRequest('/api/documents', 'GET');
    if (response.status === 200) {
      console.log(`✅ Retrieved ${response.body.data?.length || 0} documents`);
    } else {
      console.log('❌ Failed to list documents:', response.body);
    }
  } catch (error) {
    console.error('❌ Error listing documents:', error);
  }
  
  return createdDocIds.length > 0;
}

async function testAuditFeatures() {
  console.log('\n🔍 Testing Audit Features...');
  
  const auditTests = [
    { endpoint: '/api/audit/compliance', name: 'Compliance Status' },
    { endpoint: '/api/audit/evidence', name: 'Evidence Management' },
    { endpoint: '/api/audit/action-plan', name: 'Action Plans' },
    { endpoint: '/api/audit/gaps', name: 'Gap Analysis' }
  ];
  
  let successCount = 0;
  
  for (const test of auditTests) {
    try {
      const response = await makeRequest(test.endpoint, 'GET');
      if (response.status === 200) {
        console.log(`✅ ${test.name}: Working (${response.body.data?.length || 0} items)`);
        successCount++;
      } else if (response.status === 401) {
        console.log(`❌ ${test.name}: Authentication failed`);
      } else {
        console.log(`⚠️ ${test.name}: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error testing ${test.name}:`, error);
    }
  }
  
  return successCount > 0;
}

async function testUserProfile() {
  console.log('\n👤 Testing User Profile...');
  
  try {
    const response = await makeRequest('/api/auth/me', 'GET');
    if (response.status === 200) {
      console.log('✅ User profile retrieved');
      console.log(`   Name: ${response.body.data?.name || 'N/A'}`);
      console.log(`   Email: ${response.body.data?.email || 'N/A'}`);
      console.log(`   Role: ${response.body.data?.role || 'N/A'}`);
      return true;
    } else {
      console.log('❌ Failed to get user profile:', response.body);
      return false;
    }
  } catch (error) {
    console.error('❌ Error getting user profile:', error);
    return false;
  }
}

async function runFullFeatureTest() {
  console.log('🚀 Starting Full Feature Test with Real Data\n');
  console.log(`📧 Test User: ${testCredentials.email}`);
  console.log(`🏢 Company ID: ${testCredentials.companyId}\n`);
  
  const results = {
    login: await login(),
    departments: await testDepartments(),
    equipment: await testEquipment(),
    employees: await testEmployees(),
    documents: await testDocuments(),
    audit: await testAuditFeatures(),
    profile: await testUserProfile()
  };
  
  console.log('\n📊 Final Test Results:');
  console.log('================================');
  Object.entries(results).forEach(([feature, success]) => {
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${feature.padEnd(12)}: ${status}`);
  });
  
  const allPassed = Object.values(results).every(r => r);
  console.log('================================');
  console.log(`Overall Status: ${allPassed ? '🎉 ALL FEATURES WORKING' : '⚠️ SOME ISSUES FOUND'}`);
  
  if (allPassed) {
    console.log('\n🎯 Application is Fully Functional!');
    console.log('✅ Authentication & Authorization');
    console.log('✅ Department Management');
    console.log('✅ Equipment Tracking');
    console.log('✅ Employee Management');
    console.log('✅ Document Management');
    console.log('✅ Audit & Compliance');
    console.log('✅ User Profiles');
    console.log('\n📈 Test Data Created:');
    console.log(`   Departments: ${testData.departments.length}`);
    console.log(`   Equipment: ${testData.equipment.length}`);
    console.log(`   Employees: ${testData.employees.length}`);
    console.log(`   Documents: ${testData.documents.length}`);
  }
  
  return results;
}

// Run the comprehensive feature test
runFullFeatureTest().catch(console.error);
