import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/utils/error-handling';

/**
 * GET /api/phases/[phaseId]
 * Get a specific phase with detailed progress
 */
export async function GET(
  request: Request,
  { params }: { params: { phaseId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    // TODO: Implement user authentication without Supabase
      const authResult: { data: { user: { id: string } | null }; error: Error | null } = { data: { user: null }, error: new Error('Auth not implemented') };
      const { data: { user }, error: authError } = authResult;
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get phase with prompts
    const { data: phase, error: phaseError } = await supabase
      .from('cor_phases')
      .select(`
        *,
        cor_prompts (
          id,
          prompt_number,
          title,
          description,
          instructions,
          prompt_type,
          required,
          estimated_time_minutes,
          display_order
        )
      `)
      .eq('id', params.phaseId)
      .single();

    if (phaseError || !phase) {
      return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
    }

    // Get phase progress
    const { data: phaseProgress } = await supabase
      .from('company_phase_progress')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('phase_id', params.phaseId)
      .single();

    // Get prompt progress
    const { data: promptProgress } = await supabase
      .from('company_prompt_progress')
      .select('*')
      .eq('company_id', profile.company_id)
      .in('prompt_id', phase.cor_prompts?.map((p: any) => p.id) || []);

    // Get completion percentage
    const { data: completionPercentage } = await supabase.rpc('get_phase_completion_percentage', {
      p_company_id: profile.company_id,
      p_phase_id: params.phaseId
    });

    // Combine prompts with progress
    const promptsWithProgress = phase.cor_prompts?.map((prompt: any) => {
      const promptProg = promptProgress?.find(pp => pp.prompt_id === prompt.id);
      return {
        ...prompt,
        progress: promptProg ? {
          status: promptProg.status,
          started_at: promptProg.started_at,
          completed_at: promptProg.completed_at,
          completed_by: promptProg.completed_by,
          completion_data: promptProg.completion_data,
          completion_notes: promptProg.completion_notes,
          related_form_submission_id: promptProg.related_form_submission_id,
          related_document_id: promptProg.related_document_id,
          related_certification_id: promptProg.related_certification_id
        } : null
      };
    }).sort((a: any, b: any) => a.display_order - b.display_order) || [];

    return NextResponse.json({
      phase: {
        ...phase,
        progress: phaseProgress ? {
          status: phaseProgress.status,
          started_at: phaseProgress.started_at,
          completed_at: phaseProgress.completed_at,
          completed_by: phaseProgress.completed_by,
          completion_notes: phaseProgress.completion_notes
        } : {
          status: 'not_started',
          started_at: null,
          completed_at: null,
          completed_by: null,
          completion_notes: null
        },
        prompts: promptsWithProgress,
        completion_percentage: completionPercentage || 0
      }
    });
  } catch (error) {
    console.error('Error in GET /api/phases/[phaseId]:', error);
    return handleApiError(error, 'Failed to get phase details');
  }
}

/**
 * PATCH /api/phases/[phaseId]
 * Update phase progress
 */
export async function PATCH(
  request: Request,
  { params }: { params: { phaseId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    // TODO: Implement user authentication without Supabase
      const authResult: { data: { user: { id: string } | null }; error: Error | null } = { data: { user: null }, error: new Error('Auth not implemented') };
      const { data: { user }, error: authError } = authResult;
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company and profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Only admins can update phase status
    if (!['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status, completion_notes } = body;

    if (status === 'completed') {
      // Use the complete_phase function
      const { data, error } = await supabase.rpc('complete_phase', {
        p_company_id: profile.company_id,
        p_phase_id: params.phaseId,
        p_completed_by: profile.id,
        p_completion_notes: completion_notes || null
      });

      if (error) {
        console.error('Error completing phase:', error);
        return handleApiError(error, 'Failed to complete phase', 400);
      }

      return NextResponse.json({ success: true, data });
    } else {
      // Update phase progress status
      const { data, error } = await supabase
        .from('company_phase_progress')
        .upsert({
          company_id: profile.company_id,
          phase_id: params.phaseId,
          status,
          started_at: status === 'in_progress' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'company_id,phase_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating phase progress:', error);
        return NextResponse.json({ error: 'Failed to update phase' }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }
  } catch (error) {
    console.error('Error in PATCH /api/phases/[phaseId]:', error);
    return handleApiError(error, 'Failed to update phase progress');
  }
}
