import { getServerUser } from '@/lib/auth/helpers';
import { redirect } from 'next/navigation';
import { 
  Shield, FileText, Users, GraduationCap, FolderOpen, 
  Wrench, Settings, BarChart3, ClipboardCheck, Building2,
  Camera, BookOpen, AlertTriangle, Calendar, Target,
  Upload, Bell, FileCheck, Layers, MapPin, Briefcase,
  Package, CheckSquare, TrendingUp, HelpCircle
} from 'lucide-react';
import { ComplianceStatsWidget } from '@/components/dashboard/compliance-stats-widget';
import { DashboardAccordion } from '@/components/dashboard/dashboard-accordion';

export const dynamic = 'force-dynamic';

const dashboardCategories = [
  {
    category: 'COR Compliance',
    icon: Shield,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    features: [
      { title: 'COR Audit Dashboard', href: '/audit', icon: Shield, description: 'Track all 14 COR elements' },
      { title: 'Compliance Scorecard', href: '/audit', icon: TrendingUp, description: 'View your audit readiness' },
      { title: 'Action Plan', href: '/admin/action-plan', icon: Target, description: 'Tasks to certification' },
      { title: 'COR Roadmap', href: '/phases', icon: MapPin, description: 'Your certification journey' },
    ]
  },
  {
    category: 'Forms & Documents',
    icon: FileText,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    features: [
      { title: 'Form Templates', href: '/admin/form-templates', icon: FileText, description: 'Create & manage forms' },
      { title: 'Forms Manager', href: '/admin/forms', icon: Layers, description: 'Build custom forms' },
      { title: 'Submissions', href: '/forms', icon: CheckSquare, description: 'View completed forms' },
      { title: 'PDF Import', href: '/admin/forms/import', icon: Upload, description: 'Import existing PDFs' },
      { title: 'Document Registry', href: '/admin/documents', icon: FolderOpen, description: 'All company documents' },
      { title: 'Upload Documents', href: '/admin/documents/upload', icon: Upload, description: 'Add new documents' },
      { title: 'Document Reviews', href: '/admin/documents/reviews', icon: FileCheck, description: 'Pending approvals' },
      { title: 'Audit Documents', href: '/admin/audit/documents', icon: Shield, description: 'COR evidence files' },
    ]
  },
  {
    category: 'Team & Training',
    icon: Users,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/20',
    features: [
      { title: 'Employees', href: '/admin/employees', icon: Users, description: 'Manage your workforce' },
      { title: 'Departments', href: '/admin/departments', icon: Building2, description: 'Organize your team' },
      { title: 'Certifications', href: '/admin/certifications', icon: GraduationCap, description: 'Track training & tickets' },
      { title: 'Bulk Upload Certs', href: '/admin/certifications/bulk-upload', icon: Upload, description: 'Upload multiple certs' },
      { title: 'My Certificates', href: '/my-certificates', icon: Camera, description: 'Upload your tickets' },
    ]
  },
  {
    category: 'Equipment & Libraries',
    icon: Wrench,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    features: [
      { title: 'Maintenance Dashboard', href: '/admin/maintenance', icon: Wrench, description: 'Equipment overview' },
      { title: 'Work Orders', href: '/admin/maintenance', icon: ClipboardCheck, description: 'Track repairs' },
      { title: 'Equipment List', href: '/admin/libraries', icon: Package, description: 'All equipment' },
      { title: 'Inspection Schedules', href: '/admin/maintenance', icon: Calendar, description: 'Upcoming inspections' },
      { title: 'Hazard Library', href: '/admin/libraries', icon: AlertTriangle, description: 'Hazards & controls' },
      { title: 'Task Library', href: '/admin/libraries', icon: Briefcase, description: 'Standard tasks' },
      { title: 'SDS Library', href: '/admin/libraries', icon: FileText, description: 'Safety data sheets' },
      { title: 'Legislation', href: '/admin/libraries', icon: BookOpen, description: 'Regulatory references' },
    ]
  },
  {
    category: 'Reports & Settings',
    icon: Settings,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    features: [
      { title: 'AuditSoft Export', href: '/admin/auditsoft', icon: Package, description: 'Export to AuditSoft' },
      { title: 'Reports', href: '/admin/certifications/reports', icon: BarChart3, description: 'Generate reports' },
      { title: 'Notifications', href: '/admin/certifications/notifications', icon: Bell, description: 'Alert settings' },
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

        {/* Compliance Stats Dashboard */}
        <div className="mb-10">
          <ComplianceStatsWidget />
        </div>

        {/* Navigation Accordion */}
        <DashboardAccordion categories={dashboardCategories} />

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
