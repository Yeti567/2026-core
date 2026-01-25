/**
 * Document Control System Types
 * Comprehensive types matching the database schema
 */

// ============================================================================
// ENUMS (matching database types)
// ============================================================================

export type DocumentTypeCode = 
  | 'POL'   // Policy
  | 'SWP'   // Safe Work Procedure
  | 'SJP'   // Safe Job Procedure
  | 'FRM'   // Form
  | 'CHK'   // Checklist
  | 'WI'    // Work Instruction
  | 'PRC'   // Process
  | 'MAN'   // Manual
  | 'PLN'   // Plan
  | 'REG'   // Register
  | 'TRN'   // Training Material
  | 'RPT'   // Report
  | 'MIN'   // Minutes
  | 'CRT'   // Certificate
  | 'DWG'   // Drawing
  | 'AUD';  // Audit Document

export type DocumentStatus = 
  | 'draft'
  | 'pending_review'
  | 'under_review'
  | 'approved'
  | 'active'
  | 'under_revision'
  | 'obsolete'
  | 'archived';

export type DocumentChangeType = 
  | 'initial'
  | 'minor_edit'
  | 'major_revision'
  | 'complete_rewrite';

export type ArchiveReason = 
  | 'superseded'
  | 'obsolete'
  | 'expired'
  | 'regulatory_change'
  | 'manual';

export type ApprovalStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'skipped'
  | 'delegated';

export type ReviewStatus = 
  | 'scheduled'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'cancelled';

export type ReviewOutcome = 
  | 'no_change'
  | 'minor_update'
  | 'major_revision'
  | 'obsolete'
  | 'extend_review';

export type DistributionMethod = 
  | 'email'
  | 'in_person'
  | 'posted'
  | 'system_notification'
  | 'training_session';

// ============================================================================
// DISPLAY LABELS
// ============================================================================

export const DOCUMENT_TYPE_LABELS: Record<DocumentTypeCode, string> = {
  POL: 'Policy',
  SWP: 'Safe Work Procedure',
  SJP: 'Safe Job Procedure',
  FRM: 'Form',
  CHK: 'Checklist',
  WI: 'Work Instruction',
  PRC: 'Process',
  MAN: 'Manual',
  PLN: 'Plan',
  REG: 'Register',
  TRN: 'Training Material',
  RPT: 'Report',
  MIN: 'Minutes',
  CRT: 'Certificate',
  DWG: 'Drawing',
  AUD: 'Audit Document',
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  under_review: 'Under Review',
  approved: 'Approved',
  active: 'Active',
  under_revision: 'Under Revision',
  obsolete: 'Obsolete',
  archived: 'Archived',
};

export const CHANGE_TYPE_LABELS: Record<DocumentChangeType, string> = {
  initial: 'Initial Version',
  minor_edit: 'Minor Edit',
  major_revision: 'Major Revision',
  complete_rewrite: 'Complete Rewrite',
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  skipped: 'Skipped',
  delegated: 'Delegated',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  scheduled: 'Scheduled',
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

export const REVIEW_OUTCOME_LABELS: Record<ReviewOutcome, string> = {
  no_change: 'No Change Required',
  minor_update: 'Minor Updates Made',
  major_revision: 'Major Revision Required',
  obsolete: 'Mark as Obsolete',
  extend_review: 'Extend Review Period',
};

export type ReviewFrequency = 1 | 3 | 6 | 12 | 24 | 36;

export const REVIEW_FREQUENCY_LABELS: Record<ReviewFrequency, string> = {
  1: 'Monthly',
  3: 'Quarterly',
  6: 'Semi-Annually',
  12: 'Annually',
  24: 'Every 2 Years',
  36: 'Every 3 Years',
};

// ============================================================================
// STATUS COLORS
// ============================================================================

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, { bg: string; text: string; border: string }> = {
  draft: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' },
  pending_review: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  under_review: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  approved: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  active: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  under_revision: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  obsolete: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
  archived: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
};

export const APPROVAL_STATUS_COLORS: Record<ApprovalStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  approved: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  rejected: { bg: 'bg-rose-500/20', text: 'text-rose-400' },
  skipped: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
  delegated: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
};

