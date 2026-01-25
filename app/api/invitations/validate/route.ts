/**
 * Invitation Validation API Route
 * 
 * POST: Validate an invitation token and return invitation details
 * This route is public (no auth required) as it's used during the acceptance flow
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a service role client for this public endpoint
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
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Use service role to call the validation function
    const supabase = getServiceClient();

    // Call the get_invitation_details function
    const { data, error } = await supabase
      .rpc('get_invitation_details', { p_invitation_token: token });

    if (error) {
      console.error('Validation error:', error);
      return NextResponse.json(
        { error: 'Failed to validate invitation' },
        { status: 500 }
      );
    }

    // The function returns a JSON object with valid flag and invitation details
    if (!data || !data.valid) {
      return NextResponse.json(
        { 
          valid: false,
          error: data?.error || 'Invalid or expired invitation link' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      invitation: data.invitation,
    });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'An error occurred while validating the invitation' },
      { status: 500 }
    );
  }
}
