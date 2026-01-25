'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  INDUSTRIES,
  type Industry,
} from '@/lib/validation/company';

interface Company {
  id: string;
  name: string;
  industry?: string;
  employee_count?: number;
  years_in_business?: number;
  main_services?: string[];
}

interface CompanyProfileFormProps {
  company: Company | null;
}

export function CompanyProfileForm({ company }: CompanyProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    industry: company?.industry || '',
    employee_count: company?.employee_count || '',
    years_in_business: company?.years_in_business || '',
    main_services: company?.main_services || [] as string[],
  });

  const [mainServiceInput, setMainServiceInput] = useState('');

  const updateField = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  const addMainService = useCallback(() => {
    if (mainServiceInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        main_services: [...prev.main_services, mainServiceInput.trim()],
      }));
      setMainServiceInput('');
    }
  }, [mainServiceInput]);

  const removeMainService = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      main_services: prev.main_services.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/company/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: formData.industry || null,
          employee_count: formData.employee_count ? parseInt(formData.employee_count.toString()) : null,
          years_in_business: formData.years_in_business ? parseInt(formData.years_in_business.toString()) : null,
          main_services: formData.main_services.length > 0 ? formData.main_services : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to update company profile');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-emerald-400 text-sm">Company profile updated successfully!</p>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Industry Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="label">
                Industry/Trade <span className="text-slate-500">(Required for COR certification)</span>
              </label>
              <select
                className="input"
                value={formData.industry}
                onChange={(e) => updateField('industry', e.target.value)}
                required
              >
                <option value="">Select industry...</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind.value} value={ind.value}>
                    {ind.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                This helps us customize your COR certification requirements
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">
                  Number of Employees
                </label>
                <input
                  type="number"
                  className="input"
                  value={formData.employee_count}
                  onChange={(e) => updateField('employee_count', e.target.value)}
                  placeholder="e.g., 32"
                  min="1"
                />
              </div>

              <div>
                <label className="label">
                  Years in Business
                </label>
                <input
                  type="number"
                  className="input"
                  value={formData.years_in_business}
                  onChange={(e) => updateField('years_in_business', e.target.value)}
                  placeholder="e.g., 5"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="label">
                Main Services
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input flex-1"
                    value={mainServiceInput}
                    onChange={(e) => setMainServiceInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addMainService();
                      }
                    }}
                    placeholder="e.g., Foundations, Flatwork, Structural Concrete"
                  />
                  <button
                    type="button"
                    onClick={addMainService}
                    className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {formData.main_services.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.main_services.map((service, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-700 text-sm text-white"
                      >
                        {service}
                        <button
                          type="button"
                          onClick={() => removeMainService(index)}
                          className="text-slate-400 hover:text-white"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  List your main services or areas of expertise
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t border-slate-700">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary px-8"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href="/dashboard"
            className="btn border border-slate-700 px-8"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
