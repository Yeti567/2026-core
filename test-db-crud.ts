import { Client } from 'pg';

async function testDbOperations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Database connection successful');

    // Test SELECT
    const selectResult = await client.query('SELECT COUNT(*) as count FROM companies LIMIT 1');
    console.log('✅ SELECT test passed:', selectResult.rows[0]);

    // Test INSERT (using a test record that we'll delete)
    const insertResult = await client.query(`
      INSERT INTO companies (id, name, created_at, updated_at)
      VALUES (gen_random_uuid(), 'Test Company', NOW(), NOW())
      RETURNING id, name
    `);
    const testCompanyId = insertResult.rows[0].id;
    console.log('✅ INSERT test passed:', insertResult.rows[0]);

    // Test UPDATE
    const updateResult = await client.query(`
      UPDATE companies SET name = 'Updated Test Company' WHERE id = $1
      RETURNING id, name
    `, [testCompanyId]);
    console.log('✅ UPDATE test passed:', updateResult.rows[0]);

    // Test DELETE
    const deleteResult = await client.query(`
      DELETE FROM companies WHERE id = $1 RETURNING id
    `, [testCompanyId]);
    console.log('✅ DELETE test passed:', deleteResult.rows[0]);

    console.log('✅ All database CRUD operations working correctly');

  } catch (error) {
    console.error('❌ Database operation failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testDbOperations();
