'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
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
    department?: string;
}

interface Certification {
    id: string;
    certification_name: string;
    issue_date: string;
    expiry_date: string | null;
    status: 'valid' | 'expired' | 'expiring_soon';
}

// =============================================================================
// CONSTANTS  
// =============================================================================

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

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function EmployeeDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [certifications, setCertifications] = useState<Certification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'certifications' | 'activity'>('details');
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Employee>>({});
    const [saving, setSaving] = useState(false);

    // Fetch employee data
    const loadEmployee = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/employees/${id}`);
            if (!res.ok) {
                throw new Error('Employee not found');
            }
            const data = await res.json();
            setEmployee(data.employee || data);
            setEditForm(data.employee || data);

            // Load certifications
            const certRes = await fetch(`/api/admin/employees/${id}/certifications`);
            if (certRes.ok) {
                const certData = await certRes.json();
                setCertifications(certData.certifications || []);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load employee');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadEmployee();
    }, [loadEmployee]);

    // Save employee changes
    const handleSave = async () => {
        if (!employee) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/employees/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            if (!res.ok) throw new Error('Failed to save');
            await loadEmployee();
            setEditing(false);
        } catch (err) {
            alert('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Error state
    if (error || !employee) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">😕</div>
                    <h2 className="text-xl text-white mb-2">{error || 'Employee Not Found'}</h2>
                    <Link href="/admin/employees" className="text-[var(--primary)] hover:underline">
                        ← Back to Employees
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header with Back Button */}
                <div className="mb-8">
                    <Link
                        href="/admin/employees"
                        className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm flex items-center gap-2 mb-4 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Employees
                    </Link>

                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] text-2xl font-bold">
                                {(employee.first_name?.[0] || '').toUpperCase()}
                                {(employee.last_name?.[0] || '').toUpperCase()}
                            </div>

                            <div>
                                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                                    {employee.first_name} {employee.last_name}
                                    {employee.first_admin && (
                                        <span className="text-amber-400" title="First Admin">👑</span>
                                    )}
                                </h1>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[employee.role]?.bg} ${ROLE_COLORS[employee.role]?.text}`}>
                                        {ROLE_LABELS[employee.role]}
                                    </span>
                                    {employee.is_active ? (
                                        <span className="badge badge-green">Active</span>
                                    ) : (
                                        <span className="badge badge-red">Inactive</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {!editing ? (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="btn border border-[var(--border)] flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            setEditing(false);
                                            setEditForm(employee);
                                        }}
                                        className="btn border border-[var(--border)]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="btn btn-primary"
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-[var(--border)] mb-6">
                    <div className="flex gap-1">
                        {(['details', 'certifications', 'activity'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 text-sm font-medium transition-colors relative
                  ${activeTab === tab
                                        ? 'text-[var(--primary)]'
                                        : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'details' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Personal Information */}
                        <div className="card">
                            <h3 className="text-lg font-semibold mb-4">Personal Information</h3>

                            <div className="space-y-4">
                                {editing ? (
                                    <>
                                        <div>
                                            <label className="block text-sm text-[var(--muted)] mb-1">First Name</label>
                                            <input
                                                type="text"
                                                className="input w-full"
                                                value={editForm.first_name || ''}
                                                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[var(--muted)] mb-1">Last Name</label>
                                            <input
                                                type="text"
                                                className="input w-full"
                                                value={editForm.last_name || ''}
                                                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[var(--muted)] mb-1">Phone</label>
                                            <input
                                                type="tel"
                                                className="input w-full"
                                                value={editForm.phone || ''}
                                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <dt className="text-sm text-[var(--muted)]">Full Name</dt>
                                            <dd className="text-white font-medium">{employee.first_name} {employee.last_name}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm text-[var(--muted)]">Email</dt>
                                            <dd className="text-white">{employee.email}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm text-[var(--muted)]">Phone</dt>
                                            <dd className="text-white">{employee.phone || '—'}</dd>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Work Information */}
                        <div className="card">
                            <h3 className="text-lg font-semibold mb-4">Work Information</h3>

                            <div className="space-y-4">
                                {editing ? (
                                    <>
                                        <div>
                                            <label className="block text-sm text-[var(--muted)] mb-1">Position</label>
                                            <input
                                                type="text"
                                                className="input w-full"
                                                value={editForm.position || ''}
                                                onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[var(--muted)] mb-1">Role</label>
                                            <select
                                                className="input w-full"
                                                value={editForm.role}
                                                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                                                disabled={employee.first_admin}
                                            >
                                                <option value="worker">Worker</option>
                                                <option value="supervisor">Supervisor</option>
                                                <option value="internal_auditor">Internal Auditor</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[var(--muted)] mb-1">Hire Date</label>
                                            <input
                                                type="date"
                                                className="input w-full"
                                                value={editForm.hire_date?.split('T')[0] || ''}
                                                onChange={(e) => setEditForm({ ...editForm, hire_date: e.target.value })}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <dt className="text-sm text-[var(--muted)]">Position</dt>
                                            <dd className="text-white">{employee.position || '—'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm text-[var(--muted)]">Role</dt>
                                            <dd className="text-white">{ROLE_LABELS[employee.role]}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm text-[var(--muted)]">Hire Date</dt>
                                            <dd className="text-white">
                                                {employee.hire_date
                                                    ? new Date(employee.hire_date).toLocaleDateString()
                                                    : '—'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm text-[var(--muted)]">Last Login</dt>
                                            <dd className="text-white">
                                                {employee.last_login
                                                    ? new Date(employee.last_login).toLocaleString()
                                                    : 'Never'}
                                            </dd>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Account Status */}
                        <div className="card md:col-span-2">
                            <h3 className="text-lg font-semibold mb-4">Account Status</h3>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <dt className="text-sm text-[var(--muted)]">Status</dt>
                                    <dd>
                                        {employee.is_active ? (
                                            <span className="text-emerald-400">Active</span>
                                        ) : (
                                            <span className="text-red-400">Inactive</span>
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-[var(--muted)]">First Admin</dt>
                                    <dd className="text-white">{employee.first_admin ? 'Yes 👑' : 'No'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-[var(--muted)]">Created</dt>
                                    <dd className="text-white">{new Date(employee.created_at).toLocaleDateString()}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-[var(--muted)]">User ID</dt>
                                    <dd className="text-white font-mono text-xs">{employee.user_id?.slice(0, 8)}...</dd>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'certifications' && (
                    <div className="card">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold">Certifications</h3>
                            <Link
                                href={`/admin/employees/${id}/certifications`}
                                className="btn btn-primary text-sm"
                            >
                                Manage Certifications
                            </Link>
                        </div>

                        {certifications.length === 0 ? (
                            <div className="text-center py-8 text-[var(--muted)]">
                                <p>No certifications recorded.</p>
                                <Link
                                    href={`/admin/employees/${id}/certifications`}
                                    className="text-[var(--primary)] hover:underline mt-2 inline-block"
                                >
                                    Add certifications →
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {certifications.map((cert) => (
                                    <div
                                        key={cert.id}
                                        className="flex items-center justify-between p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]"
                                    >
                                        <div>
                                            <p className="font-medium">{cert.certification_name}</p>
                                            <p className="text-sm text-[var(--muted)]">
                                                Issued: {new Date(cert.issue_date).toLocaleDateString()}
                                                {cert.expiry_date && ` • Expires: ${new Date(cert.expiry_date).toLocaleDateString()}`}
                                            </p>
                                        </div>
                                        <span className={`badge ${cert.status === 'valid' ? 'badge-green' :
                                                cert.status === 'expiring_soon' ? 'badge-yellow' :
                                                    'badge-red'
                                            }`}>
                                            {cert.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'activity' && (
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-6">Activity Log</h3>
                        <div className="text-center py-8 text-[var(--muted)]">
                            <p>Activity tracking coming soon.</p>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
