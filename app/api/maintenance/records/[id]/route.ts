/**
 * Single Maintenance Record API
 * GET - Get record details
 * PATCH - Update record
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMaintenanceRecord, updateMaintenanceRecord } from '@/lib/maintenance';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const record = await getMaintenanceRecord(id);
    
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    return NextResponse.json(record);
  } catch (error) {
    return handleApiError(error, 'Failed to get record');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const record = await updateMaintenanceRecord(id, body);
    
    return NextResponse.json(record);
  } catch (error) {
    return handleApiError(error, 'Failed to update record');
  }
}
