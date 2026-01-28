import { createClient } from '@/lib/supabase/server';
import { authenticateServerComponentSimple } from '@/lib/auth/jwt-simple';
import Link from 'next/link';

export async function OnboardingWidget() {
    const supabase = await createClient();

    const { user, error } = await authenticateServerComponentSimple();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('user_id', user.userId)
        .single();

    if (!profile?.company_id) return null;

    const { data: progress } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('company_id', profile.company_id)
        .single();

    // If already complete or doesn't exist (though it should), don't show
    if (!progress || progress.completed_steps?.length === 5) {
        return null;
    }

    const completedCount = progress.completed_steps?.length || 0;
    const percentage = (completedCount / 5) * 100;

    return (
        <div className="card md:col-span-2 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-indigo-500/5 border-indigo-500/30 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-24 h-24 text-indigo-400 rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
                <div className="p-4 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                    <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-black text-white tracking-tight">Setup Your Workspace</h2>
                        <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-500 text-white px-2 py-0.5 rounded shadow-sm">Incomplete</span>
                    </div>
                    <p className="text-sm text-slate-400 mb-4 max-w-xl font-medium leading-relaxed">
                        You've completed <span className="text-indigo-400 font-bold">{completedCount} of 5</span> setup steps. Finish these to unlock full safety management features.
                    </p>

                    <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>

                <div className="flex flex-col items-stretch md:items-end gap-3 min-w-[160px]">
                    <Link
                        href="/onboarding"
                        className="btn btn-primary h-12 flex items-center justify-center gap-2 group/btn shadow-lg shadow-indigo-600/20"
                    >
                        <span className="font-bold">Resume Setup</span>
                        <svg className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </Link>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center md:text-right">Estimated 2 mins left</span>
                </div>
            </div>
        </div>
    );
}
