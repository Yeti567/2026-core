
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('Missing DATABASE_URL in .env.local');
    process.exit(1);
}

const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function audit() {
    try {
        await client.connect();
        console.log('🔌 Connected to database');

        // 1. Check Migration State
        console.log('\n📜 --- MIGRATION STATE ---');
        console.log('Verifying applied migrations vs local files...');

        const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
        const localFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

        // Check for empty files
        const emptyFiles = [];
        for (const file of localFiles) {
            const filePath = path.join(migrationsDir, file);
            const stats = fs.statSync(filePath);
            if (stats.size === 0) {
                emptyFiles.push(file);
            }
        }

        if (emptyFiles.length > 0) {
            console.log('\n⚠️  EMPTY MIGRATION FILES DETECTED (Should likely be deleted):');
            emptyFiles.forEach(f => console.log(`   - ${f}`));
        } else {
            console.log('No empty migration files found.');
        }

        try {
            const { rows: appliedMigrations } = await client.query(
                'SELECT version FROM supabase_migrations.schema_migrations ORDER BY version'
            );
            const appliedVersions = appliedMigrations.map(m => m.version);
            const appliedSet = new Set(appliedVersions);

            let missing = [];

            console.log(`Found ${localFiles.length} local files and ${appliedVersions.length} applied migrations.`);

            for (const file of localFiles) {
                // Extract version (usually first part before _)
                const versionMatch = file.match(/^(\d+)/);
                if (versionMatch) {
                    const version = versionMatch[1];
                    if (!appliedSet.has(version)) {
                        missing.push(file);
                    }
                }
            }

            if (missing.length > 0) {
                console.log('\n❌ UNAPPLIED MIGRATIONS (Found locally but not in DB tracker):');
                missing.forEach(f => console.log(`   - ${f}`));
            } else {
                console.log('All local migrations appear to be applied according to tracker.');
            }
        } catch (migErr: any) {
            console.warn('\n⚠️  Could not query migration tracker (supabase_migrations.schema_migrations).');
            console.warn('   This implies migrations might have been applied manually or the tracker table is missing.');
            console.warn(`   Error detail: ${migErr.message}`);
        }

        // 2. Check RLS Policies
        console.log('\n🔒 --- RLS SECURITY AUDIT ---');

        // This query checks table RLS status and counts policies
        const rlsQuery = `
            SELECT
                n.nspname AS schema,
                c.relname AS table_name,
                c.relrowsecurity AS rls_enabled,
                COUNT(p.polname) AS policy_count
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            LEFT JOIN pg_policy p ON p.polrelid = c.oid
            WHERE n.nspname = 'public' 
              AND c.relkind = 'r' -- r = ordinary table
            GROUP BY n.nspname, c.relname, c.relrowsecurity
            ORDER BY c.relname;
        `;

        const { rows: tables } = await client.query(rlsQuery);

        let rlsIssues = 0;
        let warningCount = 0;

        console.log(String('Table Name').padEnd(40) + String('RLS Enabled').padEnd(15) + 'Policy Count');
        console.log('-'.repeat(70));

        for (const table of tables) {
            const isRlsEnabled = table.rls_enabled;
            const policyCount = parseInt(table.policy_count);

            let status = '✅';
            if (!isRlsEnabled) {
                status = '❌ DISABLED';
                rlsIssues++;
            } else if (policyCount === 0) {
                status = '⚠️  ENABLED (NO POLICIES)';
                warningCount++;
            } else {
                status = '✅ ENABLED';
            }

            console.log(
                table.table_name.padEnd(40) +
                status.padEnd(15) +
                String(policyCount).padStart(5)
            );
        }

        if (rlsIssues > 0) {
            console.log(`\n❌ CRITICAL: ${rlsIssues} tables have RLS disabled!`);
        }
        if (warningCount > 0) {
            console.log(`\n⚠️  WARNING: ${warningCount} tables have RLS enabled but no policies.`);
        }
        if (rlsIssues === 0 && warningCount === 0) {
            console.log('\n✅ All tables have RLS enabled and at least one policy.');
        }

    } catch (err) {
        console.error('Audit failed:', err);
    } finally {
        await client.end();
    }
}

audit();
