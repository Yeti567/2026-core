/**
 * Document Search Service
 * 
 * Full-text search across all documents using:
 * - PostgreSQL tsvector search with ranking
 * - Control number lookup
 * - Filter by status, type, COR elements
 * - Relevance scoring and snippet extraction
 */

import { createClient } from '@/lib/supabase/server';
import type {
  DocumentSearchResult,
  DocumentSearchParams,
  Document,
  DocumentTypeCode,
  DocumentStatus,
} from './types';
import { 
  extractSnippet, 
  highlightMatches, 
  calculateRelevance 
} from './pdf-extractor';

// ============================================================================
// TYPES
// ============================================================================

export interface SearchResults {
  results: DocumentSearchResult[];
  total: number;
  facets: SearchFacets;
  query: string;
  took_ms: number;
}

export interface SearchFacets {
  types: { type: DocumentTypeCode; count: number }[];
  statuses: { status: DocumentStatus; count: number }[];
  departments: { department: string; count: number }[];
  cor_elements: { element: number; count: number }[];
}

// ============================================================================
// MAIN SEARCH FUNCTION
// ============================================================================

/**
 * Full-text search across documents with ranking and facets
 */
export async function searchDocuments(
  companyId: string,
  params: DocumentSearchParams
): Promise<SearchResults> {
  const startTime = Date.now();
  const supabase = await createClient();
  
  const limit = params.limit || 20;
  const offset = params.offset || 0;
  const query = params.query?.trim() || '';
  
  // Build status filter
  const statusFilter = Array.isArray(params.status) 
    ? params.status 
    : params.status 
      ? [params.status]
      : ['active', 'approved'];
  
  // If we have a search query, use the database search function
  if (query) {
    try {
      const { data, error } = await supabase.rpc('search_documents', {
        p_company_id: companyId,
        p_search_query: query,
        p_status: statusFilter,
        p_document_types: params.document_type_code ? [params.document_type_code] : null,
        p_cor_elements: params.cor_elements || null,
        p_limit: limit,
        p_offset: offset,
      });
      
      if (error) throw error;
      
      const results: DocumentSearchResult[] = (data || []).map((row: any) => ({
        id: row.id,
        control_number: row.control_number,
        title: row.title,
        description: row.description,
        document_type_code: row.document_type_code,
        document_type_name: row.document_type_name,
        version: row.version,
        status: row.status,
        relevance_rank: row.relevance_rank,
        headline: row.headline,
      }));
      
      const facets = await getSearchFacets(companyId, query, statusFilter);
      
      return {
        results,
        total: results.length,
        facets,
        query,
        took_ms: Date.now() - startTime,
      };
    } catch (e) {
      console.error('Database search failed, falling back to basic search:', e);
    }
  }
  
  // Fall back to basic filtering
  return basicSearch(companyId, params, startTime);
}

/**
 * Basic search without full-text (filtering only)
 */
