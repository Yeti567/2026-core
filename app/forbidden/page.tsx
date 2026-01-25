import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="card max-w-md w-full text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-[var(--muted)] mb-6">
          You don't have permission to access this page. 
          This area requires admin or super_admin privileges.
        </p>
        <Link href="/dashboard" className="btn btn-primary">
          Return to Dashboard
        </Link>
      </div>
    </main>
  );
}
