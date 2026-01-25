/**
 * Document Control Service
 * 
 * Core service for managing documents in the registry:
 * - CRUD operations for documents
 * - Version management with revision tracking
 * - Approval workflow management
 * - Scheduled reviews
 * - Distribution and acknowledgment tracking
 * - Archive management
 */

import { createClient } from '@/lib/supabase/server';
import type {
  Document,
  DocumentType,
  DocumentRevision,
  DocumentApproval,
  DocumentReview,
  DocumentDistribution,
  DocumentArchive,
  DocumentFull,
  DocumentWithApprovals,
  CreateDocumentInput,
  UpdateDocumentInput,
  CreateRevisionInput,
  SubmitApprovalInput,
  CreateReviewInput,
  CompleteReviewInput,
  CreateDistributionInput,
  AcknowledgeDistributionInput,
  DocumentSearchParams,
  DocumentSearchResult,
  DocumentRegistryStats,
  ReviewDueDocument,
  ApprovalStatusSummary,
  DocumentStatus,
  DocumentTypeCode,
  DocumentChangeType,
  ArchiveReason,
} from './types';

// ============================================================================
// TYPE HELPERS FOR SUPABASE RELATIONS
// ============================================================================

/**
 * Type for documents relation from Supabase join
 */
interface DocumentRelation {
  status?: DocumentStatus;
  company_id?: string;
  control_number?: string;
  title?: string;
  document_type_code?: DocumentTypeCode;
  effective_date?: string;
  audit_trail?: unknown[];
}

/**
 * Helper to safely extract relation data from Supabase join queries.
 * Handles both single object and array results from nested selects.
 */
function getRelation<T>(data: unknown): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return (data[0] as T) || null;
  return data as T;
}

// ============================================================================
// DOCUMENT TYPE OPERATIONS
// ============================================================================

/**
 * Gets all active document types
 */
export async function getDocumentTypes(): Promise<DocumentType[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('document_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw new Error(`Failed to fetch document types: ${error.message}`);
  return data || [];
}

/**
 * Gets a single document type by code
 */
export async function getDocumentType(code: string): Promise<DocumentType | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('document_types')
    .select('*')
    .eq('code', code)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch document type: ${error.message}`);
  }
  return data;
}

// ============================================================================
// DOCUMENT CRUD OPERATIONS
// ============================================================================

/**
 * Creates a new document with auto-generated control number
 */
export async function createDocument(
  companyId: string,
  input: CreateDocumentInput,
  userId: string
): Promise<Document> {
  const supabase = await createClient();

  // Generate control number using database function
  const { data: controlNumber, error: ctrlError } = await supabase
    .rpc('generate_control_number', {
      p_company_id: companyId,
      p_doc_type_code: input.document_type_code,
    });

  if (ctrlError || !controlNumber) {
    throw new Error(`Failed to generate control number: ${ctrlError?.message || 'Unknown error'}`);
  }

  // Parse sequence number from control number
  const seqMatch = controlNumber.match(/(\d+)$/);
  const sequenceNumber = seqMatch ? parseInt(seqMatch[1], 10) : 1;

  // Get review frequency from document type
  const docType = await getDocumentType(input.document_type_code);
  const reviewMonths = docType?.review_frequency_months || 12;

  // Calculate next review date
  const effectiveDate = input.effective_date ? new Date(input.effective_date) : new Date();
  const nextReviewDate = new Date(effectiveDate);
  nextReviewDate.setMonth(nextReviewDate.getMonth() + reviewMonths);

  // Create the document
  const { data, error } = await supabase
    .from('documents')
    .insert({
      company_id: companyId,
      control_number: controlNumber,
      document_type_code: input.document_type_code,
      sequence_number: sequenceNumber,
      title: input.title,
      description: input.description,
      version: '1.0',
      status: 'draft',
      tags: input.tags || [],
      cor_elements: input.cor_elements || [],
      applicable_to: input.applicable_to || ['all_workers'],
      department: input.department,
      category: input.category,
      effective_date: input.effective_date,
      expiry_date: input.expiry_date,
      next_review_date: nextReviewDate.toISOString().split('T')[0],
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create document: ${error.message}`);

  // Create initial approval workflow if required
  if (docType?.requires_approval && docType.approval_roles?.length) {
    await createApprovalWorkflow(data.id, companyId, docType.approval_roles);
  }

  return data;
}

