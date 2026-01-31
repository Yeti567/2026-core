'use client';

import Link from 'next/link';
import { 
  Shield, Users, CheckCircle2, ArrowLeft, CreditCard,
  FileText, GraduationCap, Wrench, BarChart3
} from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    description: 'Perfect for small crews',
    price: 149,
    workers: '1–5',
    featured: false,
  },
  {
    name: 'Professional',
    description: 'For growing companies',
    price: 349,
    workers: '6–15',
    featured: true,
  },
  {
    name: 'Enterprise',
    description: 'For larger operations',
    price: 599,
    workers: '16–40',
    featured: false,
  },
];

const allFeatures = [
  { icon: Shield, text: 'All 14 COR elements' },
  { icon: FileText, text: 'Unlimited forms & documents' },
  { icon: GraduationCap, text: 'Certification tracking' },
  { icon: Users, text: 'Employee management' },
  { icon: Wrench, text: 'Equipment maintenance' },
  { icon: BarChart3, text: 'Reports & analytics' },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-slate-400 hover:text-white text-sm flex items-center gap-1 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Pricing Plans</h1>
          </div>
          <p className="text-slate-400">
            Choose the plan that fits your team size. All plans include every feature.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-6 rounded-2xl border transition-all ${
                plan.featured
                  ? 'bg-gradient-to-b from-blue-500/10 to-indigo-500/10 border-2 border-blue-500/50 shadow-xl shadow-blue-500/10'
                  : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full text-xs font-semibold text-white">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                <p className="text-slate-400 text-sm">{plan.description}</p>
              </div>
              
              <div className="mb-4">
                <span className="text-3xl font-bold text-white">${plan.price}</span>
                <span className="text-slate-400">/month</span>
              </div>
              
              <div className="mb-6 pb-6 border-b border-slate-700">
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium">
                  <Users className="w-4 h-4" />
                  {plan.workers} Workers
                </span>
              </div>
              
              <ul className="space-y-2">
                {allFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {feature.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Upgrade/Downgrade Info */}
        <div className="text-center p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Easy Plan Changes</h3>
          <p className="text-slate-300 text-sm">
            Upgrade or downgrade your plan anytime—no long-term contracts. 
            Changes take effect on your next billing cycle.
          </p>
        </div>

        {/* Contact for larger teams */}
        <div className="text-center p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-2">Need more than 40 workers?</h3>
          <p className="text-slate-400 text-sm mb-4">
            Contact us for custom enterprise pricing tailored to your organization.
          </p>
          <a
            href="mailto:blake@calibrebusinesssolutions.ca"
            className="inline-flex items-center gap-2 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-white transition-colors"
          >
            Contact Sales
          </a>
          <p className="text-slate-500 text-xs mt-3">
            blake@calibrebusinesssolutions.ca
          </p>
        </div>
      </div>
    </main>
  );
}
