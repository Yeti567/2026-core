/**
 * Admin Employee by ID API Route
 * 
 * GET: Get single employee details
 * PATCH: Update employee (role, position, phone, is_active)
 * DELETE: Delete employee (only if no forms submitted)
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthWithRole(['admin', 'internal_auditor', 'super_admin']);
    const supabase = createRouteHandlerClient();

    const { data: employee, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', params.id)
      .eq('company_id', user.companyId)
      .single();

    if (error || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ employee });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const supabase = createRouteHandlerClient();

    const body = await request.json();
    const { role, position, phone, is_active } = body;

    // Get the employee first to check permissions
    const { data: employee, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', params.id)
      .eq('company_id', user.companyId)
      .single();

    if (fetchError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Type assertion for employee data
    const employeeData = employee as {
      id: string;
      first_admin: boolean;
      role: string;
      user_id: string;
      company_id: string;
      [key: string]: unknown;
    };

    // Cannot change first admin's role or deactivate them
    if (employeeData.first_admin) {
      if (role !== undefined && role !== employeeData.role) {
        return NextResponse.json(
          { error: 'Cannot change the role of the first admin' },
          { status: 400 }
        );
      }
      if (is_active === false) {
        return NextResponse.json(
          { error: 'Cannot deactivate the first admin' },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (role !== undefined) updates.role = role;
    if (position !== undefined) updates.position = position;
    if (phone !== undefined) updates.phone = phone;
    if (is_active !== undefined) updates.is_active = is_active;
    updates.updated_at = new Date().toISOString();

    // If deactivating, ensure at least one admin remains
    if (is_active === false && employeeData.role === 'admin') {
      const { count } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.companyId)
        .eq('role', 'admin')
        .eq('is_active', true)
        .neq('id', params.id);

      if (!count || count === 0) {
        return NextResponse.json(
          { error: 'Cannot deactivate the last active admin' },
          { status: 400 }
        );
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('user_profiles')
      .update(updates as Record<string, unknown>)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update employee' },
        { status: 500 }
      );
    }

    return NextResponse.json({ employee: updated });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const supabase = createRouteHandlerClient();

    // Get the employee first
    const { data: employee, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', params.id)
      .eq('company_id', user.companyId)
      .single();

    if (fetchError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Type assertion for employee data
    const employeeData = employee as {
      id: string;
      first_admin: boolean;
      user_id: string;
      [key: string]: unknown;
    };

    // Cannot delete first admin
    if (employeeData.first_admin) {
      return NextResponse.json(
        { error: 'Cannot delete the first admin' },
        { status: 400 }
      );
    }

    // Check if employee has submitted any forms
    const { count: formCount } = await supabase
      .from('forms')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', user.companyId)
      .eq('worker_id', employeeData.user_id);

    if (formCount && formCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete employee who has submitted forms. Deactivate instead.' },
        { status: 400 }
      );
    }

    // Delete the profile
    const { error: deleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete employee' },
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
