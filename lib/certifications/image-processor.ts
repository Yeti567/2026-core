/**
 * Certificate Image Processing Service
 * 
 * Handles image uploads, thumbnail generation, and optional OCR extraction
 * for certificate documents.
 */

import { createClient } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

export interface ProcessedImage {
  file_path: string;
  thumbnail_path: string | null;
  extracted_data: ExtractedCertificateData | null;
  file_type: 'pdf' | 'image';
  file_size: number;
  mime_type: string;
}

export interface ExtractedCertificateData {
  certificate_number?: string;
  issue_date?: string;
  expiry_date?: string;
  holder_name?: string;
  issuing_organization?: string;
  certification_type?: string;
  raw_text?: string;
}

export interface ImageProcessorOptions {
  generateThumbnail?: boolean;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  extractText?: boolean;
  maxFileSize?: number; // bytes
}

const DEFAULT_OPTIONS: ImageProcessorOptions = {
  generateThumbnail: true,
  thumbnailWidth: 200,
  thumbnailHeight: 200,
  extractText: false, // OCR is optional and requires additional setup
  maxFileSize: 10 * 1024 * 1024, // 10MB
};

// =============================================================================
// MAIN PROCESSOR
// =============================================================================

/**
 * Process a certificate file (image or PDF)
 */
export async function processCertificateFile(
  file: File | Blob,
  companyId: string,
  workerId: string,
  options: ImageProcessorOptions = {}
): Promise<ProcessedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Validate file size
  if (file.size > (opts.maxFileSize || 10 * 1024 * 1024)) {
    throw new Error(`File too large. Maximum size is ${Math.round((opts.maxFileSize || 10 * 1024 * 1024) / 1024 / 1024)}MB`);
  }

  const mimeType = file instanceof File ? file.type : 'image/jpeg';
  const isImage = mimeType.startsWith('image/');
  const isPDF = mimeType === 'application/pdf';

  if (!isImage && !isPDF) {
    throw new Error('Invalid file type. Please upload an image or PDF.');
  }

  // Generate unique filename
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const extension = isPDF ? 'pdf' : getExtensionFromMime(mimeType);
  const filename = `${companyId}/${workerId}/${timestamp}_${randomId}.${extension}`;

  // Upload main file
  const filePath = await uploadToStorage(file, 'certifications', filename);

  // Generate thumbnail for images
  let thumbnailPath: string | null = null;
  if (isImage && opts.generateThumbnail) {
    try {
      const thumbnail = await generateThumbnail(
        file,
        opts.thumbnailWidth || 200,
        opts.thumbnailHeight || 200
      );
      if (thumbnail) {
        const thumbFilename = `${companyId}/${workerId}/thumbs/${timestamp}_${randomId}_thumb.jpg`;
        thumbnailPath = await uploadToStorage(thumbnail, 'certifications', thumbFilename);
      }
    } catch (err) {
      console.warn('Thumbnail generation failed:', err);
      // Continue without thumbnail
    }
  }

  // Optional: Extract text from image using OCR
  let extractedData: ExtractedCertificateData | null = null;
  if (opts.extractText && isImage) {
    try {
      extractedData = await extractCertificateData(file as File);
    } catch (err) {
      console.warn('OCR extraction failed:', err);
      // Continue without extracted data
    }
  }

  return {
    file_path: filePath,
    thumbnail_path: thumbnailPath,
    extracted_data: extractedData,
    file_type: isPDF ? 'pdf' : 'image',
    file_size: file.size,
    mime_type: mimeType,
  };
}

/**
 * Process a certificate image specifically
 */
export async function processCertificateImage(
  imageFile: File | Blob,
  companyId: string,
  workerId: string
): Promise<ProcessedImage> {
  return processCertificateFile(imageFile, companyId, workerId, {
    generateThumbnail: true,
    extractText: false,
  });
}

/**
 * Process a certificate PDF
 */
export async function processCertificatePDF(
  pdfFile: File,
  companyId: string,
  workerId: string
): Promise<ProcessedImage> {
  return processCertificateFile(pdfFile, companyId, workerId, {
    generateThumbnail: false, // PDF thumbnails require additional processing
    extractText: false,
  });
}

// =============================================================================
// STORAGE FUNCTIONS
// =============================================================================

/**
 * Upload file to Supabase Storage
 */
async function uploadToStorage(
  file: File | Blob,
  bucket: string,
  path: string
): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return data.path;
}

/**
 * Get a signed URL for a stored file
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete a file from storage
 */
