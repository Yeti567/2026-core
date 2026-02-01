import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get company subscription info
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('subscription_status, subscription_plan, trial_started_at, trial_ends_at, created_at')
      .eq('id', profile.company_id)
      .single();

    if (companyError) {
      console.error('Error fetching company:', companyError);
      return NextResponse.json({ error: 'Failed to fetch subscription status' }, { status: 500 });
    }

    // If no trial fields set, calculate from created_at (5-day trial)
    let trialEndsAt = company?.trial_ends_at;
    let subscriptionStatus = company?.subscription_status || 'trial';

    if (!trialEndsAt && company?.created_at) {
      const createdAt = new Date(company.created_at);
      const trialEnd = new Date(createdAt);
      trialEnd.setDate(trialEnd.getDate() + 5);
      trialEndsAt = trialEnd.toISOString();
    }

    // Check if trial has expired
    if (subscriptionStatus === 'trial' && trialEndsAt) {
      const now = new Date();
      const endDate = new Date(trialEndsAt);
      if (now > endDate) {
        subscriptionStatus = 'expired';
      }
    }

    return NextResponse.json({
      subscriptionStatus,
      subscriptionPlan: company?.subscription_plan || null,
      trialStartedAt: company?.trial_started_at || company?.created_at,
      trialEndsAt,
    });
  } catch (error) {
    console.error('Error in GET /api/subscription/status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
