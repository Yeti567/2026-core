/**
 * Document Folders API
 * 
 * GET  - List all folders with document counts
 * POST - Create a new folder
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/utils/error-handling';

export async function GET(request: NextRequest) {
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
    
    // Get folder tree
    const { data: folders, error: foldersError } = await supabase.rpc('get_folder_tree', {
      p_company_id: profile.company_id,
      p_parent_id: null,
    });
    
    if (foldersError) {
      // Folder table may not exist yet - return empty
      console.error('Failed to fetch folders:', foldersError);
      return NextResponse.json({ folders: [], stats: {} });
    }
    
    // Build folder tree structure
    const folderMap = new Map<string, any>();
    const roots: any[] = [];
    
    // First pass: create all nodes
    (folders || []).forEach((f: any) => {
      folderMap.set(f.id, { ...f, children: [] });
    });
    
    // Second pass: build tree
    (folders || []).forEach((f: any) => {
      const node = folderMap.get(f.id);
      if (f.parent_folder_id && folderMap.has(f.parent_folder_id)) {
        folderMap.get(f.parent_folder_id).children.push(node);
      } else if (!f.parent_folder_id) {
        roots.push(node);
      }
    });
    
    // Sort by sort_order
    const sortNodes = (nodes: any[]) => {
      nodes.sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));
      nodes.forEach(n => sortNodes(n.children));
    };
    sortNodes(roots);
    
    // Get document counts per folder
    const { data: documents } = await supabase
      .from('documents')
      .select('folder_id')
      .eq('company_id', profile.company_id)
      .not('status', 'in', '("archived","obsolete")');
    
    const stats: Record<string, number> = {};
    (documents || []).forEach(d => {
      const folderId = d.folder_id || 'unfiled';
      // Safe: folderId is either a UUID from database or the literal 'unfiled'
      // eslint-disable-next-line security/detect-object-injection
      stats[folderId] = (stats[folderId] || 0) + 1;
    });
    
    return NextResponse.json({
      folders: roots,
      stats,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to fetch folders');
  }
}

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
      .select('id, company_id, role')
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
    const { name, description, parent_folder_id, folder_type, icon, color } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }
    
    // Generate slug
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    
    // Create folder
    const { data: folder, error: createError } = await supabase
      .from('document_folders')
      .insert({
        company_id: profile.company_id,
        name,
        slug,
        description,
        parent_folder_id,
        folder_type: folder_type || 'general',
        icon: icon || 'folder',
        color: color || '#6366f1',
        is_system_folder: false,
        created_by: profile.id,
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Failed to create folder:', createError);
      return NextResponse.json(
        { error: 'Failed to create folder' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create folder');
  }
}
