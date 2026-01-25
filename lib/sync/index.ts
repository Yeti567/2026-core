/**
 * Sync Module - Offline Synchronization
 * 
 * Provides state machine-based synchronization of offline data with the server.
 */

export {
  SyncEngine,
  createSyncEngine,
  type SyncEngineConfig,
  type SyncResult,
  type SyncError,
  type SyncNotification,
  type SyncStats,
} from './sync-engine';

export {
  submitForm,
  saveDraft,
  loadDraft,
  deleteDraft,
  getCurrentGPS,
  createAutoSave,
  type BaseFormData,
  type HazardAssessmentFormData,
  type FormSubmissionResult,
  type SaveFormOptions,
} from './form-submission';

export {
  queueFormSubmission,
  syncPendingForms,
  getPendingFormCount,
  getPendingForms,
  deletePendingForm,
  retryForm,
  setupAutoSync,
  type QueuedForm,
} from './form-queue';