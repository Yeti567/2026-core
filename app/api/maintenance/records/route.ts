/**
 * Maintenance Records API
 * GET - List maintenance records
 * POST - Create maintenance record
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createMaintenanceRecord,
  listMaintenanceRecords,
  type CreateMaintenanceRecordInput,
  type MaintenanceRecordFilters,
} from '@/lib/maintenance';
import { parseMaintenanceRecordTypeArray } from '@/lib/utils/type-guards';
import { handleApiError } from '@/lib/utils/error-handling';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    const { searchParams } = new URL(request.url);
    
    const filters: MaintenanceRecordFilters = {
      equipment_id: searchParams.get('equipment_id') || undefined,
      record_type: parseMaintenanceRecordTypeArray(searchParams.get('type')) || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      certification_only: searchParams.get('certification_only') === 'true',
      has_deficiencies: searchParams.get('has_deficiencies') === 'true',
    };
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const { records, total } = await listMaintenanceRecords(
      profile.company_id,
      filters,
      limit,
      offset
    );
    
    return NextResponse.json({ records, total, limit, offset });
  } catch (error) {
    return handleApiError(error, 'Failed to list records');
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, company_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.equipment_id || !body.record_type || !body.title || !body.maintenance_date) {
      return NextResponse.json(
        { error: 'equipment_id, record_type, title, and maintenance_date are required' },
        { status: 400 }
      );
    }
    
    const input: CreateMaintenanceRecordInput = {
      equipment_id: body.equipment_id,
      record_type: body.record_type,
      title: body.title,
      description: body.description,
      maintenance_date: body.maintenance_date,
      hour_meter_reading: body.hour_meter_reading,
      performed_by: body.performed_by,
      work_performed: body.work_performed,
      findings: body.findings,
      recommendations: body.recommendations,
      follow_up_required: body.follow_up_required,
      follow_up_notes: body.follow_up_notes,
      parts_used: body.parts_used,
      labor_cost: body.labor_cost,
      work_order_id: body.work_order_id,
      is_certification_record: body.is_certification_record,
      certification_type: body.certification_type,
      certification_expiry: body.certification_expiry,
      certificate_number: body.certificate_number,
      certifying_body: body.certifying_body,
      passed: body.passed,
      deficiencies: body.deficiencies,
    };
    
    const record = await createMaintenanceRecord(profile.company_id, input, profile.id);
    
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create record');
  }
}