async function basicSearch(
  companyId: string,
  params: DocumentSearchParams,
  startTime: number
): Promise<SearchResults> {
  const supabase = await createClient();
  
  const statusFilter = Array.isArray(params.status) 
    ? params.status 
    : params.status 
      ? [params.status]
      : ['active', 'approved'];
  
  let query = supabase
    .from('documents')
    .select(`
      id,
      control_number,
      title,
      description,
      document_type_code,
      version,
      status,
      extracted_text,
      updated_at
    `, { count: 'exact' })
    .eq('company_id', companyId)
    .in('status', statusFilter);
  
  // Apply filters
  if (params.document_type_code) {
    query = query.eq('document_type_code', params.document_type_code);
  }
  if (params.department) {
    query = query.eq('department', params.department);
  }
  if (params.cor_elements?.length) {
    query = query.overlaps('cor_elements', params.cor_elements);
  }
  if (params.tags?.length) {
    query = query.overlaps('tags', params.tags);
  }
  if (params.query) {
    query = query.or(
      `title.ilike.%${params.query}%,` +
      `control_number.ilike.%${params.query}%,` +
      `description.ilike.%${params.query}%,` +
      `extracted_text.ilike.%${params.query}%`
    );
  }
  
  const limit = params.limit || 20;
  const offset = params.offset || 0;
  
  const { data, error, count } = await query
    .range(offset, offset + limit - 1)
    .order('updated_at', { ascending: false });
  
  if (error) {
    throw new Error(`Search failed: ${error.message}`);
  }
  
  // Calculate relevance and extract snippets
  const queryTerms = params.query?.toLowerCase().split(/\s+/).filter(t => t.length > 2) || [];
  
  const results: DocumentSearchResult[] = (data || []).map(doc => {
    const relevance = params.query 
      ? calculateRelevance(doc.extracted_text || '', params.query, doc.title)
      : 0;
    
    const snippet = params.query && doc.extracted_text
      ? highlightMatches(
          extractSnippet(doc.extracted_text, params.query, 200),
          queryTerms
        )
      : doc.description?.slice(0, 200) || '';
    
    return {
      id: doc.id,
      control_number: doc.control_number,
      title: doc.title,
      description: doc.description,
      document_type_code: doc.document_type_code as DocumentTypeCode,
      version: doc.version,
      status: doc.status as DocumentStatus,
      relevance_rank: relevance,
      headline: snippet,
    };
  });
  
  // Sort by relevance if searching
  if (params.query) {
    results.sort((a, b) => (b.relevance_rank || 0) - (a.relevance_rank || 0));
  }
  
  const facets = await getSearchFacets(companyId, params.query, statusFilter);
  
  return {
    results,
    total: count || results.length,
    facets,
    query: params.query || '',
    took_ms: Date.now() - startTime,
  };
}

// ============================================================================
// CONTROL NUMBER SEARCH
// ============================================================================

/**
 * Searches specifically by control number (exact or partial)
 */
