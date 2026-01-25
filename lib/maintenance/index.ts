// ============================================================================
// EQUIPMENT MAINTENANCE LIBRARY
// ============================================================================

import { createClient } from '@/lib/supabase/server';
import type {
  MaintenanceRecord,
  MaintenanceReceipt,
  MaintenanceSchedule,
  MaintenanceWorkOrder,
  EquipmentDowntime,
  CreateMaintenanceRecordInput,
  CreateReceiptInput,
  CreateScheduleInput,
  CreateWorkOrderInput,
  CreateDowntimeInput,
  MaintenanceRecordFilters,
  WorkOrderFilters,
  ScheduleFilters,
  EquipmentMaintenanceStats,
  EquipmentAvailabilityStats,
  MaintenanceDashboardStats,
} from './types';

// Re-export types
export * from './types';

// ============================================================================
// MAINTENANCE RECORDS
// ============================================================================

export async function createMaintenanceRecord(
  companyId: string,
  input: CreateMaintenanceRecordInput,
  createdBy?: string
): Promise<MaintenanceRecord> {
  const supabase = await createClient();
  
  // Calculate total cost
  const partsTotal = input.parts_used?.reduce((sum, p) => sum + (p.cost || 0) * p.quantity, 0) || 0;
  const totalCost = (input.labor_cost || 0) + partsTotal;
  
  const { data, error } = await supabase
    .from('maintenance_records')
    .insert({
      company_id: companyId,
      equipment_id: input.equipment_id,
      record_type: input.record_type,
      title: input.title,
      description: input.description,
      maintenance_date: input.maintenance_date,
      hour_meter_reading: input.hour_meter_reading,
      performed_by: input.performed_by,
      work_performed: input.work_performed,
      findings: input.findings,
      recommendations: input.recommendations,
      follow_up_required: input.follow_up_required || false,
      follow_up_notes: input.follow_up_notes,
      parts_used: input.parts_used || [],
      labor_cost: input.labor_cost,
      parts_cost: partsTotal,
      total_cost: totalCost,
      work_order_id: input.work_order_id,
      is_certification_record: input.is_certification_record || false,
      certification_type: input.certification_type,
      certification_expiry: input.certification_expiry,
      certificate_number: input.certificate_number,
      certifying_body: input.certifying_body,
      passed: input.passed,
      deficiencies: input.deficiencies || [],
      created_by: createdBy,
      cor_element: 7, // Element 7: Preventive Maintenance
    })
    .select()
    .single();
  
  if (error) throw new Error(`Failed to create maintenance record: ${error.message}`);
  return data;
}

export async function listMaintenanceRecords(
  companyId: string,
  filters?: MaintenanceRecordFilters,
  limit = 50,
  offset = 0
): Promise<{ records: MaintenanceRecord[]; total: number }> {
  const supabase = await createClient();
  
  let query = supabase
    .from('maintenance_records')
    .select(`
      *,
      equipment:equipment_inventory(equipment_code, name, equipment_type)
    `, { count: 'exact' })
    .eq('company_id', companyId)
    .order('maintenance_date', { ascending: false });
  
  if (filters?.equipment_id) {
    query = query.eq('equipment_id', filters.equipment_id);
  }
  if (filters?.record_type?.length) {
    query = query.in('record_type', filters.record_type);
  }
  if (filters?.date_from) {
    query = query.gte('maintenance_date', filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte('maintenance_date', filters.date_to);
  }
  if (filters?.certification_only) {
    query = query.eq('is_certification_record', true);
  }
  if (filters?.has_deficiencies) {
    query = query.not('deficiencies', 'eq', '{}');
  }
  
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  
  if (error) throw new Error(`Failed to list maintenance records: ${error.message}`);
  return { records: data || [], total: count || 0 };
}

export async function getMaintenanceRecord(recordId: string): Promise<MaintenanceRecord | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('maintenance_records')
    .select(`
      *,
      equipment:equipment_inventory(equipment_code, name, equipment_type)
    `)
    .eq('id', recordId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get maintenance record: ${error.message}`);
  }
  return data;
}

export async function updateMaintenanceRecord(
  recordId: string,
  updates: Partial<CreateMaintenanceRecordInput>
): Promise<MaintenanceRecord> {
  const supabase = await createClient();
  
  // Recalculate costs if parts changed
  let updateData: Record<string, unknown> = { ...updates };
  if (updates.parts_used) {
    const partsTotal = updates.parts_used.reduce((sum, p) => sum + (p.cost || 0) * p.quantity, 0);
    updateData.parts_cost = partsTotal;
    updateData.total_cost = (updates.labor_cost || 0) + partsTotal;
  }
  
  const { data, error } = await supabase
    .from('maintenance_records')
    .update(updateData)
    .eq('id', recordId)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to update maintenance record: ${error.message}`);
  return data;
}

