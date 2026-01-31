/**
 * Next.js Middleware for Multi-Tenant Security
 * 
 * This middleware runs on every matched request and:
 * 1. Validates authentication via JWT token
 * 2. Fetches user's company_id and role from company_users
 * 3. Injects x-company-id and x-user-role headers for downstream use
 * 4. Redirects unauthenticated users to /login
 * 5. Blocks non-admin users from /admin routes
 * 6. Sets Content-Security-Policy (CSP) headers with nonce for XSS protection
 */

import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt-edge';
import type { UserRole } from '@/lib/db/types';

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

/** Routes that don't require authentication */
const PUBLIC_ROUTES = [
  '/',                 // Home page (app overview)
  '/login',
  '/signup',
  '/register',         // Company registration page
  '/public',
  '/auth/callback',
  '/auth/confirm',
  '/auth/register-callback',  // Company registration magic link callback
  '/api/debug/auth',   // Debug endpoint for testing
  '/api/debug/supabase-test',  // Supabase connection test
  '/invite/accept',    // Employee magic link acceptance page (legacy)
  '/accept-invite',    // Employee invitation acceptance page (new)
  '/forgot-password',  // Password reset request
  '/reset-password',   // Password reset page
  '/test-page',        // Connectivity test page
  '/minimal-test',      // Minimal test page
  '/dashboard',        // TEMPORARY: Allow dashboard access, auth checked in page
];

/** Routes that require admin or super_admin role */
const ADMIN_ROUTES = ['/admin'];

/** API routes that don't require authentication */
const PUBLIC_API_ROUTES = [
  '/api/auth',
  '/api/public',
  '/api/register',              // Company registration
  '/api/invitations/validate',  // Token validation for magic links
  '/api/invitations/accept-with-auth',  // Invitation acceptance (creates user)
  '/api/debug',                 // Debug endpoints (REMOVE IN PRODUCTION)
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Checks if a pathname matches any of the given route prefixes.
 */
function matchesRoutes(pathname: string, routes: string[]): boolean {
  return routes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Checks if a role has admin privileges (can edit).
 */
function isAdmin(role: UserRole | null): boolean {
  return role === 'admin' || role === 'super_admin';
}

/**
 * Checks if a role can access admin pages (view or edit).
 * Internal auditors can view but not edit.
 */
function canAccessAdminPages(role: UserRole | null): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'internal_auditor';
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Generates a CSP nonce and builds the Content-Security-Policy header
 */
function generateCSPHeaders(nonce: string): string {
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data:;
    font-src 'self' https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();
}

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    // Skip middleware for static files and Next.js internals
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon') ||
      pathname.includes('.') // Static files like .css, .js, .png, etc.
    ) {
      return NextResponse.next();
    }

    // Generate CSP nonce for XSS protection (needed for all routes)
    const nonce = btoa(crypto.randomUUID());
    const cspHeader = generateCSPHeaders(nonce);

    // Create response
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);

    let response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Set CSP header for all responses
    response.headers.set('Content-Security-Policy', cspHeader);

    // Check if route is public
    const isPublicRoute = matchesRoutes(pathname, PUBLIC_ROUTES);
    const isPublicApiRoute = matchesRoutes(pathname, PUBLIC_API_ROUTES);
    console.log('[Middleware] pathname:', pathname, 'isPublicRoute:', isPublicRoute);

    // For the home page, redirect authenticated users to dashboard
    if (pathname === '/') {
      const token = request.cookies.get('auth-token')?.value;
      if (token) {
        const payload = verifyToken(token);
        if (payload) {
          // User is authenticated, redirect to main dashboard
          const dashboardUrl = new URL('/dashboard', request.url);
          const redirectResponse = NextResponse.redirect(dashboardUrl);
          redirectResponse.headers.set('Content-Security-Policy', cspHeader);
          return redirectResponse;
        }
      }
      // Not authenticated, show the landing page
      return response;
    }

    if (isPublicRoute || isPublicApiRoute) {
      return response;
    }

    // Get JWT token from cookie
    const token = request.cookies.get('auth-token')?.value;
    console.log('[Middleware]', pathname, 'token:', token ? 'present' : 'missing');

    // Handle unauthenticated users
    if (!token) {
      // For API routes, return 401
      if (pathname.startsWith('/api')) {
        const apiResponse = NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
        apiResponse.headers.set('Content-Security-Policy', cspHeader);
        return apiResponse;
      }

      // For page routes, redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.headers.set('Content-Security-Policy', cspHeader);
      return redirectResponse;
    }

    // Verify JWT token
    const payload = verifyToken(token);
    if (!payload) {
      // Invalid token
      if (pathname.startsWith('/api')) {
        const apiResponse = NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
        apiResponse.headers.set('Content-Security-Policy', cspHeader);
        return apiResponse;
      }

      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.headers.set('Content-Security-Policy', cspHeader);
      return redirectResponse;
    }

    const role = (payload.role || null) as UserRole | null;
    const companyId = payload.companyId || null;

    // Check admin route access
    const isAdminRoute = matchesRoutes(pathname, ADMIN_ROUTES);

    if (isAdminRoute && !canAccessAdminPages(role)) {
      // Non-admin/auditor trying to access admin routes
      if (pathname.startsWith('/api')) {
        const apiResponse = NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        );
        apiResponse.headers.set('Content-Security-Policy', cspHeader);
        return apiResponse;
      }

      // Redirect to forbidden page or dashboard
      const redirectResponse = NextResponse.redirect(new URL('/forbidden', request.url));
      redirectResponse.headers.set('Content-Security-Policy', cspHeader);
      return redirectResponse;
    }

    // Inject user context into request headers
    // These headers can be read by Server Components and API routes
    const authenticatedHeaders = new Headers(request.headers);
    if (companyId) authenticatedHeaders.set('x-company-id', companyId);
    if (role) authenticatedHeaders.set('x-user-role', role);
    authenticatedHeaders.set('x-user-id', payload.userId);
    authenticatedHeaders.set('authorization', `Bearer ${token}`);
    authenticatedHeaders.set('x-nonce', nonce);

    // Create new response with injected headers
    response = NextResponse.next({
      request: {
        headers: authenticatedHeaders,
      },
    });

    return response;
  } catch (error) {
    // Log the error for debugging
    console.error('Middleware error:', error);

    // Return a simple response to avoid 500 crash
    // For critical errors, allow the request to proceed
    // The downstream handler can deal with auth errors
    return NextResponse.next();
  }
}

// =============================================================================
// MATCHER CONFIGURATION
// =============================================================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
