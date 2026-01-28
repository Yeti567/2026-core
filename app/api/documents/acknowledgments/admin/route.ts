/**
 * Admin Document Acknowledgments API
 * 
 * GET: Get all documents requiring acknowledgment with status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


// Type for worker relation from Supabase join
interface WorkerRelation {
  full_name?: string;
  email?: string;
}

// Helper to safely extract relation data (handles array or single object from Supabase)
function getRelation<T>(data: unknown): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return (data[0] as T) || null;
  return data as T;
}

/**
 * GET /api/documents/acknowledgments/admin
 * Get all documents requiring acknowledgment with stats
 */
export async function GET(request: NextRequest) {
  try {
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

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    if (!['admin', 'supervisor', 'internal_auditor'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get all documents that require acknowledgment
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select(`
        id,
        control_number,
        title,
        worker_must_acknowledge,
        acknowledgment_deadline_days,
        created_at
      `)
      .eq('company_id', profile.company_id)
      .eq('worker_must_acknowledge', true)
      .in('status', ['active', 'approved'])
      .order('created_at', { ascending: false });

    if (docsError) {
      throw new Error(docsError.message);
    }

    // Get acknowledgments for each document
    const documentsWithStats = await Promise.all(
      (documents || []).map(async (doc) => {
        const { data: acknowledgments } = await supabase
          .from('document_acknowledgments')
          .select(`
            id,
            worker_id,
            required_by_date,
            acknowledged_at,
            status,
            reminder_count,
            last_reminder_at,
            worker:user_profiles!worker_id (
              full_name,
              email
            )
          `)
          .eq('document_id', doc.id)
          .order('status', { ascending: true });

        const acks = (acknowledgments || []).map(a => {
          const worker = getRelation<WorkerRelation>(a.worker);
          return {
            ...a,
            worker_name: worker?.full_name,
            worker_email: worker?.email,
          };
        });

        const stats = {
          total: acks.length,
          acknowledged: acks.filter(a => a.status === 'acknowledged').length,
          pending: acks.filter(a => a.status === 'pending').length,
          overdue: acks.filter(a => a.status === 'overdue').length,
        };

        return {
          ...doc,
          stats,
          acknowledgments: acks,
        };
      })
    );

    // Calculate overall stats
    const overallStats = documentsWithStats.reduce((acc, doc) => {
      if (doc.stats) {
        acc.total += doc.stats.total;
        acc.acknowledged += doc.stats.acknowledged;
        acc.pending += doc.stats.pending;
        acc.overdue += doc.stats.overdue;
      }
      return acc;
    }, { total: 0, acknowledged: 0, pending: 0, overdue: 0 });

    return NextResponse.json({
      documents: documentsWithStats,
      overall_stats: overallStats,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to fetch acknowledgments');
  }
}
