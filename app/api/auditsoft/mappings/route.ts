/**
 * AuditSoft Evidence Mappings API
 * 
 * Manages mappings between COR elements/evidence types and AuditSoft questions.
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import type { EvidenceMappingInsert } from '@/lib/auditsoft';

export const dynamic = 'force-dynamic';


// =============================================================================
// GET - Retrieve all mappings for the company
// =============================================================================

export async function GET(request: Request) {
  try {
    const user = await requireAuthWithRole(['admin', 'internal_auditor', 'super_admin']);
    const supabase = createRouteHandlerClient();

    const url = new URL(request.url);
    const element = url.searchParams.get('element');
    const source = url.searchParams.get('source');

    let query = supabase
      .from('auditsoft_evidence_mappings')
      .select('*')
      .eq('company_id', user.companyId)
      .order('cor_element', { ascending: true })
      .order('evidence_source', { ascending: true });

    if (element) {
      query = query.eq('cor_element', parseInt(element));
    }

    if (source) {
      query = query.eq('evidence_source', source);
    }

    const { data: mappings, error } = await query;

    if (error) {
      console.error('Failed to fetch mappings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch mappings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ mappings });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}

// =============================================================================
// POST - Create a new mapping
// =============================================================================

export async function POST(request: Request) {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const supabase = createRouteHandlerClient();

    const body: EvidenceMappingInsert = await request.json();

    if (!body.cor_element || !body.evidence_source) {
      return NextResponse.json(
        { error: 'COR element and evidence source are required' },
        { status: 400 }
      );
    }

    if (body.cor_element < 1 || body.cor_element > 14) {
      return NextResponse.json(
        { error: 'COR element must be between 1 and 14' },
        { status: 400 }
      );
    }

    const { data: mapping, error } = await supabase
      .from('auditsoft_evidence_mappings')
      .insert({
        company_id: user.companyId,
        cor_element: body.cor_element,
        evidence_source: body.evidence_source,
        source_id: body.source_id,
        auditsoft_question_id: body.auditsoft_question_id,
        auditsoft_category: body.auditsoft_category,
        mapping_notes: body.mapping_notes,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create mapping:', error);
      return NextResponse.json(
        { error: 'Failed to create mapping' },
        { status: 500 }
      );
    }

    return NextResponse.json({ mapping }, { status: 201 });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}

// =============================================================================
// PUT - Bulk update/sync mappings
// =============================================================================

export async function PUT(request: Request) {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const supabase = createRouteHandlerClient();

    const body = await request.json();
    const { mappings } = body as { mappings: EvidenceMappingInsert[] };

    if (!Array.isArray(mappings)) {
      return NextResponse.json(
        { error: 'Mappings array is required' },
        { status: 400 }
      );
    }

    // Delete existing mappings for the company
    const { error: deleteError } = await supabase
      .from('auditsoft_evidence_mappings')
      .delete()
      .eq('company_id', user.companyId);

    if (deleteError) {
      console.error('Failed to clear existing mappings:', deleteError);
      return NextResponse.json(
        { error: 'Failed to update mappings' },
        { status: 500 }
      );
    }

    // Insert new mappings
    if (mappings.length > 0) {
      const mappingsToInsert = mappings.map(m => ({
        company_id: user.companyId,
        cor_element: m.cor_element,
        evidence_source: m.evidence_source,
        source_id: m.source_id,
        auditsoft_question_id: m.auditsoft_question_id,
        auditsoft_category: m.auditsoft_category,
        mapping_notes: m.mapping_notes,
        is_active: m.is_active ?? true,
      }));

      const { error: insertError } = await supabase
        .from('auditsoft_evidence_mappings')
        .insert(mappingsToInsert);

      if (insertError) {
        console.error('Failed to insert mappings:', insertError);
        return NextResponse.json(
          { error: 'Failed to save mappings' },
          { status: 500 }
        );
      }
    }

    // Fetch updated mappings
    const { data: updatedMappings } = await supabase
      .from('auditsoft_evidence_mappings')
      .select('*')
      .eq('company_id', user.companyId)
      .order('cor_element', { ascending: true });

    return NextResponse.json({
      success: true,
      mappings: updatedMappings,
      count: updatedMappings?.length || 0,
    });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
