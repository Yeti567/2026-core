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

    // Support accidental "bare URL" lines like:
    // postgresql://user:pass@host/db?sslmode=require
    // (These contain '=' due to query params, so naive KEY=VALUE parsing breaks.)
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

async function main() {
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
    console.error('❌ Missing DATABASE_URL');
    console.error('   Set DATABASE_URL in .env.local (recommended) or as an environment variable.');
    if (fs.existsSync(path.join(process.cwd(), '.env.local'))) {
      console.error('   Tip: Ensure the line is exactly:');
      console.error('   DATABASE_URL=postgresql://user:password@host/db?sslmode=require');
      console.error('   (and avoid putting the URL on its own line without DATABASE_URL=)');
    } else {
      console.error('   No .env.local file found in project root.');
    }
    process.exit(1);
  }

  connectionString = connectionString.trim();
  if (connectionString.startsWith('"')) connectionString = connectionString.slice(1);
  if (connectionString.endsWith('"')) connectionString = connectionString.slice(0, -1);
  if (connectionString.startsWith("'")) connectionString = connectionString.slice(1);
  if (connectionString.endsWith("'")) connectionString = connectionString.slice(0, -1);

  if (/\r|\n/.test(connectionString)) {
    console.error('❌ DATABASE_URL contains a newline. It must be a single line.');
    process.exit(1);
  }

  console.log(`DATABASE_URL (sanitized): ${sanitizeDatabaseUrl(connectionString)}`);
  if (/\s/.test(connectionString)) {
    console.log('Note: DATABASE_URL contains whitespace; remove spaces around = or inside the URL.');
  }

  if (connectionString.startsWith("'") || connectionString.startsWith('"')) {
    console.log('Note: DATABASE_URL appears to start with a quote. Prefer no quotes:');
    console.log('  DATABASE_URL=postgresql://user:password@host/db?sslmode=require');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(connectionString);
  } catch {
    console.error('❌ DATABASE_URL is not a valid URL');
    console.error('   Expected format: postgresql://user:password@host:5432/dbname?sslmode=require');
    process.exit(1);
  }

  if (parsedUrl.protocol !== 'postgresql:' && parsedUrl.protocol !== 'postgres:') {
    console.error(`❌ DATABASE_URL must start with postgresql:// (got ${parsedUrl.protocol}//)`);
    process.exit(1);
  }

  if (!parsedUrl.hostname || parsedUrl.hostname === 'base') {
    console.error(`❌ DATABASE_URL hostname looks invalid: "${parsedUrl.hostname || '(empty)'}"`);
    console.error('   Re-copy the Neon connection string from the Neon dashboard (Connection details).');
    process.exit(1);
  }

  const dbName = parsedUrl.pathname?.replace(/^\//, '') || '';
  const dbUser = parsedUrl.username || '';
  console.log(`Using database host: ${parsedUrl.hostname}`);
  if (dbName) console.log(`Using database name: ${dbName}`);
  if (dbUser) console.log(`Using database user: ${dbUser}`);
  if (!parsedUrl.password) {
    console.log('Note: DATABASE_URL has an empty password. Neon requires a password.');
  }

  // Read schema file
  const schemaPath = path.join(__dirname, 'neon-schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  // Connect to NEON and execute schema
  const shouldUseSsl =
    connectionString.includes('sslmode=require') ||
    parsedUrl.hostname.endsWith('.neon.tech');

  const client = new Client({
    connectionString,
    ...(shouldUseSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();
  
  try {
    await client.query(schemaSql);
    console.log('✅ Schema successfully executed');
    
    // Verify tables
    const { rows: tables } = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log('\nCreated tables:', tables.map(t => t.table_name).join(', '));
  } catch (err) {
    console.error('❌ Error executing schema:', err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
