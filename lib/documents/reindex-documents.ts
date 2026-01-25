/**
 * Document Re-indexing Service
 * 
 * Background job for re-extracting text from PDFs and updating
 * the search index. Useful for:
 * - Bulk re-indexing after schema changes
 * - Recovering from extraction failures
 * - Updating search vectors
 */

import { createClient } from '@/lib/supabase/server';
import { 
  extractTextFromPDF, 
  cleanExtractedText, 
  extractKeywords,
  findControlNumbers,
  downloadFromStorage 
} from './pdf-extractor';

// ============================================================================
// TYPES
// ============================================================================

export interface ReindexResult {
  document_id: string;
  control_number: string;
  success: boolean;
  pages?: number;
  text_length?: number;
  keywords?: string[];
  references?: string[];
  error?: string;
}

export interface ReindexSummary {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: ReindexResult[];
  started_at: string;
  completed_at: string;
  duration_ms: number;
}

export interface ReindexOptions {
  /** Only reindex documents with empty or null extracted_text */
  onlyEmpty?: boolean;
  /** Only reindex documents modified after this date */
  modifiedAfter?: Date;
  /** Only reindex specific document types */
  documentTypes?: string[];
  /** Maximum documents to process (for batching) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Force re-extraction even if text exists */
  force?: boolean;
  /** Callback for progress updates */
  onProgress?: (completed: number, total: number, current: ReindexResult) => void;
}

// ============================================================================
// MAIN REINDEX FUNCTION
// ============================================================================

/**
 * Re-indexes all PDF documents for a company
 */
export async function reindexAllDocuments(
  companyId: string,
  options: ReindexOptions = {}
): Promise<ReindexSummary> {
  const supabase = await createClient();
  const startTime = Date.now();
  
  // Get company initials for control number detection
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .single();
  
  const companyInitials = company?.name
    ? company.name.split(/\s+/).map((w: string) => w[0]).join('').toUpperCase().slice(0, 4)
    : null;
  
  // Build query
  let query = supabase
    .from('documents')
    .select('id, control_number, file_path, file_type, extracted_text, tags')
    .eq('company_id', companyId)
    .not('file_path', 'is', null);
  
  // Filter to PDFs
  query = query.eq('file_type', 'application/pdf');
  
  // Apply options
  if (options.onlyEmpty) {
    query = query.or('extracted_text.is.null,extracted_text.eq.');
  }
  
  if (options.modifiedAfter) {
    query = query.gte('updated_at', options.modifiedAfter.toISOString());
  }
  
  if (options.documentTypes?.length) {
    query = query.in('document_type_code', options.documentTypes);
  }
  
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
  }
  
  query = query.order('created_at', { ascending: false });
  
  const { data: documents, error: fetchError } = await query;
  
  if (fetchError) {
    throw new Error(`Failed to fetch documents: ${fetchError.message}`);
  }
  
  const results: ReindexResult[] = [];
  let successful = 0;
  let failed = 0;
  let skipped = 0;
  
  // Process each document
  for (let i = 0; i < (documents || []).length; i++) {
    // Safe: i is a controlled loop index within bounds of documents array
    // eslint-disable-next-line security/detect-object-injection
    const doc = documents![i];
    
    // Skip if has text and not forcing
    if (doc.extracted_text && !options.force && !options.onlyEmpty) {
      skipped++;
      results.push({
        document_id: doc.id,
        control_number: doc.control_number,
        success: true,
        text_length: doc.extracted_text.length,
      });
      continue;
    }
    
    try {
      // Download PDF from storage
      const fileBuffer = await downloadFromStorage(doc.file_path);
      
      // Extract text
      const extraction = await extractTextFromPDF(fileBuffer);
      
      if (!extraction.success) {
        throw new Error(extraction.error || 'Extraction failed');
      }
      
      // Clean and process text
      const cleanedText = cleanExtractedText(extraction.text);
      const keywords = extractKeywords(cleanedText, 15);
      const references = findControlNumbers(cleanedText, companyInitials || undefined);
      
      // Merge keywords with existing tags (avoid duplicates)
      const existingTags = doc.tags || [];
      const newTags = [...new Set([...existingTags, ...keywords])];
      
      // Update document
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          extracted_text: cleanedText,
          page_count: extraction.pages,
          tags: newTags,
        })
        .eq('id', doc.id);
      
      if (updateError) {
        throw new Error(updateError.message);
      }
      
      const result: ReindexResult = {
        document_id: doc.id,
        control_number: doc.control_number,
        success: true,
        pages: extraction.pages,
        text_length: cleanedText.length,
        keywords,
        references,
      };
      
      results.push(result);
      successful++;
      
      console.log(`✓ Re-indexed: ${doc.control_number} (${extraction.pages} pages, ${cleanedText.length} chars)`);
      
      // Progress callback
      if (options.onProgress) {
        options.onProgress(i + 1, documents!.length, result);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      results.push({
        document_id: doc.id,
        control_number: doc.control_number,
        success: false,
        error: errorMessage,
      });
      
      failed++;
      console.error(`✗ Failed to re-index ${doc.control_number}:`, errorMessage);
    }
    
    // Small delay to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const endTime = Date.now();
  
  return {
    total: documents?.length || 0,
    successful,
    failed,
    skipped,
    results,
    started_at: new Date(startTime).toISOString(),
    completed_at: new Date(endTime).toISOString(),
    duration_ms: endTime - startTime,
  };
}

