'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import type { UserRole } from '@/lib/db/types';

// =============================================================================
// TYPES
// =============================================================================

interface Employee {
  id: string;
  user_id: string;
  company_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  position: string | null;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  first_admin: boolean;
  last_login: string | null;
  hire_date: string | null;
  created_at: string;
}

interface PendingInvitation {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  role: UserRole;
  invited_at: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
}

type FilterRole = 'all' | UserRole;
type FilterStatus = 'all' | 'active' | 'inactive' | 'pending';
type SortField = 'name' | 'email' | 'role' | 'last_login' | 'created_at';
type SortDirection = 'asc' | 'desc';

// =============================================================================
// CONSTANTS
// =============================================================================

const ITEMS_PER_PAGE = 25;

const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  super_admin: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  admin: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  internal_auditor: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  supervisor: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  worker: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
};

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  internal_auditor: 'Internal Auditor',
  supervisor: 'Supervisor',
  worker: 'Worker',
};

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

export default function EmployeesPage() {
  // User role state (for permission checks)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const canEdit = currentUserRole === 'admin' || currentUserRole === 'super_admin';

  // Data state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, inactive: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & sort state
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [editModal, setEditModal] = useState<Employee | null>(null);
  const [deleteModal, setDeleteModal] = useState<Employee | null>(null);
  const [resendModal, setResendModal] = useState<PendingInvitation | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // =============================================================================
  // FETCH CURRENT USER ROLE
  // =============================================================================

  useEffect(() => {
    async function fetchCurrentUserRole() {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', user.id)
            .single();
          if (profile) {
            setCurrentUserRole(profile.role as UserRole);
          }
        }
      } catch (err) {
        console.error('Failed to fetch user role:', err);
      }
    }
    fetchCurrentUserRole();
  }, []);

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [employeesRes, invitationsRes, statsRes] = await Promise.all([
        fetch(`/api/admin/employees?page=${page}&limit=${ITEMS_PER_PAGE}&search=${encodeURIComponent(search)}&role=${filterRole}&status=${filterStatus}&sort=${sortField}&direction=${sortDirection}`),
        fetch('/api/invitations'),
        fetch('/api/admin/employees/stats'),
      ]);

      if (!employeesRes.ok) throw new Error('Failed to fetch employees');

      const employeesData = await employeesRes.json();
      const invitationsData = await invitationsRes.json();
      const statsData = await statsRes.json();

      setEmployees(employeesData.employees || []);
      setTotalCount(employeesData.total || 0);
      setInvitations((invitationsData.invitations || []).filter((i: PendingInvitation) => i.status === 'pending'));
      setStats(statsData.stats || { total: 0, active: 0, inactive: 0, pending: 0 });
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load employee data');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterRole, filterStatus, sortField, sortDirection]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // =============================================================================
  // REALTIME SUBSCRIPTION
  // =============================================================================

  useEffect(() => {
    const supabase = getSupabase();

    // Subscribe to user_profiles changes
    const profilesChannel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, () => {
        fetchData();
      })
      .subscribe();

    // Subscribe to worker_invitations changes
    const invitationsChannel = supabase
      .channel('invitations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'worker_invitations' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(invitationsChannel);
    };
  }, [fetchData]);

  // =============================================================================
  // ACTIONS
  // =============================================================================

  const handleDeactivate = async (employee: Employee) => {
    if (employee.first_admin) {
      alert('Cannot deactivate the first admin');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !employee.is_active }),
      });

      if (!res.ok) throw new Error('Failed to update employee');
      await fetchData();
    } catch (err) {
      alert('Failed to update employee status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/employees/${deleteModal.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete employee');
      }

      setDeleteModal(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete employee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendInvite = async () => {
    if (!resendModal) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/invitations/${resendModal.id}/resend`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to resend invitation');

      setResendModal(null);
      await fetchData();
      alert('Invitation resent successfully');
    } catch (err) {
      alert('Failed to resend invitation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeInvite = async (invitation: PendingInvitation) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;

    try {
      const res = await fetch(`/api/invitations/${invitation.id}/revoke`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to revoke invitation');
      await fetchData();
    } catch (err) {
      alert('Failed to revoke invitation');
    }
  };

  const handleEditSave = async (updates: Partial<Employee>) => {
    if (!editModal) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/employees/${editModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error('Failed to update employee');

      setEditModal(null);
      await fetchData();
    } catch (err) {
      alert('Failed to update employee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Deactivate ${selectedIds.size} employees?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/employees/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deactivate',
          ids: Array.from(selectedIds),
        }),
      });

      if (!res.ok) throw new Error('Failed to deactivate employees');

      setSelectedIds(new Set());
      await fetchData();
    } catch (err) {
      alert('Failed to deactivate employees');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/admin/employees/export');
      if (!res.ok) throw new Error('Failed to export');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export employees');
    }
  };

  // =============================================================================
  // SORTING
  // =============================================================================

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
  };

  // =============================================================================
  // SELECTION
  // =============================================================================

  const toggleSelectAll = () => {
    if (selectedIds.size === employees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(employees.map(e => e.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // =============================================================================
  // PAGINATION
  // =============================================================================

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/admin"
              className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm flex items-center gap-1 mb-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Admin
            </Link>
            <h1 className="text-2xl font-bold">Employee Management</h1>
            <p className="text-[var(--muted)]">Manage your team and pending invitations</p>
          </div>

          {canEdit && (
            <Link
              href="/onboarding/upload-employees"
              className="btn btn-primary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Employees
            </Link>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="card">
            <p className="text-[var(--muted)] text-sm mb-1">Total Employees</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>
          <div className="card">
            <p className="text-[var(--muted)] text-sm mb-1">Active</p>
            <p className="text-3xl font-bold text-emerald-400">{stats.active}</p>
          </div>
          <div className="card">
            <p className="text-[var(--muted)] text-sm mb-1">Inactive</p>
            <p className="text-3xl font-bold text-red-400">{stats.inactive}</p>
          </div>
          <div className="card">
            <p className="text-[var(--muted)] text-sm mb-1">Pending Invitations</p>
            <p className="text-3xl font-bold text-amber-400">{stats.pending}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  className="input pl-10"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {/* Role Filter */}
            <select
              className="input w-auto"
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value as FilterRole);
                setPage(1);
              }}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="internal_auditor">Internal Auditor</option>
              <option value="supervisor">Supervisor</option>
              <option value="worker">Worker</option>
            </select>

            {/* Status Filter */}
            <select
              className="input w-auto"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as FilterStatus);
                setPage(1);
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Export Button */}
            <button onClick={handleExport} className="btn flex items-center gap-2" style={{ background: 'var(--border)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
          </div>

          {/* Bulk Actions */}
          {canEdit && selectedIds.size > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center gap-4">
              <span className="text-sm text-[var(--muted)]">{selectedIds.size} selected</span>
              <button
                onClick={handleBulkDeactivate}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
                disabled={actionLoading}
              >
                Deactivate Selected
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="card mb-6 border-red-500/30 bg-red-500/5">
            <p className="text-red-400">{error}</p>
            <button onClick={fetchData} className="text-sm text-[var(--primary)] hover:underline mt-2">
              Try again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="card text-center py-12">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--muted)]">Loading employees...</p>
          </div>
        )}

        {/* Employee Table */}
        {!loading && !error && (
          <div className="card p-0 overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                    {canEdit && (
                      <th className="py-3 px-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === employees.length && employees.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-[var(--border)]"
                        />
                      </th>
                    )}
                    <th className="py-3 px-4 text-left">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-1 text-[var(--muted)] font-medium hover:text-[var(--foreground)] transition-colors"
                      >
                        Employee
                        {sortField === 'name' && (
                          <svg className={`w-4 h-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-left text-[var(--muted)] font-medium">Email</th>
                    <th className="py-3 px-4 text-left text-[var(--muted)] font-medium">Position</th>
                    <th className="py-3 px-4 text-left">
                      <button
                        onClick={() => handleSort('role')}
                        className="flex items-center gap-1 text-[var(--muted)] font-medium hover:text-[var(--foreground)] transition-colors"
                      >
                        Role
                        {sortField === 'role' && (
                          <svg className={`w-4 h-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-left text-[var(--muted)] font-medium">Status</th>
                    <th className="py-3 px-4 text-left">
                      <button
                        onClick={() => handleSort('last_login')}
                        className="flex items-center gap-1 text-[var(--muted)] font-medium hover:text-[var(--foreground)] transition-colors"
                      >
                        Last Login
                        {sortField === 'last_login' && (
                          <svg className={`w-4 h-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-right text-[var(--muted)] font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit ? 8 : 7} className="py-12 text-center text-[var(--muted)]">
                        No employees found
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee) => (
                      <tr key={employee.id} className="border-b border-[var(--border)] hover:bg-[var(--background)]/50 transition-colors">
                        {canEdit && (
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(employee.id)}
                              onChange={() => toggleSelect(employee.id)}
                              className="rounded border-[var(--border)]"
                            />
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] text-sm font-medium">
                              {(employee.first_name?.[0] || '').toUpperCase()}
                              {(employee.last_name?.[0] || '').toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">
                                {employee.first_name} {employee.last_name}
                                {employee.first_admin && (
                                  <span className="ml-2 text-xs text-amber-400" title="First Admin">👑</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[var(--muted)]">{employee.email}</td>
                        <td className="py-3 px-4 text-[var(--muted)]">{employee.position || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[employee.role]?.bg} ${ROLE_COLORS[employee.role]?.text}`}>
                            {ROLE_LABELS[employee.role]}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {employee.is_active ? (
                            <span className="badge badge-green">Active</span>
                          ) : (
                            <span className="badge badge-red">Inactive</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[var(--muted)]">
                          {employee.last_login
                            ? new Date(employee.last_login).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td className="py-3 px-4">
                          {canEdit ? (
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/admin/employees/${employee.id}/certifications`}
                                className="p-1.5 rounded hover:bg-purple-500/10 text-[var(--muted)] hover:text-purple-400 transition-colors"
                                title="Certifications"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                              </Link>
                              <button
                                onClick={() => setEditModal(employee)}
                                className="p-1.5 rounded hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeactivate(employee)}
                                disabled={employee.first_admin}
                                className={`p-1.5 rounded transition-colors ${
                                  employee.first_admin
                                    ? 'opacity-30 cursor-not-allowed'
                                    : employee.is_active
                                    ? 'hover:bg-red-500/10 text-[var(--muted)] hover:text-red-400'
                                    : 'hover:bg-emerald-500/10 text-[var(--muted)] hover:text-emerald-400'
                                }`}
                                title={employee.first_admin ? 'Cannot deactivate first admin' : employee.is_active ? 'Deactivate' : 'Activate'}
                              >
                                {employee.is_active ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </button>
                              <button
                                onClick={() => setDeleteModal(employee)}
                                disabled={employee.first_admin}
                                className={`p-1.5 rounded transition-colors ${
                                  employee.first_admin
                                    ? 'opacity-30 cursor-not-allowed'
                                    : 'hover:bg-red-500/10 text-[var(--muted)] hover:text-red-400'
                                }`}
                                title={employee.first_admin ? 'Cannot delete first admin' : 'Delete'}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[var(--muted)] text-xs">View only</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-between">
                <p className="text-sm text-[var(--muted)]">
                  Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn text-sm disabled:opacity-50"
                    style={{ background: 'var(--border)' }}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-[var(--muted)]">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn text-sm disabled:opacity-50"
                    style={{ background: 'var(--border)' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pending Invitations Section */}
        {invitations.length > 0 && (
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold">Pending Invitations ({invitations.length})</h2>
              <p className="text-sm text-[var(--muted)]">Invitations that haven't been accepted yet</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                    <th className="py-3 px-4 text-left text-[var(--muted)] font-medium">Name</th>
                    <th className="py-3 px-4 text-left text-[var(--muted)] font-medium">Email</th>
                    <th className="py-3 px-4 text-left text-[var(--muted)] font-medium">Position</th>
                    <th className="py-3 px-4 text-left text-[var(--muted)] font-medium">Role</th>
                    <th className="py-3 px-4 text-left text-[var(--muted)] font-medium">Invited</th>
                    <th className="py-3 px-4 text-left text-[var(--muted)] font-medium">Expires</th>
                    <th className="py-3 px-4 text-right text-[var(--muted)] font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((invitation) => {
                    const isExpired = new Date(invitation.expires_at) < new Date();
                    return (
                      <tr key={invitation.id} className="border-b border-[var(--border)] hover:bg-[var(--background)]/50 transition-colors">
                        <td className="py-3 px-4 font-medium">
                          {invitation.first_name} {invitation.last_name}
                        </td>
                        <td className="py-3 px-4 text-[var(--muted)]">{invitation.email}</td>
                        <td className="py-3 px-4 text-[var(--muted)]">{invitation.position}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[invitation.role]?.bg} ${ROLE_COLORS[invitation.role]?.text}`}>
                            {ROLE_LABELS[invitation.role]}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[var(--muted)]">
                          {new Date(invitation.invited_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={isExpired ? 'text-red-400' : 'text-[var(--muted)]'}>
                            {new Date(invitation.expires_at).toLocaleDateString()}
                            {isExpired && ' (Expired)'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {canEdit ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setResendModal(invitation)}
                                className="text-sm text-[var(--primary)] hover:underline"
                              >
                                Resend
                              </button>
                              <button
                                onClick={() => handleRevokeInvite(invitation)}
                                className="text-sm text-red-400 hover:underline"
                              >
                                Revoke
                              </button>
                            </div>
                          ) : (
                            <span className="text-[var(--muted)] text-xs">View only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editModal && (
        <EditEmployeeModal
          employee={editModal}
          onClose={() => setEditModal(null)}
          onSave={handleEditSave}
          loading={actionLoading}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Delete Employee?</h3>
            <p className="text-[var(--muted)] mb-4">
              Are you sure you want to delete <strong>{deleteModal.first_name} {deleteModal.last_name}</strong>?
              This action cannot be undone.
            </p>
            <p className="text-sm text-amber-400 mb-4">
              Note: Employees who have submitted forms cannot be deleted.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="btn"
                style={{ background: 'var(--border)' }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn bg-red-500 hover:bg-red-600 text-white"
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resend Invitation Modal */}
      {resendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Resend Invitation</h3>
            <p className="text-[var(--muted)] mb-4">
              Send a new invitation email to <strong>{resendModal.email}</strong>?
              This will generate a new token and reset the expiration date.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setResendModal(null)}
                className="btn"
                style={{ background: 'var(--border)' }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleResendInvite}
                className="btn btn-primary"
                disabled={actionLoading}
              >
                {actionLoading ? 'Sending...' : 'Resend Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// =============================================================================
// EDIT MODAL COMPONENT
// =============================================================================

function EditEmployeeModal({
  employee,
  onClose,
  onSave,
  loading,
}: {
  employee: Employee;
  onClose: () => void;
  onSave: (updates: Partial<Employee>) => void;
  loading: boolean;
}) {
  const [role, setRole] = useState<UserRole>(employee.role);
  const [position, setPosition] = useState(employee.position || '');
  const [phone, setPhone] = useState(employee.phone || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ role, position, phone });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">
          Edit {employee.first_name} {employee.last_name}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              disabled={employee.first_admin}
            >
              <option value="worker">Worker</option>
              <option value="supervisor">Supervisor</option>
              <option value="internal_auditor">Internal Auditor</option>
              <option value="admin">Admin</option>
            </select>
            {employee.first_admin && (
              <p className="text-xs text-[var(--muted)] mt-1">First admin role cannot be changed</p>
            )}
          </div>

          <div>
            <label className="label">Position</label>
            <input
              type="text"
              className="input"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Job title"
            />
          </div>

          <div>
            <label className="label">Phone</label>
            <input
              type="tel"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(123) 456-7890"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn"
              style={{ background: 'var(--border)' }}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
