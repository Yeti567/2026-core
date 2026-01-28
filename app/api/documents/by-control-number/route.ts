/**
 * Find Document by Control Number API
 * 
 * GET: Find document by control number (for audit engine integration)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


// Type for folder relation from Supabase join
interface FolderRelation {
  name?: string;
  folder_code?: string;
  icon?: string;
  color?: string;
}

// Helper to safely extract relation data (handles array or single object from Supabase)
function getRelation<T>(data: unknown): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return (data[0] as T) || null;
  return data as T;
}

/**
 * GET /api/documents/by-control-number?q=NCCI-POL-001
 * Find document by control number
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const controlNumber = searchParams.get('q');

    if (!controlNumber) {
      return NextResponse.json(
        { error: 'Control number is required' },
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

    // Get user profile for company ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Try using RPC function first
    const { data: rpcResult, error: rpcError } = await supabase.rpc('find_document_by_control_number', {
      p_company_id: profile.company_id,
      p_control_number: controlNumber,
    });

    if (!rpcError && rpcResult && rpcResult.length > 0) {
      return NextResponse.json({
        found: true,
        document: rpcResult[0],
      });
    }

    // Fallback to direct query
    const { data, error } = await supabase
      .from('documents')
      .select(`
        id,
        control_number,
        title,
        description,
        file_path,
        file_name,
        version,
        status,
        is_critical,
        cor_elements,
        tags,
        keywords,
        effective_date,
        folder_id,
        document_folders!folder_id (
          name,
          folder_code,
          icon,
          color
        )
      `)
      .eq('company_id', profile.company_id)
      .ilike('control_number', controlNumber)
      .in('status', ['active', 'approved'])
      .single();

    if (error || !data) {
      return NextResponse.json({
        found: false,
        document: null,
        message: `No active document found with control number: ${controlNumber}`,
      });
    }

    const folder = getRelation<FolderRelation>(data.document_folders);

    return NextResponse.json({
      found: true,
      document: {
        ...data,
        folder_name: folder?.name,
        folder_code: folder?.folder_code,
      },
    });
  } catch (error) {
    return handleApiError(error, 'Failed to find document');
  }
}
