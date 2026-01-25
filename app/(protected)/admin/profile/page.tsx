import { getServerUserOrRedirect } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import { CompanyProfileForm } from '@/components/admin/company-profile-form';
import { redirect } from 'next/navigation';

export default async function CompanyProfilePage() {
  const user = await getServerUserOrRedirect();
  const supabase = await createClient();

  // Get company info
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, role')
    .eq('user_id', user.userId)
    .single();

  if (!profile?.company_id) {
    redirect('/onboarding');
  }

  // Only admins can edit company profile
  if (!['admin', 'super_admin'].includes(profile.role)) {
    redirect('/dashboard');
  }

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', profile.company_id)
    .single();

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Company Profile</h1>
          <p className="text-slate-400">Complete your company information to get started with COR certification</p>
        </div>

        <CompanyProfileForm company={company} />
      </div>
    </main>
  );
}
