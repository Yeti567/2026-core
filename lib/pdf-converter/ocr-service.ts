/**
 * PDF OCR Service
 * 
 * Handles PDF text extraction and OCR processing.
 * Uses pdf-parse for text extraction from PDFs.
 */

import type { 
  AIAnalysisResult, 
  DetectedField, 
  DetectedFieldType,
  DetectedSection,
  FieldOption,
  ValidationRules 
} from './types';

async function parsePdf(buffer: Buffer, options?: Record<string, unknown>): Promise<any> {
  const mod: any = await import('pdf-parse');
  const fn = mod?.default ?? mod;
  return fn(buffer, options);
}

// =============================================================================
// TEXT EXTRACTION
// =============================================================================

/**
 * Extract text from PDF buffer
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<{
  text: string;
  pageCount: number;
  info: Record<string, unknown>;
}> {
  try {
    const data = await parsePdf(pdfBuffer);
    
    return {
      text: data.text,
      pageCount: data.numpages,
      info: data.info || {},
    };
  } catch (error) {
    console.error('PDF text extraction failed:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =============================================================================
// FIELD DETECTION PATTERNS
// =============================================================================

const FIELD_PATTERNS = {
  // Date patterns
  date: [
    /\b(date|dated?)\s*[:.]?\s*[_\-\/\s]*$/i,
    /\b(mm\/dd\/yyyy|dd\/mm\/yyyy|yyyy-mm-dd)/i,
    /\bdate\s+of\s+\w+/i,
  ],
  
  // Time patterns
  time: [
    /\b(time|hour|am\/pm)\s*[:.]?\s*[_\-\s]*$/i,
    /\b(start|end|arrival|departure)\s+time/i,
  ],
  
  // Signature patterns
  signature: [
    /\b(signature|signed|sign\s+here)\s*[:.]?\s*[_\-\s]*$/i,
    /\b(employee|worker|supervisor|manager)\s+signature/i,
    /\bauthoriz(ed|ation)\s+signature/i,
  ],
  
  // Yes/No patterns
  yes_no: [
    /\[\s*\]\s*yes\s+\[\s*\]\s*no/i,
    /\byes\s*\/\s*no/i,
    /\(\s*\)\s*yes\s+\(\s*\)\s*no/i,
  ],
  
  // Yes/No/NA patterns
  yes_no_na: [
    /\[\s*\]\s*yes\s+\[\s*\]\s*no\s+\[\s*\]\s*(n\/a|na)/i,
    /\byes\s*\/\s*no\s*\/\s*(n\/a|na)/i,
  ],
  
  // Checkbox patterns
  checkbox: [
    /\[\s*\]|\(\s*\)|☐|□/,
    /\bcheck\s+(all|if|one)/i,
  ],
  
  // Number patterns
  number: [
    /\b(number|count|qty|quantity|amount|total)\s*[:.]?\s*[_\-\s]*$/i,
    /\b(#|no\.?)\s*[:.]?\s*[_\-\s]*$/i,
    /\b(temperature|temp|weight|height|distance|measurement)/i,
  ],
  
  // Phone patterns
  phone: [
    /\b(phone|tel|telephone|mobile|cell)\s*(number|#|no\.?)\s*[:.]?\s*[_\-\s]*$/i,
    /\b(phone|tel|telephone|mobile|cell)\s*[:.]?\s*[_\-\s]*$/i,
    /\(\d{3}\)\s*\d{3}-\d{4}/,
  ],
  
  // Email patterns
  email: [
    /\b(email|e-mail)\s*(address)?\s*[:.]?\s*[_\-\s]*$/i,
  ],
  
  // Dropdown/select patterns (multiple choice with labeled options)
  dropdown: [
    /\bselect\s+(one|an?\s+option)/i,
    /\bchoose\s+(one|from)/i,
  ],
  
  // Multi-line text patterns
  textarea: [
    /\b(describe|description|explain|details|comments|notes|remarks)\s*[:.]?\s*[_\-\s]*$/i,
    /\bprovide\s+(details|explanation)/i,
    /_+\s*\n\s*_+/,  // Multiple lines of underscores
  ],
  
  // Photo patterns
  photo: [
    /\b(photo|picture|image|photograph)\s*(attach|upload|take)?/i,
    /\battach\s+(photo|picture|image)/i,
  ],
  
  // GPS/Location patterns
  gps: [
    /\b(location|gps|coordinates|address|site\s+location)/i,
    /\bwhere\s+did\s+(this|the)/i,
  ],
  
  // Worker select patterns
  worker_select: [
    /\b(employee|worker|staff|personnel)\s+(name|id)/i,
    /\b(witness|injured\s+person|supervisor)\s+name/i,
  ],
  
  // Equipment select patterns
  equipment_select: [
    /\b(equipment|machine|tool|vehicle)\s+(id|name|number)/i,
    /\basset\s+(id|number)/i,
  ],
  
  // Rating patterns
  rating: [
    /\brat(e|ing)\s*[:.]?\s*(1-5|1-10)?/i,
    /\b(score|level)\s*[:.]?\s*[_\-\s]*$/i,
  ],
};

// =============================================================================
// FIELD TYPE DETECTION
// =============================================================================

/**
 * Detect field type from label text
 */
