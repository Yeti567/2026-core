'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send reset link');
        return;
      }

      setSent(true);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
        <div className="card max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
          <p className="text-[var(--muted)] mb-4">
            We've sent a password reset link to:
          </p>
          <p className="text-[var(--foreground)] font-medium mb-6">{email}</p>
          
          <p className="text-[var(--muted)] text-sm mb-6">
            Click the link in the email to reset your password. The link will expire in 1 hour.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                setSent(false);
                setEmail('');
              }}
              className="text-[var(--primary)] text-sm hover:underline"
            >
              Try a different email
            </button>
            
            <p className="text-[var(--muted)] text-xs">
              Didn't receive the email? Check your spam folder or{' '}
              <button
                onClick={() => setSent(false)}
                className="text-[var(--primary)] hover:underline"
              >
                try again
              </button>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <Link href="/login" className="text-[var(--primary)] text-sm hover:underline">
              ← Back to login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2 text-center">Reset Password</h1>
        <p className="text-[var(--muted)] text-sm text-center mb-6">
          Enter your email and we'll send you a link to reset your password.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
            />
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
                Sending...
              </span>
            ) : (
              'Send Reset Link'
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
