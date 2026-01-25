'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type'); // 'recovery' for password reset, 'invite' for new user setup

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Verify the session from the magic link
  useEffect(() => {
    async function verifySession() {
      try {
        // The magic link will have set up a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          setError('Invalid or expired link. Please request a new password reset.');
          setVerifying(false);
          return;
        }

        // Check if this is a new user (from invitation)
        if (type === 'invite') {
          setIsNewUser(true);
        }

        setVerifying(false);
      } catch (err) {
        setError('Failed to verify your session. Please try again.');
        setVerifying(false);
      }
    }

    verifySession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]); // supabase.auth is stable and doesn't need to be in deps

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match (using length check first to avoid timing attack)
    if (password.length !== confirmPassword.length || password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);

      // Redirect to login after a moment
      setTimeout(() => {
        router.push('/login?message=password_updated');
      }, 2000);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Loading/Verifying state
  if (verifying) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
        <div className="card max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
          <p className="text-[var(--muted)]">Verifying your link...</p>
        </div>
      </main>
    );
  }

  // Error state (invalid/expired link)
  if (error && !password && !confirmPassword) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
        <div className="card max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold mb-2 text-red-400">Link Invalid or Expired</h1>
          <p className="text-[var(--muted)] mb-6">{error}</p>
          
          <Link href="/forgot-password" className="btn btn-primary">
            Request New Link
          </Link>
          
          <div className="mt-4">
            <Link href="/login" className="text-[var(--primary)] text-sm hover:underline">
              ← Back to login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Success state
  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
        <div className="card max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold mb-2 text-emerald-400">
            {isNewUser ? 'Password Created!' : 'Password Updated!'}
          </h1>
          <p className="text-[var(--muted)] mb-4">
            {isNewUser 
              ? 'Your account is ready. Redirecting to login...'
              : 'Your password has been updated. Redirecting to login...'}
          </p>
          
          <Link href="/login" className="text-[var(--primary)] text-sm hover:underline">
            Go to login now
          </Link>
        </div>
      </main>
    );
  }

  // Password form
  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2 text-center">
          {isNewUser ? 'Set Your Password' : 'Reset Your Password'}
        </h1>
        <p className="text-[var(--muted)] text-sm text-center mb-6">
          {isNewUser 
            ? 'Create a password to complete your account setup.'
            : 'Enter a new password for your account.'}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="password">
              New Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
              required
            />
          </div>

          {/* Password requirements */}
          <div className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
            <p className="text-xs text-[var(--muted)] mb-2">Password must contain:</p>
            <ul className="text-xs space-y-1">
              <li className={`flex items-center gap-2 ${password.length >= 8 ? 'text-emerald-400' : 'text-[var(--muted)]'}`}>
                {password.length >= 8 ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="3" />
                  </svg>
                )}
                At least 8 characters
              </li>
              <li className={`flex items-center gap-2 ${/[A-Z]/.test(password) ? 'text-emerald-400' : 'text-[var(--muted)]'}`}>
                {/[A-Z]/.test(password) ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="3" />
                  </svg>
                )}
                One uppercase letter
              </li>
              <li className={`flex items-center gap-2 ${/[a-z]/.test(password) ? 'text-emerald-400' : 'text-[var(--muted)]'}`}>
                {/[a-z]/.test(password) ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="3" />
                  </svg>
                )}
                One lowercase letter
              </li>
              <li className={`flex items-center gap-2 ${/[0-9]/.test(password) ? 'text-emerald-400' : 'text-[var(--muted)]'}`}>
                {/[0-9]/.test(password) ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="3" />
                  </svg>
                )}
                One number
              </li>
            </ul>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {isNewUser ? 'Creating password...' : 'Updating password...'}
              </span>
            ) : (
              isNewUser ? 'Create Password' : 'Update Password'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-[var(--primary)] text-sm hover:underline">
            ← Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
          <div className="card max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
            <p className="text-[var(--muted)]">Loading...</p>
          </div>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
