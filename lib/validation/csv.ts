/**
 * CSV Validation Utilities
 * 
 * Validates employee CSV uploads including:
 * - Required fields
 * - Email format and uniqueness
 * - Role validation
 * - Phone format
 * - Date format
 */

import type { UserRole } from '@/lib/db/types';

// Valid roles for employees
export const VALID_ROLES: UserRole[] = ['admin', 'internal_auditor', 'supervisor', 'worker'];

// CSV column headers (exact spelling, case-sensitive)
export const CSV_HEADERS = [
  'first_name',
  'last_name', 
  'email',
  'position',
  'role',
  'phone',
  'hire_date',
] as const;

export const REQUIRED_HEADERS = ['first_name', 'last_name', 'email', 'position', 'role'] as const;

/**
 * Raw CSV row before validation
 */
export interface CSVRow {
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  role: string;
  phone?: string;
  hire_date?: string;
}

/**
 * Validated CSV row with proper types
 */
export interface ValidatedCSVRow {
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  role: UserRole;
  phone?: string;
  hire_date?: string;
}

/**
 * Validation error for a specific field
 */
export interface ValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
}

/**
 * Parsed row with validation status
 */
export interface ParsedRow {
  rowNumber: number;
  data: CSVRow;
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Upload validation result
 */
export interface UploadResult {
  total: number;
  valid: number;
  invalid: number;
  rows: ParsedRow[];
  headerErrors: string[];
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validate phone format: (123) 456-7890 or 123-456-7890 or 1234567890
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || phone.trim() === '') return true; // Optional field
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  return /^\d{10}$/.test(cleaned);
}

/**
 * Format phone number to (123) 456-7890
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 10) return phone;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
}

/**
 * Validate date format: YYYY-MM-DD and not in future
 */
export function isValidHireDate(date: string): boolean {
  if (!date || date.trim() === '') return true; // Optional field
  
  // Check format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    return false;
  }
  
  // Check if valid date
  const parsed = new Date(date.trim());
  if (isNaN(parsed.getTime())) {
    return false;
  }
  
  // Check not in future
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return parsed <= today;
}

/**
 * Validate role value
 */
export function isValidRole(role: string): role is UserRole {
  return VALID_ROLES.includes(role.toLowerCase().trim() as UserRole);
}

/**
 * Normalize role value to lowercase
 */
export function normalizeRole(role: string): UserRole {
  const normalized = role.toLowerCase().trim();
  // Handle common variations
  if (normalized === 'auditor' || normalized === 'internal auditor') {
    return 'internal_auditor';
  }
  return normalized as UserRole;
}

/**
 * Validate CSV headers
 */
export function validateHeaders(headers: string[]): string[] {
  const errors: string[] = [];
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Check for required headers
  for (const required of REQUIRED_HEADERS) {
    if (!normalizedHeaders.includes(required)) {
      errors.push(`Missing required column: ${required}`);
    }
  }
  
  return errors;
}

/**
 * Validate a single row
 */
