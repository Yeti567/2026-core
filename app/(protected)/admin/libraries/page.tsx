'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { HazardLibraryTab } from './components/hazard-library-tab';
import { EquipmentInventoryTab } from './components/equipment-inventory-tab';
import { TaskLibraryTab } from './components/task-library-tab';
import { JobsiteRegistryTab } from './components/jobsite-registry-tab';
import { SDSLibraryTab } from './components/sds-library-tab';
import { LegislationLibraryTab } from './components/legislation-library-tab';

const LIBRARY_TABS = [
  { id: 'hazards', label: 'Hazards', icon: '🚨', description: '120+ construction hazards' },
  { id: 'equipment', label: 'Equipment', icon: '🔧', description: 'Inventory & inspections' },
  { id: 'tasks', label: 'Tasks', icon: '📋', description: 'Job/task templates' },
  { id: 'jobsites', label: 'Jobsites', icon: '🏗️', description: 'Active projects' },
  { id: 'sds', label: 'SDS', icon: '🧪', description: 'Safety data sheets' },
  { id: 'legislation', label: 'Legislation', icon: '⚖️', description: 'OH&S regulations' },
];

export default function MasterLibrariesPage() {
  const [activeTab, setActiveTab] = useState('hazards');

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--card)]/95 backdrop-blur border-b border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/admin" 
                className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                ← Admin
              </Link>
              <div className="h-6 w-px bg-[var(--border)]" />
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  📚 Master Libraries
                </h1>
                <p className="text-sm text-[var(--muted)]">
                  Centralized safety data for your organization
                </p>
              </div>
            </div>
            <Link
              href="/admin/libraries/import"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import Data
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Tab Navigation */}
          <TabsList className="flex flex-wrap gap-2 p-2 bg-[var(--card)] border border-[var(--border)] rounded-xl mb-6 h-auto">
            {LIBRARY_TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-[var(--primary)] data-[state=active]:text-white transition-all"
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Contents */}
          <TabsContent value="hazards">
            <HazardLibraryTab />
          </TabsContent>

          <TabsContent value="equipment">
            <EquipmentInventoryTab />
          </TabsContent>

          <TabsContent value="tasks">
            <TaskLibraryTab />
          </TabsContent>

          <TabsContent value="jobsites">
            <JobsiteRegistryTab />
          </TabsContent>

          <TabsContent value="sds">
            <SDSLibraryTab />
          </TabsContent>

          <TabsContent value="legislation">
            <LegislationLibraryTab />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
