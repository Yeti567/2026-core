/**
 * AuditSoft Evidence Export Engine
 * 
 * Comprehensive export system to push all COR evidence to AuditSoft.
 * Handles form submissions, documents, certifications, maintenance records,
 * training records, meeting minutes, inspections, and incidents.
 */

import { createRouteHandlerClient } from '@/lib/supabase/server';
import { AuditSoftClient } from './client';
import { getDecryptedAPIKey, getAuditSoftConnection } from './connection';
import type { 
  EvidenceItem, 
  AuditSoftConnection,
  ExportSummary,
  SyncError,
} from './types';
import type {
  FormSubmissionWithRelations,
  CertificationWithRelations,
  DocumentWithRelations,
  MaintenanceRecordWithRelations,
  TrainingRecordWithRelations,
  InspectionWithRelations,
  IncidentWithRelations,
} from '@/lib/db/query-types';

// =============================================================================
// TYPES
// =============================================================================

export interface ExportOptions {
  /** User ID initiating the export */
  userId?: string;
  /** Only export items not already synced */
  incremental?: boolean;
  /** Filter by date range */
  dateRange?: {
    start: string;
    end: string;
  };
  /** Filter by specific COR elements (1-14) */
  elements?: number[];
  /** Filter by specific item types */
  includeTypes?: Array<
    | 'form_submissions'
    | 'documents'
    | 'certifications'
    | 'maintenance_records'
    | 'training_records'
    | 'meeting_minutes'
    | 'inspections'
    | 'incidents'
  >;
  /** Batch size for processing */
  batchSize?: number;
  /** Progress callback */
  onProgress?: (progress: ExportProgress) => void;
}

export interface ExportProgress {
  phase: string;
  current: number;
  total: number;
  percentage: number;
}

export interface ExportResult {
  success: boolean;
  total_items: number;
  succeeded: number;
  failed: number;
  duration_seconds: number;
  summary: ExportSummaryByType;
  errors: ExportError[];
  sync_log_id?: string;
}

export interface ExportSummaryByType {
  form_submissions: number;
  documents: number;
  certifications: number;
  maintenance_records: number;
  training_records: number;
  meeting_minutes: number;
  inspections: number;
  incidents: number;
}

export interface ExportError {
  item_type: string;
  item_id: string;
  item_name?: string;
  error: string;
  timestamp?: string;
}

interface TypeExportResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: ExportError[];
}

// =============================================================================
// MAIN EXPORT ORCHESTRATOR
// =============================================================================

/**
 * Export all evidence to AuditSoft
 * 
 * This is the main entry point for exporting all COR evidence.
 * It orchestrates the export of all data types and tracks progress.
 * 
 * @param companyId - The company's UUID
 * @param options - Export options (filters, incremental, etc.)
 * @returns Export result with summary and any errors
 */
