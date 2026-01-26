/**
 * Secure CORS Configuration
 * 
 * Provides secure CORS configuration to prevent cross-origin attacks
 * while allowing legitimate cross-origin requests.
 */

import { getEnvVar } from './secure-env';

/**
 * CORS configuration options
 */
export interface CorsOptions {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  optionsSuccessStatus?: number;
}

/**
 * Default secure CORS configuration
 */
export const defaultCorsConfig: CorsOptions = {
  allowedOrigins: [
    getEnvVar('NEXT_PUBLIC_APP_URL', false, 'http://localhost:3000'),
    'https://localhost:3000',
    'http://localhost:3000'
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Company-ID',
    'X-User-Role',
    'X-User-ID',
    'X-Nonce'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Total-Count',
    'X-Page-Count'
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 204
};

/**
 * Parse allowed origins from environment variable
 */
function parseAllowedOrigins(): string[] {
  const originsEnv = getEnvVar('CORS_ALLOWED_ORIGINS', false);
  if (!originsEnv) {
    return defaultCorsConfig.allowedOrigins || [];
  }
  
  return originsEnv.split(',').map(origin => origin.trim()).filter(Boolean);
}

/**
 * Validate origin against allowed origins
 * @param origin - Origin to validate
 * @param allowedOrigins - List of allowed origins
 * @returns True if origin is allowed
 */
export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  // Handle wildcard
  if (allowedOrigins.includes('*')) {
    return true;
  }
  
  // Exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // Subdomain wildcard (e.g., *.example.com)
  for (const allowedOrigin of allowedOrigins) {
    if (allowedOrigin.startsWith('*.')) {
      const domain = allowedOrigin.slice(2); // Remove '*.'
      if (origin.endsWith(domain) && origin.length > domain.length) {
        const subdomain = origin.slice(0, -domain.length - 1); // Remove domain and dot
        if (subdomain && !subdomain.includes('.')) {
          return true; // Single subdomain
        }
      }
    }
  }
  
  return false;
}

/**
 * Create CORS headers for response
 * @param origin - Request origin
 * @param options - CORS configuration options
 * @returns CORS headers object
 */
