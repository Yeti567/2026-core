/**
 * Document Audit Links API
 * 
 * GET  - Get all audit element links for a document
 * POST - Link document to audit element(s)
 * DELETE - Unlink document from audit element
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  linkDocumentToAudit, 
  unlinkDocumentFromAudit,
  getDocumentAuditLinks,
  autoLinkDocument,
  detectRelevantAuditElements,
} from '@/lib/documents/audit-integration';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get audit links
    const links = await getDocumentAuditLinks(documentId);
    
    return NextResponse.json({ links });
  } catch (error) {
    return handleApiError(error, 'Failed to get audit links');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, company_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    // Check permissions
    if (!['super_admin', 'admin', 'supervisor', 'internal_auditor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const body = await request.json();
    const { element_numbers, auto_detect } = body;
    
    // Auto-detect mode
    if (auto_detect) {
      // Get document with extracted text
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('company_id', profile.company_id)
        .single();
      
      if (docError || !document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      
      const links = await autoLinkDocument(documentId, document.extracted_text);
      
      return NextResponse.json({
        success: true,
        links,
        detected_count: links.length,
      });
    }
    
    // Manual linking
    if (!element_numbers || !Array.isArray(element_numbers) || element_numbers.length === 0) {
      return NextResponse.json({ error: 'element_numbers array is required' }, { status: 400 });
    }
    
    const links = [];
    for (const element of element_numbers) {
      const link = await linkDocumentToAudit(
        documentId,
        element,
        undefined,
        'manual',
        100,
        profile.id
      );
      links.push(link);
    }
    
    return NextResponse.json({
      success: true,
      links,
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to link document');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, company_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    // Check permissions
    if (!['super_admin', 'admin', 'supervisor', 'internal_auditor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const elementNumber = parseInt(searchParams.get('element') || '', 10);
    
    if (isNaN(elementNumber)) {
      return NextResponse.json({ error: 'element query parameter is required' }, { status: 400 });
    }
    
    await unlinkDocumentFromAudit(documentId, elementNumber);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Failed to unlink document');
  }
}
