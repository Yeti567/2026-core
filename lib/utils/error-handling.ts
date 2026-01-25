/**
 * Safe Error Handling Utility
 * 
 * Provides secure error handling to prevent information leakage.
 * 
 * Security Best Practices:
 * - Never expose internal error details to clients in production
 * - Log errors internally for debugging
 * - Return generic error messages to clients
 * - Only expose detailed errors in development
 * 
 * Usage:
 * ```typescript
 * import { handleApiError, createErrorResponse } from '@/lib/utils/error-handling';
 * 
 * export async function POST(request: Request) {
 *   try {
 *     // ... your code
 *   } catch (error) {
 *     return handleApiError(error, 'Failed to process request');
 *   }
 * }
 * ```
 */

import { NextResponse } from 'next/server';

// =============================================================================
// TYPES
// =============================================================================

export interface ErrorResponse {
  error: string;
  message?: string; // Only in development
  code?: string; // Only in development
}

// =============================================================================
// ERROR CLASSIFICATION
// =============================================================================

/**
 * Check if error contains sensitive information
 */
function containsSensitiveInfo(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const message = error.message.toLowerCase();
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /key/i,
    /token/i,
    /credential/i,
    /file:\/\//i,
    /\/[a-z]:\//i, // Windows paths
    /\/home\/[^/]+\//i, // Unix paths
    /\/var\/[^/]+\//i,
    /\/tmp\/[^/]+\//i,
    /database/i,
    /schema/i,
    /table.*does not exist/i,
    /column.*does not exist/i,
    /constraint/i,
    /foreign key/i,
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(message));
}

/**
 * Check if error is a database error
 */
function isDatabaseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const message = error.message.toLowerCase();
  const dbPatterns = [
    /postgres/i,
    /sql/i,
    /database/i,
    /relation.*does not exist/i,
    /column.*does not exist/i,
    /constraint/i,
    /foreign key/i,
    /unique constraint/i,
    /syntax error/i,
  ];
  
  return dbPatterns.some(pattern => pattern.test(message));
}

/**
 * Check if error contains file path information
 */
function containsFilePath(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const message = error.message;
  const pathPatterns = [
    /\/[a-z]:\//i, // Windows absolute paths
    /\/home\/[^/]+\//i, // Unix home paths
    /\/var\/[^/]+\//i,
    /\/tmp\/[^/]+\//i,
    /\.\.\//, // Relative paths
    /file:\/\//i,
  ];
  
  return pathPatterns.some(pattern => pattern.test(message));
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Sanitize error message for client response
 * 
 * @param error The error object
 * @param isDevelopment Whether we're in development mode
 * @returns Sanitized error message
 */
function sanitizeErrorMessage(
  error: unknown,
  isDevelopment: boolean = false
): string {
  if (!(error instanceof Error)) {
    return 'An unexpected error occurred';
  }
  
  // In development, return more details (but still sanitize sensitive info)
  if (isDevelopment) {
    if (containsSensitiveInfo(error)) {
      return `[Sensitive Error Hidden] ${error.constructor.name}`;
    }
    return error.message;
  }
  
  // In production, return generic messages based on error type
  if (isDatabaseError(error)) {
    return 'Database operation failed';
  }
  
  if (containsFilePath(error)) {
    return 'File operation failed';
  }
  
  if (containsSensitiveInfo(error)) {
    return 'An error occurred';
  }
  
  // Generic fallback
  return 'An error occurred';
}

/**
 * Log error internally (never expose to client)
 * 
 * @param error The error object
 * @param context Additional context for logging
 */
function logError(error: unknown, context?: string): void {
  if (error instanceof Error) {
    const logContext = context ? `[${context}]` : '';
    console.error(`${logContext} Error:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
  } else {
    console.error('Unknown error:', error);
  }
}

/**
 * Handle API error and return safe response
 * 
 * @param error The error object
 * @param defaultMessage Default message if error can't be sanitized
 * @param status HTTP status code (default: 500)
 * @param context Additional context for logging
 * @returns NextResponse with sanitized error
 */
export function handleApiError(
  error: unknown,
  defaultMessage: string = 'An error occurred',
  status: number = 500,
  context?: string
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Log error internally (never expose to client)
  logError(error, context);
  
  // Sanitize error message
  const sanitizedMessage = sanitizeErrorMessage(error, isDevelopment);
  
  // Build response
  const response: ErrorResponse = {
    error: sanitizedMessage,
  };
  
  // Add development-only details
  if (isDevelopment && error instanceof Error) {
    response.message = error.message;
    response.code = error.name;
  }
  
  return NextResponse.json(response, { status });
}

/**
 * Create error response with custom message
 * 
 * @param message Error message (will be sanitized in production)
 * @param status HTTP status code (default: 500)
 * @returns NextResponse with error
 */
export function createErrorResponse(
  message: string,
  status: number = 500
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // In production, use generic message if it contains sensitive info
  const sanitizedMessage = isDevelopment
    ? message
    : (containsSensitiveInfo(new Error(message)) ? 'An error occurred' : message);
  
  return NextResponse.json(
    { error: sanitizedMessage },
    { status }
  );
}

/**
 * Handle database errors specifically
 * 
 * @param error The error object
 * @param operation Description of the operation (e.g., 'create document')
 * @returns NextResponse with safe error
 */
export function handleDatabaseError(
  error: unknown,
  operation: string
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  logError(error, `Database operation: ${operation}`);
  
  if (isDevelopment && error instanceof Error) {
    return NextResponse.json(
      {
        error: 'Database operation failed',
        message: error.message,
        code: error.name,
      },
      { status: 500 }
    );
  }
  
  return NextResponse.json(
    { error: `Failed to ${operation}. Please try again.` },
    { status: 500 }
  );
}

/**
 * Handle file operation errors
 * 
 * @param error The error object
 * @param operation Description of the operation (e.g., 'upload file')
 * @returns NextResponse with safe error
 */
export function handleFileError(
  error: unknown,
  operation: string
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  logError(error, `File operation: ${operation}`);
  
  if (isDevelopment && error instanceof Error) {
    return NextResponse.json(
      {
        error: 'File operation failed',
        message: error.message.replace(/\/[^/]+\/[^/]+/g, '[PATH]'), // Mask paths
        code: error.name,
      },
      { status: 500 }
    );
  }
  
  return NextResponse.json(
    { error: `Failed to ${operation}. Please try again.` },
    { status: 500 }
  );
}

/**
 * Handle authentication errors
 * 
 * @param error The error object
 * @returns NextResponse with safe error
 */
export function handleAuthError(error: unknown): NextResponse {
  logError(error, 'Authentication');
  
  // Auth errors are usually safe to expose (they're user-facing)
  if (error instanceof Error) {
    // But still sanitize sensitive info
    const message = containsSensitiveInfo(error)
      ? 'Authentication failed'
      : error.message;
    
    return NextResponse.json(
      { error: message },
      { status: 401 }
    );
  }
  
  return NextResponse.json(
    { error: 'Authentication failed' },
    { status: 401 }
  );
}

/**
 * Handle validation errors (these are usually safe to expose)
 * 
 * @param error The error object
 * @param customMessage Optional custom message
 * @returns NextResponse with error
 */
export function handleValidationError(
  error: unknown,
  customMessage?: string
): NextResponse {
  logError(error, 'Validation');
  
  if (error instanceof Error && !containsSensitiveInfo(error)) {
    return NextResponse.json(
      { error: customMessage || error.message },
      { status: 400 }
    );
  }
  
  return NextResponse.json(
    { error: customMessage || 'Validation failed' },
    { status: 400 }
  );
}
