
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing Supabase URL or Service Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function verifySchema() {
    console.log('🔍 Starting Database Schema Verification...');

    // 1. List Tables
    console.log('\n--- Checking Tables (public schema) ---');
    // We can query pg_tables if we have permissions, or information_schema
    // Since we are service_role, we can try executing SQL via RPC if enabled, 
    // or just use Postgrest on information_schema views if they are exposed (often they are NOT exposed to Postgrest directly).
    // BUT, usually 'rpc' is the best way if a function exists.
    // If no RPC, we can infer existence by checking if we get an immediate error querying them.

    // However, simpler way to "List all tables" via JS client without custom SQL function is tricky.
    // A common workaround is to try to query 'information_schema.tables' IF it was added to the exposed schema, which is rare.
    // Instead, let's assume we can't easily list *all* without a helper.
    // BUT, we can inspect a known list.

    const expectedTables = [
        'users',
        'companies',
        'projects',
        'forms',
        'audits',
        'audit_logs',
        'certifications',
        'training_records'
    ];

    for (const table of expectedTables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            // If error code is '42P01' (undefined_table), it doesn't exist.
            // Supabase REST API returns 404 for non-existent table URL usually, or specific error message.
            if (error.code === '42P01' || error.message.includes('does not exist')) {
                console.log(`❌ Table '${table}': MISSING`);
            } else {
                console.log(`⚠️  Table '${table}': Access Error (${error.message}) - It might exist but be blocked or have other issues.`);
            }
        } else {
            console.log(`✅ Table '${table}': Exists (Rows: ${count})`);
        }
    }

    // 2. RLS Check
    // We can't easily check "Is RLS enabled" via standard client without SQL.
    // But we can check if Anon can read it vs Service Role.
    // (We verified Service Role works above).

    console.log('\n--- Checking RLS (Sampling) ---');
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    // Try to read 'users' as anon
    const { error: anonError } = await anonClient.from('users').select('*', { count: 'exact', head: true });
    if (anonError) {
        console.log(`✅ 'users' table restricted for Anon (RLS likely active or Permissions set). Error: ${anonError.message}`);
    } else {
        console.log(`⚠️  'users' table is READABLE by Anon. (Check if this is intended)`);
    }

}

verifySchema().catch(console.error);
