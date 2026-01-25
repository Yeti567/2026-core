/**
 * PDF Form Converter Types
 * 
 * TypeScript interfaces for the AI-powered PDF-to-Digital Form Converter.
 */

// =============================================================================
// UPLOAD STATUS
// =============================================================================

export type PDFUploadStatus = 
  | 'pending'
  | 'processing'
  | 'analyzed'
  | 'mapping'
  | 'converting'
  | 'completed'
  | 'failed'
  | 'cancelled';

// =============================================================================
// CONVERSION STEPS
// =============================================================================

export type ConversionStep =
  | 'upload'
  | 'review_ocr'
  | 'map_fields'
  | 'cor_mapping'
  | 'preview'
  | 'publish';

export const CONVERSION_STEPS: { step: ConversionStep; label: string; description: string }[] = [
  { step: 'upload', label: 'Upload PDF', description: 'Upload your PDF form' },
  { step: 'review_ocr', label: 'Review Text', description: 'Review extracted text and fields' },
  { step: 'map_fields', label: 'Map Fields', description: 'Configure field types and validation' },
  { step: 'cor_mapping', label: 'COR Mapping', description: 'Link to COR elements' },
  { step: 'preview', label: 'Preview', description: 'Preview the converted form' },
  { step: 'publish', label: 'Publish', description: 'Publish to form library' },
];

// =============================================================================
// FIELD TYPES
// =============================================================================

export type DetectedFieldType =
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
  | 'phone'
  | 'currency'
  | 'body_diagram'
  | 'weather'
  | 'temperature'
  | 'hidden';

export const FIELD_TYPE_OPTIONS: { value: DetectedFieldType; label: string; icon: string }[] = [
  { value: 'text', label: 'Text Input', icon: 'Type' },
  { value: 'textarea', label: 'Multi-line Text', icon: 'AlignLeft' },
  { value: 'number', label: 'Number', icon: 'Hash' },
  { value: 'date', label: 'Date', icon: 'Calendar' },
  { value: 'time', label: 'Time', icon: 'Clock' },
  { value: 'datetime', label: 'Date & Time', icon: 'CalendarClock' },
  { value: 'dropdown', label: 'Dropdown', icon: 'ChevronDown' },
  { value: 'radio', label: 'Radio Buttons', icon: 'CircleDot' },
  { value: 'checkbox', label: 'Checkbox', icon: 'CheckSquare' },
  { value: 'multiselect', label: 'Multi-select', icon: 'ListChecks' },
  { value: 'signature', label: 'Signature', icon: 'PenTool' },
  { value: 'photo', label: 'Photo', icon: 'Camera' },
  { value: 'file', label: 'File Upload', icon: 'Paperclip' },
  { value: 'gps', label: 'GPS Location', icon: 'MapPin' },
  { value: 'worker_select', label: 'Worker Select', icon: 'Users' },
  { value: 'jobsite_select', label: 'Jobsite Select', icon: 'Building' },
  { value: 'equipment_select', label: 'Equipment Select', icon: 'Wrench' },
  { value: 'rating', label: 'Rating', icon: 'Star' },
  { value: 'slider', label: 'Slider', icon: 'Sliders' },
  { value: 'yes_no', label: 'Yes/No', icon: 'ToggleLeft' },
  { value: 'yes_no_na', label: 'Yes/No/N/A', icon: 'ToggleRight' },
  { value: 'email', label: 'Email', icon: 'Mail' },
  { value: 'phone', label: 'Phone', icon: 'Phone' },
  { value: 'currency', label: 'Currency', icon: 'DollarSign' },
  { value: 'body_diagram', label: 'Body Diagram', icon: 'User' },
  { value: 'weather', label: 'Weather', icon: 'Cloud' },
  { value: 'temperature', label: 'Temperature', icon: 'Thermometer' },
];

// =============================================================================
// DATABASE TYPES
// =============================================================================

/**
 * PDF upload record from database
 */
export interface PDFUpload {
  id: string;
  company_id: string;
  uploaded_by: string | null;
  file_name: string;
  file_size_bytes: number;
  storage_path: string;
  thumbnail_path: string | null;
  status: PDFUploadStatus;
  ocr_text: string | null;
  ocr_confidence: number | null;
  page_count: number;
  ai_analysis: AIAnalysisResult | null;
  error_message: string | null;
  processing_attempts: number;
  uploaded_at: string;
  processed_at: string | null;
  completed_at: string | null;
  result_template_id: string | null;
}

/**
 * AI analysis result structure
 */
export interface AIAnalysisResult {
  form_title: string;
  form_description: string;
  suggested_cor_element: number | null;
  suggested_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'as_needed';
  detected_sections: DetectedSection[];
  processing_notes: string;
  confidence_score: number;
}

/**
 * Detected section from AI analysis
 */
export interface DetectedSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  field_ids: string[];
}