export async function exportAllEvidenceToAuditSoft(
  companyId: string,
  options: ExportOptions = {}
): Promise<ExportResult> {
  const startTime = Date.now();
  const supabase = createRouteHandlerClient();

  // Get connection and API key
  const apiKey = await getDecryptedAPIKey(companyId);
  if (!apiKey) {
    throw new Error('AuditSoft not connected. Please connect your account first.');
  }

  const connection = await getAuditSoftConnection(companyId);
  if (!connection || connection.connection_status !== 'active') {
    throw new Error('AuditSoft connection is not active. Please reconnect.');
  }

  if (!connection.audit_id) {
    throw new Error('No audit ID configured. Please validate your connection.');
  }

  const client = new AuditSoftClient(apiKey, companyId, connection.api_endpoint);

  // Create sync log entry
  const { data: syncLog, error: syncLogError } = await supabase
    .from('auditsoft_sync_log')
    .insert({
      company_id: companyId,
      connection_id: connection.id,
      sync_type: options.incremental ? 'incremental' : 'full_export',
      sync_trigger: 'user_initiated',
      status: 'in_progress',
      initiated_by: options.userId,
      sync_details: {
        date_range: options.dateRange,
        elements: options.elements,
        include_types: options.includeTypes,
      },
    })
    .select()
    .single();

  if (syncLogError) {
    console.error('Failed to create sync log:', syncLogError);
    throw new Error('Failed to initialize export');
  }

  const exportSummary: ExportSummaryByType = {
    form_submissions: 0,
    documents: 0,
    certifications: 0,
    maintenance_records: 0,
    training_records: 0,
    meeting_minutes: 0,
    inspections: 0,
    incidents: 0,
  };

  const errors: ExportError[] = [];
  const includeTypes = options.includeTypes || [
    'form_submissions',
    'documents',
    'certifications',
    'maintenance_records',
    'training_records',
    'meeting_minutes',
    'inspections',
    'incidents',
  ];

  try {
    // 1. Export Form Submissions
    if (includeTypes.includes('form_submissions')) {
      options.onProgress?.({
        phase: 'Exporting form submissions...',
        current: 0,
        total: 8,
        percentage: 0,
      });
      
      const formResults = await exportFormSubmissions(
        companyId,
        connection.audit_id,
        client,
        options
      );
      exportSummary.form_submissions = formResults.succeeded;
      errors.push(...formResults.errors);
    }

    // 2. Export Documents
    if (includeTypes.includes('documents')) {
      options.onProgress?.({
        phase: 'Exporting documents...',
        current: 1,
        total: 8,
        percentage: 12.5,
      });
      
      const docResults = await exportDocuments(
        companyId,
        connection.audit_id,
        client,
        options
      );
      exportSummary.documents = docResults.succeeded;
      errors.push(...docResults.errors);
    }

    // 3. Export Worker Certifications
    if (includeTypes.includes('certifications')) {
      options.onProgress?.({
        phase: 'Exporting certifications...',
        current: 2,
        total: 8,
        percentage: 25,
      });
      
      const certResults = await exportCertifications(
        companyId,
        connection.audit_id,
        client,
        options
      );
      exportSummary.certifications = certResults.succeeded;
      errors.push(...certResults.errors);
    }

    // 4. Export Maintenance Records
    if (includeTypes.includes('maintenance_records')) {
      options.onProgress?.({
        phase: 'Exporting maintenance records...',
        current: 3,
        total: 8,
        percentage: 37.5,
      });
      
      const maintResults = await exportMaintenanceRecords(
        companyId,
        connection.audit_id,
        client,
        options
      );
      exportSummary.maintenance_records = maintResults.succeeded;
      errors.push(...maintResults.errors);
    }

    // 5. Export Training Records
    if (includeTypes.includes('training_records')) {
      options.onProgress?.({
        phase: 'Exporting training records...',
        current: 4,
        total: 8,
        percentage: 50,
      });
      
      const trainingResults = await exportTrainingRecords(
        companyId,
        connection.audit_id,
        client,
        options
      );
      exportSummary.training_records = trainingResults.succeeded;
      errors.push(...trainingResults.errors);
    }

    // 6. Export Meeting Minutes
    if (includeTypes.includes('meeting_minutes')) {
      options.onProgress?.({
        phase: 'Exporting meeting minutes...',
        current: 5,
        total: 8,
        percentage: 62.5,
      });
      
      const meetingResults = await exportMeetingMinutes(
        companyId,
        connection.audit_id,
        client,
        options
      );
      exportSummary.meeting_minutes = meetingResults.succeeded;
      errors.push(...meetingResults.errors);
    }

    // 7. Export Inspection Reports
    if (includeTypes.includes('inspections')) {
      options.onProgress?.({
        phase: 'Exporting inspections...',
        current: 6,
        total: 8,
        percentage: 75,
      });
      
      const inspectionResults = await exportInspections(
        companyId,
        connection.audit_id,
        client,
        options
      );
      exportSummary.inspections = inspectionResults.succeeded;
      errors.push(...inspectionResults.errors);
    }

    // 8. Export Incident Reports
    if (includeTypes.includes('incidents')) {
      options.onProgress?.({
        phase: 'Exporting incidents...',
        current: 7,
        total: 8,
        percentage: 87.5,
      });
      
      const incidentResults = await exportIncidents(
        companyId,
        connection.audit_id,
        client,
        options
      );
      exportSummary.incidents = incidentResults.succeeded;
      errors.push(...incidentResults.errors);
    }

    // Calculate totals
    const totalSucceeded = Object.values(exportSummary).reduce((a, b) => a + b, 0);
    const totalFailed = errors.length;
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);

    // Update sync log
    await supabase
      .from('auditsoft_sync_log')
      .update({
        status: totalFailed === 0 ? 'completed' : 'partial',
        completed_at: new Date().toISOString(),
        items_attempted: totalSucceeded + totalFailed,
        items_succeeded: totalSucceeded,
        items_failed: totalFailed,
        sync_details: {
          date_range: options.dateRange,
          elements: options.elements,
          by_type: exportSummary,
        },
        error_details: errors.length > 0 ? errors.map(e => ({
          item_type: e.item_type,
          item_id: e.item_id,
          error: e.error,
          timestamp: new Date().toISOString(),
        })) : null,
      })
      .eq('id', syncLog.id);

    // Update connection stats
    const lastExportSummary: ExportSummary = {
      exported_at: new Date().toISOString(),
      items_exported: {
        form_submissions: exportSummary.form_submissions,
        documents: exportSummary.documents,
        certifications: exportSummary.certifications,
        maintenance_records: exportSummary.maintenance_records,
        training_records: exportSummary.training_records,
        meeting_minutes: exportSummary.meeting_minutes,
        inspections: exportSummary.inspections,
      },
      elements_exported: options.elements || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      date_range: options.dateRange 
        ? `${options.dateRange.start} to ${options.dateRange.end}` 
        : 'all',
      total_items: totalSucceeded,
      duration_seconds: durationSeconds,
    };

    await supabase
      .from('auditsoft_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: totalFailed === 0 ? 'success' : 'partial',
        last_sync_error: totalFailed > 0 ? `${totalFailed} items failed to export` : null,
        total_items_synced: connection.total_items_synced + totalSucceeded,
        last_export_summary: lastExportSummary,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    options.onProgress?.({
      phase: 'Export complete!',
      current: 8,
      total: 8,
      percentage: 100,
    });

    return {
      success: totalFailed === 0,
      total_items: totalSucceeded + totalFailed,
      succeeded: totalSucceeded,
      failed: totalFailed,
      duration_seconds: durationSeconds,
      summary: exportSummary,
      errors,
      sync_log_id: syncLog.id,
    };
  } catch (error) {
    // Update sync log as failed
    await supabase
      .from('auditsoft_sync_log')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_details: [{
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }],
      })
      .eq('id', syncLog.id);

    await supabase
      .from('auditsoft_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'failed',
        last_sync_error: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    throw error;
  }
}

// =============================================================================
// EXPORT FORM SUBMISSIONS
// =============================================================================

