/**
 * Metadata Extractor for Document Uploads
 * 
 * Extracts and suggests metadata from uploaded files including:
 * - Control numbers
 * - Document type detection
 * - Keywords extraction
 * - COR elements detection
 * - Folder suggestions
 */

import { extractTextFromPDF, findControlNumbers, extractKeywords } from './pdf-extractor';

export interface SuggestedMetadata {
  control_number?: string;
  control_number_detected: boolean;
  title: string;
  document_type: string;
  document_type_confidence: 'high' | 'medium' | 'low';
  keywords: string[];
  cor_elements: number[];
  suggested_folder_code: string;
  suggested_folder_name: string;
  is_critical: boolean;
  requires_acknowledgment: boolean;
  applicable_to: string[];
  confidence: number; // 0-100
  warnings: string[];
}

export interface MetadataExtractionResult {
  file_name: string;
  file_size: number;
  file_type: string;
  metadata: SuggestedMetadata;
  text_preview?: string;
  page_count?: number;
}

// Stop words for keyword extraction
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'up', 'about', 'into', 'over', 'after', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'this', 'that',
  'these', 'those', 'it', 'its', 'they', 'their', 'we', 'our', 'you', 'your', 'he', 'she',
  'him', 'her', 'his', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'not', 'only', 'same', 'so', 'than', 'too', 'very', 'just', 'also'
]);

// Safety-related keywords that boost importance
const SAFETY_KEYWORDS = new Set([
  'safety', 'hazard', 'danger', 'risk', 'emergency', 'ppe', 'protection', 'training',
  'inspection', 'incident', 'accident', 'injury', 'fatality', 'compliance', 'regulation',
  'ohs', 'whs', 'oh&s', 'workers', 'employee', 'worksite', 'jobsite', 'equipment'
]);

// Document type patterns
const DOCUMENT_TYPE_PATTERNS: Record<string, { patterns: RegExp[]; folderCode: string; critical: boolean }> = {
  POL: {
    patterns: [
      /policy/i,
      /this\s+policy\s+(shall|will|must)/i,
      /company\s+policy/i,
      /corporate\s+policy/i,
    ],
    folderCode: 'POL',
    critical: true,
  },
  PRC: {
    patterns: [
      /procedure(?!.*safe\s*work)/i,
      /business\s+procedure/i,
      /operational\s+procedure/i,
      /administrative\s+procedure/i,
    ],
    folderCode: 'PRC',
    critical: false,
  },
  SWP: {
    patterns: [
      /safe\s*work\s*procedure/i,
      /swp/i,
      /safe\s*job\s*procedure/i,
      /sjp/i,
      /work\s*instruction/i,
      /step\s*by\s*step.*safety/i,
      /task\s*hazard/i,
    ],
    folderCode: 'SWP',
    critical: false,
  },
  MAN: {
    patterns: [
      /manual/i,
      /health\s*(and|&)\s*safety\s*manual/i,
      /safety\s*management\s*system/i,
      /h&s\s*manual/i,
    ],
    folderCode: 'MAN',
    critical: true,
  },
  FRM: {
    patterns: [
      /form/i,
      /template/i,
      /checklist/i,
      /inspection\s*form/i,
      /sign[\s-]*off/i,
    ],
    folderCode: 'FRM',
    critical: false,
  },
  TRN: {
    patterns: [
      /training/i,
      /orientation/i,
      /competency/i,
      /learning\s*module/i,
      /course\s*material/i,
    ],
    folderCode: 'TRN',
    critical: false,
  },
  EMR: {
    patterns: [
      /emergency/i,
      /evacuation/i,
      /fire\s*plan/i,
      /crisis\s*management/i,
      /first\s*aid/i,
    ],
    folderCode: 'EMR',
    critical: true,
  },
  MIN: {
    patterns: [
      /meeting\s*minutes/i,
      /committee\s*meeting/i,
      /safety\s*committee/i,
    ],
    folderCode: 'MIN',
    critical: false,
  },
  RPT: {
    patterns: [
      /report/i,
      /inspection\s*report/i,
      /audit\s*report/i,
      /statistics/i,
    ],
    folderCode: 'RPT',
    critical: false,
  },
  CRT: {
    patterns: [
      /certificate/i,
      /certification/i,
      /license/i,
      /accreditation/i,
    ],
    folderCode: 'CRT',
    critical: false,
  },
};

