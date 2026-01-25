import { getServerUserOrRedirect } from '@/lib/auth/helpers';
import Link from 'next/link';
import { AuditSoftStatusWidget } from '@/components/dashboard/auditsoft-status-widget';
import { PhasesWidget } from '@/components/dashboard/phases-widget';
import { OnboardingWidget } from '@/components/dashboard/onboarding-widget';

export default async function DashboardPage() {
  const user = await getServerUserOrRedirect();

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-[var(--muted)]">Welcome back!</p>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="btn border border-[var(--border)]">
              Sign Out
            </button>
          </form>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Onboarding Progress (if incomplete) */}
          <OnboardingWidget />

          {/* User Context Card */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Your Context</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">User ID</dt>
                <dd className="font-mono text-xs">{user.userId.slice(0, 8)}...</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">Company ID</dt>
                <dd className="font-mono text-xs">{user.companyId.slice(0, 8)}...</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">Role</dt>
                <dd>
                  <span className={`badge ${user.role === 'super_admin' ? 'badge-red' :
                    user.role === 'admin' ? 'badge-blue' : 'badge-green'
                    }`}>
                    {user.role}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Middleware Headers Card */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Middleware Headers</h2>
            <p className="text-sm text-[var(--muted)] mb-3">
              These headers are injected by middleware:
            </p>
            <ul className="space-y-2 text-sm font-mono">
              <li className="flex items-center gap-2">
                <span className="badge badge-green">✓</span>
                x-company-id
              </li>
              <li className="flex items-center gap-2">
                <span className="badge badge-green">✓</span>
                x-user-role
              </li>
              <li className="flex items-center gap-2">
                <span className="badge badge-green">✓</span>
                x-user-id
              </li>
            </ul>
          </div>

          {/* Test API Card */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Test API Isolation</h2>
            <p className="text-sm text-[var(--muted)] mb-4">
              Try the workers API - it only returns data for your company.
            </p>
            <Link
              href="/api/workers"
              className="btn btn-primary text-sm"
              target="_blank"
            >
              GET /api/workers →
            </Link>
          </div>

          {/* Admin Link Card */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Admin Area</h2>
            <p className="text-sm text-[var(--muted)] mb-4">
              {user.role === 'admin' || user.role === 'super_admin'
                ? 'You have admin access.'
                : 'Requires admin or super_admin role.'}
            </p>
            <Link
              href="/admin"
              className={`btn text-sm ${user.role === 'admin' || user.role === 'super_admin'
                ? 'btn-primary'
                : 'border border-[var(--border)] opacity-50'
                }`}
            >
              Go to Admin →
            </Link>
          </div>

          {/* COR Certification Phases Widget */}
          <PhasesWidget />

          {/* COR Audit Dashboard Card */}
          <div className="card md:col-span-2 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-cyan-500/10 border-indigo-500/30">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/20">
                <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold mb-1">COR Audit Dashboard</h2>
                <p className="text-sm text-[var(--muted)]">
                  Track your compliance progress, identify gaps, and prepare for your Certificate of Recognition audit.
                </p>
              </div>
              <Link
                href="/audit"
                className="btn btn-primary text-sm flex items-center gap-2"
              >
                <span>Open Dashboard</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>

          {/* AuditSoft Integration Widget */}
          {(user.role === 'admin' || user.role === 'super_admin') && (
            <AuditSoftStatusWidget />
          )}
        </div>
      </div>
    </main>
  );
}
