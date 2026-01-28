const POSTGRES_DEPRECATED_MESSAGE =
  'Postgres/Neon support has been removed. Update callers to use Supabase.';

export class PostgresClient {
  async query(): Promise<never> {
    throw new Error(POSTGRES_DEPRECATED_MESSAGE);
  }

  async close(): Promise<void> {
    return;
  }
}

export function getPostgresClient(): PostgresClient {
  throw new Error(POSTGRES_DEPRECATED_MESSAGE);
}
