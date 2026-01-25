/**
 * File Upload Validation Utilities
 * 
 * Provides secure file upload validation including:
 * - File type validation (MIME type + content validation)
 * - File size limits
 * - Secure filename generation
 * - Magic byte validation to prevent MIME type spoofing
 */

import { randomUUID } from 'crypto';

// =============================================================================
// FILE TYPE CONFIGURATIONS
// =============================================================================

export interface FileTypeConfig {
  extension: string;
  maxSize: number; // bytes
  magicBytes: number[]; // First bytes that identify the file type
}

export const FILE_TYPE_CONFIGS: Record<string, FileTypeConfig> = {
  'application/pdf': {
    extension: 'pdf',
    maxSize: 50 * 1024 * 1024, // 50MB
    magicBytes: [0x25, 0x50, 0x44, 0x46], // %PDF
  },
  'image/jpeg': {
    extension: 'jpg',
    maxSize: 10 * 1024 * 1024, // 10MB
    magicBytes: [0xFF, 0xD8, 0xFF], // JPEG header
  },
  'image/png': {
    extension: 'png',
    maxSize: 10 * 1024 * 1024, // 10MB
    magicBytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG header
  },
  'image/webp': {
    extension: 'webp',
    maxSize: 10 * 1024 * 1024, // 10MB
    magicBytes: [0x52, 0x49, 0x46, 0x46], // RIFF (WebP uses RIFF container)
  },
  'image/heic': {
    extension: 'heic',
    maxSize: 10 * 1024 * 1024, // 10MB
    magicBytes: [0x00, 0x00, 0x00], // HEIC uses ftyp box, complex header
  },
};

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validates file type by checking MIME type
 */
export function validateFileType(
  file: File,
  allowedTypes: string[]
): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }
  return { valid: true };
}

/**
 * Validates file size against maximum allowed size
 */
export function validateFileSize(
  file: File,
  maxSize: number
): { valid: boolean; error?: string } {
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSizeMB}MB`,
    };
  }
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }
  return { valid: true };
}

/**
 * Validates file content matches declared MIME type using magic bytes
 * Prevents MIME type spoofing attacks
 */
export async function validateFileContent(
  buffer: ArrayBuffer,
  declaredMimeType: string
): Promise<{ valid: boolean; error?: string }> {
  // Safe: declaredMimeType is validated against allowedTypes before this function
  // eslint-disable-next-line security/detect-object-injection
  const config = FILE_TYPE_CONFIGS[declaredMimeType];
  if (!config) {
    return { valid: false, error: 'Unknown file type configuration' };
  }

  // Check if buffer is large enough
  if (buffer.byteLength < config.magicBytes.length) {
    return { valid: false, error: 'File too small to validate' };
  }

  // Read magic bytes
  const header = new Uint8Array(buffer.slice(0, config.magicBytes.length));

  // Validate magic bytes
  // Note: HEIC validation is complex (uses ftyp box), so we'll skip for now
  if (declaredMimeType === 'image/heic') {
    // HEIC files start with ftyp box, which is more complex
    // For now, trust MIME type for HEIC
    return { valid: true };
  }

  // WebP files use RIFF container, need to check for WEBP identifier
  if (declaredMimeType === 'image/webp') {
    // RIFF header: [0x52, 0x49, 0x46, 0x46] (RIFF)
    // Then file size (4 bytes)
    // Then [0x57, 0x45, 0x42, 0x50] (WEBP) at offset 8
    if (buffer.byteLength < 12) {
      return { valid: false, error: 'File too small to validate as WebP' };
    }
    const riffHeader = new Uint8Array(buffer.slice(0, 4));
    const webpHeader = new Uint8Array(buffer.slice(8, 12));
    // Safe: i is bounded by array length (4 elements)
    // eslint-disable-next-line security/detect-object-injection
    const isValidRiff = [0x52, 0x49, 0x46, 0x46].every((byte, i) => riffHeader[i] === byte);
    // eslint-disable-next-line security/detect-object-injection
    const isValidWebp = [0x57, 0x45, 0x42, 0x50].every((byte, i) => webpHeader[i] === byte);
    if (!isValidRiff || !isValidWebp) {
      return {
        valid: false,
        error: 'File content does not match declared file type. Possible file type spoofing.',
      };
    }
    return { valid: true };
  }

  // For other types, validate magic bytes
  // Safe: index is from array iteration, bounded by magicBytes.length
  const isValid = config.magicBytes.every(
    // eslint-disable-next-line security/detect-object-injection
    (byte, index) => header[index] === byte
  );

  if (!isValid) {
    return {
      valid: false,
      error: 'File content does not match declared file type. Possible file type spoofing.',
    };
  }

  return { valid: true };
}

/**
 * Generates a secure filename using UUID
 * Never uses user-provided filenames to prevent path traversal
 */
export function generateSecureFilename(
  mimeType: string,
  originalFilename?: string
): { filename: string; extension: string } {
  // Safe: mimeType is validated against allowedTypes before this function
  // eslint-disable-next-line security/detect-object-injection
  const config = FILE_TYPE_CONFIGS[mimeType];
  if (!config) {
    throw new Error(`No configuration for MIME type: ${mimeType}`);
  }

  const uuid = crypto.randomUUID();
  const filename = `${uuid}.${config.extension}`;

  return {
    filename,
    extension: config.extension,
  };
}

/**
 * Sanitizes a filename for display purposes only
 * Should NOT be used for storage paths
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.\./g, '_') // Prevent path traversal
    .substring(0, 255); // Limit length
}

/**
 * Validates a complete file upload
 * Combines all validation checks
 */
export interface FileUploadValidationResult {
  valid: boolean;
  error?: string;
  filename?: string;
  extension?: string;
  config?: FileTypeConfig;
}

export async function validateFileUpload(
  file: File,
  allowedTypes: string[]
): Promise<FileUploadValidationResult> {
  // Validate file type
  const typeValidation = validateFileType(file, allowedTypes);
  if (!typeValidation.valid) {
    return { valid: false, error: typeValidation.error };
  }

  // Get file type configuration
  // Safe: file.type is validated against allowedTypes above
   
  const config = FILE_TYPE_CONFIGS[file.type];
  if (!config) {
    return { valid: false, error: 'File type not configured' };
  }

  // Validate file size
  const sizeValidation = validateFileSize(file, config.maxSize);
  if (!sizeValidation.valid) {
    return { valid: false, error: sizeValidation.error };
  }

  // Validate file content (magic bytes)
  const buffer = await file.arrayBuffer();
  const contentValidation = await validateFileContent(buffer, file.type);
  if (!contentValidation.valid) {
    return { valid: false, error: contentValidation.error };
  }

  // Generate secure filename
  const { filename, extension } = generateSecureFilename(file.type, file.name);

  return {
    valid: true,
    filename,
    extension,
    config,
  };
}

/**
 * Creates a secure storage path
 * Format: {bucket}/{companyId}/{folder}/{filename}
 */
export function createSecureStoragePath(
  companyId: string,
  folder: string,
  filename: string
): string {
  // Sanitize folder name
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  return `${companyId}/${safeFolder}/${filename}`;
}
