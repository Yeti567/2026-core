'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePwaUpdate } from '@/hooks/usePwaUpdate';
import { RefreshCw, CheckCircle, Info, Download } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  const {
    updateAvailable,
    isUpdating,
    versionLabel,
    lastCheckedAt,
    updateNow,
    checkForUpdate
  } = usePwaUpdate();

  const [isChecking, setIsChecking] = useState(false);

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    try {
      await checkForUpdate('manual');
    } finally {
      setTimeout(() => setIsChecking(false), 1000);
    }
  };

  const formatLastChecked = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm flex items-center gap-1 mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg bg-indigo-600/20 flex items-center justify-center">
            <Info className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">About</h1>
            <p className="text-[var(--muted)]">App information and updates</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-6 bg-slate-800/50 border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold">COR Pathways</h2>
                <p className="text-sm text-[var(--muted)]">Construction Safety Management</p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--muted)]">Current Version</span>
                <span className="text-sm font-mono font-semibold">
                  {versionLabel || '1.0.0'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--muted)]">Last Checked</span>
                <span className="text-sm">{formatLastChecked(lastCheckedAt)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--muted)]">Status</span>
                <div className="flex items-center gap-2">
                  {updateAvailable ? (
                    <>
                      <Download className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-blue-400 font-medium">Update Available</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm text-emerald-400 font-medium">Up to Date</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {updateAvailable && (
            <Card className="p-6 bg-blue-900/20 border-blue-700">
              <div className="flex items-start gap-3">
                <Download className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-100 mb-1">Update Available</h3>
                  <p className="text-sm text-blue-200 mb-4">
                    A new version of COR Pathways is ready to install. Update now to get the latest features and improvements.
                  </p>
                  <Button
                    onClick={() => updateNow()}
                    disabled={isUpdating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Install Update
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6 bg-slate-800/50 border-slate-700">
            <h3 className="font-semibold mb-4">Check for Updates</h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              The app automatically checks for updates every 30 minutes and when you open it. 
              You can also manually check for updates at any time.
            </p>
            <Button
              onClick={handleCheckForUpdates}
              disabled={isChecking || isUpdating}
              variant="outline"
              className="w-full"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check for Updates
                </>
              )}
            </Button>
          </Card>

          <Card className="p-6 bg-slate-800/50 border-slate-700">
            <h3 className="font-semibold mb-3">About COR Pathways</h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              Complete COR 2020 certification platform for construction companies in Ontario. 
              Manage safety documentation, employee training, equipment tracking, and compliance requirements.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Works offline with automatic sync</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Secure document management</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Real-time compliance tracking</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
