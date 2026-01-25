/**
 * File Validation Utilities
 * Validates file types using magic bytes (file signatures)
 */

/**
 * Check if buffer matches PDF magic bytes
 * PDF files start with %PDF- followed by version number
 */
export function isPDF(buffer: Buffer): boolean {
  // PDF magic bytes: %PDF-1. or %PDF-2. etc
  const pdfSignature = buffer.slice(0, 4).toString('ascii');
  if (pdfSignature !== '%PDF') {
    return false;
  }
  
  // Check version number (should be 1.0-2.0)
  const version = buffer.slice(4, 7).toString('ascii');
  return /^\d\.\d$/.test(version);
}

/**
 * Check if buffer matches image magic bytes
 */
export function isImage(buffer: Buffer): boolean {
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return true;
  }
  
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return true;
  }
  
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return true;
  }
  
  // WebP: RIFF...WEBP
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && 
      buffer.slice(8, 12).toString('ascii') === 'WEBP') {
    return true;
  }
  
  return false;
}

/**
 * Validate file type using magic bytes
 */
export async function validateFileType(file: File, expectedMimeType: string): Promise<boolean> {
  const buffer = Buffer.from(await file.arrayBuffer());
  
  switch (expectedMimeType) {
    case 'application/pdf':
      return isPDF(buffer);
    case 'image/jpeg':
    case 'image/png':
    case 'image/gif':
    case 'image/webp':
      return isImage(buffer);
    default:
      // For other types, trust the MIME type
      return true;
  }
}