/**
 * Gets a document by ID
 */
export async function getDocumentById(documentId: string): Promise<Document | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch document: ${error.message}`);
  }
  return data;
}

/**
 * Gets a document by control number
 */
export async function getDocumentByControlNumber(
  controlNumber: string
): Promise<Document | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('control_number', controlNumber)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch document: ${error.message}`);
  }
  return data;
}

/**
 * Gets a document with all related data
 */
export async function getDocumentFull(documentId: string): Promise<DocumentFull | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      document_type:document_types(*),
      approvals:document_approvals(*),
      revisions:document_revisions(*),
      reviews:document_reviews(*),
      distributions:document_distributions(*)
    `)
    .eq('id', documentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch document: ${error.message}`);
  }
  return data;
}

/**
 * Updates a document
 */
export async function updateDocument(
  documentId: string,
  input: UpdateDocumentInput
): Promise<Document> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.cor_elements !== undefined) updateData.cor_elements = input.cor_elements;
  if (input.applicable_to !== undefined) updateData.applicable_to = input.applicable_to;
  if (input.department !== undefined) updateData.department = input.department;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.effective_date !== undefined) updateData.effective_date = input.effective_date;
  if (input.expiry_date !== undefined) updateData.expiry_date = input.expiry_date;

  const { data, error } = await supabase
    .from('documents')
    .update(updateData)
    .eq('id', documentId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update document: ${error.message}`);
  return data;
}

/**
 * Lists documents with filtering
 */
export async function listDocuments(
  companyId: string,
  params?: DocumentSearchParams
): Promise<{ documents: Document[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from('documents')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId);

  // Apply filters
  if (params?.document_type_code) {
    query = query.eq('document_type_code', params.document_type_code);
  }
  if (params?.status) {
    if (Array.isArray(params.status)) {
      query = query.in('status', params.status);
    } else {
      query = query.eq('status', params.status);
    }
  }
  if (params?.department) {
    query = query.eq('department', params.department);
  }
  if (params?.cor_elements?.length) {
    query = query.overlaps('cor_elements', params.cor_elements);
  }
  if (params?.tags?.length) {
    query = query.overlaps('tags', params.tags);
  }
  if (params?.applicable_to) {
    query = query.contains('applicable_to', [params.applicable_to]);
  }
  if (params?.review_due_before) {
    query = query.lte('next_review_date', params.review_due_before);
  }
  if (params?.query) {
    query = query.or(`title.ilike.%${params.query}%,control_number.ilike.%${params.query}%,description.ilike.%${params.query}%`);
  }

  // Pagination
  const limit = params?.limit || 50;
  const offset = params?.offset || 0;
  query = query.range(offset, offset + limit - 1);
  query = query.order('updated_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to list documents: ${error.message}`);
  return { documents: data || [], total: count || 0 };
}

// ============================================================================
// REVISION MANAGEMENT
// ============================================================================

/**
 * Creates a new revision of a document
 */
