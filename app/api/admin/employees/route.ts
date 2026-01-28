/**
 * Admin Employees API Route
 * 
 * GET: List employees with filtering, sorting, and pagination
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import type { UserRole, UserProfile } from '@/lib/db/types';
import { createSafeOrFilter } from '@/lib/utils/search-sanitizer';
import { handleAuthError, handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


export async function GET(request: Request) {
  try {
    const user = await requireAuthWithRole(['admin', 'internal_auditor', 'super_admin']);
    const supabase = createRouteHandlerClient();

    // Parse query params
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '25');
    const search = url.searchParams.get('search') || '';
    const role = url.searchParams.get('role') || 'all';
    const status = url.searchParams.get('status') || 'all';
    const sort = url.searchParams.get('sort') || 'name';
    const direction = url.searchParams.get('direction') || 'asc';

    const offset = (page - 1) * limit;

    // Build query - Note: We can't directly join with auth.users from client
    // So we'll get emails from the worker_invitations table if available
    let query = supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .eq('company_id', user.companyId);

    // Apply search filter (sanitized to prevent SQL injection)
    if (search) {
      const safeFilter = createSafeOrFilter(['first_name', 'last_name'], search);
      if (safeFilter) {
        query = query.or(safeFilter);
      }
    }

    // Apply role filter
    if (role !== 'all') {
      query = query.eq('role', role);
    }

    // Apply status filter
    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    // Apply sorting
    const sortColumn = sort === 'name' ? 'first_name' : sort === 'email' ? 'first_name' : sort;
    query = query.order(sortColumn, { ascending: direction === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: profiles, error, count } = await query;

    if (error) {
      console.error('Failed to fetch employees:', error);
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      );
    }

    // Type assertion for profiles
    const profilesData = (profiles || []) as UserProfile[];

    // Get invitation IDs that have emails
    const invitationIds = profilesData.filter(p => p.invitation_id).map(p => p.invitation_id).filter((id): id is string => id !== null);
    
    // Fetch emails from worker_invitations
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

    // Also check workers table for emails
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

    const employees = profilesData.map(p => ({
      id: p.id,
      user_id: p.user_id,
      company_id: p.company_id,
      first_name: p.first_name,
      last_name: p.last_name,
      // Get email from invitation, worker, or generate placeholder
      email: (p.invitation_id && emailMap[p.invitation_id]) 
        || workerEmailMap[p.user_id] 
        || `${(p.first_name || 'user').toLowerCase().replace(/\s/g, '')}.${(p.last_name || 'unknown').toLowerCase().replace(/\s/g, '')}@company.com`,
      position: p.position,
      role: p.role,
      phone: p.phone,
      is_active: p.is_active,
      first_admin: p.first_admin,
      last_login: p.last_login,
      hire_date: p.hire_date,
      created_at: p.created_at,
    })) || [];

    return NextResponse.json({
      employees,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    const authError = error as AuthError;
    if (authError.status === 401 || authError.status === 403) {
      return handleAuthError(error);
    }
    return handleApiError(error, 'Failed to list employees', authError.status || 500);
  }
}
