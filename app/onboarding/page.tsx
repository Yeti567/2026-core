'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';

export default function OnboardingPage() {
  const [checking, setChecking] = useState(true);
  const [hasCompany, setHasCompany] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkContext() {
      try {
        // For now, assume user has company if they reach this page
        // The middleware should handle authentication
        setHasCompany(true);
      } catch (error) {
        console.error('Error checking user context:', error);
        router.push('/login');
      } finally {
        setChecking(false);
      }
    }

    checkContext();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!hasCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Company Setup Required</h1>
          <p className="text-gray-600 mb-6">You need to complete your company registration first.</p>
          <button 
            onClick={() => router.push('/register')}
            className="btn btn-primary"
          >
            Complete Registration
          </button>
        </div>
      </div>
    );
  }

  return <OnboardingWizard />;
}
