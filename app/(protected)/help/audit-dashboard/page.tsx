import Link from 'next/link';
import { ChevronLeft, ClipboardCheck, Target, FileText, TrendingUp, AlertTriangle } from 'lucide-react';

export default function AuditDashboardHelpPage() {
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
            <div className="p-2 rounded-lg bg-rose-500/20">
              <ClipboardCheck className="w-6 h-6 text-rose-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Audit Dashboard</h1>
          </div>
          <p className="text-slate-400 text-lg">
            Track your COR audit readiness and identify compliance gaps.
          </p>
        </header>

        <div className="space-y-8">
          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold text-white">Compliance Score</h2>
            </div>
            <p className="text-slate-300 mb-4">
              Your overall COR readiness is displayed as a percentage score based on:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li><strong>Documentation:</strong> Required documents uploaded and current</li>
              <li><strong>Evidence:</strong> Forms and records linked to COR elements</li>
              <li><strong>Training:</strong> Employee certifications up to date</li>
              <li><strong>Processes:</strong> Procedures documented and followed</li>
            </ul>
          </section>

          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">The 14 COR Elements</h2>
            </div>
            <p className="text-slate-300 mb-4">
              COR audits evaluate your safety program across 14 elements:
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 rounded bg-slate-900/50 text-slate-300">1. Management Leadership</div>
              <div className="p-2 rounded bg-slate-900/50 text-slate-300">2. Hazard Identification</div>
              <div className="p-2 rounded bg-slate-900/50 text-slate-300">3. Hazard Control</div>
              <div className="p-2 rounded bg-slate-900/50 text-slate-300">4. Competency & Training</div>
              <div className="p-2 rounded bg-slate-900/50 text-slate-300">5. Workplace Behavior</div>
              <div className="p-2 rounded bg-slate-900/50 text-slate-300">6. PPE</div>
              <div className="p-2 rounded bg-slate-900/50 text-slate-300">7. Maintenance</div>
              <div className="p-2 rounded bg-slate-900/50 text-slate-300">8. Communication</div>
              <div className="p-2 rounded bg-slate-900/50 text-slate-300">9. Inspection</div>
              <div className="p-2 rounded bg-slate-900/50 text-slate-300">10. Incident Investigation</div>
              <div className="p-2 rounded bg-slate-900/50 text-slate-300">11. Emergency Response</div>
              <div className="p-2 rounded bg-slate-900/50 text-slate-300">12. Statistics & Records</div>
              <div className="p-2 rounded bg-slate-900/50 text-slate-300">13. Regulatory Compliance</div>
              <div className="p-2 rounded bg-slate-900/50 text-slate-300">14. Management Review</div>
            </div>
          </section>

          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-violet-400" />
              <h2 className="text-xl font-semibold text-white">Evidence Mapping</h2>
            </div>
            <p className="text-slate-300 mb-4">
              Link your documents and forms to specific COR elements:
            </p>
            <ol className="list-decimal list-inside text-slate-300 space-y-2 ml-4">
              <li>Click on a COR element to see what evidence is needed</li>
              <li>View documents already linked to that element</li>
              <li>Add new documents or forms as evidence</li>
              <li>Track your progress toward 100% for each element</li>
            </ol>
          </section>

          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-semibold text-white">Gap Analysis</h2>
            </div>
            <p className="text-slate-300 mb-4">
              The dashboard highlights areas that need attention:
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div>
                  <p className="text-white font-medium">Critical Gaps</p>
                  <p className="text-sm text-slate-400">Missing required documents or expired certifications</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div>
                  <p className="text-white font-medium">Needs Improvement</p>
                  <p className="text-sm text-slate-400">Partial evidence, needs more documentation</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <div>
                  <p className="text-white font-medium">Compliant</p>
                  <p className="text-sm text-slate-400">All requirements met for this element</p>
                </div>
              </div>
            </div>
          </section>

          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <ClipboardCheck className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white">Mock Audit</h2>
            </div>
            <p className="text-slate-300 mb-4">
              Practice for your COR audit with our AI-powered mock audit feature:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Simulated interview questions from an auditor</li>
              <li>Practice answering about your safety program</li>
              <li>Get feedback on your responses</li>
              <li>Identify areas where you need more preparation</li>
            </ul>
          </section>
        </div>

        <div className="mt-8 flex gap-4">
          <Link
            href="/admin/audit-dashboard"
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
          >
            Go to Audit Dashboard
          </Link>
          <Link
            href="/help/mock-audit"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Mock Audit Guide
          </Link>
        </div>
      </div>
    </main>
  );
}
