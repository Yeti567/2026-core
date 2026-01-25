/**
 * Validation Utilities
 * 
 * Exports for form validation including company registration and CSV uploads.
 */

// Company registration validation
export {
  validateCompanyRegistration,
  isBlockedEmailDomain,
  getEmailDomain,
  doEmailDomainsMatch,
  isValidWSIBNumber,
  formatWSIBNumber,
  isValidPostalCode,
  formatPostalCode,
  isValidPhoneNumber,
  formatPhoneNumber,
  isValidEmail,
  CANADIAN_PROVINCES,
  REGISTRANT_POSITIONS,
  type CompanyRegistration,
  type RegistrantPosition,
  type ValidationResult,
} from './company';

// CSV validation for bulk employee upload
export {
  validateCSV,
  validateHeaders,
  validateRow,
  isValidPhone,
  isValidHireDate,
  isValidRole,
  normalizeRole,
  formatPhone,
  downloadCSVTemplate,
  generateCSVTemplate,
  CSV_HEADERS,
  REQUIRED_HEADERS,
  VALID_ROLES,
  type CSVRow,
  type ValidatedCSVRow,
  type ValidationError as CSVValidationError,
  type ParsedRow,
  type UploadResult,
} from './csv';
