/**
 * Document Metadata Suggester
 * 
 * Automatically suggests metadata for uploaded documents based on:
 * - Filename patterns
 * - Extracted text content
 * - Control number detection
 * - Common industry terms
 */

import type { 
  DocumentTypeCode, 
  SuggestedMetadata,
  MetadataSuggestionRules 
} from './types';

// ============================================================================
// SUGGESTION RULES
// ============================================================================

const DEFAULT_RULES: MetadataSuggestionRules = {
  filenamePatterns: [
    // Policies
    { pattern: /policy/i, document_type: 'POL', tags: ['policy'], cor_elements: [1, 2] },
    { pattern: /h&s\s*policy|health.*safety.*policy/i, document_type: 'POL', tags: ['health-safety', 'policy'], cor_elements: [1] },
    { pattern: /drug.*alcohol|substance/i, document_type: 'POL', tags: ['drug-alcohol', 'policy'], cor_elements: [1] },
    { pattern: /disciplinary|discipline/i, document_type: 'POL', tags: ['disciplinary', 'policy'], cor_elements: [1] },
    
    // Safe Work Procedures
    { pattern: /swp|safe\s*work/i, document_type: 'SWP', tags: ['swp', 'procedure'], cor_elements: [3, 4] },
    { pattern: /sjp|safe\s*job/i, document_type: 'SJP', tags: ['sjp', 'procedure'], cor_elements: [3, 4] },
    { pattern: /sop|standard\s*operating/i, document_type: 'PRC', tags: ['sop', 'procedure'], cor_elements: [3] },
    { pattern: /work\s*instruction/i, document_type: 'WI', tags: ['work-instruction'], cor_elements: [3, 4] },
    
    // Forms and Checklists
    { pattern: /form(?!at)/i, document_type: 'FRM', tags: ['form'] },
    { pattern: /checklist|check\s*list/i, document_type: 'CHK', tags: ['checklist'] },
    { pattern: /inspection/i, document_type: 'CHK', tags: ['inspection', 'checklist'], cor_elements: [5] },
    { pattern: /incident|accident/i, document_type: 'FRM', tags: ['incident', 'form'], cor_elements: [11, 12] },
    { pattern: /jha|job\s*hazard/i, document_type: 'FRM', tags: ['jha', 'hazard'], cor_elements: [4] },
    { pattern: /toolbox|tailgate/i, document_type: 'FRM', tags: ['toolbox', 'meeting'], cor_elements: [7] },
    
    // Training
    { pattern: /training|orientation/i, document_type: 'TRN', tags: ['training'], cor_elements: [6, 7] },
    { pattern: /competency|competencies/i, document_type: 'TRN', tags: ['competency', 'training'], cor_elements: [6] },
    
    // Plans
    { pattern: /emergency|eap|erp/i, document_type: 'PLN', tags: ['emergency', 'plan'], cor_elements: [9] },
    { pattern: /evacuation/i, document_type: 'PLN', tags: ['evacuation', 'emergency'], cor_elements: [9] },
    { pattern: /rescue/i, document_type: 'PLN', tags: ['rescue', 'emergency'], cor_elements: [9] },
    
    // Manuals
    { pattern: /manual|handbook/i, document_type: 'MAN', tags: ['manual'], cor_elements: [1] },
    { pattern: /h&s\s*manual|ohs\s*manual|health.*safety.*manual/i, document_type: 'MAN', tags: ['health-safety', 'manual'], cor_elements: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] },
    
    // Other
    { pattern: /audit|assessment/i, document_type: 'AUD', tags: ['audit'], cor_elements: [13, 14] },
    { pattern: /certificate|certification/i, document_type: 'CRT', tags: ['certificate'] },
    { pattern: /report/i, document_type: 'RPT', tags: ['report'] },
    { pattern: /minutes|meeting/i, document_type: 'MIN', tags: ['meeting', 'minutes'], cor_elements: [8] },
    { pattern: /drawing|diagram|schematic/i, document_type: 'DWG', tags: ['drawing'] },
    { pattern: /register|log/i, document_type: 'REG', tags: ['register'] },
  ],
  contentPatterns: [
    // Safety Critical Content
    { keywords: ['lockout', 'tagout', 'loto'], document_type: 'SWP', tags: ['lockout-tagout', 'electrical'], cor_elements: [3, 4] },
    { keywords: ['confined space', 'permit required'], document_type: 'SWP', tags: ['confined-space'], cor_elements: [3, 4] },
    { keywords: ['fall protection', 'fall arrest', 'guardrail'], document_type: 'SWP', tags: ['fall-protection', 'working-at-heights'], cor_elements: [3, 4] },
    { keywords: ['excavation', 'trenching', 'shoring'], document_type: 'SWP', tags: ['excavation'], cor_elements: [3, 4] },
    { keywords: ['ppe', 'personal protective equipment'], document_type: 'SWP', tags: ['ppe'], cor_elements: [3, 10] },
    { keywords: ['hazard assessment', 'risk assessment'], document_type: 'FRM', tags: ['hazard-assessment'], cor_elements: [4] },
    
    // Training Content
    { keywords: ['whmis', 'sds', 'msds', 'material safety'], document_type: 'TRN', tags: ['whmis', 'chemical'], cor_elements: [6, 10] },
    { keywords: ['first aid', 'cpr', 'aed'], document_type: 'TRN', tags: ['first-aid', 'training'], cor_elements: [6, 9] },
    
    // Emergency Content
    { keywords: ['fire extinguisher', 'fire drill', 'fire warden'], document_type: 'PLN', tags: ['fire', 'emergency'], cor_elements: [9] },
    { keywords: ['muster point', 'assembly area'], document_type: 'PLN', tags: ['emergency', 'evacuation'], cor_elements: [9] },
    
    // Management Content
    { keywords: ['management commitment', 'senior management'], document_type: 'POL', tags: ['management', 'commitment'], cor_elements: [1] },
    { keywords: ['roles and responsibilities', 'accountabilities'], document_type: 'POL', tags: ['responsibilities'], cor_elements: [2] },
    { keywords: ['joint health and safety', 'jhsc', 'health and safety committee'], document_type: 'MIN', tags: ['jhsc', 'committee'], cor_elements: [8] },
  ],
};