// ============================================================================
// MAINTENANCE RECEIPTS
// ============================================================================

export async function createReceipt(
  companyId: string,
  input: CreateReceiptInput,
  createdBy?: string
): Promise<MaintenanceReceipt> {
  const supabase = await createClient();
  
  // Calculate subtotal from line items if provided
  const subtotal = input.line_items?.reduce((sum, item) => sum + item.total, 0);
  
  const { data, error } = await supabase
    .from('maintenance_receipts')
    .insert({
      company_id: companyId,
      equipment_id: input.equipment_id,
      maintenance_record_id: input.maintenance_record_id,
      work_order_id: input.work_order_id,
      source: input.source,
      receipt_number: input.receipt_number,
      receipt_date: input.receipt_date,
      vendor_name: input.vendor_name,
      subtotal: subtotal,
      tax_amount: input.tax_amount,
      total_amount: input.total_amount,
      line_items: input.line_items || [],
      expense_category: input.expense_category,
      notes: input.notes,
      created_by: createdBy,
    })
    .select()
    .single();
  
  if (error) throw new Error(`Failed to create receipt: ${error.message}`);
  return data;
}

export async function listReceipts(
  companyId: string,
  equipmentId?: string,
  limit = 50,
  offset = 0
): Promise<{ receipts: MaintenanceReceipt[]; total: number }> {
  const supabase = await createClient();
  
  let query = supabase
    .from('maintenance_receipts')
    .select(`
      *,
      equipment:equipment_inventory(equipment_code, name)
    `, { count: 'exact' })
    .eq('company_id', companyId)
    .order('receipt_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  
  if (equipmentId) {
    query = query.eq('equipment_id', equipmentId);
  }
  
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  
  if (error) throw new Error(`Failed to list receipts: ${error.message}`);
  return { receipts: data || [], total: count || 0 };
}

export async function approveReceipt(
  receiptId: string,
  approvedBy: string
): Promise<MaintenanceReceipt> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('maintenance_receipts')
    .update({
      approved: true,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', receiptId)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to approve receipt: ${error.message}`);
  return data;
}

// ============================================================================
// MAINTENANCE SCHEDULES
// ============================================================================

export async function createSchedule(
  companyId: string,
  input: CreateScheduleInput,
  createdBy?: string
): Promise<MaintenanceSchedule> {
  const supabase = await createClient();
  
  // Calculate initial next_due_date
  const today = new Date().toISOString().split('T')[0];
  let nextDueDate: string | undefined;
  
  if (input.frequency_type !== 'hours') {
    const { data: calcData } = await supabase.rpc('calculate_next_maintenance_date', {
      p_last_date: today,
      p_frequency_type: input.frequency_type,
      p_frequency_value: input.frequency_value,
    });
    nextDueDate = calcData;
  }
  
  const { data, error } = await supabase
    .from('maintenance_schedules')
    .insert({
      company_id: companyId,
      equipment_id: input.equipment_id,
      schedule_name: input.schedule_name,
      description: input.description,
      maintenance_type: input.maintenance_type,
      frequency_type: input.frequency_type,
      frequency_value: input.frequency_value,
      hours_interval: input.hours_interval,
      warning_days: input.warning_days || 7,
      warning_hours: input.warning_hours,
      next_due_date: nextDueDate,
      next_due_hours: input.hours_interval,
      task_checklist: input.task_checklist || [],
      estimated_duration_minutes: input.estimated_duration_minutes,
      required_parts: input.required_parts || [],
      required_certifications: input.required_certifications || [],
      assigned_to: input.assigned_to,
      default_mechanic: input.default_mechanic,
      is_regulatory_requirement: input.is_regulatory_requirement || false,
      regulation_reference: input.regulation_reference,
      is_active: true,
      created_by: createdBy,
    })
    .select()
    .single();
  
  if (error) throw new Error(`Failed to create schedule: ${error.message}`);
  return data;
}

export async function listSchedules(
  companyId: string,
  filters?: ScheduleFilters,
  limit = 50,
  offset = 0
): Promise<{ schedules: MaintenanceSchedule[]; total: number }> {
  const supabase = await createClient();
  
  let query = supabase
    .from('maintenance_schedules')
    .select(`
      *,
      equipment:equipment_inventory(equipment_code, name, equipment_type, current_hours)
    `, { count: 'exact' })
    .eq('company_id', companyId)
    .order('next_due_date', { ascending: true, nullsFirst: false });
  
  if (filters?.equipment_id) {
    query = query.eq('equipment_id', filters.equipment_id);
  }
  if (filters?.maintenance_type?.length) {
    query = query.in('maintenance_type', filters.maintenance_type);
  }
  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }
  if (filters?.overdue_only) {
    query = query.lt('next_due_date', new Date().toISOString().split('T')[0]);
  }
  if (filters?.due_within_days) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + filters.due_within_days);
    query = query.lte('next_due_date', futureDate.toISOString().split('T')[0]);
  }
  
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  
  if (error) throw new Error(`Failed to list schedules: ${error.message}`);
  
  // Add computed status
  const today = new Date();
  const schedulesWithStatus = (data || []).map(schedule => {
    let status: 'scheduled' | 'due_soon' | 'overdue' = 'scheduled';
    let daysUntilDue: number | undefined;
    
    if (schedule.next_due_date) {
      const dueDate = new Date(schedule.next_due_date);
      daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue < 0) {
        status = 'overdue';
      } else if (daysUntilDue <= schedule.warning_days) {
        status = 'due_soon';
      }
    }
    
    return {
      ...schedule,
      maintenance_status: status,
      days_until_due: daysUntilDue,
    };
  });
  
  return { schedules: schedulesWithStatus, total: count || 0 };
}