export function validateRow(
  row: CSVRow,
  rowNumber: number,
  existingEmails: Set<string>,
  csvEmails: Set<string>
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // First name required
  if (!row.first_name || row.first_name.trim() === '') {
    errors.push({
      row: rowNumber,
      field: 'first_name',
      value: row.first_name || '',
      message: 'First name is required',
    });
  }
  
  // Last name required
  if (!row.last_name || row.last_name.trim() === '') {
    errors.push({
      row: rowNumber,
      field: 'last_name',
      value: row.last_name || '',
      message: 'Last name is required',
    });
  }
  
  // Email required and valid format
  const email = row.email?.toLowerCase().trim() || '';
  if (!email) {
    errors.push({
      row: rowNumber,
      field: 'email',
      value: row.email || '',
      message: 'Email is required',
    });
  } else if (!isValidEmail(email)) {
    errors.push({
      row: rowNumber,
      field: 'email',
      value: row.email,
      message: 'Invalid email format',
    });
  } else if (existingEmails.has(email)) {
    errors.push({
      row: rowNumber,
      field: 'email',
      value: row.email,
      message: 'Email already exists in your company',
    });
  } else if (csvEmails.has(email)) {
    errors.push({
      row: rowNumber,
      field: 'email',
      value: row.email,
      message: 'Duplicate email in CSV file',
    });
  }
  
  // Position required
  if (!row.position || row.position.trim() === '') {
    errors.push({
      row: rowNumber,
      field: 'position',
      value: row.position || '',
      message: 'Position is required',
    });
  }
  
  // Role required and valid
  if (!row.role || row.role.trim() === '') {
    errors.push({
      row: rowNumber,
      field: 'role',
      value: row.role || '',
      message: 'Role is required',
    });
  } else if (!isValidRole(row.role)) {
    errors.push({
      row: rowNumber,
      field: 'role',
      value: row.role,
      message: `Invalid role. Must be: ${VALID_ROLES.join(', ')}`,
    });
  }
  
  // Phone optional but must be valid if provided
  if (row.phone && row.phone.trim() !== '' && !isValidPhone(row.phone)) {
    errors.push({
      row: rowNumber,
      field: 'phone',
      value: row.phone,
      message: 'Invalid phone format. Use: (123) 456-7890',
    });
  }
  
  // Hire date optional but must be valid if provided
  if (row.hire_date && row.hire_date.trim() !== '') {
    if (!isValidHireDate(row.hire_date)) {
      const parsed = new Date(row.hire_date);
      if (isNaN(parsed.getTime())) {
        errors.push({
          row: rowNumber,
          field: 'hire_date',
          value: row.hire_date,
          message: 'Invalid date format. Use: YYYY-MM-DD',
        });
      } else {
        errors.push({
          row: rowNumber,
          field: 'hire_date',
          value: row.hire_date,
          message: 'Hire date cannot be in the future',
        });
      }
    }
  }
  
  return errors;
}

/**
 * Validate entire CSV data
 */
export function validateCSV(
  rows: CSVRow[],
  existingEmails: string[] = []
): UploadResult {
  const existingEmailSet = new Set(existingEmails.map(e => e.toLowerCase()));
  const csvEmailSet = new Set<string>();
  const parsedRows: ParsedRow[] = [];
  
  let validCount = 0;
  let invalidCount = 0;
  
  for (let i = 0; i < rows.length; i++) {
    // Safe: i is a controlled loop index within bounds of rows array
    // eslint-disable-next-line security/detect-object-injection
    const row = rows[i];
    const rowNumber = i + 2; // +2 because row 1 is headers, and we're 1-indexed
    
    // Skip empty rows
    if (!row.first_name && !row.last_name && !row.email && !row.position && !row.role) {
      continue;
    }
    
    const errors = validateRow(row, rowNumber, existingEmailSet, csvEmailSet);
    const isValid = errors.length === 0;
    
    // Add email to CSV set for duplicate checking
    const email = row.email?.toLowerCase().trim();
    if (email) {
      csvEmailSet.add(email);
    }
    
    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }
    
    parsedRows.push({
      rowNumber,
      data: row,
      isValid,
      errors,
    });
  }
  
  return {
    total: parsedRows.length,
    valid: validCount,
    invalid: invalidCount,
    rows: parsedRows,
    headerErrors: [],
  };
}

/**
 * Generate CSV template content
 */
export function generateCSVTemplate(): string {
  const headers = CSV_HEADERS.join(',');
  const sampleRows = [
    'John,Smith,john.smith@company.com,Site Supervisor,supervisor,(613) 555-1001,2024-01-15',
    'Jane,Doe,jane.doe@company.com,Concrete Finisher,worker,(613) 555-1002,2024-02-01',
    'Mike,Johnson,mike.j@company.com,Safety Manager,internal_auditor,(613) 555-1003,2023-11-10',
  ];
  
  return [headers, ...sampleRows].join('\n');
}

/**
 * Download CSV template
 */
export function downloadCSVTemplate() {
  const content = generateCSVTemplate();
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'cor_pathways_employee_template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