// ============================================================================
// COR ELEMENT KEYWORD MAPPING
// ============================================================================

const COR_ELEMENT_KEYWORDS: Record<number, string[]> = {
  1: ['policy', 'statement', 'commitment', 'leadership', 'management system'],
  2: ['responsibilities', 'accountability', 'roles', 'supervisor', 'worker'],
  3: ['hazard', 'risk', 'assessment', 'control', 'elimination', 'substitution'],
  4: ['safe work', 'procedure', 'practice', 'work instruction', 'critical task'],
  5: ['inspection', 'audit', 'workplace', 'equipment', 'deficiency'],
  6: ['training', 'competency', 'orientation', 'certification', 'qualification'],
  7: ['communication', 'meeting', 'toolbox', 'tailgate', 'information'],
  8: ['worker participation', 'committee', 'jhsc', 'consultation', 'involvement'],
  9: ['emergency', 'response', 'plan', 'drill', 'evacuation', 'rescue'],
  10: ['ppe', 'equipment', 'maintenance', 'supplies', 'protective'],
  11: ['incident', 'accident', 'investigation', 'root cause', 'near miss'],
  12: ['statistics', 'metrics', 'kpi', 'trend', 'analysis', 'data'],
  13: ['review', 'evaluation', 'audit', 'continuous improvement', 'corrective'],
  14: ['documentation', 'record', 'retention', 'control', 'management'],
};

// ============================================================================
// APPLICABLE TO KEYWORDS
// ============================================================================

const APPLICABLE_TO_KEYWORDS: Record<string, string[]> = {
  all_workers: ['all workers', 'all employees', 'all personnel', 'everyone'],
  supervisors: ['supervisor', 'foreman', 'lead hand', 'team lead', 'manager'],
  management: ['management', 'executive', 'senior', 'director', 'officer'],
  contractors: ['contractor', 'subcontractor', 'third party', 'vendor'],
  visitors: ['visitor', 'guest', 'tour'],
  office_workers: ['office', 'administrative', 'clerical'],
  field_workers: ['field', 'site', 'outdoor', 'construction'],
  drivers: ['driver', 'operator', 'vehicle', 'transportation'],
  heavy_equipment: ['heavy equipment', 'crane', 'loader', 'excavator', 'forklift'],
};

