/**
 * Work Orders API
 * GET - List work orders
 * POST - Create work order
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createWorkOrder,
  listWorkOrders,
  type CreateWorkOrderInput,
  type WorkOrderFilters,
} from '@/lib/maintenance';
import { parseWorkOrderPriorityArray, parseWorkOrderStatusArray } from '@/lib/utils/type-guards';
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
    
    const filters: WorkOrderFilters = {
      equipment_id: searchParams.get('equipment_id') || undefined,
      status: parseWorkOrderStatusArray(searchParams.get('status')) || undefined,
      priority: parseWorkOrderPriorityArray(searchParams.get('priority')) || undefined,
      assigned_to: searchParams.get('assigned_to') || undefined,
      due_before: searchParams.get('due_before') || undefined,
    };
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const { workOrders, total } = await listWorkOrders(
      profile.company_id,
      filters,
      limit,
      offset
    );
    
    return NextResponse.json({ workOrders, total, limit, offset });
  } catch (error) {
    return handleApiError(error, 'Failed to list work orders');
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
    
    if (!body.equipment_id || !body.title || !body.maintenance_type) {
      return NextResponse.json(
        { error: 'equipment_id, title, and maintenance_type are required' },
        { status: 400 }
      );
    }
    
    const input: CreateWorkOrderInput = {
      equipment_id: body.equipment_id,
      title: body.title,
      description: body.description,
      maintenance_type: body.maintenance_type,
      priority: body.priority,
      scheduled_date: body.scheduled_date,
      due_date: body.due_date,
      schedule_id: body.schedule_id,
      assigned_to: body.assigned_to,
      assigned_mechanic: body.assigned_mechanic,
      problem_description: body.problem_description,
      safety_concern: body.safety_concern,
      safety_notes: body.safety_notes,
      estimated_labor_hours: body.estimated_labor_hours,
      estimated_cost: body.estimated_cost,
      approval_required: body.approval_required,
    };
    
    const workOrder = await createWorkOrder(profile.company_id, input, profile.id);
    
    return NextResponse.json(workOrder, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create work order');
  }
}
