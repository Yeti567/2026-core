/**
 * AuditSoft API Client
 * 
 * Client for interacting with the AuditSoft external API.
 * Handles authentication, validation, and data submission.
 */

import type {
  AuditSoftValidationResponse,
  AuditSoftUploadResponse,
  AuditSoftQuestion,
  AuditSchedule,
  EvidenceSource,
} from './types';

// =============================================================================
// CONFIGURATION
// =============================================================================

const AUDITSOFT_API_BASE = process.env.AUDITSOFT_API_URL || 'https://api.auditsoft.com/v1';
const AUDITSOFT_SANDBOX_URL = process.env.AUDITSOFT_SANDBOX_URL || 'https://sandbox.auditsoft.com/v1';

// =============================================================================
// API CLIENT CLASS
// =============================================================================

export class AuditSoftClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, environment: 'sandbox' | 'production' = 'production') {
    this.apiKey = apiKey;
    this.baseUrl = environment === 'sandbox' ? AUDITSOFT_SANDBOX_URL : AUDITSOFT_API_BASE;
  }

  // ===========================================================================
  // AUTHENTICATION & VALIDATION
  // ===========================================================================

  /**
   * Validates the API key and retrieves company information
   */
  async validateCredentials(): Promise<AuditSoftValidationResponse> {
    try {
      // In a real implementation, this would call the AuditSoft API
      // For now, we simulate validation based on API key format
      
      if (!this.apiKey || this.apiKey.length < 20) {
        return {
          success: false,
          error: 'Invalid API key format. API key must be at least 20 characters.',
        };
      }

      // Simulate API call delay
      await this.simulateDelay(500);

      // Simulate successful validation
      // In production, this would be a real API call
      if (this.apiKey.startsWith('ask_live_') || this.apiKey.startsWith('ask_test_')) {
        return {
          success: true,
          company_id: `ASC-${this.generateCompanyId()}`,
          company_name: 'Connected Company',
          schedule: {
            next_audit_date: this.getNextAuditDate(),
            audit_type: 'external',
          },
        };
      }

      return {
        success: false,
        error: 'API key validation failed. Please check your credentials.',
      };
    } catch (error) {
      console.error('AuditSoft validation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Gets the audit schedule for the connected company
   */
  async getAuditSchedule(): Promise<AuditSchedule | null> {
    try {
      await this.simulateDelay(300);

      return {
        next_audit_date: this.getNextAuditDate(),
        audit_type: 'external',
        auditor_name: 'Assigned Auditor',
      };
    } catch (error) {
      console.error('Failed to fetch audit schedule:', error);
      return null;
    }
  }

  // ===========================================================================
  // QUESTIONS & REQUIREMENTS
  // ===========================================================================

  /**
   * Gets the list of audit questions/requirements for mapping
   */
  async getAuditQuestions(): Promise<AuditSoftQuestion[]> {
    try {
      await this.simulateDelay(300);

      // Return mock questions that align with COR elements
      return this.getMockAuditQuestions();
    } catch (error) {
      console.error('Failed to fetch audit questions:', error);
      return [];
    }
  }

  // ===========================================================================
  // EVIDENCE UPLOAD
  // ===========================================================================

  /**
   * Uploads a batch of evidence items to AuditSoft
   */
  async uploadEvidence(items: EvidenceUploadItem[]): Promise<AuditSoftUploadResponse> {
    try {
      await this.simulateDelay(items.length * 50); // Simulate processing time

      // Simulate successful upload
      return {
        success: true,
        batch_id: `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        items_received: items.length,
        errors: [], // No errors in simulation
      };
    } catch (error) {
      console.error('Failed to upload evidence:', error);
      return {
        success: false,
        errors: [{ item_id: 'batch', error: error instanceof Error ? error.message : 'Upload failed' }],
      };
    }
  }

  /**
   * Uploads a single file to AuditSoft
   */
  async uploadFile(
    fileData: Blob,
    fileName: string,
    metadata: FileMetadata
  ): Promise<{ success: boolean; file_id?: string; error?: string }> {
    try {
      await this.simulateDelay(100);

      return {
        success: true,
        file_id: `FILE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'File upload failed',
      };
    }
  }

  // ===========================================================================
  // SYNC STATUS
  // ===========================================================================

  /**
   * Gets the sync status for a previously uploaded batch
   */
  async getBatchStatus(batchId: string): Promise<BatchStatus> {
    try {
      await this.simulateDelay(200);

      return {
        batch_id: batchId,
        status: 'completed',
        items_processed: 100,
        items_accepted: 98,
        items_rejected: 2,
      };
    } catch (error) {
      console.error('Failed to get batch status:', error);
      return {
        batch_id: batchId,
        status: 'unknown',
        items_processed: 0,
        items_accepted: 0,
        items_rejected: 0,
      };
    }
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateCompanyId(): string {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  private getNextAuditDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date.toISOString().split('T')[0];
  }

  private getMockAuditQuestions(): AuditSoftQuestion[] {
    return [
      // Element 1: Management Leadership
      { id: 'Q1.1', element: 1, category: 'Policy', question_text: 'Is there a written H&S policy?', evidence_types: ['document'] },
      { id: 'Q1.2', element: 1, category: 'Policy', question_text: 'Is the policy signed by senior management?', evidence_types: ['document'] },
      { id: 'Q1.3', element: 1, category: 'Responsibilities', question_text: 'Are H&S responsibilities defined?', evidence_types: ['document', 'form_submission'] },
      
      // Element 2: Hazard Identification
      { id: 'Q2.1', element: 2, category: 'Hazard Assessment', question_text: 'Are hazard assessments conducted?', evidence_types: ['form_submission', 'hazard_assessment'] },
      { id: 'Q2.2', element: 2, category: 'Hazard Assessment', question_text: 'Are workers involved in hazard identification?', evidence_types: ['form_submission', 'meeting_minutes'] },
      
      // Element 3: Hazard Control
      { id: 'Q3.1', element: 3, category: 'Controls', question_text: 'Are hazard controls documented?', evidence_types: ['document', 'form_submission'] },
      { id: 'Q3.2', element: 3, category: 'PPE', question_text: 'Is PPE provided and used correctly?', evidence_types: ['inspection', 'form_submission'] },
      
      // Element 4: Inspections
      { id: 'Q4.1', element: 4, category: 'Workplace Inspections', question_text: 'Are regular workplace inspections conducted?', evidence_types: ['inspection', 'form_submission'] },
      { id: 'Q4.2', element: 4, category: 'Deficiency Tracking', question_text: 'Are deficiencies tracked and corrected?', evidence_types: ['corrective_action', 'form_submission'] },
      
      // Element 5: Training
      { id: 'Q5.1', element: 5, category: 'Orientation', question_text: 'Is orientation training provided?', evidence_types: ['training_record', 'certification'] },
      { id: 'Q5.2', element: 5, category: 'Competency', question_text: 'Are workers competent for their tasks?', evidence_types: ['certification', 'training_record'] },
      
      // Element 6: Emergency Response
      { id: 'Q6.1', element: 6, category: 'Emergency Plan', question_text: 'Is there an emergency response plan?', evidence_types: ['document'] },
      { id: 'Q6.2', element: 6, category: 'Drills', question_text: 'Are emergency drills conducted?', evidence_types: ['form_submission', 'training_record'] },
      
      // Element 7: Incident Investigation
      { id: 'Q7.1', element: 7, category: 'Investigations', question_text: 'Are incidents investigated?', evidence_types: ['incident_report', 'form_submission'] },
      { id: 'Q7.2', element: 7, category: 'Corrective Actions', question_text: 'Are corrective actions implemented?', evidence_types: ['corrective_action', 'form_submission'] },
      
      // Element 8: Program Administration
      { id: 'Q8.1', element: 8, category: 'Program Review', question_text: 'Is the H&S program reviewed annually?', evidence_types: ['document', 'meeting_minutes'] },
      { id: 'Q8.2', element: 8, category: 'Statistics', question_text: 'Are H&S statistics tracked?', evidence_types: ['document', 'form_submission'] },
      
      // Element 9: JHSC
      { id: 'Q9.1', element: 9, category: 'Committee', question_text: 'Is there a JHSC or H&S representative?', evidence_types: ['document', 'meeting_minutes'] },
      { id: 'Q9.2', element: 9, category: 'Meetings', question_text: 'Are committee meetings held regularly?', evidence_types: ['meeting_minutes'] },
      
      // Element 10: Preventive Maintenance
      { id: 'Q10.1', element: 10, category: 'Maintenance Program', question_text: 'Is there a preventive maintenance program?', evidence_types: ['maintenance_record', 'document'] },
      { id: 'Q10.2', element: 10, category: 'Records', question_text: 'Are maintenance records kept?', evidence_types: ['maintenance_record'] },
      
      // Element 11: Occupational Health
      { id: 'Q11.1', element: 11, category: 'Health Hazards', question_text: 'Are occupational health hazards identified?', evidence_types: ['hazard_assessment', 'document'] },
      { id: 'Q11.2', element: 11, category: 'Monitoring', question_text: 'Is health monitoring conducted where needed?', evidence_types: ['document', 'form_submission'] },
      
      // Element 12: First Aid
      { id: 'Q12.1', element: 12, category: 'First Aid', question_text: 'Are first aid supplies available?', evidence_types: ['inspection', 'form_submission'] },
      { id: 'Q12.2', element: 12, category: 'First Aiders', question_text: 'Are trained first aiders available?', evidence_types: ['certification', 'training_record'] },
      
      // Element 13: Statistics
      { id: 'Q13.1', element: 13, category: 'Statistics', question_text: 'Are injury/illness statistics tracked?', evidence_types: ['document', 'form_submission'] },
      { id: 'Q13.2', element: 13, category: 'Analysis', question_text: 'Are statistics analyzed for trends?', evidence_types: ['document', 'meeting_minutes'] },
      
      // Element 14: Legislation
      { id: 'Q14.1', element: 14, category: 'Compliance', question_text: 'Is there a process for staying current with legislation?', evidence_types: ['document'] },
      { id: 'Q14.2', element: 14, category: 'Communication', question_text: 'Are regulatory changes communicated to workers?', evidence_types: ['document', 'form_submission', 'meeting_minutes'] },
    ];
  }
}

// =============================================================================
// SUPPORTING TYPES
// =============================================================================

export interface EvidenceUploadItem {
  type: EvidenceSource;
  local_id: string;
  cor_element: number;
  title: string;
  description?: string;
  date: string;
  file_ids?: string[];
  metadata?: Record<string, unknown>;
}

export interface FileMetadata {
  type: EvidenceSource;
  cor_element: number;
  title: string;
  date: string;
}

export interface BatchStatus {
  batch_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'unknown';
  items_processed: number;
  items_accepted: number;
  items_rejected: number;
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates an AuditSoft client instance
 */
export function createAuditSoftClient(
  apiKey: string,
  environment: 'sandbox' | 'production' = 'production'
): AuditSoftClient {
  return new AuditSoftClient(apiKey, environment);
}

// =============================================================================
// ENCRYPTION HELPERS
// =============================================================================

/**
 * Simple encryption for API keys (for demonstration)
 * In production, use a proper encryption library like crypto-js or node-forge
 */
export function encryptApiKey(apiKey: string): string {
  // Use base64 encoding as a simple obfuscation
  // In production, implement proper AES encryption with a server-side key
  return Buffer.from(apiKey).toString('base64');
}

export function decryptApiKey(encrypted: string): string {
  return Buffer.from(encrypted, 'base64').toString('utf-8');
}

export function getApiKeyHint(apiKey: string): string {
  if (!apiKey || apiKey.length < 4) return '****';
  return `****${apiKey.slice(-4)}`;
}
