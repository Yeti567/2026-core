/**
 * Authentication Helper Functions
 * 
 * Provides utilities for accessing user context in Server Components
 * and protecting API routes with authentication checks.
 */

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from './jwt';
import { getPostgresClient } from '../db/postgres-client';
import type { UserRole } from '@/lib/db/types';

// =============================================================================
// TYPES
// =============================================================================

export interface ServerUserContext {
  userId: string;
  companyId: string;
  role: UserRole;
}

export interface AuthError {
  status: number;
  message: string;
}

// =============================================================================
// SERVER COMPONENT HELPERS
// =============================================================================

/**
 * Gets the current user context in Server Components.
 * 
 * Reads the x-company-id and x-user-role headers that were injected
 * by the middleware, along with the authenticated user from JWT token.
 * 
 * @returns The user context or null if not authenticated
 * 
 * @example
 * ```tsx
 * // In a Server Component
 * import { getServerUser } from '@/lib/auth/helpers';
 * 
 * export default async function DashboardPage() {
 *   const user = await getServerUser();
 *   
 *   if (!user) {
 *     redirect('/login');
 *   }
 *   
 *   return <Dashboard companyId={user.companyId} role={user.role} />;
 * }
 * ```
 */
export async function getServerUser(): Promise<ServerUserContext | null> {
  // Get token from headers
  const headersList = headers();
  const token = headersList.get('authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return null;
  }
  
  // Verify token
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }
  
  // Read headers injected by middleware
  const companyId = headersList.get('x-company-id');
  const role = headersList.get('x-user-role') as UserRole | null;

  // If headers aren't present, query directly (fallback)
  if (!companyId || !role) {
    const client = getPostgresClient();
    const profileResult = await client.query(
      'SELECT company_id, role FROM company_users WHERE user_id = $1 AND status = \'active\'',
      [payload.userId]
    );

    if (profileResult.rows.length === 0) {
      return null;
    }

    const profile = profileResult.rows[0];
    return {
      userId: payload.userId,
      companyId: profile.company_id,
      role: profile.role,
    };
  }

  return {
    userId: payload.userId,
    companyId,
    role,
  };
}

/**
 * Gets the current user context or redirects to login.
 * 
 * Convenience wrapper around getServerUser() that automatically
 * redirects to the login page if the user is not authenticated.
 * 
 * @param loginPath - The path to redirect to (default: '/login')
 * @returns The user context (never null due to redirect)
 * 
 * @example
 * ```tsx
 * // In a Server Component
 * import { getServerUserOrRedirect } from '@/lib/auth/helpers';
 * 
 * export default async function ProtectedPage() {
 *   const user = await getServerUserOrRedirect();
 *   // user is guaranteed to be non-null here
 *   return <ProtectedContent user={user} />;
 * }
 * ```
 */
export async function getServerUserOrRedirect(
  loginPath: string = '/login'
): Promise<ServerUserContext> {
  const user = await getServerUser();
  
  if (!user) {
    redirect(loginPath);
  }
  
  return user;
}

/**
 * Checks if the current user has one of the required roles.
 * Redirects to a forbidden page if not authorized.
 * 
 * @param allowedRoles - Array of roles that are allowed access
 * @param forbiddenPath - Path to redirect to if not authorized (default: '/forbidden')
 * @returns The user context if authorized
 * 
 * @example
 * ```tsx
 * // In a Server Component - admin-only page
 * import { requireRole } from '@/lib/auth/helpers';
 * 
 * export default async function AdminPage() {
 *   const user = await requireRole(['admin', 'super_admin']);
 *   return <AdminDashboard user={user} />;
 * }
 * ```
 */
export async function requireRole(
  allowedRoles: UserRole[],
  forbiddenPath: string = '/forbidden'
): Promise<ServerUserContext> {
  const user = await getServerUserOrRedirect();
  
  if (!allowedRoles.includes(user.role)) {
    redirect(forbiddenPath);
  }
  
  return user;
}

// =============================================================================
// API ROUTE HELPERS
// =============================================================================

