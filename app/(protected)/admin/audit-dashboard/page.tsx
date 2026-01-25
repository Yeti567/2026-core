import { getServerUserOrRedirect } from '@/lib/auth/helpers';
import { AuditDashboardClient } from './audit-dashboard-client';

export default async function AuditDashboardPage() {
  const user = await getServerUserOrRedirect();

  // Check permissions - only admins and internal auditors can access
  if (!['admin', 'super_admin', 'internal_auditor'].includes(user.role)) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400">You don't have permission to view the audit dashboard.</p>
        </div>
      </main>
    );
  }

  return <AuditDashboardClient userRole={user.role} userId={user.userId} />;
}
