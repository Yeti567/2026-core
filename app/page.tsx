import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="card max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-2">COR Pathways</h1>
        <p className="text-[var(--muted)] mb-8">
          Construction Safety Management Platform
        </p>

        <div className="space-y-4">
          <Link href="/register" className="btn btn-primary w-full block">
            Register Your Company
          </Link>
          <p className="text-sm text-[var(--muted)]">
            Get started by registering your company to access COR compliance tools
          </p>
        </div>

        <div className="mt-6">
          <Link
            href="/overview"
            className="text-sm text-[var(--primary)] hover:underline"
          >
            Explore all features →
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--muted)] mb-3">Already have an account?</p>
          <Link href="/login" className="btn w-full block border border-[var(--border)]">
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}

