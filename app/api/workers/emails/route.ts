/**
 * Workers Emails API Route
 * 
 * GET: Returns list of existing worker emails for the current company
 * Used for duplicate checking during CSV upload
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuth, type AuthError } from '@/lib/auth/helpers';
import { rateLimitByUser, createRateLimitHeaders } from '@/lib/utils/rate-limit';

export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    const user = await requireAuth();
    const supabase = createRouteHandlerClient();

    // Rate limiting: 30 requests per minute per user (prevent DoS on email lookup)
    const rateLimitResult = await rateLimitByUser(user.userId, 30, '1m');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          emails: [],
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

    // Get all worker emails for this company
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('email')
      .eq('company_id', user.companyId)
      .not('email', 'is', null);

    if (workersError) {
      console.error('Failed to fetch worker emails:', workersError);
      return NextResponse.json({ emails: [] });
    }

    // Also get pending invitation emails
    const { data: invitations, error: invitationsError } = await supabase
      .from('worker_invitations')
      .select('email')
      .eq('company_id', user.companyId)
      .eq('status', 'pending');

    if (invitationsError) {
      console.error('Failed to fetch invitation emails:', invitationsError);
    }

    // Combine and deduplicate emails
    const workerEmails = workers?.map((w: { email: string | null }) => w.email?.toLowerCase()).filter(Boolean) || [];
    const invitationEmails = invitations?.map((i: { email: string | null }) => i.email?.toLowerCase()).filter(Boolean) || [];
    const allEmails = [...new Set([...workerEmails, ...invitationEmails])];

    return NextResponse.json({ emails: allEmails });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message, emails: [] },
      { status: authError.status || 500 }
    );
  }
}
