import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { createSafeQuery } from '@/lib/db/safe-query';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


/**
 * GET /api/workers
 * 
 * Returns workers for the authenticated user's company only.
 * Demonstrates multi-tenant isolation via the safe query wrapper.
 */
export async function GET() {
  try {
    // Authenticate and get user context
    const user = await requireAuth();

    // Create Supabase client and safe query builder
    const supabase = createRouteHandlerClient();
    const safeQuery = createSafeQuery(supabase, user.companyId, user.role);

    // Query workers - automatically filtered by company_id
    const { data: workers, error } = await safeQuery.workers.list();

    if (error) {
      return handleApiError(error, 'Failed to retrieve workers', 500);
    }

    return NextResponse.json({
      message: 'Workers retrieved successfully',
      companyId: user.companyId,
      role: user.role,
      count: workers?.length || 0,
      workers,
    });
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to retrieve workers');
  }
}

/**
 * POST /api/workers
 * 
 * Creates a new worker for the authenticated user's company.
 * The company_id is automatically injected by the safe query wrapper.
 */
export async function POST(request: Request) {
  try {
    // Authenticate and get user context
    const user = await requireAuth();

    // Parse request body
    const body = await request.json();

    // Create Supabase client and safe query builder
    const supabase = createRouteHandlerClient();
    const safeQuery = createSafeQuery(supabase, user.companyId, user.role);

    // Create worker - company_id is auto-injected
    const { data: worker, error } = await safeQuery.workers.create({
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      position: body.position,
      hire_date: body.hire_date,
    });

    if (error) {
      return handleApiError(error, 'Failed to create worker', 400);
    }

    return NextResponse.json({
      message: 'Worker created successfully',
      worker,
    }, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to create worker');
  }
}
