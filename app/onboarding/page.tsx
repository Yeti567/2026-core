import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import { authenticateServerComponentSimple } from '@/lib/auth/jwt-simple';
import { redirect } from 'next/navigation';

export default async function OnboardingPage() {
  // Check authentication on server side
  const { user } = await authenticateServerComponentSimple();
  
  if (!user) {
    redirect('/login');
  }

  return <OnboardingWizard />;
}