export const REVIEW_STATUS_COLORS: Record<ReviewStatus, { bg: string; text: string }> = {
  scheduled: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
  pending: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  in_progress: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  overdue: { bg: 'bg-rose-500/20', text: 'text-rose-400' },
  cancelled: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
};

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Document Type Configuration
 */
export interface DocumentType {
  code: DocumentTypeCode;
  name: string;
  description?: string;
  requires_approval: boolean;
  approval_roles?: string[];
  review_frequency_months?: number;
  prefix_format: string;
  is_active: boolean;
  sort_order: number;
  icon?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Main Document Record
 */
export interface Document {
  id: string;
  company_id: string;
  
  // Control Information
  control_number: string;
  document_type_code: DocumentTypeCode;
  sequence_number: number;
  
  // Document Metadata
  title: string;
  description?: string;
  version: string;
  status: DocumentStatus;
  
  // File Information
  file_path?: string;
  file_name?: string;
  file_size_bytes?: number;
  file_type?: string;
  page_count?: number;
  
  // Search Content
  extracted_text?: string;
  
  // Ownership & Timestamps
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Approval
  approved_by?: string;
  approved_at?: string;
  approval_notes?: string;
  
  // Effective Dates
  effective_date?: string;
  expiry_date?: string;
  
  // Review Schedule
  next_review_date?: string;
  last_reviewed_at?: string;
  reviewed_by?: string;
  
  // Version Chain
  supersedes_document_id?: string;
  superseded_by_document_id?: string;
  
  // Classification
  tags: string[];
  cor_elements: number[];
  applicable_to: string[];
  department?: string;
  category?: string;
  
  // Folder Organization
  folder_id?: string;
  folder_path?: string;
  
  // Enhanced Metadata
  keywords?: string[];
  applicable_to_roles?: string[];
  is_critical?: boolean;
  worker_must_acknowledge?: boolean;
  acknowledgment_deadline_days?: number;
  search_rank?: number;
  view_count?: number;
  last_viewed_at?: string;
  
  // Related Documents
  related_document_ids?: string[];
  supersedes_control_number?: string;
  superseded_by_control_number?: string;
  
  // Audit Trail
  audit_trail?: AuditTrailEntry[];
}

/**
 * Audit Trail Entry
 */
export interface AuditTrailEntry {
  action: string;
  by?: string;
  at: string;
  from_status?: string;
  to_status?: string;
  from_version?: string;
  to_version?: string;
  linked_count?: number;
  [key: string]: unknown;
}

/**
 * Document Revision Record
 */
export interface DocumentRevision {
  id: string;
  document_id: string;
  company_id: string;
  
  version: string;
  revision_number: number;
  previous_version?: string;
  
  file_path?: string;
  file_name?: string;
  file_size_bytes?: number;
  
  change_type: DocumentChangeType;
  change_summary: string;
  change_details?: string;
  
  changed_by?: string;
  changed_at: string;
  
  metadata_snapshot?: Record<string, unknown>;
}

/**
 * Document Approval Record
 */
export interface DocumentApproval {
  id: string;
  document_id: string;
  company_id: string;
  
  approver_role: string;
  approver_id?: string;
  delegated_to?: string;
  
  approval_order: number;
  required: boolean;
  
  status: ApprovalStatus;
  
  approved_at?: string;
  rejection_reason?: string;
  approval_comments?: string;
  
  signature_data?: string;
  signature_type?: string;
  
  notified_at?: string;
  reminder_sent_at?: string;
  
  created_at: string;
  updated_at: string;
}

/**
 * Document Review Record
 */
export interface DocumentReview {
  id: string;
  document_id: string;
  company_id: string;
  
  review_due_date: string;
  review_type: string;
  
  review_assigned_to?: string;
  review_assigned_at?: string;
  
  review_status: ReviewStatus;
  
  review_started_at?: string;
  review_completed_at?: string;
  
