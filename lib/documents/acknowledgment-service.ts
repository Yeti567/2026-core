/**
 * Document Acknowledgment Service
 * 
 * Manages worker acknowledgments of critical documents.
 */

import { createClient } from '@/lib/supabase/server';
import type { DocumentAcknowledgment } from './types';

/**
 * Create acknowledgment requirements for a document
 */
export async function createAcknowledgmentRequirements(
  documentId: string,
  companyId: string,
  workerIds: string[],
  options?: {
    deadlineDays?: number;
    notes?: string;
  }
): Promise<DocumentAcknowledgment[]> {
  const supabase = await createClient();
  
  const deadlineDate = options?.deadlineDays
    ? new Date(Date.now() + options.deadlineDays * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
    : null;
  
  const records = workerIds.map(workerId => ({
    document_id: documentId,
    company_id: companyId,
    worker_id: workerId,
    required_by_date: deadlineDate,
    notes: options?.notes,
    status: 'pending' as const,
  }));
  
  const { data, error } = await supabase
    .from('document_acknowledgments')
    .upsert(records, {
      onConflict: 'document_id,worker_id',
      ignoreDuplicates: false,
    })
    .select();
  
  if (error) throw new Error(`Failed to create acknowledgments: ${error.message}`);
  return data || [];
}

/**
 * Get acknowledgment status for a document
 */
export async function getDocumentAcknowledgments(
  documentId: string
): Promise<{
  acknowledgments: (DocumentAcknowledgment & {
    worker_name?: string;
    worker_email?: string;
  })[];
  stats: {
    total: number;
    acknowledged: number;
    pending: number;
    overdue: number;
  };
}> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('document_acknowledgments')
    .select(`
      *,
      worker:user_profiles!worker_id (
        full_name,
        email
      )
    `)
    .eq('document_id', documentId)
    .order('status', { ascending: true })
    .order('required_by_date', { ascending: true });
  
  if (error) throw new Error(`Failed to get acknowledgments: ${error.message}`);
  
  const acknowledgments = (data || []).map(ack => ({
    ...ack,
    worker_name: ack.worker?.full_name,
    worker_email: ack.worker?.email,
  }));
  
  const stats = {
    total: acknowledgments.length,
    acknowledged: acknowledgments.filter(a => a.status === 'acknowledged').length,
    pending: acknowledgments.filter(a => a.status === 'pending').length,
    overdue: acknowledgments.filter(a => a.status === 'overdue').length,
  };
  
  return { acknowledgments, stats };
}

/**
 * Get acknowledgments for a specific worker
 */
