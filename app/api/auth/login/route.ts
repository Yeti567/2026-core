import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const dynamic = 'force-dynamic';


const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { email, password } = validation.data;
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Create a simple JWT token for middleware compatibility
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
    
    const token = jwt.sign(
      {
        userId: authData.user.id,
        email: authData.user.email!,
        companyId: authData.user.user_metadata?.company_id || 'default-company',
        role: authData.user.user_metadata?.role || 'member'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        companyId: authData.user.user_metadata?.company_id || 'default-company',
        role: authData.user.user_metadata?.role || 'member',
        name: authData.user.user_metadata?.name || '',
        position: authData.user.user_metadata?.position || ''
      }
    });
    
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });
    
    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
