import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No auth-token cookie', cookies: cookieStore.getAll().map(c => c.name) });
    }
    
    // Decode token
    const decoded = jose.decodeJwt(token);
    
    return NextResponse.json({
      success: true,
      hasToken: true,
      tokenPayload: decoded,
      hasJwtSecret: !!process.env.JWT_SECRET,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
