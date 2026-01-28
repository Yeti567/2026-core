/**
 * Secure Environment Variable Handling
 * 
 * Provides safe access to environment variables with validation
 * and prevents accidental exposure of sensitive values.
 */

// List of sensitive environment variable names
const SENSITIVE_VARS = [
  'JWT_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'POSTGRES_URL',
  'NEON_DATABASE_URL',
  'ANTHROPIC_API_KEY',
  'OPENROUTER_API_KEY',
  'RESEND_API_KEY',
  'AUDITSOFT_WEBHOOK_SECRET',
  'UPSTASH_REDIS_REST_TOKEN',
  'SENTRY_DSN',
  'VAPID_PRIVATE_KEY'
];

// List of public environment variables (safe to expose)
const PUBLIC_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL',
  'NODE_ENV',
  'VERCEL_ENV'
];

/**
 * Get environment variable with validation
 * @param key - Environment variable name
 * @param required - Whether the variable is required
 * @param defaultValue - Default value if not found (only for non-required vars)
 * @returns Environment variable value or throws error if required and missing
 */
export function getEnvVar(key: string, required: boolean = false, defaultValue?: string): string {
  // eslint-disable-next-line security/detect-object-injection
  const value = process.env[key];

  if (!value) {
    if (required) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    return '';
  }

  return value;
}

/**
 * Get environment variable with type validation
 * @param key - Environment variable name
 * @param validator - Function to validate the value
 * @param required - Whether the variable is required
 * @returns Validated environment variable value
 */
export function getEnvVarWithValidation<T>(
  key: string,
  validator: (value: string) => T,
  required: boolean = false
): T {
  // eslint-disable-next-line security/detect-object-injection
  const value = process.env[key];

  if (!value) {
    if (required) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    throw new Error(`Environment variable ${key} is required for validation`);
  }

  try {
    return validator(value);
  } catch (error) {
    throw new Error(`Invalid value for environment variable ${key}: ${error}`);
  }
}

/**
 * Check if an environment variable is sensitive
 * @param key - Environment variable name
 * @returns True if the variable contains sensitive data
 */
export function isSensitiveVar(key: string): boolean {
  return SENSITIVE_VARS.includes(key) ||
    key.toLowerCase().includes('secret') ||
    key.toLowerCase().includes('key') ||
    key.toLowerCase().includes('password') ||
    key.toLowerCase().includes('token');
}

/**
 * Check if an environment variable is public (safe to expose)
 * @param key - Environment variable name
 * @returns True if the variable is safe to expose
 */
export function isPublicVar(key: string): boolean {
  return PUBLIC_VARS.includes(key) || key.startsWith('NEXT_PUBLIC_');
}

/**
 * Sanitize environment variable for logging
 * @param key - Environment variable name
 * @param value - Environment variable value
 * @returns Sanitized value safe for logging
 */
export function sanitizeForLogging(key: string, value: string): string {
  if (isSensitiveVar(key)) {
    return '[REDACTED]';
  }

  // For other variables, show first few characters if it's not obviously sensitive
  if (value.length > 10 && !isPublicVar(key)) {
    return value.substring(0, 3) + '***';
  }

  return value;
}

/**
 * Validate all required environment variables on startup
 * @param requiredVars - List of required environment variable names
 */
export function validateRequiredEnvVars(requiredVars: string[]): void {
  const missing: string[] = [];

  for (const varName of requiredVars) {
    // eslint-disable-next-line security/detect-object-injection
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Get database URL with fallback logic
 * @returns Database connection string
 */
export function getDatabaseUrl(): string {
  const possibleUrls = [
    'DATABASE_URL',
    'POSTGRES_URL',
    'NEON_DATABASE_URL',
    'DATABASE_URL_UNPOOLED',
    'POSTGRES_URL_UNPOOLED'
  ];

  for (const urlKey of possibleUrls) {
    // eslint-disable-next-line security/detect-object-injection
    const url = process.env[urlKey];
    if (url) {
      return url;
    }
  }

  throw new Error('No database URL found. Please set DATABASE_URL or POSTGRES_URL');
}

/**
 * Common validators for environment variables
 */
export const validators = {
  url: (value: string): string => {
    try {
      new URL(value);
      return value;
    } catch {
      throw new Error('Must be a valid URL');
    }
  },

  email: (value: string): string => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new Error('Must be a valid email address');
    }
    return value;
  },

  port: (value: string): number => {
    const port = parseInt(value, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error('Must be a valid port number (1-65535)');
    }
    return port;
  },

  boolean: (value: string): boolean => {
    const lower = value.toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(lower)) return true;
    if (['false', '0', 'no', 'off'].includes(lower)) return false;
    throw new Error('Must be a boolean value (true/false, 1/0, yes/no, on/off)');
  }
};

/**
 * Environment configuration object with type safety
 * Uses getters for lazy evaluation to avoid build-time errors
 */
export const env = {
  // Database
  get databaseUrl() { return getDatabaseUrl(); },

  // Supabase
  get supabaseUrl() { return getEnvVar('NEXT_PUBLIC_SUPABASE_URL', true); },
  get supabaseAnonKey() { return getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', true); },
  get supabaseServiceKey() { return getEnvVar('SUPABASE_SERVICE_ROLE_KEY', true); },

  // JWT
  get jwtSecret() { return getEnvVar('JWT_SECRET', true); },
  get jwtExpiresIn() { return getEnvVar('JWT_EXPIRES_IN', false, '7d'); },

  // Application
  get appUrl() { return getEnvVar('NEXT_PUBLIC_APP_URL', false, 'http://localhost:3000'); },
  get nodeEnv() { return getEnvVar('NODE_ENV', false, 'development'); },

  // Rate limiting
  get upstashRedisUrl() { return getEnvVar('UPSTASH_REDIS_REST_URL', false); },
  get upstashRedisToken() { return getEnvVar('UPSTASH_REDIS_REST_TOKEN', false); },

  // Email
  get resendApiKey() { return getEnvVar('RESEND_API_KEY', false); },
  get resendFromEmail() { return getEnvVar('RESEND_FROM_EMAIL', false); },

  // AI Services
  get anthropicApiKey() { return getEnvVar('ANTHROPIC_API_KEY', false); },
  get openrouterApiKey() { return getEnvVar('OPENROUTER_API_KEY', false); },

  // Webhooks
  get auditsoftWebhookSecret() { return getEnvVar('AUDITSOFT_WEBHOOK_SECRET', false); },

  // Monitoring
  get sentryDsn() { return getEnvVar('SENTRY_DSN', false); }
};
