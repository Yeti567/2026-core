'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { AuditSoftConnection, AuditSoftStats } from '@/lib/integrations/auditsoft';

// =============================================================================
// TYPES
// =============================================================================

interface ConnectionData extends Omit<AuditSoftConnection, 'api_key'> {
  api_key_hint?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AuditSoftSettings() {
  const [connection, setConnection] = useState<ConnectionData | null>(null);
  const [stats, setStats] = useState<AuditSoftStats | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [syncFrequency, setSyncFrequency] = useState<'manual' | 'daily' | 'realtime'>('manual');
  const [savingSettings, setSavingSettings] = useState(false);

  // Load connection data
  const loadConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations/auditsoft/status');
      const result = await response.json();

      if (result.connection) {
        setConnection(result.connection);
        setSyncFrequency(result.connection.sync_frequency || 'manual');
      } else {
        setConnection(null);
      }

      if (result.stats) {
        setStats(result.stats);
      }
    } catch (err) {
      console.error('Failed to load connection:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  // Handle connect
  async function handleConnect() {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    setIsConnecting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/integrations/auditsoft/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to connect');
      }

      setSuccess('Successfully connected to AuditSoft!');
      setApiKey('');
      await loadConnection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to AuditSoft');
    } finally {
      setIsConnecting(false);
    }
  }

  // Handle disconnect
  async function handleDisconnect() {
    if (!confirm('Are you sure you want to disconnect from AuditSoft? You can reconnect at any time.')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/integrations/auditsoft/disconnect', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      setConnection(null);
      setStats(null);
      setSuccess('Disconnected from AuditSoft');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  }

  // Handle test connection
  async function handleTestConnection() {
    setIsValidating(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/integrations/auditsoft/validate', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.valid) {
        setSuccess('Connection is working! ✓');
        await loadConnection();
      } else {
        setError(result.error || 'Connection test failed');
      }
    } catch (err) {
      setError('Failed to test connection');
    } finally {
      setIsValidating(false);
    }
  }

