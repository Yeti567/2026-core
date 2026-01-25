/**
 * Document Archive API
 * 
 * GET - Get archived versions
 * POST - Archive a version
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getArchivedVersions,
  getArchivedVersion,
  archiveVersion,
} from '@/lib/documents';
import { handleApiError } from '@/lib/utils/error-handling';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: documentId } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const archiveId = searchParams.get('archive_id');
    
    if (archiveId) {
      // Get specific archive
      const archive = await getArchivedVersion(archiveId);
      if (!archive) {
        return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
      }
      return NextResponse.json(archive);
    }
    
    // Get all archives for document
    const archives = await getArchivedVersions(documentId);
    
    return NextResponse.json(archives);
  } catch (error) {
    return handleApiError(error, 'Failed to get archives');
  }
}

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
    
    // Check permissions (only admin can archive)
    if (!['super_admin', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const body = await request.json();
    const { version_id, reason } = body;
    
    if (!version_id || !reason) {
      return NextResponse.json(
        { error: 'version_id and reason are required' },
        { status: 400 }
      );
    }
    
    const archive = await archiveVersion(version_id, reason, profile.id);
    
    return NextResponse.json(archive, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to archive');
  }
}
