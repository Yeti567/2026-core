/**
 * Document Registry API
 * 
 * GET - List documents with filtering
 * POST - Create new document
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDocument, listDocuments, getRegistryStats } from '@/lib/documents';
import type { DocumentSearchParams, CreateDocumentInput } from '@/lib/documents';
import { createSafeOrFilter } from '@/lib/utils/search-sanitizer';
import { isDocumentStatus, parseDocumentTypeCode } from '@/lib/utils/type-guards';
import type { DocumentTypeCode } from '@/lib/documents/types';
import { handleApiError, handleDatabaseError } from '@/lib/utils/error-handling';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's company
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    // Handle stats request
    if (action === 'stats' || searchParams.get('stats') === 'true') {
      const stats = await getRegistryStats(profile.company_id);
      return NextResponse.json(stats);
    }
    
    // Handle reviews due request
    if (action === 'reviews_due') {
      const { data: reviewsDue } = await supabase
        .from('documents')
        .select('id, control_number, title, document_type_code, next_review_date, status')
        .eq('company_id', profile.company_id)
        .in('status', ['active', 'approved'])
        .not('next_review_date', 'is', null)
        .lt('next_review_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('next_review_date');
      
      return NextResponse.json({ documents: reviewsDue || [] });
    }
    
    // Handle archived documents request
    if (action === 'archived') {
      const { data: archived, count } = await supabase
        .from('document_archive')
        .select('*', { count: 'exact' })
        .eq('company_id', profile.company_id)
        .order('archived_at', { ascending: false })
        .range(
          parseInt(searchParams.get('offset') || '0', 10),
          parseInt(searchParams.get('offset') || '0', 10) + parseInt(searchParams.get('limit') || '25', 10) - 1
        );
      
      return NextResponse.json({ documents: archived || [], total: count || 0 });
    }
    
    // Build search params
    const params: DocumentSearchParams = {
      query: searchParams.get('query') || searchParams.get('q') || undefined,
      document_type_code: parseDocumentTypeCode(searchParams.get('type')) || undefined,
      status: (() => {
        const status = searchParams.get('status');
        return isDocumentStatus(status) ? status : undefined;
      })(),
      department: searchParams.get('department') || undefined,
      review_due_before: searchParams.get('review_due_before') || undefined,
      limit: parseInt(searchParams.get('limit') || '50', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    };
    
    // Handle folder filtering
    const folderId = searchParams.get('folder_id');
    
    if (folderId !== null) {
      // If folder_id is explicitly provided (even empty string means root)
      let query = supabase
        .from('documents')
        .select('*', { count: 'exact' })
        .eq('company_id', profile.company_id);
      
      if (folderId) {
        query = query.eq('folder_id', folderId);
      } else {
        query = query.is('folder_id', null);
      }
      
      // Apply filters
      if (params.document_type_code) {
        query = query.eq('document_type_code', params.document_type_code);
      }
      if (params.status) {
        query = query.eq('status', params.status);
      } else {
        query = query.not('status', 'in', '("archived","obsolete")');
      }
      if (params.query) {
        const safeFilter = createSafeOrFilter(['title', 'control_number', 'description'], params.query);
        if (safeFilter) {
          query = query.or(safeFilter);
        }
      }
      
      const { data, count, error } = await query
        .range(params.offset || 0, (params.offset || 0) + (params.limit || 50) - 1)
        .order('updated_at', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return NextResponse.json({
        documents: data || [],
        total: count || 0,
        limit: params.limit,
        offset: params.offset,
      });
    }
    
    const { documents, total } = await listDocuments(profile.company_id, params);
    
    return NextResponse.json({
      documents,
      total,
      limit: params.limit,
      offset: params.offset,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to list documents');
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    
    // Check permissions (admin, supervisor, internal_auditor can create)
    if (!['super_admin', 'admin', 'supervisor', 'internal_auditor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const body = await request.json();
    
    const input: CreateDocumentInput = {
      document_type_code: (parseDocumentTypeCode(body.document_type_code ?? body.document_type ?? body.type) ||
        body.document_type_code) as DocumentTypeCode,
      title: body.title,
      description: body.description,
      category: body.category,
      department: body.department,
      tags: body.tags,
      cor_elements: body.cor_elements,
      applicable_to: body.applicable_to,
      effective_date: body.effective_date,
      expiry_date: body.expiry_date,
    };
    
    // Validate required fields
    if (!input.document_type_code || !input.title) {
      return NextResponse.json(
        { error: 'document_type_code and title are required' },
        { status: 400 }
      );
    }
    
    const document = await createDocument(profile.company_id, input, profile.id);
    
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create document');
  }
}
