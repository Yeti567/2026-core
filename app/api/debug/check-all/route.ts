import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // 1. Check cookies
    const cookieStore = cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    results.checks = {
      ...results.checks as object,
      authToken: authToken ? 'present' : 'missing',
      tokenLength: authToken?.length || 0
    };

    // 2. Verify JWT
    if (authToken) {
      const payload = verifyToken(authToken);
      results.checks = {
        ...results.checks as object,
        jwtValid: !!payload,
        jwtPayload: payload ? {
          userId: payload.userId?.slice(0, 8) + '...',
          email: payload.email,
          companyId: payload.companyId?.slice(0, 8) + '...',
          role: payload.role
        } : null
      };
    }

    // 3. Check Supabase connection
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      results.checks = {
        ...results.checks as object,
        supabaseAuth: {
          user: user ? { id: user.id.slice(0, 8) + '...', email: user.email } : null,
          error: authError?.message || null
        }
      };

      // 4. Test database query
      const { data: companies, error: dbError } = await supabase
        .from('companies')
        .select('id, name')
        .limit(1);
      
      results.checks = {
        ...results.checks as object,
        database: {
          connected: !dbError,
          error: dbError?.message || null,
          companiesFound: companies?.length || 0
        }
      };
    } catch (supabaseError) {
      results.checks = {
        ...results.checks as object,
        supabaseError: supabaseError instanceof Error ? supabaseError.message : 'Unknown error'
      };
    }

    // 5. Check environment variables
    results.checks = {
      ...results.checks as object,
      envVars: {
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        JWT_SECRET: !!process.env.JWT_SECRET,
        DATABASE_URL: !!process.env.DATABASE_URL
      }
    };

    results.status = 'ok';
  } catch (error) {
    results.status = 'error';
    results.error = error instanceof Error ? error.message : 'Unknown error';
    results.stack = error instanceof Error ? error.stack : undefined;
  }

  return NextResponse.json(results, { status: 200 });
}
