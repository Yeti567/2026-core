/**
 * Secure Logging Utility
 * 
 * Provides secure logging that prevents sensitive information
 * from being exposed in logs while maintaining debugging capabilities.
 */

import { sanitizeForLogging, isSensitiveVar } from './secure-env';

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  sanitizeSensitiveData: boolean;
  includeStackTrace: boolean;
  maxContextSize: number;
  redactedFields: string[];
  customSanitizers?: Record<string, (value: any) => any>;
}

/**
 * Default logger configuration
 */
const defaultConfig: LoggerConfig = {
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  sanitizeSensitiveData: true,
  includeStackTrace: process.env.NODE_ENV === 'development',
  maxContextSize: 1000,
  redactedFields: [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'credential',
    'ssn',
    'credit',
    'card',
    'bank',
    'account',
    'api_key',
    'private_key',
    'session',
    'cookie',
    'authorization',
    'bearer'
  ]
};

/**
 * Secure Logger class
 */
export class SecureLogger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Log an error message
   */
  error(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log a trace message
   */
  trace(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, context);
  }

  /**
   * Core logging method
   */
  public log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    // Check if we should log at this level
    if (level > this.config.level) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: this.sanitizeMessage(message),
      context: context ? this.sanitizeContext(context) : undefined,
      error: error ? this.sanitizeError(error) : undefined
    };

    // Add request context if available
    this.addRequestContext(logEntry);

    // Output the log entry
    this.outputLogEntry(logEntry);
  }

  /**
   * Sanitize log message
   */
  private sanitizeMessage(message: string): string {
    if (!this.config.sanitizeSensitiveData) {
      return message;
    }

    // Remove potential sensitive patterns
    let sanitized = message;

    // Remove API keys and tokens
    sanitized = sanitized.replace(/sk_[A-Za-z0-9]{24,}/g, '[API_KEY]');
    sanitized = sanitized.replace(/ghp_[A-Za-z0-9]{36}/g, '[GITHUB_TOKEN]');
    sanitized = sanitized.replace(/xoxb-[0-9]{13}-[0-9]{13}-[A-Za-z0-9]{24}/g, '[SLACK_TOKEN]');
    sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g, '[BEARER_TOKEN]');

    // Remove credit card numbers
    sanitized = sanitized.replace(/\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g, '[CREDIT_CARD]');

    // Remove SSN patterns
    sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');

    // Remove email addresses (unless in development)
    if (process.env.NODE_ENV === 'production') {
      sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
    }

    // Remove IP addresses (unless in development)
    if (process.env.NODE_ENV === 'production') {
      // eslint-disable-next-line security/detect-unsafe-regex
      sanitized = sanitized.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP_ADDRESS]');
    }

    return sanitized;
  }

  /**
   * Sanitize context object
   */
  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    if (!this.config.sanitizeSensitiveData) {
      return context;
    }

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(context)) {
      // Check if key is sensitive
      if (this.isSensitiveKey(key)) {
        // eslint-disable-next-line security/detect-object-injection
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // Apply custom sanitizers
      // eslint-disable-next-line security/detect-object-injection
      if (this.config.customSanitizers && this.config.customSanitizers[key]) {
        // eslint-disable-next-line security/detect-object-injection
        sanitized[key] = this.config.customSanitizers[key](value);
        continue;
      }

      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          // eslint-disable-next-line security/detect-object-injection
          sanitized[key] = value.map(item =>
            typeof item === 'object' ? this.sanitizeContext(item) : this.sanitizeValue(key, item)
          );
        } else {
          // eslint-disable-next-line security/detect-object-injection
          sanitized[key] = this.sanitizeContext(value);
        }
      } else {
        // eslint-disable-next-line security/detect-object-injection
        sanitized[key] = this.sanitizeValue(key, value);
      }
    }

    // Limit context size
    return this.limitObjectSize(sanitized, this.config.maxContextSize);
  }

  /**
   * Check if a key is sensitive
   */
  private isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();

    // Check against redacted fields
    for (const field of this.config.redactedFields) {
      if (lowerKey.includes(field.toLowerCase())) {
        return true;
      }
    }

    // Check against environment variables
    if (isSensitiveVar(key)) {
      return true;
    }

    return false;
  }

  /**
   * Sanitize a value
   */
  private sanitizeValue(key: string, value: any): any {
    if (typeof value !== 'string') {
      return value;
    }

    // Apply message sanitization to string values
    return this.sanitizeMessage(value);
  }

  /**
   * Sanitize error object
   */
  private sanitizeError(error: Error): LogEntry['error'] {
    const sanitized: LogEntry['error'] = {
      name: error.name,
      message: this.sanitizeMessage(error.message)
    };

    // Include stack trace in development or if configured
    if (this.config.includeStackTrace && error.stack) {
      sanitized.stack = this.sanitizeMessage(error.stack);
    }

    return sanitized;
  }

  /**
   * Add request context to log entry
   */
  private addRequestContext(logEntry: LogEntry): void {
    // Try to get request context from async storage or global context
    // This would need to be implemented based on your request context handling
    // For now, we'll leave these as optional
  }

  /**
   * Limit object size to prevent memory issues
   */
  private limitObjectSize(obj: any, maxSize: number): any {
    const jsonString = JSON.stringify(obj);

    if (jsonString.length <= maxSize) {
      return obj;
    }

    // Truncate the object
    const truncated = jsonString.substring(0, maxSize - 20) + '...[TRUNCATED]';

    try {
      return JSON.parse(truncated);
    } catch {
      return { _truncated: true, _originalSize: jsonString.length };
    }
  }

  /**
   * Output log entry to console
   */
  private outputLogEntry(entry: LogEntry): void {
    const logMethod = this.getLogMethod(entry.level);
    const logString = this.formatLogEntry(entry);

    logMethod(logString);
  }

  /**
   * Get appropriate console method for log level
   */
  private getLogMethod(level: LogLevel): (message?: any, ...optionalParams: any[]) => void {
    switch (level) {
      case LogLevel.ERROR:
        return console.error;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.TRACE:
        return console.trace;
      default:
        return console.log;
    }
  }

  /**
   * Format log entry for output
   */
  private formatLogEntry(entry: LogEntry): string {
    const parts = [
      entry.timestamp,
      `[${LogLevel[entry.level]}]`,
      entry.message
    ];

    if (entry.requestId) {
      parts.push(`[req:${entry.requestId}]`);
    }

    if (entry.userId) {
      parts.push(`[user:${entry.userId}]`);
    }

    let logString = parts.join(' ');

    // Add context
    if (entry.context && Object.keys(entry.context).length > 0) {
      logString += '\nContext: ' + JSON.stringify(entry.context, null, 2);
    }

    // Add error details
    if (entry.error) {
      logString += '\nError: ' + entry.error.name + ': ' + entry.error.message;
      if (entry.error.stack) {
        logString += '\nStack: ' + entry.error.stack;
      }
    }

    return logString;
  }
}

