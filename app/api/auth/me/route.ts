/**
 * Current User API Route
 * 
 * Returns the currently authenticated user's profile and company info.
 * GET: Get current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/auth/jwt';
import { handleApiError } from '@/lib/utils/error-handling';

// Force Node.js runtime for PostgreSQL compatibility
export const runtime = 'nodejs';

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase service role configuration');
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

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
    
    const supabase = getServiceClient();
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        user_id,
        company_id,
        role,
        name,
        position,
        email,
        status,
        created_at,
        updated_at,
        companies:companies (
          id,
          name,
          industry,
          employee_count,
          status
        )
      `)
      .eq('user_id', payload.userId)
      .eq('status', 'active')
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    const companyRelation = Array.isArray(profile.companies)
      ? profile.companies[0]
      : profile.companies;

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
          id: companyRelation?.id || profile.company_id,
          name: companyRelation?.name || null,
          industry: companyRelation?.industry || null,
          employee_count: companyRelation?.employee_count || null,
          status: companyRelation?.status || null,
        } : null,
      },
    });
    
  } catch (error) {
    return handleApiError(error, 'Failed to fetch user profile', 500, 'Auth me');
  }
}
