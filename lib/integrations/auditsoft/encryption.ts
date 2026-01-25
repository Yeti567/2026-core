/**
 * AuditSoft API Key Encryption
 * 
 * Uses AES-256-GCM for secure encryption of API keys.
 * 
 * Generate encryption key: openssl rand -hex 32
 * Store in environment variable: ENCRYPTION_KEY=<your-64-char-hex-key>
 * 
 * IMPORTANT: Never log or expose decrypted API keys
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Gets the encryption key from environment variables
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one using: openssl rand -hex 32'
    );
  }
  
  if (key.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
      'Generate one using: openssl rand -hex 32'
    );
  }
  
  return Buffer.from(key, 'hex');
}

/**
 * Encrypts an API key using AES-256-GCM
 * 
 * @param apiKey - The plaintext API key to encrypt
 * @returns Encrypted string in format: iv:authTag:encrypted
 * 
 * @example
 * const encrypted = encryptAPIKey('ask_live_abc123...');
 * // Returns: "a1b2c3d4...:e5f6g7h8...:i9j0k1l2..."
 */
export function encryptAPIKey(apiKey: string): string {
  if (!apiKey) {
    throw new Error('API key cannot be empty');
  }
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an encrypted API key
 * 
 * @param encryptedKey - The encrypted string in format: iv:authTag:encrypted
 * @returns The decrypted plaintext API key
 * 
 * @example
 * const apiKey = decryptAPIKey(connection.api_key);
 */
export function decryptAPIKey(encryptedKey: string): string {
  if (!encryptedKey) {
    throw new Error('Encrypted key cannot be empty');
  }
  
  const parts = encryptedKey.split(':');
  
  if (parts.length !== 3) {
    throw new Error(
      'Invalid encrypted key format. Expected format: iv:authTag:encrypted'
    );
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid IV length');
  }
  
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid auth tag length');
  }
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Validates that an encrypted key can be decrypted
 * (without returning the decrypted value for security)
 * 
 * @param encryptedKey - The encrypted string to validate
 * @returns true if the key can be decrypted, false otherwise
 */
export function validateEncryptedKey(encryptedKey: string): boolean {
  try {
    const decrypted = decryptAPIKey(encryptedKey);
    return decrypted.length > 0;
  } catch {
    return false;
  }
}

/**
 * Gets a safe hint of the API key (last 4 characters)
 * 
 * @param apiKey - The plaintext API key
 * @returns A hint string like "****abc1"
 */
export function getAPIKeyHint(apiKey: string): string {
  if (!apiKey || apiKey.length < 4) {
    return '****';
  }
  return `****${apiKey.slice(-4)}`;
}

/**
 * Checks if the encryption key is properly configured
 * 
 * @returns true if ENCRYPTION_KEY is set and valid
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}
