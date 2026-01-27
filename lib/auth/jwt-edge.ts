import jwt, { SignOptions } from 'jsonwebtoken';
import { getEnvVar } from '../utils/secure-env';

// JWT Configuration with secure environment handling
const JWT_SECRET = getEnvVar('JWT_SECRET', true);
const JWT_EXPIRES_IN = getEnvVar('JWT_EXPIRES_IN', false, '7d');

export interface JWTPayload {
  userId: string;
  email: string;
  companyId?: string;
  role?: string;
}

// Generate JWT token
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

// Verify JWT token (middleware-safe version - no database access)
export function verifyToken(token: string): JWTPayload | null {
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