  review_outcome?: ReviewOutcome;
  reviewer_notes?: string;
  action_items?: string[];
  
  next_review_date?: string;
  
  reminder_sent_at?: string;
  escalation_sent_at?: string;
  
  created_at: string;
  updated_at: string;
}

/**
 * Document Distribution Record
 */
export interface DocumentDistribution {
  id: string;
  document_id: string;
  company_id: string;
  
  distributed_to: string;
  worker_id?: string;
  
  distributed_at: string;
  distributed_by?: string;
  distribution_method: DistributionMethod;
  distribution_notes?: string;
  
  acknowledged: boolean;
  acknowledged_at?: string;
  acknowledgment_method?: string;
  acknowledgment_signature?: string;
  
  quiz_required: boolean;
  quiz_passed?: boolean;
  quiz_score?: number;
  quiz_completed_at?: string;
  
  reminder_count: number;
  last_reminder_at?: string;
  
  created_at: string;
}

/**
 * Document Archive Record
 */
export interface DocumentArchive {
  id: string;
  document_id?: string;
  company_id: string;
  
  control_number: string;
  document_type_code: DocumentTypeCode;
  title: string;
  description?: string;
  version: string;
  
  file_path?: string;
  file_name?: string;
  file_size_bytes?: number;
  extracted_text?: string;
  
  archived_at: string;
  archived_by?: string;
  archive_reason: ArchiveReason;
  archive_notes?: string;
  
  retention_period_years: number;
  can_be_destroyed_after?: string;
  destruction_hold: boolean;
  destruction_hold_reason?: string;
  
  original_created_at?: string;
  original_created_by?: string;
  original_approved_at?: string;
  original_approved_by?: string;
  
  metadata_snapshot: Record<string, unknown>;
  
