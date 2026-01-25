'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

interface InvitationData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  position: string | null;
  companyName: string;
}

type Step = 'loading' | 'invalid' | 'auth' | 'profile' | 'success';

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [step, setStep] = useState<Step>('loading');
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Profile form state
  const [phone, setPhone] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
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
          setError(data.error || 'Invalid or expired invitation');
          setStep('invalid');
          return;
        }

        setInvitation(data.invitation);

        // Check if user is already authenticated
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // User is signed in, check if email matches
          if (user.email?.toLowerCase() === data.invitation.email.toLowerCase()) {
            setStep('profile');
          } else {
            // Email mismatch - sign out and show auth step
            await supabase.auth.signOut();
            setStep('auth');
          }
        } else {
          setStep('auth');
        }
      } catch (err) {
        setError('Failed to validate invitation');
        setStep('invalid');
      }
    }

    validateToken();
  }, [token]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!invitation || !token) return;

    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Create account with magic link email
      const { data, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            first_name: invitation.firstName,
            last_name: invitation.lastName,
          },
        },
      });

      if (authError) {
        // If user exists, try to sign in instead
        if (authError.message.includes('already registered')) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: invitation.email,
            password,
          });

          if (signInError) {
            setError('Account exists. Please sign in with your existing password.');
            return;
          }
        } else {
          setError(authError.message);
          return;
        }
      }

      // Move to profile completion
      setStep('profile');
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          phone: phone || null,
          emergencyContactName: emergencyName || null,
          emergencyContactPhone: emergencyPhone || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation');
        return;
      }

      setStep('success');

      // Redirect to dashboard after a moment
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (step === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
          <p className="text-[var(--muted)]">Validating invitation...</p>
        </div>
      </main>
    );
  }

  // Invalid invitation
  if (step === 'invalid') {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
        <div className="card max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-red-400">Invalid Invitation</h1>
          <p className="text-[var(--muted)] mb-6">
            {error || 'This invitation link is invalid or has expired.'}
          </p>
          <p className="text-sm text-[var(--muted)] mb-6">
            Invitation links expire after 7 days. Please contact your administrator for a new invitation.
          </p>
          <Link href="/" className="btn btn-primary">
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
        <div className="card max-w-md w-full text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-emerald-400/10 to-emerald-500/5 animate-pulse" />
          
          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold mb-2 text-emerald-400">Welcome Aboard!</h1>
            <p className="text-[var(--muted)] mb-4">
              You've successfully joined <strong className="text-[var(--foreground)]">{invitation?.companyName}</strong>
            </p>
            <p className="text-sm text-[var(--muted)]">
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
      <div className="card max-w-md w-full">
        {/* Company Welcome Banner */}
        <div className="text-center mb-6 pb-6 border-b border-[var(--border)]">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--primary)] to-blue-600 flex items-center justify-center shadow-lg shadow-[var(--primary)]/25">
            <span className="text-2xl font-bold text-white">
              {invitation?.companyName.charAt(0).toUpperCase()}
            </span>
          </div>
          <h1 className="text-xl font-bold mb-1">{invitation?.companyName}</h1>
          <p className="text-[var(--muted)] text-sm">
            has invited you to join as{' '}
            <span className="text-[var(--primary)] font-medium capitalize">
              {invitation?.role.replace('_', ' ')}
            </span>
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
            step === 'auth' 
              ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30' 
              : 'bg-emerald-500 text-white'
          }`}>
            {step === 'auth' ? '1' : '✓'}
          </div>
          <div className={`w-12 h-1 rounded transition-all ${
            step === 'profile' ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
          }`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
            step === 'profile' 
              ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30' 
              : 'bg-[var(--border)] text-[var(--muted)]'
          }`}>
            2
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Auth Step */}
        {step === 'auth' && (
          <>
            <h2 className="text-lg font-semibold mb-1 text-center">Create Your Account</h2>
            <p className="text-[var(--muted)] text-sm text-center mb-6">
              Set a password to secure your account
            </p>

            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input bg-[var(--background)]/50"
                  value={invitation?.email || ''}
                  disabled
                />
                <p className="text-xs text-[var(--muted)] mt-1">
                  This is the email your invitation was sent to
                </p>
              </div>

              <div>
                <label className="label" htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  minLength={8}
                  required
                />
                <p className="text-xs text-[var(--muted)] mt-1">
                  Minimum 8 characters
                </p>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating Account...
                  </span>
                ) : (
                  'Continue'
                )}
              </button>
            </form>
          </>
        )}

        {/* Profile Step */}
        {step === 'profile' && (
          <>
            <h2 className="text-lg font-semibold mb-1 text-center">Complete Your Profile</h2>
            <p className="text-[var(--muted)] text-sm text-center mb-6">
              Add your contact information
            </p>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {/* Pre-filled info */}
              <div className="p-4 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[var(--muted)]">Name</p>
                    <p className="font-medium">{invitation?.firstName} {invitation?.lastName}</p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Position</p>
                    <p className="font-medium">{invitation?.position || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="phone">
                  Phone Number <span className="text-[var(--muted)]">(optional)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="pt-2 border-t border-[var(--border)]">
                <p className="text-sm font-medium mb-3 text-[var(--muted)]">Emergency Contact</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="label" htmlFor="emergencyName">
                      Contact Name <span className="text-[var(--muted)]">(optional)</span>
                    </label>
                    <input
                      id="emergencyName"
                      type="text"
                      className="input"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="emergencyPhone">
                      Contact Phone <span className="text-[var(--muted)]">(optional)</span>
                    </label>
                    <input
                      id="emergencyPhone"
                      type="tel"
                      className="input"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="(555) 987-6543"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Completing Setup...
                  </span>
                ) : (
                  'Complete Setup'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
          <p className="text-[var(--muted)]">Loading...</p>
        </div>
      </main>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}
