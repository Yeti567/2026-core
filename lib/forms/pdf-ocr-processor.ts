/**
 * PDF OCR Processor
 * 
 * Handles PDF upload, OCR extraction with Tesseract.js, and AI-powered
 * field detection using Claude API.
 */

import { createWorker, Worker, Word } from 'tesseract.js';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { callAI } from '@/lib/ai/ai-client';

async function parsePdf(buffer: Buffer, options?: Record<string, unknown>): Promise<any> {
  const mod: any = await import('pdf-parse');
  const fn = mod?.default ?? mod;
  return fn(buffer, options);
}

// =============================================================================
// TYPES
// =============================================================================

export interface DetectedField {
  field_id: string;
  label: string;
  field_type: string;
  position: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  validation_rules?: Record<string, unknown>;
  auto_detected: boolean;
}

export interface AISuggestions {
  suggested_form_name: string;
  suggested_cor_elements: number[];
  suggested_category: string;
  reasoning: string;
  confidence: number;
}

export interface PDFFormConversion {
  id: string;
  company_id: string;
  original_pdf_path: string;
  original_pdf_name: string;
  pdf_page_count: number | null;
  pdf_size_bytes: number;
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed';
  ocr_started_at: string | null;
  ocr_completed_at: string | null;
  ocr_error: string | null;
  extracted_text: string | null;
  detected_fields: DetectedField[];
  ai_suggested_metadata: AISuggestions | null;
  conversion_status: string;
  mapped_form_template_id: string | null;
  published_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProcessingStatus {
  conversion_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
}

// =============================================================================
// MAIN PROCESSING FUNCTION
// =============================================================================

/**
 * Process a PDF form upload - creates record and starts background analysis
 */
export async function processPDFForm(
  pdfFile: File,
  companyId: string,
  userId: string
): Promise<PDFFormConversion> {
  const supabase = createRouteHandlerClient();

  // 1. Upload PDF to storage
  const pdfPath = await uploadPDFToStorage(pdfFile, companyId);

  // 2. Get user profile ID
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  // 3. Create conversion record
  const { data: conversion, error: insertError } = await supabase
    .from('pdf_form_conversions')
    .insert({
      company_id: companyId,
      original_pdf_path: pdfPath,
      original_pdf_name: pdfFile.name,
      pdf_size_bytes: pdfFile.size,
      ocr_status: 'processing',
      ocr_started_at: new Date().toISOString(),
      conversion_status: 'draft',
      created_by: userProfile?.id || null,
    })
    .select()
    .single();

  if (insertError || !conversion) {
    throw new Error(`Failed to create conversion record: ${insertError?.message}`);
  }

  // 4. Start background analysis (non-blocking)
  const pdfBuffer = await pdfFile.arrayBuffer();
  analyzeFormStructure(conversion.id, Buffer.from(pdfBuffer)).catch(error => {
    console.error('OCR analysis failed:', error);
    supabase
      .from('pdf_form_conversions')
      .update({
        ocr_status: 'failed',
        ocr_error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', conversion.id);
  });

  return conversion as PDFFormConversion;
}

/**
 * Upload PDF to Supabase storage
 */
async function uploadPDFToStorage(
  pdfFile: File,
  companyId: string
): Promise<string> {
  const supabase = createRouteHandlerClient();

  const timestamp = Date.now();
  const sanitizedName = pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `pdf-conversions/${companyId}/${timestamp}_${sanitizedName}`;

  const arrayBuffer = await pdfFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload PDF: ${uploadError.message}`);
  }

  return storagePath;
}

// =============================================================================
// BACKGROUND ANALYSIS
// =============================================================================

/**
 * Analyze form structure using OCR and AI
 */
async function analyzeFormStructure(
  conversionId: string,
  pdfBuffer: Buffer
): Promise<void> {
  const supabase = createRouteHandlerClient();

  try {
    // Extract basic PDF info
    const pdfData = await parsePdf(pdfBuffer);
    const pageCount = pdfData.numpages;

    // Get text from pdf-parse first (fast)
    let fullText = pdfData.text;
    const detectedFields: DetectedField[] = [];

    // Try Tesseract OCR for better field detection
    try {
      const ocrResult = await performTesseractOCR(pdfBuffer, pageCount);
      if (ocrResult.text.length > fullText.length) {
        fullText = ocrResult.text;
      }
      detectedFields.push(...ocrResult.fields);
    } catch (ocrError) {
      console.warn('Tesseract OCR failed, using pdf-parse text:', ocrError);
      // Fall back to pattern-based detection from pdf-parse text
      detectedFields.push(...detectFieldsFromText(fullText));
    }

    // Use AI to suggest form metadata
    const aiSuggestions = await generateAISuggestions(fullText, detectedFields);

    // Update conversion record
    await supabase
      .from('pdf_form_conversions')
      .update({
        pdf_page_count: pageCount,
        extracted_text: fullText,
        detected_fields: detectedFields,
        ai_suggested_metadata: aiSuggestions,
        ocr_status: 'completed',
        ocr_completed_at: new Date().toISOString(),
        conversion_status: 'mapping_fields',
      })
      .eq('id', conversionId);

    // Create initial field mappings
    await createInitialFieldMappings(conversionId, detectedFields);

  } catch (error) {
    // Update status to failed
    await supabase
      .from('pdf_form_conversions')
      .update({
        ocr_status: 'failed',
        ocr_error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', conversionId);

    throw error;
  }
}

/**
 * Perform OCR using Tesseract.js
 */
async function performTesseractOCR(
  pdfBuffer: Buffer,
  pageCount: number
): Promise<{ text: string; fields: DetectedField[] }> {
  // Convert PDF pages to images
  const pageImages = await convertPDFToImages(pdfBuffer);

  // Create Tesseract worker
  const worker = await createWorker('eng');

  const detectedFields: DetectedField[] = [];
  let fullText = '';
  let fieldCounter = 1;

  try {
    for (let pageNum = 0; pageNum < pageImages.length; pageNum++) {
      // Safe: pageNum is a controlled loop index within bounds of pageImages array
      // eslint-disable-next-line security/detect-object-injection
      const { data } = await worker.recognize(pageImages[pageNum]);
      fullText += data.text + '\n\n';

      // Detect form fields from OCR words
      const fieldsOnPage = detectFormFieldsFromWords(
        data.words as Word[],
        pageNum + 1,
        fieldCounter
      );
      fieldCounter += fieldsOnPage.length;
      detectedFields.push(...fieldsOnPage);
    }
  } finally {
    await worker.terminate();
  }

  return { text: fullText, fields: detectedFields };
}

/**
 * Convert PDF to images for OCR
 */
async function convertPDFToImages(pdfBuffer: Buffer): Promise<string[]> {
  try {
    // Dynamic import of pdf-to-img
    const { pdf } = await import('pdf-to-img');
    const document = await pdf(pdfBuffer, { scale: 2.0 }); // Higher scale for better OCR
    const images: string[] = [];

    for await (const image of document) {
      // Convert to base64 data URL for Tesseract
      const base64 = `data:image/png;base64,${image.toString('base64')}`;
      images.push(base64);
    }

    return images;
  } catch (error) {
    console.warn('pdf-to-img failed, returning empty array:', error);
    return [];
  }
}

// =============================================================================
// FIELD DETECTION
// =============================================================================

/**
 * Detect form fields from Tesseract OCR words
 */
function detectFormFieldsFromWords(
  words: Word[],
  pageNum: number,
  startingFieldId: number
): DetectedField[] {
  const fields: DetectedField[] = [];
  let fieldCounter = startingFieldId;

  for (let i = 0; i < words.length; i++) {
    // Safe: i is a controlled loop index within bounds of words array
    // eslint-disable-next-line security/detect-object-injection
    const word = words[i];
    const text = word.text.toLowerCase().trim();

    // Skip empty or very short words
    if (text.length < 2) continue;

    // Detect checkbox fields
    if (text === '□' || text === '☐' || text === '▢' || text === '[ ]' || text === '()') {
      const nextWord = words[i + 1];
      if (nextWord) {
        fields.push({
          field_id: `field_${fieldCounter++}`,
          label: capitalizeLabel(nextWord.text),
          field_type: 'checkbox',
          position: {
            page: pageNum,
            x: Math.round(word.bbox.x0),
            y: Math.round(word.bbox.y0),
            width: Math.round(word.bbox.x1 - word.bbox.x0) + 100,
            height: Math.round(word.bbox.y1 - word.bbox.y0),
          },
          confidence: word.confidence / 100,
          auto_detected: true,
        });
      }
      continue;
    }

    // Detect common field labels
    const fieldMatch = matchFieldLabel(text);
    if (fieldMatch) {
      // Check if followed by blank space or underscore line
      const hasInputArea = checkForInputArea(words, i + 1);

      if (hasInputArea || fieldMatch.alwaysInclude) {
        fields.push({
          field_id: `field_${fieldCounter++}`,
          label: capitalizeLabel(word.text.replace(/[:_]/g, '').trim()),
          field_type: fieldMatch.type,
          position: {
            page: pageNum,
            x: Math.round(word.bbox.x0),
            y: Math.round(word.bbox.y0),
            width: fieldMatch.defaultWidth,
            height: fieldMatch.defaultHeight,
          },
          confidence: (word.confidence / 100) * 0.85,
          validation_rules: fieldMatch.validation,
          auto_detected: true,
        });
      }
    }

    // Detect signature fields
    if (text.includes('signature') || text.includes('signed') || text.includes('sign here')) {
      fields.push({
        field_id: `field_${fieldCounter++}`,
        label: 'Signature',
        field_type: 'signature',
        position: {
          page: pageNum,
          x: Math.round(word.bbox.x0),
          y: Math.round(word.bbox.y0),
          width: 250,
          height: 80,
        },
        confidence: word.confidence / 100,
        auto_detected: true,
      });
    }
  }

  return fields;
}

/**
 * Detect fields from plain text (fallback when Tesseract fails)
 */
function detectFieldsFromText(text: string): DetectedField[] {
  const fields: DetectedField[] = [];
  let fieldCounter = 1;

  const lines = text.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim().toLowerCase();

    // Check for common form patterns
    const fieldMatch = matchFieldLabel(trimmedLine);
    if (fieldMatch) {
      const labelText = line.split(':')[0] || line.split('_')[0] || line;
      fields.push({
        field_id: `field_${fieldCounter++}`,
        label: capitalizeLabel(labelText.trim()),
        field_type: fieldMatch.type,
        position: { page: 1, x: 50, y: 50 * fieldCounter, width: 200, height: 30 },
        confidence: 0.7,
        validation_rules: fieldMatch.validation,
        auto_detected: true,
      });
    }

    // Check for checkbox patterns
    if (trimmedLine.match(/^[\[\(][\s\]]*[\]\)]/) || trimmedLine.startsWith('□') || trimmedLine.startsWith('☐')) {
      const labelPart = line.replace(/^[\[\(□☐▢][\s\]]*[\]\)]/g, '').trim();
      if (labelPart.length > 0) {
        fields.push({
          field_id: `field_${fieldCounter++}`,
          label: capitalizeLabel(labelPart),
          field_type: 'checkbox',
          position: { page: 1, x: 50, y: 50 * fieldCounter, width: 200, height: 30 },
          confidence: 0.75,
          auto_detected: true,
        });
      }
    }
  }

  return fields;
}

/**
 * Match field label against known patterns
 */
function matchFieldLabel(text: string): {
  type: string;
  defaultWidth: number;
  defaultHeight: number;
  validation?: Record<string, unknown>;
  alwaysInclude?: boolean;
} | null {
  const patterns: Record<string, {
    type: string;
    defaultWidth: number;
    defaultHeight: number;
    validation?: Record<string, unknown>;
    alwaysInclude?: boolean;
  }> = {
    'name': { type: 'text', defaultWidth: 200, defaultHeight: 30 },
    'worker': { type: 'worker_select', defaultWidth: 200, defaultHeight: 30 },
    'employee': { type: 'worker_select', defaultWidth: 200, defaultHeight: 30 },
    'supervisor': { type: 'worker_select', defaultWidth: 200, defaultHeight: 30 },
    'date': { type: 'date', defaultWidth: 150, defaultHeight: 30, alwaysInclude: true },
    'time': { type: 'time', defaultWidth: 120, defaultHeight: 30 },
    'location': { type: 'text', defaultWidth: 250, defaultHeight: 30 },
    'address': { type: 'textarea', defaultWidth: 300, defaultHeight: 60 },
    'jobsite': { type: 'jobsite_select', defaultWidth: 200, defaultHeight: 30 },
    'site': { type: 'jobsite_select', defaultWidth: 200, defaultHeight: 30 },
    'phone': { type: 'tel', defaultWidth: 150, defaultHeight: 30, validation: { phone: true } },
    'telephone': { type: 'tel', defaultWidth: 150, defaultHeight: 30, validation: { phone: true } },
    'email': { type: 'email', defaultWidth: 200, defaultHeight: 30, validation: { email: true } },
    'description': { type: 'textarea', defaultWidth: 300, defaultHeight: 100 },
    'comments': { type: 'textarea', defaultWidth: 300, defaultHeight: 100 },
    'notes': { type: 'textarea', defaultWidth: 300, defaultHeight: 100 },
    'details': { type: 'textarea', defaultWidth: 300, defaultHeight: 100 },
    'equipment': { type: 'equipment_select', defaultWidth: 200, defaultHeight: 30 },
    'vehicle': { type: 'equipment_select', defaultWidth: 200, defaultHeight: 30 },
    'weather': { type: 'weather', defaultWidth: 200, defaultHeight: 30 },
    'temperature': { type: 'temperature', defaultWidth: 100, defaultHeight: 30 },
  };

  for (const [pattern, config] of Object.entries(patterns)) {
    // Safe: pattern is from Object.entries iteration (controlled patterns object)

    if (text.includes(pattern)) {
      return config;
    }
  }

  return null;
}

/**
 * Check if the next word(s) indicate an input area
 */
function checkForInputArea(words: Word[], startIndex: number): boolean {
  for (let i = startIndex; i < Math.min(startIndex + 3, words.length); i++) {
    // Safe: i is a controlled loop index within bounds of words array
    // eslint-disable-next-line security/detect-object-injection
    const word = words[i];
    if (word.text.includes('_') || word.text.includes('.....') || word.text === ':') {
      return true;
    }
  }
  return false;
}

/**
 * Capitalize field label
 */
function capitalizeLabel(label: string): string {
  return label
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// =============================================================================
// AI SUGGESTIONS (CLAUDE API)
// =============================================================================

/**
 * Generate AI suggestions for form metadata using Claude API
 */
async function generateAISuggestions(
  extractedText: string,
  detectedFields: DetectedField[]
): Promise<AISuggestions> {
  const hasAIKey = process.env.ANTHROPIC_API_KEY || process.env.OPENROUTER_API_KEY;

  // If no API key, return default suggestions
  if (!hasAIKey) {
    console.warn('AI API keys not set, using fallback suggestions');
    return generateFallbackSuggestions(extractedText, detectedFields);
  }

  try {
    const prompt = `Analyze this construction safety form and provide suggestions:

FORM TEXT (first 4000 chars):
${extractedText.substring(0, 4000)}

DETECTED FIELDS:
${detectedFields.map(f => `- ${f.label} (${f.field_type})`).join('\n')}

Please provide:
1. Suggested form name (concise, descriptive)
2. Which COR 2020 elements this form relates to (numbers 1-14, or empty array if not COR-related)
   - Element 1: Health & Safety Policy
   - Element 2: Hazard Assessment
   - Element 3: Safe Work Practices
   - Element 4: Safe Job Procedures
   - Element 5: Company Safety Rules
   - Element 6: PPE
   - Element 7: Preventative Maintenance
   - Element 8: Training & Communication
   - Element 9: Workplace Inspections
   - Element 10: Incident Investigation
   - Element 11: Emergency Preparedness
   - Element 12: Statistics & Records
   - Element 13: Legislation & Compliance
   - Element 14: Management Review
3. Form category (one of: hazard_assessment, inspection, incident_report, toolbox_talk, training_record, ppe_inspection, equipment_inspection, emergency_drill, meeting_minutes, other)
4. Brief reasoning for your suggestions

Respond ONLY with valid JSON in this exact format:
{
  "suggested_form_name": "...",
  "suggested_cor_elements": [2, 3],
  "suggested_category": "...",
  "reasoning": "...",
  "confidence": 0.85
}`;

    const aiResponse = await callAI([
      { role: 'user', content: prompt }
    ], {
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1000
    });

    const textContent = aiResponse.content || '';

    // Parse JSON response (handle markdown code fences)
    const jsonText = textContent.replace(/```json\n?|\n?```/g, '').trim();
    const suggestions = JSON.parse(jsonText);

    return {
      suggested_form_name: suggestions.suggested_form_name || 'Unnamed Form',
      suggested_cor_elements: suggestions.suggested_cor_elements || [],
      suggested_category: suggestions.suggested_category || 'other',
      reasoning: suggestions.reasoning || '',
      confidence: suggestions.confidence || 0.5,
    };

  } catch (error) {
    console.error('AI suggestions failed:', error);
    return generateFallbackSuggestions(extractedText, detectedFields);
  }
}

/**
 * Generate fallback suggestions when AI is unavailable
 */
function generateFallbackSuggestions(
  text: string,
  fields: DetectedField[]
): AISuggestions {
  const lowerText = text.toLowerCase();

  // Detect form type from keywords
  let category = 'other';
  let corElements: number[] = [];
  let formName = 'Form';

  if (lowerText.includes('hazard') || lowerText.includes('jha') || lowerText.includes('risk assessment')) {
    category = 'hazard_assessment';
    corElements = [2, 3];
    formName = 'Hazard Assessment Form';
  } else if (lowerText.includes('inspection') || lowerText.includes('checklist')) {
    category = 'inspection';
    corElements = [9];
    formName = 'Safety Inspection Checklist';
  } else if (lowerText.includes('incident') || lowerText.includes('accident') || lowerText.includes('injury')) {
    category = 'incident_report';
    corElements = [10];
    formName = 'Incident Report Form';
  } else if (lowerText.includes('toolbox') || lowerText.includes('safety meeting') || lowerText.includes('tailgate')) {
    category = 'toolbox_talk';
    corElements = [8];
    formName = 'Toolbox Talk Record';
  } else if (lowerText.includes('training') || lowerText.includes('orientation')) {
    category = 'training_record';
    corElements = [8];
    formName = 'Training Record';
  } else if (lowerText.includes('ppe') || lowerText.includes('protective equipment')) {
    category = 'ppe_inspection';
    corElements = [6];
    formName = 'PPE Inspection Form';
  } else if (lowerText.includes('equipment') || lowerText.includes('maintenance')) {
    category = 'equipment_inspection';
    corElements = [7];
    formName = 'Equipment Inspection Form';
  } else if (lowerText.includes('emergency') || lowerText.includes('drill') || lowerText.includes('evacuation')) {
    category = 'emergency_drill';
    corElements = [11];
    formName = 'Emergency Drill Record';
  }

  return {
    suggested_form_name: formName,
    suggested_cor_elements: corElements,
    suggested_category: category,
    reasoning: 'Automatically detected based on form content keywords',
    confidence: 0.6,
  };
}

// =============================================================================
// FIELD MAPPING CREATION
// =============================================================================

/**
 * Create initial field mappings from detected fields
 */
async function createInitialFieldMappings(
  conversionId: string,
  detectedFields: DetectedField[]
): Promise<void> {
  const supabase = createRouteHandlerClient();

  const mappings = detectedFields.map((field, index) => ({
    conversion_id: conversionId,
    field_id: field.field_id,
    field_code: generateFieldCode(field.label),
    label: field.label,
    field_type: field.field_type,
    position_page: field.position.page,
    position_x: field.position.x,
    position_y: field.position.y,
    position_width: field.position.width,
    position_height: field.position.height,
    validation_rules: field.validation_rules || {},
    section_name: 'Section 1',
    section_order: 1,
    field_order: index + 1,
    auto_detected: true,
    manually_added: false,
    confidence: field.confidence,
  }));

  if (mappings.length > 0) {
    await supabase
      .from('form_field_mappings')
      .insert(mappings);
  }
}

/**
 * Generate field code from label
 */
function generateFieldCode(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50);
}

// =============================================================================
// STATUS CHECKING
// =============================================================================

/**
 * Get conversion status for polling
 */
export async function getConversionStatus(
  conversionId: string
): Promise<ProcessingStatus> {
  const supabase = createRouteHandlerClient();

  const { data: conversion, error } = await supabase
    .from('pdf_form_conversions')
    .select('id, ocr_status, ocr_error, conversion_status, detected_fields')
    .eq('id', conversionId)
    .single();

  if (error || !conversion) {
    throw new Error('Conversion not found');
  }

  const fieldCount = (conversion.detected_fields as DetectedField[])?.length || 0;

  let progress = 0;
  let message = '';

  switch (conversion.ocr_status) {
    case 'pending':
      progress = 0;
      message = 'Waiting to start processing...';
      break;
    case 'processing':
      progress = 50;
      message = 'Analyzing PDF and detecting form fields...';
      break;
    case 'completed':
      progress = 100;
      message = `Analysis complete. Found ${fieldCount} fields.`;
      break;
    case 'failed':
      progress = 0;
      message = 'Processing failed';
      break;
  }

  return {
    conversion_id: conversion.id,
    status: conversion.ocr_status as ProcessingStatus['status'],
    progress,
    message,
    error: conversion.ocr_error || undefined,
  };
}

