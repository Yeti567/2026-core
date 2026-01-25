'use client';

/**
 * useLibraryOptions Hook
 * 
 * React hook for fetching and managing library data in forms.
 * Provides caching, offline support, and optimistic updates.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LibrarySource,
  LibraryFilters,
  LibraryItem,
  fetchLibraryItems,
  getLibraryItem,
  formatLibraryItemLabel,
  formatLibraryItemDescription,
  getLibraryItemId,
} from './library-integration';

// =============================================================================
// Types
// =============================================================================

interface UseLibraryOptionsConfig {
  /** Which library to fetch from */
  source: LibrarySource;
  /** Filters to apply */
  filters?: LibraryFilters;
  /** Company ID for scoping */
  companyId?: string;
  /** Whether to enable the query */
  enabled?: boolean;
  /** Cache time in milliseconds */
  staleTime?: number;
  /** Whether to include offline fallback */
  offlineEnabled?: boolean;
}

interface UseLibraryOptionsReturn {
  /** Library items */
  data: LibraryItem[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch function */
  refetch: () => Promise<void>;
  /** Get a single item by ID */
  getItem: (id: string) => LibraryItem | undefined;
  /** Get item label */
  getLabel: (item: LibraryItem) => string;
  /** Get item description */
  getDescription: (item: LibraryItem) => string | null;
  /** Get item ID */
  getId: (item: LibraryItem) => string;
  /** Search within loaded data */
  search: (term: string) => LibraryItem[];
  /** Filter by category */
  filterByCategory: (category: string) => LibraryItem[];
  /** Is data stale */
  isStale: boolean;
  /** Last fetch timestamp */
  lastFetched: Date | null;
}

// =============================================================================
// In-Memory Cache
// =============================================================================

interface CacheEntry {
  data: LibraryItem[];
  timestamp: number;
  source: LibrarySource;
  filters: string;
  companyId?: string;
}

const memoryCache = new Map<string, CacheEntry>();

function getCacheKey(source: LibrarySource, filters?: LibraryFilters, companyId?: string): string {
  return `${source}:${companyId || 'global'}:${JSON.stringify(filters || {})}`;
}

function getCachedData(key: string, staleTime: number): CacheEntry | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  
  const isStale = Date.now() - entry.timestamp > staleTime;
  if (isStale) return null;
  
  return entry;
}

