'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

interface Department {
    id: string;
    name: string;
    code?: string;
    description?: string;
    department_type: string;
    display_order: number;
    color_code?: string;
    parent_department_id?: string;
    superintendent_id?: string;
    manager_id?: string;
    worker_count: number;
    equipment_count: number;
    parent_department?: { name: string; id: string };
    superintendent?: { first_name: string; last_name: string; email: string; position: string };
    manager?: { first_name: string; last_name: string; email: string; position: string };
}

interface Worker {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    position: string;
    role: string;
}

interface Equipment {
    id: string;
    name: string;
    equipment_number: string;
    equipment_type: string;
    status: string;
}

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

export default function DepartmentDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const [department, setDepartment] = useState<Department | null>(null);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'workers' | 'equipment'>('overview');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const supabase = getSupabase();

            // Fetch department basic info
            const deptRes = await fetch(`/api/admin/departments?id=${id}`);
            if (!deptRes.ok) throw new Error('Department not found');
            const deptData = await deptRes.json();

            // Handle array or object return
            const dept = Array.isArray(deptData.departments)
                ? deptData.departments.find((d: any) => d.id === id)
                : deptData.department;

            if (!dept) throw new Error('Department not found');
            setDepartment(dept);

            // Fetch workers and equipment
            const [workersRes, equipRes] = await Promise.all([
                fetch(`/api/admin/departments/${id}/workers`),
                fetch(`/api/admin/departments/${id}/equipment`)
            ]);

            if (workersRes.ok) {
                const wData = await workersRes.json();
                setWorkers(wData.workers || []);
            }

            if (equipRes.ok) {
                const eData = await equipRes.json();
                setEquipment(eData.equipment || []);
            }

        } catch (err: any) {
            setError(err.message || 'Failed to load department');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !department) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🏢</div>
                    <h2 className="text-xl text-white mb-2">{error || 'Department Not Found'}</h2>
                    <Link href="/admin/departments" className="text-[var(--primary)] hover:underline">
                        ← Back to Departments
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/admin/departments"
                        className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm flex items-center gap-2 mb-4 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Departments
                    </Link>

                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-bold text-white">{department.name}</h1>
                                {department.code && (
                                    <span className="text-sm px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                                        {department.code}
                                    </span>
                                )}
                            </div>
                            <p className="text-[var(--muted)]">{department.description || 'No description provided'}</p>
                        </div>

                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
                            style={{ backgroundColor: department.color_code || 'var(--primary)' }}
                        >
                            {department.name[0].toUpperCase()}
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="card text-center py-6">
                        <p className="text-3xl font-bold text-[var(--primary)]">{workers.length}</p>
                        <p className="text-sm text-[var(--muted)]">Total Workers</p>
                    </div>
                    <div className="card text-center py-6">
                        <p className="text-3xl font-bold text-emerald-400">{equipment.length}</p>
                        <p className="text-sm text-[var(--muted)]">Equipment items</p>
                    </div>
                    <div className="card text-center py-6">
                        <p className="text-lg font-semibold text-white truncate px-2">
                            {department.parent_department?.name || 'Root'}
                        </p>
                        <p className="text-sm text-[var(--muted)]">Parent Dept</p>
                    </div>
                    <div className="card text-center py-6">
                        <p className="text-lg font-semibold text-white capitalize">
                            {department.department_type}
                        </p>
                        <p className="text-sm text-[var(--muted)]">Type</p>
                    </div>
                </div>

                {/* Main Content Tabs */}
                <div className="border-b border-[var(--border)] mb-6">
                    <div className="flex gap-1">
                        {(['overview', 'workers', 'equipment'] as const).map((tab) => (
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
                <div className="space-y-6">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Leadership */}
                            <div className="card">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Leadership
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <dt className="text-sm text-[var(--muted)]">Superintendent</dt>
                                        {department.superintendent ? (
                                            <dd className="text-white">
                                                <p className="font-medium">{department.superintendent.first_name} {department.superintendent.last_name}</p>
                                                <p className="text-sm text-[var(--muted)]">{department.superintendent.email}</p>
                                            </dd>
                                        ) : <dd className="text-slate-500">Not assigned</dd>}
                                    </div>
                                    <div>
                                        <dt className="text-sm text-[var(--muted)]">Manager</dt>
                                        {department.manager ? (
                                            <dd className="text-white">
                                                <p className="font-medium">{department.manager.first_name} {department.manager.last_name}</p>
                                                <p className="text-sm text-[var(--muted)]">{department.manager.email}</p>
                                            </dd>
                                        ) : <dd className="text-slate-500">Not assigned</dd>}
                                    </div>
                                </div>
                            </div>

                            {/* Settings/Meta */}
                            <div className="card">
                                <h3 className="text-lg font-semibold mb-4">Configuration</h3>
                                <div className="space-y-4">
                                    <div>
                                        <dt className="text-sm text-[var(--muted)]">Display Order</dt>
                                        <dd className="text-white">{department.display_order}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-[var(--muted)]">Color Label</dt>
                                        <dd className="flex items-center gap-2">
                                            <span
                                                className="w-4 h-4 rounded-full border border-white/20"
                                                style={{ backgroundColor: department.color_code }}
                                            />
                                            <span className="text-white font-mono uppercase">{department.color_code || 'Default'}</span>
                                        </dd>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'workers' && (
                        <div className="card p-0 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                                        <th className="py-3 px-4 text-left font-medium text-[var(--muted)]">Name</th>
                                        <th className="py-3 px-4 text-left font-medium text-[var(--muted)]">Position</th>
                                        <th className="py-3 px-4 text-left font-medium text-[var(--muted)]">Email</th>
                                        <th className="py-3 px-4 text-right font-medium text-[var(--muted)]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {workers.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-[var(--muted)]">No workers assigned to this department</td>
                                        </tr>
                                    ) : (
                                        workers.map(worker => (
                                            <tr key={worker.id} className="hover:bg-slate-800/20 transition-colors">
                                                <td className="py-3 px-4 font-medium text-white">{worker.first_name} {worker.last_name}</td>
                                                <td className="py-3 px-4 text-slate-300">{worker.position}</td>
                                                <td className="py-3 px-4 text-slate-400">{worker.email}</td>
                                                <td className="py-3 px-4 text-right">
                                                    <Link
                                                        href={`/admin/employees/${worker.id}`}
                                                        className="text-[var(--primary)] hover:underline"
                                                    >
                                                        View →
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'equipment' && (
                        <div className="card p-0 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                                        <th className="py-3 px-4 text-left font-medium text-[var(--muted)]">ID</th>
                                        <th className="py-3 px-4 text-left font-medium text-[var(--muted)]">Type</th>
                                        <th className="py-3 px-4 text-left font-medium text-[var(--muted)]">Name</th>
                                        <th className="py-3 px-4 text-left font-medium text-[var(--muted)]">Status</th>
                                        <th className="py-3 px-4 text-right font-medium text-[var(--muted)]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {equipment.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-[var(--muted)]">No equipment assigned to this department</td>
                                        </tr>
                                    ) : (
                                        equipment.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                                                <td className="py-3 px-4 font-mono text-xs text-indigo-400">{item.equipment_number}</td>
                                                <td className="py-3 px-4 text-slate-300">{item.equipment_type}</td>
                                                <td className="py-3 px-4 text-white font-medium">{item.name || '—'}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${item.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                                        }`}>
                                                        {item.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <Link
                                                        href={`/admin/maintenance/equipment/${item.id}`}
                                                        className="text-[var(--primary)] hover:underline"
                                                    >
                                                        Track →
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