// COR element keywords
const COR_ELEMENT_KEYWORDS: Record<number, string[]> = {
  1: ['management system', 'leadership', 'commitment', 'policy statement', 'organization', 'responsibilities'],
  2: ['hazard identification', 'hazard assessment', 'risk assessment', 'jha', 'task analysis'],
  3: ['hazard control', 'controls', 'hierarchy of controls', 'elimination', 'substitution', 'engineering controls'],
  4: ['competency', 'training', 'orientation', 'qualification', 'certification', 'competent worker'],
  5: ['workplace behavior', 'rules', 'discipline', 'disciplinary', 'behavior', 'conduct'],
  6: ['ppe', 'personal protective equipment', 'safety equipment', 'protective gear', 'respirator', 'hard hat'],
  7: ['maintenance', 'preventive maintenance', 'equipment maintenance', 'service', 'repair'],
  8: ['communication', 'safety meetings', 'toolbox talks', 'bulletins', 'signage', 'consultation'],
  9: ['inspection', 'workplace inspection', 'equipment inspection', 'audit', 'monitoring'],
  10: ['incident', 'accident', 'investigation', 'near miss', 'reporting', 'injury'],
  11: ['emergency', 'emergency response', 'evacuation', 'fire', 'first aid', 'rescue'],
  12: ['statistics', 'records', 'documentation', 'metrics', 'kpi', 'tracking'],
  13: ['regulatory', 'compliance', 'legislation', 'legal', 'standards', 'code'],
  14: ['management review', 'review', 'continuous improvement', 'evaluation', 'performance'],
};

// Folder name mapping
const FOLDER_NAMES: Record<string, string> = {
  POL: 'Policies',
  PRC: 'Procedures',
  SWP: 'Safe Work Procedures',
  MAN: 'Health & Safety Manual',
  FRM: 'Forms & Templates',
  TRN: 'Training Materials',
  EMR: 'Emergency Procedures',
  MIN: 'Meeting Minutes',
  RPT: 'Reports',
  CRT: 'Certifications',
  OTH: 'Other Documents',
};

/**
 * Extract metadata from a file (browser-side preview)
 */
export async function extractMetadataFromFile(
  file: File,
  companyInitials: string = 'NCCI'
): Promise<MetadataExtractionResult> {
  const warnings: string[] = [];
  let extractedText = '';
  let pageCount = 0;

  // Attempt to extract text from PDF
  if (file.type === 'application/pdf') {
    try {
      const buffer = await file.arrayBuffer();
      const extraction = await extractTextFromPDF(Buffer.from(buffer));
      extractedText = extraction.text;
      pageCount = extraction.pages;
    } catch (error) {
      warnings.push('Could not extract text from PDF. Manual metadata entry required.');
    }
  } else {
    warnings.push('Text extraction only supported for PDF files.');
  }

  // Detect document type
  const { type: documentType, confidence: typeConfidence } = detectDocumentType(extractedText, file.name);

  // Find control numbers
  const controlNumbers = extractedText 
    ? findControlNumbers(extractedText, companyInitials)
    : [];
  const controlNumber = controlNumbers[0];

  // Extract title
  const title = extractTitleFromDocument(extractedText, file.name);

  // Extract keywords
  const keywords = extractedText ? extractKeywordsFromText(extractedText) : [];

  // Detect COR elements
  const corElements = detectCORElements(extractedText, file.name);

  // Determine folder
  // Safe: documentType is from detectDocumentType which returns controlled document type values
  // eslint-disable-next-line security/detect-object-injection
  const folderCode = DOCUMENT_TYPE_PATTERNS[documentType]?.folderCode || 'OTH';
  // Safe: folderCode is from DOCUMENT_TYPE_PATTERNS which uses controlled folder codes
  // eslint-disable-next-line security/detect-object-injection
  const folderName = FOLDER_NAMES[folderCode] || 'Other Documents';

  // Determine if critical
  // Safe: documentType is from detectDocumentType which returns controlled document type values
  // eslint-disable-next-line security/detect-object-injection
  const isCritical = DOCUMENT_TYPE_PATTERNS[documentType]?.critical || false;

  // Determine applicable audience
  const applicableTo = determineApplicableTo(documentType, extractedText);

  // Calculate overall confidence
  const confidence = calculateOverallConfidence(
    !!controlNumber,
    typeConfidence,
    keywords.length,
    corElements.length
  );

  return {
    file_name: file.name,
    file_size: file.size,
    file_type: file.type,
    metadata: {
      control_number: controlNumber,
      control_number_detected: !!controlNumber,
      title,
      document_type: documentType,
      document_type_confidence: typeConfidence,
      keywords: keywords.slice(0, 15),
      cor_elements: corElements,
      suggested_folder_code: folderCode,
      suggested_folder_name: folderName,
      is_critical: isCritical,
      requires_acknowledgment: isCritical,
      applicable_to: applicableTo,
      confidence,
      warnings,
    },
    text_preview: extractedText.substring(0, 500),
    page_count: pageCount,
  };
}