function setCachedData(key: string, data: LibraryItem[], source: LibrarySource, filters?: LibraryFilters, companyId?: string): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    source,
    filters: JSON.stringify(filters || {}),
    companyId,
  });
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useLibraryOptions({
  source,
  filters,
  companyId,
  enabled = true,
  staleTime = 5 * 60 * 1000, // 5 minutes default
  offlineEnabled = true,
}: UseLibraryOptionsConfig): UseLibraryOptionsReturn {
  const [data, setData] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);
  
  const cacheKey = useMemo(
    () => getCacheKey(source, filters, companyId),
    [source, filters, companyId]
  );
  
  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Check cache first
      const cached = getCachedData(cacheKey, staleTime);
      if (cached) {
        setData(cached.data);
        setLastFetched(new Date(cached.timestamp));
        setIsLoading(false);
        return;
      }
      
      // Fetch from API
      const items = await fetchLibraryItems(source, filters, companyId);
      
      // Update cache
      setCachedData(cacheKey, items, source, filters, companyId);
      
      setData(items);
      setLastFetched(new Date());
      setIsStale(false);
      
    } catch (err) {
      console.error(`Error fetching ${source} library:`, err);
      setError(err instanceof Error ? err : new Error('Failed to fetch library data'));
      
      // Try to use stale cache if available
      const staleCache = memoryCache.get(cacheKey);
      if (staleCache) {
        setData(staleCache.data);
        setIsStale(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, cacheKey, source, filters, companyId, staleTime]);
  
  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Check for staleness periodically
  useEffect(() => {
    if (!enabled || !lastFetched) return;
    
    const checkStale = () => {
      const isNowStale = Date.now() - lastFetched.getTime() > staleTime;
      setIsStale(isNowStale);
    };
    
    const interval = setInterval(checkStale, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [enabled, lastFetched, staleTime]);
  
  // Helper functions
  const getItem = useCallback(
    (id: string) => data.find(item => getLibraryItemId(item) === id),
    [data]
  );
  
  const getLabel = useCallback(
    (item: LibraryItem) => formatLibraryItemLabel(item, source),
    [source]
  );
  
  const getDescription = useCallback(
    (item: LibraryItem) => formatLibraryItemDescription(item, source),
    [source]
  );
  
  const getId = useCallback(
    (item: LibraryItem) => getLibraryItemId(item),
    []
  );
  
  const search = useCallback(
    (term: string) => {
      if (!term) return data;
      const lowerTerm = term.toLowerCase();
      return data.filter(item => {
        const label = formatLibraryItemLabel(item, source).toLowerCase();
        const desc = formatLibraryItemDescription(item, source)?.toLowerCase() || '';
        return label.includes(lowerTerm) || desc.includes(lowerTerm);
      });
    },
    [data, source]
  );
  
  const filterByCategory = useCallback(
    (category: string) => {
      return data.filter(item => {
        if ('category' in item) {
          return (item as { category: string }).category === category;
        }
        return true;
      });
    },
    [data]
  );
  
  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    getItem,
    getLabel,
    getDescription,
    getId,
    search,
    filterByCategory,
    isStale,
    lastFetched,
  };
}

// =============================================================================
// Specialized Hooks
// =============================================================================

/**
 * Hook for fetching hazards
 */
export function useHazardOptions(
  filters?: LibraryFilters,
  companyId?: string,
  enabled = true
) {
  return useLibraryOptions({
    source: 'hazards',
    filters,
    companyId,
    enabled,
  });
}

/**
 * Hook for fetching equipment
 */
export function useEquipmentOptions(
  filters?: LibraryFilters,
  companyId?: string,
  enabled = true
) {
  return useLibraryOptions({
    source: 'equipment',
    filters,
    companyId,
    enabled,
  });
}

/**
 * Hook for fetching tasks
 */
export function useTaskOptions(
  filters?: LibraryFilters,
  companyId?: string,
  enabled = true
) {
  return useLibraryOptions({
    source: 'tasks',
    filters,
    companyId,
    enabled,
  });
}

/**
 * Hook for fetching workers
 */
export function useWorkerOptions(
  filters?: LibraryFilters,
  companyId?: string,
  enabled = true
) {
  return useLibraryOptions({
    source: 'workers',
    filters,
    companyId,
    enabled,
  });
}

/**
 * Hook for fetching jobsites
 */
export function useJobsiteOptions(
  filters?: LibraryFilters,
  companyId?: string,
  enabled = true
) {
  return useLibraryOptions({
    source: 'jobsites',
    filters,
    companyId,
    enabled,
  });
}

/**
 * Hook for fetching SDS items
 */
export function useSDSOptions(
  filters?: LibraryFilters,
  companyId?: string,
  enabled = true
) {
  return useLibraryOptions({
    source: 'sds',
    filters,
    companyId,
    enabled,
  });
}

// =============================================================================
// Single Item Hook
// =============================================================================

interface UseSingleLibraryItemReturn {
  data: LibraryItem | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSingleLibraryItem(
  source: LibrarySource,
  itemId: string | null,
  enabled = true
): UseSingleLibraryItemReturn {
  const [data, setData] = useState<LibraryItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchItem = useCallback(async () => {
    if (!enabled || !itemId) {
      setData(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const item = await getLibraryItem(source, itemId);
      setData(item);
    } catch (err) {
      console.error(`Error fetching ${source} item:`, err);
      setError(err instanceof Error ? err : new Error('Failed to fetch item'));
    } finally {
      setIsLoading(false);
    }
  }, [enabled, itemId, source]);
  
  useEffect(() => {
    fetchItem();
  }, [fetchItem]);
  
  return {
    data,
    isLoading,
    error,
    refetch: fetchItem,
  };
}

// =============================================================================
// Cache Management
// =============================================================================

/**
 * Clear all cached library data
 */
export function clearLibraryCache(): void {
  memoryCache.clear();
}

/**
 * Clear cached data for a specific library
 */
export function clearLibraryCacheBySource(source: LibrarySource): void {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(`${source}:`)) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Invalidate cache for a company (useful after mutations)
 */
export function invalidateCompanyCache(companyId: string): void {
  for (const key of memoryCache.keys()) {
    if (key.includes(`:${companyId}:`)) {
      memoryCache.delete(key);
    }
  }
}

export default useLibraryOptions;
