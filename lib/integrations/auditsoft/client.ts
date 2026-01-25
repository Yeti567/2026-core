/**
 * AuditSoft API Client
 * 
 * Client for interacting with the AuditSoft external API.
 * Handles authentication, validation, and evidence upload.
 */

import type {
  ValidationResult,
  AuditStructure,
  EvidenceItem,
  UploadResult,
  BulkUploadResult,
  AuditStatusResponse,
} from './types';

// =============================================================================
// CLIENT CLASS
// =============================================================================

export class AuditSoftClient {
  private apiKey: string;
  private endpoint: string;
  private companyId: string;

  constructor(apiKey: string, companyId: string, endpoint?: string) {
    this.apiKey = apiKey;
    this.companyId = companyId;
    this.endpoint = endpoint || process.env.AUDITSOFT_API_ENDPOINT || 'https://api.auditsoft.co';
  }

  /** Get the API endpoint URL */
  getEndpoint(): string {
    return this.endpoint;
  }

  /** Get the API key (for secure wrapper use only) */
  getApiKey(): string {
    return this.apiKey;
  }

  // ===========================================================================
  // AUTHENTICATION & VALIDATION
  // ===========================================================================

  /**
   * Validate API key with AuditSoft
   */
  async validateConnection(): Promise<ValidationResult> {
    try {
      // Enforce HTTPS
      if (this.endpoint.startsWith('http://')) {
        throw new Error('HTTP requests are not allowed. Use HTTPS only.');
      }

      // Create AbortController for timeout (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let response: Response;
      try {
        response = await fetch(`${this.endpoint}/v1/auth/validate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout after 30 seconds');
        }
        throw error;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          valid: false,
          error: errorData.message || `Invalid API key (HTTP ${response.status})`,
        };
      }

      const data = await response.json();

      return {
        valid: true,
        organization_id: data.organization_id,
        organization_name: data.organization_name,
        audit_id: data.current_audit_id,
        audit_scheduled_date: data.audit_scheduled_date,
        auditor_name: data.auditor_name,
        auditor_email: data.auditor_email,
      };
    } catch (error) {
      // For development/demo, simulate successful validation
      if (process.env.NODE_ENV === 'development' || process.env.AUDITSOFT_MOCK === 'true') {
        return this.mockValidation();
      }

      // Sanitize error - never expose API key or timeout details in production
      let errorMessage = error instanceof Error ? error.message : 'Connection failed';

      if (process.env.NODE_ENV === 'production') {
        if (errorMessage.includes('timeout')) {
          errorMessage = 'Connection timeout. Please try again.';
        }
        // Remove any potential API key hints
        errorMessage = errorMessage.replace(/ask_[^\s]+/g, '[API_KEY]');
      }

      return {
        valid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Mock validation for development
   */
  private mockValidation(): ValidationResult {
    // Validate key format (should start with ask_)
    if (!this.apiKey.startsWith('ask_')) {
      return {
        valid: false,
        error: 'Invalid API key format. Key should start with "ask_"',
      };
    }

    if (this.apiKey.length < 20) {
      return {
        valid: false,
        error: 'Invalid API key. Key is too short.',
      };
    }

    // Generate mock audit date (3 months from now)
    const auditDate = new Date();
    auditDate.setMonth(auditDate.getMonth() + 3);

    return {
      valid: true,
      organization_id: `ORG-${this.companyId.slice(0, 8).toUpperCase()}`,
      organization_name: 'Connected Organization',
      audit_id: `AUD-${Date.now().toString(36).toUpperCase()}`,
      audit_scheduled_date: auditDate.toISOString().split('T')[0],
      auditor_name: 'Assigned Auditor',
      auditor_email: 'auditor@auditsoft.co',
    };
  }

  // ===========================================================================
  // AUDIT STRUCTURE
  // ===========================================================================

  /**
   * Get audit structure and questions
   */
  async getAuditStructure(auditId: string): Promise<AuditStructure> {
    try {
      // Enforce HTTPS
      if (this.endpoint.startsWith('http://')) {
        throw new Error('HTTP requests are not allowed. Use HTTPS only.');
      }

      // Create AbortController for timeout (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let response: Response;
      try {
        response = await fetch(`${this.endpoint}/v1/audits/${auditId}/structure`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout after 30 seconds');
        }
        throw error;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch audit structure');
      }

      return response.json();
    } catch (error) {
      // Return mock structure for development
      if (process.env.NODE_ENV === 'development' || process.env.AUDITSOFT_MOCK === 'true') {
        return this.getMockAuditStructure(auditId);
      }
      throw error;
    }
  }

  /**
   * Mock audit structure for development
   */
  private getMockAuditStructure(auditId: string): AuditStructure {
    return {
      audit_id: auditId,
      name: 'COR Audit 2025',
      elements: [
        {
          number: 1,
          name: 'Management Leadership & Organizational Commitment',
          weight: 10,
          questions: [
            { id: 'Q1.1', text: 'Is there a written H&S policy?', evidence_types: ['document'], required: true },
            { id: 'Q1.2', text: 'Is the policy signed by senior management?', evidence_types: ['document'], required: true },
            { id: 'Q1.3', text: 'Are H&S responsibilities defined?', evidence_types: ['document', 'form_submission'], required: true },
          ],
        },
        {
          number: 2,
          name: 'Hazard Identification & Assessment',
          weight: 10,
          questions: [
            { id: 'Q2.1', text: 'Are hazard assessments conducted?', evidence_types: ['form_submission', 'hazard_assessment'], required: true },
            { id: 'Q2.2', text: 'Are workers involved in hazard identification?', evidence_types: ['form_submission', 'meeting_minutes'], required: true },
          ],
        },
        // Additional elements would be included here...
      ],
    };
  }

  // ===========================================================================
  // EVIDENCE UPLOAD
  // ===========================================================================

  /**
   * Upload evidence item (form, document, etc.)
   */
  async uploadEvidence(evidence: EvidenceItem): Promise<UploadResult> {
    try {
      const formData = new FormData();

      formData.append('cor_element', evidence.cor_element.toString());
      formData.append('question_id', evidence.question_id);
      formData.append('evidence_type', evidence.evidence_type);
      formData.append('title', evidence.title);
      formData.append('description', evidence.description || '');
      formData.append('date', evidence.date);

      // Attach file if present
      if (evidence.file) {
        formData.append('file', evidence.file);
      }

      // Attach metadata
      if (evidence.metadata) {
        formData.append('metadata', JSON.stringify(evidence.metadata));
      }

      // Enforce HTTPS
      if (this.endpoint.startsWith('http://')) {
        throw new Error('HTTP requests are not allowed. Use HTTPS only.');
      }

      // Create AbortController for timeout (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let response: Response;
      try {
        response = await fetch(
          `${this.endpoint}/v1/audits/${evidence.audit_id}/evidence`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
            },
            body: formData,
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Upload timeout after 30 seconds');
        }
        throw error;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(error.message || 'Failed to upload evidence');
      }

      const result = await response.json();

      return {
        success: true,
        auditsoft_item_id: result.evidence_id,
        message: result.message,
      };
    } catch (error) {
      // Mock response for development
      if (process.env.NODE_ENV === 'development' || process.env.AUDITSOFT_MOCK === 'true') {
        return {
          success: true,
          auditsoft_item_id: `EV-${Date.now().toString(36).toUpperCase()}`,
          message: 'Evidence uploaded successfully (mock)',
        };
      }

      // Sanitize error - never expose API key
      let errorMessage = error instanceof Error ? error.message : 'Upload failed';

      if (process.env.NODE_ENV === 'production') {
        if (errorMessage.includes('timeout')) {
          errorMessage = 'Upload timeout. Please try again.';
        }
        // Remove any potential API key hints
        errorMessage = errorMessage.replace(/ask_[^\s]+/g, '[API_KEY]');
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Bulk upload multiple evidence items
   */
  async bulkUploadEvidence(
    auditId: string,
    items: EvidenceItem[],
    onProgress?: (current: number, total: number) => void
  ): Promise<BulkUploadResult> {
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

      // Report progress
      if (onProgress) {
        onProgress(i + 1, items.length);
      }

      // Small delay to avoid rate limiting
      if (i < items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
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

  /**
   * Update existing evidence item
   */
  async updateEvidence(
    evidenceId: string,
    updates: Partial<EvidenceItem>
  ): Promise<UploadResult> {
    try {
      // Enforce HTTPS
      if (this.endpoint.startsWith('http://')) {
        throw new Error('HTTP requests are not allowed. Use HTTPS only.');
      }

      // Create AbortController for timeout (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let response: Response;
      try {
        response = await fetch(`${this.endpoint}/v1/evidence/${evidenceId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout after 30 seconds');
        }
        throw error;
      }

      if (!response.ok) {
        throw new Error('Failed to update evidence');
      }

      return {
        success: true,
        auditsoft_item_id: evidenceId,
        message: 'Evidence updated',
      };
    } catch (error) {
      // Mock response for development
      if (process.env.NODE_ENV === 'development' || process.env.AUDITSOFT_MOCK === 'true') {
        return {
          success: true,
          auditsoft_item_id: evidenceId,
          message: 'Evidence updated (mock)',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed',
      };
    }
  }

  /**
   * Delete evidence item
   */
  async deleteEvidence(evidenceId: string): Promise<void> {
    try {
      // Enforce HTTPS
      if (this.endpoint.startsWith('http://')) {
        throw new Error('HTTP requests are not allowed. Use HTTPS only.');
      }

      // Create AbortController for timeout (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let response: Response;
      try {
        response = await fetch(`${this.endpoint}/v1/evidence/${evidenceId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout after 30 seconds');
        }
        throw error;
      }

      if (!response.ok) {
        throw new Error('Failed to delete evidence');
      }
    } catch (error) {
      // Silently succeed in development
      if (process.env.NODE_ENV === 'development' || process.env.AUDITSOFT_MOCK === 'true') {
        return;
      }
      throw error;
    }
  }

  // ===========================================================================
  // AUDIT STATUS
  // ===========================================================================

  /**
   * Get audit completion status
   */
  async getAuditStatus(auditId: string): Promise<AuditStatusResponse> {
    try {
      // Enforce HTTPS
      if (this.endpoint.startsWith('http://')) {
        throw new Error('HTTP requests are not allowed. Use HTTPS only.');
      }

      // Create AbortController for timeout (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let response: Response;
      try {
        response = await fetch(`${this.endpoint}/v1/audits/${auditId}/status`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout after 30 seconds');
        }
        throw error;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch audit status');
      }

      return response.json();
    } catch (error) {
      // Mock response for development
      if (process.env.NODE_ENV === 'development' || process.env.AUDITSOFT_MOCK === 'true') {
        return {
          audit_id: auditId,
          status: 'pending',
          completion_percentage: 0,
          elements_status: [],
          scheduled_date: null,
          auditor_name: null,
        };
      }
      throw error;
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates an AuditSoft client instance
 */
export function createAuditSoftClient(
  apiKey: string,
  companyId: string,
  endpoint?: string
): AuditSoftClient {
  return new AuditSoftClient(apiKey, companyId, endpoint);
}