/**
 * Authenticates an API request and returns the user context.
 * Throws an error with appropriate status if not authenticated.
 * 
 * @returns The user context
 * @throws AuthError with status 401 if not authenticated
 * @throws AuthError with status 500 if profile not found
 * 
 * @example
 * ```tsx
 * // In an API route handler
 * import { requireAuth } from '@/lib/auth/helpers';
 * import { NextResponse } from 'next/server';
 * 
 * export async function GET() {
 *   try {
 *     const user = await requireAuth();
 *     // user is authenticated, proceed with request
 *     return NextResponse.json({ companyId: user.companyId });
 *   } catch (error) {
 *     return NextResponse.json(
 *       { error: error.message },
 *       { status: error.status }
 *     );
 *   }
 * }
 * ```
 */
export async function requireAuth(): Promise<ServerUserContext> {
  // Get token from headers
  const headersList = headers();
  const token = headersList.get('authorization')?.replace('Bearer ', '');
  
  if (!token) {
    const authError: AuthError = {
      status: 401,
      message: 'Unauthorized: Authentication required',
    };
    throw authError;
  }
  
  // Verify token
  const payload = verifyToken(token);
  if (!payload) {
    const authError: AuthError = {
      status: 401,
      message: 'Unauthorized: Invalid token',
    };
    throw authError;
  }

  // Read headers injected by middleware
  const companyId = headersList.get('x-company-id');
  const role = headersList.get('x-user-role') as UserRole | null;

  // If headers aren't present, query directly (fallback)
  if (!companyId || !role) {
    const client = getPostgresClient();
    const profileResult = await client.query(
      'SELECT company_id, role FROM company_users WHERE user_id = $1 AND status = \'active\'',
      [payload.userId]
    );

    if (profileResult.rows.length === 0) {
      const authError: AuthError = {
        status: 500,
        message: 'User profile not found',
      };
      throw authError;
    }

    const profile = profileResult.rows[0];
    return {
      userId: payload.userId,
      companyId: profile.company_id,
      role: profile.role,
    };
  }

  return {
    userId: payload.userId,
    companyId,
    role,
  };
}

/**
 * Authenticates and authorizes an API request for specific roles.
 * Throws an error with appropriate status if not authenticated or authorized.
 * 
 * @param allowedRoles - Array of roles that are allowed access
 * @returns The user context
 * @throws AuthError with status 401 if not authenticated
 * @throws AuthError with status 403 if not authorized
 * 
 * @example
 * ```tsx
 * // In an API route handler - admin only
 * import { requireAuthWithRole } from '@/lib/auth/helpers';
 * import { NextResponse } from 'next/server';
 * 
 * export async function DELETE(request: Request) {
 *   try {
 *     const user = await requireAuthWithRole(['admin', 'super_admin']);
 *     // User is admin, proceed with deletion
 *     // ...
 *   } catch (error) {
 *     return NextResponse.json(
 *       { error: error.message },
 *       { status: error.status }
 *     );
 *   }
 * }
 * ```
 */
export async function requireAuthWithRole(
  allowedRoles: UserRole[]
): Promise<ServerUserContext> {
  const user = await requireAuth();
  
  if (!allowedRoles.includes(user.role)) {
    const authError: AuthError = {
      status: 403,
      message: 'Forbidden: Insufficient permissions',
    };
    throw authError;
  }
  
  return user;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if a role has admin privileges (admin or super_admin).
 */
export function isAdminRole(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

/**
 * Checks if a role is super_admin.
 */
export function isSuperAdmin(role: UserRole): boolean {
  return role === 'super_admin';
}

/**
 * Role hierarchy for permission checks.
 * Higher number = more permissions.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  worker: 1,
  supervisor: 2,
  internal_auditor: 3,
  admin: 4,
  super_admin: 5,
};

/**
 * Checks if a role has at least the minimum required role level.
 * 
 * @param userRole - The user's current role
 * @param minimumRole - The minimum required role
 * @returns True if the user's role is >= the minimum role
 * 
 * @example
 * ```tsx
 * hasMinimumRole('admin', 'supervisor'); // true
 * hasMinimumRole('worker', 'supervisor'); // false
 * ```
 */
export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  // Safe: userRole and minimumRole are typed UserRole enum values
  // eslint-disable-next-line security/detect-object-injection
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}
