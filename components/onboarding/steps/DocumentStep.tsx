'use client';

import { useState } from 'react';

interface Step4Props {
    companyId: string;
    onComplete: () => void;
}

const REQUIRED_DOCS = [
    { id: 'hs_manual', name: 'Health & Safety Manual', category: 'Manuals' },
    { id: 'policies', name: 'Company Policies', category: 'Policies' },
    { id: 'msds', name: 'MSDS / SDS Sheets', category: 'Compliance' },
];

export default function DocumentStep({ companyId, onComplete }: Step4Props) {
    const [uploads, setUploads] = useState<Record<string, File | null>>({
        hs_manual: null,
        policies: null,
        msds: null,
    });

    const handleFileChange = (id: string, file: File | null) => {
        setUploads({ ...uploads, [id]: file });
    };

    return (
        <div className="space-y-8">
            <div className="grid gap-4">
                {REQUIRED_DOCS.map((doc) => (
                    <div key={doc.id} className="p-4 bg-slate-800/20 border border-slate-700/50 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${uploads[doc.id] ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-500'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-medium text-sm text-slate-200">{doc.name}</h4>
                                <p className="text-xs text-slate-500">{doc.category}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {uploads[doc.id] && (
                                <span className="text-xs text-emerald-400 flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {uploads[doc.id]?.name.slice(0, 15)}...
                                </span>
                            )}
                            <label className="cursor-pointer">
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(doc.id, e.target.files?.[0] || null)}
                                />
                                <span className={`btn text-xs py-1.5 px-3 ${uploads[doc.id] ? 'bg-slate-700' : 'btn-primary'}`}>
                                    {uploads[doc.id] ? 'Change File' : 'Upload PDF'}
                                </span>
                            </label>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                    <h4 className="text-sm font-semibold text-slate-300">Ready to proceed?</h4>
                    <p className="text-xs text-slate-500 mt-1">You can always add more documents in the Control Center later.</p>
                </div>
                <button onClick={onComplete} className="btn btn-primary">
                    Continue to Forms
                </button>
            </div>
        </div>
    );
}
