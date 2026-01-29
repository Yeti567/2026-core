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
      </div>
    </main>
  );
}
