'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CERTIFICATION_CATEGORIES } from '@/lib/certifications/types';

// =============================================================================
// TYPES
// =============================================================================

interface ExpiryReportItem {
  id: string;
  name: string;
  certificate_number: string | null;
  expiry_date: string;
  daysUntilExpiry: number;
  urgency: 'expired' | 'critical' | 'warning' | 'notice';
  worker: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    position: string | null;
    department: string | null;
  };
  certification_type: {
    id: string;
    name: string;
    short_code: string;
    required_for_work: boolean;
  } | null;
}

interface MatrixRow {
  worker: {
    id: string;
    name: string;
    email: string | null;
    position: string | null;
    department: string | null;
  };
  certifications: {
    [typeId: string]: {
      status: 'valid' | 'expiring' | 'expired' | 'missing';
      expiryDate: string | null;
      certificationId: string | null;
    };
  };
}

interface CertType {
  id: string;
  name: string;
  short_code: string | null;
  required_for_work: boolean;
}

type ReportType = 'expiring' | 'matrix' | 'gaps';

// =============================================================================
// LOADING FALLBACK
// =============================================================================

function ReportsLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading reports...</p>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT (wrapped in Suspense)
// =============================================================================

export default function CertificationReportsPage() {
  return (
    <Suspense fallback={<ReportsLoadingFallback />}>
      <CertificationReportsContent />
    </Suspense>
  );
}

