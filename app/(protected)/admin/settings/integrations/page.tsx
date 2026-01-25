'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuditSoftSettings } from '@/components/integrations/auditsoft-settings';

// =============================================================================
// TYPES
// =============================================================================

type SettingsTab = 'general' | 'team' | 'billing' | 'integrations' | 'security';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function IntegrationsSettingsPage() {
  const [activeTab] = useState<SettingsTab>('integrations');

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm flex items-center gap-1 mb-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Admin
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-[var(--muted)]">Manage your organization settings and integrations</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-slate-800/50 p-1 rounded-lg overflow-x-auto">
          {[
            { id: 'general', label: 'General', href: '/admin/settings' },
            { id: 'team', label: 'Team', href: '/admin/settings/team' },
            { id: 'billing', label: 'Billing', href: '/admin/settings/billing' },
            { id: 'integrations', label: 'Integrations', href: '/admin/settings/integrations' },
            { id: 'security', label: 'Security', href: '/admin/settings/security' },
          ].map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Integrations</h2>
          <p className="text-sm text-[var(--muted)]">
            Connect external services to enhance your COR management workflow
          </p>
        </div>

        {/* AuditSoft Integration */}
        <div className="mb-8">
          <AuditSoftSettings />
        </div>

        {/* Other Integrations (Coming Soon) */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wider">
            More Integrations
          </h3>

          {/* WSIB Integration */}
          <div className="card opacity-60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <span className="text-lg">🏛️</span>
                </div>
                <div>
                  <h4 className="font-medium">WSIB Reporting</h4>
                  <p className="text-sm text-[var(--muted)]">
                    Automatic WSIB Form 7 submission
                  </p>
                </div>
              </div>
              <span className="badge" style={{ background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8' }}>
                Coming Soon
              </span>
            </div>
          </div>

          {/* LMS Integration */}
          <div className="card opacity-60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <span className="text-lg">🎓</span>
                </div>
                <div>
                  <h4 className="font-medium">LMS Integration</h4>
                  <p className="text-sm text-[var(--muted)]">
                    Sync training records from your LMS
                  </p>
                </div>
              </div>
              <span className="badge" style={{ background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8' }}>
                Coming Soon
              </span>
            </div>
          </div>

          {/* HR System Integration */}
          <div className="card opacity-60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <span className="text-lg">👥</span>
                </div>
                <div>
                  <h4 className="font-medium">HR System</h4>
                  <p className="text-sm text-[var(--muted)]">
                    Sync employees from BambooHR, ADP, etc.
                  </p>
                </div>
              </div>
              <span className="badge" style={{ background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8' }}>
                Coming Soon
              </span>
            </div>
          </div>

          {/* Fleet Management Integration */}
          <div className="card opacity-60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-lg">🚛</span>
                </div>
                <div>
                  <h4 className="font-medium">Fleet Management</h4>
                  <p className="text-sm text-[var(--muted)]">
                    Import equipment and maintenance from fleet systems
                  </p>
                </div>
              </div>
              <span className="badge" style={{ background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8' }}>
                Coming Soon
              </span>
            </div>
          </div>
        </div>

        {/* Request Integration */}
        <div className="mt-8 p-4 rounded-lg border border-dashed border-slate-700 text-center">
          <p className="text-sm text-[var(--muted)] mb-2">
            Need an integration we don't have?
          </p>
          <button className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline">
            Request an Integration →
          </button>
        </div>
      </div>
    </main>
  );
}
