/**
 * Form Builder Module
 * 
 * Exports for the dynamic form building system.
 */

// Types
export * from './types';

// Schema utilities
export { 
  validateSchema,
  getFieldById,
  getFieldsInSection,
  evaluateCondition,
  getRequiredFields,
  getDefaultValues,
} from './schema-utils';

// Form hooks
export { useFormTemplate } from './use-form-template';

// Library integration
export {
  type LibrarySource,
  type LibraryFilters,
  type LibraryFieldConfig,
  type LibraryItem,
  type HazardLibraryItem,
  type EquipmentLibraryItem,
  type TaskLibraryItem,
  type WorkerLibraryItem,
  type JobsiteLibraryItem,
  type SDSLibraryItem,
  fetchLibraryItems,
  getLibraryItem,
  getAutoPopulateValues,
  formatLibraryItemLabel,
  formatLibraryItemDescription,
  quickAddLibraryItem,
  searchLibrary,
  DEFAULT_FIELD_MAPPINGS,
} from './library-integration';

// Library hooks
export {
  useLibraryOptions,
  useHazardOptions,
  useEquipmentOptions,
  useTaskOptions,
  useWorkerOptions,
  useJobsiteOptions,
  useSDSOptions,
  useSingleLibraryItem,
  clearLibraryCache,
  clearLibraryCacheBySource,
  invalidateCompanyCache,
} from './use-library-options';

// Auto-populate
export {
  type AutoPopulateResult,
  type AutoPopulateOptions,
  autoPopulateFromLibrary,
  autoPopulateFromItem,
  autoPopulateFromJobsite,
  autoPopulateFromEquipment,
  autoPopulateFromHazard,
  autoPopulateFromTask,
  autoPopulateFromSDS,
  handleCascadeAutoPopulate,
  autoPopulateFromMultipleHazards,
} from './auto-populate';

// Offline sync
export {
  type LibrarySyncOptions,
  type LibrarySyncResult,
  syncLibrariesToLocal,
  getHazardsOfflineFirst,
  getEquipmentOfflineFirst,
  getWorkersOfflineFirst,
  getJobsitesOfflineFirst,
  getTasksOfflineFirst,
  getSDSOfflineFirst,
  startBackgroundLibrarySync,
  stopBackgroundLibrarySync,
} from './library-sync';

// PDF Conversion Types
export * from './pdf-conversion-types';

// PDF Conversion Publishing
export {
  type PublishOptions,
  type PublishResult,
  type PublishedFormTemplate,
  type FormFrequency,
  publishConvertedForm,
  createEditableDraft,
  generateFormCode,
} from './publish-converted-form';

// Components are exported from components/forms/form-renderer
