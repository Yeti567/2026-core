/**
 * Equipment Maintenance History API
 * GET - Get full maintenance history for equipment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  listMaintenanceRecords,
  listReceipts,
  listWorkOrders,
  listDowntime,
  listSchedules,
  getEquipmentMaintenanceCosts,
  getEquipmentAvailability,
  exportMaintenanceHistory,
} from '@/lib/maintenance';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: equipmentId } = await params;
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
    const action = searchParams.get('action');
    
    // Get equipment details
    const { data: equipment } = await supabase
      .from('equipment_inventory')
      .select('*')
      .eq('id', equipmentId)
      .eq('company_id', profile.company_id)
      .single();
    
    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }
    
    // Handle export action
    if (action === 'export') {
      const format = (searchParams.get('format') || 'json') as 'json' | 'csv';
      const exportData = await exportMaintenanceHistory(profile.company_id, equipmentId, format);
      
      const contentType = format === 'csv' ? 'text/csv' : 'application/json';
      const filename = `maintenance-history-${equipment.equipment_code}.${format}`;
      
      return new NextResponse(exportData, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
    
    // Get all maintenance data
    const [
      { records: maintenanceRecords },
      { receipts },
      { workOrders },
      { downtime },
      { schedules },
      costStats,
      availabilityStats,
    ] = await Promise.all([
      listMaintenanceRecords(profile.company_id, { equipment_id: equipmentId }, 100, 0),
      listReceipts(profile.company_id, equipmentId, 100, 0),
      listWorkOrders(profile.company_id, { equipment_id: equipmentId }, 100, 0),
      listDowntime(profile.company_id, equipmentId, false, 100, 0),
      listSchedules(profile.company_id, { equipment_id: equipmentId }, 100, 0),
      getEquipmentMaintenanceCosts(profile.company_id, equipmentId),
      getEquipmentAvailability(profile.company_id, equipmentId),
    ]);
    
    // Get certifications (certification records)
    const certifications = maintenanceRecords.filter(r => r.is_certification_record);
    
    // Build service timeline
    const timeline = [
      ...maintenanceRecords.map(r => ({
        type: 'maintenance' as const,
        date: r.maintenance_date,
        title: r.title,
        description: r.work_performed || r.description,
        record_type: r.record_type,
        id: r.id,
      })),
      ...workOrders.map(wo => ({
        type: 'work_order' as const,
        date: wo.requested_date,
        title: wo.title,
        description: wo.problem_description,
        status: wo.status,
        id: wo.id,
      })),
      ...downtime.map(d => ({
        type: 'downtime' as const,
        date: d.started_at.split('T')[0],
        title: `Downtime: ${d.downtime_reason.replace(/_/g, ' ')}`,
        description: d.reason_details,
        duration: d.duration_minutes,
        id: d.id,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return NextResponse.json({
      equipment,
      maintenanceRecords,
      receipts,
      workOrders,
      downtime,
      schedules,
      certifications,
      costStats: costStats[0] || null,
      availabilityStats: availabilityStats[0] || null,
      timeline,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to get maintenance history');
  }
}
