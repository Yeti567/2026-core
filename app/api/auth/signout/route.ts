import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Clear the auth token cookie
  const response = NextResponse.redirect(new URL('/login', request.nextUrl.origin), {
    status: 302,
  });
  
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // Delete the cookie
    path: '/',
  });
  
  return response;
}
