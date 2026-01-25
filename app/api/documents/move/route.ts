/**
 * Move Documents API
 * 
 * POST - Move multiple documents to a folder
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/utils/error-handling';

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
    const { document_ids, folder_id } = body;
    
    if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json({ error: 'No documents specified' }, { status: 400 });
    }
    
    // Get folder path if folder specified
    let folderPath = '/';
    if (folder_id) {
      const { data: folder, error: folderError } = await supabase
        .from('document_folders')
        .select('path')
        .eq('id', folder_id)
        .eq('company_id', profile.company_id)
        .single();
      
      if (folderError || !folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }
      
      folderPath = folder.path;
    }
    
    // Move documents
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        folder_id: folder_id || null,
        folder_path: folderPath,
      })
      .eq('company_id', profile.company_id)
      .in('id', document_ids);
    
    if (updateError) {
      return NextResponse.json({ error: 'Failed to move documents' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      moved: document_ids.length,
      folder_id: folder_id || null,
      folder_path: folderPath,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to move documents');
  }
}
