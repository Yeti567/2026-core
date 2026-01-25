import { getServerUserOrRedirect } from '@/lib/auth/helpers';
import { PhaseDetail } from '@/components/phases';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function PhaseDetailPage({
  params,
}: {
  params: { phaseId: string };
}) {
  const user = await getServerUserOrRedirect();
  const supabase = await createClient();

  // Get user's company
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('user_id', user.userId)
    .single();

  if (!profile?.company_id) {
    notFound();
  }

  // Fetch phase data server-side
  let phase = null;

  try {
    // Get phase with prompts
    const { data: phaseData } = await supabase
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

    if (!phaseData) {
      notFound();
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
      .in('prompt_id', phaseData.cor_prompts?.map((p: any) => p.id) || []);

    // Get completion percentage
    const { data: completionPercentage } = await supabase.rpc('get_phase_completion_percentage', {
      p_company_id: profile.company_id,
      p_phase_id: params.phaseId
    });

    // Combine prompts with progress
    const promptsWithProgress = phaseData.cor_prompts?.map((prompt: any) => {
      const promptProg = promptProgress?.find((pp: any) => pp.prompt_id === prompt.id);
      return {
        ...prompt,
        progress: promptProg ? {
          status: promptProg.status,
          started_at: promptProg.started_at,
          completed_at: promptProg.completed_at,
          completed_by: promptProg.completed_by,
          completion_data: promptProg.completion_data,
          completion_notes: promptProg.completion_notes
        } : null
      };
    }).sort((a: any, b: any) => a.display_order - b.display_order) || [];

    phase = {
      ...phaseData,
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
    };
  } catch (error) {
    console.error('Error fetching phase:', error);
    notFound();
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <PhaseDetail phaseId={params.phaseId} initialPhase={phase} />
      </div>
    </main>
  );
}