export async function completeScheduledMaintenance(
  scheduleId: string,
  completionDate: string,
  hourReading?: number
): Promise<MaintenanceSchedule> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('complete_scheduled_maintenance', {
    p_schedule_id: scheduleId,
    p_completion_date: completionDate,
    p_hour_reading: hourReading || null,
  });
  
  if (error) throw new Error(`Failed to complete scheduled maintenance: ${error.message}`);
  return data;
}

// ============================================================================
// WORK ORDERS
// ============================================================================

export async function createWorkOrder(
  companyId: string,
  input: CreateWorkOrderInput,
  requestedBy?: string
): Promise<MaintenanceWorkOrder> {
  const supabase = await createClient();
  
  // Generate work order number
  const { data: woNumber } = await supabase.rpc('generate_work_order_number', {
    p_company_id: companyId,
  });
  
  // Get equipment current location and hours
  const { data: equipment } = await supabase
    .from('equipment_inventory')
    .select('current_location, current_hours')
    .eq('id', input.equipment_id)
    .single();
  
  const { data, error } = await supabase
    .from('maintenance_work_orders')
    .insert({
      company_id: companyId,
      equipment_id: input.equipment_id,
      work_order_number: woNumber,
      title: input.title,
      description: input.description,
      maintenance_type: input.maintenance_type,
      status: 'open',
      priority: input.priority || 'medium',
      requested_date: new Date().toISOString().split('T')[0],
      scheduled_date: input.scheduled_date,
      due_date: input.due_date,
      schedule_id: input.schedule_id,
      requested_by: requestedBy,
      assigned_to: input.assigned_to,
      assigned_mechanic: input.assigned_mechanic,
      equipment_location: equipment?.current_location,
      equipment_hours: equipment?.current_hours,
      problem_description: input.problem_description,
      safety_concern: input.safety_concern || false,
      safety_notes: input.safety_notes,
      estimated_labor_hours: input.estimated_labor_hours,
      estimated_cost: input.estimated_cost,
      approval_required: input.approval_required || false,
      parts_needed: [],
      photos_before: [],
      photos_after: [],
      created_by: requestedBy,
    })
    .select()
    .single();
  
  if (error) throw new Error(`Failed to create work order: ${error.message}`);
  return data;
}

export async function listWorkOrders(
  companyId: string,
  filters?: WorkOrderFilters,
  limit = 50,
  offset = 0
): Promise<{ workOrders: MaintenanceWorkOrder[]; total: number }> {
  const supabase = await createClient();
  
  let query = supabase
    .from('maintenance_work_orders')
    .select(`
      *,
      equipment:equipment_inventory(equipment_code, name, equipment_type, current_location)
    `, { count: 'exact' })
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  
  if (filters?.equipment_id) {
    query = query.eq('equipment_id', filters.equipment_id);
  }
  if (filters?.status?.length) {
    query = query.in('status', filters.status);
  }
  if (filters?.priority?.length) {
    query = query.in('priority', filters.priority);
  }
  if (filters?.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to);
  }
  if (filters?.due_before) {
    query = query.lte('due_date', filters.due_before);
  }
  
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  
  if (error) throw new Error(`Failed to list work orders: ${error.message}`);
  return { workOrders: data || [], total: count || 0 };
}

