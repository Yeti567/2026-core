/**
 * Form Builder Type Definitions
 * 
 * Defines the schema structure for dynamic form templates.
 * These types are used by both the FormRenderer and the admin FormLibrary.
 */

// =============================================================================
// FIELD TYPES
// =============================================================================

/**
 * All supported form field types
 */
export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'time'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'checkbox_group'
  | 'signature'
  | 'photo'
  | 'gps'
  | 'file'
  | 'section'
  | 'instructions'
  | 'rating'
  | 'slider'
  | 'yes_no'
  | 'yes_no_na'
  | 'worker_select'
  | 'jobsite_select'
  | 'equipment_select'
  | 'checklist'
  | 'risk_matrix'
  | 'weather'
  | 'temperature'
  | 'ppe_checklist'
  | 'body_diagram'
  | 'repeater';

/**
 * Form template status
 */
export type FormTemplateStatus = 'draft' | 'published' | 'archived';

// =============================================================================
// SELECT OPTIONS
// =============================================================================

/**
 * Option for select, multiselect, radio, and checkbox_group fields
 */
export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

// =============================================================================
// CONDITIONAL LOGIC
// =============================================================================

/**
 * Condition operators for conditional logic
 */
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty';

/**
 * Show/hide condition for a field
 */
export interface FieldCondition {
  field: string;
  operator?: ConditionOperator;
  equals?: string | number | boolean;
  contains?: string;
  value?: string | number | boolean | string[];
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validation rules for a field
 */
export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  custom?: string; // Custom validation function name
}

// =============================================================================
// CHECKLIST ITEMS
// =============================================================================

/**
 * Item in a checklist field
 */
export interface ChecklistItem {
  id: string;
  label: string;
  helpText?: string;
  category?: string;
}

/**
 * Checklist result value
 */
export type ChecklistResult = 'pass' | 'fail' | 'na' | '';

/**
 * Checklist item with result
 */
export interface ChecklistItemResult {
  id: string;
  result: ChecklistResult;
  notes?: string;
}

// =============================================================================
// FIELD DEFINITIONS
// =============================================================================

/**
 * Base field definition (common properties)
 */
export interface BaseFieldDefinition {
  id: string;
  type: FormFieldType;
  label: string;
  description?: string;
  helpText?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  order: number;
  width?: 'full' | 'half' | 'third' | 'quarter';
  
  // Conditional display
  showWhen?: FieldCondition;
  hideWhen?: FieldCondition;
  
  // Default value
  default?: string | number | boolean | string[] | 'today' | 'now';
  
  // Validation
  validation?: FieldValidation;
}

/**
 * Text input field
 */
export interface TextFieldDefinition extends BaseFieldDefinition {
  type: 'text';
  maxLength?: number;
  minLength?: number;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'url';
  autocomplete?: string;
}

/**
 * Textarea field
 */
export interface TextareaFieldDefinition extends BaseFieldDefinition {
  type: 'textarea';
  rows?: number;
  maxLength?: number;
  minLength?: number;
  autoResize?: boolean;
}

/**
 * Number input field
 */
