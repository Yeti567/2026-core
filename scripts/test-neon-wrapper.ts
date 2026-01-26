import { createNeonWrapper } from '../lib/db/neon-wrapper';
import { getPostgresClient } from '../lib/db/postgres-client';

async function testNeonWrapper() {
  console.log('Testing Neon wrapper...');
  
  try {
    // Test basic connection
    const client = getPostgresClient();
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful:', result.rows[0]);
    
    // Test wrapper
    const neon = createNeonWrapper();
    
    // Test simple query
    const companies = await neon.from('companies').select('id, name').limit(5);
    console.log('✅ Companies query result:', companies.data?.length || 0, 'companies found');
    
    if (companies.error) {
      console.error('❌ Companies query error:', companies.error);
    }
    
    // Test RPC function (if exists)
    try {
      const rpcResult = await neon.rpc('check_registration_rate_limit', { p_ip_address: '127.0.0.1' });
      console.log('✅ RPC test result:', rpcResult.error ? 'Function may not exist yet' : 'Function exists');
    } catch (e) {
      console.log('ℹ️ RPC function may not be created yet (expected during migration)');
    }
    
    console.log('\n✅ Neon wrapper test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testNeonWrapper();
