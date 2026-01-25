/**
 * Document Acknowledgments API
 * 
 * GET: Get acknowledgments for a document
 * POST: Create acknowledgment requirements
 * PATCH: Acknowledge or update acknowledgment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  getDocumentAcknowledgments,
  createAcknowledgmentRequirements,
  acknowledgeDocumentByWorker,
} from '@/lib/documents';
import { handleApiError } from '@/lib/utils/error-handling';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/documents/[id]/acknowledgments
 * Get all acknowledgments for a document
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

    // Get acknowledgments
    const result = await getDocumentAcknowledgments(documentId);
    
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch acknowledgments');
  }
}

/**
 * POST /api/documents/[id]/acknowledgments
 * Create acknowledgment requirements for workers
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: documentId } = await params;
    const body = await request.json();
    const { worker_ids, deadline_days, notes } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    if (!worker_ids || !Array.isArray(worker_ids) || worker_ids.length === 0) {
      return NextResponse.json(
        { error: 'Worker IDs array is required' },
        { status: 400 }
      );
    }

    // Verify authentication and get company ID
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile for company ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'supervisor', 'internal_auditor'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Create acknowledgment requirements
    const acknowledgments = await createAcknowledgmentRequirements(
      documentId,
      profile.company_id,
      worker_ids,
      {
        deadlineDays: deadline_days,
        notes,
      }
    );

    return NextResponse.json({
      success: true,
      acknowledgments,
      created: acknowledgments.length,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to create acknowledgments');
  }
}

/**
 * PATCH /api/documents/[id]/acknowledgments
 * Acknowledge a document (for workers)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: documentId } = await params;
    const body = await request.json();
    const { method = 'checkbox', signature_data, notes } = body;

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

    // Get worker profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Acknowledge the document
    const acknowledgment = await acknowledgeDocumentByWorker(
      documentId,
      profile.id,
      method,
      {
        signatureData: signature_data,
        notes,
      }
    );

    return NextResponse.json({
      success: true,
      acknowledgment,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to acknowledge document');
  }
}
