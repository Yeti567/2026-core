import { getServerUser } from '@/lib/auth/helpers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Shield, FileText, Users, GraduationCap, FolderOpen, 
  Wrench, Settings, BarChart3, ClipboardCheck, Building2,
  Camera, BookOpen, AlertTriangle, Calendar
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const quickActions = [
  {
    title: 'COR Audit Dashboard',
    description: 'Track your Certificate of Recognition progress',
    href: '/audit',
    icon: Shield,
    color: 'from-blue-500 to-indigo-600',
    primary: true,
  },
  {
    title: 'Forms & Inspections',
    description: 'Create, fill, and manage safety forms',
    href: '/forms',
    icon: FileText,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    title: 'Employees',
    description: 'Manage your team and training records',
    href: '/admin/employees',
    icon: Users,
    color: 'from-violet-500 to-purple-600',
  },
  {
    title: 'Certifications',
    description: 'Track expiring certifications and training',
    href: '/admin/certifications',
    icon: GraduationCap,
    color: 'from-amber-500 to-orange-600',
  },
  {
    title: 'Documents',
    description: 'Document registry and control',
    href: '/admin/documents',
    icon: FolderOpen,
    color: 'from-cyan-500 to-blue-600',
  },
  {
    title: 'Equipment & Maintenance',
    description: 'Track equipment inspections and repairs',
    href: '/admin/maintenance',
    icon: Wrench,
    color: 'from-rose-500 to-pink-600',
  },
  {
    title: 'Master Libraries',
    description: 'Hazards, tasks, SDS, and legislation',
    href: '/admin/libraries',
    icon: BookOpen,
    color: 'from-indigo-500 to-blue-600',
  },
  {
    title: 'Company Settings',
    description: 'Configure your company profile',
    href: '/admin/settings',
    icon: Settings,
    color: 'from-slate-500 to-gray-600',
  },
];

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

        {/* Main Navigation Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`group relative p-5 rounded-xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                action.primary 
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-700 border-blue-500/50 shadow-lg shadow-blue-500/20' 
                  : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                action.primary 
                  ? 'bg-white/20' 
                  : `bg-gradient-to-br ${action.color}`
              } shadow-lg group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-1">{action.title}</h3>
              <p className={`text-sm ${action.primary ? 'text-blue-100' : 'text-slate-400'}`}>
                {action.description}
              </p>
            </Link>
          ))}
        </div>

        {/* Quick Actions Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Upload Certificates Card */}
          <div className="p-6 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Camera className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Upload Training Certificates</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Take a photo of your safety tickets, training certificates, or licenses.
                </p>
                <Link 
                  href="/my-certificates" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Upload Certificate
                </Link>
              </div>
            </div>
          </div>

          {/* Action Plan Card */}
          <div className="p-6 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">COR Action Plan</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Track your tasks and progress toward COR certification.
                </p>
                <Link 
                  href="/action-plan" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  View Action Plan
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Help Link */}
        <div className="mt-8 text-center">
          <Link href="/help" className="text-slate-400 hover:text-white text-sm transition-colors">
            Need help? Visit our Help Center →
          </Link>
        </div>
      </div>
    </main>
  );
}
