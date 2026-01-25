'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AuditSoftStatus {
  connected: boolean;
  connection?: {
    connection_status: string;
    organization_id?: string;
    audit_id?: string;
    audit_scheduled_date?: string;
    auditor_name?: string;
    auditor_email?: string;
    last_sync_at?: string;
    last_sync_status?: string;
    total_items_synced?: number;
  };
}

export function AuditSoftStatusWidget() {
  const [status, setStatus] = useState<AuditSoftStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const response = await fetch('/api/integrations/auditsoft/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load AuditSoft status:', error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate days until audit
  const getDaysUntilAudit = () => {
    if (!status?.connection?.audit_scheduled_date) return null;
    const auditDate = new Date(status.connection.audit_scheduled_date);
    const today = new Date();
    const diffTime = auditDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Format relative time
  const formatLastSync = () => {
    if (!status?.connection?.last_sync_at) return 'Never';
    const syncDate = new Date(status.connection.last_sync_at);
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-1/3 mb-4" />
        <div className="h-8 bg-slate-700 rounded w-1/2 mb-2" />
        <div className="h-4 bg-slate-700 rounded w-2/3" />
      </div>
    );
  }

  // Not connected state
  if (!status?.connected) {
    return (
      <div className="card border-slate-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
              <span className="text-xl">🔗</span>
            </div>
            <div>
              <h3 className="font-semibold">AuditSoft</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-slate-500 rounded-full" />
                <span className="text-xs text-[var(--muted)]">Not Connected</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-[var(--muted)] mt-4 mb-4">
          Connect to AuditSoft to export your COR evidence directly to your auditor.
        </p>

        <Link
          href="/admin/settings/integrations"
          className="btn btn-primary w-full text-center"
        >
          Connect Now
        </Link>
      </div>
    );
  }

  // Connected state
  const daysUntil = getDaysUntilAudit();
  const conn = status.connection!;

  return (
    <div className="card border-emerald-500/30">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <span className="text-xl">🔗</span>
          </div>
          <div>
            <h3 className="font-semibold">AuditSoft</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-400">Connected</span>
            </div>
          </div>
        </div>

        {daysUntil !== null && daysUntil > 0 && (
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-400">{daysUntil}</p>
            <p className="text-xs text-[var(--muted)]">days to audit</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-slate-800/50">
          <p className="text-xs text-[var(--muted)]">Last Sync</p>
          <p className="font-medium text-sm">{formatLastSync()}</p>
        </div>
        <div className="p-3 rounded-lg bg-slate-800/50">
          <p className="text-xs text-[var(--muted)]">Items Synced</p>
          <p className="font-medium text-sm">{conn.total_items_synced?.toLocaleString() || 0}</p>
        </div>
      </div>

      {/* Audit Date */}
      {conn.audit_scheduled_date && (
        <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-indigo-400">📅</span>
            <div>
              <p className="text-xs text-indigo-300">Audit Date</p>
              <p className="font-medium text-indigo-200">
                {new Date(conn.audit_scheduled_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              {conn.auditor_name && (
                <p className="text-xs text-indigo-300 mt-1">
                  Auditor: {conn.auditor_name}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Last Sync Status */}
      {conn.last_sync_status && conn.last_sync_status !== 'success' && (
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-4 text-xs text-amber-300">
          ⚠️ Last sync: {conn.last_sync_status}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href="/admin/auditsoft/export"
          className="btn btn-primary flex-1 text-center text-sm"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Export
        </Link>
        <Link
          href="/admin/auditsoft"
          className="btn flex-1 text-center text-sm"
          style={{ background: 'var(--border)' }}
        >
          Details
        </Link>
      </div>
    </div>
  );
}
