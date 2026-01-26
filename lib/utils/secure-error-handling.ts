/**
 * Secure Error Handling
 * 
 * Provides secure error handling that prevents information disclosure
 * while maintaining useful debugging information for developers.
 */

import { sanitizeForLogging } from './secure-env';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  NETWORK = 'network',
  SYSTEM = 'system',
  BUSINESS_LOGIC = 'business_logic',
  SECURITY = 'security'
}

/**
 * Secure error interface
 */
export interface SecureError {
  message: string;
  code?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessage: string;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  details?: Record<string, any>;
}

/**
 * Create a secure error object
 * @param error - Original error
 * @param context - Error context
 * @returns Secure error object
 */
export function createSecureError(
  error: Error | string,
  context: {
    category: ErrorCategory;
    severity: ErrorSeverity;
    userMessage?: string;
    code?: string;
    requestId?: string;
    userId?: string;
    details?: Record<string, any>;
  }
): SecureError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const stack = typeof error === 'string' ? undefined : error.stack;
  
  // Determine user-friendly message
  let userMessage = context.userMessage;
  if (!userMessage) {
    userMessage = getDefaultUserMessage(context.category, context.severity);
  }
  
  const secureError: SecureError = {
    message: errorMessage,
    code: context.code,
    category: context.category,
    severity: context.severity,
    userMessage,
    timestamp: new Date(),
    requestId: context.requestId,
    userId: context.userId,
    details: context.details
  };
  
  // Add stack trace to details for debugging (only in development)
  if (stack && process.env.NODE_ENV === 'development') {
    secureError.details = {
      ...secureError.details,
      stack
    };
  }
  
  return secureError;
}

/**
 * Get default user-friendly message based on error category and severity
 */
function getDefaultUserMessage(category: ErrorCategory, severity: ErrorSeverity): string {
  switch (category) {
    case ErrorCategory.VALIDATION:
      return 'Please check your input and try again.';
    
    case ErrorCategory.AUTHENTICATION:
      return 'Authentication failed. Please check your credentials and try again.';
    
    case ErrorCategory.AUTHORIZATION:
      return 'You do not have permission to perform this action.';
    
    case ErrorCategory.DATABASE:
      if (severity === ErrorSeverity.CRITICAL) {
        return 'We are experiencing technical difficulties. Please try again later.';
      }
      return 'Unable to process your request at this time. Please try again.';
    
    case ErrorCategory.NETWORK:
      return 'Connection error. Please check your internet connection and try again.';
    
    case ErrorCategory.SYSTEM:
      return 'System error occurred. Please try again later.';
    
    case ErrorCategory.BUSINESS_LOGIC:
      return 'Unable to complete this request. Please contact support if the problem persists.';
    
    case ErrorCategory.SECURITY:
      return 'Security validation failed. Please try again.';
    
    default:
      return 'An error occurred. Please try again.';
  }
}

/**
 * Handle API error securely
 * @param error - Error to handle
 * @param context - Error context
 * @returns NextResponse with appropriate error information
 */
export function handleSecureApiError(
  error: Error | string,
  context: {
    category: ErrorCategory;
    severity: ErrorSeverity;
    userMessage?: string;
    code?: string;
    requestId?: string;
    userId?: string;
  }
): Response {
  const secureError = createSecureError(error, context);
  
  // Log the error securely
  logSecureError(secureError);
  
  // Determine HTTP status code
  const statusCode = getHttpStatusCode(secureError.category, secureError.severity);
  
  // Create response body
  const responseBody: any = {
    error: secureError.userMessage,
    code: secureError.code
  };
  
  // Add request ID for tracking
  if (secureError.requestId) {
    responseBody.requestId = secureError.requestId;
  }
  
  // Add more details in development
  if (process.env.NODE_ENV === 'development') {
    responseBody.debug = {
      category: secureError.category,
      severity: secureError.severity,
      originalMessage: secureError.message,
      details: secureError.details
    };
  }
  
  return new Response(JSON.stringify(responseBody), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'X-Error-Code': secureError.code || 'UNKNOWN_ERROR',
      'X-Error-Category': secureError.category,
      'X-Error-Severity': secureError.severity
    }
  });
}

/**
 * Get appropriate HTTP status code for error
 */
function getHttpStatusCode(category: ErrorCategory, severity: ErrorSeverity): number {
  switch (category) {
    case ErrorCategory.VALIDATION:
      return 400;
    
    case ErrorCategory.AUTHENTICATION:
      return 401;
    
    case ErrorCategory.AUTHORIZATION:
      return 403;
    
    case ErrorCategory.DATABASE:
      return severity === ErrorSeverity.CRITICAL ? 503 : 500;
    
    case ErrorCategory.NETWORK:
      return 503;
    
    case ErrorCategory.SYSTEM:
      return 500;
    
    case ErrorCategory.BUSINESS_LOGIC:
      return 422;
    
    case ErrorCategory.SECURITY:
      return severity === ErrorSeverity.CRITICAL ? 403 : 400;
    
    default:
      return 500;
  }
}

/**
 * Log error securely without exposing sensitive information
 * @param error - Secure error to log
 */
