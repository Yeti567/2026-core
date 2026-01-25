/**
 * Document Folder Service
 * 
 * Manages hierarchical folder structure for document organization:
 * - CRUD operations for folders
 * - Folder tree retrieval
 * - Document-folder assignments
 * - System folder initialization
 */

import { createClient } from '@/lib/supabase/server';
import type { DocumentFolder, FolderTreeNode, FolderType } from './types';

// ============================================================================
// FOLDER CRUD OPERATIONS
// ============================================================================

/**
 * Gets all folders for a company (flat list)
 */
export async function getFolders(companyId: string): Promise<DocumentFolder[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('document_folders')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_visible', true)
    .order('sort_order')
    .order('name');
  
  if (error) throw new Error(`Failed to fetch folders: ${error.message}`);
  return data || [];
}

/**
 * Gets folder tree with document counts
 */
export async function getFolderTree(
  companyId: string,
  parentId?: string
): Promise<FolderTreeNode[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('get_folder_tree', {
    p_company_id: companyId,
    p_parent_id: parentId || null,
  });
  
  if (error) throw new Error(`Failed to fetch folder tree: ${error.message}`);
  
  // Convert flat list to tree structure
  const folders = (data || []) as DocumentFolder[];
  return buildTree(folders);
}

/**
 * Builds a tree structure from flat folder list
 */
function buildTree(folders: DocumentFolder[]): FolderTreeNode[] {
  const map = new Map<string, FolderTreeNode>();
  const roots: FolderTreeNode[] = [];
  
  // First pass: create all nodes
  folders.forEach(folder => {
    map.set(folder.id, { ...folder, children: [] });
  });
  
  // Second pass: build tree
  folders.forEach(folder => {
    const node = map.get(folder.id)!;
    if (folder.parent_folder_id && map.has(folder.parent_folder_id)) {
      map.get(folder.parent_folder_id)!.children.push(node);
    } else if (!folder.parent_folder_id) {
      roots.push(node);
    }
  });
  
  // Sort children by sort_order and name
  const sortNodes = (nodes: FolderTreeNode[]) => {
    nodes.sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));
    nodes.forEach(node => sortNodes(node.children));
  };
  
  sortNodes(roots);
  return roots;
}

/**
 * Gets a single folder by ID
 */
export async function getFolderById(folderId: string): Promise<DocumentFolder | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('document_folders')
    .select('*')
    .eq('id', folderId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch folder: ${error.message}`);
  }
  return data;
}

/**
 * Gets a folder by its path
 */
export async function getFolderByPath(
  companyId: string,
  path: string
): Promise<DocumentFolder | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('document_folders')
    .select('*')
    .eq('company_id', companyId)
    .eq('path', path)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch folder: ${error.message}`);
  }
  return data;
}

/**
 * Creates a new folder
 */
export async function createFolder(
  companyId: string,
  input: {
    name: string;
    description?: string;
    parent_folder_id?: string;
    folder_type?: FolderType;
    folder_code?: string;
    linked_document_types?: string[];
    linked_cor_elements?: number[];
    default_document_type?: string;
    icon?: string;
    color?: string;
  },
  createdBy?: string
): Promise<DocumentFolder> {
  const supabase = await createClient();
  
  // Generate slug
  const { data: slug } = await supabase.rpc('generate_folder_slug', {
    p_name: input.name,
  });
  
  const { data, error } = await supabase
    .from('document_folders')
    .insert({
      company_id: companyId,
      name: input.name,
      slug: slug || input.name.toLowerCase().replace(/\s+/g, '-'),
      description: input.description,
      parent_folder_id: input.parent_folder_id,
      folder_type: input.folder_type || 'general',
      folder_code: input.folder_code,
      linked_document_types: input.linked_document_types || [],
      linked_cor_elements: input.linked_cor_elements || [],
      default_document_type: input.default_document_type,
      icon: input.icon || 'folder',
      color: input.color || '#6366f1',
      is_system_folder: false,
      is_active: true,
      created_by: createdBy,
    })
    .select()
    .single();
  
  if (error) throw new Error(`Failed to create folder: ${error.message}`);
  return data;
}

/**
 * Updates a folder
 */
