'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

interface Worker {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  position: string | null;
}

interface CertificationType {
  id: string;
  name: string;
  short_code: string | null;
  category: string;
  default_expiry_months: number | null;
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

export default function NewCertificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [certTypes, setCertTypes] = useState<CertificationType[]>([]);
  const [workerSearch, setWorkerSearch] = useState('');
  
  const [form, setForm] = useState({
    worker_id: '',
    certification_type_id: '',
    name: '',
    issuing_organization: '',
    certificate_number: '',
    issue_date: '',
    expiry_date: '',
    notes: '',
  });

  // Fetch workers and cert types
  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .single();

      if (profile) {
        const { data: workersData } = await supabase
          .from('workers')
          .select('id, first_name, last_name, email, position')
          .eq('company_id', profile.company_id)
          .order('last_name');
        
        setWorkers(workersData || []);
      }

      const typesRes = await fetch('/api/certifications/types');
      const typesData = await typesRes.json();
      setCertTypes(typesData.types || []);
    };

    fetchData();
  }, []);

  const filteredWorkers = workers.filter(w => {
    if (!workerSearch) return true;
    const search = workerSearch.toLowerCase();
    return (
      w.first_name?.toLowerCase().includes(search) ||
      w.last_name?.toLowerCase().includes(search) ||
      w.email?.toLowerCase().includes(search)
    );
  });

  const handleTypeChange = (typeId: string) => {
    const type = certTypes.find(t => t.id === typeId);
    setForm(prev => ({
      ...prev,
      certification_type_id: typeId,
      name: type?.name || prev.name,
    }));

    // Auto-calculate expiry date if issue date is set
    if (form.issue_date && type?.default_expiry_months) {
      const issueDate = new Date(form.issue_date);
      issueDate.setMonth(issueDate.getMonth() + type.default_expiry_months);
      setForm(prev => ({
        ...prev,
        expiry_date: issueDate.toISOString().split('T')[0],
      }));
    }
  };

  const handleIssueDateChange = (date: string) => {
    setForm(prev => ({ ...prev, issue_date: date }));
    
    // Auto-calculate expiry date
    const type = certTypes.find(t => t.id === form.certification_type_id);
    if (date && type?.default_expiry_months) {
      const issueDate = new Date(date);
      issueDate.setMonth(issueDate.getMonth() + type.default_expiry_months);
      setForm(prev => ({
        ...prev,
        expiry_date: issueDate.toISOString().split('T')[0],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.worker_id) {
      alert('Please select a worker');
      return;
    }
    if (!form.name) {
      alert('Certification name is required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to create certification');
        return;
      }

      const data = await res.json();
      router.push(`/admin/certifications/worker/${form.worker_id}`);
    } catch (err) {
      console.error('Create error:', err);
      alert('Failed to create certification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <Link
            href="/admin/certifications"
            className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1 mb-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Certifications
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">➕</span>
            Add Certification
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="card space-y-6">
          {/* Worker Selection */}
          <div>
            <label className="label">Select Worker *</label>
            <div className="relative">
              <input
                type="text"
                className="input mb-2"
                placeholder="Search workers..."
                value={workerSearch}
                onChange={e => setWorkerSearch(e.target.value)}
              />
              <div className="max-h-48 overflow-y-auto border border-slate-700 rounded-lg bg-slate-800/50">
                {filteredWorkers.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">No workers found</p>
                ) : (
                  filteredWorkers.map(worker => (
                    <button
                      key={worker.id}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, worker_id: worker.id }))}
                      className={`w-full p-3 text-left hover:bg-slate-700/50 transition-colors flex items-center justify-between ${
                        form.worker_id === worker.id ? 'bg-indigo-500/20 border-l-2 border-indigo-500' : ''
                      }`}
                    >
                      <div>
                        <p className="font-medium text-white">
                          {worker.first_name} {worker.last_name}
                        </p>
                        <p className="text-xs text-slate-400">{worker.email || worker.position}</p>
                      </div>
                      {form.worker_id === worker.id && (
                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Certification Type */}
          <div>
            <label className="label">Certification Type</label>
            <select
              className="input"
              value={form.certification_type_id}
              onChange={e => handleTypeChange(e.target.value)}
            >
              <option value="">Select type or enter custom name below...</option>
              <optgroup label="Safety">
                {certTypes.filter(t => t.category === 'safety').map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </optgroup>
              <optgroup label="Operational">
                {certTypes.filter(t => t.category === 'operational').map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </optgroup>
              <optgroup label="Company Specific">
                {certTypes.filter(t => t.category === 'company-specific').map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Certification Name */}
          <div>
            <label className="label">Certification Name *</label>
            <input
              type="text"
              className="input"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Working at Heights"
              required
            />
          </div>

          {/* Issuing Organization */}
          <div>
            <label className="label">Issuing Organization</label>
            <input
              type="text"
              className="input"
              value={form.issuing_organization}
              onChange={e => setForm(prev => ({ ...prev, issuing_organization: e.target.value }))}
              placeholder="e.g., Ontario Safety Training"
            />
          </div>

          {/* Certificate Number */}
          <div>
            <label className="label">Certificate Number</label>
            <input
              type="text"
              className="input"
              value={form.certificate_number}
              onChange={e => setForm(prev => ({ ...prev, certificate_number: e.target.value }))}
              placeholder="e.g., WAH-2024-12345"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Issue Date</label>
              <input
                type="date"
                className="input"
                value={form.issue_date}
                onChange={e => handleIssueDateChange(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Expiry Date</label>
              <input
                type="date"
                className="input"
                value={form.expiry_date}
                onChange={e => setForm(prev => ({ ...prev, expiry_date: e.target.value }))}
              />
              {form.certification_type_id && (
                <p className="text-xs text-slate-500 mt-1">
                  Auto-calculated based on standard expiry period
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={3}
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes about this certification..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <Link
              href="/admin/certifications"
              className="btn"
              style={{ background: 'rgba(51, 65, 85, 0.5)' }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !form.worker_id || !form.name}
            >
              {loading ? 'Creating...' : 'Add Certification'}
            </button>
          </div>
        </form>

        {/* Quick Add Info */}
        <div className="mt-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
          <h3 className="font-medium text-white mb-2">💡 Tip: Mobile Upload</h3>
          <p className="text-sm text-slate-400">
            After creating the certification record, you can upload a photo of the certificate 
            or safety ticket directly from your mobile device. The system accepts photos (JPEG, PNG) 
            and PDF documents up to 10MB.
          </p>
        </div>
      </div>
    </main>
  );
}