export interface NumberFieldDefinition extends BaseFieldDefinition {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

/**
 * Select dropdown field
 */
export interface SelectFieldDefinition extends BaseFieldDefinition {
  type: 'select';
  options: SelectOption[];
  allowCustom?: boolean;
  searchable?: boolean;
}

/**
 * Multi-select field
 */
export interface MultiselectFieldDefinition extends BaseFieldDefinition {
  type: 'multiselect';
  options: SelectOption[];
  minSelections?: number;
  maxSelections?: number;
}

/**
 * Radio button group field
 */
export interface RadioFieldDefinition extends BaseFieldDefinition {
  type: 'radio';
  options: SelectOption[];
  layout?: 'vertical' | 'horizontal';
}

/**
 * Checkbox field (single)
 */
export interface CheckboxFieldDefinition extends BaseFieldDefinition {
  type: 'checkbox';
  checkboxLabel?: string;
}

/**
 * Checkbox group field (multiple)
 */
export interface CheckboxGroupFieldDefinition extends BaseFieldDefinition {
  type: 'checkbox_group';
  options: SelectOption[];
  minSelections?: number;
  maxSelections?: number;
  layout?: 'vertical' | 'horizontal' | 'grid';
}

/**
 * Date picker field
 */
export interface DateFieldDefinition extends BaseFieldDefinition {
  type: 'date';
  minDate?: string;
  maxDate?: string;
  disablePast?: boolean;
  disableFuture?: boolean;
}

/**
 * Time picker field
 */
export interface TimeFieldDefinition extends BaseFieldDefinition {
  type: 'time';
  minTime?: string;
  maxTime?: string;
  minuteStep?: number;
}

/**
 * Signature pad field
 */
export interface SignatureFieldDefinition extends BaseFieldDefinition {
  type: 'signature';
  penColor?: string;
  backgroundColor?: string;
}

/**
 * Photo capture field
 */
export interface PhotoFieldDefinition extends BaseFieldDefinition {
  type: 'photo';
  multiple?: boolean;
  maxCount?: number;
  maxSizeMB?: number;
  allowCamera?: boolean;
  allowGallery?: boolean;
  captureGPS?: boolean;
}

/**
 * GPS capture field
 */
export interface GPSFieldDefinition extends BaseFieldDefinition {
  type: 'gps';
  auto_capture?: boolean;
  showMap?: boolean;
}

/**
 * Rating field (stars or numeric)
 */
export interface RatingFieldDefinition extends BaseFieldDefinition {
  type: 'rating';
  max?: number;
  icon?: 'star' | 'heart' | 'thumb';
  allowHalf?: boolean;
}

/**
 * Slider field
 */
export interface SliderFieldDefinition extends BaseFieldDefinition {
  type: 'slider';
  min: number;
  max: number;
  step?: number;
  showValue?: boolean;
  unit?: string;
}

/**
 * Yes/No toggle field
 */
export interface YesNoFieldDefinition extends BaseFieldDefinition {
  type: 'yes_no';
  yesLabel?: string;
  noLabel?: string;
}

/**
 * Yes/No/N/A field
 */
export interface YesNoNAFieldDefinition extends BaseFieldDefinition {
  type: 'yes_no_na';
  yesLabel?: string;
  noLabel?: string;
  naLabel?: string;
}

/**
 * Worker select field (company roster picker)
 */
export interface WorkerSelectFieldDefinition extends BaseFieldDefinition {
  type: 'worker_select';
  filterByRole?: string[];
  filterByJobsite?: boolean;
  multiple?: boolean;
}

/**
 * Jobsite select field
 */
export interface JobsiteSelectFieldDefinition extends BaseFieldDefinition {
  type: 'jobsite_select';
  showInactive?: boolean;
}

/**
 * Checklist field (pass/fail/na items)
 */
export interface ChecklistFieldDefinition extends BaseFieldDefinition {
  type: 'checklist';
  items: ChecklistItem[];
  allowNotes?: boolean;
  allowNA?: boolean;
}

/**
 * Risk matrix field (likelihood x severity)
 */
export interface RiskMatrixFieldDefinition extends BaseFieldDefinition {
  type: 'risk_matrix';
  likelihoodLabels?: string[];
  severityLabels?: string[];
}

/**
 * Weather conditions field
 */
export interface WeatherFieldDefinition extends BaseFieldDefinition {
  type: 'weather';
  includeWind?: boolean;
  includePrecipitation?: boolean;
}

/**
 * Temperature input field
 */
export interface TemperatureFieldDefinition extends BaseFieldDefinition {
  type: 'temperature';
  unit?: 'celsius' | 'fahrenheit';
  min?: number;
  max?: number;
}

/**
 * PPE checklist field
 */
export interface PPEChecklistFieldDefinition extends BaseFieldDefinition {
  type: 'ppe_checklist';
  items?: ChecklistItem[];
}

/**
 * Body diagram field (injury location picker)
 */
export interface BodyDiagramFieldDefinition extends BaseFieldDefinition {
  type: 'body_diagram';
  allowMultiple?: boolean;
  showFrontBack?: boolean;
}

/**
 * Section header field
 */
export interface SectionFieldDefinition extends BaseFieldDefinition {
  type: 'section';
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

/**
 * Instructions field (read-only text)
 */
export interface InstructionsFieldDefinition extends BaseFieldDefinition {
  type: 'instructions';
  content: string;
  variant?: 'info' | 'warning' | 'danger';
}

/**
 * Repeater field (repeatable group of fields)
 */
export interface RepeaterFieldDefinition extends BaseFieldDefinition {
  type: 'repeater';
  fields: FieldDefinition[];
  minItems?: number;
  maxItems?: number;
  addButtonLabel?: string;
  itemLabel?: string;
}

/**
 * Union type of all field definitions
 */
export type FieldDefinition =
  | TextFieldDefinition
  | TextareaFieldDefinition
  | NumberFieldDefinition
  | SelectFieldDefinition
  | MultiselectFieldDefinition
  | RadioFieldDefinition
  | CheckboxFieldDefinition
  | CheckboxGroupFieldDefinition
  | DateFieldDefinition
  | TimeFieldDefinition
  | SignatureFieldDefinition
  | PhotoFieldDefinition
  | GPSFieldDefinition
  | RatingFieldDefinition
  | SliderFieldDefinition
  | YesNoFieldDefinition
  | YesNoNAFieldDefinition
  | WorkerSelectFieldDefinition
  | JobsiteSelectFieldDefinition
  | ChecklistFieldDefinition
  | RiskMatrixFieldDefinition
  | WeatherFieldDefinition
  | TemperatureFieldDefinition
  | PPEChecklistFieldDefinition
  | BodyDiagramFieldDefinition
  | SectionFieldDefinition
  | InstructionsFieldDefinition
  | RepeaterFieldDefinition
  | BaseFieldDefinition; // Fallback for generic fields

// =============================================================================
// FORM SCHEMA
// =============================================================================

/**
 * Section within a form
 */
export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: string[]; // Field IDs in this section
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

/**
 * Form schema structure
 */
export interface FormSchema {
  fields: FieldDefinition[];
  sections?: FormSection[];
}

// =============================================================================
// FORM TEMPLATE SETTINGS
// =============================================================================

/**
 * Settings for form behavior
 */
export interface FormTemplateSettings {
  require_signature?: boolean;
  require_gps?: boolean;
  allow_photos?: boolean;
  max_photos?: number;
  auto_save_interval?: number; // milliseconds
  allow_draft?: boolean;
  require_supervisor_signature?: boolean;
  offline_enabled?: boolean;
  sync_priority?: 1 | 2 | 3 | 4 | 5;
  auto_submit_on_complete?: boolean;
  show_progress?: boolean;
  allow_edit_after_submit?: boolean;
}

// =============================================================================
// FORM TEMPLATE
// =============================================================================

/**
 * Complete form template structure
 */
export interface FormTemplate {
  id: string;
  company_id: string | null; // null = system template
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  cor_element?: string;
  audit_category?: string;
  schema: FormSchema;
  validation_rules?: Record<string, unknown>;
  conditional_logic?: FieldCondition[];
  default_values?: Record<string, unknown>;
  settings: FormTemplateSettings;
  status: FormTemplateStatus;
  version: number;
  published_at?: string;
  published_by?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// =============================================================================
// FORM DATA & VALUES
// =============================================================================

/**
 * GPS coordinates
 */
export interface GPSCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
}

/**
 * Photo attachment data
 */
export interface PhotoData {
  id: string;
  data: string; // base64
  mimeType: string;
  filename?: string;
  size?: number;
  capturedAt?: string;
  gps?: GPSCoordinates;
}

/**
 * Repeater item data
 */
export interface RepeaterItemData {
  _id: string; // Unique ID for the item
  [fieldId: string]: unknown;
}

/**
 * Form values type (flexible to accommodate any field)
 */
export type FormValues = Record<string, 
  | string 
  | number 
  | boolean 
  | string[] 
  | GPSCoordinates 
  | PhotoData[]
  | ChecklistItemResult[]
  | RepeaterItemData[]
  | null
  | undefined
>;

// =============================================================================
// FORM CONTEXT
// =============================================================================

/**
 * Context data available to form during rendering
 */
export interface FormContext {
  companyId: string;
  workerId?: string;
  workerName?: string;
  jobsites?: Array<{ id: string; name: string }>;
  workers?: Array<{ id: string; first_name: string; last_name: string; position?: string }>;
  equipment?: Array<{ id: string; name: string; type: string }>;
  isOnline: boolean;
  currentDate: string;
  currentTime: string;
  gpsCoordinates?: GPSCoordinates;
}

// =============================================================================
// FORM STATE
// =============================================================================

/**
 * Form submission status
 */
export type FormSubmissionStatus = 'draft' | 'submitted' | 'synced' | 'failed';

/**
 * Form state for the renderer
 */
export interface FormState {
  values: FormValues;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValidating: boolean;
  isDirty: boolean;
  status: FormSubmissionStatus;
  formId?: string;
  lastSavedAt?: string;
}


