import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Interfaces for COR phases data
interface CorPrompt {
  id: string;
  prompt_number: string;
  title: string;
  description: string | null;
  prompt_type: string;
  required: boolean;
  display_order: number;
}

interface CorPhase {
  id: string;
  phase_number: number;
  title: string;
  description: string | null;
  display_order: number;
  cor_prompts: CorPrompt[] | null;
}

interface PhaseProgress {
  phase_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  completion_notes: string | null;
}

interface PromptProgress {
  prompt_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  completion_notes: string | null;
}

interface PhaseCompletion {
  phaseId: string;
  percentage: number;
}

/**
 * GET /api/phases
 * Get all phases with company progress
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
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

    // Get all phases with prompts
    const { data: phases, error: phasesError } = await supabase
      .from('cor_phases')
      .select(`
        *,
        cor_prompts (
          id,
          prompt_number,
          title,
          description,
          prompt_type,
          required,
          display_order
        )
      `)
      .order('display_order', { ascending: true });

    if (phasesError) {
      console.error('Error fetching phases:', phasesError);
      return NextResponse.json({ error: 'Failed to fetch phases' }, { status: 500 });
    }

    // Get company's phase progress
    const { data: phaseProgress } = await supabase
      .from('company_phase_progress')
      .select('*')
      .eq('company_id', profile.company_id);

    // Get company's prompt progress
    const { data: promptProgress } = await supabase
      .from('company_prompt_progress')
      .select('*')
      .eq('company_id', profile.company_id);

    // Get overall progress percentage
    const { data: progressData } = await supabase.rpc('get_company_progress_percentage', {
      p_company_id: profile.company_id
    });

    // Get completion percentages for all phases
    const phaseCompletionPromises = (phases as CorPhase[])?.map((phase: CorPhase) =>
      supabase.rpc('get_phase_completion_percentage', {
        p_company_id: profile.company_id,
        p_phase_id: phase.id
      }).then(({ data }: { data: number | null }) => ({ phaseId: phase.id, percentage: data || 0 }))
    ) || [];

    const phaseCompletions = await Promise.all(phaseCompletionPromises);
    const completionMap = new Map(phaseCompletions.map((c: PhaseCompletion) => [c.phaseId, c.percentage]));

    // Combine phases with progress
    const phasesWithProgress = (phases as CorPhase[])?.map((phase: CorPhase) => {
      const progress = (phaseProgress as PhaseProgress[] | null)?.find((p: PhaseProgress) => p.phase_id === phase.id);

      const promptsWithProgress = phase.cor_prompts?.map((prompt: CorPrompt) => {
        const promptProg = (promptProgress as PromptProgress[] | null)?.find((pp: PromptProgress) => pp.prompt_id === prompt.id);
        return {
          ...prompt,
          progress: promptProg ? {
            status: promptProg.status,
            started_at: promptProg.started_at,
            completed_at: promptProg.completed_at,
            completed_by: promptProg.completed_by,
            completion_notes: promptProg.completion_notes
          } : null
        };
      }).sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order) || [];

      return {
        ...phase,
        progress: progress ? {
          status: progress.status,
          started_at: progress.started_at,
          completed_at: progress.completed_at,
          completed_by: progress.completed_by,
          completion_notes: progress.completion_notes
        } : {
          status: 'not_started',
          started_at: null,
          completed_at: null,
          completed_by: null,
          completion_notes: null
        },
        prompts: promptsWithProgress,
        completion_percentage: completionMap.get(phase.id) || 0
      };
    }) || [];

    return NextResponse.json({
      phases: phasesWithProgress,
      overall_progress: progressData || 0
    });
  } catch (error) {
    console.error('Error in GET /api/phases:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