export async function getWorkerAcknowledgments(
  workerId: string,
  status?: DocumentAcknowledgment['status']
): Promise<(DocumentAcknowledgment & {
  document_title?: string;
  document_control_number?: string;
  is_critical?: boolean;
})[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('document_acknowledgments')
    .select(`
      *,
      document:documents!document_id (
        title,
        control_number,
        is_critical
      )
    `)
    .eq('worker_id', workerId);
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query
    .order('required_by_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(`Failed to get worker acknowledgments: ${error.message}`);
  
  return (data || []).map(ack => ({
    ...ack,
    document_title: ack.document?.title,
    document_control_number: ack.document?.control_number,
    is_critical: ack.document?.is_critical,
  }));
}

/**
 * Acknowledge a document
 */
export async function acknowledgeDocument(
  acknowledgmentId: string,
  method: DocumentAcknowledgment['acknowledgment_method'],
  options?: {
    signatureData?: string;
    notes?: string;
  }
): Promise<DocumentAcknowledgment> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('document_acknowledgments')
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledgment_method: method,
      signature_data: options?.signatureData,
      notes: options?.notes,
      status: 'acknowledged',
    })
    .eq('id', acknowledgmentId)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to acknowledge document: ${error.message}`);
  return data;
}

/**
 * Acknowledge document by document and worker ID
 */
export async function acknowledgeDocumentByWorker(
  documentId: string,
  workerId: string,
  method: DocumentAcknowledgment['acknowledgment_method'],
  options?: {
    signatureData?: string;
    notes?: string;
  }
): Promise<DocumentAcknowledgment> {
  const supabase = await createClient();
  
  // First check if acknowledgment exists
  const { data: existing } = await supabase
    .from('document_acknowledgments')
    .select()
    .eq('document_id', documentId)
    .eq('worker_id', workerId)
    .single();
  
  if (existing) {
    // Update existing
    return acknowledgeDocument(existing.id, method, options);
  }
  
  // Get document details
  const { data: doc } = await supabase
    .from('documents')
    .select('company_id, acknowledgment_deadline_days')
    .eq('id', documentId)
    .single();
  
  if (!doc) throw new Error('Document not found');
  
  // Create and acknowledge in one step
  const deadlineDate = doc.acknowledgment_deadline_days
    ? new Date(Date.now() + doc.acknowledgment_deadline_days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
    : null;
  
  const { data, error } = await supabase
    .from('document_acknowledgments')
    .insert({
      document_id: documentId,
      company_id: doc.company_id,
      worker_id: workerId,
      required_by_date: deadlineDate,
      acknowledged_at: new Date().toISOString(),
      acknowledgment_method: method,
      signature_data: options?.signatureData,
      notes: options?.notes,
      status: 'acknowledged',
    })
    .select()
    .single();
  
  if (error) throw new Error(`Failed to acknowledge document: ${error.message}`);
  return data;
}

/**
 * Update overdue acknowledgments
 */
export async function updateOverdueAcknowledgments(
  companyId?: string
): Promise<number> {
  const supabase = await createClient();
  
  let query = supabase
    .from('document_acknowledgments')
    .update({ status: 'overdue' })
    .eq('status', 'pending')
    .lt('required_by_date', new Date().toISOString().split('T')[0]);
  
  if (companyId) {
    query = query.eq('company_id', companyId);
  }
  
  const { error, count } = await query.select('id');
  
  if (error) throw new Error(`Failed to update overdue acknowledgments: ${error.message}`);
  return count || 0;
}

/**
 * Get acknowledgment summary for a company
 */
export async function getAcknowledgmentSummary(
  companyId: string
): Promise<{
  total_required: number;
  total_acknowledged: number;
  total_pending: number;
  total_overdue: number;
  completion_rate: number;
  documents_requiring_ack: number;
}> {
  const supabase = await createClient();
  
  // Get all acknowledgments
  const { data: acknowledgments } = await supabase
    .from('document_acknowledgments')
    .select('status, document_id')
    .eq('company_id', companyId);
  
  const acks = acknowledgments || [];
  
  const total_required = acks.length;
  const total_acknowledged = acks.filter(a => a.status === 'acknowledged').length;
  const total_pending = acks.filter(a => a.status === 'pending').length;
  const total_overdue = acks.filter(a => a.status === 'overdue').length;
  const completion_rate = total_required > 0 
    ? Math.round((total_acknowledged / total_required) * 100) 
    : 100;
  const documents_requiring_ack = new Set(acks.map(a => a.document_id)).size;
  
  return {
    total_required,
    total_acknowledged,
    total_pending,
    total_overdue,
    completion_rate,
    documents_requiring_ack,
  };
}

/**
 * Send reminder for pending acknowledgments
 */
export async function sendAcknowledgmentReminder(
  acknowledgmentId: string
): Promise<void> {
  const supabase = await createClient();
  
  // Update reminder sent time
  await supabase
    .from('document_acknowledgments')
    .update({
      reminder_count: supabase.rpc('increment_reminder_count', { row_id: acknowledgmentId }),
      last_reminder_at: new Date().toISOString(),
    })
    .eq('id', acknowledgmentId);
  
  // TODO: Implement actual email/notification sending
}

/**
 * Exempt a worker from acknowledging a document
 */
export async function exemptFromAcknowledgment(
  acknowledgmentId: string,
  reason: string
): Promise<DocumentAcknowledgment> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('document_acknowledgments')
    .update({
      status: 'exempt',
      notes: reason,
    })
    .eq('id', acknowledgmentId)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to exempt acknowledgment: ${error.message}`);
  return data;
}
