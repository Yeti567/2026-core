/**
 * Maintenance Schedules API
 * GET - List schedules
 * POST - Create schedule
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createSchedule,
  listSchedules,
  type CreateScheduleInput,
  type ScheduleFilters,
} from '@/lib/maintenance';
import { parseMaintenanceRecordTypeArray } from '@/lib/utils/type-guards';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


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
    
    const filters: ScheduleFilters = {
      equipment_id: searchParams.get('equipment_id') || undefined,
      maintenance_type: parseMaintenanceRecordTypeArray(searchParams.get('type')) || undefined,
      is_active: searchParams.get('active') !== 'false',
      overdue_only: searchParams.get('overdue_only') === 'true',
      due_within_days: searchParams.get('due_within_days')
        ? parseInt(searchParams.get('due_within_days')!)
        : undefined,
    };
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const { schedules, total } = await listSchedules(
      profile.company_id,
      filters,
      limit,
      offset
    );
    
    return NextResponse.json({ schedules, total, limit, offset });
  } catch (error) {
    return handleApiError(error, 'Failed to list schedules');
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
    
    // Check permissions
    if (!['super_admin', 'admin', 'supervisor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const body = await request.json();
    
    if (!body.equipment_id || !body.schedule_name || !body.maintenance_type ||
        !body.frequency_type || !body.frequency_value) {
      return NextResponse.json(
        { error: 'equipment_id, schedule_name, maintenance_type, frequency_type, and frequency_value are required' },
        { status: 400 }
      );
    }
    
    const input: CreateScheduleInput = {
      equipment_id: body.equipment_id,
      schedule_name: body.schedule_name,
      description: body.description,
      maintenance_type: body.maintenance_type,
      frequency_type: body.frequency_type,
      frequency_value: body.frequency_value,
      hours_interval: body.hours_interval,
      warning_days: body.warning_days,
      warning_hours: body.warning_hours,
      task_checklist: body.task_checklist,
      estimated_duration_minutes: body.estimated_duration_minutes,
      required_parts: body.required_parts,
      required_certifications: body.required_certifications,
      assigned_to: body.assigned_to,
      default_mechanic: body.default_mechanic,
      is_regulatory_requirement: body.is_regulatory_requirement,
      regulation_reference: body.regulation_reference,
    };
    
    const schedule = await createSchedule(profile.company_id, input, profile.id);
    
    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create schedule');
  }
}
