/**
 * AuditSoft Integration Module
 * 
 * Central export point for AuditSoft integration functionality.
 * 
 * Usage:
 * ```typescript
 * import { 
 *   saveAuditSoftConnection,
 *   getAuditSoftClient,
 *   encryptAPIKey,
 *   exportAllEvidenceToAuditSoft,
 * } from '@/lib/integrations/auditsoft';
 * ```
 */

// Types
export * from './types';

// Encryption utilities
export {
  encryptAPIKey,
  decryptAPIKey,
  validateEncryptedKey,
  getAPIKeyHint,
  isEncryptionConfigured,
} from './encryption';

// Client
export {
  AuditSoftClient,
  createAuditSoftClient,
} from './client';

// Connection management
export {
  saveAuditSoftConnection,
  getAuditSoftConnection,
  getDecryptedAPIKey,
  getAuditSoftClient,
  validateAuditSoftConnection,
  disconnectAuditSoft,
  updateSyncSettings,
  getAuditSoftStats,
  getSafeConnectionInfo,
} from './connection';

// Export engine
export {
  exportAllEvidenceToAuditSoft,
  exportSingleItem,
  getSyncHistory,
  type ExportOptions,
  type ExportProgress,
  type ExportResult,
  type ExportSummaryByType,
  type ExportError,
} from './export-engine';
