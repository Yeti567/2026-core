/**
 * Forgot Password API Route
 * 
 * POST: Send password reset email with magic link
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';


// Rate limiting
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 3; // 3 attempts per 15 minutes per email

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limit by email
    if (!checkRateLimit(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Too many password reset requests. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const supabase = getServiceClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (request.headers.get('origin') ?? 'http://localhost:3000');

    // Check if user exists (but don't reveal this to the client)
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === normalizedEmail
    );

    if (!userExists) {
      // Don't reveal that the user doesn't exist - just pretend we sent the email
      // This prevents email enumeration attacks
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    // Generate password reset link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: {
        redirectTo: `${baseUrl}/reset-password?type=recovery`,
      },
    });

    if (linkError) {
      console.error('Failed to generate reset link:', linkError);
      return NextResponse.json(
        { error: 'Failed to send reset link. Please try again.' },
        { status: 500 }
      );
    }

    // Send the email via Resend (or use Supabase's built-in email)
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (resendApiKey && linkData?.properties?.action_link) {
      try {
        await sendPasswordResetEmail({
          to: normalizedEmail,
          resetLink: linkData.properties.action_link,
          baseUrl,
        });
      } catch (emailError) {
        console.error('Failed to send email via Resend:', emailError);
        // Fall through - Supabase may have sent its own email
      }
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

async function sendPasswordResetEmail({
  to,
  resetLink,
  baseUrl,
}: {
  to: string;
  resetLink: string;
  baseUrl: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.log('Resend API key not configured');
    return;
  }

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - COR Pathways</title>
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
      <h2 style="margin: 0 0 16px 0; font-size: 22px; color: #ededed;">Reset Your Password</h2>
      
      <p style="margin: 0 0 24px 0; color: #a3a3a3; line-height: 1.6;">
        We received a request to reset your password. Click the button below to create a new password:
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Reset Password
        </a>
      </div>

      <p style="margin: 24px 0 0 0; color: #737373; font-size: 14px; text-align: center;">
        This link will expire in 1 hour.
      </p>

      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #262626;">
        <p style="margin: 0; color: #737373; font-size: 13px;">
          If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; color: #737373; font-size: 12px;">
      <p style="margin: 0;">
        <a href="${baseUrl}" style="color: #3b82f6; text-decoration: none;">COR Pathways</a> - Safety Management Platform
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
      subject: 'Reset Your Password - COR Pathways',
      html: emailHtml,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}
