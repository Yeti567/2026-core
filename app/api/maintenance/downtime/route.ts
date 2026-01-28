/**
 * Equipment Downtime API
 * GET - List downtime records
 * POST - Start downtime
 * PATCH - End/update downtime
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    const equipmentId = searchParams.get('equipment_id');
    const activeOnly = searchParams.get('active_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let query = supabase
      .from('equipment_downtime_log')
      .select(`
        *,
        equipment:equipment_inventory(equipment_code, name)
      `)
      .eq('company_id', profile.company_id)
      .order('downtime_start', { ascending: false })
      .limit(limit);
    
    if (equipmentId) {
      query = query.eq('equipment_id', equipmentId);
    }
    
    if (activeOnly) {
      query = query.is('downtime_end', null).eq('resolved', false);
    }
    
    const { data, error } = await query;
    
    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        return NextResponse.json({ downtime: [] });
      }
      throw new Error(error.message);
    }
    
    return NextResponse.json({ downtime: data || [] });
  } catch (error) {
    return handleApiError(error, 'Failed to list downtime');
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
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    const body = await request.json();
    
    if (!body.equipment_id || !body.downtime_start || !body.reason) {
      return NextResponse.json(
        { error: 'equipment_id, downtime_start, and reason are required' },
        { status: 400 }
      );
    }
    
    // Verify equipment belongs to company
    const { data: equipment } = await supabase
      .from('equipment_inventory')
      .select('id')
      .eq('id', body.equipment_id)
      .eq('company_id', profile.company_id)
      .single();
    
    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }
    
    // Create downtime record
    const { data, error } = await supabase
      .from('equipment_downtime_log')
      .insert({
        equipment_id: body.equipment_id,
        company_id: profile.company_id,
        downtime_start: body.downtime_start,
        reason: body.reason,
        description: body.description || null,
        impact_level: body.impact_level || 'normal',
        work_order_id: body.work_order_id || null,
        resolved: false
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    // Update equipment status
    await supabase
      .from('equipment_inventory')
      .update({ status: 'out_of_service' })
      .eq('id', body.equipment_id);
    
    // Create work order if requested
    if (body.create_work_order) {
      await supabase
        .from('work_orders')
        .insert({
          equipment_id: body.equipment_id,
          company_id: profile.company_id,
          work_order_number: `WO-${Date.now()}`,
          title: `Downtime: ${body.reason}`,
          description: body.description || `Equipment is out of service due to: ${body.reason}`,
          priority: body.impact_level === 'critical' ? 'critical' : body.impact_level === 'high' ? 'high' : 'medium',
          work_order_type: 'corrective',
          status: 'open',
          downtime_start: body.downtime_start,
          requested_by: profile.id
        });
    }
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to start downtime');
  }
}

export async function PATCH(request: NextRequest) {
  try {
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
    
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    
    // Get existing downtime record
    const { data: existing } = await supabase
      .from('equipment_downtime_log')
      .select('equipment_id')
      .eq('id', body.id)
      .eq('company_id', profile.company_id)
      .single();
    
    if (!existing) {
      return NextResponse.json({ error: 'Downtime record not found' }, { status: 404 });
    }
    
    // Update downtime record
    const updates: Record<string, unknown> = {};
    
    if (body.downtime_end) {
      updates.downtime_end = body.downtime_end;
    }
    if (body.resolution_notes !== undefined) {
      updates.resolution_notes = body.resolution_notes;
    }
    if (body.resolved !== undefined) {
      updates.resolved = body.resolved;
    }
    
    const { data, error } = await supabase
      .from('equipment_downtime_log')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    // Update equipment status if resolved
    if (body.resolved) {
      await supabase
        .from('equipment_inventory')
        .update({ status: 'active' })
        .eq('id', existing.equipment_id);
    }
    
    // Create maintenance record if requested
    if (body.create_maintenance_record && body.downtime_end) {
      const startDate = new Date(data.downtime_start);
      const endDate = new Date(body.downtime_end);
      const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      
      await supabase
        .from('maintenance_records')
        .insert({
          equipment_id: existing.equipment_id,
          company_id: profile.company_id,
          record_number: `MAINT-DT-${Date.now()}`,
          maintenance_type: 'corrective',
          actual_date: startDate.toISOString().split('T')[0],
          work_description: `Downtime resolution: ${data.reason}. ${body.resolution_notes || ''}`,
          status: 'completed',
          notes: `Downtime duration: ${durationHours.toFixed(1)} hours`,
          created_by: profile.id
        });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, 'Failed to update downtime');
  }
}
