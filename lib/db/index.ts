/**
 * Database Module - Multi-Tenant Safe Queries
 * 
 * This module provides type-safe, multi-tenant aware database access.
 * All queries automatically enforce company_id filtering for data isolation.
 * 
 * @example
 * ```typescript
 * // In a React component
 * import { useSafeQuery, useSuperAdminQuery } from '@/lib/db';
 * 
 * function WorkersList({ userContext }) {
 *   const safeQuery = useSafeQuery(userContext);
 *   
 *   // All queries are automatically scoped to the user's company
 *   const { data } = await safeQuery.workers.list();
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // In a server action or API route
 * import { createSafeQuery, createSuperAdminQuery } from '@/lib/db';
 * 
 * async function getWorkers(supabase, companyId, userRole) {
 *   const safeQuery = createSafeQuery(supabase, companyId, userRole);
 *   return safeQuery.workers.list();
 * }
 * ```
 */

// Types
export type {
  Database,
  UserRole,
  Company,
  CompanyInsert,
  CompanyUpdate,
  UserProfile,
  UserProfileInsert,
  UserProfileUpdate,
  Worker,
  WorkerInsert,
  WorkerUpdate,
  Form,
  FormInsert,
  FormUpdate,
  EvidenceChain,
  EvidenceChainInsert,
  EvidenceChainUpdate,
  QueryResult,
  QueryListResult,
} from './types';

// Query builders
export {
  createSafeQuery,
  createSuperAdminQuery,
  type SafeQueryBuilder,
  type SuperAdminQueryBuilder,
  type SafeWorkersQuery,
  type SafeFormsQuery,
  type SafeEvidenceChainQuery,
  type SafeUserProfilesQuery,
  type SafeCompaniesQuery,
  type SuperAdminCompaniesQuery,
} from './safe-query';

// Validation schemas
export {
  workerInsertSchema,
  workerUpdateSchema,
  formInsertSchema,
  formUpdateSchema,
  evidenceChainInsertSchema,
  evidenceChainUpdateSchema,
  userProfileInsertSchema,
  userProfileUpdateSchema,
  companyInsertSchema,
  companyUpdateSchema,
} from './safe-query';

// React hooks
export {
  useSafeQuery,
  useSuperAdminQuery,
  useConditionalQuery,
  useUserContext,
  isSuperAdminQuery,
  type UserContext,
} from './hooks';

// Local IndexedDB (offline storage)
export {
  localDB,
  type CORLocalDatabase,
  type LocalForm,
  type LocalEvidence,
  type SyncQueueItem,
  type PhotoAttachment,
  type GPSCoordinates,
  type SyncStatus,
  type QueueStatus,
  type SyncItemType,
  type SyncPriority,
} from './local-db';
