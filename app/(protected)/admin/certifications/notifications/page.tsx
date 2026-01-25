'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// =============================================================================
// TYPES
// =============================================================================

interface NotificationStats {
  total: number;
  sent: number;
  pending: number;
  failed: number;
  byType: {
    '60_day': number;
    '30_day': number;
    '7_day': number;
    'expired': number;
  };
}

interface RecentNotification {
  id: string;
  reminder_type: string;
  status: string;
  sent_at: string | null;
  worker_name: string;
  cert_name: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // =============================================================================
  // FETCH DATA
  // =============================================================================

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/certifications/notifications/check');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setLastCheck(data.lastCheck);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // =============================================================================
  // RUN CHECK
  // =============================================================================

  const runExpiryCheck = async () => {
    setRunning(true);
    setMessage(null);

    try {
      const res = await fetch('/api/certifications/notifications/check', {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Check complete! Created ${data.remindersCreated} reminders, sent ${data.emailsSent} emails${data.emailsFailed > 0 ? `, ${data.emailsFailed} failed` : ''}.`,
        });
        fetchStats();
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to run expiry check',
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred',
      });
    } finally {
      setRunning(false);
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Link
            href="/admin/certifications"
            className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1 mb-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Certifications
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">📧</span>
                Expiry Notifications
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Monitor and manage certification expiry notifications
              </p>
            </div>
            <button
              onClick={runExpiryCheck}
              disabled={running}
              className="btn btn-primary flex items-center gap-2"
            >
              {running ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Run Check Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Message */}
        {message && (
          <div className={`card ${message.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
            <div className="flex items-center gap-3">
              {message.type === 'success' ? (
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <p className={message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-700/30">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">✅</span>
                  <span className="text-sm text-slate-400">Sent (7 days)</span>
                </div>
                <p className="text-3xl font-bold text-emerald-400">{stats?.sent || 0}</p>
              </div>
              <div className="card bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-700/30">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">⏳</span>
                  <span className="text-sm text-slate-400">Pending</span>
                </div>
                <p className="text-3xl font-bold text-amber-400">{stats?.pending || 0}</p>
              </div>
              <div className="card bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-700/30">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">❌</span>
                  <span className="text-sm text-slate-400">Failed</span>
                </div>
                <p className="text-3xl font-bold text-red-400">{stats?.failed || 0}</p>
              </div>
              <div className="card bg-gradient-to-br from-slate-500/10 to-slate-600/5 border-slate-700/30">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">📊</span>
                  <span className="text-sm text-slate-400">Total</span>
                </div>
                <p className="text-3xl font-bold text-slate-300">{stats?.total || 0}</p>
              </div>
            </div>

            {/* Notification Types Breakdown */}
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4">Notifications by Type (Last 7 Days)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full bg-amber-400/50"></span>
                    <span className="text-sm text-slate-400">60-Day Reminders</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-400">{stats?.byType['60_day'] || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full bg-orange-400/50"></span>
                    <span className="text-sm text-slate-400">30-Day Reminders</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-400">{stats?.byType['30_day'] || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full bg-red-400/50"></span>
                    <span className="text-sm text-slate-400">7-Day Urgents</span>
                  </div>
                  <p className="text-2xl font-bold text-red-400">{stats?.byType['7_day'] || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full bg-red-600"></span>
                    <span className="text-sm text-slate-400">Expired Notices</span>
                  </div>
                  <p className="text-2xl font-bold text-red-500">{stats?.byType['expired'] || 0}</p>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4">📋 How Notifications Work</h2>
              <div className="space-y-4 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <span className="text-amber-400 font-bold">60 days</span>
                  <div>
                    <p className="font-medium">Friendly Reminder</p>
                    <p className="text-slate-400">Sent to: Worker, Supervisor</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-orange-400 font-bold">30 days</span>
                  <div>
                    <p className="font-medium">Important Notice</p>
                    <p className="text-slate-400">Sent to: Worker, Supervisor, Safety Manager</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-red-400 font-bold">7 days</span>
                  <div>
                    <p className="font-medium">Urgent Alert</p>
                    <p className="text-slate-400">Sent to: Worker, Supervisor, Safety Manager, Internal Auditor</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-red-600 font-bold">Expired</span>
                  <div>
                    <p className="font-medium">Work Restriction Notice</p>
                    <p className="text-slate-400">Sent to: All stakeholders, work restriction applied</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule Info */}
            <div className="card border-indigo-500/30 bg-indigo-500/5">
              <div className="flex items-start gap-4">
                <span className="text-3xl">⏰</span>
                <div>
                  <h3 className="font-semibold text-white mb-2">Automatic Daily Check</h3>
                  <p className="text-sm text-slate-400">
                    The system automatically checks for expiring certifications every day at <strong className="text-slate-200">6:00 AM UTC</strong>.
                    You can also run the check manually using the button above.
                  </p>
                  {lastCheck && (
                    <p className="text-xs text-slate-500 mt-2">
                      Last check: {new Date(lastCheck).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Email Provider Status */}
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4">📨 Email Configuration</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">Email Provider</span>
                  <span className="badge badge-blue">
                    {process.env.NEXT_PUBLIC_EMAIL_PROVIDER || 'Development Mode'}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  Configure RESEND_API_KEY or SENDGRID_API_KEY in your environment variables to enable email delivery.
                  In development mode, emails are logged but not sent.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
