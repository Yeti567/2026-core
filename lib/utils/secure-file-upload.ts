/**
 * Secure File Upload Validation
 * 
 * Provides comprehensive file upload validation to prevent
 * malicious file uploads and security vulnerabilities.
 */

import { sanitizeFileName } from './input-sanitization';

/**
 * Allowed file types with their MIME types and extensions
 */
export const ALLOWED_FILE_TYPES: Record<string, {
  extensions: string[];
  maxSize: number;
  description: string;
}> = {
  // Images
  'image/jpeg': {
    extensions: ['.jpg', '.jpeg'],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'JPEG images'
  },
  'image/png': {
    extensions: ['.png'],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'PNG images'
  },
  'image/gif': {
    extensions: ['.gif'],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'GIF images'
  },
  'image/webp': {
    extensions: ['.webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'WebP images'
  },
  
  // Documents
  'application/pdf': {
    extensions: ['.pdf'],
    maxSize: 50 * 1024 * 1024, // 50MB
    description: 'PDF documents'
  },
  'application/msword': {
    extensions: ['.doc'],
    maxSize: 20 * 1024 * 1024, // 20MB
    description: 'Word documents (legacy)'
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extensions: ['.docx'],
    maxSize: 20 * 1024 * 1024, // 20MB
    description: 'Word documents'
  },
  'application/vnd.ms-excel': {
    extensions: ['.xls'],
    maxSize: 20 * 1024 * 1024, // 20MB
    description: 'Excel spreadsheets (legacy)'
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    extensions: ['.xlsx'],
    maxSize: 20 * 1024 * 1024, // 20MB
    description: 'Excel spreadsheets'
  },
  'application/vnd.ms-powerpoint': {
    extensions: ['.ppt'],
    maxSize: 20 * 1024 * 1024, // 20MB
    description: 'PowerPoint presentations (legacy)'
  },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    extensions: ['.pptx'],
    maxSize: 20 * 1024 * 1024, // 20MB
    description: 'PowerPoint presentations'
  },
  'text/plain': {
    extensions: ['.txt'],
    maxSize: 5 * 1024 * 1024, // 5MB
    description: 'Text files'
  },
  'text/csv': {
    extensions: ['.csv'],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'CSV files'
  },
  
  // Archives
  'application/zip': {
    extensions: ['.zip'],
    maxSize: 100 * 1024 * 1024, // 100MB
    description: 'ZIP archives'
  }
};

/**
 * Dangerous file signatures to block
 */
export const DANGEROUS_SIGNATURES = [
  // Executables
  'MZ', // PE executable
  '\x7fELF', // ELF executable
  'CA FE BA BE', // Mach-O binary (macOS)
  '\xfe\xed\xfa\xce', // Mach-O binary (macOS)
  '\xfe\xed\xfa\xcf', // Mach-O binary (macOS)
  
  // Scripts
  '#!/bin/', // Shell scripts
  '#!/usr/bin/', // Shell scripts
  '<%eval', // ASP eval
  '<%execute', // ASP execute
  'eval(', // JavaScript eval
  'exec(', // JavaScript exec
  'system(', // PHP system
  'shell_exec(', // PHP shell_exec
  'passthru(', // PHP passthru
  
  // Malicious patterns
  'GIF89a', // Can hide PHP code
  '\x00\x00\x01\x00', // ICO header that can hide code
  'PK\x03\x04', // ZIP header (can contain executables)
  'PK\x05\x06', // ZIP header (can contain executables)
  
  // Office macros
  'VBA', // Visual Basic for Applications
  'Macro', // Office macros
  'Auto_Open', // Office auto macro
  'Auto_Close', // Office auto macro
  'Document_Open', // Office document macro
  'Workbook_Open', // Excel workbook macro
];

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    originalName: string;
    sanitized: string;
    size: number;
    mimeType: string;
    extension: string;
    detectedType?: string;
  };
}

/**
 * Validate file upload
 * @param file - File to validate
 * @param options - Validation options
 * @returns Validation result
 */
