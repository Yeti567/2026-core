/**
 * Invitation Token Utilities
 * 
 * Handles generation and hashing of magic link tokens for employee invitations.
 */

/**
 * Generates a cryptographically secure random token.
 * The token is URL-safe and 32 bytes (256 bits) of entropy.
 */
export function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hashes a token using SHA-256 for secure storage.
 * We store the hash in the database, not the actual token.
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates the full magic link URL for an invitation.
 */
export function generateMagicLinkUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/invite/accept?token=${token}`;
}
