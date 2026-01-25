'use client';

import { useState } from 'react';
import type { UserRole } from '@/lib/db/types';

interface AddTeamMemberFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddTeamMemberForm({ onSuccess, onCancel }: AddTeamMemberFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    role: 'admin' as UserRole,
    responsibilities: '',
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (!formData.position.trim()) {
      errors.position = 'Position is required';
    }

    if (formData.phone && !/^[\d\s\-\(\)]+$/.test(formData.phone)) {
      errors.phone = 'Invalid phone format';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || undefined,
          position: formData.position.trim(),
          role: formData.role,
          responsibilities: formData.responsibilities.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          position: '',
          role: 'admin',
          responsibilities: '',
        });
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
    {
      value: 'admin',
      label: 'Admin',
      description: 'Full access to company settings, team management, and all features',
    },
    {
      value: 'supervisor',
      label: 'Supervisor',
      description: 'Can manage workers, conduct inspections, and view reports',
    },
    {
      value: 'internal_auditor',
      label: 'Internal Auditor',
      description: 'Can conduct audits and review compliance',
    },
    {
      value: 'worker',
      label: 'Worker',
      description: 'Can submit forms and view assigned tasks',
    },
  ];

  return (
    <div>
      <h3 className="font-semibold mb-4">Add Team Member</h3>
      
      {success && (
        <div className="mb-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          Invitation sent successfully! The team member will receive an email with instructions to join.
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              First Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className={`input ${validationErrors.firstName ? 'border-red-500' : ''}`}
              placeholder="Robert"
              disabled={loading}
            />
            {validationErrors.firstName && (
              <p className="text-xs text-red-400 mt-1">{validationErrors.firstName}</p>
            )}
          </div>

          <div>
            <label className="label">
              Last Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className={`input ${validationErrors.lastName ? 'border-red-500' : ''}`}
              placeholder="Chen"
              disabled={loading}
            />
            {validationErrors.lastName && (
              <p className="text-xs text-red-400 mt-1">{validationErrors.lastName}</p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`input ${validationErrors.email ? 'border-red-500' : ''}`}
              placeholder="bchen@mapleridgeconcrete.ca"
              disabled={loading}
            />
            {validationErrors.email && (
              <p className="text-xs text-red-400 mt-1">{validationErrors.email}</p>
            )}
          </div>

          <div>
            <label className="label">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={`input ${validationErrors.phone ? 'border-red-500' : ''}`}
              placeholder="(613) 555-7801"
              disabled={loading}
            />
            {validationErrors.phone && (
              <p className="text-xs text-red-400 mt-1">{validationErrors.phone}</p>
            )}
          </div>
        </div>

        <div>
          <label className="label">
            Position <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            className={`input ${validationErrors.position ? 'border-red-500' : ''}`}
            placeholder="Health & Safety Coordinator"
            disabled={loading}
          />
          {validationErrors.position && (
            <p className="text-xs text-red-400 mt-1">{validationErrors.position}</p>
          )}
        </div>

        <div>
          <label className="label">
            Role <span className="text-red-400">*</span>
          </label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
            className="input"
            disabled={loading}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--muted)] mt-1">
            {ROLE_OPTIONS.find(o => o.value === formData.role)?.description}
          </p>
        </div>

        <div>
          <label className="label">Responsibilities</label>
          <textarea
            value={formData.responsibilities}
            onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
            className="input min-h-[80px]"
            placeholder="Overall safety program, COR certification lead, training coordination"
            disabled={loading}
          />
          <p className="text-xs text-[var(--muted)] mt-1">
            Optional: Describe their key responsibilities
          </p>
        </div>

        <div className="flex gap-4 pt-4 border-t border-slate-700">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex-1"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending Invitation...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Invitation
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn border border-slate-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
