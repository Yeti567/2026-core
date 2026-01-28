/**
 * Revoke Invitation API Route
 * 
 * POST: Revoke a pending invitation
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';

export const dynamic = 'force-dynamic';


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

    // Only pending invitations can be revoked
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: 'Cannot revoke an accepted invitation' },
        { status: 400 }
      );
    }

    if (invitation.status === 'revoked') {
      return NextResponse.json(
        { error: 'Invitation is already revoked' },
        { status: 400 }
      );
    }

    // Update status to revoked
    const { error: updateError } = await supabase
      .from('worker_invitations')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to revoke invitation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
