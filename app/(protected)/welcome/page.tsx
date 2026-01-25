import { getServerUserOrRedirect } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import { COR_ELEMENTS } from '@/lib/audit/types';
import Link from 'next/link';
import { WelcomeOnboarding } from '@/components/welcome/welcome-onboarding';

export default async function WelcomePage() {
  const user = await getServerUserOrRedirect();
  const supabase = await createClient();

  // Get company info
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, first_admin')
    .eq('user_id', user.userId)
    .single();

  let company = null;
  if (profile?.company_id) {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single();
    company = data;
  }

  return <WelcomeOnboarding company={company} isFirstAdmin={profile?.first_admin || false} />;
}
