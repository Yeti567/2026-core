import Link from 'next/link';
import { ChevronLeft, Users, UserPlus, Mail, Shield, Building } from 'lucide-react';

export default function EmployeesHelpPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/help"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Help Center
        </Link>

        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <Users className="w-6 h-6 text-violet-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Employee Management</h1>
          </div>
          <p className="text-slate-400 text-lg">
            Add, manage, and organize your team members.
          </p>
        </header>

        <div className="space-y-8">
          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold text-white">Adding Employees</h2>
            </div>
            <ol className="list-decimal list-inside text-slate-300 space-y-3 ml-4">
              <li>Go to <strong>Admin → Employees</strong></li>
              <li>Click <strong>"Add Employee"</strong></li>
              <li>Enter their name, email, and job title</li>
              <li>Select their department</li>
              <li>Choose their role (Worker, Supervisor, Admin)</li>
              <li>Click <strong>"Send Invitation"</strong></li>
            </ol>
            <p className="text-slate-400 mt-4 text-sm">
              The employee will receive an email invitation to set up their account.
            </p>
          </section>

          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">User Roles</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">Worker</p>
                <p className="text-sm text-slate-400">Can fill out forms, view assigned documents, upload their own certifications</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">Supervisor</p>
                <p className="text-sm text-slate-400">Worker permissions plus: approve forms, view team reports, assign tasks</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">Internal Auditor</p>
                <p className="text-sm text-slate-400">View-only access to admin pages for audit preparation</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">Admin</p>
                <p className="text-sm text-slate-400">Full access: manage employees, create forms, configure settings</p>
              </div>
            </div>
          </section>

          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-semibold text-white">Invitations</h2>
            </div>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Invitations are sent via email with a secure link</li>
              <li>Links expire after 7 days</li>
              <li>You can resend invitations if they expire</li>
              <li>Track invitation status (Pending, Accepted, Expired)</li>
            </ul>
          </section>

          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Building className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white">Departments</h2>
            </div>
            <p className="text-slate-300 mb-4">
              Organize employees into departments for better management:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Filter reports by department</li>
              <li>Assign forms to specific departments</li>
              <li>Track certifications by department</li>
              <li>Set department-specific safety requirements</li>
            </ul>
          </section>
        </div>

        <div className="mt-8 flex gap-4">
          <Link
            href="/admin/employees"
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
          >
            Manage Employees
          </Link>
          <Link
            href="/help/departments"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Departments Guide
          </Link>
        </div>
      </div>
    </main>
  );
}
