/**
 * AuditSoft Evidence Mapping by ID API
 * 
 * Manages individual mapping updates and deletions.
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import type { EvidenceMappingInsert } from '@/lib/auditsoft';

// =============================================================================
// GET - Retrieve a specific mapping
// =============================================================================

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthWithRole(['admin', 'internal_auditor', 'super_admin']);
    const supabase = createRouteHandlerClient();

    const { data: mapping, error } = await supabase
      .from('auditsoft_evidence_mappings')
      .select('*')
      .eq('id', params.id)
      .eq('company_id', user.companyId)
      .single();

    if (error || !mapping) {
      return NextResponse.json(
        { error: 'Mapping not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ mapping });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}

// =============================================================================
// PATCH - Update a specific mapping
// =============================================================================

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const supabase = createRouteHandlerClient();

    const body: Partial<EvidenceMappingInsert> = await request.json();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.cor_element !== undefined) {
      if (body.cor_element < 1 || body.cor_element > 14) {
        return NextResponse.json(
          { error: 'COR element must be between 1 and 14' },
          { status: 400 }
        );
      }
      updates.cor_element = body.cor_element;
    }

    if (body.evidence_source !== undefined) {
      updates.evidence_source = body.evidence_source;
    }

    if (body.source_id !== undefined) {
      updates.source_id = body.source_id;
    }

    if (body.auditsoft_question_id !== undefined) {
      updates.auditsoft_question_id = body.auditsoft_question_id;
    }

    if (body.auditsoft_category !== undefined) {
      updates.auditsoft_category = body.auditsoft_category;
    }

    if (body.mapping_notes !== undefined) {
      updates.mapping_notes = body.mapping_notes;
    }

    if (body.is_active !== undefined) {
      updates.is_active = body.is_active;
    }

    const { data: mapping, error } = await supabase
      .from('auditsoft_evidence_mappings')
      .update(updates)
      .eq('id', params.id)
      .eq('company_id', user.companyId)
      .select()
      .single();

    if (error || !mapping) {
      console.error('Failed to update mapping:', error);
      return NextResponse.json(
        { error: 'Failed to update mapping' },
        { status: 500 }
      );
    }

    return NextResponse.json({ mapping });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}

// =============================================================================
// DELETE - Remove a specific mapping
// =============================================================================

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const supabase = createRouteHandlerClient();

    const { error } = await supabase
      .from('auditsoft_evidence_mappings')
      .delete()
      .eq('id', params.id)
      .eq('company_id', user.companyId);

    if (error) {
      console.error('Failed to delete mapping:', error);
      return NextResponse.json(
        { error: 'Failed to delete mapping' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
