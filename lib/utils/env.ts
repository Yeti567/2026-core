/**
 * Safe Environment Variable Access
 * 
 * Provides type-safe access to environment variables with proper error handling
 */

/**
 * Get an environment variable, throwing if not set
 */
export function requireEnv(key: string): string {
  // Safe: key is controlled by code, not user input
  // eslint-disable-next-line security/detect-object-injection
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get an environment variable with a default value
 */
export function getEnv(key: string, defaultValue: string): string {
  // Safe: key is controlled by code, not user input
  // eslint-disable-next-line security/detect-object-injection
  return process.env[key] || defaultValue;
}

/**
 * Get Supabase configuration safely
 */
export function getSupabaseConfig() {
  return {
    url: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // Optional, only for admin operations
  };
}
