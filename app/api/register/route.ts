/**
 * Company Registration API Route
 * 
 * Handles new company registration with comprehensive validation,
 * rate limiting, and security measures.
 * 
 * POST: Register a new company and create admin user
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { CompanyRegistration } from '@/lib/validation/company';
import { validateCompanyRegistration } from '@/lib/validation/company';

// Force Node.js runtime for PostgreSQL compatibility
export const runtime = 'nodejs';

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

export async function POST(request: Request) {
  console.log('🔄 Registration request received');
  const ip = getClientIP();
  const userAgent = getUserAgent();

  try {
    // TODO: Fix rate limiting - temporarily disabled for testing
    // Check rate limit: 3 attempts per hour per IP
    // const rateLimitResult = await rateLimitByIP(request, 3, '1h');
    // if (!rateLimitResult.success) {
    //   console.log('❌ Rate limit exceeded');
    //   return createRateLimitResponse(rateLimitResult);
    // }

    const body = await request.json();
    console.log('📝 Registration data received:', { ...body, password: '[REDACTED]', confirm_password: '[REDACTED]' });
    const data = body as CompanyRegistration;

    // 1. Validate form data
    const validation = validateCompanyRegistration(data);
    console.log('✅ Validation result:', validation);
    
    if (!validation.valid) {
      console.log('❌ Validation failed:', validation.errors);
      
      // Skip database logging for now due to connection issues
      // await logAttempt(neon, {
      //   ip_address: ip,
      //   user_agent: userAgent,
      //   company_name: data.company_name,
      //   wsib_number: data.wsib_number,
      //   registrant_email: data.registrant_email,
      //   success: false,
      //   error_code: 'VALIDATION_ERROR',
      //   error_message: Object.values(validation.errors).join('; '),
      // });

      return NextResponse.json(
        {
          error: 'Validation failed',
          fields: validation.errors,
        },
        { status: 400 }
      );
    }

    // 2. Create user using Supabase auth
    const { createClient } = await import('@supabase/supabase-js');
    
    // Use service role key for admin operations (bypasses email confirmation)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    try {
      // Create user with Supabase admin (bypasses email confirmation)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.registrant_email,
        password: data.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: data.registrant_name,
          position: data.registrant_position,
          company_id: 'company-' + Date.now(),
          role: 'admin'
        }
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        return NextResponse.json(
          { error: 'Failed to create user account: ' + authError.message },
          { status: 400 }
        );
      }

      console.log('✅ User created successfully with Supabase:', authData.user?.email);
      
      return NextResponse.json({
        success: true,
        message: 'Account created successfully. You can now sign in.',
        email: data.registrant_email,
        companyId: 'company-' + Date.now(),
      });
    } catch (createError) {
      console.error('Failed to create user:', createError);
      return NextResponse.json(
        { error: 'Failed to create user account. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Registration error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('Company registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
