'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Step1Props {
    companyId: string;
    onComplete: () => void;
}

export default function CompanyStep({ companyId, onComplete }: Step1Props) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        wsib_number: '',
        address: '',
        city: '',
        province: '',
        postal_code: '',
    });

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        async function loadCompany() {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .eq('id', companyId)
                .single();

            if (data) {
                setFormData({
                    name: data.name || '',
                    wsib_number: data.wsib_number || '',
                    address: data.address || '',
                    city: data.city || '',
                    province: data.province || '',
                    postal_code: data.postal_code || '',
                });
            }
            setLoading(false);
        }

        loadCompany();
    }, [companyId, supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const { error } = await supabase
            .from('companies')
            .update(formData)
            .eq('id', companyId);

        if (!error) {
            onComplete();
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                    <label className="label">Company Legal Name</label>
                    <input
                        type="text"
                        className="input"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Acme Construction Inc."
                    />
                </div>

                <div>
                    <label className="label">WSIB Number</label>
                    <input
                        type="text"
                        className="input"
                        value={formData.wsib_number}
                        onChange={(e) => setFormData({ ...formData, wsib_number: e.target.value })}
                        placeholder="1234567"
                    />
                </div>

                <div>
                    <label className="label">Street Address</label>
                    <input
                        type="text"
                        className="input"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="123 Safety Way"
                    />
                </div>

                <div>
                    <label className="label">City</label>
                    <input
                        type="text"
                        className="input"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Toronto"
                    />
                </div>

                <div>
                    <label className="label">Province / State</label>
                    <input
                        type="text"
                        className="input"
                        value={formData.province}
                        onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                        placeholder="Ontario"
                    />
                </div>

                <div>
                    <label className="label">Postal / Zip Code</label>
                    <input
                        type="text"
                        className="input"
                        value={formData.postal_code}
                        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                        placeholder="A1B 2C3"
                    />
                </div>
            </div>

            <div className="hidden">
                {/* Hidden submit to be triggered by Wizard buttons if needed, OR we trigger manual submit */}
                <button id="step-1-submit" type="submit">Submit</button>
            </div>
        </form>
    );
}
