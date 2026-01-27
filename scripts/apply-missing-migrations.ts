
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Read .env.local manually
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

const databaseUrl = envVars['DATABASE_URL'];

if (!databaseUrl) {
    console.error('DATABASE_URL not found in .env.local');
    process.exit(1);
}

const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false } // Required for some hosted postgres/neon
});

const MIGRATIONS_TO_APPLY = [
    // 'supabase/migrations/027_add_company_industry.sql', // Already applied successfully
    // 'supabase/migrations/030_departments_system.sql', // Already applied successfully
    'supabase/migrations/999_security_fixes.sql'
];

async function applyMigrations() {
    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected.');

        for (const migrationFile of MIGRATIONS_TO_APPLY) {
            const filePath = path.join(process.cwd(), migrationFile);
            console.log(`\nReading migration: ${migrationFile}`);

            try {
                const sql = fs.readFileSync(filePath, 'utf-8');
                console.log(`Applying migration...`);

                await client.query('BEGIN');
                await client.query(sql);
                await client.query('COMMIT');

                console.log(`SUCCESS: Applied ${migrationFile}`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`FAILED: Could not apply ${migrationFile}`);
                console.error(err);
                // Continue to next? Or stop? 
                // Stop to prevent dependent errors.
                process.exit(1);
            }
        }

    } catch (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

applyMigrations();