export function detectFieldType(label: string, contextLines: string[] = []): {
  type: DetectedFieldType;
  confidence: number;
  options?: FieldOption[];
} {
  const normalizedLabel = label.toLowerCase().trim();
  const context = contextLines.join(' ').toLowerCase();
  
  // Check each pattern
  for (const [fieldType, patterns] of Object.entries(FIELD_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedLabel) || pattern.test(context)) {
        const confidence = pattern.test(normalizedLabel) ? 85 : 65;
        
        // Special handling for select types
        if (fieldType === 'dropdown' || fieldType === 'checkbox') {
          const options = extractOptions(contextLines);
          if (options.length > 0) {
            return {
              type: options.length > 5 ? 'dropdown' : 'radio',
              confidence,
              options,
            };
          }
        }
        
        return {
          type: fieldType as DetectedFieldType,
          confidence,
        };
      }
    }
  }
  
  // Default to text
  return { type: 'text', confidence: 50 };
}

/**
 * Extract options from context lines (for dropdowns/checkboxes)
 */
function extractOptions(lines: string[]): FieldOption[] {
  const options: FieldOption[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const starters = new Set(['[', '(', '□', '☐', '•', '-', '*']);
    if (!starters.has(trimmed[0])) continue;

    let rest = trimmed.slice(1).trimStart();
    if (rest[0] === ']' || rest[0] === ')') {
      rest = rest.slice(1).trimStart();
    }
    if (rest[0] && ['x', 'X', '✓', '✔'].includes(rest[0])) {
      rest = rest.slice(1).trimStart();
    }

    const label = rest.trim();
    if (label && label.length < 100) {
      options.push({
        value: label.toLowerCase().replace(/\s+/g, '_'),
        label,
      });
    }
  }
  
  return options;
}

// =============================================================================
// SECTION DETECTION
// =============================================================================

const SECTION_PATTERNS = [
  /^(\d+)\.\s+[A-Z]/,
  /^([A-Z][A-Z\s]+[A-Z])$/,  // ALL CAPS headers
  /^[IVXLC]+\.\s+/,  // Roman numerals
];

function stripSectionPrefix(line: string): string {
  const trimmed = line.trim();
  const lower = trimmed.toLowerCase();
  const prefixes = ['section', 'part', 'step'];
  for (const prefix of prefixes) {
    if (lower.startsWith(prefix)) {
      let rest = trimmed.slice(prefix.length).trimStart();
      // Strip leading number or roman numeral if present
      rest = rest.replace(/^(?:\d+|[ivxlc]+)\s*/i, '');
      // Strip separators like ":" "." "-"
      rest = rest.replace(/^[:.\-]+\s*/, '');
      return rest.trim() || trimmed;
    }
  }
  return trimmed;
}

