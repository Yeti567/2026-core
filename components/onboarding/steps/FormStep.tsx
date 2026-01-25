'use client';

import { useState } from 'react';

interface Step5Props {
    companyId: string;
    onComplete: () => void;
}

const FORMS = [
    { id: 'hazard', name: 'Hazard Assessments', description: 'FLHA and Site-Wide assessments' },
    { id: 'inspection', name: 'Equipment Inspections', description: 'Daily and weekly pre-use checklists' },
    { id: 'incident', name: 'Incident Reports', description: 'Near-miss and accident reporting' },
    { id: 'training', name: 'Training Records', description: 'Competency and certificate tracking' },
    { id: 'safety_meeting', name: 'Safety Meetings', description: 'Toolbox talks and committee minutes' },
];

export default function FormStep({ companyId, onComplete }: Step5Props) {
    const [selected, setSelected] = useState<string[]>(FORMS.map(f => f.id));

    const toggleForm = (id: string) => {
        if (selected.includes(id)) {
            setSelected(selected.filter(s => s !== id));
        } else {
            setSelected([...selected, id]);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-indigo-500/5 p-4 rounded-lg border border-indigo-500/10 mb-6">
                <p className="text-xs text-slate-400 leading-relaxed">
                    Select the form templates you want to enable for your company. These will be ready to use immediately by your team.
                </p>
            </div>

            <div className="space-y-3">
                {FORMS.map((form) => (
                    <label
                        key={form.id}
                        className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${selected.includes(form.id)
                                ? 'bg-indigo-500/5 border-indigo-500/30'
                                : 'bg-slate-800/20 border-slate-700/50 hover:border-slate-600'
                            }`}
                    >
                        <div className="pt-1">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                                checked={selected.includes(form.id)}
                                onChange={() => toggleForm(form.id)}
                            />
                        </div>
                        <div>
                            <h4 className={`text-sm font-semibold ${selected.includes(form.id) ? 'text-indigo-300' : 'text-slate-300'}`}>
                                {form.name}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">{form.description}</p>
                        </div>
                    </label>
                ))}
            </div>

            <div className="pt-8">
                <button
                    onClick={onComplete}
                    className="btn btn-primary w-full py-3 text-base"
                >
                    Initialize Selected Forms & Complete Setup
                </button>
            </div>
        </div>
    );
}
