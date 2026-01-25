/**
 * Document View Tracking API
 * 
 * POST: Increment view count and track viewing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/documents/[id]/view
 * Track document view
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Try using RPC function if available
    const { error: rpcError } = await supabase.rpc('increment_document_view_count', {
      p_document_id: documentId,
    });

    // Fallback to direct update if RPC fails
    if (rpcError) {
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          view_count: supabase.rpc('coalesce', { value: 'view_count', default_value: 0 }),
          last_viewed_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      // If that also fails, try simple increment
      if (updateError) {
        await supabase
          .from('documents')
          .update({ last_viewed_at: new Date().toISOString() })
          .eq('id', documentId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking view:', error);
    // Don't fail the request - view tracking is non-critical
    return NextResponse.json({ success: true });
  }
}
