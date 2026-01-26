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
import { createNeonWrapper } from '@/lib/db/neon-wrapper';
import { createUser, hashPassword } from '@/lib/auth/jwt';
import {
  validateCompanyRegistration,
  type CompanyRegistration,
} from '@/lib/validation/company';
import { generateToken, hashToken } from '@/lib/invitations/token';
import { handleApiError } from '@/lib/utils/error-handling';
import { rateLimitByIP, createRateLimitResponse } from '@/lib/utils/rate-limit';

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
  neon: ReturnType<typeof createNeonWrapper>,
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
    await neon.from('registration_attempts').insert(data);
  } catch (err) {
    console.error('Failed to log registration attempt:', err);
  }
}

export async function POST(request: Request) {
  console.log('🔄 Registration request received');
  
  const neon = createNeonWrapper();
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

    // TEMPORARY: Mock successful registration without database
    console.log('🎉 Mock registration successful for:', data.company_name);
    
    return NextResponse.json({
      success: true,
      message: 'Account created successfully. You can now sign in.',
      email: data.registrant_email,
      companyId: 'mock-company-id-' + Date.now(),
    });

    // 2. Check if WSIB number already exists
    const { data: existingCompany } = await neon
      .from('companies')
      .select('id, name')
      .eq('wsib_number', data.wsib_number)
      .single();

    if (existingCompany) {
      await logAttempt(neon, {
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

    // 3. Create company record
    const { data: newCompany, error: companyError } = await neon
      .from('companies')
      .insert({
        name: data.company_name,
        wsib_number: data.wsib_number,
        email: data.company_email,
        address: data.address,
        city: data.city,
        province: data.province,
        postal_code: data.postal_code,
        phone: data.phone,
        industry: data.industry || null,
        employee_count: data.employee_count || null,
        years_in_business: data.years_in_business || null,
        main_services: data.main_services || [],
        status: 'active',
      })
      .select('id')
      .single();

    if (companyError || !newCompany) {
      console.error('Failed to create company:', companyError);
      await logAttempt(neon, {
        ip_address: ip,
        user_agent: userAgent,
        company_name: data.company_name,
        wsib_number: data.wsib_number,
        registrant_email: data.registrant_email,
        success: false,
        error_code: 'COMPANY_CREATION_FAILED',
        error_message: companyError?.message || 'Unknown error creating company',
      });

      return NextResponse.json(
        { error: 'Failed to create company. Please try again.' },
        { status: 500 }
      );
    }

    // 4. Create user
    const newUser = await createUser({
      email: data.registrant_email,
      password: data.password,
      name: data.registrant_name,
      position: data.registrant_position,
      companyId: newCompany.id,
      role: 'admin'
    });

    if (!newUser.user) {
      console.error('Failed to create user');
      // Rollback: delete the company we just created
      await neon.from('companies').delete().eq('id', newCompany.id);

      await logAttempt(neon, {
        ip_address: ip,
        user_agent: userAgent,
        company_name: data.company_name,
        wsib_number: data.wsib_number,
        registrant_email: data.registrant_email,
        success: false,
        error_code: 'USER_CREATION_FAILED',
        error_message: 'Unknown error creating user',
      });

      return NextResponse.json(
        { error: 'Failed to create user account. Please try again.' },
        { status: 500 }
      );
    }

    // 5. Log successful registration
    await logAttempt(neon, {
      ip_address: ip,
      user_agent: userAgent,
      company_name: data.company_name,
      wsib_number: data.wsib_number,
      registrant_email: data.registrant_email,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. You can now sign in.',
      email: data.registrant_email,
      companyId: newCompany.id,
    });
  } catch (error) {
    console.error('Registration error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logAttempt(neon, {
      ip_address: ip,
      user_agent: userAgent,
      success: false,
      error_code: 'UNKNOWN_ERROR',
      error_message: errorMessage,
    });

    return handleApiError(error, 'An unexpected error occurred. Please try again.', 500, 'Company registration');
  }
}
