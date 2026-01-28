/**
 * Document Re-indexing API
 * 
 * POST - Re-index documents (extract text, update search vectors)
 * GET - Get documents needing re-indexing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  reindexAllDocuments, 
  reindexDocument, 
  getDocumentsNeedingReindex,
  refreshSearchVectors 
} from '@/lib/documents/reindex-documents';
import { rateLimitByUser, createRateLimitResponse } from '@/lib/utils/rate-limit';
import { handleDatabaseError, handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rate limiting: 3 reindex operations per hour per user (very expensive)
    const rateLimitResult = await rateLimitByUser(user.id, 3, '1h');
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }
    
    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, company_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    // Only admins can trigger re-indexing
    if (!['super_admin', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'all';
    
    switch (action) {
      case 'single': {
        // Re-index a single document
        const documentId = body.document_id;
        if (!documentId) {
          return NextResponse.json(
            { error: 'document_id is required' },
            { status: 400 }
          );
        }
        
        const result = await reindexDocument(documentId);
        return NextResponse.json(result);
      }
      
      case 'refresh_vectors': {
        // Just refresh search vectors (no re-extraction)
        const count = await refreshSearchVectors(profile.company_id);
        return NextResponse.json({
          success: true,
          documents_updated: count,
        });
      }
      
      case 'all':
      default: {
        // Re-index all documents
        const options = {
          onlyEmpty: body.only_empty ?? false,
          force: body.force ?? false,
          documentTypes: body.document_types,
          limit: body.limit,
          offset: body.offset,
        };
        
        const summary = await reindexAllDocuments(profile.company_id, options);
        return NextResponse.json(summary);
      }
    }
    
  } catch (error) {
    return handleApiError(error, 'Re-indexing failed');
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    // Only admins can check re-indexing status
    if (!['super_admin', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Get documents needing re-indexing
    const documents = await getDocumentsNeedingReindex(profile.company_id);
    
    // Get total counts
    const { count: totalDocs } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id);
    
    const { count: indexedDocs } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .not('extracted_text', 'is', null)
      .neq('extracted_text', '');
    
    return NextResponse.json({
      needs_reindex: documents,
      total_documents: totalDocs || 0,
      indexed_documents: indexedDocs || 0,
      unindexed_count: (totalDocs || 0) - (indexedDocs || 0),
    });
    
  } catch (error) {
    console.error('Get reindex status error:', error);
    return NextResponse.json(
      { error: 'Failed to get reindex status. Please try again.' },
      { status: 500 }
    );
  }
}
