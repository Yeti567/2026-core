/**
 * Rate Limiting Utility
 * 
 * Provides rate limiting for API routes to prevent abuse and DoS attacks.
 * Supports multiple backends (in order of preference):
 * 1. Upstash Redis (recommended for production, distributed systems)
 * 2. Database (Supabase) - fallback for distributed systems
 * 3. In-memory (single-instance deployments, development)
 * 
 * Usage:
 * ```typescript
 * import { rateLimit } from '@/lib/utils/rate-limit';
 * 
 * export async function POST(request: Request) {
 *   const identifier = request.headers.get('x-forwarded-for') ?? 'unknown';
 *   const { success, limit, remaining, reset } = await rateLimit({
 *     identifier,
 *     limit: 10,
 *     window: '10s',
 *   });
 *   
 *   if (!success) {
 *     return new Response('Rate limit exceeded', { 
 *       status: 429,
 *       headers: {
 *         'X-RateLimit-Limit': limit.toString(),
 *         'X-RateLimit-Remaining': remaining.toString(),
 *         'X-RateLimit-Reset': reset.toString(),
 *       }
 *     });
 *   }
 *   
 *   // Continue with request...
 * }
 */

import { createRouteHandlerClient } from '@/lib/supabase/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client (uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env)
// Falls back gracefully if not configured
let upstashRedis: Redis | null = null;
let upstashRatelimit: Ratelimit | null = null;

function getUpstashClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  if (!upstashRedis) {
    try {
      upstashRedis = Redis.fromEnv();
    } catch (error) {
      console.warn('Failed to initialize Upstash Redis:', error);
      return null;
    }
  }

  return upstashRedis;
}

function getUpstashRatelimit(): Ratelimit | null {
  const redis = getUpstashClient();
  if (!redis) {
    return null;
  }

  if (!upstashRatelimit) {
    try {
      upstashRatelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '10s'), // Default limiter (overridden per call with specific limits)
        analytics: true,
      });
    } catch (error) {
      console.warn('Failed to initialize Upstash Ratelimit:', error);
      return null;
    }
  }

  return upstashRatelimit;
}

// =============================================================================
// TYPES
// =============================================================================

export interface RateLimitOptions {
  /** Unique identifier (IP address, user ID, email, etc.) */
  identifier: string;
  /** Maximum number of requests allowed */
  limit: number;
  /** Time window (e.g., '10s', '1m', '1h') */
  window: string;
  /** Optional: Force specific backend (auto-detected if not specified) */
  backend?: 'upstash' | 'database' | 'memory';
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Total limit */
  limit: number;
  /** Remaining requests */
  remaining: number;
  /** Unix timestamp when the limit resets */
  reset: number;
}

// =============================================================================
// IN-MEMORY STORE (for single-instance deployments)
// =============================================================================

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const inMemoryStore = new Map<string, RateLimitRecord>();

function parseWindow(window: string): number {
  const match = window.match(/^(\d+)([smh])$/);
  if (!match) {
    throw new Error(`Invalid window format: ${window}. Use format like '10s', '1m', '1h'`);
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid window unit: ${unit}`);
  }
}

function getInMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const record = inMemoryStore.get(key);
  
  // Clean up expired records periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    const keysToDelete: string[] = [];
    inMemoryStore.forEach((v, k) => {
      if (now > v.resetAt) {
        keysToDelete.push(k);
      }
    });
    keysToDelete.forEach(k => inMemoryStore.delete(k));
  }
  
  if (!record || now > record.resetAt) {
    // Create new record
    const resetAt = now + windowMs;
    inMemoryStore.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.floor(resetAt / 1000),
    };
  }
  
  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.floor(record.resetAt / 1000),
    };
  }
  
  record.count++;
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: Math.floor(record.resetAt / 1000),
  };
}

// =============================================================================
// UPSTASH REDIS STORE (recommended for production, distributed systems)
// =============================================================================

async function getUpstashRateLimit(
  key: string,
  limit: number,
  window: string
): Promise<RateLimitResult> {
  const redis = getUpstashClient();
  if (!redis) {
    throw new Error('Upstash Redis not configured');
  }

  // Convert window string to seconds for Upstash
  // Upstash expects window in seconds
  const windowSeconds = parseWindow(window) / 1000;
  
  // Create a sliding window limiter for this specific limit/window
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds}s`),
    analytics: true,
  });

  const result = await ratelimit.limit(key);

  return {
    success: result.success,
    limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

// =============================================================================
// DATABASE STORE (for distributed systems, fallback)
// =============================================================================

async function getDatabaseRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const supabase = createRouteHandlerClient();
  const now = Date.now();
  const resetAt = now + windowMs;
  
  // Use Supabase RPC or direct query
  // This is a simplified version - you may want to create a dedicated rate_limit table
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_ms: windowMs,
  });
  
  if (error) {
    // Fallback to in-memory if RPC doesn't exist
    console.warn('Rate limit RPC not found, falling back to in-memory:', error);
    return getInMemoryRateLimit(key, limit, windowMs);
  }
  
  return {
    success: data?.allowed ?? false,
    limit,
    remaining: Math.max(0, limit - (data?.count ?? 0)),
    reset: Math.floor(resetAt / 1000),
  };
}

