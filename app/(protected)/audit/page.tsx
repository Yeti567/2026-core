import { getServerUserOrRedirect } from '@/lib/auth/helpers';
import { AuditDashboard } from './audit-dashboard';

export default async function AuditPage() {
  const user = await getServerUserOrRedirect();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10">
        <AuditDashboard userRole={user.role} />
      </div>
    </main>
  );
}
