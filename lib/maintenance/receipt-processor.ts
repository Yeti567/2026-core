/**
 * Receipt Processing Service
 * Handles image upload, thumbnail generation, and storage
 */

import { createClient } from '@/lib/supabase/server';
import { extractReceiptData, type ExtractedReceiptData } from './receipt-ocr';

export interface ProcessedReceipt {
  attachment: {
    id: string;
    file_name: string;
    file_path: string;
    thumbnail_path: string | null;
    attachment_type: string;
    vendor_name: string | null;
    amount: number | null;
    attachment_date: string | null;
  };
  extracted_data: ExtractedReceiptData;
}

export interface UploadReceiptOptions {
  equipmentId: string;
  companyId: string;
  attachmentType: string;
  maintenanceRecordId?: string;
  description?: string;
  tags?: string[];
  uploadedVia?: 'web' | 'mobile' | 'email' | 'api';
}

/**
 * Process and upload a receipt image
 */
export async function processReceiptImage(
  imageFile: File,
  options: UploadReceiptOptions,
  userId?: string
): Promise<ProcessedReceipt> {
  const supabase = await createClient();
  
  const {
    equipmentId,
    companyId,
    attachmentType,
    maintenanceRecordId,
    description,
    tags = [],
    uploadedVia = 'web'
  } = options;
  
  // 1. Upload original file to storage
  const filePath = await uploadFileToStorage(supabase, imageFile, equipmentId);
  
  // 2. Generate and upload thumbnail (for images only)
  let thumbnailPath: string | null = null;
  if (imageFile.type.startsWith('image/')) {
    try {
      const thumbnail = await generateThumbnail(imageFile, 300, 300);
      thumbnailPath = await uploadFileToStorage(
        supabase,
        thumbnail,
        equipmentId,
        'thumbnails'
      );
    } catch (err) {
      console.warn('Thumbnail generation failed:', err);
    }
  }
  
  // 3. Run OCR to extract text (for images)
  let extractedData: ExtractedReceiptData = {
    raw_text: '',
    vendor_name: null,
    vendor_address: null,
    date: null,
    amount: null,
    subtotal: null,
    tax: null,
    invoice_number: null,
    po_number: null,
    payment_method: null,
    line_items: [],
    confidence: 0
  };
  
  if (imageFile.type.startsWith('image/')) {
    try {
      extractedData = await extractReceiptData(imageFile);
    } catch (err) {
      console.warn('OCR extraction failed:', err);
    }
  }
  
  // 4. Create attachment record
  const { data: attachment, error } = await supabase
    .from('maintenance_attachments')
    .insert({
      equipment_id: equipmentId,
      company_id: companyId,
      maintenance_record_id: maintenanceRecordId || null,
      attachment_type: attachmentType,
      file_name: imageFile.name,
      file_path: filePath,
      file_size_bytes: imageFile.size,
      file_type: imageFile.type,
      thumbnail_path: thumbnailPath,
      description: description || null,
      attachment_date: extractedData.date ? formatDateForDB(extractedData.date) : null,
      vendor_name: extractedData.vendor_name,
      amount: extractedData.amount,
      extracted_text: extractedData.raw_text || null,
      metadata: {
        invoice_number: extractedData.invoice_number,
        po_number: extractedData.po_number,
        payment_method: extractedData.payment_method,
        subtotal: extractedData.subtotal,
        tax: extractedData.tax,
        vendor_address: extractedData.vendor_address,
        ocr_confidence: extractedData.confidence,
        line_items: extractedData.line_items
      },
      tags: tags,
      uploaded_by: userId || null,
      uploaded_via: uploadedVia
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create attachment record: ${error.message}`);
  }
  
  return {
    attachment,
    extracted_data: extractedData
  };
}

/**
 * Upload file to Supabase Storage
 */
async function uploadFileToStorage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: File | Blob,
  equipmentId: string,
  subfolder?: string
): Promise<string> {
  const timestamp = Date.now();
  const fileName = file instanceof File ? file.name : `image_${timestamp}.jpg`;
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  const folder = subfolder 
    ? `maintenance/${equipmentId}/${subfolder}`
    : `maintenance/${equipmentId}`;
  
  const filePath = `${folder}/${timestamp}_${sanitizedName}`;
  
  const { error } = await supabase.storage
    .from('attachments')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) {
    // Try creating bucket if it doesn't exist
    if (error.message.includes('Bucket not found')) {
      await supabase.storage.createBucket('attachments', {
        public: false,
        fileSizeLimit: 10485760 // 10MB
      });
      
      // Retry upload
      const { error: retryError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);
      
      if (retryError) {
        throw new Error(`Failed to upload file: ${retryError.message}`);
      }
    } else {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }
  
  return filePath;
}

/**
 * Generate thumbnail from image
 */
async function generateThumbnail(
  imageFile: File | Blob,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      // Calculate dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail'));
          }
        },
        'image/jpeg',
        0.7
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    
    img.src = URL.createObjectURL(imageFile);
  });
}

/**
 * Format date string for database
 */
function formatDateForDB(dateStr: string): string | null {
  try {
    // Try parsing various formats
    const formats = [
      // ISO format
      /^(\d{4})-(\d{2})-(\d{2})$/,
      // US format
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    ];
    
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        // Normalize to YYYY-MM-DD
        if (format === formats[0]) {
          return dateStr;
        } else {
          const month = match[1].padStart(2, '0');
          const day = match[2].padStart(2, '0');
          const year = match[3];
          return `${year}-${month}-${day}`;
        }
      }
    }
    
    // Try natural date parsing
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Get signed URL for viewing attachment
 */
export async function getAttachmentUrl(
  filePath: string,
  expiresIn = 3600
): Promise<string | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(filePath, expiresIn);
  
  if (error) {
    console.error('Failed to create signed URL:', error);
    return null;
  }
  
  return data.signedUrl;
}

/**
 * Delete attachment from storage and database
 */
export async function deleteAttachment(
  attachmentId: string
): Promise<boolean> {
  const supabase = await createClient();
  
  // Get attachment record
  const { data: attachment } = await supabase
    .from('maintenance_attachments')
    .select('file_path, thumbnail_path')
    .eq('id', attachmentId)
    .single();
  
  if (!attachment) {
    return false;
  }
  
  // Delete from storage
  const pathsToDelete = [attachment.file_path];
  if (attachment.thumbnail_path) {
    pathsToDelete.push(attachment.thumbnail_path);
  }
  
  await supabase.storage
    .from('attachments')
    .remove(pathsToDelete);
  
  // Delete record
  const { error } = await supabase
    .from('maintenance_attachments')
    .delete()
    .eq('id', attachmentId);
  
  return !error;
}

/**
 * Link attachment to maintenance record
 */
export async function linkAttachmentToRecord(
  attachmentId: string,
  maintenanceRecordId: string
): Promise<boolean> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('maintenance_attachments')
    .update({ maintenance_record_id: maintenanceRecordId })
    .eq('id', attachmentId);
  
  return !error;
}

/**
 * Update attachment with corrected OCR data
 */
export async function updateAttachmentData(
  attachmentId: string,
  data: {
    vendor_name?: string;
    amount?: number;
    attachment_date?: string;
    description?: string;
    tags?: string[];
  }
): Promise<boolean> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('maintenance_attachments')
    .update({
      vendor_name: data.vendor_name,
      amount: data.amount,
      attachment_date: data.attachment_date,
      description: data.description,
      tags: data.tags
    })
    .eq('id', attachmentId);
  
  return !error;
}