export async function updateFolder(
  folderId: string,
  input: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    folder_code?: string;
    linked_document_types?: string[];
    linked_cor_elements?: number[];
    default_document_type?: string;
    sort_order?: number;
    is_visible?: boolean;
    is_active?: boolean;
  }
): Promise<DocumentFolder> {
  const supabase = await createClient();
  
  const updateData: Record<string, unknown> = {};
  
  if (input.name !== undefined) {
    updateData.name = input.name;
    // Regenerate slug
    const { data: slug } = await supabase.rpc('generate_folder_slug', {
      p_name: input.name,
    });
    updateData.slug = slug;
  }
  if (input.description !== undefined) updateData.description = input.description;
  if (input.icon !== undefined) updateData.icon = input.icon;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.folder_code !== undefined) updateData.folder_code = input.folder_code;
  if (input.linked_document_types !== undefined) updateData.linked_document_types = input.linked_document_types;
  if (input.linked_cor_elements !== undefined) updateData.linked_cor_elements = input.linked_cor_elements;
  if (input.default_document_type !== undefined) updateData.default_document_type = input.default_document_type;
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;
  if (input.is_visible !== undefined) updateData.is_visible = input.is_visible;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;
  
  const { data, error } = await supabase
    .from('document_folders')
    .update(updateData)
    .eq('id', folderId)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to update folder: ${error.message}`);
  return data;
}

/**
 * Deletes a folder (only non-system folders)
 */
export async function deleteFolder(folderId: string): Promise<void> {
  const supabase = await createClient();
  
  // Check if system folder
  const { data: folder } = await supabase
    .from('document_folders')
    .select('is_system_folder')
    .eq('id', folderId)
    .single();
  
  if (folder?.is_system_folder) {
    throw new Error('Cannot delete system folders');
  }
  
  const { error } = await supabase
    .from('document_folders')
    .delete()
    .eq('id', folderId);
  
  if (error) throw new Error(`Failed to delete folder: ${error.message}`);
}

/**
 * Moves a document to a folder
 */
export async function moveDocumentToFolder(
  documentId: string,
  folderId: string | null
): Promise<void> {
  const supabase = await createClient();
  
  let folderPath = '/';
  if (folderId) {
    const { data: folder } = await supabase
      .from('document_folders')
      .select('path')
      .eq('id', folderId)
      .single();
    folderPath = folder?.path || '/';
  }
  
  const { error } = await supabase
    .from('documents')
    .update({
      folder_id: folderId,
      folder_path: folderPath,
    })
    .eq('id', documentId);
  
  if (error) throw new Error(`Failed to move document: ${error.message}`);
}

/**
 * Moves multiple documents to a folder (batch operation)
 */
export async function moveDocumentsToFolder(
  documentIds: string[],
  folderId: string | null
): Promise<void> {
  const supabase = await createClient();
  
  let folderPath = '/';
  if (folderId) {
    const { data: folder } = await supabase
      .from('document_folders')
      .select('path')
      .eq('id', folderId)
      .single();
    folderPath = folder?.path || '/';
  }
  
  const { error } = await supabase
    .from('documents')
    .update({
      folder_id: folderId,
      folder_path: folderPath,
    })
    .in('id', documentIds);
  
  if (error) throw new Error(`Failed to move documents: ${error.message}`);
}

/**
 * Gets documents in a folder
 */
export async function getDocumentsInFolder(
  companyId: string,
  folderId: string | null,
  options?: {
    status?: string[];
    limit?: number;
    offset?: number;
  }
): Promise<{ documents: any[]; total: number }> {
  const supabase = await createClient();
  
  let query = supabase
    .from('documents')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId);
  
  if (folderId) {
    query = query.eq('folder_id', folderId);
  } else {
    query = query.is('folder_id', null);
  }
  
  if (options?.status?.length) {
    query = query.in('status', options.status);
  } else {
    query = query.not('status', 'in', '("archived","obsolete")');
  }
  
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  
  const { data, error, count } = await query
    .range(offset, offset + limit - 1)
    .order('updated_at', { ascending: false });
  
  if (error) throw new Error(`Failed to fetch documents: ${error.message}`);
  return { documents: data || [], total: count || 0 };
}

/**
 * Initializes system folders for a company
 */
export async function initializeCompanyFolders(companyId: string): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase.rpc('initialize_company_document_folders', {
    p_company_id: companyId,
  });
  
  if (error) throw new Error(`Failed to initialize folders: ${error.message}`);
}

/**
 * Gets folder suggestions for a document based on its type
 */
export async function suggestFolderForDocument(
  companyId: string,
  documentTypeCode: string
): Promise<DocumentFolder | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('document_folders')
    .select('*')
    .eq('company_id', companyId)
    .contains('linked_document_types', [documentTypeCode])
    .eq('is_visible', true)
    .order('is_system_folder', { ascending: false })
    .order('sort_order')
    .limit(1)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to suggest folder: ${error.message}`);
  }
  return data;
}

// ============================================================================
// FOLDER STATS
// ============================================================================

/**
 * Gets document counts for all folders
 */
export async function getFolderStats(
  companyId: string
): Promise<Map<string, number>> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('documents')
    .select('folder_id')
    .eq('company_id', companyId)
    .not('status', 'in', '("archived","obsolete")');
  
  if (error) throw new Error(`Failed to fetch folder stats: ${error.message}`);
  
  const counts = new Map<string, number>();
  (data || []).forEach(doc => {
    const folderId = doc.folder_id || 'unfiled';
    counts.set(folderId, (counts.get(folderId) || 0) + 1);
  });
  
  return counts;
}
