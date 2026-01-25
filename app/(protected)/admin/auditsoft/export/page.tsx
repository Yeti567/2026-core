'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuditSoftExportWizard } from '@/components/integrations/auditsoft-export-wizard';

export default function AuditSoftExportPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/auditsoft"
            className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm flex items-center gap-1 mb-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to AuditSoft
          </Link>
        </div>

        {/* Export Wizard */}
        <AuditSoftExportWizard onClose={() => router.push('/admin/auditsoft')} />
      </div>
    </main>
  );
}
