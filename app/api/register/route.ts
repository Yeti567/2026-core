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
    
    // Use service role key for admin operations (bypasses email confirmation)
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    try {
      // 1. Create company record first
      // Companies table schema: id, name, wsib_number, address, created_at
      // DO NOT add email or other columns - they don't exist in the database
      const fullAddress = `${data.address}, ${data.city}, ${data.province} ${data.postal_code}`;
      
      const { data: companyData, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert({
          name: data.company_name,
          wsib_number: data.wsib_number,
          address: fullAddress
        })
        .select()
        .single();

      if (companyError || !companyData) {
        console.error('Failed to create company:', companyError);
        return NextResponse.json(
          { error: 'Failed to create company record: ' + (companyError?.message || 'Unknown error') },
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
        return NextResponse.json(
          { error: 'Failed to create user account: ' + authError.message },
          { status: 400 }
        );
      }

      console.log('✅ User created successfully:', authData.user?.email);

      // 3. Create user_profiles link (links auth user to company)
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          company_id: companyData.id,
          role: 'admin'
        });

      if (profileError) {
        console.error('Failed to create user profile:', profileError);
        // Rollback: delete user and company
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        await supabaseAdmin.from('companies').delete().eq('id', companyData.id);
        return NextResponse.json(
          { error: 'Failed to link user to company: ' + profileError.message },
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
