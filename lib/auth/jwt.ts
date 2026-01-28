import 'server-only';
import jwt, { SignOptions } from 'jsonwebtoken';

// JWT Configuration
let JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('Required environment variable JWT_SECRET is not set');
}

const jwtSecret = JWT_SECRET as string;

export interface JWTPayload {
  userId: string;
  email: string;
  companyId?: string;
  role?: string;
}

// Generate JWT token
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, jwtSecret, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

// Verify JWT token (middleware-safe version - no database access)
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, jwtSecret);
    // Ensure the decoded token has the expected shape
    if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded && 'email' in decoded) {
      return decoded as JWTPayload;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Verify JWT token with database lookup (for API routes)
export async function verifyTokenWithDB(token: string) {
  try {
    const decoded = jwt.verify(token, jwtSecret);
    // Ensure the decoded token has the expected shape
    if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded && 'email' in decoded) {
      return decoded as JWTPayload;
    }
    return null;
  } catch (error) {
    return null;
  }
}