export async function createRevision(
  input: CreateRevisionInput,
  userId: string
): Promise<{ document: Document; revision: DocumentRevision }> {
  const supabase = await createClient();

  // Get current document
  const document = await getDocumentById(input.document_id);
  if (!document) throw new Error('Document not found');

  // Calculate new version
  const { data: newVersion, error: verError } = await supabase
    .rpc('increment_version', {
      p_current_version: document.version,
      p_change_type: input.change_type,
    });

  if (verError) throw new Error(`Failed to increment version: ${verError.message}`);

  // Get next revision number
  const { data: revNum } = await supabase
    .rpc('get_next_revision_number', { p_document_id: input.document_id });

  // Create revision record (stores old version)
  const { data: revision, error: revError } = await supabase
    .from('document_revisions')
    .insert({
      document_id: input.document_id,
      company_id: document.company_id,
      version: document.version,
      revision_number: revNum || 1,
      previous_version: document.version,
      file_path: document.file_path,
      file_name: document.file_name,
      file_size_bytes: document.file_size_bytes,
      change_type: input.change_type,
      change_summary: input.change_summary,
      change_details: input.change_details,
      changed_by: userId,
      metadata_snapshot: {
        title: document.title,
        description: document.description,
        status: document.status,
        tags: document.tags,
      },
    })
    .select()
    .single();

  if (revError) throw new Error(`Failed to create revision: ${revError.message}`);

  // Update document with new version
  const { data: updatedDoc, error: updateError } = await supabase
    .from('documents')
    .update({
      version: newVersion,
      status: 'under_revision',
    })
    .eq('id', input.document_id)
    .select()
    .single();

  if (updateError) throw new Error(`Failed to update document: ${updateError.message}`);

  return { document: updatedDoc, revision };
}

/**
 * Gets all revisions for a document
 */
export async function getDocumentRevisions(
  documentId: string
): Promise<DocumentRevision[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('document_revisions')
    .select('*')
    .eq('document_id', documentId)
    .order('revision_number', { ascending: false });

  if (error) throw new Error(`Failed to fetch revisions: ${error.message}`);
  return data || [];
}

// ============================================================================
// APPROVAL WORKFLOW
// ============================================================================

/**
 * Creates approval workflow for a document
 */
export async function createApprovalWorkflow(
  documentId: string,
  companyId: string,
  approvalRoles: string[]
): Promise<DocumentApproval[]> {
  const supabase = await createClient();

  const approvals = approvalRoles.map((role, index) => ({
    document_id: documentId,
    company_id: companyId,
    approver_role: role,
    approval_order: index + 1,
    required: true,
    status: 'pending',
  }));

  const { data, error } = await supabase
    .from('document_approvals')
    .insert(approvals)
    .select();

  if (error) throw new Error(`Failed to create approval workflow: ${error.message}`);
  return data || [];
}

/**
 * Gets approvals for a document
 */
export async function getDocumentApprovals(
  documentId: string
): Promise<DocumentApproval[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('document_approvals')
    .select('*')
    .eq('document_id', documentId)
    .order('approval_order');

  if (error) throw new Error(`Failed to fetch approvals: ${error.message}`);
  return data || [];
}

/**
 * Submits an approval decision
 */
export async function submitApproval(
  input: SubmitApprovalInput,
  userId: string
): Promise<DocumentApproval> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    status: input.status,
    approver_id: userId,
    approved_at: new Date().toISOString(),
    approval_comments: input.comments,
  };

  if (input.signature_data) {
    updateData.signature_data = input.signature_data;
    updateData.signature_type = input.signature_type || 'drawn';
  }

  if (input.status === 'rejected' && input.rejection_reason) {
    updateData.rejection_reason = input.rejection_reason;
  }

  const { data, error } = await supabase
    .from('document_approvals')
    .update(updateData)
    .eq('id', input.approval_id)
    .select()
    .single();

  if (error) throw new Error(`Failed to submit approval: ${error.message}`);

  // Check if all required approvals are complete
  const approval = data;
  const allApprovals = await getDocumentApprovals(approval.document_id);
  const requiredApprovals = allApprovals.filter(a => a.required);
  const allApproved = requiredApprovals.every(a => a.status === 'approved');
  const anyRejected = requiredApprovals.some(a => a.status === 'rejected');

  // Update document status based on approval outcome
  if (allApproved) {
    await updateDocumentStatus(approval.document_id, 'approved', userId);
  } else if (anyRejected) {
    await updateDocumentStatus(approval.document_id, 'draft', userId);
  }

  return data;
}

/**
 * Gets documents pending approval for a user
 */
