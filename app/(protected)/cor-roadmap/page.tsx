import { getServerUserOrRedirect } from '@/lib/auth/helpers';
import CORRoadmap from '@/components/cor/cor-roadmap';

export default async function CORRoadmapPage() {
  await getServerUserOrRedirect();

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
      <div className="max-w-6xl mx-auto">
        <CORRoadmap />
      </div>
    </main>
  );
}