export async function validateFileUpload(
  file: File,
  options: {
    allowedTypes?: string[];
    maxSize?: number;
    requireMagicNumberValidation?: boolean;
    scanForMalware?: boolean;
  } = {}
): Promise<FileValidationResult> {
  const result: FileValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    metadata: {
      originalName: file.name,
      sanitized: sanitizeFileName(file.name),
      size: file.size,
      mimeType: file.type,
      extension: getFileExtension(file.name),
      detectedType: undefined
    }
  };
  
  // 1. Validate file name
  validateFileName(result);
  
  // 2. Validate file size
  validateFileSize(file, options.maxSize, result);
  
  // 3. Validate MIME type and extension
  await validateMimeTypeAndExtension(file, options.allowedTypes, result);
  
  // 4. Magic number validation
  if (options.requireMagicNumberValidation !== false) {
    await validateMagicNumbers(file, result);
  }
  
  // 5. Scan for dangerous content
  if (options.scanForMalware !== false) {
    await scanForMaliciousContent(file, result);
  }
  
  // 6. Additional security checks
  await performAdditionalSecurityChecks(file, result);
  
  result.valid = result.errors.length === 0;
  
  return result;
}

/**
 * Validate file name
 */
function validateFileName(result: FileValidationResult): void {
  const { originalName, sanitized } = result.metadata;
  
  // Check if name was changed during sanitization
  if (originalName !== sanitized) {
    result.warnings.push('File name was sanitized for security');
  }
  
  // Check for dangerous patterns in name
  const dangerousPatterns = [
    /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|app|deb|rpm|dmg|pkg|msi)$/i,
    /\.(php|asp|aspx|jsp|cgi|pl|py|rb|sh)$/i,
    /\.(hta|wsf|ps1|psm1|psd1)$/i,
    /\.(dll|so|dylib|ocx|cpl)$/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(originalName)) {
      result.errors.push('File name contains dangerous extension');
      break;
    }
  }
  
  // Check for suspicious characters
  if (/[<>:"|?*\x00-\x1f]/.test(originalName)) {
    result.errors.push('File name contains invalid characters');
  }
  
  // Check for path traversal attempts
  if (originalName.includes('../') || originalName.includes('..\\')) {
    result.errors.push('File name contains path traversal sequence');
  }
  
  // Check for reserved names (Windows)
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];
  
  const baseName = originalName.split('.')[0].toUpperCase();
  if (reservedNames.includes(baseName)) {
    result.errors.push('File name is reserved by the system');
  }
}

/**
 * Validate file size
 */
function validateFileSize(file: File, maxSize: number | undefined, result: FileValidationResult): void {
  const { size, mimeType } = result.metadata;
  
  // Check if file is empty
  if (size === 0) {
    result.errors.push('File is empty');
    return;
  }
  
  // Use provided max size or default from MIME type
  let effectiveMaxSize = maxSize;
  if (!effectiveMaxSize && ALLOWED_FILE_TYPES[mimeType]) {
    effectiveMaxSize = ALLOWED_FILE_TYPES[mimeType].maxSize;
  }
  
  if (!effectiveMaxSize) {
    effectiveMaxSize = 50 * 1024 * 1024; // Default 50MB
  }
  
  if (size > effectiveMaxSize) {
    result.errors.push(`File size (${formatBytes(size)}) exceeds maximum allowed size (${formatBytes(effectiveMaxSize)})`);
  }
  
  // Warn about unusually large files
  if (size > 10 * 1024 * 1024) { // 10MB
    result.warnings.push('Large file detected - upload may take longer');
  }
}

/**
 * Validate MIME type and extension
 */