// =============================================================================
// MAIN RATE LIMIT FUNCTION
// =============================================================================

/**
 * Check rate limit for a given identifier
 * 
 * Automatically selects the best available backend:
 * 1. Upstash Redis (if configured)
 * 2. Database (if useDatabase=true or backend='database')
 * 3. In-memory (fallback)
 * 
 * @param options Rate limit configuration
 * @returns Rate limit result with success status and metadata
 */
export async function rateLimit(
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { identifier, limit, window, backend } = options;
  
  // Normalize identifier (remove port, lowercase, etc.)
  const normalizedId = identifier.toLowerCase().trim().split(':')[0];
  const key = `rate_limit:${normalizedId}:${limit}:${window}`;
  const windowMs = parseWindow(window);

  // Force specific backend if requested
  if (backend === 'upstash') {
    try {
      return await getUpstashRateLimit(key, limit, window);
    } catch (error) {
      console.warn('Upstash rate limit failed, falling back:', error);
      // Fall through to next backend
    }
  }

  if (backend === 'database') {
    return getDatabaseRateLimit(key, limit, windowMs);
  }

  if (backend === 'memory') {
    return getInMemoryRateLimit(key, limit, windowMs);
  }

  // Auto-select backend (prefer Upstash, then database, then memory)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      return await getUpstashRateLimit(key, limit, window);
    } catch (error) {
      console.warn('Upstash rate limit failed, falling back to database:', error);
    }
  }

  // Try database if available (for user-based limits)
  if (options.backend !== 'memory') {
    try {
      return await getDatabaseRateLimit(key, limit, windowMs);
    } catch (error) {
      console.warn('Database rate limit failed, falling back to memory:', error);
    }
  }

  // Fallback to in-memory
  return getInMemoryRateLimit(key, limit, windowMs);
}

// =============================================================================
// CONVENIENCE FUNCTIONS FOR COMMON SCENARIOS
// =============================================================================

/**
 * Rate limit by IP address
 */
export async function rateLimitByIP(
  request: Request,
  limit: number,
  window: string
): Promise<RateLimitResult> {
  const ip = 
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  
  return rateLimit({
    identifier: ip,
    limit,
    window,
  });
}

/**
 * Rate limit by user ID (for authenticated routes)
 * 
 * Uses distributed backend (Upstash Redis if available, otherwise database)
 * to ensure rate limits persist across server restarts and work in distributed deployments.
 */
export async function rateLimitByUser(
  userId: string,
  limit: number,
  window: string
): Promise<RateLimitResult> {
  return rateLimit({
    identifier: userId,
    limit,
    window,
    // Auto-select: Upstash > Database > Memory
    // Will use Upstash if configured, otherwise database, otherwise memory
  });
}

/**
 * Rate limit by email (for auth routes)
 * 
 * Uses distributed backend (Upstash Redis if available, otherwise database)
 * to ensure rate limits persist across server restarts and work in distributed deployments.
 */
export async function rateLimitByEmail(
  email: string,
  limit: number,
  window: string
): Promise<RateLimitResult> {
  const normalizedEmail = email.toLowerCase().trim();
  return rateLimit({
    identifier: `email:${normalizedEmail}`,
    limit,
    window,
    // Auto-select: Upstash > Database > Memory
  });
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
}

/**
 * Create rate limit error response
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again after ${new Date(result.reset * 1000).toISOString()}`,
      retryAfter: result.reset - Math.floor(Date.now() / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...createRateLimitHeaders(result),
        'Retry-After': (result.reset - Math.floor(Date.now() / 1000)).toString(),
      },
    }
  );
}

// =============================================================================
// LEGACY API (for backward compatibility)
// =============================================================================

/**
 * Legacy checkRateLimit function (backward compatibility)
 * @deprecated Use rateLimit() or rateLimitByIP() instead
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; resetAt: number } {
  const window = `${Math.floor(windowMs / 1000)}s`;
  const result = getInMemoryRateLimit(key, limit, windowMs);
  
  return {
    allowed: result.success,
    resetAt: result.reset * 1000,
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
