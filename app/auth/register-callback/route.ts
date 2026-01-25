/**
 * Registration Magic Link Callback
 * 
 * This route handles the callback when a user clicks the magic link
 * from their registration email. It:
 * 1. Verifies the auth session from Supabase
 * 2. Uses the registration token to create company/profile
 * 3. Redirects to onboarding
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { hashToken } from '@/lib/invitations/token';

// Service role client
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, serviceKey);
}

// Create a Supabase client that can set cookies
function createSupabaseClient() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const code = searchParams.get('code'); // Supabase auth code

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    new URL(request.url).origin;

  // If we have a code, exchange it for a session
  if (code) {
    const supabase = createSupabaseClient();
    
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError || !sessionData.user) {
      console.error('Session exchange error:', sessionError);
      return NextResponse.redirect(
        `${baseUrl}/register?error=auth_failed&message=${encodeURIComponent('Failed to verify your email. Please try again.')}`
      );
    }

    // Get the token from the URL or user metadata
    const registrationToken = token || sessionData.user.user_metadata?.registration_token;
    
    if (!registrationToken) {
      // User is authenticated but no registration token - redirect to onboarding
      return NextResponse.redirect(`${baseUrl}/onboarding`);
    }

    // Hash the token to look up in database
    const tokenHash = typeof registrationToken === 'string' && registrationToken.length === 64 
      ? registrationToken // Already hashed
      : await hashToken(registrationToken);

    // Use service client to call the registration function
    const serviceClient = getServiceClient();
    
    const { data: result, error: regError } = await serviceClient
      .rpc('use_registration_token', {
        p_token_hash: tokenHash,
        p_user_id: sessionData.user.id,
      });

    if (regError) {
      console.error('Registration error:', regError);
      return NextResponse.redirect(
        `${baseUrl}/register?error=registration_failed&message=${encodeURIComponent('Failed to complete registration. Please try again.')}`
      );
    }

    const registrationResult = result as {
      success: boolean;
      error?: string;
      company_id?: string;
      company_name?: string;
    };

    if (!registrationResult.success) {
      return NextResponse.redirect(
        `${baseUrl}/register?error=registration_failed&message=${encodeURIComponent(registrationResult.error || 'Registration failed.')}`
      );
    }

    // Success! Redirect to welcome/onboarding page
    return NextResponse.redirect(`${baseUrl}/welcome?new=true&company=${encodeURIComponent(registrationResult.company_name || '')}`);
  }

  // If we have a token but no code, redirect to the magic link verification
  if (token) {
    // The user will be redirected here after clicking the magic link
    // Supabase handles the initial auth, then redirects back with a code
    return NextResponse.redirect(
      `${baseUrl}/register?error=invalid_link&message=${encodeURIComponent('Invalid registration link. Please request a new one.')}`
    );
  }

  // No token or code - redirect to register page
  return NextResponse.redirect(`${baseUrl}/register`);
}
