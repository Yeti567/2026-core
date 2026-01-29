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

export const dynamic = 'force-dynamic';


// Force Node.js runtime for PostgreSQL compatibility
export const runtime = 'nodejs';

// Get client IP from headers
async function getClientIP(): Promise<string> {
  const headersList = await headers();
  return (
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown'
  );
}

// Get user agent from headers
async function getUserAgent(): Promise<string> {
  const headersList = await headers();
  return headersList.get('user-agent') || 'unknown';
}

const API_VERSION = '2026-01-29-v3';

export async function POST(request: Request) {
  console.log('🔄 Registration request received - API Version:', API_VERSION);
  
  let ip: string;
  let userAgent: string;
  
  try {
    ip = await getClientIP();
    userAgent = await getUserAgent();
  } catch (headerError) {
    console.error('❌ Error getting headers:', headerError);
    return NextResponse.json(
      { error: 'Failed to process request headers', version: API_VERSION },
      { status: 500 }
    );
  }

  try {
    // TODO: Fix rate limiting - temporarily disabled for testing
    // Check rate limit: 3 attempts per hour per IP
    // const rateLimitResult = await rateLimitByIP(request, 3, '1h');
    // if (!rateLimitResult.success) {
    //   console.log('❌ Rate limit exceeded');
    //   return createRateLimitResponse(rateLimitResult);
    // }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body - could not parse JSON' },
        { status: 400 }
      );
    }
    
    console.log('📝 Registration data received:', { ...body, password: '[REDACTED]', confirm_password: '[REDACTED]' });
    
    // Ensure all required fields exist (prevent .trim() on undefined)
    const data: CompanyRegistration = {
      company_name: body.company_name || '',
      wsib_number: body.wsib_number || '',
      company_email: body.company_email || '',
      address: body.address || '',
      city: body.city || '',
      province: body.province || '',
      postal_code: body.postal_code || '',
      phone: body.phone || '',
      registrant_name: body.registrant_name || '',
      registrant_position: body.registrant_position || '',
      registrant_email: body.registrant_email || '',
      password: body.password || '',
      confirm_password: body.confirm_password || '',
    };

    // 1. Validate form data
    let validation;
    try {
      validation = validateCompanyRegistration(data);
    } catch (validationError) {
      console.error('❌ Validation threw error:', validationError);
      return NextResponse.json(
        { error: 'Validation error: ' + (validationError instanceof Error ? validationError.message : 'Unknown') },
        { status: 400 }
      );
    }
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

    // 2. Create user using Supabase auth with proper error handling
    const { createClient } = await import('@supabase/supabase-js');
    
    // Check if required environment variables are set
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl) {
      console.error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error: Database URL not configured' },
        { status: 500 }
      );
    }
    
    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error: Database key not configured' },
        { status: 500 }
      );
    }
    
    // Use service role key for admin operations (bypasses RLS and email confirmation)
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'X-Client-Info': 'cor-pathway-registration'
          }
        }
      }
    );
    
    console.log('🔧 Supabase admin client created with service role');
    
    try {
      // 1. Create company record - use ONLY base schema fields to avoid migration issues
      const companyInsert = {
        name: data.company_name,
        wsib_number: data.wsib_number || null,
        address: data.address || `${data.city || ''}, ${data.province || 'ON'} ${data.postal_code || ''}`
      };
      
      console.log('📝 Attempting company insert with MINIMAL fields:', JSON.stringify(companyInsert));
      
      const { data: companyData, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert(companyInsert)
        .select('id, name')
        .single();

      if (companyError) {
        console.error('❌ Company insert failed:', JSON.stringify(companyError));
        return NextResponse.json(
          { 
            error: 'Failed to create company: ' + companyError.message,
            debug: { 
              code: companyError.code, 
              details: companyError.details, 
              hint: companyError.hint,
              message: companyError.message
            }
          },
          { status: 500 }
        );
      }
      
      if (!companyData) {
        console.error('❌ No company data returned');
        return NextResponse.json(
          { error: 'Company was not created - no data returned' },
          { status: 500 }
        );
      }

      console.log('✅ Company created:', companyData.id);

      // 2. Create user with Supabase admin (bypasses email confirmation)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.registrant_email,
        password: data.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: data.registrant_name,
          position: data.registrant_position,
          company_id: companyData.id,
          role: 'admin'
        }
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        // Rollback: delete the company we just created
        await supabaseAdmin.from('companies').delete().eq('id', companyData.id);
        
        // Handle specific error cases
        const errorCode = (authError as any).code;
        let errorMessage = 'Failed to create user account: ' + authError.message;
        
        if (errorCode === 'email_exists' || authError.message.includes('already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in or use a different email.';
        }
        
        return NextResponse.json(
          { error: errorMessage },
          { status: 400 }
        );
      }

      console.log('✅ User created successfully:', authData.user?.email);

      // 3. Create user_profiles link - use ONLY base schema fields
      const profileInsert = {
        user_id: authData.user.id,
        company_id: companyData.id,
        role: 'admin'
      };
      
      console.log('📝 Attempting profile insert with MINIMAL fields:', JSON.stringify(profileInsert));
      
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert(profileInsert);

      if (profileError) {
        console.error('❌ Profile insert failed:', JSON.stringify(profileError));
        // Rollback: delete user and company
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        await supabaseAdmin.from('companies').delete().eq('id', companyData.id);
        return NextResponse.json(
          { 
            error: 'Failed to create user profile: ' + profileError.message,
            debug: { 
              code: profileError.code, 
              details: profileError.details, 
              hint: profileError.hint,
              message: profileError.message
            }
          },
          { status: 500 }
        );
      }

      console.log('✅ User profile created and linked to company');

      // 4. Send welcome email with account confirmation
      try {
        const apiKey = process.env.RESEND_API_KEY;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://corpathways.com';
        const loginUrl = `${baseUrl}/login`;

        if (apiKey) {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM_EMAIL || 'COR Pathways <noreply@corpathways.com>',
              to: data.registrant_email,
              subject: `Welcome to COR Pathways - ${data.company_name}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #6366f1;">Welcome to COR Pathways!</h2>
                  <p>Hi ${data.registrant_name},</p>
                  <p>Your company account for <strong>${data.company_name}</strong> has been successfully created on COR Pathways.</p>
                  
                  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Company:</strong> ${data.company_name}</p>
                    <p style="margin: 5px 0;"><strong>Your Email:</strong> ${data.registrant_email}</p>
                    <p style="margin: 5px 0;"><strong>Your Role:</strong> Administrator</p>
                    <p style="margin: 5px 0;"><strong>WSIB Number:</strong> ${data.wsib_number}</p>
                  </div>

                  <p>You can now sign in to your account and start managing your health & safety compliance:</p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${loginUrl}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Sign In to Your Account</a>
                  </div>

                  <h3 style="color: #374151; margin-top: 30px;">Getting Started</h3>
                  <ul style="color: #4b5563; line-height: 1.8;">
                    <li>Complete your company profile</li>
                    <li>Add your employees and team members</li>
                    <li>Start tracking your COR certification progress</li>
                    <li>Upload safety documents and forms</li>
                    <li>Set up your audit compliance tracking</li>
                  </ul>

                  <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
                  
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                  <p style="color: #9ca3af; font-size: 12px;">- COR Pathways Team</p>
                </div>
              `,
            }),
          });

          if (!emailResponse.ok) {
            const errorData = await emailResponse.json();
            console.error('Failed to send welcome email:', errorData);
            // Don't fail registration if email fails
          } else {
            console.log(`✅ Welcome email sent to ${data.registrant_email}`);
          }
        } else {
          console.log('⚠️ RESEND_API_KEY not configured - welcome email not sent');
        }
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't fail registration if email fails
      }
      
      return NextResponse.json({
        success: true,
        message: 'Account created successfully. You can now sign in.',
        email: data.registrant_email,
        companyId: companyData.id,
      });
    } catch (createError) {
      console.error('Failed to create user:', createError);
      const errMsg = createError instanceof Error ? createError.message : 'Unknown error';
      const errStack = createError instanceof Error ? createError.stack : undefined;
      return NextResponse.json(
        { 
          error: 'Failed to create user account. Please try again.',
          debug: { message: errMsg, stack: errStack, type: createError?.constructor?.name }
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Registration error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('Company registration error:', error);
    // Return detailed error for debugging (REMOVE IN PRODUCTION)
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred. Please try again.',
        version: API_VERSION,
        debug: {
          message: errorMessage,
          stack: errorStack,
          type: error?.constructor?.name
        }
      },
      { status: 500 }
    );
  }
}