export async function getPendingApprovals(
  companyId: string,
  approverRole?: string
): Promise<DocumentWithApprovals[]> {
  const supabase = await createClient();

  let query = supabase
    .from('document_approval_status')
    .select('*')
    .eq('company_id', companyId);

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch pending approvals: ${error.message}`);
  return (data || []) as unknown as DocumentWithApprovals[];
}

// ============================================================================
// REVIEW MANAGEMENT
// ============================================================================

/**
 * Creates a scheduled review
 */
export async function createReview(
  input: CreateReviewInput,
  userId: string
): Promise<DocumentReview> {
  const supabase = await createClient();

  const document = await getDocumentById(input.document_id);
  if (!document) throw new Error('Document not found');

  const { data, error } = await supabase
    .from('document_reviews')
    .insert({
      document_id: input.document_id,
      company_id: document.company_id,
      review_due_date: input.review_due_date,
      review_type: input.review_type || 'scheduled',
      review_assigned_to: input.review_assigned_to,
      review_assigned_at: input.review_assigned_to ? new Date().toISOString() : null,
      review_status: 'scheduled',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create review: ${error.message}`);
  return data;
}

/**
 * Completes a document review
 */
export async function completeReview(
  input: CompleteReviewInput,
  userId: string
): Promise<DocumentReview> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('document_reviews')
    .update({
      review_status: 'completed',
      review_completed_at: new Date().toISOString(),
      review_outcome: input.review_outcome,
      reviewer_notes: input.reviewer_notes,
      action_items: input.action_items,
      next_review_date: input.next_review_date,
    })
    .eq('id', input.review_id)
    .select()
    .single();

  if (error) throw new Error(`Failed to complete review: ${error.message}`);

  // Update document's last reviewed and next review dates
  const review = data;
  await supabase
    .from('documents')
    .update({
      last_reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
      next_review_date: input.next_review_date,
    })
    .eq('id', review.document_id);

  return data;
}

/**
 * Gets documents due for review
 */
export async function getDocumentsDueForReview(
  companyId: string,
  daysAhead: number = 30
): Promise<ReviewDueDocument[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc('check_document_reviews', {
      p_company_id: companyId,
      p_days_ahead: daysAhead,
    });

  if (error) throw new Error(`Failed to fetch reviews: ${error.message}`);
  return data || [];
}

// ============================================================================
// DISTRIBUTION & ACKNOWLEDGMENT
// ============================================================================

/**
 * Distributes a document to users
 */
export async function distributeDocument(
  input: CreateDistributionInput,
  userId: string
): Promise<DocumentDistribution[]> {
  const supabase = await createClient();

  const document = await getDocumentById(input.document_id);
  if (!document) throw new Error('Document not found');

  const distributions = input.distributed_to.map(recipientId => ({
    document_id: input.document_id,
    company_id: document.company_id,
    distributed_to: recipientId,
    distributed_by: userId,
    distribution_method: input.distribution_method,
    distribution_notes: input.distribution_notes,
    quiz_required: input.quiz_required || false,
  }));

  const { data, error } = await supabase
    .from('document_distributions')
    .insert(distributions)
    .select();

  if (error) throw new Error(`Failed to distribute document: ${error.message}`);
  return data || [];
}

/**
 * Acknowledges receipt of a document
 */
export async function acknowledgeDistribution(
  input: AcknowledgeDistributionInput
): Promise<DocumentDistribution> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    acknowledged: true,
    acknowledged_at: new Date().toISOString(),
    acknowledgment_method: input.acknowledgment_method || 'checkbox',
  };

  if (input.acknowledgment_signature) {
    updateData.acknowledgment_signature = input.acknowledgment_signature;
  }

  if (input.quiz_score !== undefined) {
    updateData.quiz_passed = input.quiz_score >= 80;
    updateData.quiz_score = input.quiz_score;
    updateData.quiz_completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('document_distributions')
    .update(updateData)
    .eq('id', input.distribution_id)
    .select()
    .single();

  if (error) throw new Error(`Failed to acknowledge: ${error.message}`);
  return data;
}

/**
 * Gets unacknowledged distributions for a user
 */
