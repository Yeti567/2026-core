/**
 * React Hooks for Safe Query Builders
 * 
 * These hooks provide convenient access to the type-safe query builders
 * in React components, automatically handling user context and role checks.
 */

'use client';

import { useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  createSafeQuery,
  createSuperAdminQuery,
  type SafeQueryBuilder,
  type SuperAdminQueryBuilder,
} from './safe-query';
import type { Database, UserRole } from './types';

// =============================================================================
// USER CONTEXT TYPE
// =============================================================================

export interface UserContext {
  userId: string;
  companyId: string;
  role: UserRole;
}

// =============================================================================
// SUPABASE CLIENT SINGLETON
// =============================================================================

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Gets or creates the Supabase client singleton.
 * Uses environment variables for configuration.
 */
function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook that returns a type-safe query builder scoped to the current user's company.
 * 
 * All queries through this builder automatically filter by company_id,
 * ensuring multi-tenant data isolation.
 * 
 * @param userContext - The current user's context (userId, companyId, role)
 * @returns A SafeQueryBuilder instance
 * 
 * @example
 * ```tsx
 * function WorkersList({ userContext }: { userContext: UserContext }) {
 *   const safeQuery = useSafeQuery(userContext);
 *   const [workers, setWorkers] = useState<Worker[]>([]);
 * 
 *   useEffect(() => {
 *     safeQuery.workers.list().then(({ data }) => {
 *       if (data) setWorkers(data);
 *     });
 *   }, [safeQuery]);
 * 
 *   return (
 *     <ul>
 *       {workers.map(w => <li key={w.id}>{w.first_name} {w.last_name}</li>)}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useSafeQuery(userContext: UserContext): SafeQueryBuilder {
  const supabase = getSupabaseClient();

  const safeQuery = useMemo(() => {
    return createSafeQuery(supabase, userContext.companyId, userContext.role);
  }, [supabase, userContext.companyId, userContext.role]);

  return safeQuery;
}

/**
 * Hook that returns a super admin query builder with unrestricted access.
 * 
 * This hook checks that the user has the 'super_admin' role before
 * returning the query builder. If the user is not a super admin,
 * it throws an error.
 * 
 * @param userContext - The current user's context (must have super_admin role)
 * @returns A SuperAdminQueryBuilder instance
 * @throws Error if user is not a super_admin
 * 
 * @example
 * ```tsx
 * function CompanyManagement({ userContext }: { userContext: UserContext }) {
 *   // This will throw if userContext.role !== 'super_admin'
 *   const adminQuery = useSuperAdminQuery(userContext);
 *   const [companies, setCompanies] = useState<Company[]>([]);
 * 
 *   useEffect(() => {
 *     adminQuery.companies.list().then(({ data }) => {
 *       if (data) setCompanies(data);
 *     });
 *   }, [adminQuery]);
 * 
 *   return (
 *     <ul>
 *       {companies.map(c => <li key={c.id}>{c.name}</li>)}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useSuperAdminQuery(userContext: UserContext): SuperAdminQueryBuilder {
  const supabase = getSupabaseClient();

  const adminQuery = useMemo(() => {
    // This will throw if not super_admin
    return createSuperAdminQuery(supabase, userContext.role);
  }, [supabase, userContext.role]);

  return adminQuery;
}

/**
 * Hook that returns either a safe query or super admin query based on user role.
 * 
 * This is useful when you need conditional access - regular users get
 * company-scoped queries, while super admins get full access.
 * 
 * @param userContext - The current user's context
 * @returns Either a SafeQueryBuilder or SuperAdminQueryBuilder based on role
 * 
 * @example
 * ```tsx
 * function DataViewer({ userContext }: { userContext: UserContext }) {
 *   const query = useConditionalQuery(userContext);
 * 
 *   // For regular users, this lists workers in their company
 *   // For super admins, this lists all workers across all companies
 *   const { data } = await query.workers.list();
 * }
 * ```
 */
export function useConditionalQuery(
  userContext: UserContext
): SafeQueryBuilder | SuperAdminQueryBuilder {
  const supabase = getSupabaseClient();

  const query = useMemo(() => {
    if (userContext.role === 'super_admin') {
      return createSuperAdminQuery(supabase, userContext.role);
    }
    return createSafeQuery(supabase, userContext.companyId, userContext.role);
  }, [supabase, userContext.companyId, userContext.role]);

  return query;
}

/**
 * Type guard to check if a query builder is a SuperAdminQueryBuilder.
 * 
 * @param query - The query builder to check
 * @returns True if the query builder is a SuperAdminQueryBuilder
 * 
 * @example
 * ```tsx
 * const query = useConditionalQuery(userContext);
 * 
 * if (isSuperAdminQuery(query)) {
 *   // Can access all companies
 *   const { data } = await query.companies.list();
 * }
 * ```
 */
export function isSuperAdminQuery(
  query: SafeQueryBuilder | SuperAdminQueryBuilder
): query is SuperAdminQueryBuilder {
  return 'forCompany' in query;
}

// =============================================================================
// HELPER HOOKS
// =============================================================================

/**
 * Hook to fetch the current user's context from Supabase.
 * 
 * This hook calls the get_user_company_id() and get_user_role() database
 * functions to build the user context.
 * 
 * @returns Object with loading state, error, and userContext when loaded
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { loading, error, userContext } = useUserContext();
 * 
 *   if (loading) return <Loading />;
 *   if (error) return <Error message={error.message} />;
 *   if (!userContext) return <LoginRequired />;
 * 
 *   return <Dashboard userContext={userContext} />;
 * }
 * ```
 */
export function useUserContext() {
  // Note: This is a simplified implementation.
  // In a real app, you'd use React Query, SWR, or similar for caching
  // and would integrate with your auth provider.
  
  const supabase = getSupabaseClient();

  // This is a placeholder - actual implementation would use useEffect
  // and state management to fetch the user context asynchronously.
  // For now, we return a stub that components can build upon.
  
  return {
    loading: false,
    error: null as Error | null,
    userContext: null as UserContext | null,
    
    /**
     * Manually fetch the user context.
     * Call this after authentication to populate userContext.
     */
    async fetchUserContext(): Promise<UserContext | null> {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      // Call database functions to get company_id and role
      const [companyResult, roleResult] = await Promise.all([
        supabase.rpc('get_user_company_id'),
        supabase.rpc('get_user_role'),
      ]);

      if (companyResult.error || roleResult.error) {
        throw companyResult.error || roleResult.error;
      }

      return {
        userId: user.id,
        companyId: companyResult.data,
        role: roleResult.data as UserRole,
      };
    },
  };
}
