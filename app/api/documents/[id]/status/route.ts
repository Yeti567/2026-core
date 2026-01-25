/**
 * Document Status Transition API
 * 
 * POST - Transition document status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transitionStatus, getVersion } from '@/lib/documents';
import type { DocumentStatus } from '@/lib/documents';
import { handleApiError } from '@/lib/utils/error-handling';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Define valid transitions
const VALID_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  draft: ['pending_review'],
  pending_review: ['under_review', 'draft'],
  under_review: ['approved', 'draft', 'pending_review'],
  approved: ['active', 'draft'],
  active: ['under_revision', 'obsolete'],
  under_revision: ['pending_review', 'active'],
  obsolete: [], // Cannot transition from obsolete
  archived: [], // Cannot transition from archived
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: documentId } = await params;
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
    
    const body = await request.json();
    const { version_id, new_status } = body;
    
    if (!version_id || !new_status) {
      return NextResponse.json(
        { error: 'version_id and new_status are required' },
        { status: 400 }
      );
    }
    
    // Get current version
    const version = await getVersion(version_id);
    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }
    
    // Verify version belongs to the document
    if (version.document_id !== documentId) {
      return NextResponse.json({ error: 'Version does not belong to this document' }, { status: 400 });
    }
    
    // Check valid transition
    const allowedTransitions = VALID_TRANSITIONS[version.status as DocumentStatus] || [];
    if (!allowedTransitions.includes(new_status as DocumentStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${version.status} to ${new_status}` },
        { status: 400 }
      );
    }
    
    // Check permissions for specific transitions
    const approvalRequired = ['approved', 'active'].includes(new_status);
    if (approvalRequired && !['super_admin', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only admin can approve or activate documents' },
        { status: 403 }
      );
    }
    
    const updatedVersion = await transitionStatus(version_id, new_status as DocumentStatus, profile.id);
    
    return NextResponse.json(updatedVersion);
  } catch (error) {
    return handleApiError(error, 'Failed to transition status');
  }
}
