/**
 * Admin Employees Export API Route
 * 
 * GET: Export all employees as CSV
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import type { UserProfile } from '@/lib/db/types';

export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const supabase = createRouteHandlerClient();

    // Get company name for file
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', user.companyId)
      .single();

    // Get all employees
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('company_id', user.companyId)
      .order('last_name', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      );
    }

    // Type assertion for profiles
    const profilesData = (profiles || []) as UserProfile[];

    // Get emails from invitations
    const invitationIds = profilesData.filter(p => p.invitation_id).map(p => p.invitation_id).filter((id): id is string => id !== null);
    let emailMap: Record<string, string> = {};
    if (invitationIds.length > 0) {
      const { data: invitations } = await supabase
        .from('worker_invitations')
        .select('id, email')
        .in('id', invitationIds);
      
      if (invitations) {
        const invitationsData = invitations as Array<{ id: string; email: string }>;
        emailMap = invitationsData.reduce((acc, inv) => {
          acc[inv.id] = inv.email;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    // Also get emails from workers
    const userIds = profilesData.map(p => p.user_id);
    let workerEmailMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: workers } = await supabase
        .from('workers')
        .select('user_id, email')
        .in('user_id', userIds)
        .not('email', 'is', null);
      
      if (workers) {
        const workersData = workers as Array<{ user_id: string; email: string }>;
        workerEmailMap = workersData.reduce((acc, w) => {
          if (w.user_id && w.email) {
            acc[w.user_id] = w.email;
          }
          return acc;
        }, {} as Record<string, string>);
      }
    }

    // Build CSV
    const headers = ['First Name', 'Last Name', 'Email', 'Position', 'Role', 'Phone', 'Hire Date', 'Status', 'Last Login'];
    const rows = profilesData.map(e => [
      e.first_name || '',
      e.last_name || '',
      (e.invitation_id && emailMap[e.invitation_id]) || workerEmailMap[e.user_id] || '',
      e.position || '',
      e.role,
      e.phone || '',
      e.hire_date || '',
      e.is_active ? 'Active' : 'Inactive',
      e.last_login ? new Date(e.last_login).toLocaleDateString() : 'Never',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const companySlug = (company?.name || 'company').toLowerCase().replace(/\s+/g, '_');
    const date = new Date().toISOString().split('T')[0];
    const filename = `${companySlug}_employees_${date}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
