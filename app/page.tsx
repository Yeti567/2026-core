import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="card max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-2">COR 2026</h1>
        <p className="text-[var(--muted)] mb-8">
          Multi-tenant compliance management platform
        </p>
        
        <div className="space-y-4">
          <Link href="/login" className="btn btn-primary w-full block">
            Sign In
          </Link>
          <Link href="/signup" className="btn w-full block border border-[var(--border)]">
            Create Account
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Test Routes:</p>
          <div className="flex gap-4 justify-center mt-2 text-sm">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/admin">Admin</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
