/**
 * PDF Text Extraction Service
 * 
 * Extracts searchable text from uploaded PDFs for:
 * - Full-text search across documents
 * - Control number detection
 * - Document cross-referencing
 * - Audit evidence indexing
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface PDFExtractionResult {
  text: string;
  pages: number;
  info: PDFInfo | null;
  metadata: PDFMetadata | null;
  version: string | null;
  success: boolean;
  error?: string;
}

export interface PDFInfo {
  Title?: string;
  Author?: string;
  Subject?: string;
  Keywords?: string;
  Creator?: string;
  Producer?: string;
  CreationDate?: string;
  ModDate?: string;
  PDFFormatVersion?: string;
  IsAcroFormPresent?: boolean;
  IsXFAPresent?: boolean;
  [key: string]: unknown;
}

export interface PDFMetadata {
  _metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DocumentReference {
  control_number: string;
  context: string;
  position: number;
  document_type?: string;
}

export interface ControlNumberMatch {
  controlNumber: string;
  type: string;
  pageNumber?: number;
  context?: string;
}

export interface DocumentSearchFilters {
  document_type?: string;
  cor_elements?: number[];
  tags?: string[];
  status?: string[];
  date_from?: Date;
  date_to?: Date;
}

export interface DocumentSearchResult {
  document: Record<string, unknown>;
  relevance: number;
  snippet: string;
  matchedTerms: string[];
}

// ============================================================================
// PDF TEXT EXTRACTION
// ============================================================================

async function parsePdf(buffer: Buffer, options?: Record<string, unknown>): Promise<any> {
  const mod: any = await import('pdf-parse');
  const fn = mod?.default ?? mod;
  return fn(buffer, options);
}

/**
 * Extracts text content from a PDF file buffer
 */