export async function searchByControlNumber(
  companyId: string,
  controlNumber: string
): Promise<Document[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('company_id', companyId)
    .ilike('control_number', `%${controlNumber}%`)
    .order('control_number')
    .limit(20);
  
  if (error) {
    throw new Error(`Search failed: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Finds documents by exact control numbers
 */
export async function findDocumentsWithControlNumbers(
  companyId: string,
  controlNumbers: string[]
): Promise<Map<string, Document>> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('company_id', companyId)
    .in('control_number', controlNumbers.map(c => c.toUpperCase()));
  
  if (error) {
    throw new Error(`Failed to find documents: ${error.message}`);
  }
  
  const map = new Map<string, Document>();
  (data || []).forEach(doc => {
    map.set(doc.control_number, doc);
  });
  
  return map;
}

// ============================================================================
// CONTENT SEARCH
// ============================================================================

/**
 * Searches within document content (extracted text)
 */
export async function searchDocumentContent(
  companyId: string,
  query: string,
  limit: number = 20
): Promise<{
  documentId: string;
  controlNumber: string;
  title: string;
  matchedText: string;
  relevanceScore: number;
}[]> {
  const supabase = await createClient();
  
  // Try full-text search first
  const { data, error } = await supabase
    .from('documents')
    .select(`
      id,
      control_number,
      title,
      extracted_text
    `)
    .eq('company_id', companyId)
    .in('status', ['active', 'approved'])
    .textSearch('search_vector', query, {
      type: 'websearch',
      config: 'english',
    })
    .limit(limit);
  
  if (error) {
    // Fallback to ILIKE search
    const { data: fallbackData } = await supabase
      .from('documents')
      .select('id, control_number, title, extracted_text')
      .eq('company_id', companyId)
      .in('status', ['active', 'approved'])
      .ilike('extracted_text', `%${query}%`)
      .limit(limit);
    
    return (fallbackData || []).map(doc => ({
      documentId: doc.id,
      controlNumber: doc.control_number,
      title: doc.title,
      matchedText: highlightMatches(
        extractSnippet(doc.extracted_text || '', query),
        query.split(/\s+/)
      ),
      relevanceScore: calculateRelevance(doc.extracted_text || '', query, doc.title),
    }));
  }
  
  return (data || []).map(doc => ({
    documentId: doc.id,
    controlNumber: doc.control_number,
    title: doc.title,
    matchedText: highlightMatches(
      extractSnippet(doc.extracted_text || '', query),
      query.split(/\s+/)
    ),
    relevanceScore: calculateRelevance(doc.extracted_text || '', query, doc.title),
  }));
}

// ============================================================================
// SEARCH FACETS & SUGGESTIONS
// ============================================================================

/**
 * Gets search facets for filtering
 */
async function getSearchFacets(
  companyId: string,
  query?: string,
  statusFilter?: string[]
): Promise<SearchFacets> {
  const supabase = await createClient();
  
  let baseQuery = supabase
    .from('documents')
    .select('document_type_code, status, department, cor_elements')
    .eq('company_id', companyId);
  
  if (statusFilter?.length) {
    baseQuery = baseQuery.in('status', statusFilter);
  }
  
  if (query) {
    baseQuery = baseQuery.or(
      `title.ilike.%${query}%,control_number.ilike.%${query}%`
    );
  }
  
  const { data } = await baseQuery;
  
  // Aggregate facets
  const typeCounts = new Map<DocumentTypeCode, number>();
  const statusCounts = new Map<DocumentStatus, number>();
  const deptCounts = new Map<string, number>();
  const elementCounts = new Map<number, number>();
  
  (data || []).forEach(row => {
    // Count by type
    typeCounts.set(
      row.document_type_code as DocumentTypeCode, 
      (typeCounts.get(row.document_type_code) || 0) + 1
    );
    
    // Count by status
    statusCounts.set(
      row.status as DocumentStatus, 
      (statusCounts.get(row.status) || 0) + 1
    );
    
    // Count by department
    if (row.department) {
      deptCounts.set(row.department, (deptCounts.get(row.department) || 0) + 1);
    }
    
    // Count by COR element
    (row.cor_elements || []).forEach((el: number) => {
      elementCounts.set(el, (elementCounts.get(el) || 0) + 1);
    });
  });
  
  return {
    types: Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    statuses: Array.from(statusCounts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    departments: Array.from(deptCounts.entries())
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count),
    cor_elements: Array.from(elementCounts.entries())
      .map(([element, count]) => ({ element, count }))
      .sort((a, b) => a.element - b.element),
  };
}

/**
 * Gets search suggestions based on partial input
 */
export async function getSearchSuggestions(
  companyId: string,
  partialQuery: string,
  limit: number = 10
): Promise<string[]> {
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('documents')
    .select('title, control_number')
    .eq('company_id', companyId)
    .in('status', ['active', 'approved'])
    .or(`title.ilike.%${partialQuery}%,control_number.ilike.%${partialQuery}%`)
    .limit(limit * 2);
  
  const suggestions: string[] = [];
  const seen = new Set<string>();
  
  (data || []).forEach(row => {
    // Prefer control numbers
    if (row.control_number.toLowerCase().includes(partialQuery.toLowerCase())) {
      if (!seen.has(row.control_number)) {
        suggestions.push(row.control_number);
        seen.add(row.control_number);
      }
    }
    
    // Then titles
    if (suggestions.length < limit && row.title.toLowerCase().includes(partialQuery.toLowerCase())) {
      if (!seen.has(row.title)) {
        suggestions.push(row.title);
        seen.add(row.title);
      }
    }
  });
  
  return suggestions.slice(0, limit);
}

// ============================================================================
// RECENT & POPULAR
// ============================================================================

/**
 * Gets recently updated/viewed documents
 */
export async function getRecentDocuments(
  companyId: string,
  limit: number = 10
): Promise<Document[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('company_id', companyId)
    .in('status', ['active', 'approved', 'draft'])
    .order('updated_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    throw new Error(`Failed to fetch recent documents: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Finds documents related to specific COR elements
 */
export async function getDocumentsForCORElement(
  companyId: string,
  elementNumber: number
): Promise<Document[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .contains('cor_elements', [elementNumber])
    .order('control_number');
  
  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }
  
  return data || [];
}
