/**
 * Invitations API Route
 * 
 * GET: List all invitations for the current company
 * POST: Create a single invitation
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import type { UserRole } from '@/lib/db/types';
import { rateLimitByUser, createRateLimitHeaders } from '@/lib/utils/rate-limit';

export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    const user = await requireAuthWithRole(['admin', 'internal_auditor', 'super_admin']);
    const supabase = createRouteHandlerClient();

    const { data: invitations, error } = await supabase
      .from('worker_invitations')
      .select('*')
      .eq('company_id', user.companyId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Failed to fetch invitations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      );
    }

    return NextResponse.json({ invitations });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const supabase = createRouteHandlerClient();

    // Rate limiting: 10 invitations per hour per user (prevent email abuse)
    const rateLimitResult = await rateLimitByUser(user.userId, 10, '1h');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many invitations sent. Please try again later.',
        },
        {
          status: 429,
          headers: {
            ...createRateLimitHeaders(rateLimitResult),
            'Retry-After': (rateLimitResult.reset - Math.floor(Date.now() / 1000)).toString(),
          },
        }
      );
    }

    const body = await request.json();
    const { firstName, lastName, email, phone, position, role = 'worker', responsibilities } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !position) {
      return NextResponse.json(
        { error: 'First name, last name, email, and position are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: UserRole[] = ['admin', 'internal_auditor', 'supervisor', 'worker'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if there's already a pending invitation for this email
    const { data: existingInvitation } = await supabase
      .from('worker_invitations')
      .select('id')
      .eq('company_id', user.companyId)
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'A pending invitation already exists for this email' },
        { status: 409 }
      );
    }

    // Check if user already exists in the company
    const { data: existingWorker } = await supabase
      .from('workers')
      .select('id')
      .eq('company_id', user.companyId)
      .eq('email', normalizedEmail)
      .single();

    if (existingWorker) {
      return NextResponse.json(
        { error: 'An employee with this email already exists in your company' },
        { status: 409 }
      );
    }

    // Generate token using database function
    const { data: token, error: tokenError } = await supabase
      .rpc('generate_invitation_token');

    if (tokenError || !token) {
      console.error('Token generation error:', tokenError);
      return NextResponse.json(
        { error: 'Failed to generate invitation token' },
        { status: 500 }
      );
    }

    // Create the invitation
    const invitationData: any = {
      company_id: user.companyId,
      email: normalizedEmail,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      position: position.trim(),
      role,
      invitation_token: token,
      invited_by: user.userId,
    };

    // Add optional fields if provided
    if (phone) {
      invitationData.phone = phone.trim();
    }
    if (responsibilities) {
      invitationData.responsibilities = responsibilities.trim();
    }

    const { data: invitation, error: insertError } = await supabase
      .from('worker_invitations')
      .insert(invitationData)
      .select()
      .single();

    if (insertError) {
      console.error('Invitation insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      );
    }

    // Generate invitation link URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (request.headers.get('origin') ?? 'http://localhost:3000');
    const invitationLink = `${baseUrl}/accept-invite/${token}`;

    // Role labels for email
    const ROLE_LABELS: Record<string, string> = {
      admin: 'Administrator',
      supervisor: 'Supervisor',
      internal_auditor: 'Internal Auditor',
      worker: 'Worker',
      super_admin: 'Super Administrator',
    };

    // Get company name and admin name for email
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', user.companyId)
      .single();

    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('display_name, first_name, last_name')
      .eq('id', user.userId)
      .single();

    const adminName = adminProfile?.display_name || 
      `${adminProfile?.first_name || ''} ${adminProfile?.last_name || ''}`.trim() || 
      'Your administrator';

    // Send invitation email (if email service is configured)
    try {
      const emailProvider = process.env.EMAIL_PROVIDER || 'resend';
      const apiKey = process.env.RESEND_API_KEY;

      if (apiKey && emailProvider === 'resend') {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'COR Pathways <noreply@corpathways.com>',
            to: normalizedEmail,
            subject: `You've been invited to join ${company?.name || 'a company'} on COR Pathways`,
            // Safe: role is validated against validRoles array
             
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #6366f1;">You've been invited to join COR Pathways</h2>
                <p>Hi ${firstName.trim()},</p>
                <p>${adminName} has invited you to join <strong>${company?.name || 'a company'}</strong> on COR Pathways - our health & safety management platform.</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  ${/* Safe: role is validated against validRoles array before use */''/* eslint-disable-next-line security/detect-object-injection */}
                  <p style="margin: 5px 0;"><strong>Your Role:</strong> ${ROLE_LABELS[role] || role}</p>
                  <p style="margin: 5px 0;"><strong>Position:</strong> ${position.trim()}</p>
                  ${phone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${phone}</p>` : ''}
                  ${responsibilities ? `<p style="margin: 5px 0;"><strong>Responsibilities:</strong> ${responsibilities}</p>` : ''}
                </div>
                <p>Click the link below to accept your invitation and complete your profile:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${invitationLink}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
                </div>
                <p style="color: #6b7280; font-size: 14px;">This link expires in 7 days.</p>
                <p style="color: #6b7280; font-size: 14px;">If you have questions, contact your safety manager.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #9ca3af; font-size: 12px;">- COR Pathways Team</p>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          console.error('Failed to send invitation email:', errorData);
          // Don't fail the request if email fails - invitation is still created
        } else {
          console.log(`Invitation email sent to ${normalizedEmail}`);
        }
      } else {
        console.log('Email service not configured - invitation created but email not sent');
        console.log(`Invitation link (dev only): ${invitationLink}`);
      }
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the request if email fails - invitation is still created
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        firstName: invitation.first_name,
        lastName: invitation.last_name,
        phone: invitation.phone,
        position: invitation.position,
        role: invitation.role,
        responsibilities: invitation.responsibilities,
        status: invitation.status,
        expiresAt: invitation.expires_at,
      },
      // Only include invitationLink in development
      ...(process.env.NODE_ENV === 'development' && { invitationLink }),
    });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
