'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  validateCompanyRegistration,
  isBlockedEmailDomain,
  getEmailDomain,
  formatPhoneNumber,
  formatPostalCode,
  formatWSIBNumber,
  CANADIAN_PROVINCES,
  REGISTRANT_POSITIONS,
  INDUSTRIES,
  type CompanyRegistration,
  type RegistrantPosition,
  type Industry,
} from '@/lib/validation/company';

type Step = 'form' | 'submitting' | 'success';

// Tooltip component
function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        className="text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => {
          e.preventDefault();
          setShow(!show);
        }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-lg bg-[#1f1f1f] border border-[var(--border)] shadow-xl text-xs text-[var(--muted)]">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1f1f1f] border-r border-b border-[var(--border)] transform rotate-45 -mt-1" />
        </div>
      )}
      {children}
    </span>
  );
}

// Form field wrapper
function FormField({
  label,
  required,
  error,
  tooltip,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label flex items-center">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
        {tooltip && <Tooltip content={tooltip}><span /></Tooltip>}
      </label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<CompanyRegistration>({
    company_name: '',
    wsib_number: '',
    company_email: '',
    address: '',
    city: '',
    province: 'ON',
    postal_code: '',
    phone: '',
    registrant_name: '',
    registrant_position: '' as RegistrantPosition,
    registrant_email: '',
    industry: undefined,
    employee_count: undefined,
    years_in_business: undefined,
    main_services: [],
  });

  const [showIndustryFields, setShowIndustryFields] = useState(false);
  const [mainServiceInput, setMainServiceInput] = useState('');

  const updateField = useCallback(<K extends keyof CompanyRegistration,>(
    field: K,
    value: CompanyRegistration[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value } as CompanyRegistration));
    // Clear field error when user types
    const key = String(field);
    if (key in fieldErrors) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        // Safe: key is validated as a known field name
        if (key in next) {
          const { [key]: _, ...rest } = next;
          return rest;
        }
        return next;
      });
    }
  }, [fieldErrors]);

  const addMainService = useCallback(() => {
    const service = mainServiceInput.trim();
    if (!service) return;

    setFormData((prev) => ({
      ...prev,
      main_services: Array.from(new Set([...(prev.main_services || []), service])),
    }));
    setMainServiceInput('');
  }, [mainServiceInput]);

  const removeMainService = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      main_services: (prev.main_services || []).filter((_, i) => i !== index),
    }));
  }, []);

  // Live validation for email domain matching
  const companyDomain = formData.company_email ? getEmailDomain(formData.company_email) : null;
  const registrantDomain = formData.registrant_email ? getEmailDomain(formData.registrant_email) : null;
  const domainMismatch = companyDomain && registrantDomain && companyDomain !== registrantDomain;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Validate form
    const validation = validateCompanyRegistration(formData);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setLoading(true);
    setStep('submitting');

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        setServerError(result.error || 'Registration failed. Please try again.');
        setStep('form');
        return;
      }

      setStep('success');
    } catch (err) {
      setServerError('Network error. Please check your connection and try again.');
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (step === 'success') {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-[#080a0c]">
        <div className="w-full max-w-lg">
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center ring-4 ring-emerald-500/10">
                <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h1 className="text-2xl font-semibold mb-2 text-white">Registration Submitted!</h1>
              <p className="text-[#8b949e] mb-6">
                Check your email at <strong className="text-white">{formData.registrant_email}</strong> for a secure link to activate your account.
              </p>

              <div className="p-4 rounded-lg bg-[#161b22] border border-[#21262d] text-left mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-white">Link expires in 24 hours</p>
                    <p className="text-xs text-[#8b949e] mt-1">
                      If you don't see the email, check your spam folder or contact support.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  href="/"
                  className="block w-full py-3 px-4 rounded-lg bg-[#21262d] text-white font-medium hover:bg-[#30363d] transition-colors text-center"
                >
                  Return to Home
                </Link>
                <p className="text-xs text-[#8b949e]">
                  Already received your link?{' '}
                  <Link href="/login" className="text-[#58a6ff] hover:underline">
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-12 px-4 bg-[#080a0c]">
      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#238636] to-[#2ea043] flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">C</span>
            </div>
          </Link>
          <h1 className="text-2xl font-semibold text-white mb-2">Register Your Company</h1>
          <p className="text-[#8b949e]">
            Create an account to manage workplace safety compliance
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#238636] text-white flex items-center justify-center text-sm font-medium">
              1
            </div>
            <span className="text-sm text-white font-medium">Company Information</span>
          </div>
          <div className="w-8 h-0.5 bg-[#21262d]" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#21262d] text-[#8b949e] flex items-center justify-center text-sm font-medium">
              2
            </div>
            <span className="text-sm text-[#8b949e]">Email Verification</span>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-8 shadow-2xl">
          {serverError && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-red-400 font-medium">Registration Error</p>
                <p className="text-sm text-red-400/80 mt-1">{serverError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Details Section */}
            <div>
              <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#8b949e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Company Details
              </h2>

              <div className="space-y-4">
                <FormField label="Company Name" required error={fieldErrors.company_name}>
                  <input
                    type="text"
                    className="input"
                    value={formData.company_name}
                    onChange={(e) => updateField('company_name', e.target.value)}
                    placeholder="e.g., Northern Construction Corp."
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label="WSIB Number"
                    required
                    error={fieldErrors.wsib_number}
                    tooltip="Your 9-digit Workplace Safety and Insurance Board account number. Find it on your WSIB correspondence or clearance certificate."
                  >
                    <input
                      type="text"
                      className="input font-mono"
                      value={formData.wsib_number}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                        updateField('wsib_number', value);
                      }}
                      placeholder="123456789"
                      maxLength={9}
                    />
                    {formData.wsib_number.length > 0 && formData.wsib_number.length < 9 && (
                      <p className="text-xs text-[#8b949e] mt-1">
                        {9 - formData.wsib_number.length} more digit{9 - formData.wsib_number.length !== 1 ? 's' : ''} needed
                      </p>
                    )}
                  </FormField>

                  <FormField
                    label="Company Email"
                    required
                    error={fieldErrors.company_email}
                    tooltip="Your company's general contact email. Must be a business domain (not Gmail, Yahoo, etc.)"
                  >
                    <input
                      type="email"
                      className="input"
                      value={formData.company_email}
                      onChange={(e) => updateField('company_email', e.target.value)}
                      placeholder="info@company.com"
                    />
                    {formData.company_email && isBlockedEmailDomain(formData.company_email) && (
                      <p className="text-xs text-amber-400 mt-1">
                        Free email providers not allowed for business registration
                      </p>
                    )}
                  </FormField>
                </div>

                <FormField label="Office Address" required error={fieldErrors.address}>
                  <input
                    type="text"
                    className="input"
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="e.g., 123 Industrial Boulevard, Suite 400"
                  />
                </FormField>

                <div className="grid grid-cols-3 gap-4">
                  <FormField label="City" required error={fieldErrors.city}>
                    <input
                      type="text"
                      className="input"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="e.g., Toronto"
                    />
                  </FormField>

                  <FormField label="Province" required error={fieldErrors.province}>
                    <select
                      className="input"
                      value={formData.province}
                      onChange={(e) => updateField('province', e.target.value)}
                    >
                      {CANADIAN_PROVINCES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Postal Code" required error={fieldErrors.postal_code}>
                    <input
                      type="text"
                      className="input uppercase"
                      value={formData.postal_code}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                        updateField('postal_code', value);
                      }}
                      placeholder="A1A 1A1"
                      maxLength={7}
                    />
                  </FormField>
                </div>

                <FormField label="Phone Number" required error={fieldErrors.phone}>
                  <input
                    type="tel"
                    className="input"
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      updateField('phone', formatPhoneNumber(value));
                    }}
                    placeholder="(416) 555-0123"
                  />
                </FormField>
              </div>
            </div>

            {/* Industry Information Section (Optional) */}
            <div className="border-t border-[#21262d] pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#8b949e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Industry Information <span className="text-sm text-[#8b949e] font-normal">(Optional - can complete later)</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setShowIndustryFields(!showIndustryFields)}
                  className="text-sm text-[#58a6ff] hover:underline"
                >
                  {showIndustryFields ? 'Hide' : 'Add Industry Info'}
                </button>
              </div>

              {showIndustryFields && (
                <div className="space-y-4">
                  <FormField label="Industry/Trade" error={fieldErrors.industry}>
                    <select
                      className="input"
                      value={formData.industry || ''}
                      onChange={(e) =>
                        updateField('industry', (e.target.value ? (e.target.value as Industry) : undefined))
                      }
                    >
                      <option value="">Select industry...</option>
                      {INDUSTRIES.map((ind) => (
                        <option key={ind.value} value={ind.value}>
                          {ind.label}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Number of Employees" error={fieldErrors.employee_count}>
                      <input
                        type="number"
                        className="input"
                        value={formData.employee_count || ''}
                        onChange={(e) => updateField('employee_count', e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="e.g., 32"
                        min="1"
                      />
                    </FormField>

                    <FormField label="Years in Business" error={fieldErrors.years_in_business}>
                      <input
                        type="number"
                        className="input"
                        value={formData.years_in_business || ''}
                        onChange={(e) => updateField('years_in_business', e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="e.g., 5"
                        min="0"
                      />
                    </FormField>
                  </div>

                  <FormField label="Main Services">
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
                          placeholder="e.g., Foundations, Flatwork"
                        />
                        <button
                          type="button"
                          onClick={addMainService}
                          className="px-4 py-2 rounded-lg bg-[#21262d] text-white text-sm font-medium hover:bg-[#30363d] transition-colors"
                        >
                          Add
                        </button>
                      </div>
                      {formData.main_services && formData.main_services.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.main_services.map((service, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#21262d] text-sm text-white"
                            >
                              {service}
                              <button
                                type="button"
                                onClick={() => removeMainService(index)}
                                className="text-[#8b949e] hover:text-white"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormField>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-[#21262d]" />

            {/* Registrant Section */}
            <div>
              <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#8b949e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Your Information
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Your Name" required error={fieldErrors.registrant_name}>
                    <input
                      type="text"
                      className="input"
                      value={formData.registrant_name}
                      onChange={(e) => updateField('registrant_name', e.target.value)}
                      placeholder="e.g., John Smith"
                    />
                  </FormField>

                  <FormField label="Your Position" required error={fieldErrors.registrant_position}>
                    <select
                      className="input"
                      value={formData.registrant_position}
                      onChange={(e) => updateField('registrant_position', e.target.value as RegistrantPosition)}
                    >
                      <option value="">Select position...</option>
                      {REGISTRANT_POSITIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <FormField
                  label="Your Email"
                  required
                  error={fieldErrors.registrant_email}
                  tooltip="Must match your company's email domain. A verification link will be sent to this address."
                >
                  <input
                    type="email"
                    className="input"
                    value={formData.registrant_email}
                    onChange={(e) => updateField('registrant_email', e.target.value)}
                    placeholder={companyDomain ? `you@${companyDomain}` : 'you@company.com'}
                  />
                  {domainMismatch && (
                    <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Email must be from @{companyDomain}
                    </p>
                  )}
                </FormField>

                {/* Why we need this */}
                <div className="p-4 rounded-lg bg-[#161b22] border border-[#21262d]">
                  <p className="text-xs text-[#8b949e]">
                    <strong className="text-[#c9d1d9]">Why we verify email domains:</strong>{' '}
                    To ensure only authorized representatives can register their company. Your email domain must match your company's domain for security purposes.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || step === 'submitting'}
                className="w-full py-3 px-4 rounded-lg bg-[#238636] text-white font-medium hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading || step === 'submitting' ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing Registration...
                  </>
                ) : (
                  <>
                    Submit Registration
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>

              <p className="mt-4 text-center text-sm text-[#8b949e]">
                Already registered?{' '}
                <Link href="/login" className="text-[#58a6ff] hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-[#8b949e]">
          By registering, you agree to our{' '}
          <Link href="/terms" className="text-[#58a6ff] hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-[#58a6ff] hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </main>
  );
}