export async function deleteFromStorage(
  bucket: string,
  path: string
): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

// =============================================================================
// THUMBNAIL GENERATION
// =============================================================================

/**
 * Generate a thumbnail from an image file
 * Note: This function requires browser environment (Canvas API)
 */
export async function generateThumbnail(
  file: File | Blob,
  width: number,
  height: number
): Promise<Blob | null> {
  // Check if we're in browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('Thumbnail generation requires browser environment');
    return null;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Calculate dimensions to maintain aspect ratio
      let targetWidth = width;
      let targetHeight = height;
      const aspectRatio = img.width / img.height;

      if (aspectRatio > 1) {
        // Landscape
        targetHeight = Math.round(width / aspectRatio);
      } else {
        // Portrait
        targetWidth = Math.round(height * aspectRatio);
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Use high-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw scaled image
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail blob'));
          }
        },
        'image/jpeg',
        0.8
      );

      // Cleanup
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image for thumbnail'));
    };

    img.src = URL.createObjectURL(file);
  });
}

// =============================================================================
// IMAGE MANIPULATION
// =============================================================================

/**
 * Rotate an image by specified degrees
 */
export async function rotateImage(
  file: File | Blob,
  degrees: number
): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('Image rotation requires browser environment');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      const radians = (degrees * Math.PI) / 180;

      // Swap dimensions for 90/270 degree rotations
      if (degrees % 180 !== 0) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(radians);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create rotated image blob'));
          }
        },
        'image/jpeg',
        0.9
      );

      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image for rotation'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Crop an image to specified dimensions
 */
export async function cropImage(
  file: File | Blob,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('Image cropping requires browser environment');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create cropped image blob'));
          }
        },
        'image/jpeg',
        0.9
      );

      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image for cropping'));
    };

    img.src = URL.createObjectURL(file);
  });
}

// =============================================================================
// OCR / TEXT EXTRACTION (Optional)
// =============================================================================

/**
 * Extract certificate data from image using OCR
 * 
 * NOTE: This is a placeholder implementation. For production use,
 * integrate with an OCR service like:
 * - Tesseract.js (client-side)
 * - Google Cloud Vision API
 * - AWS Textract
 * - Azure Computer Vision
 */
export async function extractCertificateData(
  file: File
): Promise<ExtractedCertificateData | null> {
  // Placeholder - OCR not implemented
  // To enable OCR, install tesseract.js: npm install tesseract.js
  // Then uncomment and modify the code below:
  
  /*
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    
    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();
    
    return parseExtractedText(text);
  } catch (err) {
    console.error('OCR extraction failed:', err);
    return null;
  }
  */
  
  console.log('OCR extraction not implemented');
  return null;
}

/**
 * Parse extracted text to find certificate details
 * This uses simple regex patterns - adjust based on your certificate formats
 */
function parseExtractedText(text: string): ExtractedCertificateData {
  const result: ExtractedCertificateData = {
    raw_text: text,
  };

  // Try to extract certificate number (common patterns)
  const certNumPatterns = [
    /cert(?:ificate)?[\s#:]+([A-Z0-9-]+)/i,
    /number[\s#:]+([A-Z0-9-]+)/i,
    /([A-Z]{2,4}-\d{4,10})/,
  ];

  for (const pattern of certNumPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.certificate_number = match[1];
      break;
    }
  }

  // Try to extract dates
  const datePatterns = [
    /issued[\s:]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /date[\s:]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
  ];

  const dates: string[] = [];
  for (const pattern of datePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      dates.push(...matches);
    }
  }

  if (dates.length >= 1) {
    result.issue_date = dates[0];
  }
  if (dates.length >= 2) {
    result.expiry_date = dates[1];
  }

  // Try to extract organization
  const orgPatterns = [
    /issued by[\s:]+([A-Za-z\s]+)/i,
    /training provider[\s:]+([A-Za-z\s]+)/i,
  ];

  for (const pattern of orgPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.issuing_organization = match[1].trim();
      break;
    }
  }

  return result;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get file extension from MIME type
 */
function getExtensionFromMime(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'application/pdf': 'pdf',
  };
  // Safe: mimeType is from file.type which is a standard browser-controlled MIME type
  // eslint-disable-next-line security/detect-object-injection
  return extensions[mimeType] || 'jpg';
}

/**
 * Validate file type
 */
export function isValidCertificateFile(file: File): boolean {
  const validTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
  ];
  return validTypes.includes(file.type);
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
