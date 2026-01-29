import 'server-only';
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

// Generate JWT token (async with jose)
export async function generateTokenAsync(payload: JWTPayload): Promise<string> {
  const jwt = new jose.SignJWT(payload as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d');
  return jwt.sign(getJwtSecret());
}

// Sync decode (no signature verification - for quick access)
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jose.decodeJwt(token);
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
    return null;
  }
}

// Async verify with signature check
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

// Alias for backwards compatibility
export const verifyTokenWithDB = verifyTokenAsync;

