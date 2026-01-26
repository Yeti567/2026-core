import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

function loadEnvLocal(): Record<string, string> {
  const envPath = path.join(process.cwd(), '.env.local');
  const envVars: Record<string, string> = {};

  if (!fs.existsSync(envPath)) return envVars;

  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach((line) => {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    if (trimmed.startsWith('export ')) trimmed = trimmed.slice('export '.length).trim();

    if ((trimmed.startsWith('postgresql://') || trimmed.startsWith('postgres://')) && !envVars.DATABASE_URL) {
      envVars.DATABASE_URL = trimmed;
      return;
    }

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) return;

    const key = match[1].trim();
    let value = match[2].trim();

    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    else if (value.startsWith('"')) value = value.slice(1);

    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    else if (value.startsWith("'")) value = value.slice(1);

    envVars[key] = value;
  });

  return envVars;
}

function sanitizeDatabaseUrl(value: string): string {
  const protoIdx = value.indexOf('://');
  if (protoIdx === -1) return '[missing-protocol]';
  const prefix = value.slice(0, protoIdx + 3);
  const rest = value.slice(protoIdx + 3);
  const atIdx = rest.lastIndexOf('@');
  if (atIdx === -1) return `${prefix}[missing-credentials-or-host]`;
  return `${prefix}***@${rest.slice(atIdx + 1)}`;
}

function getDatabaseUrl(): string {
  const envLocal = loadEnvLocal();
  let connectionString =
    process.env.DATABASE_URL ||
    envLocal.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    envLocal.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    envLocal.DATABASE_URL_UNPOOLED ||
    process.env.NEON_DATABASE_URL ||
    envLocal.NEON_DATABASE_URL;

  if (!connectionString) {
    throw new Error('Missing DATABASE_URL (set it in .env.local)');
  }

  connectionString = connectionString.trim();
  if (connectionString.startsWith('"')) connectionString = connectionString.slice(1);
  if (connectionString.endsWith('"')) connectionString = connectionString.slice(0, -1);
  if (connectionString.startsWith("'")) connectionString = connectionString.slice(1);
  if (connectionString.endsWith("'")) connectionString = connectionString.slice(0, -1);

  if (/\r|\n/.test(connectionString)) {
    throw new Error('DATABASE_URL contains a newline; it must be a single line');
  }

  return connectionString;
}

function requireYesFlag() {
  if (!process.argv.includes('--yes')) {
    console.error('❌ Refusing to run: this command DROPS and recreates the public schema.');
    console.error('   Re-run with: npx tsx scripts/neon-reset-and-migrate.ts --yes');
    process.exit(1);
  }
}

async function run() {
  requireYesFlag();

  const connectionString = getDatabaseUrl();
  console.log(`DATABASE_URL (sanitized): ${sanitizeDatabaseUrl(connectionString)}`);

  const parsedUrl = new URL(connectionString);
  const shouldUseSsl =
    connectionString.includes('sslmode=require') ||
    parsedUrl.hostname.endsWith('.neon.tech');

  const client = new Client({
    connectionString,
    ...(shouldUseSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  await client.connect();

  try {
    console.log('Resetting schema: public');

    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
    await client.query('CREATE SCHEMA public;');
    await client.query('GRANT ALL ON SCHEMA public TO public;');

    // Critical: ensure all unqualified CREATE TABLE statements land in public.
    // Postgres defaults search_path to "$user", public. If a "$user" schema exists,
    // migrations may create tables there and later runs can collide with partial schemas.
    await client.query('SET search_path TO public;');

    console.log('Installing Supabase-compat layer (minimal)');

    await client.query('CREATE SCHEMA IF NOT EXISTS auth;');

    // Minimal Supabase storage schema used by some migrations.
    await client.query('CREATE SCHEMA IF NOT EXISTS storage;');

    await client.query(`
      CREATE TABLE IF NOT EXISTS storage.buckets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        public BOOLEAN NOT NULL DEFAULT false,
        file_size_limit BIGINT,
        allowed_mime_types TEXT[],
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS storage.objects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bucket_id TEXT NOT NULL REFERENCES storage.buckets(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        owner UUID,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query('ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;');

    await client.query(`
      CREATE OR REPLACE FUNCTION storage.foldername(name TEXT)
      RETURNS TEXT[]
      LANGUAGE SQL
      IMMUTABLE
      AS $$
        SELECT regexp_split_to_array(name, '/');
      $$;
    `);

    // Minimal auth.users table to satisfy foreign keys in migrations.
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Minimal auth.uid() function for policies/functions.
    await client.query(`
      CREATE OR REPLACE FUNCTION auth.uid()
      RETURNS UUID
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
    `);

    // Minimal auth.jwt() function used by some policies (service_role checks).
    await client.query(`
      CREATE OR REPLACE FUNCTION auth.jwt()
      RETURNS JSONB
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
      $$;
    `);

    // Common Supabase roles referenced by GRANT statements.
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
      END $$;
    `);

    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found: ${migrationsDir}`);
    }

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.toLowerCase().endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    if (!migrationFiles.length) {
      throw new Error(`No .sql migrations found in: ${migrationsDir}`);
    }

    console.log(`Applying ${migrationFiles.length} migrations from supabase/migrations...`);

    for (const fileName of migrationFiles) {
      const fullPath = path.join(migrationsDir, fileName);
      const sql = fs.readFileSync(fullPath, 'utf-8');

      console.log(`\n--- Applying ${fileName} ---`);
      try {
        await client.query(sql);
      } catch (err: any) {
        console.error(`\n❌ Migration failed: ${fileName}`);
        console.error(err?.message || err);

        if (err && typeof err === 'object') {
          if (err.code) console.error(`pg code: ${err.code}`);
          if (err.severity) console.error(`severity: ${err.severity}`);
          if (err.where) console.error(`where: ${err.where}`);
          if (err.detail) console.error(`detail: ${err.detail}`);
          if (err.hint) console.error(`hint: ${err.hint}`);

          const posRaw = err.position;
          const pos = typeof posRaw === 'string' ? parseInt(posRaw, 10) : posRaw;
          if (Number.isFinite(pos)) {
            const idx = Math.max(0, (pos as number) - 1);
            const start = Math.max(0, idx - 200);
            const end = Math.min(sql.length, idx + 200);
            const excerpt = sql.slice(start, end);
            console.error(`\n--- SQL excerpt around position ${pos} ---`);
            console.error(excerpt);
            console.error('--- end excerpt ---\n');
          }
        }
        throw err;
      }
    }

    console.log('\n✅ All migrations applied successfully.');
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('\nFatal error:', err?.message || err);
  process.exit(1);
});
