/**
 * Work Order Detail API
 * GET - Get single work order
 * PATCH - Update work order
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/utils/error-handling';

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
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    // Try work_orders table first (new schema)
    let workOrder = null;
    
    const { data: newSchemaWO } = await supabase
      .from('work_orders')
      .select(`
        *,
        equipment:equipment_inventory(equipment_code, name, equipment_type, current_location)
      `)
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .single();
    
    if (newSchemaWO) {
      workOrder = newSchemaWO;
    } else {
      // Try maintenance_work_orders table (old schema)
      const { data: oldSchemaWO } = await supabase
        .from('maintenance_work_orders')
        .select(`
          *,
          equipment:equipment_inventory(equipment_code, name, equipment_type, current_location)
        `)
        .eq('id', id)
        .eq('company_id', profile.company_id)
        .single();
      
      if (oldSchemaWO) {
        workOrder = oldSchemaWO;
      }
    }
    
    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }
    
    return NextResponse.json(workOrder);
  } catch (error) {
    return handleApiError(error, 'Failed to get work order');
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
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    const body = await request.json();
    
    const updates: Record<string, unknown> = {};
    
    // Status updates
    if (body.status) {
      updates.status = body.status;
      
      // Set timestamps based on status
      if (body.status === 'in_progress' && !body.started_at) {
        updates.actual_start = new Date().toISOString();
        updates.started_at = new Date().toISOString();
      } else if (body.status === 'completed' && !body.completed_at) {
        updates.actual_end = new Date().toISOString();
        updates.completed_at = new Date().toISOString();
        updates.completion_percentage = 100;
      }
    }
    
    // Other fields
    if (body.completion_notes !== undefined) updates.completion_notes = body.completion_notes;
    if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to;
    if (body.actual_labor_hours !== undefined) updates.actual_labor_hours = body.actual_labor_hours;
    if (body.actual_cost !== undefined) updates.actual_cost = body.actual_cost;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.description !== undefined) updates.description = body.description;
    if (body.due_date !== undefined) updates.due_date = body.due_date;
    if (body.scheduled_start !== undefined) updates.scheduled_start = body.scheduled_start;
    if (body.scheduled_date !== undefined) updates.scheduled_date = body.scheduled_date;
    
    updates.updated_at = new Date().toISOString();
    
    // Try work_orders table first
    let result = null;
    
    const { data: newSchemaResult, error: newSchemaError } = await supabase
      .from('work_orders')
      .update(updates)
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .select(`
        *,
        equipment:equipment_inventory(equipment_code, name, equipment_type, current_location)
      `)
      .single();
    
    if (newSchemaResult) {
      result = newSchemaResult;
    } else {
      // Try maintenance_work_orders table
      const { data: oldSchemaResult, error: oldSchemaError } = await supabase
        .from('maintenance_work_orders')
        .update(updates)
        .eq('id', id)
        .eq('company_id', profile.company_id)
        .select(`
          *,
          equipment:equipment_inventory(equipment_code, name, equipment_type, current_location)
        `)
        .single();
      
      if (oldSchemaResult) {
        result = oldSchemaResult;
      } else if (oldSchemaError) {
        throw new Error(oldSchemaError.message);
      }
    }
    
    if (!result) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'Failed to update work order');
  }
}
