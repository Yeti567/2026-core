import Link from 'next/link';

// Define all sections of the app
const sections = [
    {
        category: 'Getting Started',
        icon: '🚀',
        items: [
            {
                name: 'Register Company',
                description: 'Set up your company account and start your COR journey',
                href: '/register',
                color: 'from-emerald-500/20 to-green-500/20',
                borderColor: 'border-emerald-500/30',
            },
            {
                name: 'Sign In',
                description: 'Access your existing company account',
                href: '/login',
                color: 'from-blue-500/20 to-cyan-500/20',
                borderColor: 'border-blue-500/30',
            },
        ],
    },
    {
        category: 'Dashboard & Overview',
        icon: '📊',
        items: [
            {
                name: 'Main Dashboard',
                description: 'Your central hub for COR compliance tracking and status',
                href: '/dashboard',
                color: 'from-purple-500/20 to-pink-500/20',
                borderColor: 'border-purple-500/30',
            },
            {
                name: 'COR Roadmap',
                description: 'Visual guide through the COR certification process',
                href: '/cor-roadmap',
                color: 'from-amber-500/20 to-orange-500/20',
                borderColor: 'border-amber-500/30',
            },
            {
                name: 'Certification Phases',
                description: 'Track progress through each phase of certification',
                href: '/phases',
                color: 'from-cyan-500/20 to-teal-500/20',
                borderColor: 'border-cyan-500/30',
            },
        ],
    },
    {
        category: 'Audit & Compliance',
        icon: '✅',
        items: [
            {
                name: 'Audit Dashboard',
                description: 'Track compliance status and identify gaps',
                href: '/audit',
                color: 'from-indigo-500/20 to-purple-500/20',
                borderColor: 'border-indigo-500/30',
            },
            {
                name: 'Forms & Inspections',
                description: 'Safety forms, inspections, and checklists',
                href: '/forms',
                color: 'from-rose-500/20 to-pink-500/20',
                borderColor: 'border-rose-500/30',
            },
            {
                name: 'Document Registry',
                description: 'Manage and organize compliance documents',
                href: '/documents',
                color: 'from-slate-500/20 to-gray-500/20',
                borderColor: 'border-slate-500/30',
            },
        ],
    },
    {
        category: 'Administration',
        icon: '⚙️',
        items: [
            {
                name: 'Admin Panel',
                description: 'Manage employees, departments, and company settings',
                href: '/admin',
                color: 'from-red-500/20 to-orange-500/20',
                borderColor: 'border-red-500/30',
            },
            {
                name: 'Employee Management',
                description: 'Add, edit, and manage employee records',
                href: '/admin/employees',
                color: 'from-blue-500/20 to-indigo-500/20',
                borderColor: 'border-blue-500/30',
            },
            {
                name: 'Certifications',
                description: 'Track employee certifications and expiry dates',
                href: '/admin/certifications',
                color: 'from-green-500/20 to-emerald-500/20',
                borderColor: 'border-green-500/30',
            },
            {
                name: 'Departments',
                description: 'Organize your company into departments',
                href: '/admin/departments',
                color: 'from-violet-500/20 to-purple-500/20',
                borderColor: 'border-violet-500/30',
            },
        ],
    },
    {
        category: 'Document Management',
        icon: '📁',
        items: [
            {
                name: 'Document Registry',
                description: 'Central repository for all compliance documents',
                href: '/admin/document-registry',
                color: 'from-amber-500/20 to-yellow-500/20',
                borderColor: 'border-amber-500/30',
            },
            {
                name: 'Form Templates',
                description: 'Create and manage form templates',
                href: '/admin/form-templates',
                color: 'from-teal-500/20 to-cyan-500/20',
                borderColor: 'border-teal-500/30',
            },
            {
                name: 'Libraries',
                description: 'Safety libraries and reference materials',
                href: '/admin/libraries',
                color: 'from-pink-500/20 to-rose-500/20',
                borderColor: 'border-pink-500/30',
            },
        ],
    },
    {
        category: 'Tools & Integrations',
        icon: '🔧',
        items: [
            {
                name: 'Maintenance Tracking',
                description: 'Equipment maintenance and inspection schedules',
                href: '/admin/maintenance',
                color: 'from-orange-500/20 to-red-500/20',
                borderColor: 'border-orange-500/30',
            },
            {
                name: 'AuditSoft Integration',
                description: 'Connect with AuditSoft for advanced audit features',
                href: '/admin/auditsoft',
                color: 'from-indigo-500/20 to-blue-500/20',
                borderColor: 'border-indigo-500/30',
            },
            {
                name: 'Settings',
                description: 'Configure company and application settings',
                href: '/admin/settings',
                color: 'from-gray-500/20 to-slate-500/20',
                borderColor: 'border-gray-500/30',
            },
        ],
    },
];

export default function AppOverviewPage() {
    return (
        <main className="min-h-screen p-6 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <header className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">COR Pathways</h1>
                    <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto">
                        Complete Construction Safety Management Platform for COR Certification
                    </p>
                    <div className="mt-6 flex gap-4 justify-center">
                        <Link href="/register" className="btn btn-primary">
                            Register Your Company
                        </Link>
                        <Link href="/login" className="btn border border-[var(--border)]">
                            Sign In
                        </Link>
                    </div>
                </header>

                {/* Sections Grid */}
                <div className="space-y-12">
                    {sections.map((section) => (
                        <section key={section.category}>
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <span className="text-2xl">{section.icon}</span>
                                {section.category}
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {section.items.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`card bg-gradient-to-br ${item.color} ${item.borderColor} hover:scale-[1.02] transition-transform duration-200`}
                                    >
                                        <h3 className="font-semibold mb-2">{item.name}</h3>
                                        <p className="text-sm text-[var(--muted)]">{item.description}</p>
                                        <span className="text-xs text-[var(--muted)] mt-3 block opacity-60">
                                            {item.href}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>

                {/* Footer */}
                <footer className="mt-16 pt-8 border-t border-[var(--border)] text-center text-sm text-[var(--muted)]">
                    <p>COR Pathways - Construction Safety Management Platform</p>
                    <p className="mt-2">
                        <Link href="/" className="hover:underline">Home</Link>
                        {' · '}
                        <Link href="/register" className="hover:underline">Register</Link>
                        {' · '}
                        <Link href="/login" className="hover:underline">Sign In</Link>
                    </p>
                </footer>
            </div>
        </main>
    );
}
