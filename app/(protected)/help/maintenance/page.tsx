import Link from 'next/link';
import { ArrowLeft, Wrench, Settings, DollarSign, Calendar, FileText, AlertTriangle } from 'lucide-react';

export default function MaintenanceHelpPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link 
          href="/help" 
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Help Center
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-500/20 to-gray-500/20 border border-slate-500/30 flex items-center justify-center">
            <Wrench className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Maintenance Tracking</h1>
            <p className="text-slate-400">Schedule and track equipment maintenance</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Overview */}
          <section className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4">Overview</h2>
            <p className="text-slate-300 leading-relaxed">
              The Maintenance Tracking system helps you stay on top of equipment inspections, 
              repairs, and scheduled maintenance. Track work orders, log maintenance records, 
              and ensure your equipment is always audit-ready for COR compliance.
            </p>
          </section>

          {/* Cost Tracking Toggle - Important callout */}
          <section className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-6 border border-amber-500/30">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2 text-amber-400">Don't Want to Track Expenses?</h2>
                <p className="text-slate-300 leading-relaxed mb-4">
                  If you prefer to only track maintenance activities without recording dollar amounts 
                  for labor, parts, and repairs, you can easily turn off cost tracking.
                </p>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    How to Disable Cost Tracking
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-slate-300 text-sm">
                    <li>Go to <strong>Settings</strong> (click the gear icon in the menu)</li>
                    <li>Scroll down to the <strong>"Maintenance Settings"</strong> section</li>
                    <li>Toggle off <strong>"Track Maintenance Costs"</strong></li>
                    <li>Click <strong>"Save All Settings"</strong></li>
                  </ol>
                  <p className="text-slate-400 text-sm mt-4">
                    When disabled, all cost-related fields will be hidden from maintenance forms, 
                    the dashboard, and reports. You can turn it back on at any time.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Key Features */}
          <section className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4">Key Features</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <h3 className="font-semibold">Maintenance Records</h3>
                </div>
                <p className="text-sm text-slate-400">
                  Log all maintenance activities including inspections, repairs, parts replacements, 
                  and certifications.
                </p>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="w-5 h-5 text-orange-400" />
                  <h3 className="font-semibold">Work Orders</h3>
                </div>
                <p className="text-sm text-slate-400">
                  Create and track work orders from request to completion with priority levels 
                  and assignments.
                </p>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-green-400" />
                  <h3 className="font-semibold">Maintenance Schedules</h3>
                </div>
                <p className="text-sm text-slate-400">
                  Set up recurring maintenance schedules based on time intervals or operating hours.
                </p>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <h3 className="font-semibold">Downtime Tracking</h3>
                </div>
                <p className="text-sm text-slate-400">
                  Monitor equipment downtime and availability to identify problem areas.
                </p>
              </div>
            </div>
          </section>

          {/* COR Compliance */}
          <section className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4">COR Compliance (Element 7)</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              Equipment maintenance records are critical for <strong>COR Element 7 - Preventive Maintenance</strong>. 
              The system automatically links maintenance records to your COR evidence chain.
            </p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                Daily pre-use inspections are logged and timestamped
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                Scheduled maintenance provides evidence of preventive care
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                Certification renewals are tracked with expiry alerts
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                Work orders document corrective actions taken
              </li>
            </ul>
          </section>

          {/* Quick Links */}
          <section className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4">Related Topics</h2>
            <div className="flex flex-wrap gap-3">
              <Link 
                href="/help/equipment" 
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
              >
                Equipment Library →
              </Link>
              <Link 
                href="/admin/maintenance" 
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
              >
                Go to Maintenance →
              </Link>
              <Link 
                href="/admin/settings" 
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
              >
                Company Settings →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
