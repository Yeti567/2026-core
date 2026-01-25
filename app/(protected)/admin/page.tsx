import { requireRole } from '@/lib/auth/helpers';
import Link from 'next/link';

export default async function AdminPage() {
  // This will redirect to /forbidden if user is not admin or super_admin
  const user = await requireRole(['admin', 'super_admin']);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-[var(--muted)]">Manage your organization</p>
          </div>
          <Link href="/dashboard" className="btn border border-[var(--border)]">
            ← Back to Dashboard
          </Link>
        </header>

        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="badge badge-red">🔐 Protected</span>
            <span className="badge badge-blue">{user.role}</span>
          </div>
          <h2 className="text-lg font-semibold mb-2">Access Verified</h2>
          <p className="text-sm text-[var(--muted)]">
            You have successfully accessed the admin area. This page is protected
            by the middleware which checks that your role is either 
            <code className="mx-1 px-1 py-0.5 bg-[var(--background)] rounded">admin</code>
            or
            <code className="mx-1 px-1 py-0.5 bg-[var(--background)] rounded">super_admin</code>.
          </p>
        </div>

        {user.role === 'super_admin' && (
          <div className="card border-amber-500/30">
            <div className="flex items-center gap-3 mb-4">
              <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
                👑 Super Admin
              </span>
            </div>
            <h2 className="text-lg font-semibold mb-2">Cross-Company Access</h2>
            <p className="text-sm text-[var(--muted)]">
              As a super_admin, you can view and manage data across all companies.
              Use the <code className="mx-1 px-1 py-0.5 bg-[var(--background)] rounded">createSuperAdminQuery()</code>
              function to query without company_id filtering.
            </p>
          </div>
        )}

        {/* COR Audit Dashboard Highlight */}
        <Link 
          href="/admin/audit-dashboard" 
          className="block card mt-6 border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent hover:border-indigo-500/50 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl group-hover:scale-110 transition-transform">🎯</div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">COR Audit Dashboard</h3>
              <p className="text-sm text-[var(--muted)]">
                Track compliance progress, identify gaps, and prepare for your Certificate of Recognition audit.
              </p>
            </div>
            <span className="badge badge-blue">New</span>
          </div>
        </Link>

        {/* Certification Tracker Highlight */}
        <Link 
          href="/admin/certifications" 
          className="block card mt-6 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent hover:border-amber-500/50 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl group-hover:scale-110 transition-transform">🎓</div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Certification & Training Tracker</h3>
              <p className="text-sm text-[var(--muted)]">
                Track worker certifications, expiry dates, training records, and compliance status.
              </p>
            </div>
            <span className="badge badge-blue">New</span>
          </div>
        </Link>

        {/* Master Libraries Highlight */}
        <Link 
          href="/admin/libraries" 
          className="block card mt-6 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent hover:border-emerald-500/50 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl group-hover:scale-110 transition-transform">📚</div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Master Libraries</h3>
              <p className="text-sm text-[var(--muted)]">
                Hazards, Equipment, Tasks, Jobsites, SDS, and Legislation - centralized safety data.
              </p>
            </div>
            <span className="badge badge-blue">New</span>
          </div>
        </Link>

        {/* AuditSoft Integration Highlight */}
        <Link 
          href="/admin/auditsoft" 
          className="block card mt-6 border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent hover:border-cyan-500/50 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl group-hover:scale-110 transition-transform">🔗</div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">AuditSoft Integration</h3>
              <p className="text-sm text-[var(--muted)]">
                One-click export to AuditSoft. Map evidence, sync automatically, and complete audits 50% faster.
              </p>
            </div>
            <span className="badge badge-blue">New</span>
          </div>
        </Link>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-6">
          <Link href="/admin/employees" className="card text-center hover:border-[var(--primary)] transition-colors group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">👥</div>
            <h3 className="font-semibold">Employees</h3>
            <p className="text-xs text-[var(--muted)]">Invite & manage workers</p>
          </Link>
          <Link href="/admin/certifications" className="card text-center hover:border-[var(--primary)] transition-colors group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🎓</div>
            <h3 className="font-semibold">Certifications</h3>
            <p className="text-xs text-[var(--muted)]">Track & manage certs</p>
          </Link>
          <Link href="/admin/form-templates" className="card text-center hover:border-[var(--primary)] transition-colors group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📋</div>
            <h3 className="font-semibold">Form Templates</h3>
            <p className="text-xs text-[var(--muted)]">Manage & review forms</p>
          </Link>
          <Link href="/admin/libraries" className="card text-center hover:border-[var(--primary)] transition-colors group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📚</div>
            <h3 className="font-semibold">Master Libraries</h3>
            <p className="text-xs text-[var(--muted)]">Hazards, Equipment, SDS</p>
          </Link>
          <Link href="/admin/audit-dashboard" className="card text-center hover:border-[var(--primary)] transition-colors group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📊</div>
            <h3 className="font-semibold">Audit Readiness</h3>
            <p className="text-xs text-[var(--muted)]">Compliance scoring</p>
          </Link>
          <Link href="/admin/mock-audit" className="card text-center hover:border-[var(--primary)] transition-colors group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🎤</div>
            <h3 className="font-semibold">Mock Audit</h3>
            <p className="text-xs text-[var(--muted)]">AI interview practice</p>
          </Link>
          <Link href="/admin/action-plan" className="card text-center hover:border-[var(--primary)] transition-colors group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🎯</div>
            <h3 className="font-semibold">Action Plan</h3>
            <p className="text-xs text-[var(--muted)]">Track tasks to COR</p>
          </Link>
          <Link href="/admin/auditsoft" className="card text-center hover:border-cyan-500 transition-colors group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🔗</div>
            <h3 className="font-semibold">AuditSoft</h3>
            <p className="text-xs text-[var(--muted)]">Export to auditor</p>
          </Link>
          <Link href="/admin/settings" className="card text-center hover:border-slate-500 transition-colors group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">⚙️</div>
            <h3 className="font-semibold">Settings</h3>
            <p className="text-xs text-[var(--muted)]">Integrations & more</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