// ============================================================================
// MAIN SUGGESTION FUNCTION
// ============================================================================

/**
 * Suggests metadata for a document based on filename and content
 */
export function suggestMetadata(
  filename: string,
  extractedText?: string,
  existingControlNumbers?: string[]
): SuggestedMetadata {
  const result: SuggestedMetadata = {
    title: generateTitle(filename),
    document_type_code: 'FRM', // Default
    tags: [],
    cor_elements: [],
    applicable_to: ['all_workers'],
    confidence: 0,
  };
  
  let confidenceScore = 0;
  const matchedTags = new Set<string>();
  const matchedCorElements = new Set<number>();
  const matchedApplicableTo = new Set<string>(['all_workers']);
  
  // Check filename patterns
  const filenameMatch = matchFilenamePatterns(filename);
  if (filenameMatch) {
    result.document_type_code = filenameMatch.document_type;
    filenameMatch.tags?.forEach(t => matchedTags.add(t));
    filenameMatch.cor_elements?.forEach(e => matchedCorElements.add(e));
    confidenceScore += 40;
  }
  
  // Check content patterns if we have extracted text
  if (extractedText && extractedText.length > 0) {
    const contentMatches = matchContentPatterns(extractedText);
    
    if (contentMatches.document_type && !filenameMatch) {
      result.document_type_code = contentMatches.document_type;
      confidenceScore += 30;
    }
    
    contentMatches.tags.forEach(t => matchedTags.add(t));
    contentMatches.cor_elements.forEach(e => matchedCorElements.add(e));
    
    // Extract COR elements from content
    const contentCorElements = detectCORElements(extractedText);
    contentCorElements.forEach(e => matchedCorElements.add(e));
    if (contentCorElements.length > 0) confidenceScore += 15;
    
    // Detect applicable to
    const applicableTo = detectApplicableTo(extractedText);
    applicableTo.forEach(a => matchedApplicableTo.add(a));
    if (applicableTo.length > 1) confidenceScore += 10;
    
    // Detect control number in document
    const controlNumber = detectControlNumber(extractedText, existingControlNumbers);
    if (controlNumber) {
      result.extractedControlNumber = controlNumber;
      confidenceScore += 20;
    }
  }
  
  // Add extracted keywords as tags
  const keywordTags = extractKeywordTags(filename, extractedText);
  keywordTags.forEach(t => matchedTags.add(t));
  
  // Compile results
  result.tags = Array.from(matchedTags).slice(0, 10);
  result.cor_elements = Array.from(matchedCorElements).sort((a, b) => a - b);
  result.applicable_to = Array.from(matchedApplicableTo);
  result.confidence = Math.min(100, confidenceScore);
  
  return result;
}

/**
 * Matches filename against patterns
 */
function matchFilenamePatterns(filename: string): {
  document_type: DocumentTypeCode;
  tags?: string[];
  cor_elements?: number[];
} | null {
  const cleanName = filename.replace(/\.[^/.]+$/, ''); // Remove extension
  
  for (const rule of DEFAULT_RULES.filenamePatterns) {
    if (rule.pattern.test(cleanName)) {
      return {
        document_type: rule.document_type,
        tags: rule.tags,
        cor_elements: rule.cor_elements,
      };
    }
  }
  
  return null;
}

/**
 * Matches content against patterns
 */
function matchContentPatterns(text: string): {
  document_type?: DocumentTypeCode;
  tags: string[];
  cor_elements: number[];
} {
  const lowerText = text.toLowerCase();
  const tags: string[] = [];
  const corElements: number[] = [];
  let documentType: DocumentTypeCode | undefined;
  
  for (const rule of DEFAULT_RULES.contentPatterns) {
    const allKeywordsMatch = rule.keywords.every(kw => 
      lowerText.includes(kw.toLowerCase())
    );
    
    if (allKeywordsMatch) {
      if (!documentType) documentType = rule.document_type;
      if (rule.tags) tags.push(...rule.tags);
      if (rule.cor_elements) corElements.push(...rule.cor_elements);
    }
  }
  
  return { document_type: documentType, tags, cor_elements: corElements };
}

