/**
 * Document Search API
 * 
 * GET - Full-text search across documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  searchDocuments,
  searchByControlNumber,
  searchDocumentContent,
  getSearchSuggestions,
  getRecentDocuments,
} from '@/lib/documents';
import { rateLimitByUser, createRateLimitHeaders } from '@/lib/utils/rate-limit';
import { isDocumentStatus, parseDocumentTypeCode } from '@/lib/utils/type-guards';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 60 searches per minute per user (prevent DoS)
    const rateLimitResult = await rateLimitByUser(user.id, 60, '1m');
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
    
    // Get user's company
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const query = searchParams.get('q') || searchParams.get('query') || '';
    
    // Handle different search actions
    switch (action) {
      case 'suggestions': {
        if (!query || query.length < 2) {
          return NextResponse.json([]);
        }
        const suggestions = await getSearchSuggestions(profile.company_id, query);
        return NextResponse.json(suggestions);
      }
      
      case 'control_number': {
        if (!query) {
          return NextResponse.json({ error: 'Control number required' }, { status: 400 });
        }
        const results = await searchByControlNumber(profile.company_id, query);
        return NextResponse.json(results);
      }
      
      case 'content': {
        if (!query) {
          return NextResponse.json({ error: 'Search query required' }, { status: 400 });
        }
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const results = await searchDocumentContent(profile.company_id, query, limit);
        return NextResponse.json(results);
      }
      
      case 'recent': {
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const results = await getRecentDocuments(profile.company_id, limit);
        return NextResponse.json(results);
      }
      
      default: {
        // Full search with filters
        const corElements = searchParams.get('cor_elements');
        const tags = searchParams.get('tags');
        
        const results = await searchDocuments(profile.company_id, {
          query: query || undefined,
          document_type_code: parseDocumentTypeCode(searchParams.get('type')) || undefined,
          status: (() => {
            const status = searchParams.get('status');
            return isDocumentStatus(status) ? status : undefined;
          })(),
          department: searchParams.get('department') || undefined,
          cor_elements: corElements ? corElements.split(',').map(e => parseInt(e, 10)) : undefined,
          tags: tags ? tags.split(',') : undefined,
          limit: parseInt(searchParams.get('limit') || '20', 10),
          offset: parseInt(searchParams.get('offset') || '0', 10),
        });
        
        return NextResponse.json(results);
      }
    }
  } catch (error) {
    return handleApiError(error, 'Search failed');
  }
}