/**
 * Detect document type from content and filename
 */
function detectDocumentType(
  text: string,
  filename: string
): { type: string; confidence: 'high' | 'medium' | 'low' } {
  const filenameLower = filename.toLowerCase();
  const textLower = text.toLowerCase();
  const combined = `${filenameLower} ${textLower}`;

  // Check each document type
  for (const [type, config] of Object.entries(DOCUMENT_TYPE_PATTERNS)) {
    let matchCount = 0;
    
    for (const pattern of config.patterns) {
      // Higher weight for filename matches
      if (pattern.test(filenameLower)) {
        matchCount += 2;
      }
      // Check text content
      if (pattern.test(textLower)) {
        matchCount += 1;
      }
    }

    if (matchCount >= 3) {
      return { type, confidence: 'high' };
    }
    if (matchCount >= 2) {
      return { type, confidence: 'medium' };
    }
  }

  // Default fallback
  if (combined.includes('procedure')) return { type: 'PRC', confidence: 'low' };
  if (combined.includes('form')) return { type: 'FRM', confidence: 'low' };
  
  return { type: 'OTH', confidence: 'low' };
}

/**
 * Extract a suitable title from document content or filename
 */
function extractTitleFromDocument(text: string, filename: string): string {
  // Clean filename (remove extension and special chars)
  let title = filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[-_]/g, ' ')     // Replace dashes/underscores with spaces
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim();

  // Try to extract title from document content
  if (text) {
    // Look for common title patterns at the start of the document
    const lines = text.split('\n').slice(0, 20);
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and very short lines
      if (trimmed.length < 5 || trimmed.length > 100) continue;
      
      // Skip lines that look like metadata
      if (/^(date|version|document|control|page|revision)/i.test(trimmed)) continue;
      
      // If it looks like a title (proper capitalization or all caps)
      if (/^[A-Z][A-Za-z\s\-&:]+$/.test(trimmed) || /^[A-Z\s\-&:]+$/.test(trimmed)) {
        // Prefer document title over filename
        const potentialTitle = trimmed.replace(/\s+/g, ' ');
        if (potentialTitle.length > 10 && potentialTitle.length < 80) {
          return toTitleCase(potentialTitle);
        }
      }
    }
  }

  return toTitleCase(title);
}

/**
 * Convert string to title case
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extract keywords from text content
 */
function extractKeywordsFromText(text: string): string[] {
  // Tokenize and clean
  const words = text.toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !STOP_WORDS.has(word));

  // Count frequency
  const wordFreq: Map<string, number> = new Map();
  for (const word of words) {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  }

  // Boost safety-related keywords
  for (const keyword of SAFETY_KEYWORDS) {
    if (wordFreq.has(keyword)) {
      wordFreq.set(keyword, (wordFreq.get(keyword) || 0) * 2);
    }
  }

  // Sort by frequency and return top keywords
  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word]) => word);
}

/**
 * Detect COR elements mentioned in content
 */
function detectCORElements(text: string, filename: string): number[] {
  const combined = `${filename.toLowerCase()} ${text.toLowerCase()}`;
  const detectedElements: Set<number> = new Set();

  for (const [elementStr, keywords] of Object.entries(COR_ELEMENT_KEYWORDS)) {
    const element = parseInt(elementStr);
    
    // Check for explicit element mention
    if (combined.includes(`element ${element}`) || combined.includes(`element${element}`)) {
      detectedElements.add(element);
      continue;
    }

    // Check for keyword matches
    let matchCount = 0;
    for (const keyword of keywords) {
      if (combined.includes(keyword)) {
        matchCount++;
      }
    }

    // Add element if multiple keywords match
    if (matchCount >= 2) {
      detectedElements.add(element);
    }
  }

  return Array.from(detectedElements).sort((a, b) => a - b);
}

/**
 * Determine applicable audience based on document type
 */
function determineApplicableTo(documentType: string, text: string): string[] {
  const textLower = text.toLowerCase();
  const audiences: string[] = [];

  // Default audiences based on document type
  switch (documentType) {
    case 'POL':
    case 'MAN':
      audiences.push('all_workers');
      break;
    case 'SWP':
      audiences.push('all_workers');
      // Check for specific trades
      if (textLower.includes('electrician')) audiences.push('electricians');
      if (textLower.includes('welder')) audiences.push('welders');
      if (textLower.includes('operator')) audiences.push('equipment_operators');
      break;
    case 'TRN':
      audiences.push('all_workers');
      break;
    case 'MIN':
    case 'RPT':
      audiences.push('supervisors', 'management');
      break;
    default:
      audiences.push('all_workers');
  }

  // Check for supervisor/management specific content
  if (textLower.includes('supervisor') || textLower.includes('management responsibility')) {
    if (!audiences.includes('supervisors')) audiences.push('supervisors');
  }

  return audiences;
}

