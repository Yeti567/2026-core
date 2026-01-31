import Link from 'next/link';
import { ChevronLeft, LayoutDashboard, TrendingUp, Bell, Calendar, CheckSquare } from 'lucide-react';

export default function DashboardHelpPage() {
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
            <div className="p-2 rounded-lg bg-blue-500/20">
              <LayoutDashboard className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
          </div>
          <p className="text-slate-400 text-lg">
            Your dashboard is the central hub for monitoring your safety program and COR compliance.
          </p>
        </header>

        <div className="space-y-8">
          {/* Section 1 */}
          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold text-white">Compliance Score</h2>
            </div>
            <p className="text-slate-300 mb-4">
              The compliance score at the top of your dashboard shows your overall COR readiness percentage. 
              This score is calculated based on:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Document completion for each COR element</li>
              <li>Employee certification status</li>
              <li>Form submission history</li>
              <li>Action plan progress</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-semibold text-white">Notifications & Alerts</h2>
            </div>
            <p className="text-slate-300 mb-4">
              Stay on top of important events with real-time notifications:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li><strong>Expiring Certifications:</strong> Alerts when employee certs are about to expire</li>
              <li><strong>Overdue Tasks:</strong> Action items that need attention</li>
              <li><strong>Document Reviews:</strong> Documents pending approval</li>
              <li><strong>Form Submissions:</strong> New forms submitted by workers</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-violet-400" />
              <h2 className="text-xl font-semibold text-white">Upcoming Events</h2>
            </div>
            <p className="text-slate-300">
              View scheduled training sessions, audit dates, maintenance due dates, and other important 
              calendar events. Click on any event to see details or take action.
            </p>
          </section>

          {/* Section 4 */}
          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <CheckSquare className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
            </div>
            <p className="text-slate-300 mb-4">
              Common tasks are just one click away:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">Add Employee</p>
                <p className="text-sm text-slate-400">Invite new team members</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">Upload Document</p>
                <p className="text-sm text-slate-400">Add compliance docs</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">New Certification</p>
                <p className="text-sm text-slate-400">Record training</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">View Audit</p>
                <p className="text-sm text-slate-400">Check COR status</p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 flex gap-4">
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/help/getting-started"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Getting Started Guide
          </Link>
        </div>
      </div>
    </main>
  );
}
