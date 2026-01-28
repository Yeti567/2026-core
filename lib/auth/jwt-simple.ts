/**
 * Simple JWT Authentication for Server Components
 * 
 * This version only verifies JWT tokens without database access
 * for use in server components where database access might be limited
 */

import jwt from 'jsonwebtoken';

// JWT Configuration with secure environment handling
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export interface JWTPayload {
  userId: string;
  email: string;
  companyId?: string;
  role?: string;
}

// Verify JWT token (server component safe version)
export function verifyTokenSimple(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Ensure the decoded token has the expected shape
    if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded && 'email' in decoded) {
      return decoded as JWTPayload;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Get JWT token from server-side cookies (for server components)
export async function getTokenFromCookiesSimple(): Promise<string | null> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    return cookieStore.get('auth-token')?.value || null;
  } catch {
    return null;
  }
}

// Verify user authentication for server components (simple version)
export async function authenticateServerComponentSimple() {
  const token = await getTokenFromCookiesSimple();
  
  if (!token) {
    return { user: null, error: 'No authentication token found' };
  }

  const user = verifyTokenSimple(token);
  
  if (!user) {
    return { user: null, error: 'Invalid or expired token' };
  }

  return { user, error: null };
}
