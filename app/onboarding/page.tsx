import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import { authenticateServerComponent } from '@/lib/auth/jwt-middleware';
import { redirect } from 'next/navigation';

export default async function OnboardingPage() {
  // Check authentication on server side
  const { user, error } = await authenticateServerComponent();
  
  if (!user) {
    redirect('/login');
  }

  return <OnboardingWizard />;
}