export async function getWorkOrder(workOrderId: string): Promise<MaintenanceWorkOrder | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('maintenance_work_orders')
    .select(`
      *,
      equipment:equipment_inventory(equipment_code, name, equipment_type, current_location)
    `)
    .eq('id', workOrderId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get work order: ${error.message}`);
  }
  return data;
}

export async function updateWorkOrderStatus(
  workOrderId: string,
  status: string,
  notes?: string
): Promise<MaintenanceWorkOrder> {
  const supabase = await createClient();
  
  const updates: Record<string, unknown> = { status };
  
  // Set timestamps based on status
  if (status === 'in_progress') {
    updates.started_at = new Date().toISOString();
  } else if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
    if (notes) updates.completion_notes = notes;
  }
  
  const { data, error } = await supabase
    .from('maintenance_work_orders')
    .update(updates)
    .eq('id', workOrderId)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to update work order status: ${error.message}`);
  return data;
}

export async function assignWorkOrder(
  workOrderId: string,
  assignedTo: string,
  assignedMechanic?: string
): Promise<MaintenanceWorkOrder> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('maintenance_work_orders')
    .update({
      assigned_to: assignedTo,
      assigned_mechanic: assignedMechanic,
      status: 'assigned',
    })
    .eq('id', workOrderId)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to assign work order: ${error.message}`);
  return data;
}

// ============================================================================
// EQUIPMENT DOWNTIME
// ============================================================================

export async function startDowntime(
  companyId: string,
  input: CreateDowntimeInput,
  reportedBy?: string
): Promise<EquipmentDowntime> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('equipment_downtime')
    .insert({
      company_id: companyId,
      equipment_id: input.equipment_id,
      started_at: input.started_at,
      downtime_reason: input.downtime_reason,
      reason_details: input.reason_details,
      work_order_id: input.work_order_id,
      production_impact: input.production_impact,
      estimated_lost_hours: input.estimated_lost_hours,
      reported_by: reportedBy,
    })
    .select()
    .single();
  
  if (error) throw new Error(`Failed to start downtime: ${error.message}`);
  return data;
}

export async function endDowntime(
  downtimeId: string,
  resolutionNotes?: string,
  resolvedBy?: string
): Promise<EquipmentDowntime> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('equipment_downtime')
    .update({
      ended_at: new Date().toISOString(),
      resolution_notes: resolutionNotes,
      resolved_by: resolvedBy,
    })
    .eq('id', downtimeId)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to end downtime: ${error.message}`);
  return data;
}

export async function listDowntime(
  companyId: string,
  equipmentId?: string,
  activeOnly = false,
  limit = 50,
  offset = 0
): Promise<{ downtime: EquipmentDowntime[]; total: number }> {
  const supabase = await createClient();
  
  let query = supabase
    .from('equipment_downtime')
    .select(`
      *,
      equipment:equipment_inventory(equipment_code, name, equipment_type)
    `, { count: 'exact' })
    .eq('company_id', companyId)
    .order('started_at', { ascending: false });
  
  if (equipmentId) {
    query = query.eq('equipment_id', equipmentId);
  }
  if (activeOnly) {
    query = query.is('ended_at', null);
  }
  
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  
  if (error) throw new Error(`Failed to list downtime: ${error.message}`);
  return { downtime: data || [], total: count || 0 };
}

// ============================================================================
// STATISTICS & REPORTS
// ============================================================================

export async function getEquipmentMaintenanceCosts(
  companyId: string,
  equipmentId?: string
): Promise<EquipmentMaintenanceStats[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('equipment_maintenance_costs')
    .select('*')
    .eq('company_id', companyId);
  
  if (equipmentId) {
    query = query.eq('equipment_id', equipmentId);
  }
  
  const { data, error } = await query;
  
  if (error) throw new Error(`Failed to get maintenance costs: ${error.message}`);
  return data || [];
}

export async function getEquipmentAvailability(
  companyId: string,
  equipmentId?: string
): Promise<EquipmentAvailabilityStats[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('equipment_availability')
    .select('*')
    .eq('company_id', companyId);
  
  if (equipmentId) {
    query = query.eq('equipment_id', equipmentId);
  }
  
  const { data, error } = await query;
  
  if (error) throw new Error(`Failed to get equipment availability: ${error.message}`);
  return data || [];
}

