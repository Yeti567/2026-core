'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';

export default function OnboardingPage() {
  const [checking, setChecking] = useState(true);
  const [hasCompany, setHasCompany] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkContext() {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user has a profile with a company_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profile?.company_id) {
        setHasCompany(true);
      } else {
        setHasCompany(false);
      }

      setChecking(false);
    }

    checkContext();
  }, [router]);

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-slate-400 font-medium">Preparing environment...</p>
        </div>
      </main>
    );
  }

  if (!hasCompany) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
        <div className="card max-w-md w-full text-center border-slate-800 bg-slate-900/40 backdrop-blur-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/10 rotate-3">
            <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h1 className="text-2xl font-black mb-2 text-white">Setup Required</h1>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed px-4">
            You haven't been assigned to a company yet. To proceed, you either need to be invited or register a new company.
          </p>

          <div className="space-y-4 px-2">
            <button
              onClick={() => router.push('/signup')}
              className="btn btn-primary w-full h-12 font-bold shadow-lg shadow-indigo-600/20"
            >
              Register New Company
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full text-sm font-bold text-slate-500 hover:text-white transition-colors"
            >
              Return to Website
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080a0c] selection:bg-indigo-500/30">
      <OnboardingWizard />
    </main>
  );
}
