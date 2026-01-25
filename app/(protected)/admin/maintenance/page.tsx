'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  MAINTENANCE_TYPE_CONFIG,
  WORK_ORDER_STATUS_CONFIG,
  WORK_ORDER_PRIORITY_CONFIG,
  DOWNTIME_REASON_CONFIG,
  SCHEDULE_FREQUENCY_CONFIG,
  type MaintenanceRecord,
  type MaintenanceWorkOrder,
  type MaintenanceSchedule,
  type EquipmentDowntime,
  type MaintenanceDashboardStats,
  type MaintenanceRecordType,
  type WorkOrderStatus,
  type WorkOrderPriority,
  type DowntimeReason,
  type ScheduleFrequencyType,
} from '@/lib/maintenance/types';

// ============================================================================
// TYPES
// ============================================================================

interface Equipment {
  id: string;
  equipment_code: string;
  name: string;
  equipment_type: string;
  status: string;
  current_location?: string;
  current_hours?: number;
}

// ============================================================================
// STATUS BADGES
// ============================================================================

function MaintenanceTypeBadge({ type }: { type: MaintenanceRecordType }) {
  // Safe: type is typed as MaintenanceRecordType enum, not arbitrary user input
  // eslint-disable-next-line security/detect-object-injection
  const config = MAINTENANCE_TYPE_CONFIG[type];
  if (!config) return <Badge variant="secondary">{type}</Badge>;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
}

function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  // Safe: status is typed as WorkOrderStatus enum, not arbitrary user input
  // eslint-disable-next-line security/detect-object-injection
  const config = WORK_ORDER_STATUS_CONFIG[status];
  if (!config) return <Badge variant="secondary">{status}</Badge>;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: WorkOrderPriority }) {
  // Safe: priority is typed as WorkOrderPriority enum, not arbitrary user input
  // eslint-disable-next-line security/detect-object-injection
  const config = WORK_ORDER_PRIORITY_CONFIG[priority];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
}