  // Handle save settings
  async function handleSaveSettings() {
    setSavingSettings(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/integrations/auditsoft/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sync_enabled: syncFrequency !== 'manual',
          sync_frequency: syncFrequency,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSuccess('Settings saved successfully');
      await loadConnection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Not connected state
  if (!connection || connection.connection_status !== 'active') {
    return (
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold">AuditSoft Integration</h3>
            <p className="text-sm text-[var(--muted)]">
              Connect your AuditSoft account to automatically export all evidence to your official COR audit.
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <span className="text-sm font-medium text-red-400">Not Connected</span>
        </div>

        {/* Messages */}
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

        {/* Instructions */}
        <div className="mb-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-sm mb-2">How to get your API key:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-[var(--muted)]">
                <li>
                  Log in to{' '}
                  <a
                    href="https://auditsoft.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline"
                  >
                    auditsoft.co
                  </a>
                </li>
                <li>Go to Settings → API Access</li>
                <li>Click "Generate API Key"</li>
                <li>Copy and paste below</li>
              </ol>
            </div>
          </div>
        </div>

        {/* API Key input */}
        <div className="space-y-4">
          <div>
            <label className="label">AuditSoft API Key</label>
            <input
              type="password"
              className="input font-mono"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="ask_live_xxxxxxxxxxxxxxxxxxxxx"
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            />
            <p className="text-xs text-[var(--muted)] mt-1">
              Your API key will be securely encrypted before storage
            </p>
          </div>

          <button
            onClick={handleConnect}
            disabled={!apiKey.trim() || isConnecting}
            className="btn btn-primary w-full"
          >
            {isConnecting ? (
              <>
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Connect AuditSoft
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Connected state
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold">AuditSoft Integration</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-sm text-emerald-400 font-medium">Connected</span>
              </div>
            </div>
          </div>
          <span className="badge badge-green">Active</span>
        </div>

        {/* Messages */}
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
      </div>

      {/* Audit Information Card */}
      <div className="card">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Audit Information
        </h4>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-700/50">
            <dt className="text-[var(--muted)]">Organization</dt>
            <dd className="font-medium">{connection.organization_id || 'N/A'}</dd>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-700/50">
            <dt className="text-[var(--muted)]">Audit ID</dt>
            <dd className="font-medium font-mono text-indigo-400">{connection.audit_id || 'N/A'}</dd>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-700/50">
            <dt className="text-[var(--muted)]">Scheduled Date</dt>
            <dd className="font-medium">
              {connection.audit_scheduled_date
                ? new Date(connection.audit_scheduled_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Not scheduled'}
            </dd>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-700/50">
            <dt className="text-[var(--muted)]">Auditor</dt>
            <dd className="font-medium">
              {connection.auditor_name ? (
                <>
                  {connection.auditor_name}
                  {connection.auditor_email && (
                    <span className="text-[var(--muted)] ml-1">({connection.auditor_email})</span>
                  )}
                </>
              ) : (
                'Not assigned'
              )}
            </dd>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-700/50">
            <dt className="text-[var(--muted)]">Audit Status</dt>
            <dd>
              <span
                className={`badge ${
                  connection.audit_status === 'completed'
                    ? 'badge-green'
                    : connection.audit_status === 'in_progress'
                    ? 'badge-blue'
                    : 'badge-amber'
                }`}
              >
                {connection.audit_status === 'in_progress'
                  ? 'In Progress'
                  : connection.audit_status?.charAt(0).toUpperCase() + connection.audit_status?.slice(1) || 'Pending'}
              </span>
            </dd>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-700/50">
            <dt className="text-[var(--muted)]">Last Sync</dt>
            <dd className="font-medium">
              {connection.last_sync_at
                ? new Date(connection.last_sync_at).toLocaleString()
                : 'Never'}
            </dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-[var(--muted)]">Items Synced</dt>
            <dd className="font-medium text-lg text-indigo-400">
              {connection.total_items_synced?.toLocaleString() || 0}
            </dd>
          </div>
        </dl>
      </div>

      {/* Sync Settings Card */}
      <div className="card">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Sync Settings
        </h4>

        <div className="space-y-3">
          {[
            { value: 'manual', label: 'Manual export only', desc: 'Export evidence when you choose' },
            { value: 'daily', label: 'Daily sync', desc: 'Automatically sync at 2:00 AM' },
            { value: 'realtime', label: 'Real-time sync', desc: 'Sync immediately when items are created' },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                syncFrequency === option.value
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <input
                type="radio"
                name="syncFrequency"
                value={option.value}
                checked={syncFrequency === option.value}
                onChange={(e) => setSyncFrequency(e.target.value as typeof syncFrequency)}
                className="mt-1"
              />
              <div>
                <p className="font-medium">{option.label}</p>
                <p className="text-xs text-[var(--muted)]">{option.desc}</p>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={savingSettings}
          className="btn btn-primary w-full mt-4"
        >
          {savingSettings ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Actions Card */}
      <div className="card">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Actions
        </h4>

        <div className="space-y-3">
          <Link
            href="/admin/auditsoft"
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export All Evidence Now
          </Link>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleTestConnection}
              disabled={isValidating}
              className="btn flex items-center justify-center gap-2"
              style={{ background: 'var(--border)' }}
            >
              {isValidating ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span className="hidden sm:inline">Test</span>
            </button>

            <Link
              href="/admin/auditsoft?tab=history"
              className="btn flex items-center justify-center gap-2"
              style={{ background: 'var(--border)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">History</span>
            </Link>

            <button
              onClick={handleDisconnect}
              className="btn flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/10"
              style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden sm:inline">Disconnect</span>
            </button>
          </div>
        </div>
      </div>

      {/* API Key Info */}
      <div className="card bg-slate-800/30">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-[var(--muted)] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <div className="text-sm">
            <p className="text-[var(--muted)]">
              API Key: <span className="font-mono">{connection.api_key_hint || '****xxxx'}</span>
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">
              Connected to: {connection.api_endpoint}
            </p>
            {connection.last_validated_at && (
              <p className="text-xs text-[var(--muted)]">
                Last validated: {new Date(connection.last_validated_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