export function createCorsHeaders(origin: string, options: CorsOptions = {}): Record<string, string> {
  const config = { ...defaultCorsConfig, ...options };
  const allowedOrigins = config.allowedOrigins || parseAllowedOrigins();
  
  const headers: Record<string, string> = {};
  
  // Check if origin is allowed
  if (isOriginAllowed(origin, allowedOrigins)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (allowedOrigins.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  
  // Set other CORS headers
  if (config.allowedMethods) {
    headers['Access-Control-Allow-Methods'] = config.allowedMethods.join(', ');
  }
  
  if (config.allowedHeaders) {
    headers['Access-Control-Allow-Headers'] = config.allowedHeaders.join(', ');
  }
  
  if (config.exposedHeaders) {
    headers['Access-Control-Expose-Headers'] = config.exposedHeaders.join(', ');
  }
  
  if (config.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  
  if (config.maxAge) {
    headers['Access-Control-Max-Age'] = config.maxAge.toString();
  }
  
  // Additional security headers
  headers['Vary'] = 'Origin';
  headers['X-Content-Type-Options'] = 'nosniff';
  headers['X-Frame-Options'] = 'DENY';
  headers['X-XSS-Protection'] = '1; mode=block';
  headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
  
  return headers;
}

/**
 * Handle preflight OPTIONS request
 * @param origin - Request origin
 * @param method - Request method
 * @param headers - Request headers
 * @param options - CORS configuration options
 * @returns Response with appropriate CORS headers
 */
export function handlePreflightRequest(
  origin: string,
  method: string,
  headers: string[],
  options: CorsOptions = {}
): Response {
  const config = { ...defaultCorsConfig, ...options };
  const allowedOrigins = config.allowedOrigins || parseAllowedOrigins();
  
  // Check origin
  if (!isOriginAllowed(origin, allowedOrigins)) {
    return new Response(null, { status: 403 });
  }
  
  // Check method
  if (config.allowedMethods && !config.allowedMethods.includes(method)) {
    return new Response(null, { status: 405 });
  }
  
  // Check headers
  if (config.allowedHeaders) {
    const hasValidHeaders = headers.every(header => 
      config.allowedHeaders!.includes(header) || header.toLowerCase() === 'content-type'
    );
    
    if (!hasValidHeaders) {
      return new Response(null, { status: 400 });
    }
  }
  
  // Create successful preflight response
  const corsHeaders = createCorsHeaders(origin, config);
  const status = config.optionsSuccessStatus || 204;
  
  return new Response(null, {
    status,
    headers: corsHeaders
  });
}

/**
 * CORS middleware for API routes
 */
export function withCors(
  handler: (request: Request, context?: any) => Promise<Response>,
  options: CorsOptions = {}
) {
  return async (request: Request, context?: any): Promise<Response> => {
    const origin = request.headers.get('Origin') || '';
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      const method = request.headers.get('Access-Control-Request-Method') || '';
      const headers = request.headers.get('Access-Control-Request-Headers')?.split(',').map(h => h.trim()) || [];
      
      return handlePreflightRequest(origin, method, headers, options);
    }
    
    // Handle actual request
    const response = await handler(request, context);
    
    // Add CORS headers to response
    const corsHeaders = createCorsHeaders(origin, options);
    
    // Create new response with CORS headers
    const responseHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  };
}

/**
 * Validate CORS configuration
 * @param config - CORS configuration to validate
 * @returns Validation result
 */
export function validateCorsConfig(config: CorsOptions): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validate origins
  if (config.allowedOrigins) {
    for (const origin of config.allowedOrigins) {
      if (origin !== '*') {
        try {
          new URL(origin);
        } catch {
          errors.push(`Invalid origin format: ${origin}`);
        }
      }
    }
  }
  
  // Validate methods
  if (config.allowedMethods) {
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    for (const method of config.allowedMethods) {
      if (!validMethods.includes(method.toUpperCase())) {
        errors.push(`Invalid HTTP method: ${method}`);
      }
    }
  }
  
  // Validate headers
  if (config.allowedHeaders) {
    for (const header of config.allowedHeaders) {
      if (!/^[a-zA-Z0-9\-_]+$/.test(header)) {
        errors.push(`Invalid header format: ${header}`);
      }
    }
  }
  
  // Validate maxAge
  if (config.maxAge !== undefined) {
    if (typeof config.maxAge !== 'number' || config.maxAge < 0 || config.maxAge > 86400) {
      errors.push('Max-Age must be a number between 0 and 86400 (24 hours)');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get CORS configuration for different environments
 */
export function getCorsConfigForEnvironment(): CorsOptions {
  const nodeEnv = getEnvVar('NODE_ENV', false, 'development');
  
  const baseConfig = { ...defaultCorsConfig };
  
  switch (nodeEnv) {
    case 'production':
      // Production: strict CORS
      return {
        ...baseConfig,
        allowedOrigins: parseAllowedOrigins(),
        credentials: true,
        maxAge: 7200 // 2 hours
      };
    
    case 'staging':
      // Staging: moderate CORS
      return {
        ...baseConfig,
        allowedOrigins: [
          ...parseAllowedOrigins(),
          'https://staging.cor-pathways.com',
          'https://*.staging.cor-pathways.com'
        ],
        credentials: true,
        maxAge: 3600 // 1 hour
      };
    
    case 'development':
    default:
      // Development: permissive CORS
      return {
        ...baseConfig,
        allowedOrigins: [
          ...parseAllowedOrigins(),
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:8080',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
          'http://192.168.*.*', // Local network
          'https://localhost:3000'
        ],
        credentials: true,
        maxAge: 86400 // 24 hours
      };
  }
}

/**
 * CORS security headers for all responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin'
  };
}

/**
 * Middleware to add security headers to all responses
 */
export function withSecurityHeaders(
  handler: (request: Request, context?: any) => Promise<Response>
) {
  return async (request: Request, context?: any): Promise<Response> => {
    const response = await handler(request, context);
    
    const securityHeaders = getSecurityHeaders();
    const responseHeaders = new Headers(response.headers);
    
    Object.entries(securityHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  };
}

/**
 * Combined CORS and security headers middleware
 */
export function withCorsAndSecurity(
  handler: (request: Request, context?: any) => Promise<Response>,
  corsOptions?: CorsOptions
) {
  return withCors(withSecurityHeaders(handler), corsOptions);
}
