/**
 * Form Builder Types
 * 
 * TypeScript interfaces for the dynamic form builder system.
 * Maps to the database schema in 003_form_builder_system.sql
 */

// =============================================================================
// DATABASE TYPES
// =============================================================================

/**
 * Form template from database
 */
export interface FormTemplate {
  id: string;
  company_id: string | null;
  form_code: string;
  name: string;
  description: string | null;
  cor_element: number | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'as_needed' | 'per_shift';
  estimated_time_minutes: number;
  icon: string;
  color: string;
  version: number;
  is_active: boolean;
  is_mandatory: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Relations
  form_sections?: FormSection[];
  form_workflows?: FormWorkflow[];
}

/**
 * Form section from database
 */
export interface FormSection {
  id: string;
  form_template_id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_repeatable: boolean;
  min_repeats: number;
  max_repeats: number;
  conditional_logic: ConditionalLogic | null;
  created_at: string;
  // Relations
  form_fields?: FormField[];
}

/**
 * Library source types for dynamic data loading
 */
export type LibrarySource = 
  | 'hazards' 
  | 'equipment' 
  | 'tasks' 
  | 'workers' 
  | 'jobsites' 
  | 'sds'
  | 'legislation';

/**
 * Library filters for field data loading
 */
export interface LibraryFilters {
  category?: string;
  trade?: string;
  status?: string;
  is_active?: boolean;
  is_on_site?: boolean;
  jobsite_id?: string;
  [key: string]: string | boolean | undefined;
}

/**
 * Auto-populate field mapping
 */
export interface AutoPopulateMapping {
  /** Source field path in the library item */
  source_field: string;
  /** Target field code in the form */
  target_field: string;
  /** Optional transform type */
  transform?: 'join' | 'first' | 'count' | 'sum' | 'json';
}

/**
 * Form field from database
 */
export interface FormField {
  id: string;
  form_section_id: string;
  field_code: string;
  label: string;
  field_type: FieldType;
  placeholder: string | null;
  help_text: string | null;
  default_value: string | null;
  width: 'full' | 'half' | 'third' | 'quarter';
  options: FieldOption[] | string[] | null;
  validation_rules: ValidationRules;
  conditional_logic: ConditionalLogic | null;
  order_index: number;
  created_at: string;
  
  // Library integration fields
  /** Which library to fetch options from */
  library_source?: LibrarySource;
  /** Filters to apply when fetching library data */
  library_filters?: LibraryFilters;
  /** Fields to auto-populate when an item is selected */
  auto_populate_fields?: string[];
  /** Detailed auto-populate mappings (overrides auto_populate_fields) */
  auto_populate_mappings?: AutoPopulateMapping[];
  /** Allow user to quick-add new items to the library */
  allow_quick_add?: boolean;
  /** Use search/autocomplete mode for large lists */
  use_search_mode?: boolean;
  /** Minimum items before switching to search mode */
  search_mode_threshold?: number;
}

/**
 * Form workflow from database
 */
export interface FormWorkflow {
  id: string;
  form_template_id: string;
  submit_to_role: string | null;
  notify_roles: string[];
  notify_emails: string[];
  creates_task: boolean;
  task_template: TaskTemplate | null;
  requires_approval: boolean;
  approval_workflow: ApprovalStep[] | null;
  sync_priority: number;
  auto_create_evidence: boolean;
  evidence_audit_element: string | null;
  created_at: string;
}

/**
 * Form submission from database
 */
