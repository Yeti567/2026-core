const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function removeConstraint() {
  console.log('Dropping unique constraint on wsib_number...');
  
  // Use raw SQL to drop the index
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'DROP INDEX IF EXISTS idx_companies_wsib_number;'
  });

  if (error) {
    console.log('RPC not available, trying direct approach...');
    // Can't run raw SQL without a function, need to do it in Supabase dashboard
    console.log('\n⚠️  Please run this SQL in Supabase Dashboard → SQL Editor:\n');
    console.log('DROP INDEX IF EXISTS idx_companies_wsib_number;');
    console.log('\nOr go to Table Editor → companies → remove the unique constraint on wsib_number');
  } else {
    console.log('✅ Constraint removed:', data);
  }
}

removeConstraint();
