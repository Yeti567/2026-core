const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function check() {
  // Check for specific WSIB
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, wsib_number, created_at')
    .eq('wsib_number', '123456789');

  console.log('Companies with WSIB 123456789:');
  console.log(data || 'None found');
  if (error) console.log('Error:', error);

  // Also list all companies
  const { data: all } = await supabase
    .from('companies')
    .select('id, name, wsib_number');
  
  console.log('\nAll companies in database:');
  console.log(all || 'None');
}

check();
