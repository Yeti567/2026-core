
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

async function checkMigrationState() {
    console.log('Checking for columns from different migrations...');

    // Check 001 (companies)
    const { error: err1 } = await supabase.from('companies').select('id, name, wsib_number').limit(1);
    console.log('Migration 001 (Base):', err1 ? `MISSING/ERROR (${err1.message})` : 'PRESENT');

    // Check 027 (industry, employee_count)
    const { error: err27 } = await supabase.from('companies').select('industry, employee_count').limit(1);
    console.log('Migration 027 (Industry):', err27 ? `MISSING/ERROR (${err27.message})` : 'PRESENT');

    // Check 030 (departments)
    const { error: err30 } = await supabase.from('departments').select('id, name').limit(1);
    console.log('Migration 030 (Departments):', err30 ? `MISSING/ERROR (${err30.message})` : 'PRESENT');

    // Check 00300 (company registration extensions)
    const { error: err300 } = await supabase.from('companies').select('city, province').limit(1);
    console.log('Migration 00300 (Registration):', err300 ? `MISSING/ERROR (${err300.message})` : 'PRESENT');
}

checkMigrationState();
