/**
 * Document Acknowledgment API
 * 
 * POST - Acknowledge receipt of a document
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/utils/error-handling';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    const body = await request.json().catch(() => ({}));
    
    // Check if distribution exists for this user
    const { data: distribution, error: distError } = await supabase
      .from('document_distributions')
      .select('id')
      .eq('document_id', params.id)
      .eq('distributed_to', profile.id)
      .eq('acknowledged', false)
      .single();
    
    if (distribution) {
      // Update existing distribution
      const { error: updateError } = await supabase
        .from('document_distributions')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledgment_method: body.method || 'portal',
          acknowledgment_signature: body.signature,
        })
        .eq('id', distribution.id);
      
      if (updateError) {
        throw new Error(updateError.message);
      }
    } else {
      // Create new acknowledgment record
      const { error: insertError } = await supabase
        .from('document_distributions')
        .insert({
          document_id: params.id,
          company_id: profile.company_id,
          distributed_to: profile.id,
          distributed_at: new Date().toISOString(),
          distribution_method: 'self_access',
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledgment_method: body.method || 'portal',
          acknowledgment_signature: body.signature,
          quiz_required: false,
        });
      
      if (insertError) {
        throw new Error(insertError.message);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Failed to acknowledge');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    // Check if user has acknowledged this document
    const { data: distribution } = await supabase
      .from('document_distributions')
      .select('acknowledged, acknowledged_at')
      .eq('document_id', params.id)
      .eq('distributed_to', profile.id)
      .single();
    
    return NextResponse.json({
      acknowledged: distribution?.acknowledged || false,
      acknowledged_at: distribution?.acknowledged_at,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to get status');
  }
}
