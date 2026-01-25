/**
 * Secure AuditSoft API Client Wrapper
 * 
 * Provides secure API client with:
 * - Timeout protection (30 seconds max)
 * - Response validation
 * - Rate limiting
 * - Error sanitization
 * - HTTPS enforcement
 */

import { AuditSoftClient } from './client';
import type { ValidationResult, AuditStructure, EvidenceItem, UploadResult, AuditStatusResponse } from './types';

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const RATE_LIMIT_DELAY_MS = 100; // 100ms between requests

// =============================================================================
// SECURE FETCH WRAPPER
// =============================================================================

/**
 * Secure fetch with timeout and HTTPS enforcement
 */
async function secureFetch(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  // Enforce HTTPS
  if (url.startsWith('http://')) {
    throw new Error('HTTP requests are not allowed. Use HTTPS only.');
  }

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }

    throw error;
  }
}

// =============================================================================
// RESPONSE VALIDATION
// =============================================================================

/**
 * Validates API response structure
 */
function validateResponse<T>(
  data: unknown,
  validator: (data: unknown) => data is T
): T {
  if (!validator(data)) {
    throw new Error('Invalid response format from API');
  }
  return data;
}

/**
 * Validates validation response
 */
function isValidValidationResponse(data: unknown): data is ValidationResult {
  if (typeof data !== 'object' || data === null) return false;

  const obj = data as Record<string, unknown>;

  if (typeof obj.valid !== 'boolean') return false;

  if (obj.valid === true) {
    return (
      typeof obj.organization_id === 'string' &&
      typeof obj.organization_name === 'string'
    );
  }

  return typeof obj.error === 'string';
}

/**
 * Validates upload response
 */
function isValidUploadResponse(data: unknown): data is UploadResult {
  if (typeof data !== 'object' || data === null) return false;

  const obj = data as Record<string, unknown>;

  if (typeof obj.success !== 'boolean') return false;

  if (obj.success === true) {
    return typeof obj.auditsoft_item_id === 'string';
  }

  return typeof obj.error === 'string';
}

// =============================================================================
// RATE LIMITER
// =============================================================================

class RateLimiter {
  private lastRequestTime: number = 0;
  private minDelayMs: number;

  constructor(minDelayMs: number = RATE_LIMIT_DELAY_MS) {
    this.minDelayMs = minDelayMs;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minDelayMs) {
      const waitTime = this.minDelayMs - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }
}

// =============================================================================
// SECURE CLIENT WRAPPER
// =============================================================================

/**
 * Secure wrapper around AuditSoftClient
 */
export class SecureAuditSoftClient {
  private client: AuditSoftClient;
  private rateLimiter: RateLimiter;

  constructor(apiKey: string, companyId: string, endpoint?: string) {
    this.client = new AuditSoftClient(apiKey, companyId, endpoint);
    this.rateLimiter = new RateLimiter();
  }

  /**
   * Validate connection with timeout and response validation
   */
  async validateConnection(): Promise<ValidationResult> {
    try {
      await this.rateLimiter.wait();

      // Use secure fetch with timeout
      const endpoint = this.client.getEndpoint();
      const apiKey = this.client.getApiKey();

      const response = await secureFetch(
        `${endpoint}/v1/auth/validate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
        DEFAULT_TIMEOUT_MS
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          valid: false,
          error: (errorData as { message?: string })?.message || `Invalid API key (HTTP ${response.status})`,
        };
      }

      const data = await response.json();
      return validateResponse(data, isValidValidationResponse);
    } catch (error) {
      // Sanitize error - never expose API key
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';

      // Don't expose timeout details in production
      if (process.env.NODE_ENV === 'production' && errorMessage.includes('timeout')) {
        return {
          valid: false,
          error: 'Connection timeout. Please try again.',
        };
      }

      return {
        valid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get audit structure with validation
   */
  async getAuditStructure(auditId: string): Promise<AuditStructure> {
    await this.rateLimiter.wait();

    const endpoint = this.client.getEndpoint();
    const apiKey = this.client.getApiKey();

    const response = await secureFetch(
      `${endpoint}/v1/audits/${auditId}/structure`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      },
      DEFAULT_TIMEOUT_MS
    );

    if (!response.ok) {
      throw new Error('Failed to fetch audit structure');
    }

    const data = await response.json();
    // Add validation here if you have a validator for AuditStructure
    return data as AuditStructure;
  }

  /**
   * Upload evidence with timeout and validation
   */
  async uploadEvidence(evidence: EvidenceItem): Promise<UploadResult> {
    await this.rateLimiter.wait();

    const endpoint = this.client.getEndpoint();
    const apiKey = this.client.getApiKey();

    const formData = new FormData();
    formData.append('cor_element', evidence.cor_element.toString());
    formData.append('question_id', evidence.question_id);
    formData.append('evidence_type', evidence.evidence_type);
    formData.append('title', evidence.title);
    formData.append('description', evidence.description || '');
    formData.append('date', evidence.date);

    if (evidence.file) {
      formData.append('file', evidence.file);
    }

    if (evidence.metadata) {
      formData.append('metadata', JSON.stringify(evidence.metadata));
    }

    try {
      const response = await secureFetch(
        `${endpoint}/v1/audits/${evidence.audit_id}/evidence`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: formData,
        },
        DEFAULT_TIMEOUT_MS
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error((error as { message?: string })?.message || 'Failed to upload evidence');
      }

      const result = await response.json();
      return validateResponse(result, isValidUploadResponse);
    } catch (error) {
      // Sanitize error - never expose API key
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      if (process.env.NODE_ENV === 'production' && errorMessage.includes('timeout')) {
        return {
          success: false,
          error: 'Upload timeout. Please try again.',
        };
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get audit status with timeout
   */
  async getAuditStatus(auditId: string): Promise<AuditStatusResponse> {
    await this.rateLimiter.wait();

    const endpoint = this.client.getEndpoint();
    const apiKey = this.client.getApiKey();

    const response = await secureFetch(
      `${endpoint}/v1/audits/${auditId}/status`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      },
      DEFAULT_TIMEOUT_MS
    );

    if (!response.ok) {
      throw new Error('Failed to fetch audit status');
    }

    return response.json() as Promise<AuditStatusResponse>;
  }

  /**
   * Bulk upload with rate limiting
   */
  async bulkUploadEvidence(
    auditId: string,
    items: EvidenceItem[],
    onProgress?: (current: number, total: number) => void
  ) {
    const results: UploadResult[] = [];
    const errors: Array<{ item: EvidenceItem; error: string }> = [];

    for (let i = 0; i < items.length; i++) {
      // Safe: i is a controlled loop index within bounds of items array
      // eslint-disable-next-line security/detect-object-injection
      const item = items[i];

      try {
        const result = await this.uploadEvidence({
          ...item,
          audit_id: auditId,
        });

        if (result.success) {
          results.push(result);
        } else {
          errors.push({ item, error: result.error || 'Unknown error' });
        }
      } catch (error) {
        errors.push({
          item,
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }

      if (onProgress) {
        onProgress(i + 1, items.length);
      }
    }

    return {
      total: items.length,
      succeeded: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }
}
