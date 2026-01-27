
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read .env.local manually since we don't want to depend on dotenv
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        envVars[key] = value;
    }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
    console.log('Checking database connection...');

    // 1. List tables (Note: Supabase API doesn't have a direct "list tables" method for public schema inspection without generic SQL query if we can't use pg)
    // However, we can use the 'rpc' interface if we had a function, or we can try to query `information_schema`.
    // BUT, standard Supabase client only queries 'public' usually unless configured.
    // querying information_schema.tables directly often works if permissions allow.

    const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables') // This might not work with standard client depending on permissions/schema exposure
        .select('*')
        .eq('table_schema', 'public');

    // If querying information_schema fails (likely with postgrest), we will try a known table from the listing to see if it exists.
    // From file listing: 'companies', 'users' (implied), 'certifications', etc.

    let knownTables = [
        'companies',
        'user_profiles',
        'workers',
        'departments',
        'documents',
        'equipment_inventory',
        'certification_types',
        'form_templates',
        'form_sections',
        'form_fields'
    ];

    console.log('\n--- Checking Known Tables ---');

    for (const table of knownTables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.log(`Table '${table}': ERROR/MISSING (${error.message})`);
        } else {
            console.log(`Table '${table}': Exists (Rows: ${count})`);
        }
    }

    // Check migrations table?
    console.log('\n--- Checking Migrations Table ---');
    // Usually supabase_migrations.schema_migrations
    // We can't query other schemas easily with JS client unless we change schema.
    // Let's try to query a "migrations" table if it exists in public (unlikely)

}

checkDatabase();
