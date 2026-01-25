/**
 * AuditSoft Integration Types
 * 
 * Type definitions for the AuditSoft API integration system.
 */

// =============================================================================
// API CREDENTIALS
// =============================================================================

export interface AuditSoftCredentials {
  id: string;
  company_id: string;
  api_key_hint: string | null;
  environment: 'sandbox' | 'production';
  is_valid: boolean;
  last_validated_at: string | null;
  audit_company_id: string | null;
  audit_company_name: string | null;
  audit_schedule: AuditSchedule;
  auto_sync_enabled: boolean;
  sync_frequency: 'manual' | 'daily' | 'realtime';
  created_at: string;
  updated_at: string;
}

export interface AuditSchedule {
  next_audit_date?: string;
  audit_type?: 'internal' | 'external' | 'certification';
  auditor_name?: string;
  auditor_email?: string;
  notes?: string;
}

export interface CredentialsInsert {
  company_id: string;
  api_key: string;
  environment?: 'sandbox' | 'production';
}

// =============================================================================
// EVIDENCE MAPPINGS
// =============================================================================

export type EvidenceSource = 
  | 'form_submission'
  | 'document'
  | 'certification'
  | 'training_record'
  | 'maintenance_record'
  | 'incident_report'
  | 'meeting_minutes'
  | 'inspection'
  | 'hazard_assessment'
  | 'corrective_action';

export interface EvidenceMapping {
  id: string;
  company_id: string;
  cor_element: number;
  evidence_source: EvidenceSource;
  source_id: string | null;
  auditsoft_question_id: string | null;
  auditsoft_category: string | null;
  mapping_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EvidenceMappingInsert {
  company_id?: string;
  cor_element: number;
  evidence_source: EvidenceSource;
  source_id?: string | null;
  auditsoft_question_id?: string | null;
  auditsoft_category?: string | null;
  mapping_notes?: string | null;
  is_active?: boolean;
}

// =============================================================================
// EXPORT JOBS
// =============================================================================

export type ExportJobStatus = 
  | 'pending'
  | 'validating'
  | 'exporting'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ExportType = 'full' | 'incremental' | 'selective';

export interface ExportJob {
  id: string;
  company_id: string;
  status: ExportJobStatus;
  export_type: ExportType;
  date_range_start: string | null;
  date_range_end: string | null;
  elements_selected: number[];
  total_items: number;
  processed_items: number;
  success_count: number;
  error_count: number;
  forms_exported: number;
  documents_exported: number;
  certifications_exported: number;
  training_records_exported: number;
  maintenance_records_exported: number;
  incidents_exported: number;
  auditsoft_batch_id: string | null;
  error_log: ExportError[];
  export_summary: ExportSummary;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ExportError {
  item_type: EvidenceSource;
  item_id: string;
  error: string;
  timestamp: string;
}

export interface ExportSummary {
  duration_ms?: number;
  total_size_bytes?: number;
  by_element?: Record<number, number>;
  by_type?: Record<EvidenceSource, number>;
}

export interface ExportJobInsert {
  company_id?: string;
  export_type: ExportType;
  date_range_start?: string;
  date_range_end?: string;
  elements_selected?: number[];
}

// =============================================================================
// EXPORTED ITEMS
// =============================================================================

export interface ExportedItem {
  id: string;
  company_id: string;
  export_job_id: string | null;
  item_type: EvidenceSource;
  item_id: string;
  cor_element: number | null;
  auditsoft_item_id: string | null;
  auditsoft_status: string | null;
  exported_at: string;
  last_synced_at: string | null;
  sync_error: string | null;
  metadata: Record<string, unknown>;
}

// =============================================================================
// SYNC EVENTS
// =============================================================================

export type SyncEventType = 
  | 'item_created'
  | 'item_updated'
  | 'item_deleted'
  | 'sync_triggered'
  | 'sync_completed'
  | 'sync_failed'
  | 'webhook_received';

export type SyncEventStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SyncEvent {
  id: string;
  company_id: string;
  event_type: SyncEventType;
  item_type: string | null;
  item_id: string | null;
  status: SyncEventStatus;
  payload: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

// =============================================================================
// API RESPONSE TYPES (Mock AuditSoft API responses)
// =============================================================================

export interface AuditSoftValidationResponse {
  success: boolean;
  company_id?: string;
  company_name?: string;
  schedule?: AuditSchedule;
  error?: string;
}

export interface AuditSoftUploadResponse {
  success: boolean;
  batch_id?: string;
  items_received?: number;
  errors?: Array<{
    item_id: string;
    error: string;
  }>;
}

export interface AuditSoftQuestion {
  id: string;
  element: number;
  category: string;
  question_text: string;
  evidence_types: string[];
}

// =============================================================================
// EXPORT PREVIEW TYPES
// =============================================================================

export interface ExportPreview {
  total_items: number;
  by_type: {
    form_submissions: number;
    documents: number;
    certifications: number;
    training_records: number;
    maintenance_records: number;
  };
  by_element: Record<number, number>;
  date_range: {
    start: string;
    end: string;
  };
  estimated_time_seconds: number;
}

// =============================================================================
// STATS TYPES
// =============================================================================

export interface ExportStats {
  total_exports: number;
  successful_exports: number;
  failed_exports: number;
  total_items_exported: number;
  last_export_at: string | null;
  is_connected: boolean;
}

// =============================================================================
// COR ELEMENTS REFERENCE
// =============================================================================

export const COR_ELEMENTS = [
  { number: 1, name: 'Management Leadership & Organizational Commitment' },
  { number: 2, name: 'Hazard Identification & Assessment' },
  { number: 3, name: 'Hazard Control' },
  { number: 4, name: 'Ongoing Inspections' },
  { number: 5, name: 'Qualifications, Orientation & Training' },
  { number: 6, name: 'Emergency Response' },
  { number: 7, name: 'Incident Investigation' },
  { number: 8, name: 'Program Administration' },
  { number: 9, name: 'Joint Health & Safety Committee/Representative' },
  { number: 10, name: 'Preventive Maintenance' },
  { number: 11, name: 'Occupational Health' },
  { number: 12, name: 'First Aid' },
  { number: 13, name: 'Health & Safety Statistics' },
  { number: 14, name: 'Legislation' },
] as const;

export const EVIDENCE_SOURCE_LABELS: Record<EvidenceSource, string> = {
  form_submission: 'Form Submissions',
  document: 'Documents',
  certification: 'Certifications',
  training_record: 'Training Records',
  maintenance_record: 'Maintenance Records',
  incident_report: 'Incident Reports',
  meeting_minutes: 'Meeting Minutes',
  inspection: 'Inspections',
  hazard_assessment: 'Hazard Assessments',
  corrective_action: 'Corrective Actions',
};
