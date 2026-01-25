import { getServerUserOrRedirect } from '@/lib/auth/helpers';
import { DepartmentsManager } from '@/components/admin/departments-manager';

export default async function DepartmentsPage() {
  await getServerUserOrRedirect();

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
      <div className="max-w-7xl mx-auto">
        <DepartmentsManager />
      </div>
    </main>
  );
}