/**
 * Default logger instance
 */
export const logger = new SecureLogger();

/**
 * Create a logger with custom configuration
 */
export function createLogger(config: Partial<LoggerConfig>): SecureLogger {
  return new SecureLogger(config);
}

/**
 * Structured logging for API requests
 */
export interface ApiLogContext {
  method: string;
  url: string;
  statusCode?: number;
  responseTime?: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
  companyId?: string;
  requestId?: string;
}

/**
 * Log API request
 */
export function logApiRequest(context: ApiLogContext, level: LogLevel = LogLevel.INFO): void {
  const logContext = {
    method: context.method,
    url: context.url,
    statusCode: context.statusCode,
    responseTime: context.responseTime,
    userAgent: context.userAgent,
    ip: context.ip,
    userId: context.userId,
    companyId: context.companyId
  };

  const message = `${context.method} ${context.url}${context.statusCode ? ` - ${context.statusCode}` : ''}`;

  logger.log(level, message, logContext);
}

/**
 * Log security events
 */
export interface SecurityLogContext {
  event: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

export function logSecurityEvent(context: SecurityLogContext): void {
  const level = mapSecuritySeverityToLogLevel(context.severity);

  const logContext = {
    securityEvent: context.event,
    severity: context.severity,
    userId: context.userId,
    ip: context.ip,
    userAgent: context.userAgent,
    ...context.details
  };

  logger.log(level, `Security Event: ${context.event}`, logContext);
}

/**
 * Map security severity to log level
 */
function mapSecuritySeverityToLogLevel(severity: string): LogLevel {
  switch (severity) {
    case 'critical':
      return LogLevel.ERROR;
    case 'high':
      return LogLevel.WARN;
    case 'medium':
      return LogLevel.INFO;
    case 'low':
      return LogLevel.DEBUG;
    default:
      return LogLevel.INFO;
  }
}

/**
 * Performance logging
 */
export interface PerformanceLogContext {
  operation: string;
  duration: number;
  success: boolean;
  details?: Record<string, any>;
}

export function logPerformance(context: PerformanceLogContext): void {
  const level = context.success ? LogLevel.DEBUG : LogLevel.WARN;

  const logContext = {
    operation: context.operation,
    duration: context.duration,
    success: context.success,
    ...context.details
  };

  const message = `Performance: ${context.operation} - ${context.duration}ms`;

  logger.log(level, message, logContext);
}

/**
 * Database operation logging
 */
export interface DatabaseLogContext {
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  duration?: number;
  success: boolean;
  rowCount?: number;
  error?: string;
}

export function logDatabaseOperation(context: DatabaseLogContext): void {
  const level = context.success ? LogLevel.DEBUG : LogLevel.ERROR;

  const logContext = {
    dbOperation: context.operation,
    table: context.table,
    duration: context.duration,
    success: context.success,
    rowCount: context.rowCount,
    error: context.error
  };

  const message = `DB: ${context.operation} ${context.table}${context.rowCount ? ` (${context.rowCount} rows)` : ''}`;

  logger.log(level, message, logContext);
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(parent: SecureLogger, additionalContext: Record<string, any>): SecureLogger {
  return new SecureLogger({
    ...parent['config'],
    customSanitizers: {
      ...parent['config'].customSanitizers,
      childContext: () => additionalContext
    }
  });
}
