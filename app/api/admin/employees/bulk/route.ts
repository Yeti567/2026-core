/**
 * Admin Employees Bulk Actions API Route
 * 
 * POST: Perform bulk actions on employees (deactivate, change role)
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import type { UserRole } from '@/lib/db/types';

export const dynamic = 'force-dynamic';


interface BulkRequest {
  action: 'deactivate' | 'activate' | 'change_role';
  ids: string[];
  role?: UserRole;
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const supabase = createRouteHandlerClient();

    const body: BulkRequest = await request.json();
    const { action, ids, role } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'No employee IDs provided' },
        { status: 400 }
      );
    }

    if (ids.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 employees per bulk action' },
        { status: 400 }
      );
    }

    // Get the employees to check for first_admin
    const { data: employees, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, first_admin, role')
      .eq('company_id', user.companyId)
      .in('id', ids);

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      );
    }

    // Type assertion for employees
    const employeesData = (employees || []) as Array<{
      id: string;
      first_admin: boolean;
      role: string;
    }>;

    // Filter out first_admin from bulk actions
    const firstAdminIds = new Set(
      employeesData.filter(e => e.first_admin).map(e => e.id)
    );
    const validIds = ids.filter(id => !firstAdminIds.has(id));

    if (validIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid employees to update (first admin cannot be modified)' },
        { status: 400 }
      );
    }

    let updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    switch (action) {
      case 'deactivate':
        // Check that at least one admin will remain active
        const adminIds = employeesData.filter(e => e.role === 'admin' && validIds.includes(e.id)).map(e => e.id);
        
        if (adminIds.length > 0) {
          const { count } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', user.companyId)
            .eq('role', 'admin')
            .eq('is_active', true)
            .not('id', 'in', `(${adminIds.join(',')})`);

          if (!count || count === 0) {
            return NextResponse.json(
              { error: 'Cannot deactivate all admins. At least one must remain active.' },
              { status: 400 }
            );
          }
        }

        updateData.is_active = false;
        break;

      case 'activate':
        updateData.is_active = true;
        break;

      case 'change_role':
        if (!role) {
          return NextResponse.json(
            { error: 'Role is required for change_role action' },
            { status: 400 }
          );
        }
        updateData.role = role;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update(updateData as Record<string, unknown>)
      .in('id', validIds);

    if (updateError) {
      console.error('Bulk update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update employees' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: validIds.length,
      skipped: firstAdminIds.size,
    });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
