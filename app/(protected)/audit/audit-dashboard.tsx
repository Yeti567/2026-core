'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Shield, 
  Link2, 
  AlertTriangle, 
  Calendar, 
  MessageSquare, 
  Package,
  ChevronLeft,
  LayoutGrid,
  Layers
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  ComplianceScorecard, 
  EvidenceMapper, 
  GapDetector, 
  TimelineProjection,
  MockAuditSimulator,
  AuditPackageGenerator 
} from '@/components/audit';

interface AuditDashboardProps {
  userRole: string;
}

const dashboardTabs = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'scorecard', label: 'Scorecard', icon: Shield },
  { id: 'evidence', label: 'Evidence', icon: Link2 },
  { id: 'gaps', label: 'Gaps', icon: AlertTriangle },
  { id: 'timeline', label: 'Timeline', icon: Calendar },
  { id: 'simulator', label: 'Simulator', icon: MessageSquare },
  { id: 'package', label: 'Package', icon: Package },
];

export function AuditDashboard({ userRole }: AuditDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            href="/dashboard"
            className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              COR Audit Dashboard
            </h1>
            <p className="text-slate-400 mt-1">
              Certificate of Recognition compliance tracking and preparation
            </p>
          </div>
        </div>
        
        {/* Quick stats bar */}
        <div className="flex items-center gap-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Current Role</div>
              <div className="text-sm font-medium text-slate-200 capitalize">{userRole.replace('_', ' ')}</div>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Layers className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs text-slate-400">COR Elements</div>
              <div className="text-sm font-medium text-slate-200">14 Total</div>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Passing Score</div>
              <div className="text-sm font-medium text-slate-200">80%</div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="inline-flex h-auto p-1.5 bg-slate-800/50 rounded-xl border border-slate-700/50 backdrop-blur flex-wrap gap-1">
          {dashboardTabs.map((tab) => (
            <TabsTrigger 
              key={tab.id}
              value={tab.id}
              className="px-4 py-2.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all"
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab - All components in grid */}
        <TabsContent value="overview" className="space-y-6 animate-in fade-in duration-300">
          <div className="grid lg:grid-cols-2 gap-6">
            <ComplianceScorecard />
            <GapDetector />
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <TimelineProjection />
            <EvidenceMapper />
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <MockAuditSimulator />
            <AuditPackageGenerator />
          </div>
        </TabsContent>

        {/* Individual Tab Views */}
        <TabsContent value="scorecard" className="animate-in fade-in duration-300">
          <ComplianceScorecard />
        </TabsContent>

        <TabsContent value="evidence" className="animate-in fade-in duration-300">
          <EvidenceMapper />
        </TabsContent>

        <TabsContent value="gaps" className="animate-in fade-in duration-300">
          <GapDetector />
        </TabsContent>

        <TabsContent value="timeline" className="animate-in fade-in duration-300">
          <TimelineProjection />
        </TabsContent>

        <TabsContent value="simulator" className="animate-in fade-in duration-300">
          <MockAuditSimulator />
        </TabsContent>

        <TabsContent value="package" className="animate-in fade-in duration-300">
          <AuditPackageGenerator />
        </TabsContent>
      </Tabs>

      {/* Footer help text */}
      <footer className="mt-12 text-center">
        <p className="text-sm text-slate-500">
          COR (Certificate of Recognition) is an occupational health and safety accreditation program.
        </p>
        <p className="text-xs text-slate-600 mt-1">
          This dashboard helps track your compliance progress across all 14 COR elements.
        </p>
      </footer>
    </div>
  );
}
