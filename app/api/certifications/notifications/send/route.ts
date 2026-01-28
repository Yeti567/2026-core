/**
 * Manual Notification Send API
 * 
 * POST /api/certifications/notifications/send
 * 
 * Allows admins to manually send a reminder for a specific certification.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { sendManualReminder } from '@/lib/certifications/expiry-notifications';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


// =============================================================================
// SUPABASE CLIENT
// =============================================================================

async function getAuthenticatedUser() {
  const supabase = createRouteHandlerClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, company_id, role')
    .eq('user_id', user.id)
    .single();

  return profile;
}

// =============================================================================
// POST - Send Manual Reminder
// =============================================================================

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user || !['super_admin', 'admin', 'supervisor'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { certification_id, reminder_type } = body;

    if (!certification_id) {
      return NextResponse.json(
        { error: 'certification_id is required' },
        { status: 400 }
      );
    }

    // Validate reminder type
    const validTypes = ['60_day', '30_day', '7_day', 'expired'];
    if (reminder_type && !validTypes.includes(reminder_type)) {
      return NextResponse.json(
        { error: 'Invalid reminder_type. Must be one of: 60_day, 30_day, 7_day, expired' },
        { status: 400 }
      );
    }

    // Verify certification belongs to user's company
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: cert, error: certError } = await supabase
      .from('worker_certifications')
      .select('company_id')
      .eq('id', certification_id)
      .single();

    if (certError || !cert) {
      return NextResponse.json(
        { error: 'Certification not found' },
        { status: 404 }
      );
    }

    if (cert.company_id !== user.company_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Send the manual reminder
    const result = await sendManualReminder(
      certification_id,
      reminder_type || '30_day'
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${reminder_type || '30_day'} reminder sent successfully`,
    });
  } catch (error: unknown) {
    console.error('Manual send error:', error);
    return handleApiError(error, 'Failed to send manual reminder');
  }
}
