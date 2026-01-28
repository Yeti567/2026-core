/**
 * Document Metadata Suggestion API
 * 
 * POST - Suggest metadata based on filename and/or content
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { suggestMetadata } from '@/lib/documents/metadata-suggester';
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
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    const body = await request.json();
    const { filename, content } = body;
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }
    
    // Get existing control numbers for reference detection
    const { data: documents } = await supabase
      .from('documents')
      .select('control_number')
      .eq('company_id', profile.company_id);
    
    const existingControlNumbers = (documents || []).map(d => d.control_number);
    
    // Suggest metadata
    const suggestion = suggestMetadata(filename, content, existingControlNumbers);
    
    // Try to find a matching folder
    const { data: folders } = await supabase
      .from('document_folders')
      .select('id')
      .eq('company_id', profile.company_id)
      .contains('linked_document_types', [suggestion.document_type_code])
      .eq('is_visible', true)
      .limit(1);
    
    if (folders && folders.length > 0) {
      suggestion.folder_id = folders[0].id;
    }
    
    return NextResponse.json(suggestion);
  } catch (error) {
    return handleApiError(error, 'Failed to suggest metadata');
  }
}
