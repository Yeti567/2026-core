/**
 * Resend Invitation API Route
 * 
 * POST: Resend an invitation email with a new token
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const supabase = createRouteHandlerClient();

    // Get the invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('worker_invitations')
      .select('*')
      .eq('id', params.id)
      .eq('company_id', user.companyId)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Only pending or expired invitations can be resent
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: 'Cannot resend an accepted invitation' },
        { status: 400 }
      );
    }

    if (invitation.status === 'revoked') {
      return NextResponse.json(
        { error: 'Cannot resend a revoked invitation' },
        { status: 400 }
      );
    }

    // Generate new token
    const { data: token, error: tokenError } = await supabase
      .rpc('generate_invitation_token');

    if (tokenError || !token) {
      return NextResponse.json(
        { error: 'Failed to generate new token' },
        { status: 500 }
      );
    }

    // Update invitation with new token and reset expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const { error: updateError } = await supabase
      .from('worker_invitations')
      .update({
        invitation_token: token,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update invitation' },
        { status: 500 }
      );
    }

    // TODO: Send the invitation email
    // In production, this would send an email with the new invitation link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (request.headers.get('origin') ?? 'http://localhost:3000');
    const invitationLink = `${baseUrl}/accept-invite/${token}`;

    // For now, return the link in development
    return NextResponse.json({
      success: true,
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
