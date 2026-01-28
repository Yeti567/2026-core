const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://rgyxbkazlertsjrruzpl.supabase.co', 'sb_secret_qWxfbOAkN2f9KNaZGeAclA_hcRbE2hp');

const tables = ['companies', 'departments', 'company_users', 'user_passwords', 'workers', 'certification_types', 'form_templates', 'ppe_types', 'audit_questions', 'registration_attempts'];

async function checkImport() {
  console.log('📊 Checking Supabase import results:');
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`  ❌ ${table}: Error - ${error.message}`);
      } else {
        console.log(`  ✅ ${table}: ${count} rows`);
      }
    } catch (err) {
      console.log(`  ❌ ${table}: ${err.message}`);
    }
  }
}

checkImport();
