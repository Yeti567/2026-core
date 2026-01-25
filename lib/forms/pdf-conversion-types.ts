/**
 * PDF Form Conversion Types
 * 
 * TypeScript interfaces for the PDF OCR and conversion system.
 */

// =============================================================================
// DATABASE TYPES
// =============================================================================

/**
 * PDF Form Conversion record from database
 */
export interface PDFFormConversion {
  id: string;
  company_id: string;
  original_pdf_path: string;
  original_pdf_name: string;
  pdf_page_count: number | null;
  pdf_size_bytes: number;
  ocr_status: OCRStatus;
  ocr_started_at: string | null;
  ocr_completed_at: string | null;
  ocr_error: string | null;
  extracted_text: string | null;
  detected_fields: DetectedField[];
  ai_suggested_metadata: AISuggestions | null;
  conversion_status: ConversionStatus;
  mapped_form_template_id: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Form Field Mapping record from database
 */
export interface FormFieldMapping {
  id: string;
  conversion_id: string;
  field_id: string;
  field_code: string;
  label: string;
  field_type: FieldType;
  position_page: number | null;
  position_x: number | null;
  position_y: number | null;
  position_width: number | null;
  position_height: number | null;
  validation_rules: ValidationRules;
  options: FieldOption[] | null;
  conditional_logic: ConditionalLogic | null;
  placeholder: string | null;
  help_text: string | null;
  default_value: string | null;
  section_name: string;
  section_order: number;
  field_order: number;
  auto_detected: boolean;
  manually_added: boolean;
  edited_by_user: boolean;
  confidence: number | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// STATUS TYPES
// =============================================================================

export type OCRStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ConversionStatus = 
  | 'draft' 
  | 'mapping_fields' 
  | 'ready_to_publish' 
  | 'published' 
  | 'archived';

// =============================================================================
// FIELD TYPES
// =============================================================================

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'multiselect'
  | 'signature'
  | 'photo'
  | 'file'
  | 'gps'
  | 'worker_select'
  | 'jobsite_select'
  | 'equipment_select'
  | 'rating'
  | 'slider'
  | 'yes_no'
  | 'yes_no_na'
  | 'email'
  | 'tel'
  | 'currency'
  | 'body_diagram'
  | 'weather'
  | 'temperature'
  | 'hidden';

// =============================================================================
// DETECTED FIELD TYPES
// =============================================================================

export interface DetectedField {
  field_id: string;
  label: string;
  field_type: string;
  position: FieldPosition;
  confidence: number;
  validation_rules?: ValidationRules;
  auto_detected: boolean;
}

export interface FieldPosition {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

// =============================================================================
// AI SUGGESTIONS
// =============================================================================

export interface AISuggestions {
  suggested_form_name: string;
  suggested_cor_elements: number[];
  suggested_category: FormCategory;
  reasoning: string;
  confidence: number;
}

export type FormCategory =
  | 'hazard_assessment'
  | 'inspection'
  | 'incident_report'
  | 'toolbox_talk'
  | 'training_record'
  | 'ppe_inspection'
  | 'equipment_inspection'
  | 'emergency_drill'
  | 'meeting_minutes'
  | 'other';

// =============================================================================
// VALIDATION & OPTIONS
// =============================================================================

export interface ValidationRules {
  required?: boolean;
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  pattern?: string;
  email?: boolean;
  phone?: boolean;
  custom_message?: string;
}

export interface FieldOption {
  value: string;
  label: string;
}

export interface ConditionalLogic {
  field_id: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: string | number | boolean | null;
}

// =============================================================================
// API TYPES
// =============================================================================

export interface ProcessingStatus {
  conversion_id: string;
  status: OCRStatus;
  progress: number;
  message: string;
  error?: string;
}

export interface ConversionUploadResponse {
  success: boolean;
  conversion_id: string;
  message: string;
}

export interface ConversionDetailsResponse {
  conversion: PDFFormConversion;
  field_mappings: FormFieldMapping[];
  pdf_url: string | null;
}

export interface PublishRequest {
  form_name?: string;
  form_code?: string;
  cor_element?: number;
  description?: string;
  frequency?: string;
}

export interface PublishResponse {
  success: boolean;
  template_id: string;
  form_code: string;
  message: string;
}

// =============================================================================
// COR ELEMENT MAPPING
// =============================================================================

export const COR_ELEMENT_NAMES: Record<number, string> = {
  1: 'Health & Safety Policy',
  2: 'Hazard Assessment',
  3: 'Safe Work Practices',
  4: 'Safe Job Procedures',
  5: 'Company Safety Rules',
  6: 'Personal Protective Equipment',
  7: 'Preventative Maintenance',
  8: 'Training & Communication',
  9: 'Workplace Inspections',
  10: 'Incident Investigation',
  11: 'Emergency Preparedness',
  12: 'Statistics & Records',
  13: 'Legislation & Compliance',
  14: 'Management Review',
};

export const FORM_CATEGORIES: { value: FormCategory; label: string }[] = [
  { value: 'hazard_assessment', label: 'Hazard Assessment' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'incident_report', label: 'Incident Report' },
  { value: 'toolbox_talk', label: 'Toolbox Talk' },
  { value: 'training_record', label: 'Training Record' },
  { value: 'ppe_inspection', label: 'PPE Inspection' },
  { value: 'equipment_inspection', label: 'Equipment Inspection' },
  { value: 'emergency_drill', label: 'Emergency Drill' },
  { value: 'meeting_minutes', label: 'Meeting Minutes' },
  { value: 'other', label: 'Other' },
];


