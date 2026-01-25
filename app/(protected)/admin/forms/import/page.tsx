'use client';

/**
 * PDF Form Import Page
 * 
 * Admin interface for converting PDF forms to digital form templates.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PDFConverterWizard } from '@/components/pdf-converter';
import { Loader2 } from 'lucide-react';

export default function PDFImportPage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's company ID
  useEffect(() => {
    async function fetchCompany() {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        
        if (data.profile?.company_id) {
          setCompanyId(data.profile.company_id);
        }
      } catch (error) {
        console.error('Failed to fetch company:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchCompany();
  }, []);

  const handleComplete = (templateId: string) => {
    router.push(`/admin/forms/${templateId}`);
  };

  const handleCancel = () => {
    router.push('/admin/forms');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-slate-800 rounded-xl">
          <h2 className="text-xl font-bold text-slate-200 mb-4">Access Denied</h2>
          <p className="text-slate-400 mb-6">
            You must be associated with a company to import PDF forms.
          </p>
          <button
            onClick={() => router.push('/admin/forms')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
          >
            Back to Forms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <PDFConverterWizard
        companyId={companyId}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </div>
  );
}
