import Link from 'next/link';
import { ChevronLeft, CheckCircle, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: 1,
    title: 'Explore Your Dashboard',
    description: 'Your dashboard is your home base. It shows your compliance status, upcoming tasks, and quick access to all features.',
    link: '/dashboard',
    linkText: 'Go to Dashboard'
  },
  {
    number: 2,
    title: 'Add Your Team',
    description: 'Invite employees to the system. They can fill out forms, upload certifications, and participate in safety activities.',
    link: '/admin/employees',
    linkText: 'Manage Employees'
  },
  {
    number: 3,
    title: 'Set Up Departments',
    description: 'Organize your workers into departments for better tracking and reporting.',
    link: '/admin/departments',
    linkText: 'Create Departments'
  },
  {
    number: 4,
    title: 'Track Certifications',
    description: 'Upload employee certifications and training records. The system will alert you before they expire.',
    link: '/admin/certifications',
    linkText: 'Add Certifications'
  },
  {
    number: 5,
    title: 'Upload Your Documents',
    description: 'Add your safety policies, procedures, and other compliance documents to the registry.',
    link: '/admin/document-registry',
    linkText: 'Document Registry'
  },
  {
    number: 6,
    title: 'Create or Import Forms',
    description: 'Build custom safety forms or import existing PDF forms. Workers can fill them out digitally.',
    link: '/admin/form-templates',
    linkText: 'Form Templates'
  },
  {
    number: 7,
    title: 'Check Your Audit Readiness',
    description: 'Use the Audit Dashboard to see your COR compliance score and identify gaps.',
    link: '/admin/audit-dashboard',
    linkText: 'Audit Dashboard'
  },
];

export default function GettingStartedPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link 
          href="/help"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Help Center
        </Link>

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Getting Started</h1>
          <p className="text-slate-400 text-lg">
            Follow these steps to set up your COR Pathways account and start managing safety compliance.
          </p>
        </header>

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div 
              key={step.number}
              className="relative p-6 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              {/* Step Number */}
              <div className="absolute -left-3 -top-3 w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                {step.number}
              </div>

              <div className="ml-4">
                <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-slate-300 mb-4">{step.description}</p>
                <Link
                  href={step.link}
                  className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  {step.linkText}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-1.5 top-full w-0.5 h-6 bg-slate-700" />
              )}
            </div>
          ))}
        </div>

        {/* Completion Message */}
        <div className="mt-10 p-6 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-8 h-8 text-emerald-400 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">You're Ready!</h3>
              <p className="text-slate-300">
                Once you've completed these steps, you'll have a solid foundation for managing your safety program. 
                Continue exploring the help center to learn about advanced features.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
