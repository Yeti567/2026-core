import { getPostgresClient } from '../lib/db/postgres-client';

async function createUserPasswordsTable() {
  const client = getPostgresClient();
  
  try {
    console.log('Creating user_passwords table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_passwords (
        user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('✅ user_passwords table created successfully');
  } catch (error) {
    console.error('❌ Error creating user_passwords table:', error);
    throw error;
  } finally {
    await client.end();
  }
}

createUserPasswordsTable().catch(console.error);
