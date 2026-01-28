/**
 * JWT Authentication Middleware
 * 
 * Replaces Supabase auth.getUser() with JWT token verification
 * for use in API routes, server components, and middleware
 */

import { NextRequest } from 'next/server';
import { verifyToken } from './jwt';

// Get JWT token from request
export function getTokenFromRequest(request: NextRequest): string | null {
  // Try to get from cookie first
  const token = request.cookies.get('auth-token')?.value;
  if (token) return token;

  // Fallback to Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

// Get JWT token from server-side cookies (for server components)
export async function getTokenFromCookies(): Promise<string | null> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    return cookieStore.get('auth-token')?.value || null;
  } catch {
    return null;
  }
}

// Verify user authentication for API routes
export async function authenticateApiRoute(request: NextRequest) {
  const token = getTokenFromRequest(request);
  
  if (!token) {
    return { user: null, error: 'No authentication token provided' };
  }

  const user = verifyToken(token);
  
  if (!user) {
    return { user: null, error: 'Invalid or expired token' };
  }

  return { user, error: null };
}

// Verify user authentication for server components
export async function authenticateServerComponent() {
  const token = await getTokenFromCookies();
  
  if (!token) {
    return { user: null, error: 'No authentication token found' };
  }

  const user = verifyToken(token);
  
  if (!user) {
    return { user: null, error: 'Invalid or expired token' };
  }

  return { user, error: null };
}

// Higher-order function to protect API routes
export function withAuth(handler: (request: NextRequest, user: any) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    const { user, error } = await authenticateApiRoute(request);
    
    if (error || !user) {
      return Response.json(
        { error: error || 'Unauthorized' }, 
        { status: 401 }
      );
    }
    
    return handler(request, user);
  };
}

// Middleware for Next.js middleware.ts
export async function createAuthMiddleware(request: NextRequest) {
  const { user, error } = await authenticateApiRoute(request);
  
  if (error || !user) {
    // Redirect to login for protected routes
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    
    return Response.redirect(url);
  }
  
  return null; // Continue to protected route
}
