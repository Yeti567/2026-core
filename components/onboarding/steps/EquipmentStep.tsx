'use client';

import { useState, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import {
    validateEquipmentHeaders,
    validateEquipmentCSV,
    downloadEquipmentCSVTemplate,
    VALID_EQUIPMENT_TYPES,
    type EquipmentCSVRow,
    type EquipmentUploadResult,
} from '@/lib/validation/csv-equipment';

interface Step3Props {
    companyId: string;
    onComplete: () => void;
}

export default function EquipmentStep({ companyId, onComplete }: Step3Props) {
    const [method, setMethod] = useState<'upload' | 'manual' | null>(null);
    const [equipment, setEquipment] = useState([{ name: '', type: '', code: '' }]);
    const [saving, setSaving] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const [uploadResult, setUploadResult] = useState<EquipmentUploadResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const addRow = () => {
        setEquipment([...equipment, { name: '', type: '', code: '' }]);
    };

    // CSV file parsing
    const parseFile = useCallback((file: File) => {
        setParseError(null);
        setUploadResult(null);

        if (!file.name.toLowerCase().endsWith('.csv')) {
            setParseError('Please upload a CSV file');
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.toLowerCase().trim(),
            complete: (results) => {
                const headerErrors = validateEquipmentHeaders(results.meta.fields || []);
                if (headerErrors.length > 0) {
                    setParseError(headerErrors.join('. '));
                    return;
                }

                const rows = results.data as EquipmentCSVRow[];
                const validation = validateEquipmentCSV(rows, []);
                setUploadResult(validation);
            },
            error: (error) => {
                setParseError(`Failed to parse CSV: ${error.message}`);
            },
        });
    }, []);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        if (file) parseFile(file);
    }, [parseFile]);

    const handleCSVSubmit = async () => {
        if (!uploadResult) return;
        setSaving(true);

        const validRows = uploadResult.rows.filter(r => r.isValid);
        const toInsert = validRows.map(r => ({
            company_id: companyId,
            name: r.data.name.trim(),
            equipment_code: r.data.equipment_code.trim(),
            equipment_type: r.data.equipment_type.toLowerCase().trim(),
            manufacturer: r.data.manufacturer?.trim() || null,
            model: r.data.model?.trim() || null,
            serial_number: r.data.serial_number?.trim() || null,
            purchase_date: r.data.purchase_date?.trim() || null,
            last_inspection_date: r.data.last_inspection_date?.trim() || null,
            next_inspection_date: r.data.next_inspection_date?.trim() || null,
            status: r.data.status?.toLowerCase().trim() || 'active',
            location: r.data.location?.trim() || null,
            notes: r.data.notes?.trim() || null,
        }));

        if (toInsert.length > 0) {
            const { error } = await supabase.from('equipment_inventory').insert(toInsert);
            if (!error) onComplete();
            else setParseError(`Database error: ${error.message}`);
        } else {
            onComplete();
        }
        setSaving(false);
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

    // CSV Upload method
    if (method === 'upload') {
        return (
            <div className="space-y-6">
                {/* Header with Download Template */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-medium text-white">Upload Equipment CSV</h3>
                        <p className="text-sm text-slate-400">Import your equipment inventory from a CSV file</p>
                    </div>
                    <button
                        onClick={downloadEquipmentCSVTemplate}
                        className="flex items-center gap-2 py-2 px-4 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Template
                    </button>
                </div>

                {/* Drop Zone */}
                {!uploadResult && (
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                            dragActive
                                ? 'border-indigo-500 bg-indigo-500/10'
                                : 'border-slate-600 hover:border-slate-500'
                        }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])}
                        />
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-500/10 flex items-center justify-center">
                            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <p className="text-lg font-medium text-white mb-1">Drop your CSV file here</p>
                        <p className="text-slate-400 text-sm">or click to browse</p>
                    </div>
                )}

                {parseError && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-red-400 text-sm">{parseError}</p>
                    </div>
                )}

                {/* Format Info */}
                {!uploadResult && (
                    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                        <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            CSV Column Format
                        </h4>
                        <div className="grid grid-cols-2 gap-6 text-sm">
                            <div>
                                <p className="text-slate-400 mb-2">Required columns:</p>
                                <ul className="space-y-1 text-slate-300">
                                    <li><code className="text-emerald-400">name</code> - Equipment name</li>
                                    <li><code className="text-emerald-400">equipment_code</code> - Unique ID/code</li>
                                    <li><code className="text-emerald-400">equipment_type</code> - Type category</li>
                                </ul>
                            </div>
                            <div>
                                <p className="text-slate-400 mb-2">Optional columns:</p>
                                <ul className="space-y-1 text-slate-300">
                                    <li><code className="text-slate-500">manufacturer</code>, <code className="text-slate-500">model</code>, <code className="text-slate-500">serial_number</code></li>
                                    <li><code className="text-slate-500">purchase_date</code>, <code className="text-slate-500">last_inspection_date</code></li>
                                    <li><code className="text-slate-500">status</code>, <code className="text-slate-500">location</code>, <code className="text-slate-500">notes</code></li>
                                </ul>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3">
                            Valid types: {VALID_EQUIPMENT_TYPES.join(', ')}
                        </p>
                    </div>
                )}

                {/* Preview Table */}
                {uploadResult && uploadResult.rows.length > 0 && (
                    <div className="rounded-xl border border-slate-700 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                            <div>
                                <span className="text-white font-medium">Preview</span>
                                <span className="text-slate-400 ml-2">
                                    ({uploadResult.valid} valid, {uploadResult.invalid} errors)
                                </span>
                            </div>
                            <button
                                onClick={() => setUploadResult(null)}
                                className="text-sm text-slate-400 hover:text-white"
                            >
                                Upload Different File
                            </button>
                        </div>
                        <div className="max-h-64 overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-800/50 sticky top-0">
                                    <tr>
                                        <th className="py-2 px-3 text-left text-slate-400">#</th>
                                        <th className="py-2 px-3 text-left text-slate-400">Name</th>
                                        <th className="py-2 px-3 text-left text-slate-400">Code</th>
                                        <th className="py-2 px-3 text-left text-slate-400">Type</th>
                                        <th className="py-2 px-3 text-left text-slate-400">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {uploadResult.rows.map((row) => (
                                        <tr key={row.rowNumber} className={row.isValid ? '' : 'bg-red-500/5'}>
                                            <td className="py-2 px-3 text-slate-500">{row.rowNumber}</td>
                                            <td className="py-2 px-3 text-white">{row.data.name}</td>
                                            <td className="py-2 px-3 text-slate-300">{row.data.equipment_code}</td>
                                            <td className="py-2 px-3 text-slate-300">{row.data.equipment_type}</td>
                                            <td className="py-2 px-3">
                                                {row.isValid ? (
                                                    <span className="text-emerald-400 text-xs">✓ Valid</span>
                                                ) : (
                                                    <span className="text-red-400 text-xs">{row.errors[0]?.message}</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center pt-4">
                    <button type="button" onClick={() => { setMethod(null); setUploadResult(null); }} className="text-sm text-indigo-400 hover:underline">
                        Choose a different method
                    </button>
                    {uploadResult && uploadResult.valid > 0 && (
                        <button onClick={handleCSVSubmit} className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : `Import ${uploadResult.valid} Equipment & Continue`}
                        </button>
                    )}
                    {!uploadResult && (
                        <button onClick={onComplete} className="btn btn-primary">
                            Skip & Continue
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Manual entry method
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
                                const val = e.target.value;
                                setEquipment(prev => prev.map((item, i) => i === index ? { ...item, name: val } : item));
                            }}
                        />
                        <input
                            className="input text-xs"
                            placeholder="Type (e.g. Heavy Machinery)"
                            value={eq.type}
                            onChange={(e) => {
                                const val = e.target.value;
                                setEquipment(prev => prev.map((item, i) => i === index ? { ...item, type: val } : item));
                            }}
                        />
                        <input
                            className="input text-xs"
                            placeholder="Unit # / Code"
                            value={eq.code}
                            onChange={(e) => {
                                const val = e.target.value;
                                setEquipment(prev => prev.map((item, i) => i === index ? { ...item, code: val } : item));
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
