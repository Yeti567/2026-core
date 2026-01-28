import { createClient } from '@/lib/supabase/server';
import { authenticateServerComponentSimple } from '@/lib/auth/jwt-simple';
import Link from 'next/link';

export async function PhasesWidget() {
  const supabase = await createClient();
  
  // Get current user
  const { user, error } = await authenticateServerComponentSimple();
  if (!user) return null;

  // Get user's company
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('user_id', user.userId)
    .single();

  if (!profile?.company_id) return null;

  // Get overall progress
  const { data: overallProgress } = await supabase.rpc('get_company_progress_percentage', {
    p_company_id: profile.company_id
  });

  // Get phase counts
  const { data: phaseProgress } = await supabase
    .from('company_phase_progress')
    .select('status')
    .eq('company_id', profile.company_id);

  const completedPhases = phaseProgress?.filter(p => p.status === 'completed').length || 0;
  const inProgressPhases = phaseProgress?.filter(p => p.status === 'in_progress').length || 0;
  const totalPhases = 12;

  return (
    <div className="card md:col-span-2 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border-emerald-500/30">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-emerald-500/20">
          <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold mb-1">COR Certification Phases</h2>
          <p className="text-sm text-[var(--muted)] mb-3">
            Track your progress through all 12 phases of the COR certification process.
          </p>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-[var(--muted)]">Overall Progress: </span>
              <span className="font-semibold text-[var(--primary)]">
                {overallProgress?.toFixed(0) || 0}%
              </span>
            </div>
            <div>
              <span className="text-[var(--muted)]">Completed: </span>
              <span className="font-semibold">{completedPhases}/{totalPhases}</span>
            </div>
            {inProgressPhases > 0 && (
              <div>
                <span className="text-[var(--muted)]">In Progress: </span>
                <span className="font-semibold">{inProgressPhases}</span>
              </div>
            )}
          </div>
        </div>
        <Link 
          href="/phases" 
          className="btn btn-primary text-sm flex items-center gap-2"
        >
          <span>View Phases</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
