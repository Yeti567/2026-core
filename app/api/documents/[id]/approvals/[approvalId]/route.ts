/**
 * Document Approval API
 * 
 * POST - Submit approval or rejection
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; approvalId: string } }
) {
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
    
    const body = await request.json();
    const { status, comments, signature_data, rejection_reason } = body;
    
    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be approved or rejected' },
        { status: 400 }
      );
    }
    
    // Get the approval record
    const { data: approval, error: approvalError } = await supabase
      .from('document_approvals')
      .select('*, document:documents(*)')
      .eq('id', params.approvalId)
      .eq('document_id', params.id)
      .single();
    
    if (approvalError || !approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }
    
    // Check if user can approve
    const canApprove = 
      approval.approver_id === profile.id ||
      approval.approver_role === profile.role ||
      profile.role === 'admin' ||
      profile.role === 'super_admin';
    
    if (!canApprove) {
      return NextResponse.json({ error: 'Not authorized to approve' }, { status: 403 });
    }
    
    // Check if approval is still pending
    if (approval.status !== 'pending') {
      return NextResponse.json(
        { error: 'Approval has already been processed' },
        { status: 400 }
      );
    }
    
    // Update approval
    const updateData: Record<string, unknown> = {
      status,
      approved_at: new Date().toISOString(),
      approver_id: profile.id,
    };
    
    if (status === 'approved') {
      updateData.approval_comments = comments;
      updateData.signature_data = signature_data;
      updateData.signature_type = signature_data ? 'drawn' : null;
    } else {
      updateData.rejection_reason = rejection_reason;
    }
    
    const { error: updateError } = await supabase
      .from('document_approvals')
      .update(updateData)
      .eq('id', params.approvalId);
    
    if (updateError) {
      throw new Error(updateError.message);
    }
    
    // Check if all approvals are complete
    const { data: allApprovals } = await supabase
      .from('document_approvals')
      .select('status, required')
      .eq('document_id', params.id);
    
    const requiredApprovals = allApprovals?.filter(a => a.required) || [];
    const allRequiredApproved = requiredApprovals.every(a => a.status === 'approved');
    const hasRejection = allApprovals?.some(a => a.status === 'rejected');
    
    // Update document status based on approvals
    if (hasRejection) {
      await supabase
        .from('documents')
        .update({ status: 'draft' }) // Return to draft on rejection
        .eq('id', params.id);
    } else if (allRequiredApproved) {
      await supabase
        .from('documents')
        .update({ 
          status: 'approved',
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', params.id);
    }
    
    return NextResponse.json({ 
      success: true,
      all_approved: allRequiredApproved,
      has_rejection: hasRejection,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to submit approval');
  }
}
