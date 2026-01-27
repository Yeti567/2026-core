/**
 * Comprehensive Input Sanitization
 * 
 * Provides sanitization functions for various input types to prevent
 * XSS, injection attacks, and other security vulnerabilities.
 */

/**
 * Sanitize string input for XSS prevention
 * @param input - Raw string input
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export function sanitizeString(input: string, options: {
  allowHtml?: boolean;
  maxLength?: number;
  trim?: boolean;
} = {}): string {
  const { allowHtml = false, maxLength, trim = true } = options;

  let sanitized = input;

  // Trim whitespace if requested
  if (trim) {
    sanitized = sanitized.trim();
  }

  // Enforce maximum length
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  if (!allowHtml) {
    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>'"&]/g, '');

    // Remove JavaScript event handlers
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');

    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, '');

    // Remove data: URLs that could execute scripts
    sanitized = sanitized.replace(/data:(?!image\/)/gi, '');
  } else {
    // Allow HTML but sanitize it
    sanitized = sanitizeHtml(sanitized);
  }

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Basic HTML sanitization (simplified version)
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML
 */
function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  // eslint-disable-next-line security/detect-unsafe-regex
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove iframe, object, embed, and other potentially dangerous tags
  const dangerousTags = ['iframe', 'object', 'embed', 'link', 'meta', 'style'];
  dangerousTags.forEach(tag => {
    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi');
    html = html.replace(regex, '');
  });

  // Remove dangerous attributes
  const dangerousAttrs = ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur'];
  dangerousAttrs.forEach(attr => {
    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
    html = html.replace(regex, '');
  });

  // Remove javascript: and data: URLs
  html = html.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  html = html.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""');
  html = html.replace(/href\s*=\s*["']data:(?!image\/)[^"']*["']/gi, 'href="#"');

  return html;
}

/**
 * Sanitize email address
 * @param email - Email address to sanitize
 * @returns Sanitized email
 */
export function sanitizeEmail(email: string): string {
  const sanitized = email.trim().toLowerCase();

  // Basic email format validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
    throw new Error('Invalid email format');
  }

  // Remove potentially dangerous characters
  const cleanEmail = sanitized.replace(/[<>'"&]/g, '');

  // Validate again after cleaning
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Email contains invalid characters');
  }

  return cleanEmail;
}

/**
 * Sanitize phone number
 * @param phone - Phone number to sanitize
 * @returns Sanitized phone number (10 digits)
 */
export function sanitizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Validate length (Canadian phone numbers are 10 digits)
  if (digits.length !== 10) {
    throw new Error('Phone number must contain exactly 10 digits');
  }

  return digits;
}

/**
 * Sanitize Canadian postal code
 * @param postalCode - Postal code to sanitize
 * @returns Sanitized postal code (A1A 1A1 format)
 */