export interface FormSubmission {
  id: string;
  company_id: string;
  form_template_id: string;
  form_number: string;
  submitted_by: string | null;
  submitted_at: string | null;
  jobsite_id: string | null;
  form_data: Record<string, unknown>;
  attachments: FormAttachments;
  gps_latitude: number | null;
  gps_longitude: number | null;
  gps_accuracy: number | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'archived';
  approval_chain: ApprovalAction[];
  synced: boolean;
  sync_attempts: number;
  last_sync_error: string | null;
  local_id: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// FIELD TYPES
// =============================================================================

/**
 * All supported field types
 */
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
  | 'multi_signature'
  | 'photo'
  | 'file'
  | 'gps'
  | 'worker_select'
  | 'jobsite_select'
  | 'equipment_select'
  | 'hazard_select'
  | 'hazard_multiselect'
  | 'task_select'
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

/**
 * Field option (for dropdowns, radios, etc.)
 */
export interface FieldOption {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validation rules for a field
 */
export interface ValidationRules {
  required?: boolean;
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  pattern?: string;
  min_date?: string;
  max_date?: string;
  allowed_extensions?: string[];
  max_file_size_mb?: number;
  custom_message?: string;
}

// =============================================================================
// CONDITIONAL LOGIC
// =============================================================================

/**
 * Conditional logic for showing/hiding fields or sections
 */
export interface ConditionalLogic {
  field_id: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: string | number | boolean | null;
}

// =============================================================================
// WORKFLOW
// =============================================================================

/**
 * Task template for auto-created tasks
 */
export interface TaskTemplate {
  title: string;
  description?: string;
  assigned_to_role: string;
  due_days: number;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Approval workflow step
 */
export interface ApprovalStep {
  step: number;
  role: string;
  required: boolean;
}

/**
 * Approval action record
 */
export interface ApprovalAction {
  user_id: string;
  action: 'approved' | 'rejected';
  timestamp: string;
  notes?: string;
}

// =============================================================================
// ATTACHMENTS
// =============================================================================

/**
 * Form attachments structure
 */
export interface FormAttachments {
  photos: PhotoAttachment[];
  signatures: Record<string, string>; // field_code: base64
  files: FileAttachment[];
}

/**
 * Photo attachment
 */
export interface PhotoAttachment {
  field_code: string;
  data: string; // base64
  filename?: string;
  timestamp?: string;
}

/**
 * File attachment
 */
export interface FileAttachment {
  field_code: string;
  url?: string;
  data?: string; // base64
  name: string;
  size: number;
  type: string;
}

// =============================================================================
// FORM RENDERER TYPES
// =============================================================================

/**
 * Props for the DynamicFormRenderer component
 */
export interface FormRendererProps {
  /** Form template ID to load */
  formTemplateId: string;
  /** Company ID for context */
  companyId: string;
  /** Current user ID */
  userId?: string;
  /** Initial data (for editing drafts) */
  initialData?: Record<string, unknown>;
  /** Mode: create new, edit existing, or view only */
  mode: 'create' | 'edit' | 'view';
  /** Jobsite context (optional) */
  jobsiteId?: string;
  /** Callback when form is submitted */
  onSubmit: (data: FormSubmissionData) => Promise<void>;
  /** Callback when draft is saved */
  onSaveDraft?: (data: Record<string, unknown>) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Custom class name */
  className?: string;
}

/**
 * Data structure for form submission
 */
export interface FormSubmissionData {
  form_template_id: string;
  form_data: Record<string, unknown>;
  attachments: FormAttachments;
  gps_coordinates?: { lat: number; lng: number; accuracy?: number };
  jobsite_id?: string;
  status: 'draft' | 'submitted';
}

/**
 * Field value type (flexible)
 */
export type FieldValue = 
  | string 
  | number 
  | boolean 
  | string[] 
  | null 
  | undefined
  | Record<string, unknown>;

/**
 * Form values object
 */
export type FormValues = Record<string, FieldValue>;

/**
 * Form state for the renderer
 */
export interface FormState {
  values: FormValues;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  isDirty: boolean;
  lastSavedAt?: string;
  completionPercentage: number;
}

/**
 * Repeatable section instance
 */
export interface SectionInstance {
  instanceId: string;
  sectionId: string;
  values: FormValues;
  index: number;
}

// =============================================================================
// CONTEXT DATA
// =============================================================================

/**
 * Worker data for worker_select fields
 */
export interface Worker {
  id: string;
  first_name: string;
  last_name: string;
  position?: string;
  email?: string;
}

/**
 * Jobsite data for jobsite_select fields
 */
export interface Jobsite {
  id: string;
  name: string;
  address?: string;
  is_active?: boolean;
}

/**
 * Equipment data for equipment_select fields
 */
export interface Equipment {
  id: string;
  name: string;
  type: string;
  serial_number?: string;
}

/**
 * Hazard category enum
 */
export type HazardCategory =
  | 'physical'
  | 'chemical'
  | 'biological'
  | 'ergonomic'
  | 'psychosocial'
  | 'electrical'
  | 'mechanical'
  | 'fall'
  | 'struck_by'
  | 'caught_in'
  | 'environmental'
  | 'fire_explosion'
  | 'confined_space'
  | 'radiation'
  | 'other';

/**
 * Risk level enum
 */
export type RiskLevel = 'negligible' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Control measure structure
 */
export interface HazardControl {
  type: 'elimination' | 'substitution' | 'engineering' | 'administrative' | 'ppe';
  control: string;
  required: boolean;
}

/**
 * Hazard data for hazard_select fields
 */
export interface Hazard {
  id: string;
  hazard_code: string;
  name: string;
  description: string | null;
  category: HazardCategory;
  subcategory: string | null;
  applicable_trades: string[];
  applicable_activities: string[];
  default_severity: number;
  default_likelihood: number;
  default_risk_score: number;
  default_risk_level: RiskLevel;
  recommended_controls: HazardControl[];
  required_ppe: string[];
  regulatory_references: Array<{ regulation: string; section: string; title: string }>;
  is_active: boolean;
  is_global: boolean;
}

/**
 * Task hazard mapping
 */
export interface TaskHazardMapping {
  hazard_id: string;
  hazard_name: string;
  risk_level: RiskLevel;
}

/**
 * Task data for task_select fields
 */
export interface Task {
  id: string;
  task_code: string;
  name: string;
  description: string | null;
  category: string;
  trade: string;
  typical_duration_hours: number | null;
  crew_size_min: number | null;
  crew_size_max: number | null;
  procedure_steps: string[];
  hazards: TaskHazardMapping[];
  required_equipment: string[];
  required_certifications: string[];
  ppe_required: string[];
  is_active: boolean;
  is_global: boolean;
}

/**
 * Context data available to the form renderer
 */
export interface FormContext {
  companyId: string;
  userId?: string;
  workers: Worker[];
  jobsites: Jobsite[];
  equipment: Equipment[];
  hazards: Hazard[];
  tasks: Task[];
  isOnline: boolean;
}

// =============================================================================
// EXPORTS
// =============================================================================
