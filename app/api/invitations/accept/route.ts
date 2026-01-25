/**
 * Invitation Acceptance API Route
 * 
 * POST: Accept an invitation and complete user profile
 * This creates the worker record and user_profile, linking them to the auth user
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase/server';

// Create a service role client for operations that need to bypass RLS
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, serviceKey);
}

export async function POST(request: Request) {
  try {
    // Get the authenticated user
    const supabase = createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to accept an invitation' },
        { status: 401 }
      );
    }

    // Check if user already has a profile
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'You are already a member of a company' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { token, phone, emergencyContactName, emergencyContactPhone } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Use service role client to call the accept_worker_invitation function
    const serviceClient = getServiceClient();

    const { data, error } = await serviceClient.rpc('accept_worker_invitation', {
      p_invitation_token: token,
      p_user_id: user.id,
      p_phone: phone || null,
      p_emergency_contact_name: emergencyContactName || null,
      p_emergency_contact_phone: emergencyContactPhone || null,
    });

    if (error) {
      console.error('Accept invitation error:', error);
      return NextResponse.json(
        { error: 'Failed to accept invitation' },
        { status: 500 }
      );
    }

    // The function returns a JSON object
    const result = data as {
      success: boolean;
      error?: string;
      profile_id?: string;
      worker_id?: string;
      company_id?: string;
      role?: string;
      first_name?: string;
      last_name?: string;
    };

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to accept invitation' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      profileId: result.profile_id,
      workerId: result.worker_id,
      companyId: result.company_id,
      role: result.role,
      firstName: result.first_name,
      lastName: result.last_name,
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    return NextResponse.json(
      { error: 'An error occurred while accepting the invitation' },
      { status: 500 }
    );
  }
}
