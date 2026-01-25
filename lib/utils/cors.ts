/**
 * CORS (Cross-Origin Resource Sharing) Utility
 * 
 * Provides secure CORS configuration for API routes.
 * 
 * Security Best Practices:
 * - NEVER use '*' for Access-Control-Allow-Origin in production
 * - Always specify exact origins
 * - Use environment variables for allowed origins
 * - Include credentials only when necessary
 * - Set appropriate max-age for preflight caching
 * 
 * Usage:
 * ```typescript
 * import { setCorsHeaders, handleCorsPreflight } from '@/lib/utils/cors';
 * 
 * export async function GET(request: Request) {
 *   const response = NextResponse.json(data);
 *   setCorsHeaders(response, request);
 *   return response;
 * }
 * 
 * export async function OPTIONS(request: Request) {
 *   return handleCorsPreflight(request);
 * }
 * ```
 */

import { NextResponse, type NextRequest } from 'next/server';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Get allowed origins from environment or use default
 * In production, this should be set via environment variables
 */
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS;
  
  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim());
  }
  
  // Default: Only allow same-origin (no CORS needed)
  // If you need CORS, set CORS_ALLOWED_ORIGINS environment variable
  return [];
}

/**
 * Check if an origin is allowed
 */
function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  
  // Exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // Wildcard subdomain matching (e.g., *.example.com)
  for (const allowed of allowedOrigins) {
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      if (origin.endsWith(`.${domain}`) || origin === domain) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Get the origin to allow (or null if not allowed)
 */
function getAllowedOrigin(request: NextRequest, allowedOrigins: string[]): string | null {
  const origin = request.headers.get('origin');
  
  if (!origin) {
    // Same-origin request (no CORS needed)
    return null;
  }
  
  if (isOriginAllowed(origin, allowedOrigins)) {
    return origin;
  }
  
  // Origin not allowed
  return null;
}

// =============================================================================
// CORS HEADERS
// =============================================================================

export interface CorsOptions {
  /** Allowed HTTP methods */
  methods?: string[];
  /** Allowed headers */
  allowedHeaders?: string[];
  /** Exposed headers */
  exposedHeaders?: string[];
  /** Whether to allow credentials */
  credentials?: boolean;
  /** Max age for preflight cache (seconds) */
  maxAge?: number;
}

const DEFAULT_CORS_OPTIONS: Required<CorsOptions> = {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: [],
  credentials: false,
  maxAge: 86400, // 24 hours
};

/**
 * Set CORS headers on a response
 * 
 * @param response The NextResponse to add headers to
 * @param request The incoming request
 * @param options CORS configuration options
 */
export function setCorsHeaders(
  response: NextResponse,
  request: NextRequest,
  options: CorsOptions = {}
): void {
  const allowedOrigins = getAllowedOrigins();
  
  // If no origins configured, don't set CORS headers (same-origin only)
  if (allowedOrigins.length === 0) {
    return;
  }
  
  const opts = { ...DEFAULT_CORS_OPTIONS, ...options };
  const allowedOrigin = getAllowedOrigin(request, allowedOrigins);
  
  if (allowedOrigin) {
    // Set allowed origin (never use '*')
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    
    // Set allowed methods
    response.headers.set(
      'Access-Control-Allow-Methods',
      opts.methods.join(', ')
    );
    
    // Set allowed headers
    response.headers.set(
      'Access-Control-Allow-Headers',
      opts.allowedHeaders.join(', ')
    );
    
    // Set exposed headers if any
    if (opts.exposedHeaders.length > 0) {
      response.headers.set(
        'Access-Control-Expose-Headers',
        opts.exposedHeaders.join(', ')
      );
    }
    
    // Set credentials flag
    if (opts.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    // Set Vary header to indicate origin-based response
    response.headers.set('Vary', 'Origin');
  }
  // If origin not allowed, don't set CORS headers (browser will block)
}

/**
 * Handle CORS preflight (OPTIONS) request
 * 
 * @param request The incoming OPTIONS request
 * @param options CORS configuration options
 * @returns Response with CORS headers
 */
export function handleCorsPreflight(
  request: NextRequest,
  options: CorsOptions = {}
): NextResponse {
  const allowedOrigins = getAllowedOrigins();
  
  // If no origins configured, return 204 No Content (no CORS)
  if (allowedOrigins.length === 0) {
    return new NextResponse(null, { status: 204 });
  }
  
  const opts = { ...DEFAULT_CORS_OPTIONS, ...options };
  const allowedOrigin = getAllowedOrigin(request, allowedOrigins);
  
  if (!allowedOrigin) {
    // Origin not allowed
    return new NextResponse(null, { status: 403 });
  }
  
  const response = new NextResponse(null, { status: 204 });
  
  // Set CORS headers
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set(
    'Access-Control-Allow-Methods',
    opts.methods.join(', ')
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    opts.allowedHeaders.join(', ')
  );
  
  if (opts.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  // Set max age for preflight cache
  response.headers.set('Access-Control-Max-Age', opts.maxAge.toString());
  
  // Set Vary header
  response.headers.set('Vary', 'Origin');
  
  return response;
}

/**
 * Create a CORS-enabled response helper
 * 
 * @param data Response data
 * @param request The incoming request
 * @param options CORS configuration options
 * @returns NextResponse with CORS headers
 */
export function corsResponse(
  data: unknown,
  request: NextRequest,
  status: number = 200,
  options: CorsOptions = {}
): NextResponse {
  const response = NextResponse.json(data, { status });
  setCorsHeaders(response, request, options);
  return response;
}

/**
 * Check if CORS is needed for a request
 * 
 * @param request The incoming request
 * @returns true if CORS headers should be set
 */
export function needsCors(request: NextRequest): boolean {
  const allowedOrigins = getAllowedOrigins();
  const origin = request.headers.get('origin');
  
  // CORS is only needed for cross-origin requests
  return allowedOrigins.length > 0 && origin !== null && origin !== request.nextUrl.origin;
}
