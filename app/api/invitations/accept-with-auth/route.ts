/**
 * Invitation Acceptance with Auth Creation API Route
 * 
 * POST: Accept an invitation, create auth user, send magic link, complete profile
 * This is a public endpoint (no auth required) since the user doesn't have an account yet
 * 
 * Flow:
 * 1. Validate invitation token
 * 2. Create auth.users record via Supabase Admin
 * 3. Send magic link email for passwordless login
 * 4. Create user_profiles record
 * 5. Update worker_invitations status
 * 6. Log acceptance in audit trail
 * 7. Send welcome email via Resend
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';


// =============================================================================
// RATE LIMITING (Simple in-memory store - use Redis in production)
// =============================================================================

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // 5 attempts per hour per IP

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - record.count };
}

// =============================================================================
// SERVICE CLIENT
// =============================================================================

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// =============================================================================
// TYPES
// =============================================================================

interface AcceptanceRequest {
  token: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  termsAccepted: boolean;
  profilePhoto?: string;
}

interface InvitationDetails {
  id: string;
  company_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  position: string;
  status: string;
  expires_at: string;
  company_name: string;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: Request) {
  // Get client IP for rate limiting and logging
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0] || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Check rate limit
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many acceptance attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(RATE_LIMIT_WINDOW / 1000)),
        },
      }
    );
  }

  try {
    const body: AcceptanceRequest = await request.json();
    const { token, phone, emergencyContactName, emergencyContactPhone, termsAccepted, profilePhoto } = body;

    // ==========================================================================
    // VALIDATION
    // ==========================================================================

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    if (!phone || phone.length !== 10) {
      return NextResponse.json(
        { error: 'Valid phone number is required' },
        { status: 400 }
      );
    }

    if (!emergencyContactName?.trim()) {
      return NextResponse.json(
        { error: 'Emergency contact name is required' },
        { status: 400 }
      );
    }

    if (!emergencyContactPhone || emergencyContactPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Valid emergency contact phone is required' },
        { status: 400 }
      );
    }

    if (!termsAccepted) {
      return NextResponse.json(
        { error: 'You must accept the terms and conditions' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // ==========================================================================
    // STEP 1: VALIDATE INVITATION TOKEN
    // ==========================================================================

    const { data: invitationData, error: invitationError } = await supabase
      .from('worker_invitations')
      .select(`
        id,
        company_id,
        email,
        first_name,
        last_name,
        role,
        position,
        status,
        expires_at,
        companies!inner(name, registration_status)
      `)
      .eq('invitation_token', token)
      .single();

    if (invitationError || !invitationData) {
      await logAcceptanceAttempt(supabase, ip, userAgent, token, false, 'invalid_token');
      return NextResponse.json(
        { error: 'Invalid invitation link' },
        { status: 404 }
      );
    }

    // Extract company data with type safety
    interface CompaniesRelation {
      name?: string;
      registration_status?: string;
    }
    const companies = (invitationData as { companies?: CompaniesRelation }).companies;
    const companyName = companies?.name || 'Unknown Company';
    const companyStatus = companies?.registration_status;

    // Create typed invitation object
    const invitation = {
      ...invitationData,
      companies: undefined, // Remove to avoid confusion
    };

    // Check company status
    if (companyStatus === 'suspended') {
      await logAcceptanceAttempt(supabase, ip, userAgent, token, false, 'company_suspended');
      return NextResponse.json(
        { error: 'Company account has been suspended. Please contact support.' },
        { status: 403 }
      );
    }

    // Check invitation status
    if (invitation.status === 'accepted') {
      await logAcceptanceAttempt(supabase, ip, userAgent, token, false, 'already_accepted');
      return NextResponse.json(
        { error: 'This invitation has already been accepted. Please login instead.' },
        { status: 400 }
      );
    }

    if (invitation.status === 'revoked') {
      await logAcceptanceAttempt(supabase, ip, userAgent, token, false, 'revoked');
      return NextResponse.json(
        { error: 'This invitation has been revoked.' },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from('worker_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      await logAcceptanceAttempt(supabase, ip, userAgent, token, false, 'expired');
      return NextResponse.json(
        { error: 'This invitation has expired. Please contact your administrator for a new invitation.' },
        { status: 400 }
      );
    }

    // ==========================================================================
    // STEP 2: CHECK IF USER ALREADY EXISTS
    // ==========================================================================

    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(
      u => u.email?.toLowerCase() === invitation.email.toLowerCase()
    );

    let userId: string;

    if (userExists) {
      // User already has an auth account - check if they have a profile
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', userExists.id)
        .single();

      if (existingProfile) {
        await logAcceptanceAttempt(supabase, ip, userAgent, token, false, 'profile_exists');
        return NextResponse.json(
          { error: 'An account already exists with this email. Please login instead.' },
          { status: 400 }
        );
      }

      userId = userExists.id;
    } else {
      // ==========================================================================
      // STEP 3: CREATE AUTH USER
      // ==========================================================================

      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: invitation.email,
        email_confirm: true,
        user_metadata: {
          first_name: invitation.first_name,
          last_name: invitation.last_name,
          invitation_id: invitation.id,
        },
      });

      if (createUserError || !newUser?.user) {
        console.error('Failed to create user:', createUserError);
        await logAcceptanceAttempt(supabase, ip, userAgent, token, false, 'user_creation_failed');
        return NextResponse.json(
          { error: 'Failed to create account. Please try again.' },
          { status: 500 }
        );
      }

      userId = newUser.user.id;
    }

    // ==========================================================================
    // STEP 4: GENERATE PASSWORD SETUP LINK
    // ==========================================================================

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (request.headers.get('origin') ?? 'http://localhost:3000');

    // Generate a recovery link that allows the user to set their password
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: invitation.email,
      options: {
        redirectTo: `${baseUrl}/reset-password?type=invite`,
      },
    });

    if (linkError) {
      console.error('Failed to generate password setup link:', linkError);
      // Continue anyway - user can request a password reset from login page
    }

    const passwordSetupLink = linkData?.properties?.action_link;

    // ==========================================================================
    // STEP 5: CREATE USER PROFILE
    // ==========================================================================

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        company_id: invitation.company_id,
        role: invitation.role,
        invitation_id: invitation.id,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
        position: invitation.position,
        phone: formatPhone(phone),
        emergency_contact_name: emergencyContactName.trim(),
        emergency_contact_phone: formatPhone(emergencyContactPhone),
        display_name: `${invitation.first_name} ${invitation.last_name}`,
        is_active: true,
      })
      .select('id')
      .single();

    if (profileError) {
      console.error('Failed to create profile:', profileError);
      await logAcceptanceAttempt(supabase, ip, userAgent, token, false, 'profile_creation_failed');
      return NextResponse.json(
        { error: 'Failed to create profile. Please try again.' },
        { status: 500 }
      );
    }

    // ==========================================================================
    // STEP 6: CREATE WORKER RECORD (if applicable)
    // ==========================================================================

    const { data: worker } = await supabase
      .from('workers')
      .insert({
        company_id: invitation.company_id,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
        email: invitation.email,
        position: invitation.position,
        phone: formatPhone(phone),
        emergency_contact_name: emergencyContactName.trim(),
        emergency_contact_phone: formatPhone(emergencyContactPhone),
        user_id: userId,
        invitation_id: invitation.id,
        profile_completed: true,
      })
      .select('id')
      .single();

    // ==========================================================================
    // STEP 7: UPDATE INVITATION STATUS
    // ==========================================================================

    await supabase
      .from('worker_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    // ==========================================================================
    // STEP 8: LOG ACCEPTANCE
    // ==========================================================================

    await logAcceptanceAttempt(supabase, ip, userAgent, token, true, 'success', userId);

    // Add to evidence chain for audit
    await supabase.from('evidence_chain').insert({
      company_id: invitation.company_id,
      audit_element: 'worker_onboarding',
      evidence_type: 'invitation_accepted',
      evidence_id: invitation.id,
      worker_id: worker?.id || null,
    });

    // ==========================================================================
    // STEP 9: SEND WELCOME EMAIL WITH PASSWORD SETUP LINK (via Resend)
    // ==========================================================================

    try {
      await sendWelcomeEmail({
        to: invitation.email,
        firstName: invitation.first_name,
        companyName,
        passwordSetupLink,
        baseUrl,
      });
    } catch (emailError) {
      // Log but don't fail the request
      console.error('Failed to send welcome email:', emailError);
    }

    // ==========================================================================
    // SUCCESS RESPONSE
    // ==========================================================================

    return NextResponse.json({
      success: true,
      profileId: profile.id,
      workerId: worker?.id,
      message: 'Invitation accepted successfully. Check your email for a magic link to log in.',
    });

  } catch (error) {
    console.error('Invitation acceptance error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

async function logAcceptanceAttempt(
  supabase: ReturnType<typeof getServiceClient>,
  ip: string,
  userAgent: string,
  token: string,
  success: boolean,
  reason: string,
  userId?: string
) {
  try {
    // Log to a general audit table or create a specific acceptance_logs table
    // For now, we'll use a simple approach
    console.log('Acceptance attempt:', {
      ip,
      userAgent: userAgent.substring(0, 200),
      token: token.substring(0, 10) + '...',
      success,
      reason,
      userId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to log acceptance attempt:', err);
  }
}

async function sendWelcomeEmail({
  to,
  firstName,
  companyName,
  passwordSetupLink,
  baseUrl,
}: {
  to: string;
  firstName: string;
  companyName: string;
  passwordSetupLink?: string;
  baseUrl: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.log('Resend API key not configured, skipping welcome email');
    return;
  }

  // Escape user-provided content to prevent XSS
  const { escapeHtml } = await import('@/lib/utils/html-escape');
  const safeFirstName = escapeHtml(firstName);
  const safeCompanyName = escapeHtml(companyName);
  const safeBaseUrl = escapeHtml(baseUrl);

  // Use the password setup link if available, otherwise link to forgot-password page
  const actionLink = passwordSetupLink || `${baseUrl}/forgot-password`;
  const actionText = passwordSetupLink ? 'Set Your Password' : 'Set Up Password';

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${safeCompanyName} on COR Pathways</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a; color: #ededed;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="display: inline-block; padding: 16px 24px; background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 12px;">
        <h1 style="margin: 0; font-size: 24px; color: white;">COR Pathways</h1>
      </div>
    </div>

    <!-- Main Content -->
    <div style="background-color: #171717; border: 1px solid #262626; border-radius: 12px; padding: 32px;">
      <h2 style="margin: 0 0 16px 0; font-size: 22px; color: #4ade80;">Welcome aboard, ${safeFirstName}! 🎉</h2>
      
      <p style="margin: 0 0 24px 0; color: #a3a3a3; line-height: 1.6;">
        Your COR Pathways account is now active. You're now part of <strong style="color: #ededed;">${safeCompanyName}</strong>'s safety team.
      </p>

      <div style="background-color: #0a0a0a; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 16px 0; color: #ededed; font-size: 16px; font-weight: 500;">
          Complete your account setup:
        </p>
        <a href="${actionLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          ${actionText}
        </a>
        <p style="margin: 16px 0 0 0; color: #737373; font-size: 12px;">
          This link expires in 1 hour. If it expires, visit the login page and click "Forgot password?"
        </p>
      </div>

      <h3 style="margin: 24px 0 16px 0; font-size: 16px; color: #ededed;">What you can do:</h3>
      <ul style="margin: 0; padding: 0 0 0 20px; color: #a3a3a3; line-height: 1.8;">
        <li>Complete daily hazard assessments</li>
        <li>Submit incident reports</li>
        <li>View your training certificates</li>
        <li>Access company safety procedures</li>
      </ul>

      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #262626;">
        <p style="margin: 0; color: #737373; font-size: 14px;">
          Questions? Contact your supervisor or safety manager.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; color: #737373; font-size: 12px;">
      <p style="margin: 0 0 8px 0;">Stay safe!</p>
      <p style="margin: 0;"><strong style="color: #a3a3a3;">${safeCompanyName} Safety Team</strong></p>
      <p style="margin: 16px 0 0 0;">
        Powered by <a href="${safeBaseUrl}" style="color: #3b82f6; text-decoration: none;">COR Pathways</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'COR Pathways <noreply@corpathways.com>',
      to: [to],
      subject: `Welcome to ${safeCompanyName} - Set Your Password`,
      html: emailHtml,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}
