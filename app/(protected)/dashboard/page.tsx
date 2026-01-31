import { getServerUser } from '@/lib/auth/helpers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Shield, FileText, Users, GraduationCap, FolderOpen, 
  Wrench, Settings, BarChart3, ClipboardCheck, Building2,
  Camera, BookOpen, AlertTriangle, Calendar, Target,
  Upload, Bell, FileCheck, Layers, MapPin, Briefcase,
  Package, Receipt, Clock, CheckSquare, TrendingUp, HelpCircle
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const featureCategories = [
  {
    category: 'COR Compliance',
    color: 'from-blue-500 to-indigo-600',
    features: [
      { title: 'COR Audit Dashboard', href: '/audit', icon: Shield, description: 'Track all 14 COR elements' },
      { title: 'Compliance Scorecard', href: '/audit', icon: TrendingUp, description: 'View your audit readiness' },
      { title: 'Action Plan', href: '/admin/action-plan', icon: Target, description: 'Tasks to certification' },
      { title: 'COR Roadmap', href: '/phases', icon: MapPin, description: 'Your certification journey' },
    ]
  },
  {
    category: 'Forms & Inspections',
    color: 'from-emerald-500 to-teal-600',
    features: [
      { title: 'Form Templates', href: '/admin/form-templates', icon: FileText, description: 'Create & manage forms' },
      { title: 'Form Builder', href: '/form-builder', icon: Layers, description: 'Build custom forms' },
      { title: 'Submissions', href: '/forms', icon: CheckSquare, description: 'View completed forms' },
      { title: 'PDF Import', href: '/form-builder', icon: Upload, description: 'Import existing PDFs' },
    ]
  },
  {
    category: 'Team Management',
    color: 'from-violet-500 to-purple-600',
    features: [
      { title: 'Employees', href: '/admin/employees', icon: Users, description: 'Manage your workforce' },
      { title: 'Departments', href: '/admin/departments', icon: Building2, description: 'Organize your team' },
      { title: 'Certifications', href: '/admin/certifications', icon: GraduationCap, description: 'Track training & tickets' },
      { title: 'Bulk Upload Certs', href: '/admin/certifications/bulk-upload', icon: Upload, description: 'Upload multiple certs' },
    ]
  },
  {
    category: 'Documents',
    color: 'from-cyan-500 to-blue-600',
    features: [
      { title: 'Document Registry', href: '/admin/documents', icon: FolderOpen, description: 'All company documents' },
      { title: 'Upload Documents', href: '/admin/documents/upload', icon: Upload, description: 'Add new documents' },
      { title: 'Document Reviews', href: '/admin/documents/reviews', icon: FileCheck, description: 'Pending approvals' },
      { title: 'Audit Documents', href: '/admin/audit/documents', icon: Shield, description: 'COR evidence files' },
    ]
  },
  {
    category: 'Equipment & Maintenance',
    color: 'from-rose-500 to-pink-600',
    features: [
      { title: 'Maintenance Dashboard', href: '/admin/maintenance', icon: Wrench, description: 'Equipment overview' },
      { title: 'Work Orders', href: '/admin/maintenance', icon: ClipboardCheck, description: 'Track repairs' },
      { title: 'Equipment List', href: '/admin/libraries', icon: Package, description: 'All equipment' },
      { title: 'Inspection Schedules', href: '/admin/maintenance', icon: Calendar, description: 'Upcoming inspections' },
    ]
  },
  {
    category: 'Libraries & Reference',
    color: 'from-amber-500 to-orange-600',
    features: [
      { title: 'Hazard Library', href: '/admin/libraries', icon: AlertTriangle, description: 'Hazards & controls' },
      { title: 'Task Library', href: '/admin/libraries', icon: Briefcase, description: 'Standard tasks' },
      { title: 'SDS Library', href: '/admin/libraries', icon: FileText, description: 'Safety data sheets' },
      { title: 'Legislation', href: '/admin/libraries', icon: BookOpen, description: 'Regulatory references' },
    ]
  },
  {
    category: 'Integrations & Export',
    color: 'from-indigo-500 to-purple-600',
    features: [
      { title: 'AuditSoft Export', href: '/admin/auditsoft', icon: Package, description: 'Export to AuditSoft' },
      { title: 'Reports', href: '/admin/certifications/reports', icon: BarChart3, description: 'Generate reports' },
      { title: 'Notifications', href: '/admin/certifications/notifications', icon: Bell, description: 'Alert settings' },
    ]
  },
  {
    category: 'Settings & Help',
    color: 'from-slate-500 to-gray-600',
    features: [
      { title: 'Company Settings', href: '/admin/settings', icon: Settings, description: 'Company profile' },
      { title: 'Help Center', href: '/help', icon: HelpCircle, description: 'Guides & tutorials' },
      { title: 'About', href: '/about', icon: Building2, description: 'About COR Pathway' },
    ]
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

        {/* All Features by Category */}
        <div className="space-y-8">
          {featureCategories.map((cat) => (
            <div key={cat.category}>
              <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2`}>
                <span className={`w-3 h-3 rounded-full bg-gradient-to-r ${cat.color}`} />
                {cat.category}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {cat.features.map((feature) => (
                  <Link
                    key={feature.href + feature.title}
                    href={feature.href}
                    className="group flex items-start gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800 transition-all duration-200 hover:scale-[1.01]"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm">{feature.title}</h3>
                      <p className="text-xs text-slate-400 truncate">{feature.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Action - Upload Certificates */}
        <div className="mt-10 p-6 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Camera className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold">Upload Training Certificates</h3>
                <p className="text-sm text-slate-400">Take a photo of your safety tickets or licenses</p>
              </div>
            </div>
            <Link 
              href="/my-certificates" 
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
            >
              <Camera className="w-4 h-4" />
              Upload Certificate
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
