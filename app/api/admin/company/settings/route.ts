import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/company/settings
 * Get company settings
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get or create settings
    const { data: settings, error: settingsError } = await supabase
      .rpc('get_or_create_company_settings', { p_company_id: profile.company_id })
      .single();

    if (settingsError) {
      // If function doesn't exist or fails, try direct query
      let { data: directSettings } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', profile.company_id)
        .single();

      if (!directSettings) {
        // Create default settings
        const { data: newSettings, error: insertError } = await supabase
          .from('company_settings')
          .insert({
            company_id: profile.company_id,
            business_hours: {},
            notification_preferences: {
              email_certification_expiries: false,
              email_incident_reports: false,
              push_daily_inspections: false,
              sms_critical_alerts: false,
            },
            fiscal_year_start_month: 4,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating settings:', insertError);
          return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
        }
        directSettings = newSettings;
      }

      return NextResponse.json({ settings: directSettings });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error in GET /api/admin/company/settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/company/settings
 * Update company settings
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company and role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Only admins can update settings
    if (!['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      logo_url,
      logo_storage_path,
      business_hours,
      notification_preferences,
      fiscal_year_start_month,
      target_certification_date,
      audit_timeline_months,
    } = body;

    // Prepare update object
    const updates: any = {};
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (logo_storage_path !== undefined) updates.logo_storage_path = logo_storage_path;
    if (business_hours !== undefined) updates.business_hours = business_hours;
    if (notification_preferences !== undefined) updates.notification_preferences = notification_preferences;
    if (fiscal_year_start_month !== undefined) updates.fiscal_year_start_month = fiscal_year_start_month;
    if (target_certification_date !== undefined) updates.target_certification_date = target_certification_date;
    if (audit_timeline_months !== undefined) updates.audit_timeline_months = audit_timeline_months;

    // Check if settings exist
    const { data: existing } = await supabase
      .from('company_settings')
      .select('id')
      .eq('company_id', profile.company_id)
      .single();

    let result;
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('company_settings')
        .update(updates)
        .eq('company_id', profile.company_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
      }
      result = data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from('company_settings')
        .insert({
          company_id: profile.company_id,
          ...updates,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating settings:', error);
        return NextResponse.json({ error: 'Failed to create settings' }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json({ success: true, settings: result });
  } catch (error) {
    console.error('Error in PATCH /api/admin/company/settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
