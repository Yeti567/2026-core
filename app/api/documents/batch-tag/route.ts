/**
 * Batch Tag Documents API
 * 
 * POST - Add tags and COR elements to multiple documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
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
      .select('company_id, role')
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
    const { document_ids, tags, cor_elements } = body;
    
    if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json({ error: 'No documents specified' }, { status: 400 });
    }
    
    // Get current documents to merge tags/elements
    const { data: currentDocs, error: fetchError } = await supabase
      .from('documents')
      .select('id, tags, cor_elements')
      .eq('company_id', profile.company_id)
      .in('id', document_ids);
    
    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
    
    // Update each document
    const updates: PromiseLike<any>[] = [];
    
    for (const doc of currentDocs || []) {
      const newTags = [...new Set([...(doc.tags || []), ...(tags || [])])];
      const newCorElements = [...new Set([...(doc.cor_elements || []), ...(cor_elements || [])])].sort((a, b) => a - b);
      
      updates.push(
        supabase
          .from('documents')
          .update({
            tags: newTags,
            cor_elements: newCorElements,
          })
          .eq('id', doc.id)
      );
    }
    
    await Promise.all(updates);
    
    return NextResponse.json({
      success: true,
      updated: document_ids.length,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to update documents');
  }
}
