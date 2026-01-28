/**
 * Attachment URL API
 * GET - Get signed URL for an attachment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const expiresIn = parseInt(searchParams.get('expires_in') || '3600');
    
    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }
    
    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUrl(path, expiresIn);
    
    if (error) {
      return NextResponse.json({ error: 'Failed to get attachment URL' }, { status: 500 });
    }
    
    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    return handleApiError(error, 'Failed to get URL');
  }
}
