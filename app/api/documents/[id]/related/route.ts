/**
 * Related Documents API
 * 
 * GET: Get documents related to/referenced by a document
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/documents/[id]/related
 * Get related documents (references and referenced-by)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: documentId } = await params;
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select(`
        id,
        company_id,
        control_number,
        related_document_ids,
        supersedes_control_number,
        superseded_by_control_number,
        extracted_text
      `)
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const references: Array<{
      id: string;
      control_number: string;
      title: string;
      document_type: string;
      version: string;
      relationship: 'references' | 'referenced_by' | 'supersedes' | 'superseded_by';
    }> = [];

    // Get documents from related_document_ids
    if (document.related_document_ids && document.related_document_ids.length > 0) {
      const { data: relatedDocs } = await supabase
        .from('documents')
        .select('id, control_number, title, document_type_code, version')
        .in('id', document.related_document_ids)
        .in('status', ['active', 'approved']);

      (relatedDocs || []).forEach(doc => {
        references.push({
          id: doc.id,
          control_number: doc.control_number,
          title: doc.title,
          document_type: doc.document_type_code,
          version: doc.version,
          relationship: 'references',
        });
      });
    }

    // Get documents that reference this document
    const { data: referencingDocs } = await supabase
      .from('documents')
      .select('id, control_number, title, document_type_code, version')
      .eq('company_id', document.company_id)
      .contains('related_document_ids', [documentId])
      .in('status', ['active', 'approved']);

    (referencingDocs || []).forEach(doc => {
      if (!references.some(r => r.id === doc.id)) {
        references.push({
          id: doc.id,
          control_number: doc.control_number,
          title: doc.title,
          document_type: doc.document_type_code,
          version: doc.version,
          relationship: 'referenced_by',
        });
      }
    });

    // Get superseded document
    if (document.supersedes_control_number) {
      const { data: supersededDoc } = await supabase
        .from('documents')
        .select('id, control_number, title, document_type_code, version')
        .eq('company_id', document.company_id)
        .ilike('control_number', document.supersedes_control_number)
        .single();

      if (supersededDoc) {
        references.push({
          id: supersededDoc.id,
          control_number: supersededDoc.control_number,
          title: supersededDoc.title,
          document_type: supersededDoc.document_type_code,
          version: supersededDoc.version,
          relationship: 'supersedes',
        });
      }
    }

    // Get superseding document
    if (document.superseded_by_control_number) {
      const { data: supersedingDoc } = await supabase
        .from('documents')
        .select('id, control_number, title, document_type_code, version')
        .eq('company_id', document.company_id)
        .ilike('control_number', document.superseded_by_control_number)
        .single();

      if (supersedingDoc) {
        references.push({
          id: supersedingDoc.id,
          control_number: supersedingDoc.control_number,
          title: supersedingDoc.title,
          document_type: supersedingDoc.document_type_code,
          version: supersedingDoc.version,
          relationship: 'superseded_by',
        });
      }
    }

    // Also find documents referenced by control number in text
    if (document.extracted_text) {
      // Find control numbers mentioned in text
      const controlNumberPattern = /[A-Z]{2,6}-[A-Z]{2,4}-\d{3,4}/g;
      const matches = (document.extracted_text as string).match(controlNumberPattern) || [];
      const uniqueMatches = [...new Set(matches)].filter(
        (cn) => cn.toUpperCase() !== document.control_number.toUpperCase()
      );

      if (uniqueMatches.length > 0) {
        for (const cn of uniqueMatches.slice(0, 10)) { // Limit to 10
          const { data: referencedDoc } = await supabase
            .from('documents')
            .select('id, control_number, title, document_type_code, version')
            .eq('company_id', document.company_id)
            .ilike('control_number', cn)
            .in('status', ['active', 'approved'])
            .single();

          if (referencedDoc && !references.some(r => r.id === referencedDoc.id)) {
            references.push({
              id: referencedDoc.id,
              control_number: referencedDoc.control_number,
              title: referencedDoc.title,
              document_type: referencedDoc.document_type_code,
              version: referencedDoc.version,
              relationship: 'references',
            });
          }
        }
      }
    }

    return NextResponse.json({
      document_id: documentId,
      control_number: document.control_number,
      references: references.filter(r => r.relationship === 'references'),
      referenced_by: references.filter(r => r.relationship === 'referenced_by'),
      supersedes: references.find(r => r.relationship === 'supersedes') || null,
      superseded_by: references.find(r => r.relationship === 'superseded_by') || null,
      total: references.length,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to fetch related documents');
  }
}
