import { getServerUser } from '@/lib/auth/helpers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getServerUser();
  
  if (!user) {
    redirect('/login?error=session_invalid');
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-gray-500">Welcome back!</p>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="px-4 py-2 border rounded">
              Sign Out
            </button>
          </form>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="p-6 border rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Your Context</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">User ID</dt>
                <dd className="font-mono text-xs">{user.userId.slice(0, 8)}...</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Company ID</dt>
                <dd className="font-mono text-xs">{user.companyId.slice(0, 8)}...</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Role</dt>
                <dd className="font-medium">{user.role}</dd>
              </div>
            </dl>
          </div>

          <div className="p-6 border rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
            <div className="space-y-2">
              <Link href="/audit" className="block px-4 py-2 bg-blue-600 text-white rounded text-center">
                COR Audit Dashboard
              </Link>
              <Link href="/phases" className="block px-4 py-2 border rounded text-center">
                Certification Phases
              </Link>
              <Link href="/documents" className="block px-4 py-2 border rounded text-center">
                Documents
              </Link>
            </div>
          </div>
        </div>

        {/* Worker Quick Actions */}
        <div className="mt-8 p-6 border rounded-lg bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/30">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">📸</span>
            Upload Your Training Certificates
          </h2>
          <p className="text-gray-400 mb-4">
            Take a photo of your safety tickets, training certificates, or licenses to keep them on file.
          </p>
          <Link 
            href="/my-certificates" 
            className="inline-flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Upload Certificate Photo
          </Link>
        </div>
      </div>
    </main>
  );
}
