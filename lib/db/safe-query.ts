/**
 * Type-Safe Query Wrapper with Forced Company ID Filtering
 * 
 * This module provides a factory function that creates query builders
 * which automatically enforce company_id filtering on every query,
 * ensuring multi-tenant data isolation.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type {
  Database,
  UserRole,
  Worker,
  WorkerInsert,
  WorkerUpdate,
  Form,
  FormInsert,
  FormUpdate,
  EvidenceChain,
  EvidenceChainInsert,
  EvidenceChainUpdate,
  UserProfile,
  UserProfileInsert,
  UserProfileUpdate,
  Company,
  CompanyInsert,
  CompanyUpdate,
  QueryResult,
  QueryListResult,
} from './types';

// =============================================================================
// MINIMAL CLIENT INTERFACE (Supabase-like)
// =============================================================================

export interface SupabaseLikeClient {
  from(table: string): any;
  rpc(fn: string, params?: any): Promise<{ data: any; error: any }>;
}

// =============================================================================
// ZOD VALIDATION SCHEMAS
// =============================================================================

export const workerInsertSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email().nullable().optional(),
  position: z.string().nullable().optional(),
  hire_date: z.string().nullable().optional(),
});

export const workerUpdateSchema = workerInsertSchema.partial();

export const formInsertSchema = z.object({
  form_type: z.string().min(1, 'Form type is required'),
  form_data: z.record(z.unknown()).optional().default({}),
  worker_id: z.string().uuid().nullable().optional(),
});

export const formUpdateSchema = formInsertSchema.partial();

export const evidenceChainInsertSchema = z.object({
  audit_element: z.string().min(1, 'Audit element is required'),
  evidence_type: z.string().min(1, 'Evidence type is required'),
  evidence_id: z.string().uuid().nullable().optional(),
  worker_id: z.string().uuid().nullable().optional(),
});

export const evidenceChainUpdateSchema = evidenceChainInsertSchema.partial();

export const userProfileInsertSchema = z.object({
  user_id: z.string().uuid('Valid user ID is required'),
  company_id: z.string().uuid('Valid company ID is required'),
  role: z.enum(['super_admin', 'admin', 'internal_auditor', 'supervisor', 'worker']).optional(),
});

export const userProfileUpdateSchema = z.object({
  role: z.enum(['super_admin', 'admin', 'internal_auditor', 'supervisor', 'worker']).optional(),
});

export const companyInsertSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  wsib_number: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

export const companyUpdateSchema = companyInsertSchema.partial();

// =============================================================================
// SAFE QUERY BUILDER INTERFACES
// =============================================================================

export interface SafeWorkersQuery {
  /** List all workers in the company */
  list(): Promise<QueryListResult<Worker>>;
  /** Get a worker by ID (enforces company_id check) */
  getById(id: string): Promise<QueryResult<Worker>>;
  /** Create a new worker (auto-injects company_id) */
  create(data: WorkerInsert): Promise<QueryResult<Worker>>;
  /** Update a worker by ID (enforces company_id check) */
  update(id: string, data: WorkerUpdate): Promise<QueryResult<Worker>>;
  /** Delete a worker by ID (enforces company_id check) */
  delete(id: string): Promise<QueryResult<null>>;
  /** Search workers by name */
  search(query: string): Promise<QueryListResult<Worker>>;
}

export interface SafeFormsQuery {
  /** List all forms in the company */
  list(): Promise<QueryListResult<Form>>;
  /** Get a form by ID (enforces company_id check) */
  getById(id: string): Promise<QueryResult<Form>>;
  /** Create a new form (auto-injects company_id) */
  create(data: FormInsert): Promise<QueryResult<Form>>;
  /** Update a form by ID (enforces company_id check) */
  update(id: string, data: FormUpdate): Promise<QueryResult<Form>>;
  /** Delete a form by ID (enforces company_id check) */
  delete(id: string): Promise<QueryResult<null>>;
  /** List forms by type */
  listByType(formType: string): Promise<QueryListResult<Form>>;
  /** List forms for a specific worker */
  listByWorker(workerId: string): Promise<QueryListResult<Form>>;
}

