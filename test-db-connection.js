// Test database connection
const { createNeonWrapper } = require('./lib/db/neon-wrapper');

async function testDatabase() {
  console.log('Testing database connection...');
  
  try {
    const neon = createNeonWrapper();
    
    // Test simple query
    const result = await neon.from('companies').select('count').single();
    console.log('✅ Database connected successfully');
    console.log('Companies count:', result);
  } catch (error) {
    console.log('❌ Database connection failed:');
    console.log('Error:', error.message);
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL environment variable is not set');
      console.log('Please set up your database connection in .env.local');
    } else {
      console.log('DATABASE_URL is set but connection failed');
    }
  }
}

testDatabase();
