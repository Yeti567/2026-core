import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Load DATABASE_URL from .env.local
function loadDatabaseUrl(): string {
  // Try environment variable first
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Load from .env.local file
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DATABASE_URL=')) {
        return trimmed.substring('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
      }
      
      // Also handle bare URLs (no DATABASE_URL= prefix)
      if (trimmed.startsWith('postgresql://') || trimmed.startsWith('postgres://')) {
        return trimmed.replace(/^["']|["']$/g, '');
      }
    }
  }
  
  throw new Error('DATABASE_URL not found in environment or .env.local');
}

// Simple PostgreSQL client wrapper for Neon
export class PostgresClient {
  private pool: Pool;

  constructor() {
    const databaseUrl = loadDatabaseUrl();
    
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  async query(text: string, params?: any[]) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

// Singleton instance
let postgresClient: PostgresClient | null = null;

export function getPostgresClient() {
  if (!postgresClient) {
    postgresClient = new PostgresClient();
  }
  return postgresClient;
}
