/**
 * Send Acknowledgment Reminders API
 * 
 * POST: Send reminders to workers who haven't acknowledged
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/documents/[id]/acknowledgments/remind
 * Send reminders to pending workers
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: documentId } = await params;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile and verify admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'supervisor', 'internal_auditor'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get pending acknowledgments
    const { data: pending, error: pendingError } = await supabase
      .from('document_acknowledgments')
      .select(`
        id,
        worker_id,
        required_by_date,
        reminder_count,
        worker:user_profiles!worker_id (
          full_name,
          email
        )
      `)
      .eq('document_id', documentId)
      .in('status', ['pending', 'overdue']);

    if (pendingError) {
      throw new Error(pendingError.message);
    }

    if (!pending || pending.length === 0) {
      return NextResponse.json({
        success: true,
        reminders_sent: 0,
        message: 'No pending acknowledgments to remind',
      });
    }

    // Get document details
    const { data: document } = await supabase
      .from('documents')
      .select('title, control_number')
      .eq('id', documentId)
      .single();

    // Update reminder count and timestamp
    const now = new Date().toISOString();
    const updates = pending.map(ack => ({
      id: ack.id,
      reminder_count: (ack.reminder_count || 0) + 1,
      last_reminder_at: now,
    }));

    for (const update of updates) {
      await supabase
        .from('document_acknowledgments')
        .update({
          reminder_count: update.reminder_count,
          last_reminder_at: update.last_reminder_at,
        })
        .eq('id', update.id);
    }

    // In a real implementation, you would send emails here
    // For now, we'll just log and track the reminders

    // Helper type for worker relation
    interface WorkerInfo {
      full_name?: string;
      email?: string;
    }

    // Helper to safely extract worker data
    const getWorkerData = (worker: unknown): WorkerInfo => {
      if (!worker) return {};
      if (Array.isArray(worker)) return (worker[0] as WorkerInfo) || {};
      return worker as WorkerInfo;
    };

    const remindersSent = pending.map(ack => {
      const workerData = getWorkerData(ack.worker);
      return {
        worker_name: workerData.full_name,
        worker_email: workerData.email,
        document_title: document?.title,
        document_control_number: document?.control_number,
        due_date: ack.required_by_date,
        reminder_number: (ack.reminder_count || 0) + 1,
      };
    });

    console.log('Reminders sent:', remindersSent);

    // TODO: Integrate with email service
    // await sendAcknowledgmentReminderEmails(remindersSent);

    return NextResponse.json({
      success: true,
      reminders_sent: pending.length,
      workers: remindersSent.map(r => r.worker_email),
    });
  } catch (error) {
    return handleApiError(error, 'Failed to send reminders');
  }
}