export interface SafeEvidenceChainQuery {
  /** List all evidence records in the company */
  list(): Promise<QueryListResult<EvidenceChain>>;
  /** Get evidence by ID (enforces company_id check) */
  getById(id: string): Promise<QueryResult<EvidenceChain>>;
  /** Create a new evidence record (auto-injects company_id) */
  create(data: EvidenceChainInsert): Promise<QueryResult<EvidenceChain>>;
  /** Update evidence by ID (enforces company_id check) */
  update(id: string, data: EvidenceChainUpdate): Promise<QueryResult<EvidenceChain>>;
  /** Delete evidence by ID (enforces company_id check) */
  delete(id: string): Promise<QueryResult<null>>;
  /** List evidence by audit element */
  listByAuditElement(element: string): Promise<QueryListResult<EvidenceChain>>;
  /** List evidence for a specific worker */
  listByWorker(workerId: string): Promise<QueryListResult<EvidenceChain>>;
}

export interface SafeUserProfilesQuery {
  /** List all user profiles in the company */
  list(): Promise<QueryListResult<UserProfile>>;
  /** Get a user profile by ID (enforces company_id check) */
  getById(id: string): Promise<QueryResult<UserProfile>>;
  /** Get a user profile by user_id (enforces company_id check) */
  getByUserId(userId: string): Promise<QueryResult<UserProfile>>;
  /** Create a new user profile */
  create(data: UserProfileInsert): Promise<QueryResult<UserProfile>>;
  /** Update a user profile by ID (enforces company_id check) */
  update(id: string, data: UserProfileUpdate): Promise<QueryResult<UserProfile>>;
  /** Delete a user profile by ID (enforces company_id check) */
  delete(id: string): Promise<QueryResult<null>>;
}

export interface SafeCompaniesQuery {
  /** Get the current company */
  get(): Promise<QueryResult<Company>>;
  /** Update the current company */
  update(data: CompanyUpdate): Promise<QueryResult<Company>>;
}

export interface SuperAdminCompaniesQuery extends SafeCompaniesQuery {
  /** List all companies (super_admin only) */
  list(): Promise<QueryListResult<Company>>;
  /** Get a company by ID (super_admin only) */
  getById(id: string): Promise<QueryResult<Company>>;
  /** Create a new company (super_admin only) */
  create(data: CompanyInsert): Promise<QueryResult<Company>>;
  /** Delete a company (super_admin only) */
  delete(id: string): Promise<QueryResult<null>>;
}

export interface SafeQueryBuilder {
  workers: SafeWorkersQuery;
  forms: SafeFormsQuery;
  evidenceChain: SafeEvidenceChainQuery;
  userProfiles: SafeUserProfilesQuery;
  companies: SafeCompaniesQuery;
  /** The company ID this query builder is scoped to */
  companyId: string;
  /** The user's role */
  userRole: UserRole;
}

