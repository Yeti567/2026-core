/**
 * AuditSoft Export Progress SSE API
 * 
 * GET: Stream real-time progress updates for an export
 */

import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const { id: exportId } = await params;
    const supabase = createRouteHandlerClient();

    // Verify export belongs to user's company
    const { data: initialLog, error: verifyError } = await supabase
      .from('auditsoft_sync_log')
      .select('*')
      .eq('id', exportId)
      .eq('company_id', user.companyId)
      .single();

    if (verifyError || !initialLog) {
      return new Response(
        JSON.stringify({ error: 'Export not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial state
        const initialData = {
          type: 'progress',
          data: {
            status: initialLog.status,
            phase: getPhaseFromStatus(initialLog),
            total: initialLog.items_attempted || 0,
            succeeded: initialLog.items_succeeded || 0,
            failed: initialLog.items_failed || 0,
            details: initialLog.sync_details,
          },
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));

        // If already complete, send complete event and close
        if (['completed', 'failed', 'partial'].includes(initialLog.status)) {
          const completeData = {
            type: 'complete',
            data: {
              ...initialLog,
              duration_seconds: initialLog.completed_at && initialLog.started_at
                ? Math.round((new Date(initialLog.completed_at).getTime() - new Date(initialLog.started_at).getTime()) / 1000)
                : 0,
            },
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeData)}\n\n`));
          controller.close();
          return;
        }

        // Poll for updates every 2 seconds
        intervalId = setInterval(async () => {
          try {
            const { data: syncLog, error } = await supabase
              .from('auditsoft_sync_log')
              .select('*')
              .eq('id', exportId)
              .single();

            if (error || !syncLog) {
              clearInterval(intervalId!);
              controller.close();
              return;
            }

            // Send progress update
            const progressData = {
              type: 'progress',
              data: {
                status: syncLog.status,
                phase: getPhaseFromStatus(syncLog),
                total: syncLog.items_attempted || 0,
                succeeded: syncLog.items_succeeded || 0,
                failed: syncLog.items_failed || 0,
                details: syncLog.sync_details,
              },
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`));

            // If complete, send final result and close
            if (['completed', 'failed', 'partial'].includes(syncLog.status)) {
              const completeData = {
                type: 'complete',
                data: {
                  ...syncLog,
                  duration_seconds: syncLog.completed_at && syncLog.started_at
                    ? Math.round((new Date(syncLog.completed_at).getTime() - new Date(syncLog.started_at).getTime()) / 1000)
                    : 0,
                },
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeData)}\n\n`));
              clearInterval(intervalId!);
              controller.close();
            }
          } catch (e) {
            console.error('SSE poll error:', e);
          }
        }, 2000);
      },
      cancel() {
        // Clean up on disconnect
        if (intervalId) {
          clearInterval(intervalId);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error) {
    const authError = error as AuthError;
    return new Response(
      JSON.stringify({ error: authError.message }),
      { status: authError.status || 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function getPhaseFromStatus(syncLog: any): string {
  if (syncLog.status === 'in_progress') {
    const details = syncLog.sync_details;
    if (!details?.by_type) return 'Processing...';
    
    const types = ['form_submissions', 'documents', 'certifications', 'maintenance_records', 
                   'training_records', 'meeting_minutes', 'inspections', 'incidents'];
    
    for (const type of types) {
      // Safe: type is from predefined array of known types
      // eslint-disable-next-line security/detect-object-injection
      if ((details.by_type[type] || 0) > 0) {
        return `Exporting ${type.replace('_', ' ')}...`;
      }
    }
    return 'Starting export...';
  }
  
  if (syncLog.status === 'completed') return 'Export complete!';
  if (syncLog.status === 'failed') return 'Export failed';
  if (syncLog.status === 'partial') return 'Export completed with errors';
  
  return 'Processing...';
}
