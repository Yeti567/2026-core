/**
 * Document Control System
 * 
 * Comprehensive document management including:
 * - Document registry with control numbers
 * - Version control and revision tracking
 * - Multi-step approval workflows
 * - Scheduled reviews
 * - Distribution and acknowledgment tracking
 * - Legal-compliant archiving
 * - PDF text extraction
 * - Full-text search
 * - COR audit integration
 */

// ============================================================================
// TYPES
// ============================================================================

export * from './types';

// ============================================================================
// DOCUMENT SERVICE
// ============================================================================

export {
  // Document Types
  getDocumentTypes,
  getDocumentType,
  
  // Document CRUD
  createDocument,
  getDocumentById,
  getDocumentByControlNumber,
  getDocumentFull,
  updateDocument,
  listDocuments,
  
  // Revision Management
  createRevision,
  getDocumentRevisions,
  
  // Approval Workflow
  createApprovalWorkflow,
  getDocumentApprovals,
  submitApproval,
  getPendingApprovals,
  
  // Review Management
  createReview,
  completeReview,
  getDocumentsDueForReview,
  
  // Distribution & Acknowledgment
  distributeDocument,
  acknowledgeDistribution,
  getUnacknowledgedDistributions,
  
  // Status Transitions
  updateDocumentStatus,
  submitForReview,
  activateDocument,
  
  // Archive Operations
  archiveDocument,
  getArchivedDocuments,
  
  // Search (from document-service)
  searchDocuments as searchDocumentsDB,
  
  // Statistics
  getRegistryStats,
  
  // Version Management
  getDocumentVersions,
  getVersion,
  createVersion,
  transitionStatus,
  type DocumentVersionRecord,
  
  // Archive Management
  getArchivedVersions,
  getArchivedVersion,
  archiveVersion,
  type ArchivedVersionRecord,
  
  // Document with History
  getDocumentWithHistory,
  obsoleteDocument,
} from './document-service';

// ============================================================================
// PDF EXTRACTION
// ============================================================================

export {
  // Core extraction
  extractTextFromPDF,
  extractTextFromPDFWithPages,
  
  // Control number detection
  findControlNumbers,
  findControlNumbersWithContext,
  findDocumentReferences,
  isValidControlNumber,
  parseControlNumber,
  
  // Text processing
  cleanExtractedText,
  extractKeywords,
  extractSnippet,
  highlightMatches,
  calculateRelevance,
  
  // Storage operations
  uploadToStorage,
  downloadFromStorage,
  getStorageUrl,
  processUploadedDocument,
  
  // Types
  type PDFExtractionResult,
  type PDFInfo,
  type PDFMetadata,
  type DocumentReference,
  type ControlNumberMatch,
  type DocumentSearchFilters,
  type DocumentSearchResult as PDFSearchResult,
} from './pdf-extractor';

// ============================================================================
// SEARCH SERVICE
// ============================================================================

export {
  searchDocuments,
  searchByControlNumber,
  searchDocumentContent,
  getSearchSuggestions,
  findDocumentsWithControlNumbers,
  getRecentDocuments,
  getDocumentsForCORElement,
  type SearchResults,
  type SearchFacets,
} from './search-service';

// ============================================================================
// REINDEX SERVICE
// ============================================================================

export {
  reindexAllDocuments,
  reindexDocument,
  getDocumentsNeedingReindex,
  refreshSearchVectors,
  type ReindexResult,
  type ReindexSummary,
  type ReindexOptions,
} from './reindex-documents';

// ============================================================================
// AUDIT INTEGRATION
// ============================================================================

export {
  linkDocumentToAudit,
  unlinkDocumentFromAudit,
  getDocumentAuditLinks,
  getDocumentsForAuditElement,
  detectRelevantAuditElements,
  autoLinkDocument,
  validateDocumentForAudit,
  validateElementDocuments,
  generateElementEvidenceReport,
  generateFullEvidenceReport,
  findPotentialEvidence,
  type AuditDocumentRequirement,
  type DocumentValidationResult,
  type ValidationIssue,
  type AuditEvidenceReport,
} from './audit-integration';

// ============================================================================
// FOLDER SERVICE
// ============================================================================

export {
  getFolders,
  getFolderTree,
  getFolderById,
  getFolderByPath,
  createFolder,
  updateFolder,
  deleteFolder,
  moveDocumentToFolder,
  moveDocumentsToFolder,
  getDocumentsInFolder,
  initializeCompanyFolders,
  suggestFolderForDocument,
  getFolderStats,
} from './folder-service';

// ============================================================================
// METADATA SUGGESTER
// ============================================================================

export {
  suggestMetadata,
  batchSuggestMetadata,
} from './metadata-suggester';

// ============================================================================
// ACKNOWLEDGMENT SERVICE
// ============================================================================

export {
  createAcknowledgmentRequirements,
  getDocumentAcknowledgments,
  getWorkerAcknowledgments,
  acknowledgeDocument,
  acknowledgeDocumentByWorker,
  updateOverdueAcknowledgments,
  getAcknowledgmentSummary,
  sendAcknowledgmentReminder,
  exemptFromAcknowledgment,
} from './acknowledgment-service';

// ============================================================================
// METADATA EXTRACTION
// ============================================================================

export {
  extractMetadataFromFile,
  batchExtractMetadata,
  QUICK_UPLOAD_PRESETS,
  type SuggestedMetadata,
  type MetadataExtractionResult,
  type QuickUploadPresetKey,
} from './metadata-extractor';