/**
 * Detect if a line is a section header
 */
export function isSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 100) return false;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('section') || lower.startsWith('part') || lower.startsWith('step')) {
    return true;
  }
  
  for (const pattern of SECTION_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  
  return false;
}

// =============================================================================
// AI ANALYSIS
// =============================================================================

/**
 * Analyze PDF content and detect form structure
 */
export async function analyzePDFContent(
  text: string,
  pageCount: number,
  fileName: string
): Promise<{
  analysis: AIAnalysisResult;
  detectedFields: Omit<DetectedField, 'id' | 'pdf_upload_id' | 'created_at' | 'updated_at'>[];
}> {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Detect form title
  const formTitle = detectFormTitle(lines, fileName);
  
  // Detect sections
  const sections = detectSections(lines);
  
  // Detect fields
  const fields = detectFields(lines, sections);
  
  // Suggest COR element
  const corElement = suggestCORElement(text, formTitle);
  
  // Suggest frequency
  const frequency = suggestFrequency(text, formTitle);
  
  const analysis: AIAnalysisResult = {
    form_title: formTitle,
    form_description: generateDescription(text, formTitle),
    suggested_cor_element: corElement,
    suggested_frequency: frequency,
    detected_sections: sections,
    processing_notes: `Extracted ${lines.length} lines from ${pageCount} pages. Detected ${fields.length} potential fields.`,
    confidence_score: calculateOverallConfidence(fields),
  };
  
  return { analysis, detectedFields: fields };
}

/**
 * Detect form title from content
 */
function detectFormTitle(lines: string[], fileName: string): string {
  // Look for title in first few lines
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    // Safe: i is a controlled loop index within bounds of lines array
    // eslint-disable-next-line security/detect-object-injection
    const line = lines[i];
    // Title patterns: all caps, ends with "FORM", centered text, etc.
    if (
      /^[A-Z][A-Z\s]+[A-Z]$/.test(line) ||
      /\bFORM\b/i.test(line) ||
      /\bCHECKLIST\b/i.test(line) ||
      /\bREPORT\b/i.test(line) ||
      /\bINSPECTION\b/i.test(line)
    ) {
      return line.replace(/\s+/g, ' ').trim();
    }
  }
  
  // Fallback to filename
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Detect sections in the document
 */
function detectSections(lines: string[]): DetectedSection[] {
  const sections: DetectedSection[] = [];
  let currentSection: DetectedSection | null = null;
  let sectionOrder = 0;
  
  for (let i = 0; i < lines.length; i++) {
    // Safe: i is a controlled loop index within bounds of lines array
    // eslint-disable-next-line security/detect-object-injection
    if (isSectionHeader(lines[i])) {
      // Save previous section
      if (currentSection) {
        sections.push(currentSection);
      }
      
      currentSection = {
        id: `section_${sectionOrder}`,
        // eslint-disable-next-line security/detect-object-injection
        title: stripSectionPrefix(lines[i]),
        order: sectionOrder,
        field_ids: [],
      };
      sectionOrder++;
    }
  }
  
  // Add last section
  if (currentSection) {
    sections.push(currentSection);
  }
  
  // If no sections detected, create a default one
  if (sections.length === 0) {
    sections.push({
      id: 'section_0',
      title: 'Form Fields',
      order: 0,
      field_ids: [],
    });
  }
  
  return sections;
}

/**
 * Detect fields from document lines
 */
