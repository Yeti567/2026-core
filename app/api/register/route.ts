/**
 * Company Registration API Route
 * 
 * POST: Register a new company and send magic link to registrant
 * 
 * Flow:
 * 1. Validate all form fields
 * 2. Check rate limit (3 attempts per hour per IP)
 * 3. Verify WSIB number is not already registered
 * 4. Create registration token
 * 5. Send magic link email via Supabase Auth
 * 6. Log the attempt
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import {
  validateCompanyRegistration,
  type CompanyRegistration,
} from '@/lib/validation/company';
import { generateToken, hashToken } from '@/lib/invitations/token';
import { handleApiError } from '@/lib/utils/error-handling';

// Service role client for bypassing RLS
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, serviceKey);
}

// Get client IP from headers
function getClientIP(): string {
  const headersList = headers();
  return (
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown'
  );
}

// Get user agent from headers
function getUserAgent(): string {
  const headersList = headers();
  return headersList.get('user-agent') || 'unknown';
}

// Log registration attempt
async function logAttempt(
  supabase: ReturnType<typeof getServiceClient>,
  data: {
    ip_address: string;
    user_agent: string;
    company_name?: string;
    wsib_number?: string;
    registrant_email?: string;
    success: boolean;
    error_code?: string;
    error_message?: string;
  }
) {
  try {
    await supabase.from('registration_attempts').insert(data);
  } catch (err) {
    console.error('Failed to log registration attempt:', err);
  }
}

export async function POST(request: Request) {
  const supabase = getServiceClient();
  const ip = getClientIP();
  const userAgent = getUserAgent();

  try {
    const body = await request.json();
    const data = body as CompanyRegistration;

    // 1. Validate form data
    const validation = validateCompanyRegistration(data);
    if (!validation.valid) {
      await logAttempt(supabase, {
        ip_address: ip,
        user_agent: userAgent,
        company_name: data.company_name,
        wsib_number: data.wsib_number,
        registrant_email: data.registrant_email,
        success: false,
        error_code: 'VALIDATION_ERROR',
        error_message: Object.values(validation.errors).join('; '),
      });

      return NextResponse.json(
        {
          error: 'Validation failed',
          fields: validation.errors,
        },
        { status: 400 }
      );
    }

    // 2. Check rate limit
    const { data: rateLimitOk, error: rateLimitError } = await supabase
      .rpc('check_registration_rate_limit', { p_ip_address: ip });

    if (rateLimitError || !rateLimitOk) {
      await logAttempt(supabase, {
        ip_address: ip,
        user_agent: userAgent,
        company_name: data.company_name,
        wsib_number: data.wsib_number,
        registrant_email: data.registrant_email,
        success: false,
        error_code: 'RATE_LIMIT',
        error_message: 'Too many registration attempts',
      });

      return NextResponse.json(
        {
          error: 'Too many registration attempts. Please try again in an hour.',
        },
        { status: 429 }
      );
    }

    // 3. Check if WSIB number already exists
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id, name')
      .eq('wsib_number', data.wsib_number)
      .single();

    if (existingCompany) {
      await logAttempt(supabase, {
        ip_address: ip,
        user_agent: userAgent,
        company_name: data.company_name,
        wsib_number: data.wsib_number,
        registrant_email: data.registrant_email,
        success: false,
        error_code: 'WSIB_EXISTS',
        error_message: 'Company already registered with this WSIB number',
      });

      return NextResponse.json(
        {
          error: 'A company is already registered with this WSIB number. If this is your company, please contact support.',
        },
        { status: 409 }
      );
    }

    // 4. Check if there's already a pending registration for this WSIB
    const { data: pendingToken } = await supabase
      .from('registration_tokens')
      .select('id, registrant_email')
      .eq('wsib_number', data.wsib_number)
      .eq('status', 'pending')
      .single();

    if (pendingToken) {
      await logAttempt(supabase, {
        ip_address: ip,
        user_agent: userAgent,
        company_name: data.company_name,
        wsib_number: data.wsib_number,
        registrant_email: data.registrant_email,
        success: false,
        error_code: 'PENDING_REGISTRATION',
        error_message: 'Registration already pending for this WSIB number',
      });

      return NextResponse.json(
        {
          error: 'A registration is already pending for this WSIB number. Please check your email or wait for the previous link to expire.',
        },
        { status: 409 }
      );
    }

    // 5. Generate registration token
    const token = generateToken();
    const tokenHash = await hashToken(token);

    // 6. Store registration token
    const { error: tokenError } = await supabase
      .from('registration_tokens')
      .insert({
        token_hash: tokenHash,
        company_name: data.company_name,
        wsib_number: data.wsib_number,
        company_email: data.company_email,
        address: data.address,
        city: data.city,
        province: data.province,
        postal_code: data.postal_code,
        phone: data.phone,
        registrant_name: data.registrant_name,
        registrant_position: data.registrant_position,
        registrant_email: data.registrant_email,
        industry: data.industry || null,
        employee_count: data.employee_count || null,
        years_in_business: data.years_in_business || null,
        main_services: data.main_services && data.main_services.length > 0 ? data.main_services : null,
        ip_address: ip,
        user_agent: userAgent,
      });

    if (tokenError) {
      console.error('Token creation error:', tokenError);
      await logAttempt(supabase, {
        ip_address: ip,
        user_agent: userAgent,
        company_name: data.company_name,
        wsib_number: data.wsib_number,
        registrant_email: data.registrant_email,
        success: false,
        error_code: 'TOKEN_ERROR',
        error_message: 'Failed to create registration token',
      });

      return NextResponse.json(
        { error: 'Failed to process registration. Please try again.' },
        { status: 500 }
      );
    }

    // 7. Send magic link via Supabase Auth
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (request.headers.get('origin') ?? 'http://localhost:3000');
    
    const redirectUrl = `${baseUrl}/auth/register-callback?token=${token}`;

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: data.registrant_email,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          registration_token: tokenHash,
          company_name: data.company_name,
        },
      },
    });

    if (otpError) {
      console.error('OTP error:', otpError);
      
      // Clean up the token since email failed
      await supabase
        .from('registration_tokens')
        .delete()
        .eq('token_hash', tokenHash);

      await logAttempt(supabase, {
        ip_address: ip,
        user_agent: userAgent,
        company_name: data.company_name,
        wsib_number: data.wsib_number,
        registrant_email: data.registrant_email,
        success: false,
        error_code: 'EMAIL_ERROR',
        error_message: otpError.message,
      });

      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      );
    }

    // 8. Log successful attempt
    await logAttempt(supabase, {
      ip_address: ip,
      user_agent: userAgent,
      company_name: data.company_name,
      wsib_number: data.wsib_number,
      registrant_email: data.registrant_email,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Registration submitted. Check your email for verification link.',
      email: data.registrant_email,
    });
  } catch (error) {
    console.error('Registration error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logAttempt(supabase, {
      ip_address: ip,
      user_agent: userAgent,
      success: false,
      error_code: 'UNKNOWN_ERROR',
      error_message: errorMessage,
    });

    return handleApiError(error, 'An unexpected error occurred. Please try again.', 500, 'Company registration');
  }
}
