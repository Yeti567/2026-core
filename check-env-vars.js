const fs = require('fs');
const path = require('path');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔐 ENVIRONMENT VARIABLES CHECK');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'JWT_SECRET'
];

const found = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key] = trimmed.split('=');
    if (key) {
      found[key] = true;
    }
  }
}

console.log('\nRequired for Supabase-Vercel Connection:');
for (const varName of requiredVars) {
  if (found[varName]) {
    console.log(`✅ ${varName}`);
  } else {
    console.log(`❌ ${varName} - MISSING`);
  }
}

// Check Supabase URL format
const supabaseUrlLine = envContent.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='));
if (supabaseUrlLine) {
  const url = supabaseUrlLine.split('=')[1].replace(/["']/g, '');
  if (url.includes('supabase.co')) {
    console.log(`\n✅ Supabase URL is valid: ${url.substring(0, 30)}...`);
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Environment check complete');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