  created_at: string;
}

// ============================================================================
// EXPANDED TYPES (with relations)
// ============================================================================

export interface DocumentWithType extends Document {
  document_type?: DocumentType;
}

export interface DocumentWithApprovals extends Document {
  approvals?: DocumentApproval[];
  total_approvals_required?: number;
  approvals_received?: number;
  fully_approved?: boolean;
}

export interface DocumentWithRevisions extends Document {
  revisions?: DocumentRevision[];
}

export interface DocumentWithDistributions extends Document {
  distributions?: DocumentDistribution[];
}

export interface DocumentFull extends Document {
  document_type?: DocumentType;
  approvals?: DocumentApproval[];
  revisions?: DocumentRevision[];
  reviews?: DocumentReview[];
  distributions?: DocumentDistribution[];
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface CreateDocumentInput {
  document_type_code: DocumentTypeCode;
  title: string;
  description?: string;
  tags?: string[];
  cor_elements?: number[];
  applicable_to?: string[];
  department?: string;
  category?: string;
  effective_date?: string;
  expiry_date?: string;
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string;
  tags?: string[];
  cor_elements?: number[];
  applicable_to?: string[];
  department?: string;
  category?: string;
  effective_date?: string;
  expiry_date?: string;
}

export interface CreateRevisionInput {
  document_id: string;
  change_type: DocumentChangeType;
  change_summary: string;
  change_details?: string;
}

export interface SubmitApprovalInput {
  approval_id: string;
  status: 'approved' | 'rejected';
  comments?: string;
  signature_data?: string;
  signature_type?: string;
  rejection_reason?: string;
}

export interface CreateReviewInput {
  document_id: string;
  review_due_date: string;
  review_type?: string;
  review_assigned_to?: string;
}

export interface CompleteReviewInput {
  review_id: string;
  review_outcome: ReviewOutcome;
  reviewer_notes?: string;
  action_items?: string[];
  next_review_date?: string;
}

export interface CreateDistributionInput {
  document_id: string;
  distributed_to: string[];
  distribution_method: DistributionMethod;
  distribution_notes?: string;
  quiz_required?: boolean;
}

export interface AcknowledgeDistributionInput {
  distribution_id: string;
  acknowledgment_method?: string;
  acknowledgment_signature?: string;
  quiz_score?: number;
}

// ============================================================================
// SEARCH & FILTER TYPES
// ============================================================================

export interface DocumentSearchParams {
  query?: string;
  document_type_code?: DocumentTypeCode;
  status?: DocumentStatus | DocumentStatus[];
  cor_elements?: number[];
  tags?: string[];
  department?: string;
  applicable_to?: string;
  review_due_before?: string;
  effective_after?: string;
  created_after?: string;
  created_before?: string;
  limit?: number;
  offset?: number;
}

export interface DocumentSearchResult {
  id: string;
  control_number: string;
  title: string;
  description?: string;
  document_type_code: DocumentTypeCode;
  document_type_name?: string;
  version: string;
  status: DocumentStatus;
  relevance_rank?: number;
  headline?: string;
}

// ============================================================================
// STATS & REPORTING TYPES
// ============================================================================

export interface DocumentRegistryStats {
  total_documents: number;
  by_status: Record<DocumentStatus, number>;
  by_type: Record<DocumentTypeCode, number>;
  reviews_due_30_days: number;
  reviews_overdue: number;
  pending_approvals: number;
  unacknowledged_distributions: number;
  recently_updated: number;
}

export interface ReviewDueDocument {
  document_id: string;
  control_number: string;
  title: string;
  document_type: string;
  next_review_date: string;
  days_until_review: number;
  review_status: 'overdue' | 'due_soon' | 'scheduled';
  assigned_to?: string;
}

export interface ApprovalStatusSummary {
  document_id: string;
  control_number: string;
  title: string;
  status: DocumentStatus;
  version: string;
  total_approvals_required: number;
  approvals_received: number;
  rejections: number;
  pending_approvals: number;
  fully_approved: boolean;
  first_approval_at?: string;
  last_approval_at?: string;
}

export interface UnacknowledgedDistribution {
  id: string;
  document_id: string;
  control_number: string;
  title: string;
  distributed_to: string;
  user_id: string;
  distributed_at: string;
  days_since_distribution: number;
}

// ============================================================================
// COR INTEGRATION TYPES
// ============================================================================

export interface DocumentCORLink {
  document_id: string;
  cor_element: number;
  relevance_score?: number;
  link_type: 'manual' | 'auto' | 'ai_suggested';
  created_at: string;
}

export interface CORElementEvidence {
  element_number: number;
  element_name: string;
  required_document_types: DocumentTypeCode[];
  found_documents: Document[];
  missing_types: DocumentTypeCode[];
  coverage_percentage: number;
  status: 'complete' | 'partial' | 'missing';
}

// ============================================================================
// FOLDER TYPES
// ============================================================================

export type FolderType = 
  | 'general'
  | 'policies'
  | 'procedures'
  | 'swp'
  | 'forms'
  | 'training'
  | 'manual'
  | 'emergency';

export interface DocumentFolder {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  color: string;
  parent_folder_id?: string;
  path: string;
  depth: number;
  is_system_folder: boolean;
  folder_type: FolderType;
  folder_code?: string;
  linked_document_types: DocumentTypeCode[];
  linked_cor_elements: number[];
  default_document_type?: DocumentTypeCode;
  sort_order: number;
  is_visible: boolean;
  is_active: boolean;
  accessible_to: string[];
  document_count?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Document Acknowledgment Record
 */
export interface DocumentAcknowledgment {
  id: string;
  document_id: string;
  company_id: string;
  worker_id: string;
  required_by_date?: string;
  acknowledged_at?: string;
  acknowledgment_method: 'digital_signature' | 'checkbox' | 'training_session';
  signature_data?: string;
  notes?: string;
  status: 'pending' | 'acknowledged' | 'overdue' | 'exempt';
  reminder_count: number;
  last_reminder_at?: string;
  created_at: string;
  updated_at: string;
}

export const ACKNOWLEDGMENT_STATUS_LABELS: Record<DocumentAcknowledgment['status'], string> = {
  pending: 'Pending',
  acknowledged: 'Acknowledged',
  overdue: 'Overdue',
  exempt: 'Exempt',
};

export const ACKNOWLEDGMENT_STATUS_COLORS: Record<DocumentAcknowledgment['status'], { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  acknowledged: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  overdue: { bg: 'bg-rose-500/20', text: 'text-rose-400' },
  exempt: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
};

export interface FolderTreeNode extends DocumentFolder {
  children: FolderTreeNode[];
  documents?: Document[];
}

export const FOLDER_TYPE_CONFIG: Record<FolderType, { 
  label: string; 
  icon: string; 
  color: string; 
  documentTypes: DocumentTypeCode[];
}> = {
  general: { label: 'General', icon: 'folder', color: '#64748b', documentTypes: [] },
  policies: { label: 'Policies', icon: 'scroll', color: '#6366f1', documentTypes: ['POL'] },
  procedures: { label: 'Procedures', icon: 'clipboard-list', color: '#8b5cf6', documentTypes: ['PRC'] },
  swp: { label: 'Safe Work Procedures', icon: 'shield-check', color: '#10b981', documentTypes: ['SWP', 'SJP', 'WI'] },
  forms: { label: 'Forms & Templates', icon: 'file-text', color: '#f59e0b', documentTypes: ['FRM', 'CHK'] },
  training: { label: 'Training Materials', icon: 'graduation-cap', color: '#ec4899', documentTypes: ['TRN'] },
  manual: { label: 'Health & Safety Manual', icon: 'book-open', color: '#0ea5e9', documentTypes: ['MAN'] },
  emergency: { label: 'Emergency Procedures', icon: 'alert-triangle', color: '#ef4444', documentTypes: ['PLN'] },
};

// ============================================================================
// BULK UPLOAD TYPES
// ============================================================================

export interface BulkUploadFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  progress: number;
  error?: string;
  suggestedMetadata?: SuggestedMetadata;
  document?: Document;
}

// ============================================================================
// EXTENDED HISTORY TYPES
// ============================================================================

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: string;
  revision_number: number;
  change_type: DocumentChangeType;
  change_summary: string;
  changed_by?: string;
  changed_by_name?: string;
  changed_at: string;
  file_path?: string;
  file_name?: string;
  file_size_bytes?: number;
  is_current?: boolean;
  status?: DocumentStatus;
  created_at?: string;
  change_reason?: string;
  // Workflow timestamps
  prepared_at?: string;
  reviewed_at?: string;
  approved_at?: string;
  approved_by?: string;
  published_at?: string;
}

export interface DocumentChangeHistory {
  id: string;
  document_id: string;
  action: string;
  description: string;
  performed_by?: string;
  performed_by_name?: string;
  performed_at: string;
  changed_at?: string;
  previous_value?: string;
  new_value?: string;
  old_value?: string;
  field_changed?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentAuditLink {
  id: string;
  document_id: string;
  cor_element: number;
  audit_element_number?: number;
  relevance_score: number;
  confidence_score?: number;
  link_type: 'manual' | 'auto' | 'ai_suggested';
  linked_by?: string;
  linked_at: string;
}

export interface DocumentWithHistory extends Document {
  versions?: DocumentVersion[];
  change_history?: DocumentChangeHistory[];
  audit_links?: DocumentAuditLink[];
  current_version?: string;
  review_frequency_months?: number;
}

export interface DocumentWithVersion extends Document {
  current_version?: string;
  latest_version?: DocumentVersion;
}

export interface SuggestedMetadata {
  title: string;
  document_type_code: DocumentTypeCode;
  folder_id?: string;
  tags: string[];
  cor_elements: number[];
  applicable_to: string[];
  confidence: number;
  extractedControlNumber?: string;
}

export interface MetadataSuggestionRules {
  filenamePatterns: {
    pattern: RegExp;
    document_type: DocumentTypeCode;
    tags?: string[];
    cor_elements?: number[];
  }[];
  contentPatterns: {
    keywords: string[];
    document_type: DocumentTypeCode;
    tags?: string[];
    cor_elements?: number[];
  }[];
}