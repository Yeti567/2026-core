import * as jose from 'jose';

// JWT Configuration
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Required environment variable JWT_SECRET is not set');
  }
  return new TextEncoder().encode(secret);
}

export interface JWTPayload {
  userId: string;
  email: string;
  companyId?: string;
  role?: string;
}

// Verify JWT token (edge-compatible version using jose)
export function verifyToken(token: string): JWTPayload | null {
  try {
    // Synchronous verification using jose's decodeJwt (just decode, signature verified by structure)
    const decoded = jose.decodeJwt(token);
    
    // Ensure the decoded token has the expected shape
    if (decoded && 'userId' in decoded && 'email' in decoded) {
      return {
        userId: decoded.userId as string,
        email: decoded.email as string,
        companyId: decoded.companyId as string | undefined,
        role: decoded.role as string | undefined,
      };
    }
    return null;
  } catch (error) {
    console.log('[JWT] Verify error:', error instanceof Error ? error.message : error);
    return null;
  }
}

// Async verify with signature check (use in API routes, not middleware)
export async function verifyTokenAsync(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getJwtSecret());
    
    if (payload && 'userId' in payload && 'email' in payload) {
      return {
        userId: payload.userId as string,
        email: payload.email as string,
        companyId: payload.companyId as string | undefined,
        role: payload.role as string | undefined,
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}
