/**
 * Advanced Document Search API
 * 
 * Full-text search with filtering by folder, type, COR elements, tags, keywords, and roles
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSafeOrFilter } from '@/lib/utils/search-sanitizer';
import { handleDatabaseError, handleApiError } from '@/lib/utils/error-handling';
import { rateLimitByUser, createRateLimitHeaders } from '@/lib/utils/rate-limit';

export const dynamic = 'force-dynamic';


interface SearchParams {
  query?: string;
  folder_id?: string;
  document_type?: string;
  cor_elements?: number[];
  tags?: string[];
  keywords?: string[];
  roles?: string[];
  critical_only?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * POST /api/documents/search/advanced
 * Advanced document search with multiple filters
 */
export async function POST(request: NextRequest) {
  try {
    const body: SearchParams = await request.json();
    
    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting: 30 advanced searches per minute per user (prevent DoS)
    const rateLimitResult = await rateLimitByUser(user.id, 30, '1m');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many search requests. Please try again later.',
        },
        {
          status: 429,
          headers: {
            ...createRateLimitHeaders(rateLimitResult),
            'Retry-After': (rateLimitResult.reset - Math.floor(Date.now() / 1000)).toString(),
          },
        }
      );
    }

    // Get user profile for company ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Call advanced search function
    const { data, error } = await supabase.rpc('search_documents_advanced', {
      p_company_id: profile.company_id,
      p_search_query: body.query || null,
      p_folder_id: body.folder_id || null,
      p_document_type: body.document_type || null,
      p_cor_elements: body.cor_elements || null,
      p_tags: body.tags || null,
      p_keywords: body.keywords || null,
      p_roles: body.roles || null,
      p_critical_only: body.critical_only || false,
      p_limit: body.limit || 50,
      p_offset: body.offset || 0,
    });

    if (error) {
      console.error('Search error:', error);
      // Fall back to basic search if advanced function not available
      return await fallbackSearch(supabase, profile.company_id, body);
    }

    return NextResponse.json({
      results: data || [],
      total: data?.length || 0,
      limit: body.limit || 50,
      offset: body.offset || 0,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to perform search', 500, 'Advanced search');
  }
}

/**
 * Fallback search using basic queries if RPC is not available
 */
async function fallbackSearch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  params: SearchParams
) {
  let query = supabase
    .from('documents')
    .select(`
      id,
      control_number,
      title,
      description,
      folder_id,
      document_type_code,
      version,
      status,
      is_critical,
      worker_must_acknowledge,
      view_count,
      cor_elements,
      tags,
      keywords,
      effective_date,
      updated_at,
      document_folders!folder_id (
        name,
        folder_code,
        icon,
        color
      ),
      document_types!document_type_code (
        name
      )
    `)
    .eq('company_id', companyId)
    .in('status', ['active', 'approved']);

  // Apply filters
  if (params.folder_id) {
    query = query.eq('folder_id', params.folder_id);
  }

  if (params.document_type) {
    query = query.eq('document_type_code', params.document_type);
  }

  if (params.cor_elements && params.cor_elements.length > 0) {
    query = query.overlaps('cor_elements', params.cor_elements);
  }

  if (params.tags && params.tags.length > 0) {
    query = query.overlaps('tags', params.tags);
  }

  if (params.keywords && params.keywords.length > 0) {
    query = query.overlaps('keywords', params.keywords);
  }

  if (params.roles && params.roles.length > 0) {
    query = query.overlaps('applicable_to_roles', params.roles);
  }

  if (params.critical_only) {
    query = query.eq('is_critical', true);
  }

  // Text search (basic ILIKE) - sanitized to prevent SQL injection
  if (params.query) {
    const safeFilter = createSafeOrFilter(['title', 'description', 'control_number'], params.query);
    if (safeFilter) {
      query = query.or(safeFilter);
    }
  }

  // Apply pagination
  const limit = params.limit || 50;
  const offset = params.offset || 0;

  const { data, error } = await query
    .order('is_critical', { ascending: false })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return handleDatabaseError(error, 'search documents');
  }

  // Transform results
  const results = (data || []).map((doc: any) => {
    const folder = Array.isArray(doc.document_folders) ? doc.document_folders[0] : doc.document_folders;
    const docType = Array.isArray(doc.document_types) ? doc.document_types[0] : doc.document_types;
    return ({
    id: doc.id,
    control_number: doc.control_number,
    title: doc.title,
    description: doc.description,
    folder_id: doc.folder_id,
    folder_name: folder?.name,
    folder_code: folder?.folder_code,
    folder_icon: folder?.icon,
    folder_color: folder?.color,
    document_type: doc.document_type_code,
    document_type_name: docType?.name,
    version: doc.version,
    status: doc.status,
    is_critical: doc.is_critical,
    worker_must_acknowledge: doc.worker_must_acknowledge,
    relevance: 1.0,
    snippet: doc.description?.substring(0, 200) || '',
    view_count: doc.view_count,
    cor_elements: doc.cor_elements,
    tags: doc.tags,
    keywords: doc.keywords,
    effective_date: doc.effective_date,
    updated_at: doc.updated_at,
  });
  });

  return NextResponse.json({
    results,
    total: results.length,
    limit,
    offset,
  });
}