async function validateMimeTypeAndExtension(
  file: File,
  allowedTypes: string[] | undefined,
  result: FileValidationResult
): Promise<void> {
  const { mimeType, extension } = result.metadata;
  
  // Check if MIME type is allowed
  if (allowedTypes && allowedTypes.length > 0) {
    if (!allowedTypes.includes(mimeType)) {
      result.errors.push(`MIME type ${mimeType} is not allowed`);
    }
  } else if (!ALLOWED_FILE_TYPES[mimeType]) {
    result.errors.push(`MIME type ${mimeType} is not supported`);
  }
  
  // Check if extension matches MIME type
  const fileType = ALLOWED_FILE_TYPES[mimeType];
  if (fileType && !fileType.extensions.includes(extension)) {
    result.errors.push(`Extension ${extension} does not match MIME type ${mimeType}`);
  }
  
  // Detect actual file type
  try {
    const detectedType = await detectFileType(file);
    result.metadata.detectedType = detectedType;
    
    if (detectedType !== mimeType) {
      result.warnings.push(`Detected file type (${detectedType}) does not match declared MIME type (${mimeType})`);
      
      // If detected type is not allowed, reject the file
      if (!ALLOWED_FILE_TYPES[detectedType]) {
        result.errors.push(`Detected file type ${detectedType} is not allowed`);
      }
    }
  } catch (error) {
    result.warnings.push('Could not detect file type');
  }
}

/**
 * Validate magic numbers
 */
async function validateMagicNumbers(file: File, result: FileValidationResult): Promise<void> {
  try {
    const buffer = await file.slice(0, 512).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const header = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    
    // Check for dangerous signatures
    for (const signature of DANGEROUS_SIGNATURES) {
      if (header.includes(signature)) {
        result.errors.push('File contains dangerous signature');
        break;
      }
    }
    
    // Additional binary checks
    if (containsExecutableCode(bytes)) {
      result.errors.push('File appears to contain executable code');
    }
    
  } catch (error) {
    result.warnings.push('Could not validate file magic numbers');
  }
}

/**
 * Scan for malicious content
 */