export async function extractTextFromPDF(
  fileBuffer: Buffer | ArrayBuffer
): Promise<PDFExtractionResult> {
  try {
    // Convert ArrayBuffer to Buffer if needed
    const buffer = Buffer.isBuffer(fileBuffer) 
      ? fileBuffer 
      : Buffer.from(fileBuffer);
    
    // Parse PDF
    const data = await parsePdf(buffer, {
      // Options for pdf-parse
      max: 0, // No page limit
    });
    
    return {
      text: data.text || '',
      pages: data.numpages || 0,
      info: data.info as PDFInfo || null,
      metadata: data.metadata as PDFMetadata || null,
      version: data.version || null,
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PDF extraction failed:', error);
    
    // Check for common issues
    let errorDetail = message;
    if (message.includes('Invalid PDF')) {
      errorDetail = 'Invalid or corrupted PDF file';
    } else if (message.includes('encrypted')) {
      errorDetail = 'PDF is encrypted or password protected';
    } else if (message.includes('image')) {
      errorDetail = 'PDF appears to be scanned images - OCR required';
    }
    
    return {
      text: '',
      pages: 0,
      info: null,
      metadata: null,
      version: null,
      success: false,
      error: errorDetail,
    };
  }
}

/**
 * Extracts text with page-by-page processing for large documents
 */
export async function extractTextFromPDFWithPages(
  fileBuffer: Buffer | ArrayBuffer
): Promise<{ text: string; pageTexts: string[]; pages: number; success: boolean; error?: string }> {
  try {
    const buffer = Buffer.isBuffer(fileBuffer) 
      ? fileBuffer 
      : Buffer.from(fileBuffer);
    
    const pageTexts: string[] = [];
    
    // Custom page render function to capture per-page text
    const renderPage = (pageData: { pageIndex: number; getTextContent: () => Promise<{ items: Array<{ str: string }> }> }) => {
      return pageData.getTextContent()
        .then(textContent => {
          const pageText = textContent.items
            .map(item => item.str)
            .join(' ');
          pageTexts[pageData.pageIndex] = pageText;
          return pageText;
        });
    };
    
    const data = await parsePdf(buffer, {
      pagerender: renderPage,
    });
    
    return {
      text: data.text || '',
      pageTexts,
      pages: data.numpages || 0,
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      text: '',
      pageTexts: [],
      pages: 0,
      success: false,
      error: message,
    };
  }
}

// ============================================================================
// CONTROL NUMBER DETECTION
// ============================================================================

/**
 * Default document type codes for pattern matching
 */
const DOCUMENT_TYPE_CODES = [
  'POL', 'SWP', 'SJP', 'FRM', 'CHK', 'WI', 'PRC', 'MAN', 
  'PLN', 'REG', 'TRN', 'RPT', 'MIN', 'CRT', 'DWG', 'AUD'
];

/**
 * Finds control numbers in text matching company's format
 * Pattern: {COMPANY}-{TYPE}-{SEQUENCE} e.g., NCCI-POL-001
 */
export function findControlNumbers(
  text: string,
  companyInitials?: string
): string[] {
  if (!text) return [];
  
  // Build pattern: either specific company or any 2-6 letter prefix
  const prefix = companyInitials 
    ? escapeRegex(companyInitials)
    : '[A-Z]{2,6}';
  
  // Pattern: PREFIX-TYPE-NNN or PREFIX-TYPE-NNNN
  // Safe: prefix is either escaped user input or a literal pattern
  // eslint-disable-next-line security/detect-non-literal-regexp
  const pattern = new RegExp(
    `\\b(${prefix})-([A-Z]{2,3})-(\\d{3,4})\\b`,
    'gi'
  );
  
  const matches: string[] = [];
  let match;
  
  while ((match = pattern.exec(text)) !== null) {
    const [fullMatch, , type] = match;
    
    // Validate the type code
    if (DOCUMENT_TYPE_CODES.includes(type.toUpperCase())) {
      matches.push(fullMatch.toUpperCase());
    }
  }
  
  // Remove duplicates
  return [...new Set(matches)];
}

/**
 * Finds control numbers with context and position information
 */
export function findControlNumbersWithContext(
  text: string,
  companyInitials?: string,
  contextLength: number = 100
): ControlNumberMatch[] {
  if (!text) return [];
  
  const prefix = companyInitials 
    ? escapeRegex(companyInitials)
    : '[A-Z]{2,6}';
  
  // Safe: prefix is either escaped user input or a literal pattern
  // eslint-disable-next-line security/detect-non-literal-regexp
  const pattern = new RegExp(
    `\\b(${prefix})-([A-Z]{2,3})-(\\d{3,4})\\b`,
    'gi'
  );
  
  const matches: ControlNumberMatch[] = [];
  const seen = new Set<string>();
  let match;
  
  while ((match = pattern.exec(text)) !== null) {
    const [fullMatch, , type] = match;
    const controlNumber = fullMatch.toUpperCase();
    
    if (!DOCUMENT_TYPE_CODES.includes(type.toUpperCase())) continue;
    if (seen.has(controlNumber)) continue;
    
    seen.add(controlNumber);
    
    // Extract surrounding context
    const start = Math.max(0, match.index - contextLength);
    const end = Math.min(text.length, match.index + fullMatch.length + contextLength);
    const context = text.slice(start, end).replace(/\s+/g, ' ').trim();
    
    matches.push({
      controlNumber,
      type: type.toUpperCase(),
      context: (start > 0 ? '...' : '') + context + (end < text.length ? '...' : ''),
    });
  }
  
  return matches;
}

/**
 * Finds references to other documents in the text
 */
export function findDocumentReferences(
  text: string,
  allControlNumbers: string[]
): DocumentReference[] {
  if (!text || !allControlNumbers.length) return [];
  
  const references: DocumentReference[] = [];
  const textUpper = text.toUpperCase();
  
  for (const controlNum of allControlNumbers) {
    const controlUpper = controlNum.toUpperCase();
    let index = textUpper.indexOf(controlUpper);
    
    while (index !== -1) {
      // Extract context around the reference
      const contextStart = Math.max(0, index - 100);
      const contextEnd = Math.min(text.length, index + controlNum.length + 100);
      const context = text.slice(contextStart, contextEnd).replace(/\s+/g, ' ').trim();
      
      // Parse type from control number
      const typePart = controlNum.split('-')[1];
      
      references.push({
        control_number: controlUpper,
        context: (contextStart > 0 ? '...' : '') + context + (contextEnd < text.length ? '...' : ''),
        position: index,
        document_type: typePart,
      });
      
      // Find next occurrence
      index = textUpper.indexOf(controlUpper, index + 1);
    }
  }
  
  // Sort by position and deduplicate
  return references
    .sort((a, b) => a.position - b.position)
    .filter((ref, idx, arr) => 
      idx === 0 || ref.control_number !== arr[idx - 1].control_number || 
      Math.abs(ref.position - arr[idx - 1].position) > 200
    );
}

// ============================================================================
// VALIDATION & PARSING
// ============================================================================

/**
 * Validates a control number format
 */
export function isValidControlNumber(controlNumber: string): boolean {
  const pattern = /^[A-Z]{2,6}-[A-Z]{2,3}-\d{3,4}$/;
  if (!pattern.test(controlNumber.toUpperCase())) return false;
  
  const parts = controlNumber.toUpperCase().split('-');
  const type = parts[1];
  
  return DOCUMENT_TYPE_CODES.includes(type);
}

/**
 * Parses a control number into its components
 */
export function parseControlNumber(controlNumber: string): {
  prefix: string;
  type: string;
  sequence: number;
  formatted: string;
} | null {
  const pattern = /^([A-Z]{2,6})-([A-Z]{2,3})-(\d{3,4})$/;
  const match = controlNumber.toUpperCase().match(pattern);
  
  if (!match) return null;
  
  return {
    prefix: match[1],
    type: match[2],
    sequence: parseInt(match[3], 10),
    formatted: `${match[1]}-${match[2]}-${match[3]}`,
  };
}

// ============================================================================
// TEXT PROCESSING UTILITIES
// ============================================================================

/**
 * Cleans extracted text for better search indexing
 */
export function cleanExtractedText(text: string): string {
  if (!text) return '';
  
  return text
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    // Remove control characters (except newlines)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize unicode
    .normalize('NFKC')
    // Trim
    .trim();
}

/**
 * Extracts keywords from text for search hints
 */
export function extractKeywords(text: string, maxKeywords: number = 20): string[] {
  if (!text) return [];
  
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'this', 'that',
    'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we', 'our', 'you',
    'your', 'he', 'she', 'him', 'her', 'his', 'hers', 'all', 'any', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
    'page', 'document', 'date', 'rev', 'revision', 'version',
  ]);
  
  // Tokenize and count word frequency
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  const frequency = new Map<string, number>();
  words.forEach(word => {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  });
  
  // Sort by frequency and return top keywords
  return Array.from(frequency.entries())
    .filter(([, count]) => count >= 2) // Require at least 2 occurrences
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Extracts a snippet around search terms with highlighting
 */