export interface SuperAdminQueryBuilder extends Omit<SafeQueryBuilder, 'companies'> {
  companies: SuperAdminCompaniesQuery;
  /** Query data for a specific company */
  forCompany(companyId: string): SafeQueryBuilder;
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a type-safe query builder that FORCES company_id filtering on every query.
 * 
 * @param supabase - The Supabase client instance
 * @param companyId - The company ID to scope all queries to
 * @param userRole - The user's role (for permission checks)
 * @returns A SafeQueryBuilder with methods for all tables
 * 
 * @example
 * ```typescript
 * const safeQuery = createSafeQuery(supabase, companyId, 'admin');
 * 
 * // All queries automatically filter by company_id
 * const { data: workers } = await safeQuery.workers.list();
 * const { data: worker } = await safeQuery.workers.getById('uuid');
 * 
 * // Inserts automatically inject company_id
 * const { data: newWorker } = await safeQuery.workers.create({
 *   first_name: 'John',
 *   last_name: 'Doe',
 * });
 * ```
 */
export function createSafeQuery(
  supabase: SupabaseLikeClient,
  companyId: string,
  userRole: UserRole
): SafeQueryBuilder {
  // -------------------------------------------------------------------------
  // WORKERS QUERY BUILDER
  // -------------------------------------------------------------------------
  const workers: SafeWorkersQuery = {
    async list() {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('company_id', companyId)
        .order('last_name', { ascending: true });
      return { data: data as unknown as Worker[] | null, error };
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();
      return { data: data as unknown as Worker | null, error };
    },

    async create(input: WorkerInsert) {
      const validated = workerInsertSchema.parse(input);
      const { data, error } = await supabase
        .from('workers')
        .insert({ ...validated, company_id: companyId })
        .select()
        .single();
      return { data: data as unknown as Worker | null, error };
    },

    async update(id: string, input: WorkerUpdate) {
      const validated = workerUpdateSchema.parse(input);
      const { data, error } = await supabase
        .from('workers')
        .update(validated)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();
      return { data: data as unknown as Worker | null, error };
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('workers')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      return { data: null, error };
    },

    async search(query: string) {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('company_id', companyId)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('last_name', { ascending: true });
      return { data: data as unknown as Worker[] | null, error };
    },
  };

  // -------------------------------------------------------------------------
  // FORMS QUERY BUILDER
  // -------------------------------------------------------------------------
  const forms: SafeFormsQuery = {
    async list() {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      return { data: data as unknown as Form[] | null, error };
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();
      return { data: data as unknown as Form | null, error };
    },

    async create(input: FormInsert) {
      const validated = formInsertSchema.parse(input);
      const { data, error } = await supabase
        .from('forms')
        .insert({ ...validated, company_id: companyId })
        .select()
        .single();
      return { data: data as unknown as Form | null, error };
    },

    async update(id: string, input: FormUpdate) {
      const validated = formUpdateSchema.parse(input);
      const { data, error } = await supabase
        .from('forms')
        .update(validated)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();
      return { data: data as unknown as Form | null, error };
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      return { data: null, error };
    },

    async listByType(formType: string) {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('company_id', companyId)
        .eq('form_type', formType)
        .order('created_at', { ascending: false });
      return { data: data as unknown as Form[] | null, error };
    },

    async listByWorker(workerId: string) {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('company_id', companyId)
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false });
      return { data: data as unknown as Form[] | null, error };
    },
  };

  // -------------------------------------------------------------------------
  // EVIDENCE CHAIN QUERY BUILDER
  // -------------------------------------------------------------------------
  const evidenceChain: SafeEvidenceChainQuery = {
    async list() {
      const { data, error } = await supabase
        .from('evidence_chain')
        .select('*')
        .eq('company_id', companyId)
        .order('timestamp', { ascending: false });
      return { data: data as unknown as EvidenceChain[] | null, error };
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from('evidence_chain')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();
      return { data: data as unknown as EvidenceChain | null, error };
    },

    async create(input: EvidenceChainInsert) {
      const validated = evidenceChainInsertSchema.parse(input);
      const { data, error } = await supabase
        .from('evidence_chain')
        .insert({ ...validated, company_id: companyId })
        .select()
        .single();
      return { data: data as unknown as EvidenceChain | null, error };
    },

    async update(id: string, input: EvidenceChainUpdate) {
      const validated = evidenceChainUpdateSchema.parse(input);
      const { data, error } = await supabase
        .from('evidence_chain')
        .update(validated)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();
      return { data: data as unknown as EvidenceChain | null, error };
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('evidence_chain')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      return { data: null, error };
    },

    async listByAuditElement(element: string) {
      const { data, error } = await supabase
        .from('evidence_chain')
        .select('*')
        .eq('company_id', companyId)
        .eq('audit_element', element)
        .order('timestamp', { ascending: false });
      return { data: data as unknown as EvidenceChain[] | null, error };
    },

    async listByWorker(workerId: string) {
      const { data, error } = await supabase
        .from('evidence_chain')
        .select('*')
        .eq('company_id', companyId)
        .eq('worker_id', workerId)
        .order('timestamp', { ascending: false });
      return { data: data as unknown as EvidenceChain[] | null, error };
    },
  };

  // -------------------------------------------------------------------------
  // USER PROFILES QUERY BUILDER
  // -------------------------------------------------------------------------
  const userProfiles: SafeUserProfilesQuery = {
    async list() {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      return { data: data as unknown as UserProfile[] | null, error };
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();
      return { data: data as unknown as UserProfile | null, error };
    },

    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .single();
      return { data: data as unknown as UserProfile | null, error };
    },

    async create(input: UserProfileInsert) {
      const validated = userProfileInsertSchema.parse(input);
      const { data, error } = await supabase
        .from('user_profiles')
        .insert(validated)
        .select()
        .single();
      return { data: data as unknown as UserProfile | null, error };
    },

    async update(id: string, input: UserProfileUpdate) {
      const validated = userProfileUpdateSchema.parse(input);
      const { data, error } = await supabase
        .from('user_profiles')
        .update(validated)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();
      return { data: data as unknown as UserProfile | null, error };
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      return { data: null, error };
    },
  };

  // -------------------------------------------------------------------------
  // COMPANIES QUERY BUILDER (Limited for regular users)
  // -------------------------------------------------------------------------
  const companies: SafeCompaniesQuery = {
    async get() {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      return { data: data as unknown as Company | null, error };
    },

    async update(input: CompanyUpdate) {
      const validated = companyUpdateSchema.parse(input);
      const { data, error } = await supabase
        .from('companies')
        .update(validated)
        .eq('id', companyId)
        .select()
        .single();
      return { data: data as unknown as Company | null, error };
    },
  };

  return {
    workers,
    forms,
    evidenceChain,
    userProfiles,
    companies,
    companyId,
    userRole,
  };
}