export function logSecureError(error: SecureError): void {
  const logData = {
    timestamp: error.timestamp.toISOString(),
    category: error.category,
    severity: error.severity,
    code: error.code,
    message: error.message,
    userMessage: error.userMessage,
    requestId: error.requestId,
    userId: error.userId,
    // Sanitize details to remove sensitive information
    details: error.details ? sanitizeLogDetails(error.details) : undefined
  };
  
  // Log based on severity
  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
      console.error('CRITICAL ERROR:', JSON.stringify(logData, null, 2));
      break;
    
    case ErrorSeverity.HIGH:
      console.error('HIGH SEVERITY ERROR:', JSON.stringify(logData, null, 2));
      break;
    
    case ErrorSeverity.MEDIUM:
      console.warn('MEDIUM SEVERITY ERROR:', JSON.stringify(logData, null, 2));
      break;
    
    case ErrorSeverity.LOW:
      console.info('LOW SEVERITY ERROR:', JSON.stringify(logData, null, 2));
      break;
  }
}

/**
 * Sanitize log details to remove sensitive information
 * @param details - Details object to sanitize
 * @returns Sanitized details
 */
function sanitizeLogDetails(details: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(details)) {
    // Skip sensitive keys
    if (isSensitiveKey(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      // Check if the value itself contains sensitive information
      if (containsSensitiveInfo(value)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeLogDetails(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Check if a key is sensitive
 */
function isSensitiveKey(key: string): boolean {
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /auth/i,
    /credential/i,
    /ssn/i,
    /credit/i,
    /card/i,
    /bank/i,
    /account/i
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(key));
}

/**
 * Check if a string contains sensitive information
 */
function containsSensitiveInfo(value: string): boolean {
  const sensitivePatterns = [
    /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/, // Credit card numbers
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
    /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/, // Bearer tokens
    /sk_[A-Za-z0-9]{24,}/, // Stripe keys
    /ghp_[A-Za-z0-9]{36}/, // GitHub personal access tokens
    /xoxb-[0-9]{13}-[0-9]{13}-[A-Za-z0-9]{24}/ // Slack bot tokens
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(value));
}

/**
 * Error handling middleware for API routes
 */
export function withErrorHandling(
  handler: (request: Request, context?: any) => Promise<Response>,
  options: {
    category: ErrorCategory;
    severity: ErrorSeverity;
    userMessage?: string;
  }
) {
  return async (request: Request, context?: any): Promise<Response> => {
    try {
      return await handler(request, context);
    } catch (error) {
      // Generate request ID if not provided
      const requestId = crypto.randomUUID();
      
      return handleSecureApiError(error instanceof Error ? error : new Error(String(error)), {
        ...options,
        requestId,
        userId: context?.userId
      });
    }
  };
}

/**
 * Create error response for specific scenarios
 */
export const errorResponses = {
  validation: (message?: string) => handleSecureApiError(
    message || 'Validation failed',
    { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW, code: 'VALIDATION_ERROR' }
  ),
  
  authentication: (message?: string) => handleSecureApiError(
    message || 'Authentication failed',
    { category: ErrorCategory.AUTHENTICATION, severity: ErrorSeverity.MEDIUM, code: 'AUTH_ERROR' }
  ),
  
  authorization: (message?: string) => handleSecureApiError(
    message || 'Access denied',
    { category: ErrorCategory.AUTHORIZATION, severity: ErrorSeverity.MEDIUM, code: 'ACCESS_DENIED' }
  ),
  
  notFound: (resource?: string) => handleSecureApiError(
    resource ? `${resource} not found` : 'Resource not found',
    { category: ErrorCategory.BUSINESS_LOGIC, severity: ErrorSeverity.LOW, code: 'NOT_FOUND' }
  ),
  
  rateLimit: () => handleSecureApiError(
    'Rate limit exceeded',
    { category: ErrorCategory.SECURITY, severity: ErrorSeverity.MEDIUM, code: 'RATE_LIMITED' }
  ),
  
  serverError: (message?: string) => handleSecureApiError(
    message || 'Internal server error',
    { category: ErrorCategory.SYSTEM, severity: ErrorSeverity.HIGH, code: 'SERVER_ERROR' }
  ),
  
  databaseError: (message?: string) => handleSecureApiError(
    message || 'Database operation failed',
    { category: ErrorCategory.DATABASE, severity: ErrorSeverity.HIGH, code: 'DATABASE_ERROR' }
  )
};

/**
 * Wrap async functions with error handling
 */
export function withAsyncErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    category: ErrorCategory;
    severity: ErrorSeverity;
    userMessage?: string;
    onError?: (error: SecureError) => void;
  }
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const secureError = createSecureError(
        error instanceof Error ? error : new Error(String(error)),
        options
      );
      
      logSecureError(secureError);
      
      if (options.onError) {
        options.onError(secureError);
      }
      
      // Re-throw for the caller to handle
      throw secureError;
    }
  };
}

/**
 * Circuit breaker pattern for error handling
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private options: {
      failureThreshold: number;
      recoveryTimeout: number;
      monitoringPeriod: number;
    }
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.options.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.options.failureThreshold) {
        this.state = 'OPEN';
      }
      
      throw error;
    }
  }
  
  getState(): string {
    return this.state;
  }
  
  getFailures(): number {
    return this.failures;
  }
}
