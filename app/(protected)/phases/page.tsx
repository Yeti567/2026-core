import { getServerUserOrRedirect } from '@/lib/auth/helpers';
import { PhasesDashboard } from '@/components/phases';
import { createClient } from '@/lib/supabase/server';

export default async function PhasesPage() {
  const user = await getServerUserOrRedirect();
  const supabase = await createClient();

  // Get user's company
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('user_id', user.userId)
    .single();

  // Fetch phases data server-side
  let phases = null;
  let overallProgress = 0;

  if (profile?.company_id) {
    try {
      // Get all phases with prompts
      const { data: phasesData } = await supabase
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

      overallProgress = progressData || 0;

      // Combine phases with progress
      phases = (phasesData || []).map((phase: any) => {
        const progress = phaseProgress?.find(p => p.phase_id === phase.id);
        
        const promptsWithProgress = (phase.cor_prompts || []).map((prompt: any) => {
          const promptProg = promptProgress?.find(pp => pp.prompt_id === prompt.id);
          return {
            ...prompt,
            progress: promptProg ? {
              status: promptProg.status,
              started_at: promptProg.started_at,
              completed_at: promptProg.completed_at
            } : null
          };
        }).sort((a: any, b: any) => a.display_order - b.display_order) || [];

        return {
          ...phase,
          progress: progress ? {
            status: progress.status,
            started_at: progress.started_at,
            completed_at: progress.completed_at
          } : {
            status: 'not_started',
            started_at: null,
            completed_at: null
          },
          prompts: promptsWithProgress,
          completion_percentage: 0
        };
      }) as any;
    } catch (error) {
      console.error('Error fetching phases:', error);
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">COR Certification Phases</h1>
            <p className="text-[var(--muted)]">
              Track your progress through the 12-phase COR certification process
            </p>
          </div>
        </header>

        <PhasesDashboard initialPhases={phases} initialOverallProgress={overallProgress} />
      </div>
    </main>
  );
}
