/**
 * AuditSoft Integration Types
 * 
 * Type definitions for the AuditSoft API integration.
 */

// =============================================================================
// DATABASE TYPES
// =============================================================================

export interface AuditSoftConnection {
  id: string;
  company_id: string;
  api_key: string; // Encrypted
  api_endpoint: string;
  organization_id: string | null;
  audit_id: string | null;
  connection_status: ConnectionStatus;
  last_validated_at: string | null;
  last_sync_at: string | null;
  last_sync_status: SyncStatus | null;
  last_sync_error: string | null;
  sync_enabled: boolean;
  sync_frequency: SyncFrequency;
  audit_scheduled_date: string | null;
  audit_status: AuditStatus;
  auditor_name: string | null;
  auditor_email: string | null;
  total_items_synced: number;
  last_export_summary: ExportSummary;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface AuditSoftSyncLog {
  id: string;
  company_id: string;
  connection_id: string | null;
  sync_type: SyncType;
  sync_trigger: SyncTrigger;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  status: SyncLogStatus;
  items_attempted: number;
  items_succeeded: number;
  items_failed: number;
  error_details: SyncError[];
  sync_details: SyncDetails;
  initiated_by: string | null;
}

export interface AuditSoftItemMapping {
  id: string;
  company_id: string;
  internal_item_type: InternalItemType;
  internal_item_id: string;
  auditsoft_item_id: string;
  auditsoft_item_type: string | null;
  cor_element: number | null;
  audit_question_id: string | null;
  synced_at: string;
  last_updated_at: string | null;
  sync_status: ItemSyncStatus;
  sync_error: string | null;
}

// =============================================================================
// ENUMS
// =============================================================================

export type ConnectionStatus = 'active' | 'invalid_key' | 'expired' | 'disconnected';
export type SyncStatus = 'success' | 'failed' | 'partial';
export type SyncFrequency = 'realtime' | 'daily' | 'manual';
export type AuditStatus = 'pending' | 'in_progress' | 'completed';
export type SyncType = 'full_export' | 'incremental' | 'single_item' | 'manual';
export type SyncTrigger = 'user_initiated' | 'auto_sync' | 'scheduled' | 'api_webhook';
export type SyncLogStatus = 'in_progress' | 'completed' | 'failed' | 'partial';
export type ItemSyncStatus = 'synced' | 'needs_update' | 'deleted' | 'failed';

export type InternalItemType = 
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

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  organization_id?: string;
  organization_name?: string;
  audit_id?: string;
  audit_scheduled_date?: string;
  auditor_name?: string;
  auditor_email?: string;
}

export interface AuditStructure {
  audit_id: string;
  name: string;
  elements: AuditElement[];
}

export interface AuditElement {
  number: number;
  name: string;
  weight: number;
  questions: AuditQuestion[];
}

export interface AuditQuestion {
  id: string;
  text: string;
  evidence_types: string[];
  required: boolean;
}

export interface EvidenceItem {
  audit_id?: string;
  cor_element: number;
  question_id: string;
  evidence_type: string;
  title: string;
  description?: string;
  date: string;
  file?: Blob | File;
  metadata?: Record<string, unknown>;
}

export interface UploadResult {
  success: boolean;
  auditsoft_item_id?: string;
  message?: string;
  error?: string;
}

export interface BulkUploadResult {
  total: number;
  succeeded: number;
  failed: number;
  results: UploadResult[];
  errors: Array<{ item: EvidenceItem; error: string }>;
}

export interface AuditStatusResponse {
  audit_id: string;
  status: AuditStatus;
  completion_percentage: number;
  elements_status: Array<{
    element: number;
    name: string;
    evidence_count: number;
    required_count: number;
    status: 'complete' | 'partial' | 'not_started';
  }>;
  scheduled_date: string | null;
  auditor_name: string | null;
}

// =============================================================================
// EXPORT SUMMARY TYPE
// =============================================================================

export interface ExportSummary {
  exported_at?: string;
  items_exported?: {
    form_submissions?: number;
    documents?: number;
    certifications?: number;
    maintenance_records?: number;
    training_records?: number;
    incident_reports?: number;
    meeting_minutes?: number;
    inspections?: number;
    hazard_assessments?: number;
    corrective_actions?: number;
  };
  elements_exported?: number[];
  date_range?: string;
  total_items?: number;
  duration_seconds?: number;
}

export interface SyncDetails {
  date_range?: {
    start: string;
    end: string;
  };
  elements?: number[];
  by_type?: Record<string, {
    attempted: number;
    succeeded: number;
    failed: number;
  }>;
}

export interface SyncError {
  item_type?: string;
  item_id?: string;
  error: string;
  timestamp: string;
}

// =============================================================================
// STATISTICS TYPE
// =============================================================================

export interface AuditSoftStats {
  is_connected: boolean;
  connection_status: ConnectionStatus | null;
  total_items_synced: number;
  last_sync_at: string | null;
  last_sync_status: SyncStatus | null;
  pending_sync_items: number;
  total_sync_operations: number;
  successful_syncs: number;
  failed_syncs: number;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface ConnectInput {
  api_key: string;
  api_endpoint?: string;
}

export interface ExportInput {
  date_range_start: string;
  date_range_end: string;
  elements?: number[];
  include_types?: InternalItemType[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const COR_ELEMENTS = [
  { number: 1, name: 'Management Leadership & Organizational Commitment', weight: 10 },
  { number: 2, name: 'Hazard Identification & Assessment', weight: 10 },
  { number: 3, name: 'Hazard Control', weight: 10 },
  { number: 4, name: 'Ongoing Inspections', weight: 5 },
  { number: 5, name: 'Qualifications, Orientation & Training', weight: 10 },
  { number: 6, name: 'Emergency Response', weight: 5 },
  { number: 7, name: 'Incident Investigation', weight: 10 },
  { number: 8, name: 'Program Administration', weight: 5 },
  { number: 9, name: 'Joint Health & Safety Committee/Representative', weight: 5 },
  { number: 10, name: 'Preventive Maintenance', weight: 5 },
  { number: 11, name: 'Occupational Health', weight: 10 },
  { number: 12, name: 'First Aid', weight: 5 },
  { number: 13, name: 'Health & Safety Statistics', weight: 5 },
  { number: 14, name: 'Legislation', weight: 5 },
] as const;

export const INTERNAL_ITEM_TYPE_LABELS: Record<InternalItemType, string> = {
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
