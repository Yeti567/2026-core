/**
 * Supabase Database Types
 *
 * This project keeps its canonical (hand-maintained) database typing in
 * `lib/db/types.ts`. Supabase client wrappers import from `lib/supabase/*`,
 * so we re-export the Database type here to keep import paths stable.
 */

export type { Database } from '@/lib/db/types';

