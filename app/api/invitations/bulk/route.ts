/**
 * Bulk Invitations API Route
 * 
 * POST: Create multiple invitations at once from CSV upload
 * Generates tokens, inserts into worker_invitations table,
 * and optionally sends emails via configured email provider
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import type { UserRole } from '@/lib/db/types';
import { rateLimitByUser, createRateLimitHeaders } from '@/lib/utils/rate-limit';

export const dynamic = 'force-dynamic';


interface EmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  role?: UserRole;
  phone?: string;
  hireDate?: string;
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const supabase = createRouteHandlerClient();

    // Rate limiting: 3 bulk uploads per hour per user (prevent email abuse)
    const rateLimitResult = await rateLimitByUser(user.userId, 3, '1h');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many bulk invitation uploads. Please try again later.',
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
    const { employees } = body as { employees: EmployeeInput[] };

    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      return NextResponse.json(
        { error: 'No employees provided' },
        { status: 400 }
      );
    }

    if (employees.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 employees per upload' },
        { status: 400 }
      );
    }

    const validRoles: UserRole[] = ['admin', 'internal_auditor', 'supervisor', 'worker'];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Get base URL for magic links
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (request.headers.get('origin') ?? 'http://localhost:3000');

    // Get existing emails to check for duplicates
    const emails = employees.map(e => e.email.toLowerCase());
    
    const [{ data: existingWorkers }, { data: existingInvitations }] = await Promise.all([
      supabase
        .from('workers')
        .select('email')
        .eq('company_id', user.companyId)
        .in('email', emails),
      supabase
        .from('worker_invitations')
        .select('email')
        .eq('company_id', user.companyId)
        .eq('status', 'pending')
        .in('email', emails),
    ]);

    const existingEmails = new Set([
      ...(existingWorkers?.map(w => w.email?.toLowerCase()) || []),
      ...(existingInvitations?.map(i => i.email?.toLowerCase()) || []),
    ]);

    // Get company name for emails
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', user.companyId)
      .single();

    // Get admin name for emails
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, display_name')
      .eq('user_id', user.userId)
      .single();

    const adminName = adminProfile?.display_name || 
      (adminProfile?.first_name && adminProfile?.last_name 
        ? `${adminProfile.first_name} ${adminProfile.last_name}` 
        : 'Your administrator');

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      invitations: [] as { email: string; token?: string }[],
    };

    // Process each employee
    for (const emp of employees) {
      const email = emp.email?.toLowerCase().trim();

      // Validate
      if (!emp.firstName?.trim() || !emp.lastName?.trim() || !email) {
        results.failed++;
        results.errors.push(`Missing required fields for ${email || 'unknown'}`);
        continue;
      }

      if (!emailRegex.test(email)) {
        results.failed++;
        results.errors.push(`Invalid email format: ${email}`);
        continue;
      }

      if (!emp.position?.trim()) {
        results.failed++;
        results.errors.push(`Missing position for ${email}`);
        continue;
      }

      if (existingEmails.has(email)) {
        results.failed++;
        results.errors.push(`Already exists or has pending invitation: ${email}`);
        continue;
      }

      const role = validRoles.includes(emp.role as UserRole) ? emp.role : 'worker';

      try {
        // Generate token using database function
        const { data: token, error: tokenError } = await supabase
          .rpc('generate_invitation_token');

        if (tokenError || !token) {
          results.failed++;
          results.errors.push(`Failed to generate token for ${email}`);
          continue;
        }

        // Create invitation in worker_invitations table
        const { error: insertError } = await supabase
          .from('worker_invitations')
          .insert({
            company_id: user.companyId,
            email,
            first_name: emp.firstName.trim(),
            last_name: emp.lastName.trim(),
            position: emp.position.trim(),
            role,
            invitation_token: token,
            invited_by: user.userId,
          });

        if (insertError) {
          results.failed++;
          results.errors.push(`Failed to invite ${email}: ${insertError.message}`);
          continue;
        }

        // Track success
        results.success++;
        existingEmails.add(email); // Prevent duplicates in same batch

        // Store for potential email sending
        results.invitations.push({
          email,
          token: process.env.NODE_ENV === 'development' ? token : undefined,
        });

        // TODO: Send invitation email via Resend or other provider
        // Example email content:
        /*
        await sendEmail({
          to: email,
          subject: `You've been invited to join ${company?.name || 'a company'} on COR Pathways`,
          html: `
            <p>Hi ${emp.firstName},</p>
            <p>${adminName} has invited you to join <strong>${company?.name}</strong> on COR Pathways - our health & safety management platform.</p>
            <p><strong>Your role:</strong> ${role}<br/>
            <strong>Position:</strong> ${emp.position}</p>
            <p>Click the link below to accept your invitation and complete your profile:</p>
            <p><a href="${baseUrl}/accept-invite/${token}">Accept Invitation</a></p>
            <p>This link expires in 7 days.</p>
            <p>If you have questions, contact your safety manager.</p>
            <p>- COR Pathways Team</p>
          `,
        });
        */

      } catch (err) {
        results.failed++;
        results.errors.push(`Error processing ${email}`);
      }
    }

    // In development, include magic links for testing
    const response: any = {
      success: results.success,
      failed: results.failed,
      errors: results.errors.slice(0, 10), // Limit error messages
    };

    if (process.env.NODE_ENV === 'development') {
      response.magicLinks = results.invitations
        .filter(i => i.token)
        .map(i => ({
          email: i.email,
          link: `${baseUrl}/accept-invite/${i.token}`,
        }));
    }

    return NextResponse.json(response);
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
