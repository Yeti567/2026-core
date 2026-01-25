/**
 * Text Processing Utilities for Documents
 * 
 * Client-safe text processing functions that can be used in both
 * server and client components.
 */

// ============================================================================
// CONTROL NUMBER DETECTION
// ============================================================================

/**
 * Common patterns for control numbers in safety documents
 */
const CONTROL_NUMBER_PATTERNS = [
  // Standard format: XXX-YYY-NNN (e.g., NCCI-POL-001)
  /\b([A-Z]{2,5})-([A-Z]{2,5})-(\d{3,4})\b/gi,
  // Document number with prefix: DOC-NNNN
  /\b(DOC|FORM|SOP|POL|PRO)-?\d{3,5}\b/gi,
  // Simple alphanumeric: XX-NNNN
  /\b([A-Z]{2,4})\d{4,6}\b/g,
  // ISO style: XX.YYY.ZZ.NNN
  /\b\d{2}\.\d{3}\.\d{2}\.\d{3}\b/g,
];

/**
 * Finds control numbers in text
 */
export function findControlNumbers(
  text: string,
  companyInitials?: string
): string[] {
  const controlNumbers = new Set<string>();
  
  // First, try company-specific pattern
  if (companyInitials) {
    // Safe: companyInitials is validated input, not user-controlled
    // eslint-disable-next-line security/detect-non-literal-regexp
    const companyPattern = new RegExp(
      `\\b${companyInitials.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-([A-Z]{2,5})-(\\d{3,4})\\b`,
      'gi'
    );
    const matches = text.match(companyPattern);
    if (matches) {
      matches.forEach(m => controlNumbers.add(m.toUpperCase()));
    }
  }
  
  // Then try general patterns
  for (const pattern of CONTROL_NUMBER_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => controlNumbers.add(m.toUpperCase()));
    }
  }
  
  return Array.from(controlNumbers);
}

// ============================================================================
// TEXT CLEANING
// ============================================================================

/**
 * Cleans extracted PDF text
 */
export function cleanExtractedText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, '')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

// ============================================================================
// KEYWORD EXTRACTION
// ============================================================================

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'up', 'about', 'into', 'over', 'after', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'this', 'that',
  'these', 'those', 'it', 'its', 'they', 'their', 'we', 'our', 'you', 'your', 'he', 'she',
  'him', 'her', 'his', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'not', 'only', 'same', 'so', 'than', 'too', 'very', 'just', 'also',
  'page', 'date', 'revision', 'version', 'form', 'document', 'company'
]);

/**
 * Extracts keywords from text
 */
export function extractKeywords(text: string, maxKeywords: number = 20): string[] {
  if (!text) return [];
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && 
      !STOP_WORDS.has(word) &&
      !/^\d+$/.test(word)
    );
  
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }
  
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

// ============================================================================
// DOCUMENT TYPE DETECTION
// ============================================================================

const DOCUMENT_TYPE_PATTERNS: Record<string, RegExp[]> = {
  policy: [/\bpolicy\b/i, /\bpolicies\b/i],
  procedure: [/\bprocedure\b/i, /\bsop\b/i, /\bstandard operating\b/i],
  form: [/\bform\b/i, /\btemplate\b/i, /\bchecklist\b/i],
  manual: [/\bmanual\b/i, /\bhandbook\b/i, /\bguide\b/i],
  permit: [/\bpermit\b/i, /\blicense\b/i, /\bcertificate\b/i],
  training: [/\btraining\b/i, /\bcourse\b/i, /\bmodule\b/i],
  inspection: [/\binspection\b/i, /\baudit\b/i, /\breview\b/i],
  incident: [/\bincident\b/i, /\baccident\b/i, /\binvestigation\b/i],
  sds: [/\bsds\b/i, /\bmsds\b/i, /\bsafety data sheet\b/i],
  jsa: [/\bjsa\b/i, /\bjha\b/i, /\bjob safety\b/i, /\bhazard analysis\b/i],
};

/**
 * Detects document type from text and filename
 */
export function detectDocumentType(
  text: string,
  filename: string
): { type: string; confidence: 'high' | 'medium' | 'low' } {
  const combinedText = `${filename} ${text.slice(0, 2000)}`.toLowerCase();
  
  for (const [type, patterns] of Object.entries(DOCUMENT_TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(combinedText)) {
        const filenameMatch = pattern.test(filename.toLowerCase());
        return {
          type,
          confidence: filenameMatch ? 'high' : 'medium',
        };
      }
    }
  }
  
  return { type: 'other', confidence: 'low' };
}

// ============================================================================
// COR ELEMENT DETECTION
// ============================================================================

const COR_ELEMENT_KEYWORDS: Record<number, string[]> = {
  1: ['management', 'commitment', 'leadership', 'policy'],
  2: ['hazard', 'identification', 'assessment', 'risk'],
  3: ['hazard', 'control', 'hierarchy', 'ppe', 'engineering'],
  4: ['training', 'competency', 'qualification', 'orientation'],
  5: ['inspection', 'planned', 'audit', 'workplace'],
  6: ['emergency', 'response', 'evacuation', 'first aid'],
  7: ['incident', 'investigation', 'accident', 'near miss'],
  8: ['program', 'admin', 'documentation', 'records'],
};

/**
 * Detects COR elements from text
 */
export function detectCORElements(text: string): number[] {
  const lowerText = text.toLowerCase();
  const elements: number[] = [];
  
  for (const [element, keywords] of Object.entries(COR_ELEMENT_KEYWORDS)) {
    const matches = keywords.filter(kw => lowerText.includes(kw));
    if (matches.length >= 2) {
      elements.push(parseInt(element));
    }
  }
  
  return elements;
}
