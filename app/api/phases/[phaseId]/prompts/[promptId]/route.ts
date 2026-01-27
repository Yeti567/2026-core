import { createClient } from '@/lib/supabase/server';
import { NextResponse, NextRequest } from 'next/server';
import { handleApiError } from '@/lib/utils/error-handling';

/**
 * PATCH /api/phases/[phaseId]/prompts/[promptId]
 * Update prompt progress
 */
export async function PATCH(
  request: Request,
  { params }: { params: { phaseId: string; promptId: string } }
) {
  try {
    const req = request as NextRequest;
    const supabase = await createClient();
    
    // Get user info from middleware headers
    const userId = req.headers.get('x-user-id');
    const companyId = req.headers.get('x-company-id');
    
    if (!userId || !companyId) {
      return NextResponse.json({ error: 'Unauthorized - Missing user context' }, { status: 401 });
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single();

    if (!profile?.id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      status,
      completion_data,
      completion_notes,
      related_form_submission_id,
      related_document_id,
      related_certification_id
    } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Use the update_prompt_progress function
    const { data, error } = await supabase.rpc('update_prompt_progress', {
      p_company_id: companyId,
      p_prompt_id: params.promptId,
      p_status: status,
      p_completed_by: status === 'completed' ? profile.id : null,
      p_completion_data: completion_data || {},
      p_completion_notes: completion_notes || null,
      p_related_form_submission_id: related_form_submission_id || null,
      p_related_document_id: related_document_id || null,
      p_related_certification_id: related_certification_id || null
    });

    if (error) {
      console.error('Error updating prompt progress:', error);
      return handleApiError(error, 'Failed to update prompt progress', 400);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in PATCH /api/phases/[phaseId]/prompts/[promptId]:', error);
    return handleApiError(error, 'Failed to update prompt progress');
  }
}
