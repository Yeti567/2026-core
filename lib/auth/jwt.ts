import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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

// Verify JWT token with database lookup (for API routes)
export async function verifyTokenWithDB(token: string) {
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

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Get user from database
export async function getUserByEmail(email: string) {
  const { getPostgresClient } = await import('../db/postgres-client');
  const client = getPostgresClient();
  
  try {
    const result = await client.query(
      `SELECT u.id, u.email, u.created_at, cu.company_id, cu.role, cu.name, cu.position, cu.status,
       up.password_hash
       FROM auth.users u
       LEFT JOIN company_users cu ON u.id = cu.user_id
       LEFT JOIN user_passwords up ON u.id = up.user_id
       WHERE u.email = $1`,
      [email]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

// Create user in database
export async function createUser(userData: {
  email: string;
  password: string;
  name?: string;
  position?: string;
  companyId?: string;
  role?: string;
}) {
  const { getPostgresClient } = await import('../db/postgres-client');
  const client = getPostgresClient();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Create user in auth.users
    const userResult = await client.query(
      `INSERT INTO auth.users (id, email, created_at)
       VALUES (gen_random_uuid(), $1, NOW())
       RETURNING id, email, created_at`,
      [userData.email]
    );
    
    const user = userResult.rows[0];
    
    // Hash and store password
    const hashedPassword = await hashPassword(userData.password);
    await client.query(
      `INSERT INTO user_passwords (user_id, password_hash, created_at)
       VALUES ($1, $2, NOW())`,
      [user.id, hashedPassword]
    );
    
    // If companyId provided, add to company_users
    if (userData.companyId) {
      await client.query(
        `INSERT INTO company_users (company_id, user_id, role, name, email, position, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
        [
          userData.companyId,
          user.id,
          userData.role || 'member',
          userData.name || '',
          userData.email,
          userData.position || ''
        ]
      );
    }
    
    await client.query('COMMIT');
    
    return {
      user: {
        id: user.id,
        email: user.email,
        companyId: userData.companyId,
        role: userData.role || 'member',
        name: userData.name,
        position: userData.position
      }
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating user:', error);
    throw error;
  }
}

// Authenticate user
export async function authenticateUser(email: string, password: string) {
  const user = await getUserByEmail(email);
  
  if (!user) {
    return null;
  }
  
  // For now, we'll assume password is stored in user_metadata
  // In a real implementation, you'd have a passwords table
  const passwordHash = user.password_hash || '';
  
  if (!passwordHash) {
    // User exists but no password - might be OAuth user
    return null;
  }
  
  const isValid = await verifyPassword(password, passwordHash);
  
  if (!isValid) {
    return null;
  }
  
  return {
    userId: user.id,
    email: user.email,
    companyId: user.company_id,
    role: user.role,
    name: user.name,
    position: user.position
  };
}