export async function getUnacknowledgedDistributions(
  userId: string
): Promise<DocumentDistribution[]> {
  const supabase = await createClient();

  // Get user profile ID
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!profile) return [];

  const { data, error } = await supabase
    .from('document_distributions')
    .select(`
      *,
      document:documents(control_number, title)
    `)
    .eq('distributed_to', profile.id)
    .eq('acknowledged', false)
    .order('distributed_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch distributions: ${error.message}`);
  return data || [];
}

// ============================================================================
// STATUS TRANSITIONS
// ============================================================================

/**
 * Updates document status
 */
export async function updateDocumentStatus(
  documentId: string,
  newStatus: DocumentStatus,
  userId: string
): Promise<Document> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = { status: newStatus };

  // Add timestamps for specific statuses
  if (newStatus === 'approved') {
    updateData.approved_by = userId;
    updateData.approved_at = new Date().toISOString();
  }
  if (newStatus === 'active') {
    updateData.effective_date = new Date().toISOString().split('T')[0];
  }

  const { data, error } = await supabase
    .from('documents')
    .update(updateData)
    .eq('id', documentId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update status: ${error.message}`);
  return data;
}

/**
 * Submits document for review/approval
 */
export async function submitForReview(
  documentId: string,
  userId: string
): Promise<Document> {
  return updateDocumentStatus(documentId, 'pending_review', userId);
}

/**
 * Publishes/activates an approved document
 */
export async function activateDocument(
  documentId: string,
  userId: string
): Promise<Document> {
  const document = await getDocumentById(documentId);
  if (!document) throw new Error('Document not found');

  if (document.status !== 'approved') {
    throw new Error('Document must be approved before activation');
  }

  return updateDocumentStatus(documentId, 'active', userId);
}

// ============================================================================
// ARCHIVE OPERATIONS
// ============================================================================

/**
 * Archives a document
 */
export async function archiveDocument(
  documentId: string,
  reason: ArchiveReason,
  notes: string,
  userId: string
): Promise<DocumentArchive> {
  const supabase = await createClient();

  const { data: archiveId, error } = await supabase
    .rpc('archive_document', {
      p_document_id: documentId,
      p_archive_reason: reason,
      p_archive_notes: notes,
      p_archived_by: userId,
    });

  if (error) throw new Error(`Failed to archive document: ${error.message}`);

  // Fetch the created archive record
  const { data: archive } = await supabase
    .from('document_archive')
    .select('*')
    .eq('id', archiveId)
    .single();

  return archive;
}

/**
 * Gets archived documents
 */
export async function getArchivedDocuments(
  companyId: string
): Promise<DocumentArchive[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('document_archive')
    .select('*')
    .eq('company_id', companyId)
    .order('archived_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch archives: ${error.message}`);
  return data || [];
}

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Full-text search across documents
 */
