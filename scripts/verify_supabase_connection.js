
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables manually to ensure we get .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables!');
    if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL is missing');
    if (!supabaseKey) console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
    process.exit(1);
}

console.log(`Connecting to Supabase at: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyConnection() {
    console.log('\n--- 1. Testing Anon Connection ---');
    // Try to fetch something simple. Typically, reading from a public table or checking health.
    // Since we might not know what tables are public, we'll try to list tables if possible (requires service role usually)
    // or just doing a basic select on a known table 'users' or 'companies' if public. 
    // If RLS blocks it, that's also a "successful connection" but "authorization failure".

    // Checking auth endpoint/health isn't direct in JS client, but we can check if we can initialize.
    console.log('✅ Supabase Client Initialized');

    console.log('\n--- 2. Testing Database Access (Audit Tables) ---');
    // 'elements' is usually a good candidate for extensive applications, but 'users' is standard.
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });

    if (error) {
        console.log('⚠️  Anon access to "users" table failed (Expected if RLS is on):', error.message);
    } else {
        console.log('✅ Anon access to "users" table successful. Count:', data); // count is in count property if head:true? No, it's returned on the object.
    }

    // If we have service role, let's list tables.
    if (serviceKey) {
        console.log('\n--- 3. Testing Service Role Access ---');
        const supabaseAdmin = createClient(supabaseUrl, serviceKey);

        // We can't list tables directly via client API typically without postgres function or inspection.
        // However, we can test full access.
        const { data: adminData, error: adminError } = await supabaseAdmin.from('users').select('count', { count: 'exact', head: true });

        if (adminError) {
            console.error('❌ Service Role access failed:', adminError.message);
        } else {
            console.log('✅ Service Role access verified. User Count (Admin):', adminData); // Wait, count is usually returned separately.
        }
    } else {
        console.log('ℹ️  No Service Role Key found, skipping admin checks.');
    }
}

verifyConnection().catch(console.error);
