'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Step3Props {
    companyId: string;
    onComplete: () => void;
}

export default function EquipmentStep({ companyId, onComplete }: Step3Props) {
    const [method, setMethod] = useState<'upload' | 'manual' | null>(null);
    const [equipment, setEquipment] = useState([{ name: '', type: '', code: '' }]);
    const [saving, setSaving] = useState(false);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const addRow = () => {
        setEquipment([...equipment, { name: '', type: '', code: '' }]);
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        // Filter out and project to table columns
        const toInsert = equipment.filter(eq => eq.name && eq.code).map(eq => ({
            company_id: companyId,
            name: eq.name,
            equipment_type: eq.type,
            equipment_code: eq.code,
            status: 'active'
        }));

        if (toInsert.length > 0) {
            const { error } = await supabase.from('equipment_inventory').insert(toInsert);
            if (!error) onComplete();
        } else {
            onComplete();
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
                    <h3 className="font-semibold text-lg mb-1">Upload Equipment CSV</h3>
                    <p className="text-sm text-slate-400">Import your machinery, tools, and vehicles registry via CSV.</p>
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
                    <p className="text-sm text-slate-400">Add individual items to your inventory to track inspections.</p>
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <form onSubmit={handleManualSubmit} className="space-y-4">
                {equipment.map((eq, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                        <input
                            className="input text-xs"
                            placeholder="Equipment Name (e.g. Forklift)"
                            value={eq.name}
                            onChange={(e) => {
                                const newEq = [...equipment];
                                newEq[index].name = e.target.value;
                                setEquipment(newEq);
                            }}
                        />
                        <input
                            className="input text-xs"
                            placeholder="Type (e.g. Heavy Machinery)"
                            value={eq.type}
                            onChange={(e) => {
                                const newEq = [...equipment];
                                newEq[index].type = e.target.value;
                                setEquipment(newEq);
                            }}
                        />
                        <input
                            className="input text-xs"
                            placeholder="Unit # / Code"
                            value={eq.code}
                            onChange={(e) => {
                                const newEq = [...equipment];
                                newEq[index].code = e.target.value;
                                setEquipment(newEq);
                            }}
                        />
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addRow}
                    className="w-full py-2 border-2 border-dashed border-slate-700 rounded-lg text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors text-sm font-medium"
                >
                    + Add another item
                </button>

                <div className="flex justify-between items-center pt-4">
                    <button type="button" onClick={() => setMethod(null)} className="text-sm text-indigo-400 hover:underline">Choose a different method</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : 'Add Equipment & Continue'}
                    </button>
                </div>
            </form>
        </div>
    );
}