function CertificationReportsContent() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') as ReportType || 'expiring';
  
  const [reportType, setReportType] = useState<ReportType>(initialType);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Expiring report state
  const [expiryDays, setExpiryDays] = useState(90);
  const [expiryReport, setExpiryReport] = useState<ExpiryReportItem[]>([]);
  const [expirySummary, setExpirySummary] = useState<{
    total: number;
    expired: number;
    critical: number;
    warning: number;
    notice: number;
  } | null>(null);
  
  // Matrix report state
  const [matrixData, setMatrixData] = useState<MatrixRow[]>([]);
  const [certTypes, setCertTypes] = useState<CertType[]>([]);
  const [matrixSummary, setMatrixSummary] = useState<{
    fullyCompliant: number;
    partiallyCompliant: number;
    nonCompliant: number;
  } | null>(null);
  const [requiredOnly, setRequiredOnly] = useState(false);

  // =============================================================================
  // FETCH DATA
  // =============================================================================

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        if (reportType === 'expiring') {
          const res = await fetch(`/api/certifications/reports/expiring?days=${expiryDays}`);
          if (!res.ok) throw new Error('Failed to fetch');
          const data = await res.json();
          setExpiryReport(data.report || []);
          setExpirySummary(data.summary);
        } else if (reportType === 'matrix') {
          const res = await fetch(`/api/certifications/reports/matrix?required_only=${requiredOnly}`);
          if (!res.ok) throw new Error('Failed to fetch');
          const data = await res.json();
          setMatrixData(data.matrix || []);
          setCertTypes(data.certificationTypes || []);
          setMatrixSummary(data.summary?.compliance);
        }
      } catch (err) {
        console.error('Report fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportType, expiryDays, requiredOnly]);

  // =============================================================================
  // EXPORT HANDLERS
  // =============================================================================

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      let url = '';
      if (reportType === 'expiring') {
        url = `/api/certifications/reports/expiring?days=${expiryDays}&format=csv`;
      } else if (reportType === 'matrix') {
        url = `/api/certifications/reports/matrix?required_only=${requiredOnly}&format=csv`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `certification_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================

  const getUrgencyBadge = (urgency: string) => {
    const classes: Record<string, string> = {
      expired: 'bg-red-500/20 text-red-400',
      critical: 'bg-red-500/20 text-red-400',
      warning: 'bg-amber-500/20 text-amber-400',
      notice: 'bg-blue-500/20 text-blue-400',
    };
    const labels: Record<string, string> = {
      expired: 'Expired',
      critical: 'Critical (≤7 days)',
      warning: 'Warning (≤30 days)',
      notice: 'Notice (≤60 days)',
    };
    return (
      // Safe: urgency is derived from expiration date logic, controlled set of values
      // eslint-disable-next-line security/detect-object-injection
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes[urgency]}`}>
        {/* eslint-disable-next-line security/detect-object-injection */}
        {labels[urgency]}
      </span>
    );
  };

  const getMatrixStatusCell = (status: string) => {
    const classes: Record<string, string> = {
      valid: 'bg-emerald-500/20 text-emerald-400',
      expiring: 'bg-amber-500/20 text-amber-400',
      expired: 'bg-red-500/20 text-red-400',
      missing: 'bg-slate-700/50 text-slate-500',
    };
    const icons: Record<string, string> = {
      valid: '✓',
      expiring: '⚠',
      expired: '✗',
      missing: '-',
    };
    return (
      // Safe: status comes from controlled matrix status values, not user input
      // eslint-disable-next-line security/detect-object-injection
      <span className={`inline-flex items-center justify-center w-8 h-8 rounded ${classes[status]}`}>
        {/* eslint-disable-next-line security/detect-object-injection */}
        {icons[status]}
      </span>
    );
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin/certifications"
                className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1 mb-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Certifications
              </Link>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">📊</span>
                Compliance Reports
              </h1>
            </div>

            <button
              onClick={handleExportCSV}
              disabled={exporting || loading}
              className="btn flex items-center gap-2 text-sm"
              style={{ background: 'rgba(51, 65, 85, 0.5)' }}
            >
              {exporting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              Export to CSV
            </button>
          </div>

          {/* Report Type Tabs */}
          <div className="flex gap-2 mt-4">
            {[
              { id: 'expiring', label: 'Expiring Certifications', icon: '⏰' },
              { id: 'matrix', label: 'Training Matrix', icon: '📋' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setReportType(tab.id as ReportType)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  reportType === tab.id
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Expiring Report */}
        {reportType === 'expiring' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="card flex flex-wrap items-center gap-4">
              <div>
                <label className="text-sm text-slate-400 mr-2">Show certifications expiring within:</label>
                <select
                  className="input w-auto"
                  value={expiryDays}
                  onChange={e => setExpiryDays(parseInt(e.target.value))}
                >
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>6 months</option>
                  <option value={365}>1 year</option>
                </select>
              </div>
            </div>

            {/* Summary */}
            {expirySummary && (
              <div className="grid grid-cols-5 gap-4">
                <div className="card text-center">
                  <p className="text-3xl font-bold text-white">{expirySummary.total}</p>
                  <p className="text-sm text-slate-400">Total</p>
                </div>
                <div className="card text-center border-red-500/30">
                  <p className="text-3xl font-bold text-red-400">{expirySummary.expired}</p>
                  <p className="text-sm text-slate-400">Expired</p>
                </div>
                <div className="card text-center border-red-500/30">
                  <p className="text-3xl font-bold text-red-400">{expirySummary.critical}</p>
                  <p className="text-sm text-slate-400">Critical (≤7d)</p>
                </div>
                <div className="card text-center border-amber-500/30">
                  <p className="text-3xl font-bold text-amber-400">{expirySummary.warning}</p>
                  <p className="text-sm text-slate-400">Warning (≤30d)</p>
                </div>
                <div className="card text-center border-blue-500/30">
                  <p className="text-3xl font-bold text-blue-400">{expirySummary.notice}</p>
                  <p className="text-sm text-slate-400">Notice (≤60d)</p>
                </div>
              </div>
            )}

            {/* Report Table */}
            {loading ? (
              <div className="card text-center py-12">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : expiryReport.length === 0 ? (
              <div className="card text-center py-12">
                <span className="text-4xl mb-4 block">🎉</span>
                <p className="text-slate-400">No certifications expiring in the selected timeframe!</p>
              </div>
            ) : (
              <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/50 bg-slate-800/30">
                        <th className="py-3 px-4 text-left text-slate-400 font-medium">Worker</th>
                        <th className="py-3 px-4 text-left text-slate-400 font-medium">Position/Dept</th>
                        <th className="py-3 px-4 text-left text-slate-400 font-medium">Certification</th>
                        <th className="py-3 px-4 text-left text-slate-400 font-medium">Expiry Date</th>
                        <th className="py-3 px-4 text-left text-slate-400 font-medium">Status</th>
                        <th className="py-3 px-4 text-center text-slate-400 font-medium">Required</th>
                        <th className="py-3 px-4 text-right text-slate-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiryReport.map(item => (
                        <tr key={item.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-medium text-white">
                              {item.worker.first_name} {item.worker.last_name}
                            </p>
                            <p className="text-xs text-slate-500">{item.worker.email}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {item.worker.position || '-'}
                            {item.worker.department && (
                              <span className="text-slate-500"> / {item.worker.department}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-white">{item.name}</p>
                            {item.certification_type && (
                              <p className="text-xs text-slate-500">{item.certification_type.short_code}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {new Date(item.expiry_date).toLocaleDateString()}
                            <span className="text-xs text-slate-500 ml-2">
                              ({item.daysUntilExpiry <= 0 ? 'Expired' : `${item.daysUntilExpiry}d`})
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {getUrgencyBadge(item.urgency)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.certification_type?.required_for_work ? (
                              <span className="text-red-400">Yes</span>
                            ) : (
                              <span className="text-slate-500">No</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link
                              href={`/admin/certifications/worker/${item.worker.id}`}
                              className="text-indigo-400 hover:text-indigo-300 text-sm"
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Training Matrix */}
        {reportType === 'matrix' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="card flex flex-wrap items-center justify-between gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiredOnly}
                  onChange={e => setRequiredOnly(e.target.checked)}
                  className="rounded border-slate-600"
                />
                <span className="text-sm text-slate-300">Show only required certifications</span>
              </label>

              {/* Legend */}
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-400">Legend:</span>
                <span className="flex items-center gap-1">
                  <span className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">✓</span>
                  Valid
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">⚠</span>
                  Expiring
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-6 h-6 rounded bg-red-500/20 text-red-400 flex items-center justify-center text-xs">✗</span>
                  Expired
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-6 h-6 rounded bg-slate-700/50 text-slate-500 flex items-center justify-center text-xs">-</span>
                  Missing
                </span>
              </div>
            </div>

            {/* Summary */}
            {matrixSummary && (
              <div className="grid grid-cols-3 gap-4">
                <div className="card text-center border-emerald-500/30">
                  <p className="text-3xl font-bold text-emerald-400">{matrixSummary.fullyCompliant}</p>
                  <p className="text-sm text-slate-400">Fully Compliant Workers</p>
                </div>
                <div className="card text-center border-amber-500/30">
                  <p className="text-3xl font-bold text-amber-400">{matrixSummary.partiallyCompliant}</p>
                  <p className="text-sm text-slate-400">Partially Compliant</p>
                </div>
                <div className="card text-center border-red-500/30">
                  <p className="text-3xl font-bold text-red-400">{matrixSummary.nonCompliant}</p>
                  <p className="text-sm text-slate-400">Non-Compliant</p>
                </div>
              </div>
            )}

            {/* Matrix Table */}
            {loading ? (
              <div className="card text-center py-12">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : matrixData.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-slate-400">No data available</p>
              </div>
            ) : (
              <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/50 bg-slate-800/30">
                        <th className="py-3 px-4 text-left text-slate-400 font-medium sticky left-0 bg-slate-800/90 backdrop-blur-sm">
                          Worker
                        </th>
                        {certTypes.map(type => (
                          <th
                            key={type.id}
                            className="py-3 px-2 text-center text-slate-400 font-medium whitespace-nowrap"
                            title={type.name}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <span>{type.short_code || type.name.slice(0, 4)}</span>
                              {type.required_for_work && (
                                <span className="text-red-400 text-xs">*</span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrixData.map(row => (
                        <tr key={row.worker.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 sticky left-0 bg-slate-900/90 backdrop-blur-sm">
                            <Link
                              href={`/admin/certifications/worker/${row.worker.id}`}
                              className="hover:text-indigo-400 transition-colors"
                            >
                              <p className="font-medium text-white">{row.worker.name}</p>
                              <p className="text-xs text-slate-500">{row.worker.position || '-'}</p>
                            </Link>
                          </td>
                          {certTypes.map(type => (
                            <td key={type.id} className="py-3 px-2 text-center">
                              {getMatrixStatusCell(row.certifications[type.id]?.status || 'missing')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