async function scanForMaliciousContent(file: File, result: FileValidationResult): Promise<void> {
  // Skip binary files for content scanning
  if (file.type.startsWith('image/') || file.type.startsWith('application/')) {
    return;
  }
  
  try {
    const text = await file.text();
    
    // Check for malicious patterns
    const maliciousPatterns = [
      /<script[^>]*>.*?<\/script>/gis,
      /<iframe[^>]*>.*?<\/iframe>/gis,
      /<object[^>]*>.*?<\/object>/gis,
      /<embed[^>]*>/gis,
      /javascript:/gi,
      /vbscript:/gi,
      /data:(?!image\/)/gi,
      /on\w+\s*=\s*["'][^"']*["']/gi,
      /eval\s*\(/gi,
      /exec\s*\(/gi,
      /system\s*\(/gi,
      /shell_exec\s*\(/gi,
      /passthru\s*\(/gi,
      /<?php/gi,
      /<%.*?%>/gis,
      /<%@\s*page/gi,
      /<%\s*include/gi
    ];
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(text)) {
        result.errors.push('File contains potentially malicious content');
        break;
      }
    }
    
    // Check for suspiciously long lines (could indicate obfuscated code)
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.length > 10000) {
        result.warnings.push('File contains unusually long lines');
        break;
      }
    }
    
  } catch (error) {
    // If we can't read as text, it's probably a binary file
    // which is fine as long as it's an allowed type
  }
}

/**
 * Perform additional security checks
 */
async function performAdditionalSecurityChecks(file: File, result: FileValidationResult): Promise<void> {
  // Check for double extensions
  const name = file.name.toLowerCase();
  const extensions = name.match(/\.[^.]+/g);
  
  if (extensions && extensions.length > 1) {
    const lastExtension = extensions[extensions.length - 1];
    const secondToLastExtension = extensions[extensions.length - 2];
    
    // Check for dangerous double extensions
    const dangerousDoubleExtensions = [
      ['.php', '.jpg'],
      ['.php', '.png'],
      ['.asp', '.jpg'],
      ['.jsp', '.jpg'],
      ['.exe', '.jpg'],
      ['.bat', '.jpg'],
      ['.cmd', '.jpg'],
      ['.scr', '.jpg']
    ];
    
    for (const [ext1, ext2] of dangerousDoubleExtensions) {
      if (secondToLastExtension === ext1 && lastExtension === ext2) {
        result.errors.push('File has dangerous double extension');
        break;
      }
    }
  }
  
  // Check file entropy (high entropy might indicate encryption/obfuscation)
  if (file.size > 1024) { // Only check files larger than 1KB
    try {
      const buffer = await file.slice(0, Math.min(1024, file.size)).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const entropy = calculateEntropy(bytes);
      
      if (entropy > 7.5) {
        result.warnings.push('File has high entropy - may be encrypted or obfuscated');
      }
    } catch (error) {
      // Ignore entropy calculation errors
    }
  }
}

/**
 * Get file extension
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.substring(lastDot).toLowerCase() : '';
}

/**
 * Detect file type from magic numbers
 */
async function detectFileType(file: File): Promise<string> {
  const buffer = await file.slice(0, 512).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // Check common file signatures
  const signatures: Record<string, RegExp> = {
    'image/jpeg': /^\xff\xd8\xff/,
    'image/png': /^\x89PNG\r\n\x1a\n/,
    'image/gif': /^GIF87a|^GIF89a/,
    'image/webp': /^RIFF....WEBP/,
    'application/pdf': /^%PDF-/,
    'application/zip': /^PK\x03\x04/,
    'text/plain': /^[\x20-\x7E\s]*$/ // Basic text check
  };
  
  for (const [mimeType, pattern] of Object.entries(signatures)) {
    const header = Array.from(bytes.slice(0, 20)).map(b => String.fromCharCode(b)).join('');
    if (pattern.test(header)) {
      return mimeType;
    }
  }
  
  return 'application/octet-stream';
}

/**
 * Check if file contains executable code
 */
function containsExecutableCode(bytes: Uint8Array): boolean {
  // Check for common executable signatures
  const executableSignatures = [
    [0x4D, 0x5A], // PE executable
    [0x7F, 0x45, 0x4C, 0x46], // ELF executable
    [0xCA, 0xFE, 0xBA, 0xBE], // Mach-O binary
    [0xFE, 0xED, 0xFA, 0xCE], // Mach-O binary
    [0xFE, 0xED, 0xFA, 0xCF], // Mach-O binary
  ];
  
  for (const signature of executableSignatures) {
    if (bytes.length >= signature.length) {
      let match = true;
      for (let i = 0; i < signature.length; i++) {
        if (bytes[i] !== signature[i]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
  }
  
  return false;
}

/**
 * Calculate Shannon entropy of byte array
 */
function calculateEntropy(bytes: Uint8Array): number {
  const frequency = new Array(256).fill(0);
  
  // Count byte frequencies
  for (const byte of bytes) {
    frequency[byte]++;
  }
  
  // Calculate entropy
  let entropy = 0;
  const length = bytes.length;
  
  for (let i = 0; i < 256; i++) {
    if (frequency[i] > 0) {
      const probability = frequency[i] / length;
      entropy -= probability * Math.log2(probability);
    }
  }
  
  return entropy;
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Create secure file storage path
 */
export function createSecureFilePath(
  userId: string,
  companyId: string,
  fileName: string,
  uploadDate: Date = new Date()
): string {
  const sanitized = sanitizeFileName(fileName);
  const dateStr = uploadDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const hash = require('crypto').createHash('md5').update(`${userId}-${companyId}-${sanitized}-${dateStr}`).digest('hex').substring(0, 8);
  
  return `uploads/${companyId}/${userId}/${dateStr}/${hash}-${sanitized}`;
}

/**
 * Generate secure file download URL
 */
export function generateSecureDownloadUrl(
  filePath: string,
  expiresIn: number = 3600 // 1 hour
): string {
  const expires = Date.now() + (expiresIn * 1000);
  const token = require('crypto').createHash('sha256').update(`${filePath}-${expires}`).digest('hex');
  
  return `/api/files/download?path=${encodeURIComponent(filePath)}&expires=${expires}&token=${token}`;
}

/**
 * Verify secure download URL
 */
export function verifySecureDownloadUrl(
  filePath: string,
  expires: number,
  token: string
): boolean {
  if (Date.now() > expires) {
    return false;
  }
  
  const expectedToken = require('crypto').createHash('sha256').update(`${filePath}-${expires}`).digest('hex');
  return token === expectedToken;
}
