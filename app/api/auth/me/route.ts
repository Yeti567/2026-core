/**
 * Current User API Route
 * 
 * Returns the currently authenticated user's profile and company info.
 * GET: Get current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { getPostgresClient } from '@/lib/db/postgres-client';
import { handleApiError } from '@/lib/utils/error-handling';

// Force Node.js runtime for PostgreSQL compatibility
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Get user profile with company info
    const client = getPostgresClient();
    const profileResult = await client.query(
      `SELECT 
        cu.*,
        c.id as company_id,
        c.name as company_name,
        c.industry,
        c.employee_count,
        c.status as company_status
       FROM company_users cu
       LEFT JOIN companies c ON cu.company_id = c.id
       WHERE cu.user_id = $1 AND cu.status = 'active'`,
      [payload.userId]
    );
    
    if (profileResult.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    const profile = profileResult.rows[0];
    
    return NextResponse.json({
      user: {
        id: payload.userId,
        email: payload.email,
        created_at: new Date().toISOString(), // TODO: Get from auth.users
      },
      profile: {
        id: profile.id,
        user_id: payload.userId,
        company_id: profile.company_id,
        role: profile.role,
        name: profile.name,
        position: profile.position,
        email: profile.email,
        status: profile.status,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        company: profile.company_id ? {
          id: profile.company_id,
          name: profile.company_name,
          industry: profile.industry,
          employee_count: profile.employee_count,
          status: profile.company_status
        } : null
      },
    });
    
  } catch (error) {
    return handleApiError(error, 'Failed to fetch user profile', 500, 'Auth me');
  }
}
