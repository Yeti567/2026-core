'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// =============================================================================
// TYPES
// =============================================================================

interface InvitationData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  position: string | null;
  companyName: string;
  companyLogo?: string;
  expiresAt: string;
}

interface ValidationState {
  status: 'loading' | 'valid' | 'expired' | 'already_accepted' | 'invalid' | 'company_suspended';
  message?: string;
  adminEmail?: string;
}

type Step = 'loading' | 'invalid' | 'form' | 'processing' | 'success';

// =============================================================================
// PHONE FORMATTING
// =============================================================================

function formatPhoneNumber(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length === 0) return '';
  if (numbers.length <= 3) return `(${numbers}`;
  if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
  return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
}

function isValidPhone(phone: string): boolean {
  const numbers = phone.replace(/\D/g, '');
  return numbers.length === 10;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function AcceptInvitationContent() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  // State
  const [step, setStep] = useState<Step>('loading');
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [validation, setValidation] = useState<ValidationState>({ status: 'loading' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [phone, setPhone] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Form validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // =============================================================================
  // TOKEN VALIDATION
  // =============================================================================

  useEffect(() => {
    if (!token) {
      setValidation({ status: 'invalid', message: 'No invitation token provided' });
      setStep('invalid');
      return;
    }

    async function validateToken() {
      try {
        const response = await fetch('/api/invitations/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok || !data.valid) {
          // Determine specific error type
          if (data.error?.includes('expired')) {
            setValidation({
              status: 'expired',
              message: 'This invitation has expired.',
              adminEmail: data.adminEmail,
            });
          } else if (data.error?.includes('already accepted') || data.error?.includes('already used')) {
            setValidation({
              status: 'already_accepted',
              message: 'This invitation has already been accepted.',
            });
          } else if (data.error?.includes('suspended') || data.error?.includes('deactivated')) {
            setValidation({
              status: 'company_suspended',
              message: 'The company account has been suspended.',
            });
          } else {
            setValidation({
              status: 'invalid',
              message: data.error || 'Invalid invitation link',
            });
          }
          setStep('invalid');
          return;
        }

        // Map invitation data
        setInvitation({
          id: data.invitation.id,
          email: data.invitation.email,
          firstName: data.invitation.first_name || data.invitation.firstName,
          lastName: data.invitation.last_name || data.invitation.lastName,
          role: data.invitation.role,
          position: data.invitation.position,
          companyName: data.invitation.company_name || data.invitation.companyName,
          companyLogo: data.invitation.companyLogo,
          expiresAt: data.invitation.expires_at || data.invitation.expiresAt,
        });

        setValidation({ status: 'valid' });
        setStep('form');
      } catch (err) {
        console.error('Token validation error:', err);
        setValidation({
          status: 'invalid',
          message: 'Failed to validate invitation. Please try again.',
        });
        setStep('invalid');
      }
    }

    validateToken();
  }, [token]);

  // =============================================================================
  // FORM VALIDATION
  // =============================================================================

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!isValidPhone(phone)) {
      errors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (!emergencyName.trim()) {
      errors.emergencyName = 'Emergency contact name is required';
    }

    if (!emergencyPhone.trim()) {
      errors.emergencyPhone = 'Emergency contact phone is required';
    } else if (!isValidPhone(emergencyPhone)) {
      errors.emergencyPhone = 'Please enter a valid 10-digit phone number';
    }

    if (!termsAccepted) {
      errors.terms = 'You must accept the terms to continue';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // =============================================================================
  // PHOTO UPLOAD
  // =============================================================================

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    // Compress and resize to 200x200
    try {
      const compressed = await compressImage(file, 200, 200);
      setProfilePhoto(compressed);
      setError(null);
    } catch (err) {
      setError('Failed to process image');
    }
  }

  async function compressImage(file: File, maxWidth: number, maxHeight: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          // Center crop to square
          const size = Math.min(width, height);
          canvas.width = maxWidth;
          canvas.height = maxHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Draw centered crop
          const sx = (img.width - img.width * (size / Math.max(width, height))) / 2;
          const sy = (img.height - img.height * (size / Math.max(width, height))) / 2;
          const sWidth = img.width * (size / Math.max(width, height));
          const sHeight = img.height * (size / Math.max(width, height));

          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, maxWidth, maxHeight);

          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  // =============================================================================
  // FORM SUBMISSION
  // =============================================================================

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;
    if (!token || !invitation) return;

    setLoading(true);
    setError(null);
    setStep('processing');

    try {
      const response = await fetch('/api/invitations/accept-with-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          phone: phone.replace(/\D/g, ''), // Send digits only
          emergencyContactName: emergencyName.trim(),
          emergencyContactPhone: emergencyPhone.replace(/\D/g, ''),
          termsAccepted,
          profilePhoto,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation');
        setStep('form');
        return;
      }

      setStep('success');

      // Redirect to login with success message after showing success
      setTimeout(() => {
        router.push('/login?message=invitation_accepted&email=' + encodeURIComponent(invitation.email));
      }, 3000);
    } catch (err) {
      console.error('Submission error:', err);
      setError('An unexpected error occurred. Please try again.');
      setStep('form');
    } finally {
      setLoading(false);
    }
  }

  // =============================================================================
  // RENDER: LOADING STATE
  // =============================================================================

  if (step === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
          <p className="text-[var(--muted)]">Validating your invitation...</p>
        </div>
      </main>
    );
  }

  // =============================================================================
  // RENDER: INVALID STATES
  // =============================================================================

  if (step === 'invalid') {
    const icons: Record<ValidationState['status'], JSX.Element> = {
      loading: <></>,
      valid: <></>,
      expired: (
        <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      already_accepted: (
        <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      invalid: (
        <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      company_suspended: (
        <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    };

    const colors: Record<ValidationState['status'], string> = {
      loading: '',
      valid: '',
      expired: 'amber',
      already_accepted: 'blue',
      invalid: 'red',
      company_suspended: 'orange',
    };

    const color = colors[validation.status] || 'red';

    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
        <div className="card max-w-md w-full text-center">
          <div className={`w-20 h-20 mx-auto mb-6 rounded-full bg-${color}-500/10 flex items-center justify-center`}>
            {icons[validation.status]}
          </div>

          <h1 className={`text-2xl font-bold mb-3 text-${color}-400`}>
            {validation.status === 'expired' && 'Invitation Expired'}
            {validation.status === 'already_accepted' && 'Already Accepted'}
            {validation.status === 'company_suspended' && 'Company Suspended'}
            {validation.status === 'invalid' && 'Invalid Invitation'}
          </h1>

          <p className="text-[var(--muted)] mb-6">
            {validation.message}
          </p>

          {validation.status === 'expired' && (
            <p className="text-sm text-[var(--muted)] mb-6">
              Contact {validation.adminEmail ? (
                <a href={`mailto:${validation.adminEmail}`} className="text-[var(--primary)]">
                  {validation.adminEmail}
                </a>
              ) : 'your safety manager'} for a new invitation.
            </p>
          )}

          {validation.status === 'already_accepted' && (
            <Link href="/login" className="btn btn-primary">
              Go to Login
            </Link>
          )}

          {validation.status === 'company_suspended' && (
            <p className="text-sm text-[var(--muted)]">
              Please contact <a href="mailto:support@corpathways.com" className="text-[var(--primary)]">support@corpathways.com</a>
            </p>
          )}

          {validation.status === 'invalid' && (
            <Link href="/" className="btn btn-primary">
              Go Home
            </Link>
          )}
        </div>
      </main>
    );
  }

  // =============================================================================
  // RENDER: PROCESSING STATE
  // =============================================================================

  if (step === 'processing') {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
        <div className="card max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
          <h2 className="text-xl font-semibold mb-2">Setting Up Your Account</h2>
          <p className="text-[var(--muted)]">Please wait while we create your profile...</p>
          
          <div className="mt-6 space-y-2 text-sm text-left max-w-xs mx-auto">
            <div className="flex items-center gap-2 text-[var(--muted)]">
              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              Creating your account
            </div>
            <div className="flex items-center gap-2 text-[var(--muted)]">
              <div className="w-4 h-4 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
              Setting up your profile
            </div>
            <div className="flex items-center gap-2 text-[var(--muted)] opacity-50">
              <div className="w-4 h-4 rounded-full bg-[var(--border)]" />
              Sending welcome email
            </div>
          </div>
        </div>
      </main>
    );
  }

  // =============================================================================
  // RENDER: SUCCESS STATE
  // =============================================================================

  if (step === 'success') {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
        <div className="card max-w-md w-full text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-emerald-400/10 to-emerald-500/5 animate-pulse" />

          <div className="relative z-10">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold mb-2 text-emerald-400">Welcome Aboard!</h1>
            <p className="text-[var(--foreground)] mb-4">
              {invitation?.firstName}, you've successfully joined
            </p>
            <p className="text-xl font-semibold text-[var(--primary)] mb-6">
              {invitation?.companyName}
            </p>

            <div className="bg-[var(--background)] rounded-lg p-4 mb-6 text-sm">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-[var(--foreground)] font-medium mb-2">
                Check your email!
              </p>
              <p className="text-[var(--muted)]">
                We've sent a link to <strong className="text-[var(--foreground)]">{invitation?.email}</strong> to set your password.
              </p>
              <p className="text-[var(--muted)] mt-2 text-xs">
                The link expires in 1 hour.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-[var(--muted)]">
                Redirecting to login page...
              </p>
              <Link href="/login" className="btn btn-primary w-full">
                Go to Login Now
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // =============================================================================
  // RENDER: PROFILE COMPLETION FORM
  // =============================================================================

  return (
    <main className="min-h-screen flex items-center justify-center p-4 py-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
      <div className="card max-w-lg w-full">
        {/* Company Header */}
        <div className="text-center mb-6 pb-6 border-b border-[var(--border)]">
          {invitation?.companyLogo ? (
            <img
              src={invitation.companyLogo}
              alt={invitation.companyName}
              className="w-16 h-16 mx-auto mb-4 rounded-lg object-cover"
            />
          ) : (
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--primary)] to-blue-600 flex items-center justify-center shadow-lg shadow-[var(--primary)]/25">
              <span className="text-2xl font-bold text-white">
                {invitation?.companyName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h1 className="text-xl font-bold mb-1">{invitation?.companyName}</h1>
          <p className="text-[var(--muted)] text-sm">
            has invited you to join as{' '}
            <span className="text-[var(--primary)] font-medium capitalize">
              {invitation?.role.replace('_', ' ')}
            </span>
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pre-filled Info (readonly) */}
          <div className="p-4 rounded-lg bg-[var(--background)] border border-[var(--border)]">
            <h3 className="text-sm font-medium text-[var(--muted)] mb-3">Your Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[var(--muted)] text-xs">First Name</p>
                <p className="font-medium">{invitation?.firstName}</p>
              </div>
              <div>
                <p className="text-[var(--muted)] text-xs">Last Name</p>
                <p className="font-medium">{invitation?.lastName}</p>
              </div>
              <div>
                <p className="text-[var(--muted)] text-xs">Email</p>
                <p className="font-medium text-[var(--primary)]">{invitation?.email}</p>
              </div>
              <div>
                <p className="text-[var(--muted)] text-xs">Position</p>
                <p className="font-medium">{invitation?.position || 'Not specified'}</p>
              </div>
            </div>
          </div>

          {/* Profile Photo (optional) */}
          <div>
            <label className="label">
              Profile Photo <span className="text-[var(--muted)] text-xs">(optional)</span>
            </label>
            <div className="flex items-center gap-4">
              <div className="relative">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Profile preview"
                    className="w-16 h-16 rounded-full object-cover border-2 border-[var(--border)]"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[var(--background)] border-2 border-dashed border-[var(--border)] flex items-center justify-center">
                    <svg className="w-6 h-6 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                {profilePhoto && (
                  <button
                    type="button"
                    onClick={() => setProfilePhoto(null)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <label className="btn bg-[var(--border)] hover:bg-[var(--muted)]/20 text-[var(--foreground)] cursor-pointer text-sm">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                {profilePhoto ? 'Change Photo' : 'Upload Photo'}
              </label>
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="label" htmlFor="phone">
              Phone Number <span className="text-red-400">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              className={`input ${formErrors.phone ? 'border-red-500' : ''}`}
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              placeholder="(613) 555-1234"
              maxLength={14}
            />
            {formErrors.phone && (
              <p className="text-red-400 text-xs mt-1">{formErrors.phone}</p>
            )}
          </div>

          {/* Emergency Contact Section */}
          <div className="pt-4 border-t border-[var(--border)]">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Emergency Contact
            </h3>

            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="emergencyName">
                  Contact Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="emergencyName"
                  type="text"
                  className={`input ${formErrors.emergencyName ? 'border-red-500' : ''}`}
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="John Doe"
                />
                {formErrors.emergencyName && (
                  <p className="text-red-400 text-xs mt-1">{formErrors.emergencyName}</p>
                )}
              </div>

              <div>
                <label className="label" htmlFor="emergencyPhone">
                  Contact Phone <span className="text-red-400">*</span>
                </label>
                <input
                  id="emergencyPhone"
                  type="tel"
                  className={`input ${formErrors.emergencyPhone ? 'border-red-500' : ''}`}
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(formatPhoneNumber(e.target.value))}
                  placeholder="(613) 555-5678"
                  maxLength={14}
                />
                {formErrors.emergencyPhone && (
                  <p className="text-red-400 text-xs mt-1">{formErrors.emergencyPhone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Terms Acceptance */}
          <div className="pt-4 border-t border-[var(--border)]">
            <label className={`flex items-start gap-3 cursor-pointer ${formErrors.terms ? 'text-red-400' : ''}`}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-[var(--border)] bg-[var(--background)] text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <span className="text-sm">
                I agree to follow <strong>{invitation?.companyName}'s</strong> health & safety policies and understand my responsibilities as outlined in the company's safety program.
              </span>
            </label>
            {formErrors.terms && (
              <p className="text-red-400 text-xs mt-2 ml-7">{formErrors.terms}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </span>
            ) : (
              'Complete Setup & Accept Invitation'
            )}
          </button>

          {/* Back to Login */}
          <p className="text-center text-sm text-[var(--muted)]">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--primary)] hover:underline">
              Sign in instead
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

// =============================================================================
// EXPORT WITH SUSPENSE
// =============================================================================

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
            <p className="text-[var(--muted)]">Loading...</p>
          </div>
        </main>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
