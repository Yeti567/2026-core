import { createNeonWrapper } from './neon-wrapper';

// Migration helper to replace Supabase client calls
export function migrateSupabaseToNeon() {
  const neon = createNeonWrapper();
  
  return {
    // Replace createRouteHandlerClient / createServerActionClient
    createRouteHandlerClient: () => neon,
    createServerActionClient: () => neon,
    createServerComponentClient: () => neon,
    
    // Replace service role client
    createServiceClient: () => neon,
    
    // Export the wrapper directly
    neon
  };
}
