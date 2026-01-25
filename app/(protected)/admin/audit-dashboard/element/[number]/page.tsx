import { getServerUserOrRedirect } from '@/lib/auth/helpers';
import { ElementDetailClient } from './element-detail-client';

interface PageProps {
  params: Promise<{ number: string }>;
}

export default async function ElementDetailPage({ params }: PageProps) {
  const user = await getServerUserOrRedirect();
  const { number } = await params;
  const elementNumber = parseInt(number, 10);

  if (isNaN(elementNumber) || elementNumber < 1 || elementNumber > 14) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Element</h1>
          <p className="text-slate-400">Element number must be between 1 and 14.</p>
        </div>
      </main>
    );
  }

  return <ElementDetailClient elementNumber={elementNumber} userRole={user.role} />;
}
