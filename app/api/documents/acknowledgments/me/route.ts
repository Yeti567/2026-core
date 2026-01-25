/**
 * Worker Acknowledgments API
 * 
 * GET: Get current worker's pending acknowledgments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkerAcknowledgments } from '@/lib/documents';
import { handleApiError } from '@/lib/utils/error-handling';

/**
 * GET /api/documents/acknowledgments/me
 * Get current worker's acknowledgments
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'acknowledged' | 'overdue' | null;
    
    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get worker profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get worker's acknowledgments
    const acknowledgments = await getWorkerAcknowledgments(
      profile.id,
      status || undefined
    );

    // Calculate summary
    const summary = {
      total: acknowledgments.length,
      pending: acknowledgments.filter(a => a.status === 'pending').length,
      acknowledged: acknowledgments.filter(a => a.status === 'acknowledged').length,
      overdue: acknowledgments.filter(a => a.status === 'overdue').length,
    };

    return NextResponse.json({
      acknowledgments,
      summary,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to fetch acknowledgments');
  }
}