export async function searchDocuments(
  companyId: string,
  query: string,
  options?: {
    status?: DocumentStatus[];
    documentTypes?: DocumentTypeCode[];
    corElements?: number[];
    limit?: number;
    offset?: number;
  }
): Promise<DocumentSearchResult[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc('search_documents', {
      p_company_id: companyId,
      p_search_query: query,
      p_status: options?.status || ['active', 'approved'],
      p_document_types: options?.documentTypes || null,
      p_cor_elements: options?.corElements || null,
      p_limit: options?.limit || 50,
      p_offset: options?.offset || 0,
    });

  if (error) throw new Error(`Search failed: ${error.message}`);
  return data || [];
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Gets document registry statistics
 */
export async function getRegistryStats(
  companyId: string
): Promise<DocumentRegistryStats> {
  const supabase = await createClient();

  // Get all documents for stats
  const { data: documents } = await supabase
    .from('documents')
    .select('status, document_type_code, next_review_date, updated_at')
    .eq('company_id', companyId);

  // Get pending approvals count
  const { count: pendingApprovals } = await supabase
    .from('document_approvals')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'pending');

  // Get unacknowledged distributions
  const { count: unacknowledged } = await supabase
    .from('document_distributions')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('acknowledged', false);

  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sevenDays = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const stats: DocumentRegistryStats = {
    total_documents: documents?.length || 0,
    by_status: {} as Record<DocumentStatus, number>,
    by_type: {} as Record<DocumentTypeCode, number>,
    reviews_due_30_days: 0,
    reviews_overdue: 0,
    pending_approvals: pendingApprovals || 0,
    unacknowledged_distributions: unacknowledged || 0,
    recently_updated: 0,
  };

  // Initialize counters
  const statuses: DocumentStatus[] = ['draft', 'pending_review', 'under_review', 'approved', 'active', 'under_revision', 'obsolete', 'archived'];
  // Safe: s is from statuses array of controlled DocumentStatus values
  // eslint-disable-next-line security/detect-object-injection
  statuses.forEach(s => stats.by_status[s] = 0);

  const types: DocumentTypeCode[] = ['POL', 'SWP', 'SJP', 'FRM', 'CHK', 'WI', 'PRC', 'MAN', 'PLN', 'REG', 'TRN', 'RPT', 'MIN', 'CRT', 'DWG', 'AUD'];
  // Safe: t is from types array of controlled DocumentTypeCode values
  // eslint-disable-next-line security/detect-object-injection
  types.forEach(t => stats.by_type[t] = 0);

  documents?.forEach(doc => {
    // Count by status
    // Safe: doc.status is from database query with controlled DocumentStatus enum

    if (stats.by_status[doc.status as DocumentStatus] !== undefined) {

      stats.by_status[doc.status as DocumentStatus]++;
    }

    // Count by type
    // Safe: doc.document_type_code is from database query with controlled DocumentTypeCode enum

    if (stats.by_type[doc.document_type_code as DocumentTypeCode] !== undefined) {

      stats.by_type[doc.document_type_code as DocumentTypeCode]++;
    }

    // Check review dates
    if (doc.next_review_date) {
      const reviewDate = new Date(doc.next_review_date);
      if (reviewDate < now) {
        stats.reviews_overdue++;
      } else if (reviewDate <= thirtyDays) {
        stats.reviews_due_30_days++;
      }
    }

    // Check recently updated
    if (new Date(doc.updated_at) >= sevenDays) {
      stats.recently_updated++;
    }
  });

  return stats;
}

// ============================================================================
// VERSION MANAGEMENT
// ============================================================================

/**
 * Document Version interface for version tracking
 */
export interface DocumentVersionRecord {
  id: string;
  document_id: string;
  version_number: string;
  is_current: boolean;
  status: DocumentStatus;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  change_summary?: string;
  change_reason?: string;
  created_by?: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
}

/**
 * Get all versions of a document
 */
export async function getDocumentVersions(documentId: string): Promise<DocumentVersionRecord[]> {
  const supabase = await createClient();

  // First get the document to check company access
  const { data: document } = await supabase
    .from('documents')
    .select('id')
    .eq('id', documentId)
    .single();

  if (!document) {
    throw new Error('Document not found');
  }

  // Get revisions as versions
  const { data, error } = await supabase
    .from('document_revisions')
    .select('*')
    .eq('document_id', documentId)
    .order('revision_number', { ascending: false });

  if (error) throw new Error(`Failed to get versions: ${error.message}`);

  // Map revisions to version format
  return (data || []).map(rev => ({
    id: rev.id,
    document_id: rev.document_id,
    version_number: rev.version,
    is_current: rev.revision_number === Math.max(...(data || []).map(r => r.revision_number)),
    status: 'draft' as DocumentStatus, // Versions don't have status, documents do
    file_path: rev.file_path,
    file_name: rev.file_name,
    file_size: rev.file_size_bytes,
    change_summary: rev.change_summary,
    change_reason: rev.change_details,
    created_by: rev.changed_by,
    created_at: rev.changed_at,
  }));
}

/**
 * Get a specific version by ID
 */
export async function getVersion(versionId: string): Promise<DocumentVersionRecord | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('document_revisions')
    .select('*, documents!inner(status)')
    .eq('id', versionId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    document_id: data.document_id,
    version_number: data.version,
    is_current: true, // We'd need additional logic to determine this
    status: getRelation<DocumentRelation>(data.documents)?.status || 'draft',
    file_path: data.file_path,
    file_name: data.file_name,
    file_size: data.file_size_bytes,
    change_summary: data.change_summary,
    change_reason: data.change_details,
    created_by: data.changed_by,
    created_at: data.changed_at,
  };
}

