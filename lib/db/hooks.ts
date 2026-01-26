/**
 * React Hooks for Safe Query Builders
 * 
 * These hooks provide convenient access to the type-safe query builders
 * in React components, automatically handling user context and role checks.
 */

'use client';

import { useMemo } from 'react';
import { createNeonWrapper } from './neon-wrapper';
import {
  createSafeQuery,
  createSuperAdminQuery,
  type SupabaseLikeClient,
  type SafeQueryBuilder,
  type SuperAdminQueryBuilder,
} from './safe-query';
import type { UserRole } from './types';

// =============================================================================
// USER CONTEXT TYPE
// =============================================================================

export interface UserContext {
  userId: string;
  companyId: string;
  role: UserRole;
}

// =============================================================================
// NEON CLIENT SINGLETON
// =============================================================================

let neonClient: ReturnType<typeof createNeonWrapper> | null = null;

/**
 * Gets or creates the Neon client singleton.
 */
function getNeonClient() {
  if (neonClient) {
    return neonClient;
  }
  neonClient = createNeonWrapper();
  return neonClient;
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
  const neon = getNeonClient();

  const safeQuery = useMemo(() => {
    return createSafeQuery(neon, userContext.companyId, userContext.role);
  }, [neon, userContext.companyId, userContext.role]);

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
  const neon = getNeonClient();

  const adminQuery = useMemo(() => {
    // This will throw if not super_admin
    return createSuperAdminQuery(neon, userContext.role);
  }, [neon, userContext.role]);

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
  const neon = getNeonClient();

  const query = useMemo(() => {
    if (userContext.role === 'super_admin') {
      return createSuperAdminQuery(neon, userContext.role);
    }
    return createSafeQuery(neon, userContext.companyId, userContext.role);
  }, [neon, userContext.companyId, userContext.role]);

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
  
  const neon = getNeonClient();

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
      // TODO: Replace with actual auth logic for Neon
      // For now, return null as placeholder
      return null;
    },
  };
}
