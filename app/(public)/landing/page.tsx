'use client';

import Link from 'next/link';
import { 
  Shield, ClipboardCheck, Users, FileText, Wrench, 
  GraduationCap, BarChart3, Bell, CheckCircle2, ArrowRight,
  Building2, Award, Clock, TrendingUp
} from 'lucide-react';

const features = [
  {
    icon: ClipboardCheck,
    title: 'COR Audit Dashboard',
    description: 'Track your Certificate of Recognition readiness with real-time progress across all 14 COR elements.',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    icon: FileText,
    title: 'Smart Form Builder',
    description: 'Create digital safety forms, inspections, and checklists. Import existing PDFs or build from scratch.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Users,
    title: 'Employee Management',
    description: 'Manage your workforce, track training, and ensure everyone has the certifications they need.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: GraduationCap,
    title: 'Certification Tracker',
    description: 'Never miss an expiring certification. Automated alerts keep your team compliant.',
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: Wrench,
    title: 'Equipment Maintenance',
    description: 'Schedule inspections, track work orders, and maintain complete maintenance records.',
    color: 'from-rose-500 to-pink-600',
  },
  {
    icon: BarChart3,
    title: 'Evidence Collection',
    description: 'Automatically map your safety activities to COR elements. Be audit-ready every day.',
    color: 'from-cyan-500 to-blue-600',
  },
];

const benefits = [
  { icon: Clock, text: 'Save 20+ hours per month on paperwork' },
  { icon: Shield, text: 'Stay compliant with Alberta OHS regulations' },
  { icon: TrendingUp, text: 'Track progress toward COR certification' },
  { icon: Award, text: 'Reduce WCB premiums up to 20%' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-6">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
                COR Pathway
              </h1>
              <p className="text-xs text-slate-400">Certificate of Recognition</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg font-semibold shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-16 pb-24">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm font-medium mb-8">
            <CheckCircle2 className="w-4 h-4" />
            Trusted by Alberta Construction Companies
          </div>
          
          <h2 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
              Your Path to
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              COR Certification
            </span>
          </h2>
          
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            The complete safety management platform that helps construction companies 
            achieve and maintain their <strong className="text-white">Certificate of Recognition</strong>. 
            Track compliance, manage your team, and be audit-ready every day.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link 
              href="/register" 
              className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl font-semibold text-lg shadow-xl shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:scale-105"
            >
              Start Your Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/login" 
              className="flex items-center gap-2 px-8 py-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl font-semibold text-lg transition-all"
            >
              <Building2 className="w-5 h-5" />
              I Already Have an Account
            </Link>
          </div>

          {/* Benefits Bar */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-12">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-2 text-slate-400">
                <benefit.icon className="w-5 h-5 text-emerald-400" />
                <span className="text-sm">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-6 py-24 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need for{' '}
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                COR Success
              </span>
            </h3>
            <p className="text-slate-400 max-w-2xl mx-auto">
              From daily inspections to audit preparation, COR Pathway covers all 14 elements 
              of the Certificate of Recognition program.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div 
                key={idx}
                className="group relative p-6 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h4 className="text-xl font-semibold mb-2">{feature.title}</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-600 p-12 text-center shadow-2xl">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/90 text-sm font-medium mb-6">
                <Award className="w-4 h-4" />
                Join 100+ Alberta Companies
              </div>
              
              <h3 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Achieve Your COR?
              </h3>
              <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
                Start your journey to the Certificate of Recognition today. 
                Our platform guides you through every step of the process.
              </p>
              
              <Link 
                href="/register" 
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 hover:bg-slate-100 rounded-xl font-bold text-lg shadow-xl transition-all hover:scale-105"
              >
                Create Your Free Account
                <ArrowRight className="w-5 h-5" />
              </Link>
              
              <p className="text-white/60 text-sm mt-6">
                No credit card required • 14-day free trial • Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold">COR Pathway</p>
              <p className="text-xs text-slate-500">Certificate of Recognition Made Simple</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8 text-sm text-slate-400">
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
          
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} COR Pathway. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
