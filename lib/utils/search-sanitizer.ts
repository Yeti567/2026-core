/**
 * Search Query Sanitization Utilities
 * 
 * Provides safe functions for sanitizing user input used in Supabase/PostgREST queries
 * to prevent SQL injection and filter syntax manipulation.
 */

/**
 * Sanitizes a search string for use in PostgREST ILIKE queries
 * 
 * Escapes special characters that could break filter syntax:
 * - % (wildcard) - escaped to \%
 * - _ (single char wildcard) - escaped to \_
 * - , (filter separator) - removed or escaped
 * - . (filter operator) - removed or escaped
 * - () (grouping) - removed or escaped
 * 
 * @param search - The user-provided search string
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Sanitized search string safe for use in ILIKE queries
 */
export function sanitizeSearchQuery(search: string | null | undefined, maxLength: number = 100): string {
  if (!search) return '';
  
  // Limit length to prevent DoS
  let sanitized = search.substring(0, maxLength);
  
  // Remove or escape characters that could break PostgREST filter syntax
  // Escape % and _ for ILIKE (these are wildcards)
  sanitized = sanitized.replace(/%/g, '\\%').replace(/_/g, '\\_');
  
  // Remove characters that could break filter syntax
  sanitized = sanitized.replace(/[,().]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Creates a safe PostgREST OR filter string for ILIKE searches across multiple fields
 * 
 * @param fields - Array of field names to search
 * @param search - The sanitized search query
 * @returns A safe OR filter string for PostgREST
 */
export function createSafeOrFilter(fields: string[], search: string): string {
  if (!search || fields.length === 0) return '';
  
  const sanitized = sanitizeSearchQuery(search);
  if (!sanitized) return '';
  
  // Create ILIKE filters for each field
  const filters = fields.map(field => `${field}.ilike.%${sanitized}%`);
  
  return filters.join(',');
}

/**
 * Validates that a string is safe to use as a filter value
 * Checks for common SQL injection patterns
 * 
 * @param value - The value to validate
 * @returns true if safe, false if potentially dangerous
 */
export function isValidFilterValue(value: string | null | undefined): boolean {
  if (!value) return true; // null/undefined is safe
  
  const dangerousPatterns = [
    /;\s*(drop|delete|update|insert|alter|create|exec|execute)/i,
    /--/, // SQL comment
    /\/\*/, // SQL comment start
    /union.*select/i,
    /or\s+1\s*=\s*1/i,
    /'\s*or\s*'/i,
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(value));
}

/**
 * Sanitizes a value for use in PostgREST filter operations
 * More restrictive than search sanitization
 * 
 * @param value - The value to sanitize
 * @returns Sanitized value safe for filter operations
 */
export function sanitizeFilterValue(value: string | null | undefined): string {
  if (!value) return '';
  
  // Remove all potentially dangerous characters
  return value
    .replace(/[%;'",().]/g, '')
    .trim()
    .substring(0, 100);
}

/**
 * Validates that a value is a valid UUID format
 * Used to ensure database IDs are safe for use in queries
 * 
 * @param value - The value to validate
 * @returns true if valid UUID format, false otherwise
 */
export function isValidUUID(value: string | null | undefined): boolean {
  if (!value) return false;
  
  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Creates a safe PostgREST OR filter for company_id checks
 * Validates that company_id is a valid UUID before using it
 * 
 * @param companyId - The company ID (should be from server-controlled source)
 * @returns A safe OR filter string, or empty string if invalid
 */
export function createCompanyIdOrFilter(companyId: string | null | undefined): string {
  if (!companyId || !isValidUUID(companyId)) {
    // If invalid, only allow null company_id (public templates)
    return 'company_id.is.null';
  }
  
  // Safe to use validated UUID
  return `company_id.is.null,company_id.eq.${companyId}`;
}
