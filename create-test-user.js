const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load DATABASE_URL from .env.local
function loadDatabaseUrl() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DATABASE_URL=')) {
        return trimmed.substring('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
      }
      
      if (trimmed.startsWith('postgresql://') || trimmed.startsWith('postgres://')) {
        return trimmed.replace(/^["']|["']$/g, '');
      }
    }
  }
  
  throw new Error('DATABASE_URL not found');
}

async function createTestUser() {
  const { Pool } = require('pg');
  const databaseUrl = loadDatabaseUrl();
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const uniqueId = Date.now();
    const testUser = {
      email: `testuser${uniqueId}@testconstruction.com`,
      name: 'Test User',
      position: 'Administrator',
      password: 'SecureP@ss9!'
    };

    // Create test company first
    console.log('Creating test company...');
    const companyResult = await pool.query(`
      INSERT INTO companies (name, wsib_number, email, address, city, province, postal_code, phone, industry, employee_count, years_in_business, main_services, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
      RETURNING id
    `, [
      `Test Company ${uniqueId}`,
      '123456789',
      `info${uniqueId}@testconstruction.com`,
      '123 Test Street',
      'Testville',
      'Ontario',
      'T1A 2B3',
      '5550123456',
      'Construction',
      50,
      10,
      ['General Contracting']
    ]);

    const companyId = companyResult.rows[0].id;
    console.log(`✅ Created company: ${companyId}`);

    // Create user in auth.users
    console.log('Creating test user...');
    const userResult = await pool.query(`
      INSERT INTO auth.users (id, email, created_at)
      VALUES (gen_random_uuid(), $1, NOW())
      RETURNING id
    `, [testUser.email]);

    const userId = userResult.rows[0].id;
    console.log(`✅ Created user: ${userId}`);

    // Hash password
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    console.log('✅ Password hashed');

    // Store password
    await pool.query(`
      INSERT INTO user_passwords (user_id, password_hash, created_at)
      VALUES ($1, $2, NOW())
    `, [userId, hashedPassword]);

    // Add to company_users
    await pool.query(`
      INSERT INTO company_users (company_id, user_id, role, name, email, position, status, created_at)
      VALUES ($1, $2, 'admin', $3, $4, $5, 'active', NOW())
    `, [companyId, userId, testUser.name, testUser.email, testUser.position]);

    console.log('✅ Test user created successfully');
    console.log(`📧 Email: ${testUser.email}`);
    console.log(`🔑 Password: ${testUser.password}`);
    console.log(`🏢 Company ID: ${companyId}`);
    console.log(`👤 User ID: ${userId}`);

    return { email: testUser.email, password: testUser.password, companyId, userId };

  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createTestUser().catch(console.error);
