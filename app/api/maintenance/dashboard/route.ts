/**
 * Maintenance Dashboard API
 * GET - Retrieve dashboard statistics and summary data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/utils/error-handling';

// Type for equipment relation from Supabase join
interface EquipmentRelation {
  equipment_code: string;
  name: string;
}

// Helper to safely access equipment relation data
function getEquipmentData(equipment: unknown): EquipmentRelation {
  if (equipment && typeof equipment === 'object' && 'equipment_code' in equipment && 'name' in equipment) {
    return equipment as EquipmentRelation;
  }
  return { equipment_code: 'Unknown', name: 'Unknown' };
}

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

    const companyId = profile.company_id;
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const yearStart = new Date(today.getFullYear(), 0, 1);

    // Get equipment counts
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment_inventory')
      .select('id, status')
      .eq('company_id', companyId);

    const totalEquipment = equipment?.length || 0;
    const activeEquipment = equipment?.filter(e => e.status === 'active' || e.status === 'in_service').length || 0;

    // Get overdue maintenance schedules
    const { data: overdueSchedules } = await supabase
      .from('maintenance_schedules')
      .select(`
        id,
        schedule_name,
        maintenance_type,
        next_due_date,
        equipment_id,
        equipment:equipment_inventory(equipment_code, name)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .lt('next_due_date', today.toISOString().split('T')[0])
      .order('next_due_date', { ascending: true });

    const overdueItems = (overdueSchedules || []).map(schedule => {
      const dueDate = new Date(schedule.next_due_date);
      const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const equipData = getEquipmentData(schedule.equipment);
      return {
        id: schedule.id,
        equipment_id: schedule.equipment_id,
        equipment_code: equipData.equipment_code,
        equipment_name: equipData.name,
        schedule_name: schedule.schedule_name,
        maintenance_type: schedule.maintenance_type,
        next_due_date: schedule.next_due_date,
        days_overdue: daysOverdue
      };
    });

    // Get upcoming maintenance (next 30 days)
    const { data: upcomingSchedules } = await supabase
      .from('maintenance_schedules')
      .select(`
        id,
        schedule_name,
        maintenance_type,
        next_due_date,
        equipment_id,
        equipment:equipment_inventory(equipment_code, name)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .gte('next_due_date', today.toISOString().split('T')[0])
      .lte('next_due_date', thirtyDaysFromNow.toISOString().split('T')[0])
      .order('next_due_date', { ascending: true })
      .limit(20);

    const upcomingItems = (upcomingSchedules || []).map(schedule => {
      const dueDate = new Date(schedule.next_due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const equipData = getEquipmentData(schedule.equipment);
      return {
        id: schedule.id,
        equipment_id: schedule.equipment_id,
        equipment_code: equipData.equipment_code,
        equipment_name: equipData.name,
        schedule_name: schedule.schedule_name,
        maintenance_type: schedule.maintenance_type,
        next_due_date: schedule.next_due_date,
        days_until_due: daysUntilDue
      };
    });

    // Get recent maintenance records (last 7 days)
    const { data: recentRecords } = await supabase
      .from('maintenance_records')
      .select(`
        id,
        maintenance_type,
        work_description,
        actual_date,
        cost_total,
        passed_inspection,
        equipment_id,
        equipment:equipment_inventory(equipment_code, name)
      `)
      .eq('company_id', companyId)
      .gte('actual_date', sevenDaysAgo.toISOString().split('T')[0])
      .order('actual_date', { ascending: false })
      .limit(10);

    const formattedRecords = (recentRecords || []).map(record => {
      const equipData = getEquipmentData(record.equipment);
      return {
        id: record.id,
        equipment_id: record.equipment_id,
        equipment_code: equipData.equipment_code,
        equipment_name: equipData.name,
        maintenance_type: record.maintenance_type,
        work_description: record.work_description,
        actual_date: record.actual_date,
        cost_total: record.cost_total || 0,
        passed_inspection: record.passed_inspection
      };
    });

    // Get YTD costs
    const { data: ytdRecords } = await supabase
      .from('maintenance_records')
      .select('cost_total')
      .eq('company_id', companyId)
      .gte('actual_date', yearStart.toISOString().split('T')[0]);

    const ytdCost = (ytdRecords || []).reduce((sum, r) => sum + (r.cost_total || 0), 0);

    // Get monthly costs for last 12 months
    const monthlyData: { month: string; cost: number; preventive: number; corrective: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);

      const { data: monthRecords } = await supabase
        .from('maintenance_records')
        .select('cost_total, maintenance_type')
        .eq('company_id', companyId)
        .gte('actual_date', monthStart.toISOString().split('T')[0])
        .lte('actual_date', monthEnd.toISOString().split('T')[0]);

      const preventive = (monthRecords || [])
        .filter(r => r.maintenance_type === 'preventive')
        .reduce((sum, r) => sum + (r.cost_total || 0), 0);

      const corrective = (monthRecords || [])
        .filter(r => r.maintenance_type === 'corrective' || r.maintenance_type === 'repair')
        .reduce((sum, r) => sum + (r.cost_total || 0), 0);

      monthlyData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        cost: preventive + corrective,
        preventive,
        corrective
      });
    }

    return NextResponse.json({
      total_equipment: totalEquipment,
      active_equipment: activeEquipment,
      overdue_count: overdueItems.length,
      due_soon_30_days: upcomingItems.length,
      ytd_cost: ytdCost,
      recent_maintenance_count: formattedRecords.length,
      overdue_items: overdueItems,
      upcoming_items: upcomingItems,
      recent_records: formattedRecords,
      monthly_costs: monthlyData
    });
  } catch (error) {
    return handleApiError(error, 'Failed to load dashboard');
  }
}