/**
 * Detected field from database
 */
export interface DetectedField {
  id: string;
  pdf_upload_id: string;
  field_code: string;
  detected_label: string;
  suggested_type: DetectedFieldType;
  type_confidence: number;
  page_number: number;
  bbox_x: number | null;
  bbox_y: number | null;
  bbox_width: number | null;
  bbox_height: number | null;
  suggested_options: FieldOption[] | null;
  suggested_validation: ValidationRules | null;
  suggested_help_text: string | null;
  section_label: string | null;
  section_order: number;
  field_order: number;
  user_label: string | null;
  user_type: DetectedFieldType | null;
  user_options: FieldOption[] | null;
  user_validation: ValidationRules | null;
  is_confirmed: boolean;
  is_excluded: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Conversion session from database
 */
export interface ConversionSession {
  id: string;
  pdf_upload_id: string;
  current_step: ConversionStep;
  form_name: string | null;
  form_description: string | null;
  form_code: string | null;
  cor_element: number | null;
  cor_element_confirmed: boolean;
  linked_audit_questions: string[];
  is_cor_related: boolean;
  custom_category: string | null;
  sections_config: SectionConfig[];
  workflow_config: WorkflowConfig;
  preview_generated_at: string | null;
  preview_data: unknown | null;
  started_at: string;
  last_activity_at: string;
  completed_at: string | null;
  created_by: string | null;
}

/**
 * PDF form reference from database
 */
export interface PDFFormReference {
  id: string;
  form_template_id: string;
  pdf_upload_id: string | null;
  original_file_name: string;
  original_storage_path: string;
  conversion_date: string;
  converted_by: string | null;
  conversion_notes: string | null;
}

// =============================================================================
// SUPPORTING TYPES
// =============================================================================

export interface FieldOption {
  value: string;
  label: string;
}

export interface ValidationRules {
  required?: boolean;
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  pattern?: string;
  custom_message?: string;
}

export interface SectionConfig {
  id: string;
  title: string;
  description?: string;
  order: number;
  field_ids: string[];
  is_repeatable?: boolean;
}

export interface WorkflowConfig {
  submit_to_role?: string;
  notify_roles?: string[];
  creates_task?: boolean;
  requires_approval?: boolean;
  sync_priority?: number;
}

// =============================================================================
// COR ELEMENT MAPPING
// =============================================================================

export interface CORElementSuggestion {
  element_number: number;
  element_name: string;
  confidence: number;
  reasoning: string;
  related_questions: AuditQuestionSuggestion[];
}

export interface AuditQuestionSuggestion {
  question_id: string;
  question_text: string;
  relevance_score: number;
}

// =============================================================================
// API TYPES
// =============================================================================

export interface PDFUploadRequest {
  file: File;
  company_id: string;
}

export interface PDFUploadResponse {
  upload_id: string;
  storage_path: string;
  status: PDFUploadStatus;
}

export interface ProcessPDFRequest {
  upload_id: string;
}

export interface ProcessPDFResponse {
  success: boolean;
  detected_fields: DetectedField[];
  ai_analysis: AIAnalysisResult;
  error?: string;
}

export interface UpdateFieldRequest {
  field_id: string;
  user_label?: string;
  user_type?: DetectedFieldType;
  user_options?: FieldOption[];
  user_validation?: ValidationRules;
  is_confirmed?: boolean;
  is_excluded?: boolean;
}

export interface UpdateSessionRequest {
  session_id: string;
  current_step?: ConversionStep;
  form_name?: string;
  form_description?: string;
  form_code?: string;
  cor_element?: number;
  cor_element_confirmed?: boolean;
  linked_audit_questions?: string[];
  is_cor_related?: boolean;
  custom_category?: string;
  sections_config?: SectionConfig[];
  workflow_config?: WorkflowConfig;
}

export interface ConvertToFormRequest {
  session_id: string;
}

export interface ConvertToFormResponse {
  success: boolean;
  template_id?: string;
  error?: string;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface PDFConverterProps {
  companyId: string;
  onComplete?: (templateId: string) => void;
  onCancel?: () => void;
}

export interface PDFUploaderProps {
  onUploadComplete: (upload: PDFUpload) => void;
  onError: (error: string) => void;
}

export interface FieldMappingEditorProps {
  upload: PDFUpload;
  fields: DetectedField[];
  onFieldUpdate: (field: DetectedField) => void;
  onFieldExclude: (fieldId: string) => void;
}

export interface CORMappingPanelProps {
  session: ConversionSession;
  suggestions: CORElementSuggestion[];
  onElementSelect: (element: number) => void;
  onQuestionsLink: (questionIds: string[]) => void;
  onNotCORRelated: () => void;
}

export interface FormPreviewProps {
  session: ConversionSession;
  fields: DetectedField[];
  sections: SectionConfig[];
}