/**
 * Create a new version of a document
 */
export async function createVersion(
  input: {
    document_id: string;
    is_major?: boolean;
    change_summary: string;
    change_reason: string;
  },
  userId: string
): Promise<DocumentVersionRecord> {
  const supabase = await createClient();

  // Get the document and its current version
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('*, document_revisions(*)')
    .eq('id', input.document_id)
    .single();

  if (docError || !document) {
    throw new Error('Document not found');
  }

  // Calculate next version number
  const currentVersion = document.version || '1.0';
  const [major, minor] = currentVersion.split('.').map(Number);
  const nextVersion = input.is_major
    ? `${major + 1}.0`
    : `${major}.${minor + 1}`;

  // Get next revision number
  const revisions = document.document_revisions || [];
  const nextRevisionNumber = revisions.length > 0
    ? Math.max(...revisions.map((r: any) => r.revision_number)) + 1
    : 1;

  // Create the revision
  const { data: revision, error: revError } = await supabase
    .from('document_revisions')
    .insert({
      document_id: input.document_id,
      company_id: document.company_id,
      version: nextVersion,
      revision_number: nextRevisionNumber,
      previous_version: currentVersion,
      change_type: input.is_major ? 'major_revision' : 'minor_edit',
      change_summary: input.change_summary,
      change_details: input.change_reason,
      changed_by: userId,
      changed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (revError) throw new Error(`Failed to create version: ${revError.message}`);

  // Update the document's version
  await supabase
    .from('documents')
    .update({
      version: nextVersion,
      status: 'draft', // New version starts as draft
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.document_id);

  return {
    id: revision.id,
    document_id: revision.document_id,
    version_number: revision.version,
    is_current: true,
    status: 'draft',
    change_summary: revision.change_summary,
    change_reason: revision.change_details,
    created_by: revision.changed_by,
    created_at: revision.changed_at,
  };
}

/**
 * Transition a version/document to a new status
 */
export async function transitionStatus(
  versionId: string,
  newStatus: DocumentStatus,
  userId: string
): Promise<DocumentVersionRecord> {
  const supabase = await createClient();

  // Get the revision and its document
  const { data: revision, error: revError } = await supabase
    .from('document_revisions')
    .select('*, documents!inner(*)')
    .eq('id', versionId)
    .single();

  if (revError || !revision) {
    throw new Error('Version not found');
  }

  const document = getRelation<DocumentRelation>(revision.documents);

  if (!document) {
    throw new Error('Document relation not found');
  }

  const oldStatus = document.status;

  // Update the document status
  const updateData: any = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  // Set approved_by and approved_at if transitioning to approved
  if (newStatus === 'approved') {
    updateData.approved_by = userId;
    updateData.approved_at = new Date().toISOString();
  }

  // Set effective_date if transitioning to active
  if (newStatus === 'active' && !document.effective_date) {
    updateData.effective_date = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from('documents')
    .update(updateData)
    .eq('id', revision.document_id);

  if (updateError) throw new Error(`Failed to update status: ${updateError.message}`);

  // Log the transition in audit_trail
  const auditEntry = {
    action: 'status_change',
    by: userId,
    at: new Date().toISOString(),
    from_status: oldStatus,
    to_status: newStatus,
  };

  await supabase
    .from('documents')
    .update({
      audit_trail: [...(document?.audit_trail || []), auditEntry],
    })
    .eq('id', revision.document_id);

  return {
    id: revision.id,
    document_id: revision.document_id,
    version_number: revision.version,
    is_current: true,
    status: newStatus,
    change_summary: revision.change_summary,
    change_reason: revision.change_details,
    created_by: revision.changed_by,
    created_at: revision.changed_at,
    approved_by: newStatus === 'approved' ? userId : undefined,
    approved_at: newStatus === 'approved' ? new Date().toISOString() : undefined,
  };
}

// ============================================================================
// ARCHIVE VERSION MANAGEMENT
// ============================================================================

/**
 * Archive version record interface
 */
export interface ArchivedVersionRecord {
  id: string;
  document_id: string;
  version_number: string;
  archived_at: string;
  archived_by?: string;
  archive_reason: string;
  file_path?: string;
  file_name?: string;
}

/**
 * Get all archived versions for a document
 */
export async function getArchivedVersions(documentId: string): Promise<ArchivedVersionRecord[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('document_archives')
    .select('*')
    .eq('document_id', documentId)
    .order('archived_at', { ascending: false });

  if (error) throw new Error(`Failed to get archived versions: ${error.message}`);

  return (data || []).map(arch => ({
    id: arch.id,
    document_id: arch.document_id,
    version_number: arch.version,
    archived_at: arch.archived_at,
    archived_by: arch.archived_by,
    archive_reason: arch.archive_reason || arch.archive_notes,
    file_path: arch.file_path,
    file_name: arch.file_name,
  }));
}

/**
 * Get a specific archived version
 */
export async function getArchivedVersion(archiveId: string): Promise<ArchivedVersionRecord | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('document_archives')
    .select('*')
    .eq('id', archiveId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    document_id: data.document_id,
    version_number: data.version,
    archived_at: data.archived_at,
    archived_by: data.archived_by,
    archive_reason: data.archive_reason || data.archive_notes,
    file_path: data.file_path,
    file_name: data.file_name,
  };
}

/**
 * Archive a document version
 */
export async function archiveVersion(
  versionId: string,
  reason: string,
  userId: string
): Promise<ArchivedVersionRecord> {
  const supabase = await createClient();

  // Get the revision
  const { data: revision, error: revError } = await supabase
    .from('document_revisions')
    .select('*, documents!inner(company_id, control_number, title, document_type_code)')
    .eq('id', versionId)
    .single();

  if (revError || !revision) {
    throw new Error('Version not found');
  }

  const doc = getRelation<DocumentRelation>(revision.documents);

  if (!doc) {
    throw new Error('Document relation not found');
  }

  // Create archive record
  const { data: archive, error: archError } = await supabase
    .from('document_archives')
    .insert({
      document_id: revision.document_id,
      company_id: doc.company_id,
      control_number: doc.control_number,
      document_type_code: doc.document_type_code,
      title: doc.title,
      version: revision.version,
      file_path: revision.file_path,
      file_name: revision.file_name,
      file_size_bytes: revision.file_size_bytes,
      archived_at: new Date().toISOString(),
      archived_by: userId,
      archive_reason: 'superseded',
      archive_notes: reason,
      retention_period_years: 7, // Default retention
      metadata_snapshot: { revision },
    })
    .select()
    .single();

  if (archError) throw new Error(`Failed to archive version: ${archError.message}`);

  return {
    id: archive.id,
    document_id: archive.document_id,
    version_number: archive.version,
    archived_at: archive.archived_at,
    archived_by: archive.archived_by,
    archive_reason: reason,
    file_path: archive.file_path,
    file_name: archive.file_name,
  };
}

// ============================================================================
// DOCUMENT WITH HISTORY
// ============================================================================

/**
 * Get document with full history
 */
export async function getDocumentWithHistory(documentId: string) {
  const supabase = await createClient();

  const { data: document, error } = await supabase
    .from('documents')
    .select(`
      *,
      document_revisions(*),
      document_archives(*)
    `)
    .eq('id', documentId)
    .single();

  if (error) throw new Error(`Failed to get document: ${error.message}`);

  return {
    ...document,
    versions: document.document_revisions,
    archives: document.document_archives,
    current_version: document.version,
  };
}

/**
 * Mark document as obsolete
 */
export async function obsoleteDocument(documentId: string, userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('documents')
    .update({
      status: 'obsolete',
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .select()
    .single();

  if (error) throw new Error(`Failed to mark document obsolete: ${error.message}`);

  return data;
}