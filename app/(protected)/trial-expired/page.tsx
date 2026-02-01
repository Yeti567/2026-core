'use client';

import Link from 'next/link';
import { 
  AlertTriangle, CreditCard, Users, CheckCircle2, 
  Shield, FileText, GraduationCap, Wrench, BarChart3, Mail
} from 'lucide-react';

const plans = [
  { name: 'Starter', price: 149, workers: '1–5', featured: false },
  { name: 'Professional', price: 349, workers: '6–15', featured: true },
  { name: 'Enterprise', price: 599, workers: '16–40', featured: false },
];

const features = [
  'All 14 COR elements',
  'Unlimited forms & documents',
  'Certification tracking',
  'Employee management',
  'Equipment maintenance',
  'Reports & analytics',
];

export default function TrialExpiredPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Your Free Trial Has Ended</h1>
          <p className="text-slate-400 max-w-lg mx-auto">
            We hope you enjoyed exploring COR Pathway! To continue managing your safety compliance, 
            please choose a plan below.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-6 rounded-2xl border transition-all ${
                plan.featured
                  ? 'bg-gradient-to-b from-blue-500/10 to-indigo-500/10 border-2 border-blue-500/50 shadow-xl shadow-blue-500/10'
                  : 'bg-slate-800/30 border-slate-700/50'
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
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-slate-400">{plan.workers} Workers</span>
                </div>
              </div>
              
              <div className="mb-6">
                <span className="text-3xl font-bold text-white">${plan.price}</span>
                <span className="text-slate-400">/month</span>
              </div>
              
              <a
                href="mailto:blake@calibrebusinesssolutions.ca?subject=COR%20Pathway%20Subscription%20-%20${plan.name}%20Plan"
                className={`block w-full py-3 text-center rounded-lg font-semibold transition-colors ${
                  plan.featured
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                Subscribe
              </a>
            </div>
          ))}
        </div>

        {/* Features List */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 text-center">All Plans Include:</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="text-center">
          <p className="text-slate-400 text-sm mb-3">
            Questions? Need a custom plan for more than 40 workers?
          </p>
          <a
            href="mailto:blake@calibrebusinesssolutions.ca"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Mail className="w-4 h-4" />
            blake@calibrebusinesssolutions.ca
          </a>
        </div>
      </div>
    </main>
  );
}