// =============================================================================
// SUPER ADMIN QUERY BUILDER
// =============================================================================

/**
 * Creates a query builder for super admins that can access all data across companies.
 * 
 * @param supabase - The Supabase client instance
 * @param userRole - Must be 'super_admin' or throws an error
 * @returns A SuperAdminQueryBuilder with unrestricted access
 * 
 * @throws Error if userRole is not 'super_admin'
 * 
 * @example
 * ```typescript
 * const adminQuery = createSuperAdminQuery(supabase, 'super_admin');
 * 
 * // List all companies
 * const { data: allCompanies } = await adminQuery.companies.list();
 * 
 * // Query a specific company's data
 * const companyQuery = adminQuery.forCompany('company-uuid');
 * const { data: workers } = await companyQuery.workers.list();
 * ```
 */
export function createSuperAdminQuery(
  supabase: SupabaseLikeClient,
  userRole: UserRole
): SuperAdminQueryBuilder {
  if (userRole !== 'super_admin') {
    throw new Error('Access denied: Super admin role required');
  }

  // -------------------------------------------------------------------------
  // WORKERS QUERY BUILDER (Unrestricted)
  // -------------------------------------------------------------------------
  const workers: SafeWorkersQuery = {
    async list() {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('last_name', { ascending: true });
      return { data: data as unknown as Worker[] | null, error };
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('id', id)
        .single();
      return { data: data as unknown as Worker | null, error };
    },

    async create(input: WorkerInsert) {
      const validated = workerInsertSchema.parse(input);
      if (!input.company_id) {
        throw new Error('company_id is required for super admin worker creation');
      }
      const { data, error } = await supabase
        .from('workers')
        .insert({ ...validated, company_id: input.company_id })
        .select()
        .single();
      return { data: data as unknown as Worker | null, error };
    },

    async update(id: string, input: WorkerUpdate) {
      const validated = workerUpdateSchema.parse(input);
      const { data, error } = await supabase
        .from('workers')
        .update(validated)
        .eq('id', id)
        .select()
        .single();
      return { data: data as unknown as Worker | null, error };
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('workers')
        .delete()
        .eq('id', id);
      return { data: null, error };
    },

    async search(query: string) {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('last_name', { ascending: true });
      return { data: data as unknown as Worker[] | null, error };
    },
  };

  // -------------------------------------------------------------------------
  // FORMS QUERY BUILDER (Unrestricted)
  // -------------------------------------------------------------------------
  const forms: SafeFormsQuery = {
    async list() {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .order('created_at', { ascending: false });
      return { data: data as unknown as Form[] | null, error };
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .single();
      return { data: data as unknown as Form | null, error };
    },

    async create(input: FormInsert) {
      const validated = formInsertSchema.parse(input);
      if (!input.company_id) {
        throw new Error('company_id is required for super admin form creation');
      }
      const { data, error } = await supabase
        .from('forms')
        .insert({ ...validated, company_id: input.company_id })
        .select()
        .single();
      return { data: data as unknown as Form | null, error };
    },

    async update(id: string, input: FormUpdate) {
      const validated = formUpdateSchema.parse(input);
      const { data, error } = await supabase
        .from('forms')
        .update(validated)
        .eq('id', id)
        .select()
        .single();
      return { data: data as unknown as Form | null, error };
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', id);
      return { data: null, error };
    },

    async listByType(formType: string) {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('form_type', formType)
        .order('created_at', { ascending: false });
      return { data: data as unknown as Form[] | null, error };
    },

    async listByWorker(workerId: string) {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false });
      return { data: data as unknown as Form[] | null, error };
    },
  };

  // -------------------------------------------------------------------------
  // EVIDENCE CHAIN QUERY BUILDER (Unrestricted)
  // -------------------------------------------------------------------------
  const evidenceChain: SafeEvidenceChainQuery = {
    async list() {
      const { data, error } = await supabase
        .from('evidence_chain')
        .select('*')
        .order('timestamp', { ascending: false });
      return { data: data as unknown as EvidenceChain[] | null, error };
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from('evidence_chain')
        .select('*')
        .eq('id', id)
        .single();
      return { data: data as unknown as EvidenceChain | null, error };
    },

    async create(input: EvidenceChainInsert) {
      const validated = evidenceChainInsertSchema.parse(input);
      if (!input.company_id) {
        throw new Error('company_id is required for super admin evidence creation');
      }
      const { data, error } = await supabase
        .from('evidence_chain')
        .insert({ ...validated, company_id: input.company_id })
        .select()
        .single();
      return { data: data as unknown as EvidenceChain | null, error };
    },

    async update(id: string, input: EvidenceChainUpdate) {
      const validated = evidenceChainUpdateSchema.parse(input);
      const { data, error } = await supabase
        .from('evidence_chain')
        .update(validated)
        .eq('id', id)
        .select()
        .single();
      return { data: data as unknown as EvidenceChain | null, error };
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('evidence_chain')
        .delete()
        .eq('id', id);
      return { data: null, error };
    },

    async listByAuditElement(element: string) {
      const { data, error } = await supabase
        .from('evidence_chain')
        .select('*')
        .eq('audit_element', element)
        .order('timestamp', { ascending: false });
      return { data: data as unknown as EvidenceChain[] | null, error };
    },

    async listByWorker(workerId: string) {
      const { data, error } = await supabase
        .from('evidence_chain')
        .select('*')
        .eq('worker_id', workerId)
        .order('timestamp', { ascending: false });
      return { data: data as unknown as EvidenceChain[] | null, error };
    },
  };

  // -------------------------------------------------------------------------
  // USER PROFILES QUERY BUILDER (Unrestricted)
  // -------------------------------------------------------------------------
  const userProfiles: SafeUserProfilesQuery = {
    async list() {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      return { data: data as unknown as UserProfile[] | null, error };
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', id)
        .single();
      return { data: data as unknown as UserProfile | null, error };
    },

    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      return { data: data as unknown as UserProfile | null, error };
    },

    async create(input: UserProfileInsert) {
      const validated = userProfileInsertSchema.parse(input);
      const { data, error } = await supabase
        .from('user_profiles')
        .insert(validated)
        .select()
        .single();
      return { data: data as unknown as UserProfile | null, error };
    },

    async update(id: string, input: UserProfileUpdate) {
      const validated = userProfileUpdateSchema.parse(input);
      const { data, error } = await supabase
        .from('user_profiles')
        .update(validated)
        .eq('id', id)
        .select()
        .single();
      return { data: data as unknown as UserProfile | null, error };
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', id);
      return { data: null, error };
    },
  };

  // -------------------------------------------------------------------------
  // COMPANIES QUERY BUILDER (Full access for super admin)
  // -------------------------------------------------------------------------
  const companies: SuperAdminCompaniesQuery = {
    async get() {
      throw new Error('Use getById() or list() for super admin company queries');
    },

    async list() {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true });
      return { data: data as unknown as Company[] | null, error };
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();
      return { data: data as unknown as Company | null, error };
    },

    async create(input: CompanyInsert) {
      const validated = companyInsertSchema.parse(input);
      const { data, error } = await supabase
        .from('companies')
        .insert(validated)
        .select()
        .single();
      return { data: data as unknown as Company | null, error };
    },

    async update(data: CompanyUpdate) {
      throw new Error('Use forCompany(id).companies.update() to update a specific company');
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);
      return { data: null, error };
    },
  };

  return {
    workers,
    forms,
    evidenceChain,
    userProfiles,
    companies,
    companyId: '', // Super admin has no default company
    userRole,
    forCompany(companyId: string) {
      return createSafeQuery(supabase, companyId, userRole);
    },
  };
}


