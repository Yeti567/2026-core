'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Step2Props {
    companyId: string;
    onComplete: () => void;
}

export default function EmployeeStep({ companyId, onComplete }: Step2Props) {
    const [method, setMethod] = useState<'upload' | 'manual' | null>(null);
    const [manualEmployees, setManualEmployees] = useState([{ firstName: '', lastName: '', email: '', position: '', role: 'worker' }]);
    const [saving, setSaving] = useState(false);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const addRow = () => {
        setManualEmployees([...manualEmployees, { firstName: '', lastName: '', email: '', position: '', role: 'worker' }]);
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const response = await fetch('/api/invitations/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employees: manualEmployees.filter(emp => emp.email && emp.firstName).map(emp => ({
                        firstName: emp.firstName,
                        lastName: emp.lastName,
                        email: emp.email.toLowerCase().trim(),
                        position: emp.position,
                        role: emp.role,
                    })),
                }),
            });

            if (response.ok) {
                onComplete();
            }
        } catch (err) {
            console.error('Failed to send invitations:', err);
        }
        setSaving(false);
    };

    if (!method) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-8">
                <button
                    onClick={() => setMethod('upload')}
                    className="card hover:border-indigo-500 transition-colors text-left group"
                >
                    <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:bg-indigo-500/20">
                        <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Upload CSV</h3>
                    <p className="text-sm text-slate-400">Import your entire team at once using our spreadsheet template.</p>
                </button>

                <button
                    onClick={() => setMethod('manual')}
                    className="card hover:border-indigo-500 transition-colors text-left group"
                >
                    <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20">
                        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Add Manually</h3>
                    <p className="text-sm text-slate-400">Enter employee details one-by-one to send individual invitations.</p>
                </button>
            </div>
        );
    }

    if (method === 'upload') {
        return (
            <div className="space-y-6 py-4">
                <div className="p-8 border-2 border-dashed border-slate-700 rounded-xl text-center">
                    <svg className="w-12 h-12 text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-slate-300 font-medium mb-2">CSV Upload logic integrated</p>
                    <p className="text-sm text-slate-500 mb-6">You can reuse the existing `upload-employees` logic here.</p>
                    <button className="btn btn-primary" onClick={() => onComplete()}>Simulate Upload & Continue</button>
                </div>
                <button onClick={() => setMethod(null)} className="text-sm text-indigo-400 hover:underline">Choose a different method</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <form onSubmit={handleManualSubmit} className="space-y-4">
                {manualEmployees.map((emp, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                        <input
                            className="input text-xs"
                            placeholder="First Name"
                            value={emp.firstName}
                            onChange={(e) => {
                                const newEmps = [...manualEmployees];
                                newEmps[index].firstName = e.target.value;
                                setManualEmployees(newEmps);
                            }}
                        />
                        <input
                            className="input text-xs"
                            placeholder="Last Name"
                            value={emp.lastName}
                            onChange={(e) => {
                                const newEmps = [...manualEmployees];
                                newEmps[index].lastName = e.target.value;
                                setManualEmployees(newEmps);
                            }}
                        />
                        <input
                            className="input text-xs"
                            placeholder="Email"
                            type="email"
                            value={emp.email}
                            onChange={(e) => {
                                const newEmps = [...manualEmployees];
                                newEmps[index].email = e.target.value;
                                setManualEmployees(newEmps);
                            }}
                        />
                        <input
                            className="input text-xs"
                            placeholder="Position"
                            value={emp.position}
                            onChange={(e) => {
                                const newEmps = [...manualEmployees];
                                newEmps[index].position = e.target.value;
                                setManualEmployees(newEmps);
                            }}
                        />
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addRow}
                    className="w-full py-2 border-2 border-dashed border-slate-700 rounded-lg text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors text-sm font-medium"
                >
                    + Add another employee
                </button>

                <div className="flex justify-between items-center pt-4">
                    <button type="button" onClick={() => setMethod(null)} className="text-sm text-indigo-400 hover:underline">Choose a different method</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Sending Invitations...' : 'Invite Employees & Continue'}
                    </button>
                </div>
            </form>
        </div>
    );
}