function detectFields(
  lines: string[],
  sections: DetectedSection[]
): Omit<DetectedField, 'id' | 'pdf_upload_id' | 'created_at' | 'updated_at'>[] {
  const fields: Omit<DetectedField, 'id' | 'pdf_upload_id' | 'created_at' | 'updated_at'>[] = [];
  let currentSectionIndex = 0;
  let fieldOrder = 0;
  
  // Field label patterns
  const fieldLabelPatterns = [
    /^(.+?)[:]\s*[_\-\s]*$/,           // Label: _____
    /^(.+?)\s+[_]{3,}\s*$/,            // Label _____
    /^(.+?):\s*$/,                      // Label:
    /^(\d+\.\s*.+?)[:]\s*$/,           // 1. Label:
  ];
  
  for (let i = 0; i < lines.length; i++) {
    // Safe: i is a controlled loop index within bounds of lines array
    // eslint-disable-next-line security/detect-object-injection
    const line = lines[i];
    const contextLines = lines.slice(i, Math.min(i + 5, lines.length));
    
    // Skip if it's a section header
    if (isSectionHeader(line)) {
      // Find matching section
      const sectionTitle = stripSectionPrefix(line);
      const sectionIndex = sections.findIndex(s => 
        s.title.toLowerCase().includes(sectionTitle.toLowerCase()) ||
        sectionTitle.toLowerCase().includes(s.title.toLowerCase())
      );
      if (sectionIndex >= 0) {
        currentSectionIndex = sectionIndex;
        fieldOrder = 0;
      }
      continue;
    }
    
    // Try to match field patterns
    let label: string | null = null;
    
    for (const pattern of fieldLabelPatterns) {
      const match = line.match(pattern);
      if (match) {
        label = match[1].trim();
        break;
      }
    }
    
    // Skip if no label found or label too short/long
    if (!label || label.length < 2 || label.length > 150) continue;
    
    // Skip if it looks like a title or instruction
    if (label.endsWith('?') && label.length > 80) continue;
    
    // Detect field type
    const { type, confidence, options } = detectFieldType(label, contextLines);
    
    // Generate field code
    const fieldCode = generateFieldCode(label, fields.length);
    
    // Create field
    const field: Omit<DetectedField, 'id' | 'pdf_upload_id' | 'created_at' | 'updated_at'> = {
      field_code: fieldCode,
      detected_label: label,
      suggested_type: type,
      type_confidence: confidence,
      page_number: 1, // Would need page detection for multi-page
      bbox_x: null,
      bbox_y: null,
      bbox_width: null,
      bbox_height: null,
      suggested_options: options || null,
      suggested_validation: generateValidation(type, label),
      suggested_help_text: null,
      // eslint-disable-next-line security/detect-object-injection
      section_label: sections[currentSectionIndex]?.title || null,
      section_order: currentSectionIndex,
      field_order: fieldOrder,
      user_label: null,
      user_type: null,
      user_options: null,
      user_validation: null,
      is_confirmed: false,
      is_excluded: false,
    };
    
    // Add field to section
      // Safe: currentSectionIndex is a controlled index tracking the current section position
      // eslint-disable-next-line security/detect-object-injection
      if (sections[currentSectionIndex]) {
        // eslint-disable-next-line security/detect-object-injection
        sections[currentSectionIndex].field_ids.push(fieldCode);
      }
    
    fields.push(field);
    fieldOrder++;
  }
  
  return fields;
}

/**
 * Generate a field code from label
 */
function generateFieldCode(label: string, index: number): string {
  const code = label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 30);
  
  return code || `field_${index}`;
}

/**
 * Generate validation rules based on field type
 */
function generateValidation(type: DetectedFieldType, label: string): ValidationRules {
  const rules: ValidationRules = { required: false };
  
  switch (type) {
    case 'email':
      rules.pattern = '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$';
      rules.custom_message = 'Please enter a valid email address';
      break;
    case 'phone':
      rules.pattern = '^[+]?[(]?[0-9]{3}[)]?[-\\s.]?[0-9]{3}[-\\s.]?[0-9]{4,6}$';
      rules.custom_message = 'Please enter a valid phone number';
      break;
    case 'number':
      rules.min_value = 0;
      break;
    case 'textarea':
      rules.max_length = 1000;
      break;
    case 'text':
      rules.max_length = 255;
      break;
  }
  
  // Required indicators
  if (/\*|required|\(required\)/i.test(label)) {
    rules.required = true;
  }
  
  return rules;
}