export function sanitizePostalCode(postalCode: string): string {
  // Remove spaces and convert to uppercase
  const cleaned = postalCode.replace(/\s/g, '').toUpperCase();

  // Validate format
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(cleaned)) {
    throw new Error('Invalid Canadian postal code format');
  }

  // Format as A1A 1A1
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)}`;
}

/**
 * Sanitize WSIB number
 * @param wsibNumber - WSIB number to sanitize
 * @returns Sanitized WSIB number (9 digits)
 */
export function sanitizeWsibNumber(wsibNumber: string): string {
  // Remove all non-digit characters
  const digits = wsibNumber.replace(/\D/g, '');

  // Validate length
  if (digits.length !== 9) {
    throw new Error('WSIB number must contain exactly 9 digits');
  }

  return digits;
}

/**
 * Sanitize URL
 * @param url - URL to sanitize
 * @param options - Sanitization options
 * @returns Sanitized URL
 */
export function sanitizeUrl(url: string, options: {
  allowedProtocols?: string[];
  allowRelative?: boolean;
} = {}): string {
  const { allowedProtocols = ['http', 'https'], allowRelative = true } = options;

  const trimmed = url.trim();

  // Allow relative URLs if permitted
  if (allowRelative && trimmed.startsWith('/')) {
    return sanitizedRelativePath(trimmed);
  }

  try {
    const parsedUrl = new URL(trimmed);

    // Check protocol
    if (!allowedProtocols.includes(parsedUrl.protocol.replace(':', ''))) {
      throw new Error('URL protocol not allowed');
    }

    // Remove dangerous parts
    parsedUrl.hash = '';
    parsedUrl.username = '';
    parsedUrl.password = '';

    return parsedUrl.toString();
  } catch (error) {
    throw new Error('Invalid URL format');
  }
}

/**
 * Sanitize relative path
 * @param path - Relative path to sanitize
 * @returns Sanitized path
 */
function sanitizedRelativePath(path: string): string {
  // Remove dangerous characters
  let sanitized = path.replace(/[<>'"&]/g, '');

  // Prevent path traversal
  sanitized = sanitized.replace(/\.\./g, '');

  // Ensure it starts with /
  if (!sanitized.startsWith('/')) {
    sanitized = '/' + sanitized;
  }

  return sanitized;
}

/**
 * Sanitize file name
 * @param fileName - File name to sanitize
 * @returns Sanitized file name
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path separators and dangerous characters
  let sanitized = fileName.replace(/[\\/:"*?<>|]/g, '');

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

  // Limit length
  if (sanitized.length > 255) {
    const extension = sanitized.includes('.') ? sanitized.slice(sanitized.lastIndexOf('.')) : '';
    const nameWithoutExt = sanitized.slice(0, sanitized.lastIndexOf('.') || sanitized.length);
    const maxNameLength = 255 - extension.length;
    sanitized = nameWithoutExt.slice(0, maxNameLength) + extension;
  }

  // Ensure it's not empty
  if (sanitized.length === 0) {
    sanitized = 'unnamed_file';
  }

  return sanitized;
}

/**
 * Sanitize numeric input
 * @param input - Input to sanitize
 * @param options - Validation options
 * @returns Sanitized number
 */
export function sanitizeNumber(input: string | number, options: {
  min?: number;
  max?: number;
  integer?: boolean;
  positive?: boolean;
} = {}): number {
  const { min, max, integer = false, positive = false } = options;

  let num: number;

  if (typeof input === 'string') {
    // Remove non-numeric characters (except decimal point and minus sign)
    const cleaned = input.replace(/[^\d.-]/g, '');
    num = parseFloat(cleaned);
  } else {
    num = input;
  }

  if (isNaN(num)) {
    throw new Error('Invalid number format');
  }

  // Check if integer
  if (integer && !Number.isInteger(num)) {
    throw new Error('Value must be an integer');
  }

  // Check if positive
  if (positive && num <= 0) {
    throw new Error('Value must be positive');
  }

  // Check min/max
  if (min !== undefined && num < min) {
    throw new Error(`Value must be at least ${min}`);
  }

  if (max !== undefined && num > max) {
    throw new Error(`Value must be at most ${max}`);
  }

  return num;
}

/**
 * Sanitize JSON input
 * @param input - JSON string or object
 * @param schema - Optional validation schema
 * @returns Sanitized object
 */
export function sanitizeJson(input: string | object, schema?: ValidationSchema): any {
  let parsed: any;

  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  } else {
    parsed = input;
  }

  // Recursively sanitize all string values
  function sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize object keys
        const sanitizedKey = sanitizeString(key, { maxLength: 100 });
        // eslint-disable-next-line security/detect-object-injection
        sanitized[sanitizedKey] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  }

  const sanitized = sanitizeObject(parsed);

  // Apply schema validation if provided
  if (schema) {
    // Basic schema validation (you might want to use a library like Joi or Zod)
    validateAgainstSchema(sanitized, schema);
  }

  return sanitized;
}

/**
 * Schema validation rules interface
 */
interface ValidationSchema {
  [key: string]: {
    required?: boolean;
    type?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    enum?: string[];
    custom?: (value: any) => boolean;
  };
}

/**
 * Basic schema validation
 * @param data - Data to validate
 * @param schema - Schema object
 */
function validateAgainstSchema(data: any, schema: ValidationSchema): void {
  if (typeof schema !== 'object' || schema === null) {
    return;
  }

  for (const [key, rules] of Object.entries(schema)) {
    if (!(key in data)) {
      if (rules?.required) {
        throw new Error(`Required field ${key} is missing`);
      }
      continue;
    }

    // eslint-disable-next-line security/detect-object-injection
    const value = data[key];

    // Type validation
    if (rules?.type && typeof value !== rules.type) {
      throw new Error(`Field ${key} must be of type ${rules.type}`);
    }

    // Length validation for strings
    if (rules?.minLength && typeof value === 'string' && value.length < rules.minLength) {
      throw new Error(`Field ${key} must be at least ${rules.minLength} characters long`);
    }

    if (rules?.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      throw new Error(`Field ${key} must be no more than ${rules.maxLength} characters long`);
    }

    // Pattern validation
    if (rules?.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      throw new Error(`Field ${key} does not match required pattern`);
    }

    // Enum validation
    if (rules?.enum && !rules.enum.includes(value)) {
      throw new Error(`Field ${key} must be one of: ${rules.enum.join(', ')}`);
    }

    // Custom validation
    if (rules?.custom && !rules.custom(value)) {
      throw new Error(`Field ${key} failed custom validation`);
    }
  }
}

/**
 * Sanitize search query
 * @param query - Search query string
 * @returns Sanitized search query
 */
export function sanitizeSearchQuery(query: string): string {
  let sanitized = query.trim();

  // Remove SQL injection patterns
  sanitized = sanitized.replace(/['";\\]/g, '');

  // Remove dangerous SQL keywords
  const sqlKeywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'EXEC', 'UNION', 'SELECT'];
  sqlKeywords.forEach(keyword => {
    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });

  // Limit length
  if (sanitized.length > 1000) {
    sanitized = sanitized.substring(0, 1000);
  }

  return sanitized;
}

/**
 * Comprehensive input sanitization middleware
 * @param data - Input data object
 * @param schema - Sanitization schema
 * @returns Sanitized data object
 */
export function sanitizeInput(data: Record<string, any>, schema: Record<string, any> = {}): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip undefined values
    if (value === undefined) {
      continue;
    }

    // eslint-disable-next-line security/detect-object-injection
    const fieldSchema = schema[key];

    if (fieldSchema) {
      // Apply field-specific sanitization
      try {
        // eslint-disable-next-line security/detect-object-injection
        sanitized[key] = applyFieldSanitization(value, fieldSchema);
      } catch (error) {
        throw new Error(`Error sanitizing field ${key}: ${error}`);
      }
    } else {
      // Apply default sanitization
      // eslint-disable-next-line security/detect-object-injection
      sanitized[key] = defaultSanitization(value);
    }
  }

  return sanitized;
}

/**
 * Apply field-specific sanitization based on schema
 */
function applyFieldSanitization(value: any, schema: any): any {
  switch (schema.type) {
    case 'string':
      return sanitizeString(value, {
        allowHtml: schema.allowHtml || false,
        maxLength: schema.maxLength,
        trim: schema.trim !== false
      });

    case 'email':
      return sanitizeEmail(value);

    case 'phone':
      return sanitizePhoneNumber(value);

    case 'postalCode':
      return sanitizePostalCode(value);

    case 'wsibNumber':
      return sanitizeWsibNumber(value);

    case 'url':
      return sanitizeUrl(value, {
        allowedProtocols: schema.allowedProtocols,
        allowRelative: schema.allowRelative
      });

    case 'number':
      return sanitizeNumber(value, {
        min: schema.min,
        max: schema.max,
        integer: schema.integer,
        positive: schema.positive
      });

    case 'json':
      return sanitizeJson(value, schema.schema);

    case 'fileName':
      return sanitizeFileName(value);

    case 'searchQuery':
      return sanitizeSearchQuery(value);

    default:
      return defaultSanitization(value);
  }
}

/**
 * Default sanitization for unknown types
 */
function defaultSanitization(value: any): any {
  if (typeof value === 'string') {
    return sanitizeString(value);
  } else if (Array.isArray(value)) {
    return value.map(defaultSanitization);
  } else if (typeof value === 'object' && value !== null) {
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[sanitizeString(key, { maxLength: 100 })] = defaultSanitization(val);
    }
    return sanitized;
  }
  return value;
}
