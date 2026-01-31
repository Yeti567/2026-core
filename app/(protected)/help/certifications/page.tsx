import Link from 'next/link';
import { ChevronLeft, GraduationCap, Upload, Bell, BarChart3, Calendar } from 'lucide-react';

export default function CertificationsHelpPage() {
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
            <div className="p-2 rounded-lg bg-amber-500/20">
              <GraduationCap className="w-6 h-6 text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Certification Tracker</h1>
          </div>
          <p className="text-slate-400 text-lg">
            Track employee certifications, training records, and expiry dates.
          </p>
        </header>

        <div className="space-y-8">
          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Upload className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold text-white">Adding Certifications</h2>
            </div>
            <ol className="list-decimal list-inside text-slate-300 space-y-3 ml-4">
              <li>Go to <strong>Admin → Certifications</strong></li>
              <li>Click <strong>"Add Certification"</strong></li>
              <li>Select the employee</li>
              <li>Choose the certification type (or create a new one)</li>
              <li>Enter issue and expiry dates</li>
              <li>Upload the certificate document (PDF, image)</li>
              <li>Click <strong>"Save"</strong></li>
            </ol>
          </section>

          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Certification Types</h2>
            </div>
            <p className="text-slate-300 mb-4">Common certification types you can track:</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">First Aid/CPR</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">Fall Protection</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">Forklift/Equipment</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">WHMIS</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">Confined Space</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">H2S Alive</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">Ground Disturbance</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">Driver's License</p>
              </div>
            </div>
            <p className="text-slate-400 mt-4 text-sm">
              You can create custom certification types in Settings.
            </p>
          </section>

          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-semibold text-white">Expiry Notifications</h2>
            </div>
            <p className="text-slate-300 mb-4">
              Never miss an expiring certification:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li><strong>90 days before:</strong> Early warning notification</li>
              <li><strong>30 days before:</strong> Reminder to schedule renewal</li>
              <li><strong>7 days before:</strong> Urgent renewal needed</li>
              <li><strong>Expired:</strong> Alert and compliance flag</li>
            </ul>
            <p className="text-slate-400 mt-4 text-sm">
              Email notifications are sent to both the employee and their supervisor.
            </p>
          </section>

          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 text-violet-400" />
              <h2 className="text-xl font-semibold text-white">Reports</h2>
            </div>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li><strong>Expiry Report:</strong> View all upcoming expirations</li>
              <li><strong>Compliance Report:</strong> See who's missing required certs</li>
              <li><strong>Department Report:</strong> Certification status by team</li>
              <li><strong>Training Matrix:</strong> Overview of all certifications</li>
            </ul>
          </section>

          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Upload className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white">Bulk Upload</h2>
            </div>
            <p className="text-slate-300 mb-4">
              Have many certifications to add? Use bulk upload:
            </p>
            <ol className="list-decimal list-inside text-slate-300 space-y-2 ml-4">
              <li>Go to <strong>Certifications → Bulk Upload</strong></li>
              <li>Download the CSV template</li>
              <li>Fill in your certification data</li>
              <li>Upload the completed CSV</li>
              <li>Review and confirm the import</li>
            </ol>
          </section>
        </div>

        <div className="mt-8 flex gap-4">
          <Link
            href="/admin/certifications"
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
          >
            Go to Certifications
          </Link>
          <Link
            href="/help/training"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Training Records Guide
          </Link>
        </div>
      </div>
    </main>
  );
}