/**
 * Suggest COR element based on content
 */
function suggestCORElement(text: string, title: string): number | null {
  const lowerText = (text + ' ' + title).toLowerCase();
  
  const elementKeywords: Record<number, string[]> = {
    1: ['policy', 'commitment', 'management commitment'],
    2: ['hazard assessment', 'hazard identification', 'risk assessment', 'jha', 'job hazard'],
    3: ['hazard control', 'control measures', 'ppe', 'protective equipment', 'safe work'],
    4: ['inspection', 'site inspection', 'workplace inspection', 'audit'],
    5: ['qualification', 'training', 'competency', 'orientation', 'certification'],
    6: ['emergency', 'evacuation', 'fire drill', 'first aid', 'emergency response'],
    7: ['incident', 'accident', 'injury', 'near miss', 'investigation'],
    8: ['communication', 'toolbox talk', 'safety meeting', 'briefing'],
    9: ['review', 'management review', 'statistics', 'performance'],
    10: ['incident investigation', 'root cause', 'corrective action'],
    11: ['emergency preparedness', 'emergency plan', 'drill record'],
    12: ['statistics', 'records', 'injury log', 'first aid log'],
    13: ['legislation', 'compliance', 'regulatory', 'legal'],
    14: ['management', 'program administration', 'system review'],
  };
  
  let bestMatch = { element: null as number | null, score: 0 };
  
  for (const [element, keywords] of Object.entries(elementKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        score += keyword.split(' ').length; // More words = more specific = higher score
      }
    }
    if (score > bestMatch.score) {
      bestMatch = { element: parseInt(element), score };
    }
  }
  
  return bestMatch.score >= 2 ? bestMatch.element : null;
}

/**
 * Suggest form frequency based on content
 */
function suggestFrequency(text: string, title: string): AIAnalysisResult['suggested_frequency'] {
  const lowerText = (text + ' ' + title).toLowerCase();
  
  if (/daily|each day|every day|per day|shift/i.test(lowerText)) return 'daily';
  if (/weekly|each week|every week/i.test(lowerText)) return 'weekly';
  if (/monthly|each month|every month/i.test(lowerText)) return 'monthly';
  if (/quarterly|every quarter|every 3 months/i.test(lowerText)) return 'quarterly';
  if (/annual|yearly|each year|every year/i.test(lowerText)) return 'annual';
  
  // Default based on form type
  if (/inspection|checklist/i.test(lowerText)) return 'weekly';
  if (/incident|accident|injury/i.test(lowerText)) return 'as_needed';
  if (/review|audit/i.test(lowerText)) return 'monthly';
  
  return 'as_needed';
}

/**
 * Generate form description
 */
function generateDescription(text: string, title: string): string {
  // Try to find a description or purpose statement
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    // Safe: i is a controlled loop index within bounds of lines array
    // eslint-disable-next-line security/detect-object-injection
    const line = lines[i];
    if (
      /^(purpose|description|instructions|this form)/i.test(line) ||
      (line.length > 50 && line.length < 300 && !line.includes(':') && i > 0)
    ) {
      return line;
    }
  }
  
  return `Digital version of ${title}. Converted from PDF form.`;
}

/**
 * Calculate overall confidence score
 */
function calculateOverallConfidence(
  fields: Omit<DetectedField, 'id' | 'pdf_upload_id' | 'created_at' | 'updated_at'>[]
): number {
  if (fields.length === 0) return 30;
  
  const avgConfidence = fields.reduce((sum, f) => sum + f.type_confidence, 0) / fields.length;
  const fieldCountBonus = Math.min(fields.length * 2, 20);
  
  return Math.min(Math.round(avgConfidence + fieldCountBonus), 95);
}

