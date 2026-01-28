'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import {
  validateCompanyRegistration,
  isBlockedEmailDomain,
  getEmailDomain,
  formatPhoneNumber,
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
        className="text-[#8b949e] hover:text-white transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => {
          e.preventDefault();
          setShow(!show);
        }}
        aria-label="Show info"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-lg bg-[#161b22] border border-[#30363d] shadow-xl text-xs text-[#8b949e]">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#161b22] border-r border-b border-[#30363d] transform rotate-45 -mt-1" />
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
      <label className="block text-sm font-semibold text-[#8b949e] mb-1.5 flex items-center">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
        {tooltip && <Tooltip content={tooltip}><span /></Tooltip>}
      </label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1 font-medium">{error}</p>}
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
    password: '',
    confirm_password: '',
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
    const key = String(field);
    if (key in fieldErrors) {
      setFieldErrors((prev) => {
        const next = { ...prev };
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

  const companyDomain = formData.company_email ? getEmailDomain(formData.company_email) : null;
  const registrantDomain = formData.registrant_email ? getEmailDomain(formData.registrant_email) : null;
  const domainMismatch = companyDomain && registrantDomain && companyDomain !== registrantDomain;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

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
        if (response.status === 429) {
          setServerError('Too many registration attempts. Please wait an hour or contact support.');
        } else {
          setServerError(result.error || 'Registration failed. Please try again.');
        }

        if (result.fields) {
          setFieldErrors(result.fields);
        }

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
      <div className="min-h-screen bg-[#080a0c] flex flex-col font-sans">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-[#0d1117] border border-[#21262d] rounded-xl p-8 shadow-xl text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-900/40 flex items-center justify-center ring-4 ring-emerald-900/20">
              <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-white mb-4">Account Created!</h1>
            <p className="text-[#8b949e] mb-8 text-lg">
              Your company <strong className="text-white font-semibold">{formData.company_name}</strong> has been registered and your account is ready to use.
            </p>

            <div className="p-4 rounded-lg bg-[#161b22] border border-[#21262d] text-left mb-8">
              <div className="flex items-start gap-4">
                <svg className="w-6 h-6 text-emerald-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-white">Ready to sign in</p>
                  <p className="text-sm text-[#8b949e] mt-1">
                    Use your email <strong className="text-white">{formData.registrant_email}</strong> and the password you just created.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Link
                href="/login"
                className="block w-full py-3.5 px-4 rounded-lg bg-[#238636] text-white font-semibold hover:bg-[#2ea043] transition-colors shadow-sm"
              >
                Sign In Now
              </Link>
              <Link
                href="/"
                className="block w-full py-3 px-4 text-[#8b949e] font-medium hover:text-white transition-colors"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080a0c] flex flex-col font-sans">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="w-full max-w-3xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              Register Your Company
            </h1>
            <p className="text-lg text-[#8b949e] max-w-xl mx-auto">
              Join the COR Pathways platform to streamline your safety certification and compliance management.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#238636] text-white flex items-center justify-center text-sm font-bold shadow-sm">
                1
              </div>
              <span className="text-sm font-semibold text-white">Company Info</span>
            </div>
            <div className="w-12 h-0.5 bg-[#21262d]" />
            <div className="flex items-center gap-2 opacity-50">
              <div className="w-8 h-8 rounded-full bg-[#21262d] text-[#8b949e] flex items-center justify-center text-sm font-bold">
                2
              </div>
              <span className="text-sm font-medium text-[#8b949e]">Verification</span>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-6 md:p-8 shadow-sm">
            {serverError && (
              <div className="mb-8 p-4 rounded-lg bg-red-900/20 border border-red-900/30 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-red-400 font-semibold">Registration Error</p>
                  <p className="text-sm text-red-400/80 mt-1">{serverError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Company Details */}
              <section>
                <div className="flex items-center gap-2 mb-6 border-b border-[#21262d] pb-2">
                  <h2 className="text-xl font-bold text-white">
                    Company Details
                  </h2>
                </div>

                <div className="space-y-5">
                  <FormField label="Company Name" required error={fieldErrors.company_name}>
                    <input
                      type="text"
                      className="input w-full p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white focus:ring-2 focus:ring-[#58a6ff] focus:border-[#58a6ff]"
                      value={formData.company_name}
                      onChange={(e) => updateField('company_name', e.target.value)}
                      placeholder="e.g., Northern Construction Corp."
                    />
                  </FormField>

                  <div className="grid md:grid-cols-2 gap-5">
                    <FormField
                      label="WSIB Number"
                      required
                      error={fieldErrors.wsib_number}
                      tooltip="Your 9-digit WSIB account number."
                    >
                      <input
                        type="text"
                        className="input w-full p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white font-mono tracking-wide"
                        value={formData.wsib_number}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                          updateField('wsib_number', val);
                        }}
                        placeholder="123456789"
                        maxLength={9}
                      />
                    </FormField>

                    <FormField
                      label="Company Email"
                      required
                      error={fieldErrors.company_email}
                      tooltip="Must be a business email address."
                    >
                      <input
                        type="email"
                        className="input w-full p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white"
                        value={formData.company_email}
                        onChange={(e) => updateField('company_email', e.target.value)}
                        placeholder="info@company.com"
                      />
                      {formData.company_email && isBlockedEmailDomain(formData.company_email) && (
                        <p className="text-xs text-amber-500 mt-1.5 font-medium">
                          ⚠ Please use a corporate email domain.
                        </p>
                      )}
                    </FormField>
                  </div>

                  <FormField label="Office Address" required error={fieldErrors.address}>
                    <input
                      type="text"
                      className="input w-full p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white"
                      value={formData.address}
                      onChange={(e) => updateField('address', e.target.value)}
                      placeholder="e.g., 123 Industrial Boulevard"
                    />
                  </FormField>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                    <FormField label="City" required error={fieldErrors.city}>
                      <input
                        type="text"
                        className="input w-full p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white"
                        value={formData.city}
                        onChange={(e) => updateField('city', e.target.value)}
                        placeholder="City"
                      />
                    </FormField>

                    <FormField label="Province" required error={fieldErrors.province}>
                      <select
                        className="input w-full p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white"
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
                        className="input w-full p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white uppercase"
                        value={formData.postal_code}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                          updateField('postal_code', val);
                        }}
                        placeholder="A1A 1A1"
                        maxLength={7}
                      />
                    </FormField>
                  </div>

                  <FormField label="Phone Number" required error={fieldErrors.phone}>
                    <input
                      type="tel"
                      className="input w-full p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white"
                      value={formData.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        updateField('phone', formatPhoneNumber(val));
                      }}
                      placeholder="(555) 555-5555"
                    />
                  </FormField>
                </div>
              </section>

              {/* Optional Industry Info */}
              <section className="pt-4 border-t border-[#21262d]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">
                    Industry Info
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowIndustryFields(!showIndustryFields)}
                    className="text-sm font-medium text-[#58a6ff] hover:underline"
                  >
                    {showIndustryFields ? 'Collapse' : 'Add Optional Details'}
                  </button>
                </div>

                {showIndustryFields && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <FormField label="Primary Industry" error={fieldErrors.industry}>
                      <select
                        className="input w-full p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white"
                        value={formData.industry || ''}
                        onChange={(e) => updateField('industry', (e.target.value ? (e.target.value as Industry) : undefined))}
                      >
                        <option value="">Select an industry...</option>
                        {INDUSTRIES.map((ind) => (
                          <option key={ind.value} value={ind.value}>
                            {ind.label}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <div className="grid grid-cols-2 gap-5">
                      <FormField label="Employees" error={fieldErrors.employee_count}>
                        <input
                          type="number"
                          className="input w-full p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white"
                          value={formData.employee_count || ''}
                          onChange={(e) => updateField('employee_count', e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="e.g. 25"
                          min="1"
                        />
                      </FormField>

                      <FormField label="Years in Business" error={fieldErrors.years_in_business}>
                        <input
                          type="number"
                          className="input w-full p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white"
                          value={formData.years_in_business || ''}
                          onChange={(e) => updateField('years_in_business', e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="e.g. 10"
                          min="0"
                        />
                      </FormField>
                    </div>

                    <FormField label="Main Services">
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="input w-full p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white"
                            value={mainServiceInput}
                            onChange={(e) => setMainServiceInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addMainService();
                              }
                            }}
                            placeholder="e.g., Excavation, Roofing"
                          />
                          <button
                            type="button"
                            onClick={addMainService}
                            className="px-5 py-2.5 rounded-md bg-[#21262d] text-white font-medium hover:bg-[#30363d] transition-colors"
                          >
                            Add
                          </button>
                        </div>
                        {formData.main_services && formData.main_services.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {formData.main_services.map((service, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1f242c] text-white text-sm font-medium border border-[#30363d]"
                              >
                                {service}
                                <button
                                  type="button"
                                  onClick={() => removeMainService(index)}
                                  className="text-[#8b949e] hover:text-white"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormField>
                  </div>
                )}
              </section>

              {/* Registrant Details */}
              <section className="pt-4 border-t border-[#21262d]">
                <h2 className="text-xl font-bold text-white mb-6">
                  Your Information
                </h2>

                <div className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    <FormField label="Full Name" required error={fieldErrors.registrant_name}>
                      <input
                        type="text"
                        className="input w-full p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white"
                        value={formData.registrant_name}
                        onChange={(e) => updateField('registrant_name', e.target.value)}
                        placeholder="John Doe"
                      />
                    </FormField>

                    <FormField label="Position" required error={fieldErrors.registrant_position}>
                      <select
                        className="input w-full p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white"
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
                    label="Work Email"
                    required
                    error={fieldErrors.registrant_email}
                    tooltip="This will be your login email."
                  >
                    <input
                      type="email"
                      className="input w-full p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white"
                      value={formData.registrant_email}
                      onChange={(e) => updateField('registrant_email', e.target.value)}
                      placeholder={companyDomain ? `name@${companyDomain}` : 'name@company.com'}
                    />
                    {domainMismatch && (
                      <p className="text-xs text-amber-500 mt-1.5 flex items-center gap-1.5 font-medium">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Email domain should match company format (@{companyDomain || '...'}).
                      </p>
                    )}
                  </FormField>
                </div>
              </section>

              {/* Account Credentials */}
              <section className="pt-4 border-t border-[#21262d]">
                <h2 className="text-xl font-bold text-white mb-6">
                  Account Credentials
                </h2>

                <div className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    <FormField label="Password" required error={fieldErrors.password}>
                      <input
                        type="password"
                        className="input w-full p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white"
                        value={formData.password}
                        onChange={(e) => updateField('password', e.target.value)}
                        placeholder="••••••••••••"
                        minLength={12}
                      />
                    </FormField>

                    <FormField label="Confirm Password" required error={fieldErrors.confirm_password}>
                      <input
                        type="password"
                        className="input w-full p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white"
                        value={formData.confirm_password}
                        onChange={(e) => updateField('confirm_password', e.target.value)}
                        placeholder="••••••••••••"
                        minLength={12}
                      />
                    </FormField>
                  </div>

                  {/* Password requirements checklist */}
                  <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d]">
                    <p className="text-xs text-[#8b949e] mb-3 font-semibold">Password must contain:</p>
                    <ul className="text-xs space-y-2">
                      <li className={`flex items-center gap-2 ${formData.password.length >= 12 ? 'text-emerald-400' : 'text-[#8b949e]'}`}>
                        {formData.password.length >= 12 ? (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="3" />
                          </svg>
                        )}
                        At least 12 characters
                      </li>
                      <li className={`flex items-center gap-2 ${/[A-Z]/.test(formData.password) ? 'text-emerald-400' : 'text-[#8b949e]'}`}>
                        {/[A-Z]/.test(formData.password) ? (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="3" />
                          </svg>
                        )}
                        One uppercase letter
                      </li>
                      <li className={`flex items-center gap-2 ${/[a-z]/.test(formData.password) ? 'text-emerald-400' : 'text-[#8b949e]'}`}>
                        {/[a-z]/.test(formData.password) ? (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="3" />
                          </svg>
                        )}
                        One lowercase letter
                      </li>
                      <li className={`flex items-center gap-2 ${/[0-9]/.test(formData.password) ? 'text-emerald-400' : 'text-[#8b949e]'}`}>
                        {/[0-9]/.test(formData.password) ? (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="3" />
                          </svg>
                        )}
                        One number
                      </li>
                      <li className={`flex items-center gap-2 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'text-emerald-400' : 'text-[#8b949e]'}`}>
                        {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="3" />
                          </svg>
                        )}
                        One special character (!@#$%^&* etc.)
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading || step === 'submitting'}
                  className="w-full py-4 px-6 rounded-lg bg-[#238636] text-white text-lg font-bold hover:bg-[#2ea043] focus:ring-4 focus:ring-green-500/30 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                >
                  {loading || step === 'submitting' ? (
                    <>
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Company Account
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>

                <p className="mt-6 text-center text-sm text-[#8b949e]">
                  By registering, you agree to our{' '}
                  <Link href="/terms" className="text-[#58a6ff] hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-[#58a6ff] hover:underline">Privacy Policy</Link>.
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
