'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { 
  AuditSoftConnection, 
  AuditSoftStats, 
  AuditSoftSyncLog,
  AuditSoftItemMapping,
  ExportSummary 
} from '@/lib/integrations/auditsoft/types';
import { COR_ELEMENTS, INTERNAL_ITEM_TYPE_LABELS } from '@/lib/integrations/auditsoft/types';

// Local types for export functionality
interface ExportPreview {
  total_items: number;
  by_type: Record<string, number>;
  by_element?: Record<number, number>;
  date_range: { start: string; end: string };
  elements_selected?: number[];
  estimated_time_seconds: number;
}

interface ExportJob {
  id: string;
  status: 'pending' | 'validating' | 'exporting' | 'completed' | 'failed' | 'cancelled';
  total_items: number;
  processed_items: number;
  success_count: number;
  error_count: number;
  auditsoft_batch_id?: string;
}

// =============================================================================
// TYPES
// =============================================================================

type Tab = 'connection' | 'mappings' | 'export' | 'history';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AuditSoftPage() {
  const [activeTab, setActiveTab] = useState<Tab>('connection');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AuditSoftStats | null>(null);
  const [connection, setConnection] = useState<AuditSoftConnection | null>(null);

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/integrations/auditsoft/status');

        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setConnection(data.connection);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/auditsoft/status');

      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setConnection(data.connection);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  }, []);

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
      <div className="max-w-7xl mx-auto">
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                AuditSoft Integration
              </h1>
              <p className="text-[var(--muted)] mt-1">
                Connect your COR data to AuditSoft for streamlined audit evidence submission
              </p>
            </div>
            <div className="flex items-center gap-3">
              {stats?.is_connected ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-400 text-sm font-medium">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-500/10 border border-slate-500/30">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span className="text-slate-400 text-sm font-medium">Not Connected</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {!loading && stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="card">
              <p className="text-[var(--muted)] text-sm mb-1">Total Syncs</p>
              <p className="text-3xl font-bold">{stats.total_sync_operations}</p>
            </div>
            <div className="card">
              <p className="text-[var(--muted)] text-sm mb-1">Items Synced</p>
              <p className="text-3xl font-bold text-cyan-400">{stats.total_items_synced.toLocaleString()}</p>
            </div>
            <div className="card">
              <p className="text-[var(--muted)] text-sm mb-1">Success Rate</p>
              <p className="text-3xl font-bold text-emerald-400">
                {stats.total_sync_operations > 0
                  ? `${Math.round((stats.successful_syncs / stats.total_sync_operations) * 100)}%`
                  : '-'}
              </p>
            </div>
            <div className="card">
              <p className="text-[var(--muted)] text-sm mb-1">Last Sync</p>
              <p className="text-lg font-medium">
                {stats.last_sync_at
                  ? new Date(stats.last_sync_at).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-800/50 p-1 rounded-lg w-fit">
          {[
            { id: 'connection', label: '🔌 Connection', icon: null },
            { id: 'mappings', label: '🗺️ Evidence Mapping', icon: null },
            { id: 'export', label: '📤 Export', icon: null },
            { id: 'history', label: '📋 History', icon: null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="card text-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--muted)]">Loading...</p>
          </div>
        ) : (
          <>
            {activeTab === 'connection' && (
              <ConnectionTab
                connection={connection}
                onUpdate={refreshData}
              />
            )}
            {activeTab === 'mappings' && (
              <MappingsTab isConnected={connection?.connection_status === 'active'} />
            )}
            {activeTab === 'export' && (
              <ExportTab isConnected={connection?.connection_status === 'active'} onExportComplete={refreshData} />
            )}
            {activeTab === 'history' && <HistoryTab />}
          </>
        )}
      </div>
    </main>
  );
}

// =============================================================================
// CONNECTION TAB
// =============================================================================

function ConnectionTab({
  connection,
  onUpdate,
}: {
  connection: (AuditSoftConnection & { api_key_hint?: string }) | null;
  onUpdate: () => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('https://api.auditsoft.co');
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('production');
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!apiKey) {
      setError('Please enter an API key');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/integrations/auditsoft/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, api_endpoint: apiEndpoint }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to connect');
        return;
      }

      setSuccess(data.message);
      setApiKey('');
      onUpdate();
    } catch (err) {
      setError('Failed to connect to AuditSoft');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from AuditSoft?')) return;

    try {
      const res = await fetch('/api/integrations/auditsoft/disconnect', { method: 'DELETE' });

      if (res.ok) {
        setSuccess('Disconnected from AuditSoft');
        onUpdate();
      }
    } catch (err) {
      setError('Failed to disconnect');
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    setError(null);

    try {
      const res = await fetch('/api/integrations/auditsoft/validate', { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.valid) {
        setError(data.error || 'Validation failed');
      } else {
        setSuccess('Connection validated successfully');
        onUpdate();
      }
    } catch (err) {
      setError('Failed to validate connection');
    } finally {
      setValidating(false);
    }
  };

  const handleSyncSettingsChange = async (setting: string, value: boolean | string) => {
    try {
      const res = await fetch('/api/integrations/auditsoft/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [setting]: value }),
      });

      if (res.ok) {
        onUpdate();
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      {connection?.connection_status === 'active' ? (
        <div className="card border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-emerald-400">Connected to AuditSoft</h3>
                <p className="text-[var(--muted)]">
                  Organization: {connection.organization_id || 'Connected'}
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  API Key: {connection.api_key_hint || '****xxxx'} • {connection.api_endpoint}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleValidate}
                disabled={validating}
                className="btn text-sm"
                style={{ background: 'var(--border)' }}
              >
                {validating ? 'Validating...' : 'Re-validate'}
              </button>
              <button
                onClick={handleDisconnect}
                className="btn text-sm text-red-400 hover:bg-red-500/10"
                style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)' }}
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Audit Schedule Info */}
          {connection.audit_scheduled_date && (
            <div className="mt-4 pt-4 border-t border-emerald-500/20">
              <p className="text-sm text-[var(--muted)]">
                <span className="text-emerald-400">Next Audit:</span>{' '}
                {new Date(connection.audit_scheduled_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                {connection.auditor_name && (
                  <span className="ml-2">• Auditor: {connection.auditor_name}</span>
                )}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* API Key Input */
        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Connect to AuditSoft</h3>
          <p className="text-[var(--muted)] text-sm mb-6">
            Enter your AuditSoft API key to enable automatic evidence export. You can find your API key in your AuditSoft account settings.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="label">API Key</label>
              <input
                type="password"
                className="input font-mono"
                placeholder="ask_live_xxxxxxxxxxxxxxxxxxxx"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-[var(--muted)] mt-1">
                Your API key will be encrypted before storage
              </p>
            </div>

            <div>
              <label className="label">Environment</label>
              <select
                className="input"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as 'sandbox' | 'production')}
              >
                <option value="production">Production</option>
                <option value="sandbox">Sandbox (Testing)</option>
              </select>
            </div>

            <button
              onClick={handleConnect}
              disabled={saving || !apiKey}
              className="btn btn-primary w-full"
            >
              {saving ? 'Connecting...' : 'Connect to AuditSoft'}
            </button>
          </div>
        </div>
      )}

      {/* Sync Settings */}
      {connection?.connection_status === 'active' && (
        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Sync Settings</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-Sync</p>
                <p className="text-sm text-[var(--muted)]">
                  Automatically sync new evidence to AuditSoft
                </p>
              </div>
              <button
                onClick={() => handleSyncSettingsChange('sync_enabled', !connection.sync_enabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  connection.sync_enabled ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    connection.sync_enabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {connection.sync_enabled && (
              <div>
                <label className="label">Sync Frequency</label>
                <select
                  className="input"
                  value={connection.sync_frequency}
                  onChange={(e) => handleSyncSettingsChange('sync_frequency', e.target.value)}
                >
                  <option value="manual">Manual Only</option>
                  <option value="daily">Daily</option>
                  <option value="realtime">Real-time</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="card bg-slate-800/30">
        <h3 className="font-semibold text-lg mb-4">How it Works</h3>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { step: '1', title: 'Connect', desc: 'Enter your AuditSoft API key' },
            { step: '2', title: 'Map Evidence', desc: 'Link your data to audit requirements' },
            { step: '3', title: 'Export', desc: 'One-click export to AuditSoft' },
            { step: '4', title: 'Audit Ready', desc: 'All evidence pre-loaded for auditor' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center mx-auto mb-2 text-lg font-bold">
                {item.step}
              </div>
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-[var(--muted)]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAPPINGS TAB
// =============================================================================

function MappingsTab({ isConnected }: { isConnected: boolean }) {
  const [mappings, setMappings] = useState<AuditSoftItemMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedElement, setSelectedElement] = useState<number | null>(null);

  useEffect(() => {
    async function fetchMappings() {
      try {
        const res = await fetch('/api/auditsoft/mappings');
        if (res.ok) {
          const data = await res.json();
          setMappings(data.mappings || []);
        }
      } catch (err) {
        console.error('Failed to fetch mappings:', err);
      } finally {
        setLoading(false);
      }
    }

    if (isConnected) {
      fetchMappings();
    } else {
      setLoading(false);
    }
  }, [isConnected]);

  if (!isConnected) {
    return (
      <div className="card text-center py-12">
        <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">Connect First</h3>
        <p className="text-[var(--muted)]">
          Please connect to AuditSoft before configuring evidence mappings.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card text-center py-12">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[var(--muted)]">Loading mappings...</p>
      </div>
    );
  }

  // Group mappings by element
  const mappingsByElement = COR_ELEMENTS.map((el) => ({
    number: el.number,
    name: el.name,
    mappings: mappings.filter((m) => m.cor_element === el.number),
  }));

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">Evidence Mappings</h3>
            <p className="text-sm text-[var(--muted)]">
              Configure how your COR data maps to AuditSoft requirements
            </p>
          </div>
          <span className="badge badge-blue">{mappings.length} mappings</span>
        </div>

        {/* Element Grid */}
        <div className="grid gap-3">
          {mappingsByElement.map((element) => (
            <div
              key={element.number}
              className={`p-4 rounded-lg border transition-all cursor-pointer ${
                selectedElement === element.number
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
              onClick={() => setSelectedElement(selectedElement === element.number ? null : element.number)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
                    {element.number}
                  </div>
                  <div>
                    <p className="font-medium">{element.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {element.mappings.length} mapping{element.mappings.length !== 1 ? 's' : ''} configured
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {element.mappings.length > 0 ? (
                    <span className="badge badge-green">Mapped</span>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8' }}>
                      Not Mapped
                    </span>
                  )}
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      selectedElement === element.number ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded Mappings */}
              {selectedElement === element.number && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  {element.mappings.length > 0 ? (
                    <div className="space-y-2">
                      {element.mappings.map((mapping) => (
                        <div
                          key={mapping.id}
                          className="flex items-center justify-between p-2 rounded bg-slate-800/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="badge badge-blue text-xs">
                              {INTERNAL_ITEM_TYPE_LABELS[mapping.internal_item_type] || mapping.internal_item_type}
                            </span>
                            {mapping.audit_question_id && (
                              <span className="text-xs text-[var(--muted)]">
                                → {mapping.audit_question_id}
                              </span>
                            )}
                          </div>
                          <span className={`w-2 h-2 rounded-full ${mapping.sync_status === 'synced' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--muted)] text-center py-4">
                      No mappings configured for this element
                    </p>
                  )}
                  <button className="btn btn-primary w-full mt-3 text-sm">
                    Configure Mappings
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Auto-mapping Suggestions */}
      <div className="card bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent border-cyan-500/30">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-cyan-400">Smart Auto-Mapping</h3>
            <p className="text-sm text-[var(--muted)] mt-1">
              Let our AI analyze your forms and documents to suggest optimal mappings to AuditSoft requirements.
            </p>
            <button className="btn mt-3 text-sm" style={{ background: 'rgba(6, 182, 212, 0.2)' }}>
              Generate Suggestions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// EXPORT TAB
// =============================================================================

function ExportTab({
  isConnected,
  onExportComplete,
}: {
  isConnected: boolean;
  onExportComplete: () => void;
}) {
  const [dateStart, setDateStart] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().split('T')[0];
  });
  const [dateEnd, setDateEnd] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedElements, setSelectedElements] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportJob, setExportJob] = useState<ExportJob | null>(null);

  const fetchPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const res = await fetch('/api/auditsoft/export/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_range_start: dateStart,
          date_range_end: dateEnd,
          elements_selected: selectedElements,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPreview(data.preview);
      }
    } catch (err) {
      console.error('Failed to fetch preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  }, [dateStart, dateEnd, selectedElements]);

  useEffect(() => {
    if (isConnected) {
      fetchPreview();
    }
  }, [dateStart, dateEnd, selectedElements, isConnected, fetchPreview]);

  const handleExport = async () => {
    if (!preview || preview.total_items === 0) return;

    setExporting(true);
    try {
      const res = await fetch('/api/auditsoft/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          export_type: 'full',
          date_range_start: dateStart,
          date_range_end: dateEnd,
          elements_selected: selectedElements,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setExportJob(data.job);
        pollJobStatus(data.job.id);
      }
    } catch (err) {
      console.error('Failed to start export:', err);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/auditsoft/export/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          setExportJob(data.job);

          if (data.job.status === 'completed' || data.job.status === 'failed') {
            setExporting(false);
            onExportComplete();
          } else {
            setTimeout(poll, 1000);
          }
        }
      } catch (err) {
        console.error('Failed to poll job status:', err);
        setExporting(false);
      }
    };

    poll();
  };

  const toggleElement = (element: number) => {
    if (selectedElements.includes(element)) {
      setSelectedElements(selectedElements.filter((e) => e !== element));
    } else {
      setSelectedElements([...selectedElements, element].sort((a, b) => a - b));
    }
  };

  const selectAllElements = () => {
    setSelectedElements([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  };

  const clearElements = () => {
    setSelectedElements([]);
  };

  if (!isConnected) {
    return (
      <div className="card text-center py-12">
        <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">Connect First</h3>
        <p className="text-[var(--muted)]">
          Please connect to AuditSoft before exporting evidence.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* New Export Wizard Banner */}
      <Link
        href="/admin/auditsoft/export"
        className="block card bg-gradient-to-r from-indigo-600/20 via-purple-600/10 to-transparent border-indigo-500/40 hover:border-indigo-500/60 transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-indigo-300">Export Wizard</h3>
              <p className="text-sm text-[var(--muted)]">
                Step-by-step export with real-time progress tracking
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-indigo-400">
            <span className="badge badge-blue">Recommended</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Export Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Date Range */}
          <div className="card">
            <h3 className="font-semibold text-lg mb-4">Quick Export</h3>
            <p className="text-sm text-[var(--muted)] mb-4">Configure and export directly, or use the Export Wizard above for a guided experience.</p>
            <h4 className="font-medium mb-3">Date Range</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className="input"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {[
              { label: 'Last 3 months', months: 3 },
              { label: 'Last 6 months', months: 6 },
              { label: 'Last 12 months', months: 12 },
            ].map((preset) => (
              <button
                key={preset.months}
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setMonth(start.getMonth() - preset.months);
                  setDateStart(start.toISOString().split('T')[0]);
                  setDateEnd(end.toISOString().split('T')[0]);
                }}
                className="btn text-xs"
                style={{ background: 'var(--border)' }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Element Selection */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">COR Elements</h3>
            <div className="flex gap-2">
              <button onClick={selectAllElements} className="text-xs text-indigo-400 hover:underline">
                Select All
              </button>
              <span className="text-slate-500">|</span>
              <button onClick={clearElements} className="text-xs text-slate-400 hover:underline">
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {COR_ELEMENTS.map((el) => (
              <button
                key={el.number}
                onClick={() => toggleElement(el.number)}
                className={`p-2 rounded-lg border text-left transition-all ${
                  selectedElements.includes(el.number)
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                      selectedElements.includes(el.number)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {el.number}
                  </span>
                  <span className="text-xs truncate">{el.name.split(' ')[0]}</span>
                </div>
              </button>
            ))}
          </div>

          <p className="text-xs text-[var(--muted)] mt-3">
            {selectedElements.length} of 14 elements selected
          </p>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="space-y-6">
        <div className="card sticky top-8">
          <h3 className="font-semibold text-lg mb-4">Export Preview</h3>

          {loadingPreview ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-[var(--muted)]">Calculating...</p>
            </div>
          ) : preview ? (
            <div className="space-y-4">
              <div className="text-center p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                <p className="text-3xl font-bold text-indigo-400">{preview.total_items.toLocaleString()}</p>
                <p className="text-sm text-[var(--muted)]">Total Items</p>
              </div>

              <div className="space-y-2">
                {Object.entries(preview.by_type).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted)] capitalize">{type.replace(/_/g, ' ')}</span>
                    <span className="font-medium">{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-700">
                <p className="text-xs text-[var(--muted)]">
                  Estimated time: ~{Math.ceil(preview.estimated_time_seconds / 60)} minute{preview.estimated_time_seconds > 60 ? 's' : ''}
                </p>
              </div>

              {/* Export Progress */}
              {exportJob && (
                <div className="pt-4 border-t border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {exportJob.status === 'completed' ? 'Export Complete!' : 'Exporting...'}
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      {exportJob.processed_items} / {exportJob.total_items}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        exportJob.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`}
                      style={{
                        width: `${exportJob.total_items > 0 ? (exportJob.processed_items / exportJob.total_items) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  {exportJob.status === 'completed' && (
                    <p className="text-xs text-emerald-400 mt-2">
                      ✓ {exportJob.success_count.toLocaleString()} items exported successfully
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={handleExport}
                disabled={exporting || preview.total_items === 0 || selectedElements.length === 0}
                className="btn btn-primary w-full"
              >
                {exporting ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Export to AuditSoft
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="text-center text-[var(--muted)] py-8">
              Select a date range to see export preview
            </p>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

// =============================================================================
// HISTORY TAB
// =============================================================================

interface SyncLogEntry {
  id: string;
  sync_type: string;
  sync_trigger: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  items_attempted: number | null;
  items_succeeded: number | null;
  items_failed: number | null;
  sync_details: any;
  error_details: any[] | null;
  user_profiles?: { first_name: string; last_name: string } | null;
}

function HistoryTab() {
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<SyncLogEntry | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/integrations/auditsoft/export?limit=20');
        if (res.ok) {
          const data = await res.json();
          setLogs(data.history || []);
        }
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: string }> = {
      completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: '✅' },
      failed: { bg: 'bg-red-500/20', text: 'text-red-400', icon: '❌' },
      partial: { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: '⚠️' },
      in_progress: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '⏳' },
    };
    // Safe: status comes from database enum values with fallback, not arbitrary user input
    // eslint-disable-next-line security/detect-object-injection
    const style = styles[status] || styles.in_progress;
    return (
      <span className={`badge ${style.bg} ${style.text} flex items-center gap-1`}>
        <span>{style.icon}</span>
        {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getSyncTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      full_export: '📤 Full Export',
      incremental: '🔄 Incremental',
      single_item: '📎 Single Item',
      manual: '👆 Manual',
    };
    // Safe: type comes from database enum values with fallback, not arbitrary user input
    // eslint-disable-next-line security/detect-object-injection
    return labels[type] || type;
  };

  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      user_initiated: 'Manual',
      auto_sync: 'Auto',
      scheduled: 'Scheduled',
      api_webhook: 'Webhook',
    };
    // Safe: trigger comes from database enum values with fallback, not arbitrary user input
    // eslint-disable-next-line security/detect-object-injection
    return labels[trigger] || trigger;
  };

  const formatDuration = (startedAt: string, completedAt: string | null) => {
    if (!completedAt) return 'In progress...';
    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt).getTime();
    const seconds = Math.round((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (loading) {
    return (
      <div className="card text-center py-12">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[var(--muted)]">Loading sync history...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="card text-center py-12">
        <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No Sync History</h3>
        <p className="text-[var(--muted)]">
          Your export and sync operations will appear here.
        </p>
        <Link
          href="/admin/auditsoft/export"
          className="btn btn-primary mt-4"
        >
          Start Your First Export
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* History List */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/50">
                <th className="py-3 px-4 text-left text-[var(--muted)] font-medium">Date & Time</th>
                <th className="py-3 px-4 text-left text-[var(--muted)] font-medium">Type</th>
                <th className="py-3 px-4 text-left text-[var(--muted)] font-medium">Trigger</th>
                <th className="py-3 px-4 text-left text-[var(--muted)] font-medium">Items</th>
                <th className="py-3 px-4 text-left text-[var(--muted)] font-medium">Duration</th>
                <th className="py-3 px-4 text-left text-[var(--muted)] font-medium">Status</th>
                <th className="py-3 px-4 text-left text-[var(--muted)] font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr 
                  key={log.id} 
                  className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                >
                  <td className="py-3 px-4">
                    <div className="font-medium">
                      {new Date(log.started_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      {new Date(log.started_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="py-3 px-4">{getSyncTypeLabel(log.sync_type)}</td>
                  <td className="py-3 px-4">
                    <span className="badge bg-slate-700 text-slate-300">
                      {getTriggerLabel(log.sync_trigger)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-emerald-400">
                      {log.items_succeeded?.toLocaleString() || 0}
                    </span>
                    {log.items_failed && log.items_failed > 0 && (
                      <span className="text-red-400 text-xs ml-1">
                        / {log.items_failed} failed
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[var(--muted)]">
                    {formatDuration(log.started_at, log.completed_at)}
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(log.status)}</td>
                  <td className="py-3 px-4">
                    <svg 
                      className={`w-4 h-4 text-slate-500 transition-transform ${selectedLog?.id === log.id ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Log Details */}
      {selectedLog && (
        <div className="card bg-slate-800/50 border-indigo-500/30">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Sync Details</h4>
            <button 
              onClick={() => setSelectedLog(null)}
              className="text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-[var(--muted)] mb-1">Sync ID</p>
              <p className="font-mono text-sm">{selectedLog.id}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted)] mb-1">Initiated By</p>
              <p className="text-sm">
                {selectedLog.user_profiles 
                  ? `${selectedLog.user_profiles.first_name} ${selectedLog.user_profiles.last_name}`
                  : 'System'}
              </p>
            </div>
          </div>

          {/* Items by Type */}
          {selectedLog.sync_details?.by_type && (
            <div className="mb-4">
              <p className="text-xs text-[var(--muted)] mb-2">Items by Type</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(selectedLog.sync_details.by_type).map(([type, count]) => (
                  <div key={type} className="p-2 rounded bg-slate-700/50 text-sm">
                    <span className="text-[var(--muted)] capitalize">{type.replace('_', ' ')}</span>
                    <span className="float-right font-medium">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {selectedLog.error_details && selectedLog.error_details.length > 0 && (
            <div>
              <p className="text-xs text-[var(--muted)] mb-2">Errors ({selectedLog.error_details.length})</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedLog.error_details.slice(0, 5).map((err, i) => (
                  <div key={i} className="p-2 rounded bg-red-500/10 border border-red-500/20 text-sm">
                    <span className="text-red-300">{err.item_type}: </span>
                    <span className="text-red-400">{err.error}</span>
                  </div>
                ))}
                {selectedLog.error_details.length > 5 && (
                  <p className="text-xs text-[var(--muted)]">
                    +{selectedLog.error_details.length - 5} more errors
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700">
            <button className="btn text-sm" style={{ background: 'var(--border)' }}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Report
            </button>
            {selectedLog.items_failed && selectedLog.items_failed > 0 && (
              <button className="btn btn-primary text-sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry Failed Items
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
