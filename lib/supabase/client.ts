/**
 * Supabase Client for Client-Side Usage
 * 
 * This creates a Supabase client that can be used in React components
 * and client-side code. Uses @supabase/ssr for proper cookie handling.
 */

'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for use in client components
 */
export function createClient() {
  // NOTE: This project does not currently ship full generated Supabase types
  // (including relationship metadata). Using the default generic keeps query
  // typing flexible and avoids cascades of `SelectQueryError<...>` types.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Singleton client instance for client-side use
 * Re-uses the same client instance to maintain auth state
 */
let clientInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}

// Re-export for convenience
export { createClient as createBrowserClient };
