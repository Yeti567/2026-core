import { getServerUser } from '@/lib/auth/helpers';
import { redirect } from 'next/navigation';
import { Shield, HelpCircle } from 'lucide-react';
import { ComplianceStatsWidget } from '@/components/dashboard/compliance-stats-widget';
import { DashboardAccordion } from '@/components/dashboard/dashboard-accordion';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getServerUser();
  
  if (!user) {
    redirect('/login?error=session_invalid');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">COR Pathway</h1>
              <p className="text-slate-400">Welcome back! Select where you'd like to go.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <div className="text-slate-400">Signed in as</div>
              <div className="font-medium capitalize">{user.role.replace('_', ' ')}</div>
            </div>
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm transition-colors">
                Sign Out
              </button>
            </form>
          </div>
        </header>

        {/* Compliance Stats Dashboard */}
        <div className="mb-10">
          <ComplianceStatsWidget />
        </div>

        {/* Navigation Accordion */}
        <DashboardAccordion />

        {/* Contact Support */}
        <div className="mt-10 text-center p-6 rounded-xl bg-slate-800/50 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-2">Need Help?</h3>
          <p className="text-slate-400 mb-4">
            Questions about COR Pathway? Our team is here to help.
          </p>
          <a 
            href="mailto:blake@calibribusinesssolutions.ca"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            Contact Support
          </a>
        </div>
      </div>
    </main>
  );
}
