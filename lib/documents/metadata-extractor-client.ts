/**
 * Client-Safe Metadata Extractor
 * 
 * Extracts metadata from files using filename analysis only (no PDF text parsing).
 * For full extraction including PDF text, use the server-side API endpoint.
 */

import { 
  findControlNumbers, 
  detectDocumentType, 
  detectCORElements,
  extractKeywords 
} from './text-utils';

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
  confidence: number;
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

// Document type to folder mapping
const DOCUMENT_TYPE_PATTERNS: Record<string, { folderCode: string; critical: boolean; requiresAck: boolean }> = {
  policy: { folderCode: 'POL', critical: true, requiresAck: true },
  procedure: { folderCode: 'SOP', critical: true, requiresAck: true },
  form: { folderCode: 'FRM', critical: false, requiresAck: false },
  manual: { folderCode: 'MAN', critical: true, requiresAck: true },
  permit: { folderCode: 'PER', critical: false, requiresAck: false },
  training: { folderCode: 'TRN', critical: false, requiresAck: true },
  inspection: { folderCode: 'INS', critical: false, requiresAck: false },
  incident: { folderCode: 'INC', critical: false, requiresAck: false },
  sds: { folderCode: 'SDS', critical: true, requiresAck: true },
  jsa: { folderCode: 'JSA', critical: false, requiresAck: false },
  other: { folderCode: 'OTH', critical: false, requiresAck: false },
};

const FOLDER_NAMES: Record<string, string> = {
  POL: 'Policies',
  SOP: 'Standard Operating Procedures',
  FRM: 'Forms & Checklists',
  MAN: 'Manuals & Guides',
  PER: 'Permits & Licenses',
  TRN: 'Training Materials',
  INS: 'Inspections',
  INC: 'Incident Reports',
  SDS: 'Safety Data Sheets',
  JSA: 'Job Safety Analyses',
  OTH: 'Other Documents',
};

// Quick upload presets
export type QuickUploadPresetKey = 
  | 'policy'
  | 'sop'
  | 'form'
  | 'sds'
  | 'training'
  | 'permit'
  | 'incident'
  | 'jsa'
  | 'other';

export interface QuickUploadPreset {
  key: QuickUploadPresetKey;
  label: string;
  icon: string;
  document_type: string;
  folder_code: string;
  is_critical: boolean;
  requires_acknowledgment: boolean;
  applicable_to: string[];
  description: string;
}

export const QUICK_UPLOAD_PRESETS: QuickUploadPreset[] = [
  {
    key: 'policy',
    label: 'Policy Document',
    icon: '📜',
    document_type: 'policy',
    folder_code: 'POL',
    is_critical: true,
    requires_acknowledgment: true,
    applicable_to: ['all_workers'],
    description: 'Company policies that all workers must acknowledge'
  },
  {
    key: 'sop',
    label: 'Standard Procedure',
    icon: '📋',
    document_type: 'procedure',
    folder_code: 'SOP',
    is_critical: true,
    requires_acknowledgment: true,
    applicable_to: ['operations'],
    description: 'Standard operating procedures'
  },
  {
    key: 'form',
    label: 'Form / Checklist',
    icon: '📝',
    document_type: 'form',
    folder_code: 'FRM',
    is_critical: false,
    requires_acknowledgment: false,
    applicable_to: [],
    description: 'Forms, checklists, and templates'
  },
  {
    key: 'sds',
    label: 'Safety Data Sheet',
    icon: '⚠️',
    document_type: 'sds',
    folder_code: 'SDS',
    is_critical: true,
    requires_acknowledgment: true,
    applicable_to: ['operations', 'maintenance'],
    description: 'Chemical safety data sheets'
  },
  {
    key: 'training',
    label: 'Training Material',
    icon: '🎓',
    document_type: 'training',
    folder_code: 'TRN',
    is_critical: false,
    requires_acknowledgment: true,
    applicable_to: ['new_hires'],
    description: 'Training guides and materials'
  },
  {
    key: 'permit',
    label: 'Permit / License',
    icon: '🪪',
    document_type: 'permit',
    folder_code: 'PER',
    is_critical: false,
    requires_acknowledgment: false,
    applicable_to: [],
    description: 'Operating permits and licenses'
  },
  {
    key: 'incident',
    label: 'Incident Report',
    icon: '🚨',
    document_type: 'incident',
    folder_code: 'INC',
    is_critical: false,
    requires_acknowledgment: false,
    applicable_to: [],
    description: 'Incident and accident reports'
  },
  {
    key: 'jsa',
    label: 'Job Safety Analysis',
    icon: '🔍',
    document_type: 'jsa',
    folder_code: 'JSA',
    is_critical: false,
    requires_acknowledgment: false,
    applicable_to: ['operations'],
    description: 'Job hazard analyses'
  },
  {
    key: 'other',
    label: 'Other Document',
    icon: '📄',
    document_type: 'other',
    folder_code: 'OTH',
    is_critical: false,
    requires_acknowledgment: false,
    applicable_to: [],
    description: 'General documents'
  },
];

/**
 * Extract title from filename
 */
function extractTitleFromFilename(filename: string): string {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // Replace underscores and dashes with spaces
  const cleaned = nameWithoutExt
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Capitalize first letter of each word
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Extract metadata from a file (client-side, filename-based analysis only)
 * 
 * Note: For full PDF text extraction, call the /api/documents/extract-metadata endpoint
 */
export async function extractMetadataFromFile(
  file: File,
  companyInitials: string = 'NCCI'
): Promise<MetadataExtractionResult> {
  const warnings: string[] = [];

  // Client-side: We can only analyze filename (no PDF parsing)
  if (file.type === 'application/pdf') {
    warnings.push('PDF text extraction requires server processing. Using filename-based analysis.');
  }

  // Detect document type from filename
  const { type: documentType, confidence: typeConfidence } = detectDocumentType('', file.name);

  // Try to find control number in filename
  const filenameControlNumbers = findControlNumbers(file.name, companyInitials);
  const controlNumber = filenameControlNumbers[0];

  // Extract title from filename
  const title = extractTitleFromFilename(file.name);

  // Get folder info
  // Safe: documentType is from detectDocumentType which returns controlled document type values
  // eslint-disable-next-line security/detect-object-injection
  const typeConfig = DOCUMENT_TYPE_PATTERNS[documentType] || DOCUMENT_TYPE_PATTERNS.other;
  const folderCode = typeConfig.folderCode;
  // Safe: folderCode is from typeConfig which uses controlled folder codes
  // eslint-disable-next-line security/detect-object-injection
  const folderName = FOLDER_NAMES[folderCode];

  // Calculate confidence (lower without PDF text)
  const confidence = typeConfidence === 'high' ? 60 : typeConfidence === 'medium' ? 40 : 25;

  return {
    file_name: file.name,
    file_size: file.size,
    file_type: file.type || 'application/octet-stream',
    metadata: {
      control_number: controlNumber,
      control_number_detected: !!controlNumber,
      title,
      document_type: documentType,
      document_type_confidence: typeConfidence,
      keywords: [],
      cor_elements: [],
      suggested_folder_code: folderCode,
      suggested_folder_name: folderName,
      is_critical: typeConfig.critical,
      requires_acknowledgment: typeConfig.requiresAck,
      applicable_to: [],
      confidence,
      warnings,
    },
    page_count: undefined,
    text_preview: undefined,
  };
}
