/**
 * Single Document API
 * 
 * GET - Get document by ID
 * PATCH - Update document
 * DELETE - Mark document as obsolete (never truly deleted)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getDocumentById,
  getDocumentWithHistory,
  updateDocument,
  obsoleteDocument,
} from '@/lib/documents';
import type { UpdateDocumentInput } from '@/lib/documents';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('history') === 'true';
    
    const document = includeHistory
      ? await getDocumentWithHistory(id)
      : await getDocumentById(id);
    
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    return NextResponse.json(document);
  } catch (error) {
    return handleApiError(error, 'Failed to get document');
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's profile and verify permissions
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, company_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    // Check permissions
    if (!['super_admin', 'admin', 'supervisor', 'internal_auditor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const body = await request.json();
    
    const input: UpdateDocumentInput = {
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
    
    const document = await updateDocument(id, input);
    
    return NextResponse.json(document);
  } catch (error) {
    return handleApiError(error, 'Failed to update document');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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
    
    // Only admin and super_admin can obsolete documents
    if (!['super_admin', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const body = await request.json().catch(() => ({}));
    await obsoleteDocument(id, profile.id);
    
    return NextResponse.json({ success: true, message: 'Document marked as obsolete' });
  } catch (error) {
    return handleApiError(error, 'Failed to obsolete document');
  }
}
