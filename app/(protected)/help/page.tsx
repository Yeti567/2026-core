import Link from 'next/link';
import { 
  LayoutDashboard, FileText, Users, GraduationCap, FolderOpen,
  ClipboardCheck, Target, Wrench, Settings, BookOpen, Shield,
  ChevronRight, HelpCircle
} from 'lucide-react';

const helpSections = [
  {
    title: 'Getting Started',
    icon: LayoutDashboard,
    color: 'from-blue-500/20 to-indigo-500/20',
    borderColor: 'border-blue-500/30',
    items: [
      { name: 'Dashboard Overview', href: '/help/dashboard', description: 'Navigate your main hub' },
      { name: 'Your First Steps', href: '/help/getting-started', description: 'Quick start guide for new users' },
    ]
  },
  {
    title: 'Forms & Inspections',
    icon: FileText,
    color: 'from-emerald-500/20 to-green-500/20',
    borderColor: 'border-emerald-500/30',
    items: [
      { name: 'Form Builder', href: '/help/form-builder', description: 'Create and edit form templates' },
      { name: 'Filling Out Forms', href: '/help/filling-forms', description: 'Complete safety inspections' },
      { name: 'PDF Import', href: '/help/pdf-import', description: 'Import existing PDF forms' },
    ]
  },
  {
    title: 'Team Management',
    icon: Users,
    color: 'from-violet-500/20 to-purple-500/20',
    borderColor: 'border-violet-500/30',
    items: [
      { name: 'Employee Management', href: '/help/employees', description: 'Add and manage workers' },
      { name: 'Departments', href: '/help/departments', description: 'Organize your team' },
      { name: 'Inviting Users', href: '/help/invitations', description: 'Send worker invitations' },
    ]
  },
  {
    title: 'Certifications & Training',
    icon: GraduationCap,
    color: 'from-amber-500/20 to-orange-500/20',
    borderColor: 'border-amber-500/30',
    items: [
      { name: 'Certification Tracker', href: '/help/certifications', description: 'Track expiring certifications' },
      { name: 'Training Records', href: '/help/training', description: 'Manage training documentation' },
      { name: 'Bulk Upload', href: '/help/cert-upload', description: 'Upload multiple certificates' },
    ]
  },
  {
    title: 'Documents',
    icon: FolderOpen,
    color: 'from-cyan-500/20 to-teal-500/20',
    borderColor: 'border-cyan-500/30',
    items: [
      { name: 'Document Registry', href: '/help/documents', description: 'Organize compliance documents' },
      { name: 'Uploading Documents', href: '/help/upload-documents', description: 'Add new documents' },
      { name: 'Document Control', href: '/help/document-control', description: 'Version control and approval' },
    ]
  },
  {
    title: 'COR Audit',
    icon: ClipboardCheck,
    color: 'from-rose-500/20 to-pink-500/20',
    borderColor: 'border-rose-500/30',
    items: [
      { name: 'Audit Dashboard', href: '/help/audit-dashboard', description: 'Track COR readiness' },
      { name: 'Evidence Mapping', href: '/help/evidence-mapping', description: 'Link evidence to elements' },
      { name: 'Mock Audit', href: '/help/mock-audit', description: 'Practice for your audit' },
    ]
  },
  {
    title: 'Action Plans',
    icon: Target,
    color: 'from-indigo-500/20 to-blue-500/20',
    borderColor: 'border-indigo-500/30',
    items: [
      { name: 'Action Plan', href: '/help/action-plan', description: 'Track tasks to completion' },
      { name: 'COR Roadmap', href: '/help/cor-roadmap', description: 'Your path to certification' },
    ]
  },
  {
    title: 'Equipment & Maintenance',
    icon: Wrench,
    color: 'from-slate-500/20 to-gray-500/20',
    borderColor: 'border-slate-500/30',
    items: [
      { name: 'Maintenance Tracking', href: '/help/maintenance', description: 'Schedule equipment maintenance' },
      { name: 'Equipment Library', href: '/help/equipment', description: 'Manage your equipment' },
    ]
  },
  {
    title: 'Libraries',
    icon: BookOpen,
    color: 'from-pink-500/20 to-rose-500/20',
    borderColor: 'border-pink-500/30',
    items: [
      { name: 'Hazard Library', href: '/help/hazards', description: 'Common workplace hazards' },
      { name: 'SDS Library', href: '/help/sds', description: 'Safety Data Sheets' },
      { name: 'Legislation', href: '/help/legislation', description: 'Regulatory requirements' },
    ]
  },
  {
    title: 'Settings & Admin',
    icon: Settings,
    color: 'from-gray-500/20 to-slate-500/20',
    borderColor: 'border-gray-500/30',
    items: [
      { name: 'Company Settings', href: '/help/settings', description: 'Configure your account' },
      { name: 'Integrations', href: '/help/integrations', description: 'Connect external tools' },
      { name: 'AuditSoft Export', href: '/help/auditsoft', description: 'Export to AuditSoft' },
    ]
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
              <HelpCircle className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Help Center</h1>
              <p className="text-slate-400">Learn how to use COR Pathways</p>
            </div>
          </div>
        </header>

        {/* Quick Start Card */}
        <div className="mb-10 p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-indigo-500/20">
              <Shield className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Welcome to COR Pathways</h2>
              <p className="text-slate-300 mb-4">
                COR Pathways helps you manage your Certificate of Recognition (COR) journey. 
                From tracking employee certifications to preparing for audits, everything you need is here.
              </p>
              <Link 
                href="/help/getting-started"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
              >
                Get Started Guide
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Help Sections Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {helpSections.map((section) => {
            const Icon = section.icon;
            return (
              <div 
                key={section.title}
                className={`rounded-xl bg-gradient-to-br ${section.color} border ${section.borderColor} p-5`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Icon className="w-5 h-5 text-white/80" />
                  <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                </div>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 hover:bg-slate-800/70 transition-colors group"
                    >
                      <div>
                        <p className="text-white font-medium">{item.name}</p>
                        <p className="text-sm text-slate-400">{item.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact Support */}
        <div className="mt-10 text-center p-6 rounded-xl bg-slate-800/50 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-2">Need More Help?</h3>
          <p className="text-slate-400 mb-4">
            Can't find what you're looking for? Contact our support team.
          </p>
          <a 
            href="mailto:support@corpathways.ca"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </main>
  );
}
