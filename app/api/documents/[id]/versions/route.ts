/**
 * Document Versions API
 * 
 * GET - List all versions of a document
 * POST - Create new version
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getDocumentVersions,
  createVersion,
} from '@/lib/documents';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const versions = await getDocumentVersions(id);
    
    return NextResponse.json(versions);
  } catch (error) {
    return handleApiError(error, 'Failed to get versions');
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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
    
    // Check permissions
    if (!['super_admin', 'admin', 'supervisor', 'internal_auditor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const body = await request.json();
    
    if (!body.change_summary || !body.change_reason) {
      return NextResponse.json(
        { error: 'change_summary and change_reason are required' },
        { status: 400 }
      );
    }
    
    const version = await createVersion(
      {
        document_id: id,
        is_major: body.is_major || false,
        change_summary: body.change_summary,
        change_reason: body.change_reason,
      },
      profile.id
    );
    
    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create version');
  }
}