/**
 * Calculate overall confidence score
 */
function calculateOverallConfidence(
  hasControlNumber: boolean,
  typeConfidence: 'high' | 'medium' | 'low',
  keywordCount: number,
  corElementCount: number
): number {
  let confidence = 0;

  // Control number detection
  if (hasControlNumber) confidence += 30;

  // Document type confidence
  switch (typeConfidence) {
    case 'high': confidence += 40; break;
    case 'medium': confidence += 25; break;
    case 'low': confidence += 10; break;
  }

  // Keywords extracted
  if (keywordCount >= 10) confidence += 15;
  else if (keywordCount >= 5) confidence += 10;
  else if (keywordCount > 0) confidence += 5;

  // COR elements detected
  if (corElementCount >= 3) confidence += 15;
  else if (corElementCount >= 1) confidence += 10;

  return Math.min(confidence, 100);
}

/**
 * Batch extract metadata from multiple files
 */
export async function batchExtractMetadata(
  files: File[],
  companyInitials: string = 'NCCI',
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<MetadataExtractionResult[]> {
  const results: MetadataExtractionResult[] = [];

  for (let i = 0; i < files.length; i++) {
    // Safe: i is a controlled loop index within bounds of files array
    // eslint-disable-next-line security/detect-object-injection
    const file = files[i];
    
    if (onProgress) {
      onProgress(i + 1, files.length, file.name);
    }

    try {
      const result = await extractMetadataFromFile(file, companyInitials);
      results.push(result);
    } catch (error) {
      results.push({
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        metadata: {
          control_number: undefined,
          control_number_detected: false,
          title: file.name.replace(/\.[^/.]+$/, ''),
          document_type: 'OTH',
          document_type_confidence: 'low',
          keywords: [],
          cor_elements: [],
          suggested_folder_code: 'OTH',
          suggested_folder_name: 'Other Documents',
          is_critical: false,
          requires_acknowledgment: false,
          applicable_to: ['all_workers'],
          confidence: 0,
          warnings: [`Failed to extract metadata: ${error instanceof Error ? error.message : 'Unknown error'}`],
        },
      });
    }
  }

  return results;
}

/**
 * Quick upload presets
 */
export const QUICK_UPLOAD_PRESETS = {
  health_safety_manual: {
    name: 'Health & Safety Manual',
    icon: 'Book',
    color: '#ef4444',
    defaults: {
      folder_code: 'MAN',
      document_type: 'MAN',
      cor_elements: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      is_critical: true,
      requires_acknowledgment: true,
      applicable_to: ['all_workers'],
    },
  },
  policy_documents: {
    name: 'Policy Documents',
    icon: 'FileText',
    color: '#3b82f6',
    defaults: {
      folder_code: 'POL',
      document_type: 'POL',
      cor_elements: [1],
      is_critical: true,
      requires_acknowledgment: true,
      applicable_to: ['all_workers'],
    },
  },
  safe_work_procedures: {
    name: 'Safe Work Procedures',
    icon: 'ShieldCheck',
    color: '#10b981',
    defaults: {
      folder_code: 'SWP',
      document_type: 'SWP',
      cor_elements: [2, 3],
      is_critical: false,
      requires_acknowledgment: false,
      applicable_to: ['all_workers'],
    },
  },
  forms_templates: {
    name: 'Forms & Templates',
    icon: 'ClipboardList',
    color: '#f59e0b',
    defaults: {
      folder_code: 'FRM',
      document_type: 'FRM',
      cor_elements: [],
      is_critical: false,
      requires_acknowledgment: false,
      applicable_to: ['all_workers'],
    },
  },
  training_materials: {
    name: 'Training Materials',
    icon: 'GraduationCap',
    color: '#06b6d4',
    defaults: {
      folder_code: 'TRN',
      document_type: 'TRN',
      cor_elements: [4],
      is_critical: false,
      requires_acknowledgment: true,
      applicable_to: ['all_workers'],
    },
  },
  emergency_procedures: {
    name: 'Emergency Procedures',
    icon: 'AlertTriangle',
    color: '#dc2626',
    defaults: {
      folder_code: 'EMR',
      document_type: 'PLN',
      cor_elements: [11],
      is_critical: true,
      requires_acknowledgment: true,
      applicable_to: ['all_workers'],
    },
  },
} as const;

export type QuickUploadPresetKey = keyof typeof QUICK_UPLOAD_PRESETS;
