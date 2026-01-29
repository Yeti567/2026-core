/**
 * Company Registration Validation Utilities
 * 
 * Validates company registration form fields including:
 * - Email domain matching
 * - WSIB number format
 * - Canadian postal code format
 * - Phone number format
 * - Business email domain blocking
 */

// Free email providers that are blocked for business registration
const BLOCKED_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'yahoo.ca',
  'hotmail.com',
  'hotmail.ca',
  'outlook.com',
  'outlook.ca',
  'live.com',
  'live.ca',
  'aol.com',
  'icloud.com',
  'mail.com',
  'protonmail.com',
  'proton.me',
  'fastmail.com',
  'zoho.com',
  'ymail.com',
  'gmx.com',
  'gmx.ca',
];

// Canadian provinces
export const CANADIAN_PROVINCES = [
  { value: 'ON', label: 'Ontario' },
  { value: 'QC', label: 'Quebec' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'AB', label: 'Alberta' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'YT', label: 'Yukon' },
  { value: 'NU', label: 'Nunavut' },
] as const;

// Registrant positions
export const REGISTRANT_POSITIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'director', label: 'Director' },
  { value: 'safety_manager', label: 'Safety Manager' },
  { value: 'internal_auditor', label: 'Internal Auditor' },
] as const;

export type RegistrantPosition = typeof REGISTRANT_POSITIONS[number]['value'];

// Industry/Trade options
export const INDUSTRIES = [
  { value: 'concrete_construction', label: 'Concrete Construction' },
  { value: 'general_construction', label: 'General Construction' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'framing', label: 'Framing' },
  { value: 'drywall', label: 'Drywall' },
  { value: 'painting', label: 'Painting' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'excavation', label: 'Excavation' },
  { value: 'steel_erection', label: 'Steel Erection' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'welding', label: 'Welding' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'warehouse', label: 'Warehouse/Distribution' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'other', label: 'Other' },
] as const;

export type Industry = typeof INDUSTRIES[number]['value'];

/**
 * Extract domain from an email address
 */
export function getEmailDomain(email: string): string {
  const parts = email.toLowerCase().trim().split('@');
  return parts.length === 2 ? parts[1] : '';
}

/**
 * Check if an email domain is a blocked free provider
 */
export function isBlockedEmailDomain(email: string): boolean {
  const domain = getEmailDomain(email);
  return BLOCKED_EMAIL_DOMAINS.includes(domain);
}

/**
 * Check if two emails have matching domains
 */
export function doEmailDomainsMatch(email1: string, email2: string): boolean {
  return getEmailDomain(email1) === getEmailDomain(email2);
}

/**
 * Validate WSIB number format (exactly 9 digits)
 */
export function isValidWSIBNumber(wsib: string): boolean {
  const cleaned = wsib.replace(/\D/g, '');
  return /^\d{9}$/.test(cleaned);
}

/**
 * Format WSIB number for display (123-456-789)
 */
export function formatWSIBNumber(wsib: string): string {
  const cleaned = wsib.replace(/\D/g, '');
  if (cleaned.length !== 9) return wsib;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 9)}`;
}

/**
 * Validate Canadian postal code format (A1A 1A1)
 */
export function isValidPostalCode(postalCode: string): boolean {
  const cleaned = postalCode.replace(/\s/g, '').toUpperCase();
  return /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(cleaned);
}

/**
 * Format postal code for display (A1A 1A1)
 */
export function formatPostalCode(postalCode: string): string {
  const cleaned = postalCode.replace(/\s/g, '').toUpperCase();
  if (cleaned.length !== 6) return postalCode;
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)}`;
}

/**
 * Validate phone number format (10 digits)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
}

/**
 * Format phone number for display ((123) 456-7890)
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 10) return phone;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): string | null {
  if (password.length < 12) {
    return 'Password must be at least 12 characters long';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'Password must contain at least one special character (!@#$%^&* etc.)';
  }
  
  // Prevent common weak password patterns
  if (/(.)\1{2,}/.test(password)) {
    return 'Password cannot contain three or more repeating characters in a row';
  }
  
  // Prevent sequential characters
  const lowerPassword = password.toLowerCase();
  for (let i = 0; i < lowerPassword.length - 2; i++) {
    const charCode = lowerPassword.charCodeAt(i);
    if (lowerPassword.charCodeAt(i + 1) === charCode + 1 && 
        lowerPassword.charCodeAt(i + 2) === charCode + 2) {
      return 'Password cannot contain sequential characters (like "abc" or "123")';
    }
  }
  
  // Check against common weak passwords
  const commonPasswords = [
    'password', '12345678', 'qwerty123', 'admin123', 'letmein',
    'welcome123', 'password123', '123456789', 'abc123456'
  ];
  if (commonPasswords.includes(lowerPassword)) {
    return 'Password is too common. Please choose a more secure password.';
  }
  
  return null;
}

/**
 * Company registration interface
 */
export interface CompanyRegistration {
  company_name: string;
  wsib_number: string;
  company_email: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  phone: string;
  registrant_name: string;
  registrant_position: RegistrantPosition;
  registrant_email: string;
  // Account credentials
  password: string;
  confirm_password: string;
  // Optional industry fields (can be completed later)
  industry?: Industry;
  employee_count?: number;
  years_in_business?: number;
  main_services?: string[];
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate entire company registration form
 */
export function validateCompanyRegistration(data: CompanyRegistration): ValidationResult {
  const errors: Record<string, string> = {};

  // Company name
  if (!data.company_name.trim()) {
    errors.company_name = 'Company name is required';
  }

  // WSIB number (optional - only validate format if provided)
  if (data.wsib_number?.trim() && !isValidWSIBNumber(data.wsib_number)) {
    errors.wsib_number = 'WSIB number must be exactly 9 digits';
  }

  // Company email
  if (!data.company_email.trim()) {
    errors.company_email = 'Company email is required';
  } else if (!isValidEmail(data.company_email)) {
    errors.company_email = 'Invalid email format';
  }

  // Address
  if (!data.address.trim()) {
    errors.address = 'Office address is required';
  }

  // City
  if (!data.city.trim()) {
    errors.city = 'City is required';
  }

  // Province
  if (!data.province) {
    errors.province = 'Province is required';
  }

  // Postal code
  if (!data.postal_code.trim()) {
    errors.postal_code = 'Postal code is required';
  } else if (!isValidPostalCode(data.postal_code)) {
    errors.postal_code = 'Invalid postal code format (e.g., A1A 1A1)';
  }

  // Phone
  if (!data.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!isValidPhoneNumber(data.phone)) {
    errors.phone = 'Invalid phone format (10 digits required)';
  }

  // Registrant name
  if (!data.registrant_name.trim()) {
    errors.registrant_name = 'Your name is required';
  }

  // Registrant position
  if (!data.registrant_position) {
    errors.registrant_position = 'Your position is required';
  }

  // Registrant email
  if (!data.registrant_email.trim()) {
    errors.registrant_email = 'Your email is required';
  } else if (!isValidEmail(data.registrant_email)) {
    errors.registrant_email = 'Invalid email format';
  }

  // Password
  if (!data.password) {
    errors.password = 'Password is required';
  } else {
    const passwordError = validatePassword(data.password);
    if (passwordError) {
      errors.password = passwordError;
    }
  }

  // Confirm password
  if (!data.confirm_password) {
    errors.confirm_password = 'Please confirm your password';
  } else if (data.password !== data.confirm_password) {
    errors.confirm_password = 'Passwords do not match';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