function ScheduleStatusBadge({ status }: { status: 'scheduled' | 'due_soon' | 'overdue' }) {
  const configs = {
    scheduled: { label: 'Scheduled', color: 'bg-green-500', icon: '✅' },
    due_soon: { label: 'Due Soon', color: 'bg-yellow-500', icon: '⚠️' },
    overdue: { label: 'Overdue', color: 'bg-red-500', icon: '❌' },
  };
  // Safe: status is typed as 'scheduled' | 'due_soon' | 'overdue' union, not arbitrary user input
  // eslint-disable-next-line security/detect-object-injection
  const config = configs[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
}

// ============================================================================
// MODALS
// ============================================================================

function NewMaintenanceRecordModal({
  isOpen,
  onClose,
  equipment,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment[];
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [formData, setFormData] = useState({
    equipment_id: '',
    record_type: 'inspection_daily' as MaintenanceRecordType,
    title: '',
    description: '',
    maintenance_date: new Date().toISOString().split('T')[0],
    performed_by: '',
    work_performed: '',
    findings: '',
    hour_meter_reading: '',
    labor_cost: '',
    passed: true,
  });

  const handleSubmit = () => {
    onSave({
      ...formData,
      hour_meter_reading: formData.hour_meter_reading ? parseFloat(formData.hour_meter_reading) : undefined,
      labor_cost: formData.labor_cost ? parseFloat(formData.labor_cost) : undefined,
    });
    onClose();
    setFormData({
      equipment_id: '',
      record_type: 'inspection_daily',
      title: '',
      description: '',
      maintenance_date: new Date().toISOString().split('T')[0],
      performed_by: '',
      work_performed: '',
      findings: '',
      hour_meter_reading: '',
      labor_cost: '',
      passed: true,
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📝 New Maintenance Record</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Equipment *</label>
              <select
                value={formData.equipment_id}
                onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
              >
                <option value="">Select equipment...</option>
                {equipment.map(e => (
                  <option key={e.id} value={e.id}>{e.equipment_code} - {e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Record Type *</label>
              <select
                value={formData.record_type}
                onChange={(e) => setFormData({ ...formData, record_type: e.target.value as MaintenanceRecordType })}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
              >
                {Object.entries(MAINTENANCE_TYPE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.icon} {config.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Daily pre-use inspection"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Date *</label>
              <Input
                type="date"
                value={formData.maintenance_date}
                onChange={(e) => setFormData({ ...formData, maintenance_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Performed By</label>
              <Input
                value={formData.performed_by}
                onChange={(e) => setFormData({ ...formData, performed_by: e.target.value })}
                placeholder="Mechanic name"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Work Performed</label>
            <textarea
              value={formData.work_performed}
              onChange={(e) => setFormData({ ...formData, work_performed: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg min-h-[80px]"
              placeholder="Describe work performed..."
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Findings / Notes</label>
            <textarea
              value={formData.findings}
              onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg min-h-[60px]"
              placeholder="Any issues or findings..."
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Hour Meter Reading</label>
              <Input
                type="number"
                value={formData.hour_meter_reading}
                onChange={(e) => setFormData({ ...formData, hour_meter_reading: e.target.value })}
                placeholder="Hours"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Labor Cost ($)</label>
              <Input
                type="number"
                value={formData.labor_cost}
                onChange={(e) => setFormData({ ...formData, labor_cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Result</label>
              <select
                value={formData.passed ? 'passed' : 'failed'}
                onChange={(e) => setFormData({ ...formData, passed: e.target.value === 'passed' })}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
              >
                <option value="passed">✅ Passed</option>
                <option value="failed">❌ Failed</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.equipment_id || !formData.title}>
              Save Record
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewWorkOrderModal({
  isOpen,
  onClose,
  equipment,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment[];
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [formData, setFormData] = useState({
    equipment_id: '',
    title: '',
    description: '',
    maintenance_type: 'corrective' as MaintenanceRecordType,
    priority: 'medium' as WorkOrderPriority,
    problem_description: '',
    safety_concern: false,
    due_date: '',
    assigned_mechanic: '',
    estimated_labor_hours: '',
  });

  const handleSubmit = () => {
    onSave({
      ...formData,
      estimated_labor_hours: formData.estimated_labor_hours ? parseFloat(formData.estimated_labor_hours) : undefined,
    });
    onClose();
    setFormData({
      equipment_id: '',
      title: '',
      description: '',
      maintenance_type: 'corrective',
      priority: 'medium',
      problem_description: '',
      safety_concern: false,
      due_date: '',
      assigned_mechanic: '',
      estimated_labor_hours: '',
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🔧 New Work Order</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Equipment *</label>
              <select
                value={formData.equipment_id}
                onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
              >
                <option value="">Select equipment...</option>
                {equipment.map(e => (
                  <option key={e.id} value={e.id}>{e.equipment_code} - {e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Priority *</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as WorkOrderPriority })}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
              >
                {Object.entries(WORK_ORDER_PRIORITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.icon} {config.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Replace hydraulic hose"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Problem Description *</label>
            <textarea
              value={formData.problem_description}
              onChange={(e) => setFormData({ ...formData, problem_description: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg min-h-[80px]"
              placeholder="Describe the issue..."
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Maintenance Type</label>
              <select
                value={formData.maintenance_type}
                onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value as MaintenanceRecordType })}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
              >
                {Object.entries(MAINTENANCE_TYPE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.icon} {config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Assign To</label>
              <Input
                value={formData.assigned_mechanic}
                onChange={(e) => setFormData({ ...formData, assigned_mechanic: e.target.value })}
                placeholder="Mechanic name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Estimated Hours</label>
              <Input
                type="number"
                value={formData.estimated_labor_hours}
                onChange={(e) => setFormData({ ...formData, estimated_labor_hours: e.target.value })}
                placeholder="Hours"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg">
            <input
              type="checkbox"
              id="safety_concern"
              checked={formData.safety_concern}
              onChange={(e) => setFormData({ ...formData, safety_concern: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="safety_concern" className="text-sm font-medium text-red-500">
              ⚠️ Safety Concern - Equipment should not be used until repaired
            </label>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.equipment_id || !formData.title || !formData.problem_description}>
              Create Work Order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewScheduleModal({
  isOpen,
  onClose,
  equipment,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment[];
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [formData, setFormData] = useState({
    equipment_id: '',
    schedule_name: '',
    description: '',
    maintenance_type: 'preventive' as MaintenanceRecordType,
    frequency_type: 'months' as ScheduleFrequencyType,
    frequency_value: '3',
    hours_interval: '',
    warning_days: '7',
    default_mechanic: '',
    is_regulatory_requirement: false,
  });

  const handleSubmit = () => {
    onSave({
      ...formData,
      frequency_value: parseInt(formData.frequency_value),
      hours_interval: formData.hours_interval ? parseInt(formData.hours_interval) : undefined,
      warning_days: parseInt(formData.warning_days),
    });
    onClose();
    setFormData({
      equipment_id: '',
      schedule_name: '',
      description: '',
      maintenance_type: 'preventive',
      frequency_type: 'months',
      frequency_value: '3',
      hours_interval: '',
      warning_days: '7',
      default_mechanic: '',
      is_regulatory_requirement: false,
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📅 New Maintenance Schedule</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">Equipment *</label>
            <select
              value={formData.equipment_id}
              onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
            >
              <option value="">Select equipment...</option>
              {equipment.map(e => (
                <option key={e.id} value={e.id}>{e.equipment_code} - {e.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Schedule Name *</label>
            <Input
              value={formData.schedule_name}
              onChange={(e) => setFormData({ ...formData, schedule_name: e.target.value })}
              placeholder="e.g., Oil Change Schedule"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Maintenance Type</label>
              <select
                value={formData.maintenance_type}
                onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value as MaintenanceRecordType })}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
              >
                {Object.entries(MAINTENANCE_TYPE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.icon} {config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Assign To</label>
              <Input
                value={formData.default_mechanic}
                onChange={(e) => setFormData({ ...formData, default_mechanic: e.target.value })}
                placeholder="Mechanic name"
              />
            </div>
          </div>
          
          <div className="p-4 bg-[var(--muted)]/10 rounded-lg space-y-4">
            <h4 className="font-medium">Frequency</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium">Every</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.frequency_value}
                    onChange={(e) => setFormData({ ...formData, frequency_value: e.target.value })}
                    min="1"
                    className="w-24"
                  />
                  <select
                    value={formData.frequency_type}
                    onChange={(e) => setFormData({ ...formData, frequency_type: e.target.value as ScheduleFrequencyType })}
                    className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
                  >
                    {Object.entries(SCHEDULE_FREQUENCY_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Warning (days)</label>
                <Input
                  type="number"
                  value={formData.warning_days}
                  onChange={(e) => setFormData({ ...formData, warning_days: e.target.value })}
                  min="1"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Or by Hours (optional)</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--muted)]">Every</span>
                <Input
                  type="number"
                  value={formData.hours_interval}
                  onChange={(e) => setFormData({ ...formData, hours_interval: e.target.value })}
                  placeholder="50"
                  className="w-24"
                />
                <span className="text-sm text-[var(--muted)]">operating hours</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg">
            <input
              type="checkbox"
              id="regulatory"
              checked={formData.is_regulatory_requirement}
              onChange={(e) => setFormData({ ...formData, is_regulatory_requirement: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="regulatory" className="text-sm font-medium text-blue-500">
              📜 Regulatory Requirement - Required for compliance
            </label>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.equipment_id || !formData.schedule_name}>
              Create Schedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function MaintenancePage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records' | 'work-orders' | 'schedules' | 'downtime'>('dashboard');
  const [stats, setStats] = useState<MaintenanceDashboardStats | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [downtime, setDowntime] = useState<EquipmentDowntime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [showNewRecordModal, setShowNewRecordModal] = useState(false);
  const [showNewWorkOrderModal, setShowNewWorkOrderModal] = useState(false);
  const [showNewScheduleModal, setShowNewScheduleModal] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch all data in parallel
      const [statsRes, equipmentRes, recordsRes, workOrdersRes, schedulesRes, downtimeRes] = await Promise.all([
        fetch('/api/maintenance').then(r => r.ok ? r.json() : null),
        fetch('/api/admin/equipment').then(r => r.ok ? r.json() : { equipment: [] }),
        fetch('/api/maintenance/records?limit=100').then(r => r.ok ? r.json() : { records: [] }),
        fetch('/api/maintenance/work-orders?limit=100').then(r => r.ok ? r.json() : { workOrders: [] }),
        fetch('/api/maintenance/schedules?limit=100').then(r => r.ok ? r.json() : { schedules: [] }),
        fetch('/api/maintenance/downtime?limit=50').then(r => r.ok ? r.json() : { downtime: [] }),
      ]);
      
      setStats(statsRes);
      setEquipment(equipmentRes.equipment || []);
      setMaintenanceRecords(recordsRes.records || []);
      setWorkOrders(workOrdersRes.workOrders || []);
      setSchedules(schedulesRes.schedules || []);
      setDowntime(downtimeRes.downtime || []);
    } catch (err) {
      console.error('Error fetching maintenance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create handlers
  const handleCreateRecord = async (data: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/maintenance/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error creating record:', err);
    }
  };

  const handleCreateWorkOrder = async (data: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/maintenance/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error creating work order:', err);
    }
  };

  const handleCreateSchedule = async (data: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/maintenance/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error creating schedule:', err);
    }
  };

  const handleUpdateWorkOrderStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/maintenance/work-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error updating work order:', err);
    }
  };

  // Filtered data
  const filteredRecords = useMemo(() => {
    return maintenanceRecords.filter(r => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (equipmentFilter && r.equipment_id !== equipmentFilter) return false;
      return true;
    });
  }, [maintenanceRecords, search, equipmentFilter]);

  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(wo => {
      if (search && !wo.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (equipmentFilter && wo.equipment_id !== equipmentFilter) return false;
      if (statusFilter && wo.status !== statusFilter) return false;
      return true;
    });
  }, [workOrders, search, equipmentFilter, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-[var(--muted)]">Loading maintenance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            🔧 Equipment Maintenance
          </h1>
          <p className="text-[var(--muted)] mt-1">
            Track maintenance records, work orders, schedules, and equipment availability
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowNewRecordModal(true)}>
            📝 Log Maintenance
          </Button>
          <Button variant="outline" onClick={() => setShowNewWorkOrderModal(true)}>
            🔧 New Work Order
          </Button>
          <Button onClick={() => setShowNewScheduleModal(true)}>
            📅 New Schedule
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--muted)]/10 rounded-lg w-fit">
        {[
          { key: 'dashboard', label: '📊 Dashboard' },
          { key: 'records', label: '📋 Records' },
          { key: 'work-orders', label: '🔧 Work Orders' },
          { key: 'schedules', label: '📅 Schedules' },
          { key: 'downtime', label: '⏱️ Downtime' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-[var(--primary)] text-white'
                : 'hover:bg-[var(--muted)]/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl">📦</div>
                <div className="text-2xl font-bold">{stats.total_equipment}</div>
                <div className="text-xs text-[var(--muted)]">Total Equipment</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl">✅</div>
                <div className="text-2xl font-bold text-green-500">{stats.active_equipment}</div>
                <div className="text-xs text-[var(--muted)]">Active</div>
              </CardContent>
            </Card>
            <Card className={stats.equipment_in_maintenance > 0 ? 'border-yellow-500' : ''}>
              <CardContent className="p-4 text-center">
                <div className="text-3xl">🔧</div>
                <div className={`text-2xl font-bold ${stats.equipment_in_maintenance > 0 ? 'text-yellow-500' : ''}`}>
                  {stats.equipment_in_maintenance}
                </div>
                <div className="text-xs text-[var(--muted)]">In Maintenance</div>
              </CardContent>
            </Card>
            <Card className={stats.overdue_inspections > 0 ? 'border-red-500' : ''}>
              <CardContent className="p-4 text-center">
                <div className="text-3xl">❌</div>
                <div className={`text-2xl font-bold ${stats.overdue_inspections > 0 ? 'text-red-500' : ''}`}>
                  {stats.overdue_inspections}
                </div>
                <div className="text-xs text-[var(--muted)]">Overdue Inspections</div>
              </CardContent>
            </Card>
            <Card className={stats.open_work_orders > 0 ? 'border-blue-500' : ''}>
              <CardContent className="p-4 text-center">
                <div className="text-3xl">📂</div>
                <div className="text-2xl font-bold text-blue-500">{stats.open_work_orders}</div>
                <div className="text-xs text-[var(--muted)]">Open Work Orders</div>
              </CardContent>
            </Card>
            <Card className={stats.critical_work_orders > 0 ? 'border-red-500' : ''}>
              <CardContent className="p-4 text-center">
                <div className="text-3xl">🚨</div>
                <div className={`text-2xl font-bold ${stats.critical_work_orders > 0 ? 'text-red-500' : ''}`}>
                  {stats.critical_work_orders}
                </div>
                <div className="text-xs text-[var(--muted)]">Critical</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Availability Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📈 Equipment Availability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke="var(--muted)"
                        strokeWidth="12"
                        opacity="0.2"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke={stats.average_availability >= 95 ? '#22c55e' : stats.average_availability >= 85 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${(stats.average_availability / 100) * 440} 440`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-3xl font-bold">{stats.average_availability.toFixed(1)}%</span>
                      <span className="text-xs text-[var(--muted)]">30-Day Avg</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-3 bg-[var(--muted)]/10 rounded-lg">
                    <div className="text-lg font-bold">{stats.total_downtime_hours_30_days}h</div>
                    <div className="text-xs text-[var(--muted)]">Downtime (30 days)</div>
                  </div>
                  <div className="text-center p-3 bg-[var(--muted)]/10 rounded-lg">
                    <div className="text-lg font-bold">{stats.upcoming_maintenance}</div>
                    <div className="text-xs text-[var(--muted)]">Upcoming (7 days)</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  💰 Maintenance Costs (YTD)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-green-500">
                    ${stats.total_maintenance_cost_ytd.toLocaleString()}
                  </div>
                  <div className="text-sm text-[var(--muted)]">Total Year to Date</div>
                </div>
                <div className="space-y-2 mt-4">
                  {Object.entries(stats.total_cost_by_type).slice(0, 5).map(([type, cost]) => {
                    const config = MAINTENANCE_TYPE_CONFIG[type as MaintenanceRecordType];
                    const percentage = stats.total_maintenance_cost_ytd > 0 
                      ? (cost / stats.total_maintenance_cost_ytd * 100) 
                      : 0;
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <span className="text-sm w-32 truncate">
                          {config?.icon || '📋'} {config?.label || type}
                        </span>
                        <div className="flex-1 h-2 bg-[var(--muted)]/20 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${config?.color || 'bg-gray-500'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-20 text-right">
                          ${cost.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Records */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>📋 Recent Maintenance</span>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('records')}>
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {maintenanceRecords.slice(0, 5).map(record => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-[var(--muted)]/10 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{record.title}</div>
                        <div className="text-xs text-[var(--muted)]">
                          {record.equipment?.equipment_code} • {record.maintenance_date}
                        </div>
                      </div>
                      <MaintenanceTypeBadge type={record.record_type} />
                    </div>
                  ))}
                  {maintenanceRecords.length === 0 && (
                    <div className="text-center py-8 text-[var(--muted)]">
                      <div className="text-3xl mb-2">📋</div>
                      <p>No maintenance records yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Open Work Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>🔧 Open Work Orders</span>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('work-orders')}>
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workOrders.filter(wo => !['completed', 'cancelled'].includes(wo.status)).slice(0, 5).map(wo => (
                    <div key={wo.id} className="flex items-center justify-between p-3 bg-[var(--muted)]/10 rounded-lg">
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {wo.title}
                          <PriorityBadge priority={wo.priority} />
                        </div>
                        <div className="text-xs text-[var(--muted)]">
                          {wo.work_order_number} • {wo.equipment?.equipment_code}
                        </div>
                      </div>
                      <WorkOrderStatusBadge status={wo.status} />
                    </div>
                  ))}
                  {workOrders.filter(wo => !['completed', 'cancelled'].includes(wo.status)).length === 0 && (
                    <div className="text-center py-8 text-[var(--muted)]">
                      <div className="text-3xl mb-2">✅</div>
                      <p>No open work orders</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Records Tab */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center p-4 bg-[var(--card)] rounded-lg border border-[var(--border)]">
            <Input
              type="search"
              placeholder="🔍 Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <select
              value={equipmentFilter}
              onChange={(e) => setEquipmentFilter(e.target.value)}
              className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
            >
              <option value="">All Equipment</option>
              {equipment.map(e => (
                <option key={e.id} value={e.id}>{e.equipment_code} - {e.name}</option>
              ))}
            </select>
            {(search || equipmentFilter) && (
              <button
                onClick={() => { setSearch(''); setEquipmentFilter(''); }}
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Clear filters ✕
              </button>
            )}
          </div>

          {/* Records Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--muted)]/10 border-b border-[var(--border)]">
                  <tr>
                    <th className="text-left p-4 font-medium text-sm">Date</th>
                    <th className="text-left p-4 font-medium text-sm">Equipment</th>
                    <th className="text-left p-4 font-medium text-sm">Title</th>
                    <th className="text-left p-4 font-medium text-sm">Type</th>
                    <th className="text-left p-4 font-medium text-sm">Cost</th>
                    <th className="text-left p-4 font-medium text-sm">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(record => (
                    <tr key={record.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/5">
                      <td className="p-4 text-sm">{new Date(record.maintenance_date).toLocaleDateString()}</td>
                      <td className="p-4">
                        <div className="font-mono text-sm">{record.equipment?.equipment_code}</div>
                        <div className="text-xs text-[var(--muted)]">{record.equipment?.name}</div>
                      </td>
                      <td className="p-4 text-sm">{record.title}</td>
                      <td className="p-4"><MaintenanceTypeBadge type={record.record_type} /></td>
                      <td className="p-4 text-sm">
                        {record.total_cost ? `$${record.total_cost.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-4">
                        {record.passed !== null && (
                          <span className={`text-sm font-medium ${record.passed ? 'text-green-500' : 'text-red-500'}`}>
                            {record.passed ? '✅ Passed' : '❌ Failed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-[var(--muted)]">
                        <div className="text-4xl mb-2">📋</div>
                        <p>No maintenance records found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Work Orders Tab */}
      {activeTab === 'work-orders' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center p-4 bg-[var(--card)] rounded-lg border border-[var(--border)]">
            <Input
              type="search"
              placeholder="🔍 Search work orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
            >
              <option value="">All Status</option>
              {Object.entries(WORK_ORDER_STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.icon} {config.label}</option>
              ))}
            </select>
            <select
              value={equipmentFilter}
              onChange={(e) => setEquipmentFilter(e.target.value)}
              className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
            >
              <option value="">All Equipment</option>
              {equipment.map(e => (
                <option key={e.id} value={e.id}>{e.equipment_code} - {e.name}</option>
              ))}
            </select>
          </div>

          {/* Work Orders Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--muted)]/10 border-b border-[var(--border)]">
                  <tr>
                    <th className="text-left p-4 font-medium text-sm">WO #</th>
                    <th className="text-left p-4 font-medium text-sm">Equipment</th>
                    <th className="text-left p-4 font-medium text-sm">Title</th>
                    <th className="text-left p-4 font-medium text-sm">Priority</th>
                    <th className="text-left p-4 font-medium text-sm">Status</th>
                    <th className="text-left p-4 font-medium text-sm">Due Date</th>
                    <th className="text-left p-4 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkOrders.map(wo => (
                    <tr key={wo.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/5">
                      <td className="p-4 font-mono text-sm">{wo.work_order_number}</td>
                      <td className="p-4">
                        <div className="font-mono text-sm">{wo.equipment?.equipment_code}</div>
                        <div className="text-xs text-[var(--muted)]">{wo.equipment?.name}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">{wo.title}</div>
                        {wo.safety_concern && (
                          <span className="text-xs text-red-500">⚠️ Safety Concern</span>
                        )}
                      </td>
                      <td className="p-4"><PriorityBadge priority={wo.priority} /></td>
                      <td className="p-4"><WorkOrderStatusBadge status={wo.status} /></td>
                      <td className="p-4 text-sm">
                        {wo.due_date ? new Date(wo.due_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-4">
                        {wo.status === 'open' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdateWorkOrderStatus(wo.id, 'in_progress')}
                          >
                            Start
                          </Button>
                        )}
                        {wo.status === 'in_progress' && (
                          <Button 
                            size="sm"
                            onClick={() => handleUpdateWorkOrderStatus(wo.id, 'completed')}
                          >
                            Complete
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredWorkOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-[var(--muted)]">
                        <div className="text-4xl mb-2">🔧</div>
                        <p>No work orders found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Schedules Tab */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--muted)]/10 border-b border-[var(--border)]">
                  <tr>
                    <th className="text-left p-4 font-medium text-sm">Equipment</th>
                    <th className="text-left p-4 font-medium text-sm">Schedule</th>
                    <th className="text-left p-4 font-medium text-sm">Frequency</th>
                    <th className="text-left p-4 font-medium text-sm">Next Due</th>
                    <th className="text-left p-4 font-medium text-sm">Status</th>
                    <th className="text-left p-4 font-medium text-sm">Assigned To</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map(schedule => (
                    <tr key={schedule.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/5">
                      <td className="p-4">
                        <div className="font-mono text-sm">{schedule.equipment?.equipment_code}</div>
                        <div className="text-xs text-[var(--muted)]">{schedule.equipment?.name}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium">{schedule.schedule_name}</div>
                        <div className="text-xs text-[var(--muted)]">
                          {MAINTENANCE_TYPE_CONFIG[schedule.maintenance_type]?.icon} {MAINTENANCE_TYPE_CONFIG[schedule.maintenance_type]?.label}
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        Every {schedule.frequency_value} {SCHEDULE_FREQUENCY_CONFIG[schedule.frequency_type]?.label.toLowerCase()}
                        {schedule.hours_interval && (
                          <div className="text-xs text-[var(--muted)]">or {schedule.hours_interval} hours</div>
                        )}
                      </td>
                      <td className="p-4 text-sm">
                        {schedule.next_due_date ? (
                          <>
                            {new Date(schedule.next_due_date).toLocaleDateString()}
                            {schedule.days_until_due !== undefined && (
                              <div className={`text-xs ${
                                schedule.days_until_due < 0 ? 'text-red-500' :
                                schedule.days_until_due <= 7 ? 'text-yellow-500' :
                                'text-[var(--muted)]'
                              }`}>
                                {schedule.days_until_due < 0 
                                  ? `${Math.abs(schedule.days_until_due)} days overdue`
                                  : schedule.days_until_due === 0 
                                    ? 'Due today'
                                    : `in ${schedule.days_until_due} days`}
                              </div>
                            )}
                          </>
                        ) : '-'}
                      </td>
                      <td className="p-4">
                        {schedule.maintenance_status && (
                          <ScheduleStatusBadge status={schedule.maintenance_status} />
                        )}
                        {schedule.is_regulatory_requirement && (
                          <div className="text-xs text-blue-500 mt-1">📜 Regulatory</div>
                        )}
                      </td>
                      <td className="p-4 text-sm">{schedule.default_mechanic || '-'}</td>
                    </tr>
                  ))}
                  {schedules.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-[var(--muted)]">
                        <div className="text-4xl mb-2">📅</div>
                        <p>No maintenance schedules</p>
                        <Button className="mt-4" onClick={() => setShowNewScheduleModal(true)}>
                          Create First Schedule
                        </Button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Downtime Tab */}
      {activeTab === 'downtime' && (
        <div className="space-y-4">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--muted)]/10 border-b border-[var(--border)]">
                  <tr>
                    <th className="text-left p-4 font-medium text-sm">Equipment</th>
                    <th className="text-left p-4 font-medium text-sm">Reason</th>
                    <th className="text-left p-4 font-medium text-sm">Started</th>
                    <th className="text-left p-4 font-medium text-sm">Ended</th>
                    <th className="text-left p-4 font-medium text-sm">Duration</th>
                    <th className="text-left p-4 font-medium text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {downtime.map(d => {
                    const config = DOWNTIME_REASON_CONFIG[d.downtime_reason];
                    return (
                      <tr key={d.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/5">
                        <td className="p-4">
                          <div className="font-mono text-sm">{d.equipment?.equipment_code}</div>
                          <div className="text-xs text-[var(--muted)]">{d.equipment?.name}</div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1">
                            {config?.icon} {config?.label || d.downtime_reason}
                          </span>
                          {d.reason_details && (
                            <div className="text-xs text-[var(--muted)] mt-1">{d.reason_details}</div>
                          )}
                        </td>
                        <td className="p-4 text-sm">{new Date(d.started_at).toLocaleString()}</td>
                        <td className="p-4 text-sm">
                          {d.ended_at ? new Date(d.ended_at).toLocaleString() : '-'}
                        </td>
                        <td className="p-4 text-sm">
                          {d.duration_minutes 
                            ? `${Math.floor(d.duration_minutes / 60)}h ${d.duration_minutes % 60}m`
                            : 'Ongoing'}
                        </td>
                        <td className="p-4">
                          {d.ended_at ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white bg-green-500">
                              ✅ Resolved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white bg-red-500">
                              🔴 Active
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {downtime.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-[var(--muted)]">
                        <div className="text-4xl mb-2">✅</div>
                        <p>No downtime records</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Modals */}
      <NewMaintenanceRecordModal
        isOpen={showNewRecordModal}
        onClose={() => setShowNewRecordModal(false)}
        equipment={equipment}
        onSave={handleCreateRecord}
      />
      <NewWorkOrderModal
        isOpen={showNewWorkOrderModal}
        onClose={() => setShowNewWorkOrderModal(false)}
        equipment={equipment}
        onSave={handleCreateWorkOrder}
      />
      <NewScheduleModal
        isOpen={showNewScheduleModal}
        onClose={() => setShowNewScheduleModal(false)}
        equipment={equipment}
        onSave={handleCreateSchedule}
      />
    </div>
  );
}
