/**
 * Query Result Types with Relations
 * 
 * Types for Supabase queries that include joined relations.
 * These types prevent the need for `as any` casts when accessing joined data.
 */

// =============================================================================
// BASE TYPES (minimal interfaces for relations)
// =============================================================================

export interface FormTemplate {
  id: string;
  name: string;
  code?: string | null;
  cor_elements?: number[];
  [key: string]: unknown;
}

export interface CertificationType {
  id: string;
  certification_name: string;
  [key: string]: unknown;
}

export interface DocumentFolder {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface EquipmentInventory {
  id: string;
  equipment_code: string;
  name: string;
  [key: string]: unknown;
}

export interface MaintenanceAttachment {
  id: string;
  attachment_type: string;
  file_path: string;
  [key: string]: unknown;
}

export interface UserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  employee_number?: string | null;
  [key: string]: unknown;
}

// =============================================================================
// FORM SUBMISSION WITH RELATIONS
// =============================================================================

export interface FormSubmissionWithRelations {
  id: string;
  company_id: string;
  worker_id: string | null;
  form_template_id: string | null;
  form_data: Record<string, unknown>;
  status: string;
  submitted_at: string;
  created_at: string;
  form_templates: FormTemplate | null;
  user_profiles: UserProfile | null;
}

// =============================================================================
// CERTIFICATION WITH RELATIONS
// =============================================================================

export interface CertificationWithRelations {
  id: string;
  company_id: string;
  worker_id: string;
  certification_type_id: string | null;
  certification_name: string;
  issue_date: string | null;
  expiry_date: string | null;
  file_path: string | null;
  certificate_file_path?: string | null;
  certificate_number?: string | null;
  verified: boolean;
  created_at: string;
  user_profiles: UserProfile | null;
  certification_types: CertificationType | null;
}

// =============================================================================
// DOCUMENT WITH RELATIONS
// =============================================================================

export interface DocumentWithRelations {
  id: string;
  company_id: string;
  control_number: string;
  title: string;
  document_type_code: string | null;
  status: string | null;
  folder_id: string | null;
  description?: string | null;
  effective_date?: string | null;
  cor_elements?: number[];
  created_at: string;
  document_folders: DocumentFolder | null;
}

// =============================================================================
// MAINTENANCE RECORD WITH RELATIONS
// =============================================================================

export interface MaintenanceRecordWithRelations {
  id: string;
  company_id: string;
  equipment_id: string | null;
  record_type: string;
  maintenance_date: string;
  description: string | null;
  created_at: string;
  equipment_inventory: EquipmentInventory | null;
  maintenance_attachments: MaintenanceAttachment[] | null;
}

// =============================================================================
// TRAINING RECORD WITH RELATIONS
// =============================================================================

export interface TrainingRecordWithRelations {
  id: string;
  company_id: string;
  worker_id: string;
  training_type_id: string | null;
  training_name: string;
  training_topic?: string | null;
  training_type?: string | null;
  training_date?: string | null;
  duration_hours?: number | null;
  completion_date: string | null;
  expiry_date: string | null;
  created_at: string;
  user_profiles: UserProfile | null;
}

// =============================================================================
// INSPECTION WITH RELATIONS
// =============================================================================

export interface InspectionWithRelations {
  id: string;
  company_id: string;
  worker_id: string | null;
  form_template_id: string | null;
  inspection_date: string;
  location: string | null;
  photos?: string[] | null;
  created_at: string;
  form_templates: FormTemplate | null;
  user_profiles: UserProfile | null;
}

// =============================================================================
// INCIDENT WITH RELATIONS
// =============================================================================

export interface IncidentWithRelations {
  id: string;
  company_id: string;
  worker_id: string | null;
  form_template_id: string | null;
  incident_date: string;
  severity: string | null;
  location: string | null;
  photos?: string[] | null;
  created_at: string;
  form_templates: FormTemplate | null;
  user_profiles: UserProfile | null;
}

// =============================================================================
// MAINTENANCE SCHEDULE WITH RELATIONS
// =============================================================================

export interface MaintenanceScheduleWithRelations {
  id: string;
  company_id: string;
  equipment_id: string | null;
  maintenance_type: string;
  scheduled_date: string;
  status: string;
  created_at: string;
  equipment: EquipmentInventory | null;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isFormSubmissionWithRelations(
  data: unknown
): data is FormSubmissionWithRelations {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'form_templates' in data &&
    'user_profiles' in data
  );
}

export function isCertificationWithRelations(
  data: unknown
): data is CertificationWithRelations {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'user_profiles' in data &&
    'certification_types' in data
  );
}

export function isDocumentWithRelations(
  data: unknown
): data is DocumentWithRelations {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'document_folders' in data
  );
}

export function isMaintenanceRecordWithRelations(
  data: unknown
): data is MaintenanceRecordWithRelations {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'equipment_inventory' in data
  );
}