async function exportFormSubmissions(
  companyId: string,
  auditId: string,
  client: AuditSoftClient,
  options: ExportOptions
): Promise<TypeExportResult> {
  const supabase = createRouteHandlerClient();

  // Build query
  let query = supabase
    .from('form_submissions')
    .select(`
      *,
      form_templates!inner(name, code, cor_elements),
      user_profiles!submitted_by(first_name, last_name)
    `)
    .eq('company_id', companyId)
    .eq('status', 'submitted');

  // Apply date filters
  if (options.dateRange?.start) {
    query = query.gte('submitted_at', options.dateRange.start);
  }
  if (options.dateRange?.end) {
    query = query.lte('submitted_at', options.dateRange.end);
  }

  const { data: submissions, error } = await query;

  if (error) {
    console.error('Failed to fetch form submissions:', error);
    return { total: 0, succeeded: 0, failed: 0, errors: [] };
  }

  // Filter by COR elements if specified
  let filteredSubmissions = submissions || [];
  if (options.elements && options.elements.length > 0) {
    filteredSubmissions = filteredSubmissions.filter((s: any) => {
      const corElements = s.form_templates?.cor_elements || [];
      return corElements.some((e: number) => options.elements!.includes(e));
    });
  }

  const results: TypeExportResult = {
    total: filteredSubmissions.length,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  for (const submission of filteredSubmissions) {
    const submissionWithRelations = submission as FormSubmissionWithRelations;
    try {
      // Check if already synced (in incremental mode)
      if (options.incremental) {
        const { data: existing } = await supabase
          .from('auditsoft_item_mappings')
          .select('id')
          .eq('internal_item_type', 'form_submission')
          .eq('internal_item_id', submission.id)
          .single();

        if (existing) {
          continue; // Skip already synced
        }
      }

      const template = submissionWithRelations.form_templates;
      const submitter = submissionWithRelations.user_profiles;
      const corElements = template?.cor_elements || [1];
      const primaryElement = corElements[0];

      // Prepare evidence item
      const evidence: EvidenceItem = {
        audit_id: auditId,
        cor_element: primaryElement,
        question_id: `form_${template?.code || 'unknown'}`,
        evidence_type: 'form_submission',
        title: `${template?.name || 'Form'} - ${new Date(submission.submitted_at).toLocaleDateString()}`,
        description: `Submitted by ${submitter?.first_name || ''} ${submitter?.last_name || ''}`.trim() || 'Unknown',
        date: submission.submitted_at,
        metadata: {
          form_name: template?.name,
          form_code: template?.code,
          submitted_by: `${submitter?.first_name || ''} ${submitter?.last_name || ''}`.trim(),
          submission_data: submission.form_data,
          signatures: submission.signatures,
          photos: submission.photos,
          cor_elements: corElements,
        },
      };

      // If form has photos, include first one
      if (submission.photos && Array.isArray(submission.photos) && submission.photos.length > 0) {
        try {
          const photoBlob = await downloadFile(submission.photos[0]);
          evidence.file = new File([photoBlob], 'form-photo.jpg', { type: 'image/jpeg' });
        } catch (e) {
          // Continue without photo
        }
      }

      // Upload to AuditSoft
      const result = await client.uploadEvidence(evidence);

      if (!result.success || !result.auditsoft_item_id) {
        throw new Error(result.error || 'Upload failed');
      }

      // Save mapping
      await supabase.from('auditsoft_item_mappings').insert({
        company_id: companyId,
        internal_item_type: 'form_submission',
        internal_item_id: submission.id,
        auditsoft_item_id: result.auditsoft_item_id,
        auditsoft_item_type: 'evidence',
        cor_element: primaryElement,
        audit_question_id: evidence.question_id,
      });

      results.succeeded++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        item_type: 'form_submission',
        item_id: submission.id,
        item_name: submissionWithRelations.form_templates?.name || 'Unknown form',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return results;
}

// =============================================================================
// EXPORT DOCUMENTS
// =============================================================================

async function exportDocuments(
  companyId: string,
  auditId: string,
  client: AuditSoftClient,
  options: ExportOptions
): Promise<TypeExportResult> {
  const supabase = createRouteHandlerClient();

  // Build query
  let query = supabase
    .from('documents')
    .select(`
      *,
      document_folders(folder_name)
    `)
    .eq('company_id', companyId)
    .eq('status', 'active');

  const { data: documents, error } = await query;

  if (error) {
    console.error('Failed to fetch documents:', error);
    return { total: 0, succeeded: 0, failed: 0, errors: [] };
  }

  // Filter by COR elements if specified
  let filteredDocs = documents || [];
  if (options.elements && options.elements.length > 0) {
    filteredDocs = filteredDocs.filter((d: any) => {
      const corElements = d.cor_elements || [];
      return corElements.some((e: number) => options.elements!.includes(e));
    });
  }

  const results: TypeExportResult = {
    total: filteredDocs.length,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  for (const doc of filteredDocs) {
    try {
      // Check if already synced (in incremental mode)
      if (options.incremental) {
        const { data: existing } = await supabase
          .from('auditsoft_item_mappings')
          .select('id')
          .eq('internal_item_type', 'document')
          .eq('internal_item_id', doc.id)
          .single();

        if (existing) {
          continue;
        }
      }

      // Download document file from storage
      let file: File | undefined;
      if (doc.file_path) {
        const { data: fileBlob, error: downloadError } = await supabase.storage
          .from('documents')
          .download(doc.file_path);

        if (!downloadError && fileBlob) {
          file = new File([fileBlob], doc.file_name || 'document.pdf', {
            type: doc.file_type || 'application/pdf',
          });
        }
      }

      const corElements = doc.cor_elements || [1];
      const primaryElement = corElements[0];
      const docWithRelations = doc as DocumentWithRelations;
      const folder = docWithRelations.document_folders;

      // Prepare evidence
      const evidence: EvidenceItem = {
        audit_id: auditId,
        cor_element: primaryElement,
        question_id: `doc_${doc.document_type_code || 'document'}`,
        evidence_type: 'document',
        title: doc.control_number 
          ? `${doc.control_number}: ${doc.title}` 
          : doc.title || 'Untitled Document',
        description: doc.description || '',
        date: doc.effective_date || doc.created_at,
        file,
        metadata: {
          control_number: doc.control_number,
          document_type: doc.document_type_code,
          version: doc.version,
          folder: folder?.folder_name,
          cor_elements: corElements,
          effective_date: doc.effective_date,
          review_date: doc.review_date,
        },
      };

      // Upload to AuditSoft
      const result = await client.uploadEvidence(evidence);

      if (!result.success || !result.auditsoft_item_id) {
        throw new Error(result.error || 'Upload failed');
      }

      // Save mapping
      await supabase.from('auditsoft_item_mappings').insert({
        company_id: companyId,
        internal_item_type: 'document',
        internal_item_id: doc.id,
        auditsoft_item_id: result.auditsoft_item_id,
        auditsoft_item_type: 'document',
        cor_element: primaryElement,
        audit_question_id: evidence.question_id,
      });

      results.succeeded++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        item_type: 'document',
        item_id: doc.id,
        item_name: doc.title || 'Unknown document',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return results;
}

// =============================================================================
// EXPORT CERTIFICATIONS
// =============================================================================

async function exportCertifications(
  companyId: string,
  auditId: string,
  client: AuditSoftClient,
  options: ExportOptions
): Promise<TypeExportResult> {
  const supabase = createRouteHandlerClient();

  // Element 5: Qualifications, Orientation & Training
  if (options.elements && !options.elements.includes(5)) {
    return { total: 0, succeeded: 0, failed: 0, errors: [] };
  }

  const { data: certifications, error } = await supabase
    .from('worker_certifications')
    .select(`
      *,
      user_profiles(first_name, last_name, employee_number),
      certification_types(certification_name, certification_code)
    `)
    .eq('company_id', companyId)
    .eq('status', 'active');

  if (error) {
    console.error('Failed to fetch certifications:', error);
    return { total: 0, succeeded: 0, failed: 0, errors: [] };
  }

  const results: TypeExportResult = {
    total: certifications?.length || 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  for (const cert of certifications || []) {
    try {
      if (options.incremental) {
        const { data: existing } = await supabase
          .from('auditsoft_item_mappings')
          .select('id')
          .eq('internal_item_type', 'certification')
          .eq('internal_item_id', cert.id)
          .single();

        if (existing) continue;
      }

      const certWithRelations = cert as CertificationWithRelations;
      const worker = certWithRelations.user_profiles;
      const certType = certWithRelations.certification_types;
      const workerName = `${worker?.first_name || ''} ${worker?.last_name || ''}`.trim() || 'Unknown';

      // Download certificate file if available
      let file: File | undefined;
      if (cert.certificate_file_path) {
        const { data: fileBlob, error: downloadError } = await supabase.storage
          .from('certifications')
          .download(cert.certificate_file_path);

        if (!downloadError && fileBlob) {
          file = new File([fileBlob], `cert_${cert.certificate_number || cert.id}.pdf`, {
            type: 'application/pdf',
          });
        }
      }

      // Prepare evidence (Element 5: Qualifications & Training)
      const evidence: EvidenceItem = {
        audit_id: auditId,
        cor_element: 5,
        question_id: 'training_certifications',
        evidence_type: 'training_record',
        title: `${certType?.certification_name || 'Certification'} - ${workerName}`,
        description: [
          cert.certificate_number ? `Certificate #${cert.certificate_number}` : null,
          cert.issue_date ? `Issued: ${new Date(cert.issue_date).toLocaleDateString()}` : null,
          cert.expiry_date ? `Expires: ${new Date(cert.expiry_date).toLocaleDateString()}` : 'No expiry',
        ].filter(Boolean).join(' | '),
        date: cert.issue_date || cert.created_at,
        file,
        metadata: {
          worker_name: workerName,
          employee_number: worker?.employee_number,
          certification_type: certType?.certification_name,
          certification_code: certType?.certification_code,
          certificate_number: cert.certificate_number,
          issue_date: cert.issue_date,
          expiry_date: cert.expiry_date,
          issuing_organization: cert.issuing_organization,
          status: cert.status,
        },
      };

      const result = await client.uploadEvidence(evidence);

      if (!result.success || !result.auditsoft_item_id) {
        throw new Error(result.error || 'Upload failed');
      }

      await supabase.from('auditsoft_item_mappings').insert({
        company_id: companyId,
        internal_item_type: 'certification',
        internal_item_id: cert.id,
        auditsoft_item_id: result.auditsoft_item_id,
        auditsoft_item_type: 'training_record',
        cor_element: 5,
        audit_question_id: 'training_certifications',
      });

      results.succeeded++;
    } catch (error) {
      results.failed++;
      const certWithRelations = cert as CertificationWithRelations;
      const worker = certWithRelations.user_profiles;
      const certType = certWithRelations.certification_types;
      results.errors.push({
        item_type: 'certification',
        item_id: cert.id,
        item_name: `${worker?.first_name || ''} ${worker?.last_name || ''} - ${certType?.certification_name || 'Certification'}`.trim(),
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return results;
}

// =============================================================================
// EXPORT MAINTENANCE RECORDS
// =============================================================================

async function exportMaintenanceRecords(
  companyId: string,
  auditId: string,
  client: AuditSoftClient,
  options: ExportOptions
): Promise<TypeExportResult> {
  const supabase = createRouteHandlerClient();

  // Element 10: Preventive Maintenance
  if (options.elements && !options.elements.includes(10)) {
    return { total: 0, succeeded: 0, failed: 0, errors: [] };
  }

  let query = supabase
    .from('maintenance_records')
    .select(`
      *,
      equipment_inventory(equipment_number, equipment_type, description),
      maintenance_attachments(file_path, file_name, attachment_type)
    `)
    .eq('company_id', companyId)
    .eq('status', 'completed');

  if (options.dateRange?.start) {
    query = query.gte('actual_date', options.dateRange.start);
  }
  if (options.dateRange?.end) {
    query = query.lte('actual_date', options.dateRange.end);
  }

  const { data: records, error } = await query;

  if (error) {
    console.error('Failed to fetch maintenance records:', error);
    return { total: 0, succeeded: 0, failed: 0, errors: [] };
  }

  const results: TypeExportResult = {
    total: records?.length || 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  for (const record of records || []) {
    try {
      if (options.incremental) {
        const { data: existing } = await supabase
          .from('auditsoft_item_mappings')
          .select('id')
          .eq('internal_item_type', 'maintenance_record')
          .eq('internal_item_id', record.id)
          .single();

        if (existing) continue;
      }

      const recordWithRelations = record as MaintenanceRecordWithRelations;
      const equipment = recordWithRelations.equipment_inventory;
      const attachments = recordWithRelations.maintenance_attachments || [];

      // Get primary attachment (receipt preferred)
      let file: File | undefined;
      const receipt = attachments.find((a) => a.attachment_type === 'receipt');
      const primaryAttachment = receipt || attachments[0];
      
      if (primaryAttachment?.file_path) {
        const { data: fileBlob, error: downloadError } = await supabase.storage
          .from('maintenance')
          .download(primaryAttachment.file_path);

        if (!downloadError && fileBlob) {
          file = new File([fileBlob as Blob], String(primaryAttachment.file_name || 'attachment.jpg'), {
            type: 'image/jpeg',
          });
        }
      }

      const evidence: EvidenceItem = {
        audit_id: auditId,
        cor_element: 10,
        question_id: 'preventive_maintenance',
        evidence_type: 'maintenance_record',
        title: `${equipment?.equipment_number || 'Equipment'}: ${record.work_description || 'Maintenance'}`,
        description: [
          `${record.maintenance_type || 'Scheduled'} maintenance`,
          equipment?.equipment_type ? `on ${equipment.equipment_type}` : null,
          record.cost_total ? `| Cost: $${record.cost_total}` : null,
        ].filter(Boolean).join(' '),
        date: record.actual_date || record.created_at,
        file,
        metadata: {
          equipment_number: equipment?.equipment_number,
          equipment_type: equipment?.equipment_type,
          maintenance_type: record.maintenance_type,
          work_description: record.work_description,
          work_performed: record.work_performed,
          vendor: record.vendor_name,
          cost: record.cost_total,
          attachment_count: attachments.length,
        },
      };

      const result = await client.uploadEvidence(evidence);

      if (!result.success || !result.auditsoft_item_id) {
        throw new Error(result.error || 'Upload failed');
      }

      await supabase.from('auditsoft_item_mappings').insert({
        company_id: companyId,
        internal_item_type: 'maintenance_record',
        internal_item_id: record.id,
        auditsoft_item_id: result.auditsoft_item_id,
        auditsoft_item_type: 'evidence',
        cor_element: 10,
        audit_question_id: 'preventive_maintenance',
      });

      results.succeeded++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        item_type: 'maintenance_record',
        item_id: record.id,
        item_name: record.work_description || 'Maintenance record',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return results;
}

// =============================================================================
// EXPORT TRAINING RECORDS
// =============================================================================

async function exportTrainingRecords(
  companyId: string,
  auditId: string,
  client: AuditSoftClient,
  options: ExportOptions
): Promise<TypeExportResult> {
  const supabase = createRouteHandlerClient();

  // Element 5: Qualifications, Orientation & Training
  if (options.elements && !options.elements.includes(5)) {
    return { total: 0, succeeded: 0, failed: 0, errors: [] };
  }

  let query = supabase
    .from('training_records')
    .select(`
      *,
      user_profiles(first_name, last_name, employee_number)
    `)
    .eq('company_id', companyId);

  if (options.dateRange?.start) {
    query = query.gte('training_date', options.dateRange.start);
  }
  if (options.dateRange?.end) {
    query = query.lte('training_date', options.dateRange.end);
  }

  const { data: records, error } = await query;

  if (error) {
    console.error('Failed to fetch training records:', error);
    return { total: 0, succeeded: 0, failed: 0, errors: [] };
  }

  const results: TypeExportResult = {
    total: records?.length || 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  for (const training of records || []) {
    try {
      if (options.incremental) {
        const { data: existing } = await supabase
          .from('auditsoft_item_mappings')
          .select('id')
          .eq('internal_item_type', 'training_record')
          .eq('internal_item_id', training.id)
          .single();

        if (existing) continue;
      }

      const trainingWithRelations = training as TrainingRecordWithRelations;
      const worker = trainingWithRelations.user_profiles;
      const workerName = `${worker?.first_name || ''} ${worker?.last_name || ''}`.trim() || 'Unknown';

      const evidence: EvidenceItem = {
        audit_id: auditId,
        cor_element: 5,
        question_id: 'training_records',
        evidence_type: 'training_record',
        title: `${training.training_topic || 'Training'} - ${workerName}`,
        description: [
          training.training_type || 'General training',
          training.duration_hours ? `| Duration: ${training.duration_hours}hrs` : null,
          training.training_date ? `| Date: ${new Date(training.training_date).toLocaleDateString()}` : null,
        ].filter(Boolean).join(' '),
        date: training.training_date || training.created_at,
        metadata: {
          worker_name: workerName,
          employee_number: worker?.employee_number,
          training_type: training.training_type,
          topic: training.training_topic,
          duration_hours: training.duration_hours,
          trainer: training.trainer_name,
          passed: training.passed,
          location: training.location,
        },
      };

      const result = await client.uploadEvidence(evidence);

      if (!result.success || !result.auditsoft_item_id) {
        throw new Error(result.error || 'Upload failed');
      }

      await supabase.from('auditsoft_item_mappings').insert({
        company_id: companyId,
        internal_item_type: 'training_record',
        internal_item_id: training.id,
        auditsoft_item_id: result.auditsoft_item_id,
        auditsoft_item_type: 'training_record',
        cor_element: 5,
        audit_question_id: 'training_records',
      });

      results.succeeded++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        item_type: 'training_record',
        item_id: training.id,
        item_name: training.training_topic || 'Training record',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return results;
}

// =============================================================================
// EXPORT MEETING MINUTES
// =============================================================================

async function exportMeetingMinutes(
  companyId: string,
  auditId: string,
  client: AuditSoftClient,
  options: ExportOptions
): Promise<TypeExportResult> {
  const supabase = createRouteHandlerClient();

  // Elements 1 & 9: Management Leadership and JHSC
  const relevantElements = [1, 9];
  if (options.elements && !options.elements.some(e => relevantElements.includes(e))) {
    return { total: 0, succeeded: 0, failed: 0, errors: [] };
  }

  // Meeting minutes are typically stored as documents with specific type
  const { data: meetings, error } = await supabase
    .from('documents')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .in('document_type_code', ['MEETING_MINUTES', 'JHSC_MINUTES', 'SAFETY_MEETING']);

  if (error) {
    console.error('Failed to fetch meeting minutes:', error);
    return { total: 0, succeeded: 0, failed: 0, errors: [] };
  }

  const results: TypeExportResult = {
    total: meetings?.length || 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  for (const meeting of meetings || []) {
    try {
      if (options.incremental) {
        const { data: existing } = await supabase
          .from('auditsoft_item_mappings')
          .select('id')
          .eq('internal_item_type', 'meeting_minutes')
          .eq('internal_item_id', meeting.id)
          .single();

        if (existing) continue;
      }

      // Download document file
      let file: File | undefined;
      if (meeting.file_path) {
        const { data: fileBlob, error: downloadError } = await supabase.storage
          .from('documents')
          .download(meeting.file_path);

        if (!downloadError && fileBlob) {
          file = new File([fileBlob], meeting.file_name || 'meeting-minutes.pdf', {
            type: meeting.file_type || 'application/pdf',
          });
        }
      }

      // Determine COR element based on meeting type
      const corElement = meeting.document_type_code === 'JHSC_MINUTES' ? 9 : 1;

      const evidence: EvidenceItem = {
        audit_id: auditId,
        cor_element: corElement,
        question_id: corElement === 9 ? 'jhsc_meetings' : 'management_meetings',
        evidence_type: 'document',
        title: meeting.title || 'Meeting Minutes',
        description: meeting.description || '',
        date: meeting.effective_date || meeting.created_at,
        file,
        metadata: {
          document_type: meeting.document_type_code,
          meeting_date: meeting.effective_date,
          control_number: meeting.control_number,
        },
      };

      const result = await client.uploadEvidence(evidence);

      if (!result.success || !result.auditsoft_item_id) {
        throw new Error(result.error || 'Upload failed');
      }

      await supabase.from('auditsoft_item_mappings').insert({
        company_id: companyId,
        internal_item_type: 'meeting_minutes',
        internal_item_id: meeting.id,
        auditsoft_item_id: result.auditsoft_item_id,
        auditsoft_item_type: 'document',
        cor_element: corElement,
        audit_question_id: evidence.question_id,
      });

      results.succeeded++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        item_type: 'meeting_minutes',
        item_id: meeting.id,
        item_name: meeting.title || 'Meeting minutes',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return results;
}

// =============================================================================
// EXPORT INSPECTIONS
// =============================================================================

async function exportInspections(
  companyId: string,
  auditId: string,
  client: AuditSoftClient,
  options: ExportOptions
): Promise<TypeExportResult> {
  const supabase = createRouteHandlerClient();

  // Element 4: Ongoing Inspections
  if (options.elements && !options.elements.includes(4)) {
    return { total: 0, succeeded: 0, failed: 0, errors: [] };
  }

  // Inspections are form submissions with specific form codes
  const { data: inspections, error } = await supabase
    .from('form_submissions')
    .select(`
      *,
      form_templates!inner(name, code, cor_elements),
      user_profiles!submitted_by(first_name, last_name)
    `)
    .eq('company_id', companyId)
    .eq('status', 'submitted')
    .like('form_templates.code', '%INSPECTION%');

  if (error) {
    console.error('Failed to fetch inspections:', error);
    return { total: 0, succeeded: 0, failed: 0, errors: [] };
  }

  // Apply date filters
  let filteredInspections = inspections || [];
  if (options.dateRange?.start) {
    filteredInspections = filteredInspections.filter(
      (i: any) => new Date(i.submitted_at) >= new Date(options.dateRange!.start)
    );
  }
  if (options.dateRange?.end) {
    filteredInspections = filteredInspections.filter(
      (i: any) => new Date(i.submitted_at) <= new Date(options.dateRange!.end)
    );
  }

  const results: TypeExportResult = {
    total: filteredInspections.length,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  for (const inspection of filteredInspections) {
    const inspectionWithRelations = inspection as InspectionWithRelations;
    try {
      if (options.incremental) {
        const { data: existing } = await supabase
          .from('auditsoft_item_mappings')
          .select('id')
          .eq('internal_item_type', 'inspection')
          .eq('internal_item_id', inspection.id)
          .single();

        if (existing) continue;
      }

      const template = inspectionWithRelations.form_templates;
      const submitter = inspectionWithRelations.user_profiles;
      const submitterName = `${submitter?.first_name || ''} ${submitter?.last_name || ''}`.trim() || 'Unknown';

      // If inspection has photos, include first one
      let file: File | undefined;
      if (inspection.photos && Array.isArray(inspection.photos) && inspection.photos.length > 0) {
        try {
          const photoBlob = await downloadFile(inspection.photos[0]);
          file = new File([photoBlob], 'inspection-photo.jpg', { type: 'image/jpeg' });
        } catch (e) {
          // Continue without photo
        }
      }

      const evidence: EvidenceItem = {
        audit_id: auditId,
        cor_element: 4,
        question_id: 'workplace_inspections',
        evidence_type: 'inspection',
        title: `${template?.name || 'Inspection'} - ${new Date(inspection.submitted_at).toLocaleDateString()}`,
        description: `Inspected by ${submitterName}`,
        date: inspection.submitted_at,
        file,
        metadata: {
          form_name: template?.name,
          form_code: template?.code,
          inspector: submitterName,
          inspection_data: inspection.form_data,
          findings: inspection.form_data?.findings,
          corrective_actions: inspection.form_data?.corrective_actions,
        },
      };

      const result = await client.uploadEvidence(evidence);

      if (!result.success || !result.auditsoft_item_id) {
        throw new Error(result.error || 'Upload failed');
      }

      await supabase.from('auditsoft_item_mappings').insert({
        company_id: companyId,
        internal_item_type: 'inspection',
        internal_item_id: inspection.id,
        auditsoft_item_id: result.auditsoft_item_id,
        auditsoft_item_type: 'evidence',
        cor_element: 4,
        audit_question_id: 'workplace_inspections',
      });

      results.succeeded++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        item_type: 'inspection',
        item_id: inspection.id,
        item_name: inspectionWithRelations.form_templates?.name || 'Inspection',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return results;
}

// =============================================================================
// EXPORT INCIDENTS
// =============================================================================

async function exportIncidents(
  companyId: string,
  auditId: string,
  client: AuditSoftClient,
  options: ExportOptions
): Promise<TypeExportResult> {
  const supabase = createRouteHandlerClient();

  // Element 7: Incident Investigation
  if (options.elements && !options.elements.includes(7)) {
    return { total: 0, succeeded: 0, failed: 0, errors: [] };
  }

  // Incidents are form submissions with specific form codes
  const { data: incidents, error } = await supabase
    .from('form_submissions')
    .select(`
      *,
      form_templates!inner(name, code, cor_elements),
      user_profiles!submitted_by(first_name, last_name)
    `)
    .eq('company_id', companyId)
    .eq('status', 'submitted')
    .or('form_templates.code.ilike.%INCIDENT%,form_templates.code.ilike.%ACCIDENT%,form_templates.code.ilike.%NEAR_MISS%');

  if (error) {
    console.error('Failed to fetch incidents:', error);
    return { total: 0, succeeded: 0, failed: 0, errors: [] };
  }

  // Apply date filters
  let filteredIncidents = incidents || [];
  if (options.dateRange?.start) {
    filteredIncidents = filteredIncidents.filter(
      (i: any) => new Date(i.submitted_at) >= new Date(options.dateRange!.start)
    );
  }
  if (options.dateRange?.end) {
    filteredIncidents = filteredIncidents.filter(
      (i: any) => new Date(i.submitted_at) <= new Date(options.dateRange!.end)
    );
  }

  const results: TypeExportResult = {
    total: filteredIncidents.length,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  for (const incident of filteredIncidents) {
    const incidentWithRelations = incident as IncidentWithRelations;
    try {
      if (options.incremental) {
        const { data: existing } = await supabase
          .from('auditsoft_item_mappings')
          .select('id')
          .eq('internal_item_type', 'incident_report')
          .eq('internal_item_id', incident.id)
          .single();

        if (existing) continue;
      }

      const template = incidentWithRelations.form_templates;
      const submitter = incidentWithRelations.user_profiles;
      const submitterName = `${submitter?.first_name || ''} ${submitter?.last_name || ''}`.trim() || 'Unknown';

      // If incident has photos, include first one
      let file: File | undefined;
      if (incident.photos && Array.isArray(incident.photos) && incident.photos.length > 0) {
        try {
          const photoBlob = await downloadFile(incident.photos[0]);
          file = new File([photoBlob], 'incident-photo.jpg', { type: 'image/jpeg' });
        } catch (e) {
          // Continue without photo
        }
      }

      const evidence: EvidenceItem = {
        audit_id: auditId,
        cor_element: 7,
        question_id: 'incident_investigation',
        evidence_type: 'incident_report',
        title: `${template?.name || 'Incident Report'} - ${new Date(incident.submitted_at).toLocaleDateString()}`,
        description: `Reported by ${submitterName}`,
        date: incident.submitted_at,
        file,
        metadata: {
          form_name: template?.name,
          form_code: template?.code,
          reporter: submitterName,
          incident_data: incident.form_data,
          incident_type: incident.form_data?.incident_type,
          severity: incident.form_data?.severity,
          root_cause: incident.form_data?.root_cause,
          corrective_actions: incident.form_data?.corrective_actions,
        },
      };

      const result = await client.uploadEvidence(evidence);

      if (!result.success || !result.auditsoft_item_id) {
        throw new Error(result.error || 'Upload failed');
      }

      await supabase.from('auditsoft_item_mappings').insert({
        company_id: companyId,
        internal_item_type: 'incident_report',
        internal_item_id: incident.id,
        auditsoft_item_id: result.auditsoft_item_id,
        auditsoft_item_type: 'evidence',
        cor_element: 7,
        audit_question_id: 'incident_investigation',
      });

      results.succeeded++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        item_type: 'incident_report',
        item_id: incident.id,
        item_name: incidentWithRelations.form_templates?.name || 'Incident Report',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return results;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Download file from URL
 */
async function downloadFile(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  return response.blob();
}

// =============================================================================
// SINGLE ITEM EXPORT
// =============================================================================

/**
 * Export a single item to AuditSoft
 * Useful for real-time sync when items are created/updated
 */
export async function exportSingleItem(
  companyId: string,
  itemType: string,
  itemId: string,
  userId?: string
): Promise<{ success: boolean; auditsoft_item_id?: string; error?: string }> {
  const supabase = createRouteHandlerClient();

  const apiKey = await getDecryptedAPIKey(companyId);
  if (!apiKey) {
    return { success: false, error: 'AuditSoft not connected' };
  }

  const connection = await getAuditSoftConnection(companyId);
  if (!connection || connection.connection_status !== 'active' || !connection.audit_id) {
    return { success: false, error: 'AuditSoft connection not active' };
  }

  const client = new AuditSoftClient(apiKey, companyId, connection.api_endpoint);

  // Create sync log for single item
  const { data: syncLog } = await supabase
    .from('auditsoft_sync_log')
    .insert({
      company_id: companyId,
      connection_id: connection.id,
      sync_type: 'single_item',
      sync_trigger: userId ? 'user_initiated' : 'auto_sync',
      status: 'in_progress',
      items_attempted: 1,
      initiated_by: userId,
      sync_details: { item_type: itemType, item_id: itemId },
    })
    .select()
    .single();

  try {
    let result: TypeExportResult;

    // Route to appropriate export function based on item type
    switch (itemType) {
      case 'form_submission':
        result = await exportFormSubmissions(companyId, connection.audit_id, client, {
          incremental: false,
        });
        break;
      case 'document':
        result = await exportDocuments(companyId, connection.audit_id, client, {
          incremental: false,
        });
        break;
      case 'certification':
        result = await exportCertifications(companyId, connection.audit_id, client, {
          incremental: false,
        });
        break;
      case 'maintenance_record':
        result = await exportMaintenanceRecords(companyId, connection.audit_id, client, {
          incremental: false,
        });
        break;
      case 'training_record':
        result = await exportTrainingRecords(companyId, connection.audit_id, client, {
          incremental: false,
        });
        break;
      default:
        throw new Error(`Unknown item type: ${itemType}`);
    }

    // Update sync log
    if (syncLog) {
      await supabase
        .from('auditsoft_sync_log')
        .update({
          status: result.succeeded > 0 ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          items_succeeded: result.succeeded,
          items_failed: result.failed,
          error_details: result.errors.length > 0 ? result.errors : null,
        })
        .eq('id', syncLog.id);
    }

    if (result.succeeded > 0) {
      // Get the mapping to return the AuditSoft item ID
      const { data: mapping } = await supabase
        .from('auditsoft_item_mappings')
        .select('auditsoft_item_id')
        .eq('internal_item_type', itemType)
        .eq('internal_item_id', itemId)
        .single();

      return {
        success: true,
        auditsoft_item_id: mapping?.auditsoft_item_id,
      };
    } else {
      return {
        success: false,
        error: result.errors[0]?.error || 'Export failed',
      };
    }
  } catch (error) {
    if (syncLog) {
      await supabase
        .from('auditsoft_sync_log')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_details: [{
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          }],
        })
        .eq('id', syncLog.id);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// GET SYNC HISTORY
// =============================================================================

/**
 * Get sync history for a company
 */
export async function getSyncHistory(
  companyId: string,
  limit: number = 20
): Promise<any[]> {
  const supabase = createRouteHandlerClient();

  const { data, error } = await supabase
    .from('auditsoft_sync_log')
    .select(`
      *,
      user_profiles:initiated_by(first_name, last_name)
    `)
    .eq('company_id', companyId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch sync history:', error);
    return [];
  }

  return data || [];
}