/**
 * Detects COR elements from text content
 */
function detectCORElements(text: string): number[] {
  const lowerText = text.toLowerCase();
  const elements: number[] = [];
  
  for (const [element, keywords] of Object.entries(COR_ELEMENT_KEYWORDS)) {
    const elementNum = parseInt(element);
    const matchCount = keywords.filter(kw => lowerText.includes(kw)).length;
    
    // If at least 2 keywords match, consider it a match
    if (matchCount >= 2) {
      elements.push(elementNum);
    }
  }
  
  return elements;
}

/**
 * Detects applicable audience from text
 */
function detectApplicableTo(text: string): string[] {
  const lowerText = text.toLowerCase();
  const applicable: string[] = [];
  
  for (const [group, keywords] of Object.entries(APPLICABLE_TO_KEYWORDS)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      applicable.push(group);
    }
  }
  
  return applicable;
}

/**
 * Extracts keyword tags from filename and content
 */
function extractKeywordTags(filename: string, text?: string): string[] {
  const tags: string[] = [];
  const combined = (filename + ' ' + (text || '')).toLowerCase();
  
  // Common safety tags
  const safetyKeywords = [
    'electrical', 'chemical', 'mechanical', 'biological',
    'ergonomic', 'noise', 'vibration', 'radiation',
    'concrete', 'steel', 'welding', 'grinding',
    'lifting', 'rigging', 'scaffolding', 'ladder',
    'hot work', 'cold work', 'night work',
    'mobile equipment', 'vehicle', 'truck', 'crane',
  ];
  
  for (const keyword of safetyKeywords) {
    if (combined.includes(keyword)) {
      tags.push(keyword.replace(/\s+/g, '-'));
    }
  }
  
  return tags;
}

/**
 * Detects control number referenced in document
 */
function detectControlNumber(
  text: string,
  existingControlNumbers?: string[]
): string | undefined {
  // Pattern: XXX-YYY-NNN or XXXX-YYY-NNNN
  const pattern = /\b([A-Z]{2,6})-([A-Z]{2,3})-(\d{3,4})\b/gi;
  const matches = text.match(pattern);
  
  if (!matches || matches.length === 0) return undefined;
  
  // If we have existing control numbers, find a match
  if (existingControlNumbers?.length) {
    for (const match of matches) {
      if (existingControlNumbers.includes(match.toUpperCase())) {
        return match.toUpperCase();
      }
    }
  }
  
  // Return the first control number found
  return matches[0].toUpperCase();
}

/**
 * Generates a clean title from filename
 */
function generateTitle(filename: string): string {
  // Remove extension
  let title = filename.replace(/\.[^/.]+$/, '');
  
  // Replace common separators with spaces
  title = title.replace(/[-_]+/g, ' ');
  
  // Remove control number patterns
  title = title.replace(/[A-Z]{2,6}-[A-Z]{2,3}-\d{3,4}/gi, '').trim();
  
  // Remove date patterns
  title = title.replace(/\d{4}[-_]\d{2}[-_]\d{2}/g, '').trim();
  title = title.replace(/\d{2}[-_]\d{2}[-_]\d{4}/g, '').trim();
  
  // Remove version patterns
  title = title.replace(/v?\d+\.?\d*/gi, '').trim();
  title = title.replace(/\s*(rev|revision)\s*\d*/gi, '').trim();
  
  // Title case
  title = title.replace(/\w\S*/g, txt => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
  
  // Clean up multiple spaces
  title = title.replace(/\s+/g, ' ').trim();
  
  return title || 'Untitled Document';
}

/**
 * Batch suggest metadata for multiple files
 */
export async function batchSuggestMetadata(
  files: { filename: string; content?: string }[],
  existingControlNumbers?: string[]
): Promise<Map<string, SuggestedMetadata>> {
  const results = new Map<string, SuggestedMetadata>();
  
  for (const file of files) {
    const suggestion = suggestMetadata(
      file.filename,
      file.content,
      existingControlNumbers
    );
    results.set(file.filename, suggestion);
  }
  
  return results;
}
