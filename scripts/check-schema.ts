
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        envVars[key] = value;
    }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function checkSchema() {
    console.log('Checking "companies" table schema...');

    // Attempt to query information_schema.columns
    // Note: accessing information_schema via PostgREST might be restricted, but worth a try with service role.
    const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', 'companies');

    if (error) {
        console.error('Error fetching schema:', error);
        // Fallback: try to insert a dummy record and catch the error to see constraints? No, that's messy.
    } else {
        console.log('Columns found:', data);
    }
}

checkSchema();
