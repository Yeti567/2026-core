'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  CERTIFICATION_STATUS_LABELS,
  CERTIFICATION_CATEGORIES,
  type CertificationStatus,
} from '@/lib/certifications/types';

// =============================================================================
// TYPES
// =============================================================================

interface DashboardStats {
  totalWorkers: number;
  totalCertifications: number;
  activeCertifications: number;
  expiringSoon: number;
  expiringWarning: number;
  expired: number;
  pendingVerification: number;
  workersWithRestrictions: number;
  complianceRate: number;
}

interface ExpiringCertification {
  id: string;
  name: string;
  expiry_date: string;
  status: string;
  daysUntilExpiry: number;
  worker: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  certification_type: {
    id: string;
    name: string;
    short_code: string;
  } | null;
}

interface CertificationType {
  id: string;
  name: string;
  short_code: string | null;
  category: string;
  default_expiry_months: number | null;
  required_for_work: boolean;
  is_system_default: boolean;
}

interface Worker {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  position: string | null;
  certification_status: string;
}

type TabType = 'dashboard' | 'certifications' | 'workers' | 'types';

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CertificationTrackerPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dashboard state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [expiringCerts, setExpiringCerts] = useState<ExpiringCertification[]>([]);
  
  // Certification types state
  const [certTypes, setCertTypes] = useState<CertificationType[]>([]);
  
  // Workers state
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [workerStatusFilter, setWorkerStatusFilter] = useState<string>('all');

  // =============================================================================
  // FETCH DATA
  // =============================================================================

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/certifications/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      const data = await res.json();
      setStats(data.stats);
      setExpiringCerts(data.expiringCertifications || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data');
    }
  }, []);

  const fetchCertTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/certifications/types');
      if (!res.ok) throw new Error('Failed to fetch certification types');
      const data = await res.json();
      setCertTypes(data.types || []);
    } catch (err) {
      console.error('Cert types fetch error:', err);
    }
  }, []);

  const fetchWorkers = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .single();

      if (!profile) return;

      let query = supabase
        .from('workers')
        .select('id, first_name, last_name, email, position, certification_status')
        .eq('company_id', profile.company_id)
        .order('last_name');

      if (workerSearch) {
        query = query.or(`first_name.ilike.%${workerSearch}%,last_name.ilike.%${workerSearch}%,email.ilike.%${workerSearch}%`);
      }

      if (workerStatusFilter !== 'all') {
        query = query.eq('certification_status', workerStatusFilter);
      }

      const { data } = await query;
      setWorkers(data || []);
    } catch (err) {
      console.error('Workers fetch error:', err);
    }
  }, [workerSearch, workerStatusFilter]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDashboard(), fetchCertTypes()])
      .finally(() => setLoading(false));
  }, [fetchDashboard, fetchCertTypes]);

  useEffect(() => {
    if (activeTab === 'workers') {
      fetchWorkers();
    }
  }, [activeTab, fetchWorkers]);

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================

  const getUrgencyColor = (days: number) => {
    if (days <= 0) return 'text-red-400 bg-red-500/10';
    if (days <= 7) return 'text-red-400 bg-red-500/10';
    if (days <= 30) return 'text-amber-400 bg-amber-500/10';
    return 'text-blue-400 bg-blue-500/10';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'compliant') return 'badge badge-green';
    if (status === 'expiring_soon') return 'badge badge-amber';
    if (status === 'expired') return 'badge badge-red';
    return 'badge';
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
                href="/admin"
                className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1 mb-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Admin
              </Link>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">🎓</span>
                Certification & Training Tracker
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                href="/admin/certifications/notifications"
                className="btn flex items-center gap-2 text-sm"
                style={{ background: 'rgba(51, 65, 85, 0.5)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Notifications
              </Link>
              <Link
                href="/admin/certifications/reports"
                className="btn flex items-center gap-2 text-sm"
                style={{ background: 'rgba(51, 65, 85, 0.5)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Reports
              </Link>
              <Link
                href="/admin/certifications/bulk-upload"
                className="btn flex items-center gap-2 text-sm"
                style={{ background: 'rgba(51, 65, 85, 0.5)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Bulk Upload
              </Link>
              <Link
                href="/mobile/certifications/capture"
                className="btn flex items-center gap-2 text-sm"
                style={{ background: 'rgba(51, 65, 85, 0.5)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                📱 Capture
              </Link>
              <Link
                href="/admin/certifications/new"
                className="btn btn-primary flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Certification
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-px">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'workers', label: 'Workers', icon: '👥' },
              { id: 'types', label: 'Certification Types', icon: '📋' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2
                  ${activeTab === tab.id
                    ? 'bg-slate-800 text-white border-t border-x border-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
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
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="card border-red-500/30 bg-red-500/5 text-center py-8">
            <p className="text-red-400">{error}</p>
            <button onClick={fetchDashboard} className="btn btn-primary mt-4">
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && stats && (
              <div className="space-y-6 animate-fade-in-up">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <StatsCard
                    label="Total Workers"
                    value={stats.totalWorkers}
                    icon="👥"
                    color="slate"
                  />
                  <StatsCard
                    label="Active Certs"
                    value={stats.activeCertifications}
                    icon="✅"
                    color="emerald"
                  />
                  <StatsCard
                    label="Expiring Soon"
                    value={stats.expiringSoon}
                    subtitle="Within 30 days"
                    icon="⚠️"
                    color="amber"
                  />
                  <StatsCard
                    label="Expired"
                    value={stats.expired}
                    icon="🚫"
                    color="red"
                  />
                  <StatsCard
                    label="Compliance Rate"
                    value={`${stats.complianceRate}%`}
                    icon="📈"
                    color={stats.complianceRate >= 90 ? 'emerald' : stats.complianceRate >= 70 ? 'amber' : 'red'}
                  />
                </div>

                {/* Expiring Certifications */}
                <div className="card p-0 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white">Expiring & Expired Certifications</h2>
                      <p className="text-sm text-slate-400">Certifications requiring attention in the next 60 days</p>
                    </div>
                    <Link
                      href="/admin/certifications/reports?type=expiring"
                      className="text-sm text-indigo-400 hover:text-indigo-300"
                    >
                      View Full Report →
                    </Link>
                  </div>

                  {expiringCerts.length === 0 ? (
                    <div className="px-6 py-12 text-center text-slate-400">
                      <span className="text-4xl mb-4 block">🎉</span>
                      <p>No certifications expiring soon!</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700/50 bg-slate-800/30">
                            <th className="py-3 px-4 text-left text-slate-400 font-medium">Worker</th>
                            <th className="py-3 px-4 text-left text-slate-400 font-medium">Certification</th>
                            <th className="py-3 px-4 text-left text-slate-400 font-medium">Expiry Date</th>
                            <th className="py-3 px-4 text-left text-slate-400 font-medium">Status</th>
                            <th className="py-3 px-4 text-right text-slate-400 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expiringCerts.map(cert => (
                            <tr key={cert.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-4">
                                <Link
                                  href={`/admin/certifications/worker/${cert.worker.id}`}
                                  className="hover:text-indigo-400 transition-colors"
                                >
                                  <p className="font-medium text-white">
                                    {cert.worker.first_name} {cert.worker.last_name}
                                  </p>
                                  <p className="text-xs text-slate-500">{cert.worker.email}</p>
                                </Link>
                              </td>
                              <td className="py-3 px-4">
                                <p className="text-white">{cert.name}</p>
                                {cert.certification_type && (
                                  <p className="text-xs text-slate-500">
                                    {cert.certification_type.short_code || cert.certification_type.name}
                                  </p>
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-300">
                                {new Date(cert.expiry_date).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getUrgencyColor(cert.daysUntilExpiry)}`}>
                                  {cert.daysUntilExpiry <= 0
                                    ? 'Expired'
                                    : cert.daysUntilExpiry === 1
                                    ? '1 day left'
                                    : `${cert.daysUntilExpiry} days left`}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <Link
                                  href={`/admin/certifications/${cert.id}`}
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
                  )}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link
                    href="/admin/certifications/reports?type=matrix"
                    className="card hover:border-indigo-500/50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl group-hover:scale-110 transition-transform">📊</span>
                      <div>
                        <h3 className="font-semibold text-white">Training Matrix</h3>
                        <p className="text-sm text-slate-400">View who has what certifications</p>
                      </div>
                    </div>
                  </Link>
                  <Link
                    href="/admin/certifications/training/new"
                    className="card hover:border-emerald-500/50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl group-hover:scale-110 transition-transform">📝</span>
                      <div>
                        <h3 className="font-semibold text-white">Record Training</h3>
                        <p className="text-sm text-slate-400">Log toolbox talk or OJT</p>
                      </div>
                    </div>
                  </Link>
                  <Link
                    href="/admin/certifications/reports?type=gaps"
                    className="card hover:border-amber-500/50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl group-hover:scale-110 transition-transform">🔍</span>
                      <div>
                        <h3 className="font-semibold text-white">Competency Gaps</h3>
                        <p className="text-sm text-slate-400">Identify training needs</p>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Upload & Notification Actions */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Link
                    href="/admin/certifications/bulk-upload"
                    className="card hover:border-purple-500/50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl group-hover:scale-110 transition-transform">📁</span>
                      <div>
                        <h3 className="font-semibold text-white">Bulk Upload</h3>
                        <p className="text-sm text-slate-400">Upload multiple certificates</p>
                      </div>
                    </div>
                  </Link>
                  <Link
                    href="/mobile/certifications/capture"
                    className="card hover:border-cyan-500/50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl group-hover:scale-110 transition-transform">📸</span>
                      <div>
                        <h3 className="font-semibold text-white">Photo Capture</h3>
                        <p className="text-sm text-slate-400">Take photos of safety tickets</p>
                      </div>
                    </div>
                  </Link>
                  <Link
                    href="/admin/certifications/notifications"
                    className="card hover:border-blue-500/50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl group-hover:scale-110 transition-transform">📧</span>
                      <div>
                        <h3 className="font-semibold text-white">Notifications</h3>
                        <p className="text-sm text-slate-400">Manage expiry alerts</p>
                      </div>
                    </div>
                  </Link>
                  <Link
                    href="/admin/certifications/test"
                    className="card hover:border-emerald-500/50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl group-hover:scale-110 transition-transform">🧪</span>
                      <div>
                        <h3 className="font-semibold text-white">Test Suite</h3>
                        <p className="text-sm text-slate-400">Verify all features work</p>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            )}

            {/* Workers Tab */}
            {activeTab === 'workers' && (
              <div className="space-y-6 animate-fade-in-up">
                {/* Filters */}
                <div className="card">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[250px]">
                      <div className="relative">
                        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search workers..."
                          className="input pl-10"
                          value={workerSearch}
                          onChange={e => setWorkerSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <select
                      className="input w-auto"
                      value={workerStatusFilter}
                      onChange={e => setWorkerStatusFilter(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="compliant">Compliant</option>
                      <option value="expiring_soon">Expiring Soon</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                </div>

                {/* Workers List */}
                <div className="card p-0 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/50 bg-slate-800/30">
                        <th className="py-3 px-4 text-left text-slate-400 font-medium">Worker</th>
                        <th className="py-3 px-4 text-left text-slate-400 font-medium">Position</th>
                        <th className="py-3 px-4 text-left text-slate-400 font-medium">Certification Status</th>
                        <th className="py-3 px-4 text-right text-slate-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-slate-400">
                            No workers found
                          </td>
                        </tr>
                      ) : (
                        workers.map(worker => (
                          <tr key={worker.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-medium">
                                  {worker.first_name?.[0]}{worker.last_name?.[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-white">{worker.first_name} {worker.last_name}</p>
                                  <p className="text-xs text-slate-500">{worker.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-300">{worker.position || '-'}</td>
                            <td className="py-3 px-4">
                              <span className={getStatusBadge(worker.certification_status || 'not_checked')}>
                                {worker.certification_status === 'compliant' ? 'Compliant' :
                                 worker.certification_status === 'expiring_soon' ? 'Expiring Soon' :
                                 worker.certification_status === 'expired' ? 'Expired' : 'Not Checked'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Link
                                href={`/admin/employees/${worker.id}/certifications`}
                                className="text-indigo-400 hover:text-indigo-300 text-sm"
                              >
                                View Certifications →
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Certification Types Tab */}
            {activeTab === 'types' && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="flex justify-between items-center">
                  <p className="text-slate-400">
                    Manage certification types available to your organization
                  </p>
                  <button className="btn btn-primary flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Custom Type
                  </button>
                </div>

                <div className="grid gap-4">
                  {CERTIFICATION_CATEGORIES.map(category => {
                    const typesInCategory = certTypes.filter(t => t.category === category.value);
                    if (typesInCategory.length === 0) return null;

                    return (
                      <div key={category.value} className="card">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          {category.value === 'safety' && '🦺'}
                          {category.value === 'operational' && '🔧'}
                          {category.value === 'regulatory' && '📜'}
                          {category.value === 'company-specific' && '🏢'}
                          {category.label}
                        </h3>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {typesInCategory.map(type => (
                            <div
                              key={type.id}
                              className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-white">{type.name}</p>
                                  {type.short_code && (
                                    <p className="text-xs text-slate-500">{type.short_code}</p>
                                  )}
                                </div>
                                {type.required_for_work && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                                    Required
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                                {type.default_expiry_months ? (
                                  <span>{type.default_expiry_months / 12} year expiry</span>
                                ) : (
                                  <span>No expiry</span>
                                )}
                                {type.is_system_default && (
                                  <span className="text-slate-500">• System</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

// =============================================================================
// STATS CARD COMPONENT
// =============================================================================

function StatsCard({
  label,
  value,
  subtitle,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: 'slate' | 'emerald' | 'amber' | 'red' | 'indigo';
}) {
  const colorClasses = {
    slate: 'from-slate-500/20 to-slate-600/5 border-slate-700/50',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-700/50',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-700/50',
    red: 'from-red-500/20 to-red-600/5 border-red-700/50',
    indigo: 'from-indigo-500/20 to-indigo-600/5 border-indigo-700/50',
  };

  const valueColors = {
    slate: 'text-slate-100',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    indigo: 'text-indigo-400',
  };

  // Safe: color is a typed prop from the component's defined union type
  // eslint-disable-next-line security/detect-object-injection
  const bgClass = colorClasses[color];
  // eslint-disable-next-line security/detect-object-injection
  const textClass = valueColors[color];

  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${bgClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${textClass}`}>{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}
