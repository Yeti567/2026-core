'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { COR_ELEMENTS } from '@/lib/audit/types';

interface Company {
  id: string;
  name: string;
  industry?: string;
  employee_count?: number;
  years_in_business?: number;
}

interface WelcomeOnboardingProps {
  company: Company | null;
  isFirstAdmin: boolean;
}

export function WelcomeOnboarding({ company, isFirstAdmin }: WelcomeOnboardingProps) {
  const router = useRouter();
  const [step, setStep] = useState<'welcome' | 'elements' | 'complete'>('welcome');
  const [showAllElements, setShowAllElements] = useState(false);

  if (!company) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-[var(--muted)]">Loading company information...</p>
        </div>
      </main>
    );
  }

  const visibleElements = showAllElements ? COR_ELEMENTS : COR_ELEMENTS.slice(0, 7);
  const needsIndustryInfo = !company.industry || !company.employee_count;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-5xl mx-auto">
        {step === 'welcome' && (
          <div className="space-y-8">
            {/* Welcome Header */}
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center ring-4 ring-emerald-500/10">
                <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-white">
                Welcome to COR Pathways, {company.name}!
              </h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Your journey to COR 2020 certification starts here. Let's get you set up.
              </p>
            </div>

            {/* Complete Profile Alert */}
            {needsIndustryInfo && isFirstAdmin && (
              <div className="card bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-2">Complete Your Company Profile</h3>
                    <p className="text-sm text-slate-300 mb-4">
                      Add your industry information to help us customize your COR certification requirements. This will help us provide better guidance for your specific trade.
                    </p>
                    <Link
                      href="/admin/profile"
                      className="btn btn-primary inline-flex items-center gap-2"
                    >
                      Complete Profile
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Company Info Card */}
            <div className="card bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/30">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Company Registration Complete
              </h2>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Company Name:</span>
                  <p className="text-white font-medium">{company.name}</p>
                </div>
                {company.industry && (
                  <div>
                    <span className="text-slate-400">Industry:</span>
                    <p className="text-white font-medium">{company.industry}</p>
                  </div>
                )}
                {company.employee_count && (
                  <div>
                    <span className="text-slate-400">Employees:</span>
                    <p className="text-white font-medium">{company.employee_count}</p>
                  </div>
                )}
                {company.years_in_business && (
                  <div>
                    <span className="text-slate-400">Years in Business:</span>
                    <p className="text-white font-medium">{company.years_in_business}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Next Steps */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-6">What's Next?</h2>
              <div className="mb-4">
                <Link
                  href="/cor-roadmap"
                  className="btn btn-secondary w-full mb-3"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  View COR 2020 Certification Roadmap
                </Link>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-400 font-bold">1</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">Understand the 14 COR Elements</h3>
                    <p className="text-sm text-slate-400">
                      Learn about the 14 elements you'll need to complete for COR 2020 certification. Each element has specific requirements and evidence you'll need to provide.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 font-bold">2</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">Set Up Your Team</h3>
                    <p className="text-sm text-slate-400">
                      Add your team members and assign roles. You'll need administrators, supervisors, and workers to complete the certification process.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-400 font-bold">3</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">Start Your 12-Phase Journey</h3>
                    <p className="text-sm text-slate-400">
                      Work through our structured 12-phase process, from company onboarding to final certification. Track your progress every step of the way.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-400 font-bold">4</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">Build Your Evidence</h3>
                    <p className="text-sm text-slate-400">
                      Upload documents, complete forms, and gather evidence for each COR element. Our system will help you track what's needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setStep('elements')}
                className="btn btn-primary px-8 py-3 text-lg"
              >
                View COR Elements →
              </button>
              <Link
                href="/dashboard"
                className="btn border border-slate-700 px-8 py-3 text-lg"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}

        {step === 'elements' && (
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <button
                onClick={() => setStep('welcome')}
                className="text-slate-400 hover:text-white flex items-center gap-2 mb-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h1 className="text-4xl font-bold text-white">The 14 COR Elements</h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                These are the core elements you'll need to complete for COR 2020 certification. Each element is weighted and requires specific evidence.
              </p>
            </div>

            {/* Elements Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {visibleElements.map((element) => (
                <div
                  key={element.number}
                  className="card bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700 hover:border-indigo-500/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                        <span className="text-indigo-400 font-bold text-lg">{element.number}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{element.name}</h3>
                        <p className="text-xs text-slate-400">Weight: {element.weight}%</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">{element.description}</p>
                  <div className="pt-4 border-t border-slate-700">
                    <p className="text-xs text-slate-500 mb-2">Required Forms:</p>
                    <div className="flex flex-wrap gap-2">
                      {element.requiredForms.slice(0, 3).map((form, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded bg-slate-700/50 text-xs text-slate-300"
                        >
                          {form.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {element.requiredForms.length > 3 && (
                        <span className="px-2 py-1 rounded bg-slate-700/50 text-xs text-slate-400">
                          +{element.requiredForms.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Show More/Less */}
            {COR_ELEMENTS.length > 7 && (
              <div className="text-center">
                <button
                  onClick={() => setShowAllElements(!showAllElements)}
                  className="btn border border-slate-700"
                >
                  {showAllElements ? 'Show Less' : `Show All ${COR_ELEMENTS.length} Elements`}
                </button>
              </div>
            )}

            {/* Key Information */}
            <div className="card bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Important Information
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">•</span>
                  <span><strong>Passing Score:</strong> You need at least 80% overall compliance to pass the COR audit.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">•</span>
                  <span><strong>Element Weights:</strong> Some elements are weighted more heavily (10%) than others (5%). Focus on high-weight elements first.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">•</span>
                  <span><strong>Evidence Required:</strong> Each element requires specific documentation, forms, training records, and other evidence.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">•</span>
                  <span><strong>Timeline:</strong> The certification process typically takes 6-12 months, depending on your current safety program maturity.</span>
                </li>
              </ul>
            </div>

            {/* Continue Button */}
            <div className="flex gap-4 justify-center">
              <Link
                href="/phases"
                className="btn btn-primary px-8 py-3 text-lg"
              >
                Start Your 12-Phase Journey →
              </Link>
              <Link
                href="/dashboard"
                className="btn border border-slate-700 px-8 py-3 text-lg"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