/**
 * Re-indexes a single document
 */
export async function reindexDocument(
  documentId: string
): Promise<ReindexResult> {
  const supabase = await createClient();
  
  // Get document
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('id, control_number, company_id, file_path, file_type')
    .eq('id', documentId)
    .single();
  
  if (fetchError || !doc) {
    return {
      document_id: documentId,
      control_number: 'UNKNOWN',
      success: false,
      error: 'Document not found',
    };
  }
  
  if (!doc.file_path) {
    return {
      document_id: documentId,
      control_number: doc.control_number,
      success: false,
      error: 'No file attached to document',
    };
  }
  
  if (doc.file_type !== 'application/pdf') {
    return {
      document_id: documentId,
      control_number: doc.control_number,
      success: false,
      error: `Unsupported file type: ${doc.file_type}`,
    };
  }
  
  try {
    // Get company initials
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', doc.company_id)
      .single();
    
    const companyInitials = company?.name
      ? company.name.split(/\s+/).map((w: string) => w[0]).join('').toUpperCase().slice(0, 4)
      : null;
    
    // Download and extract
    const fileBuffer = await downloadFromStorage(doc.file_path);
    const extraction = await extractTextFromPDF(fileBuffer);
    
    if (!extraction.success) {
      throw new Error(extraction.error || 'Extraction failed');
    }
    
    const cleanedText = cleanExtractedText(extraction.text);
    const keywords = extractKeywords(cleanedText, 15);
    const references = findControlNumbers(cleanedText, companyInitials || undefined);
    
    // Update document
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        extracted_text: cleanedText,
        page_count: extraction.pages,
      })
      .eq('id', documentId);
    
    if (updateError) {
      throw new Error(updateError.message);
    }
    
    return {
      document_id: documentId,
      control_number: doc.control_number,
      success: true,
      pages: extraction.pages,
      text_length: cleanedText.length,
      keywords,
      references,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      document_id: documentId,
      control_number: doc.control_number,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Checks which documents need re-indexing
 */
export async function getDocumentsNeedingReindex(
  companyId: string
): Promise<{ id: string; control_number: string; reason: string }[]> {
  const supabase = await createClient();
  
  // Find documents with missing or empty extracted text
  const { data: documents } = await supabase
    .from('documents')
    .select('id, control_number, extracted_text, file_path, file_type')
    .eq('company_id', companyId)
    .eq('file_type', 'application/pdf')
    .not('file_path', 'is', null);
  
  const needsReindex: { id: string; control_number: string; reason: string }[] = [];
  
  for (const doc of documents || []) {
    if (!doc.extracted_text) {
      needsReindex.push({
        id: doc.id,
        control_number: doc.control_number,
        reason: 'No extracted text',
      });
    } else if (doc.extracted_text.trim().length < 50) {
      needsReindex.push({
        id: doc.id,
        control_number: doc.control_number,
        reason: 'Extracted text too short (may have failed)',
      });
    }
  }
  
  return needsReindex;
}

/**
 * Updates search vectors for all documents (triggers the database function)
 */
export async function refreshSearchVectors(companyId: string): Promise<number> {
  const supabase = await createClient();
  
  // Touch all documents to trigger the search vector update trigger
  const { data, error } = await supabase
    .from('documents')
    .update({ updated_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .select('id');
  
  if (error) {
    throw new Error(`Failed to refresh search vectors: ${error.message}`);
  }
  
  return data?.length || 0;
}