export async function getMaintenanceDashboardStats(
  companyId: string
): Promise<MaintenanceDashboardStats> {
  const supabase = await createClient();
  
  // Get equipment counts
  const { data: equipmentStats } = await supabase
    .from('equipment_inventory')
    .select('status', { count: 'exact' })
    .eq('company_id', companyId);
  
  const totalEquipment = equipmentStats?.length || 0;
  const activeEquipment = equipmentStats?.filter(e => e.status === 'active').length || 0;
  const inMaintenance = equipmentStats?.filter(e => e.status === 'maintenance').length || 0;
  
  // Get overdue inspections
  const { count: overdueInspections } = await supabase
    .from('equipment_inventory')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('inspection_status', 'overdue');
  
  // Get upcoming maintenance (next 7 days)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  const { count: upcomingMaintenance } = await supabase
    .from('maintenance_schedules')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('is_active', true)
    .lte('next_due_date', sevenDaysFromNow.toISOString().split('T')[0]);
  
  // Get work order stats
  const { data: workOrders } = await supabase
    .from('maintenance_work_orders')
    .select('status, priority')
    .eq('company_id', companyId)
    .not('status', 'in', '("completed","cancelled")');
  
  const openWorkOrders = workOrders?.length || 0;
  const criticalWorkOrders = workOrders?.filter(wo => wo.priority === 'critical').length || 0;
  
  // Get downtime stats (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: downtimeData } = await supabase
    .from('equipment_downtime')
    .select('duration_minutes')
    .eq('company_id', companyId)
    .gte('started_at', thirtyDaysAgo.toISOString());
  
  const totalDowntimeMinutes = downtimeData?.reduce((sum, d) => sum + (d.duration_minutes || 0), 0) || 0;
  const totalDowntimeHours = totalDowntimeMinutes / 60;
  
  // Calculate average availability
  const { data: availabilityData } = await supabase
    .from('equipment_availability')
    .select('availability_30_days')
    .eq('company_id', companyId);
  
  const avgAvailability = availabilityData?.length
    ? availabilityData.reduce((sum, a) => sum + (a.availability_30_days || 100), 0) / availabilityData.length
    : 100;
  
  // Get YTD maintenance costs
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const { data: costData } = await supabase
    .from('maintenance_records')
    .select('total_cost, record_type')
    .eq('company_id', companyId)
    .gte('maintenance_date', yearStart);
  
  const totalCostYtd = costData?.reduce((sum, r) => sum + (r.total_cost || 0), 0) || 0;
  
  // Group costs by type
  const costByType: Record<string, number> = {};
  costData?.forEach(r => {
    costByType[r.record_type] = (costByType[r.record_type] || 0) + (r.total_cost || 0);
  });
  
  return {
    total_equipment: totalEquipment,
    active_equipment: activeEquipment,
    equipment_in_maintenance: inMaintenance,
    overdue_inspections: overdueInspections || 0,
    upcoming_maintenance: upcomingMaintenance || 0,
    open_work_orders: openWorkOrders,
    critical_work_orders: criticalWorkOrders,
    total_downtime_hours_30_days: Math.round(totalDowntimeHours * 10) / 10,
    average_availability: Math.round(avgAvailability * 10) / 10,
    total_maintenance_cost_ytd: totalCostYtd,
    total_cost_by_type: costByType,
  };
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export async function exportMaintenanceHistory(
  companyId: string,
  equipmentId: string,
  format: 'json' | 'csv' = 'json'
): Promise<string> {
  const supabase = await createClient();
  
  // Get equipment details
  const { data: equipment } = await supabase
    .from('equipment_inventory')
    .select('*')
    .eq('id', equipmentId)
    .single();
  
  // Get all maintenance records
  const { data: records } = await supabase
    .from('maintenance_records')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('maintenance_date', { ascending: false });
  
  // Get all receipts
  const { data: receipts } = await supabase
    .from('maintenance_receipts')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('receipt_date', { ascending: false });
  
  // Get certifications
  const certifications = records?.filter(r => r.is_certification_record) || [];
  
  const exportData = {
    equipment,
    maintenance_history: records || [],
    receipts: receipts || [],
    certifications,
    export_date: new Date().toISOString(),
    export_company_id: companyId,
  };
  
  if (format === 'json') {
    return JSON.stringify(exportData, null, 2);
  }
  
  // CSV format (simplified for maintenance records)
  const headers = [
    'Date',
    'Type',
    'Title',
    'Description',
    'Performed By',
    'Labor Cost',
    'Parts Cost',
    'Total Cost',
    'Passed',
    'Notes',
  ];
  
  const rows = (records || []).map(r => [
    r.maintenance_date,
    r.record_type,
    r.title,
    r.description || '',
    r.performed_by || '',
    r.labor_cost || '',
    r.parts_cost || '',
    r.total_cost || '',
    r.passed !== null ? (r.passed ? 'Yes' : 'No') : '',
    r.findings || '',
  ]);
  
  return [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
}