export function extractSnippet(
  text: string,
  query: string,
  maxLength: number = 200
): string {
  if (!text || !query) return text?.slice(0, maxLength) + '...' || '';
  
  const lowerText = text.toLowerCase();
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  
  // Find the best position (where most query terms appear close together)
  let bestIndex = -1;
  let bestScore = 0;
  
  for (const term of queryTerms) {
    let index = lowerText.indexOf(term);
    while (index !== -1) {
      // Score based on how many other terms are nearby
      let score = 1;
      for (const otherTerm of queryTerms) {
        if (otherTerm !== term) {
          const nearbyIndex = lowerText.indexOf(otherTerm, index - 100);
          if (nearbyIndex !== -1 && nearbyIndex < index + 100) {
            score++;
          }
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
      
      index = lowerText.indexOf(term, index + 1);
    }
  }
  
  // Fall back to first occurrence if no match found
  if (bestIndex === -1) {
    bestIndex = 0;
  }
  
  // Extract snippet
  const start = Math.max(0, bestIndex - 50);
  const end = Math.min(text.length, start + maxLength);
  
  let snippet = text.slice(start, end);
  
  // Add ellipsis if truncated
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  
  return snippet;
}

/**
 * Highlights search terms in a snippet
 */
export function highlightMatches(
  text: string,
  searchTerms: string[],
  highlightStart: string = '<mark>',
  highlightEnd: string = '</mark>'
): string {
  if (!text || !searchTerms.length) return text;
  
  let result = text;
  
  for (const term of searchTerms) {
    if (term.length < 2) continue;
    // Safe: term is escaped before use in regex
    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    result = result.replace(regex, `${highlightStart}$1${highlightEnd}`);
  }
  
  return result;
}

/**
 * Calculates relevance score for search ranking
 */
export function calculateRelevance(
  text: string,
  query: string,
  title?: string
): number {
  if (!text || !query) return 0;
  
  const lowerText = text.toLowerCase();
  const lowerTitle = title?.toLowerCase() || '';
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  
  if (queryTerms.length === 0) return 0;
  
  let score = 0;
  
  for (const term of queryTerms) {
    // Title matches are worth more
    if (lowerTitle.includes(term)) {
      score += 100;
    }
    
    // Count occurrences in text
    let index = lowerText.indexOf(term);
    let count = 0;
    while (index !== -1 && count < 50) { // Cap at 50 matches
      count++;
      index = lowerText.indexOf(term, index + 1);
    }
    
    score += Math.min(count * 5, 50); // Cap contribution per term
    
    // Bonus for exact phrase match
    if (queryTerms.length > 1 && lowerText.includes(query.toLowerCase())) {
      score += 50;
    }
  }
  
  // Normalize by query length
  return score / queryTerms.length;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// SUPABASE INTEGRATION
// ============================================================================

/**
 * Uploads a file to Supabase Storage
 */
export async function uploadToStorage(
  file: File | Buffer,
  companyId: string,
  folder: string = 'documents'
): Promise<string> {
  const supabase = await createClient();
  
  const timestamp = Date.now();
  const fileName = file instanceof File ? file.name : 'document.pdf';
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${companyId}/${folder}/${timestamp}_${safeName}`;
  
  const fileData = file instanceof File 
    ? await file.arrayBuffer()
    : file;
  
  const { error } = await supabase.storage
    .from('documents')
    .upload(filePath, fileData, {
      contentType: file instanceof File ? file.type : 'application/pdf',
      upsert: false,
    });
  
  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
  
  return filePath;
}

/**
 * Downloads a file from Supabase Storage
 */
export async function downloadFromStorage(
  filePath: string
): Promise<Buffer> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.storage
    .from('documents')
    .download(filePath);
  
  if (error) {
    throw new Error(`Failed to download file: ${error.message}`);
  }
  
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Gets the public URL for a stored file
 */
export async function getStorageUrl(filePath: string): Promise<string> {
  const supabase = await createClient();
  
  const { data } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

/**
 * Processes an uploaded document: extracts text, detects control numbers
 */
export async function processUploadedDocument(
  file: File,
  companyId: string,
  documentTypeCode: string,
  uploadedBy: string,
  options?: {
    title?: string;
    description?: string;
    tags?: string[];
    cor_elements?: number[];
    applicable_to?: string[];
    folder_id?: string;
  }
): Promise<{
  document: Record<string, unknown>;
  extraction: PDFExtractionResult;
  controlNumbers: string[];
}> {
  const supabase = await createClient();
  
  // 1. Get company initials for control number detection
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .single();
  
  const companyInitials = company?.name
    ? company.name.split(/\s+/).map((w: string) => w[0]).join('').toUpperCase().slice(0, 4)
    : null;
  
  // 2. Upload file to Supabase Storage
  const filePath = await uploadToStorage(file, companyId);
  
  // 3. Extract text from PDF
  const fileBuffer = await file.arrayBuffer();
  const extraction = await extractTextFromPDF(Buffer.from(fileBuffer));
  
  // 4. Clean extracted text
  const cleanedText = cleanExtractedText(extraction.text);
  
  // 5. Find control numbers referenced in document
  const referencedControlNumbers = findControlNumbers(cleanedText, companyInitials || undefined);
  
  // 6. Extract keywords
  const keywords = extractKeywords(cleanedText, 15);
  
  // 7. Generate control number for this document
  const { data: controlNumber, error: ctrlError } = await supabase
    .rpc('generate_control_number', {
      p_company_id: companyId,
      p_doc_type_code: documentTypeCode,
    });
  
  if (ctrlError) {
    throw new Error(`Failed to generate control number: ${ctrlError.message}`);
  }
  
  // Parse sequence number
  const seqMatch = controlNumber.match(/(\d+)$/);
  const sequenceNumber = seqMatch ? parseInt(seqMatch[1], 10) : 1;
  
  // 8. Get document type info for review frequency
  const { data: docType } = await supabase
    .from('document_types')
    .select('review_frequency_months, requires_approval, approval_roles')
    .eq('code', documentTypeCode)
    .single();
  
  const reviewMonths = docType?.review_frequency_months || 12;
  const nextReviewDate = new Date();
  nextReviewDate.setMonth(nextReviewDate.getMonth() + reviewMonths);
  
  // 9. Create document record
  const title = options?.title || file.name.replace(/\.[^/.]+$/, ''); // Remove extension
  
  // Get folder path if folder_id provided
  let folderPath = '/';
  if (options?.folder_id) {
    const { data: folder } = await supabase
      .from('document_folders')
      .select('path')
      .eq('id', options.folder_id)
      .single();
    folderPath = folder?.path || '/';
  }

  const { data: document, error: docError } = await supabase
    .from('documents')
    .insert({
      company_id: companyId,
      control_number: controlNumber,
      document_type_code: documentTypeCode,
      sequence_number: sequenceNumber,
      title,
      description: options?.description,
      version: '1.0',
      status: 'draft',
      file_path: filePath,
      file_name: file.name,
      file_size_bytes: file.size,
      file_type: file.type,
      page_count: extraction.pages,
      extracted_text: cleanedText,
      tags: [...(options?.tags || []), ...keywords],
      cor_elements: options?.cor_elements || [],
      applicable_to: options?.applicable_to || ['all_workers'],
      next_review_date: nextReviewDate.toISOString().split('T')[0],
      created_by: uploadedBy,
      folder_id: options?.folder_id || null,
      folder_path: folderPath,
    })
    .select()
    .single();
  
  if (docError) {
    throw new Error(`Failed to create document: ${docError.message}`);
  }
  
  // 10. Create approval workflow if required
  if (docType?.requires_approval && docType.approval_roles?.length) {
    const approvals = docType.approval_roles.map((role: string, index: number) => ({
      document_id: document.id,
      company_id: companyId,
      approver_role: role,
      approval_order: index + 1,
      required: true,
      status: 'pending',
    }));
    
    await supabase.from('document_approvals').insert(approvals);
  }
  
  return {
    document,
    extraction,
    controlNumbers: referencedControlNumbers,
  };
}
