'use client';

import { useState, useEffect, useRef, use, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================================
// TYPES
// ============================================================================

interface Equipment {
  id: string;
  equipment_number: string;
  equipment_code: string;
  name: string;
  equipment_type: string;
  status: string;
  current_hours?: number;
  current_km?: number;
  location?: string;
  assigned_to?: string;
  purchase_date?: string;
  purchase_cost?: number;
  serial_number?: string;
  make?: string;
  model?: string;
  warranty_expiry?: string;
  certifications_required?: string[];
}

interface MaintenanceRecord {
  id: string;
  record_number: string;
  maintenance_type: string;
  maintenance_category?: string;
  actual_date: string;
  work_description: string;
  vendor_name: string | null;
  technician_name: string | null;
  cost_total: number;
  cost_labour?: number;
  cost_parts?: number;
  status: string;
  passed_inspection: boolean | null;
  odometer_hours?: number;
  next_service_date?: string;
  created_at: string;
}

interface Attachment {
  id: string;
  maintenance_record_id?: string;
  file_name: string;
  file_path: string;
  file_type: string;
  attachment_type: string;
  vendor_name: string | null;
  amount: number | null;
  attachment_date: string | null;
  uploaded_at: string;
  url?: string;
  thumbnail_url?: string;
}

interface MaintenanceSchedule {
  id: string;
  schedule_name: string;
  maintenance_type: string;
  maintenance_category?: string;
  frequency_type?: string;
  frequency_value?: number;
  frequency_unit?: string;
  next_due_date: string | null;
  next_due_hours: number | null;
  last_performed_date?: string;
  is_active: boolean;
  is_mandatory?: boolean;
  regulatory_reference?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EquipmentMaintenancePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id: equipmentId } = use(params);
  const router = useRouter();
  
  // State
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'schedule' | 'history' | 'documents'>('summary');
  
  // Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch equipment details
      const eqRes = await fetch(`/api/admin/equipment?id=${equipmentId}`);
      if (eqRes.ok) {
        const data = await eqRes.json();
        const eq = data.equipment?.find((e: Equipment) => e.id === equipmentId);
        if (eq) setEquipment(eq);
      }
      
      // Fetch maintenance records
      const recordsRes = await fetch(`/api/maintenance/records?equipment_id=${equipmentId}`);
      if (recordsRes.ok) {
        const data = await recordsRes.json();
        setMaintenanceRecords(data.records || []);
      }
      
      // Fetch attachments
      const attachmentsRes = await fetch(`/api/maintenance/upload-receipt?equipment_id=${equipmentId}`);
      if (attachmentsRes.ok) {
        const data = await attachmentsRes.json();
        setAttachments(data.attachments || []);
      }
      
      // Fetch schedules
      const schedulesRes = await fetch(`/api/maintenance/schedules?equipment_id=${equipmentId}`);
      if (schedulesRes.ok) {
        const data = await schedulesRes.json();
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [equipmentId]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Calculate summary stats
  const totalCost = maintenanceRecords.reduce((sum, r) => sum + (r.cost_total || 0), 0);
  const preventiveCount = maintenanceRecords.filter(r => r.maintenance_type === 'preventive').length;
  const correctiveCount = maintenanceRecords.filter(r => r.maintenance_type === 'corrective' || r.maintenance_type === 'repair').length;
  const avgCostPerService = maintenanceRecords.length > 0 ? totalCost / maintenanceRecords.length : 0;
  
  const upcomingMaintenance = schedules.filter(s => 
    s.next_due_date && new Date(s.next_due_date) > new Date()
  );
  const overdueMaintenance = schedules.filter(s => 
    s.next_due_date && new Date(s.next_due_date) < new Date()
  );
  
  const lastMaintenance = maintenanceRecords.length > 0 
    ? maintenanceRecords.reduce((latest, r) => 
        new Date(r.actual_date) > new Date(latest.actual_date) ? r : latest
      )
    : null;
  
  const nextMaintenance = upcomingMaintenance.length > 0
    ? upcomingMaintenance.reduce((earliest, s) =>
        new Date(s.next_due_date!) < new Date(earliest.next_due_date!) ? s : earliest
      )
    : null;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-[var(--muted)]">Loading equipment...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <button 
            onClick={() => router.back()}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-2"
          >
            ← Back to Equipment
          </button>
          <h1 className="text-2xl font-bold">
            Equipment Maintenance - {equipment?.equipment_number || equipment?.equipment_code}: {equipment?.name}
          </h1>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowMaintenanceModal(true)}>
            + New Maintenance
          </Button>
          <Button variant="outline" onClick={() => setShowUploadModal(true)}>
            📁 Upload Receipt
          </Button>
          <Button variant="outline">
            📅 Schedule
          </Button>
        </div>
      </div>
      
      {/* Equipment Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <div className="text-sm text-[var(--muted)]">Type</div>
              <div className="font-medium capitalize">{equipment?.equipment_type}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--muted)]">Status</div>
              <div className="font-medium">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                  equipment?.status === 'active' ? 'bg-green-500/10 text-green-500' :
                  equipment?.status === 'maintenance' ? 'bg-yellow-500/10 text-yellow-500' :
                  'bg-gray-500/10 text-gray-500'
                }`}>
                  {equipment?.status || 'Unknown'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-[var(--muted)]">Hours</div>
              <div className="font-medium">{equipment?.current_hours?.toLocaleString() || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--muted)]">Kilometers</div>
              <div className="font-medium">{equipment?.current_km?.toLocaleString() || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--muted)]">Location</div>
              <div className="font-medium">{equipment?.location || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--muted)]">Total Maintenance Cost</div>
              <div className="font-medium text-lg">${totalCost.toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] mb-6 overflow-x-auto">
        {[
          { id: 'summary', label: '📊 Summary', icon: '📊' },
          { id: 'schedule', label: '📅 Schedule', icon: '📅' },
          { id: 'history', label: `📄 Records (${maintenanceRecords.length})`, icon: '📄' },
          { id: 'documents', label: `📁 Receipts (${attachments.length})`, icon: '📁' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeTab === tab.id 
                ? 'text-[var(--primary)]' 
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />
            )}
          </button>
        ))}
      </div>
      
      {/* Content */}
      {activeTab === 'summary' && (
        <SummaryTab
          equipment={equipment}
          maintenanceRecords={maintenanceRecords}
          schedules={schedules}
          attachments={attachments}
          totalCost={totalCost}
          preventiveCount={preventiveCount}
          correctiveCount={correctiveCount}
          avgCostPerService={avgCostPerService}
          lastMaintenance={lastMaintenance}
          nextMaintenance={nextMaintenance}
        />
      )}
      
      {activeTab === 'schedule' && (
        <ScheduleTab 
          schedules={schedules}
          overdue={overdueMaintenance}
          upcoming={upcomingMaintenance}
          onScheduleNow={(scheduleId) => router.push(`/admin/maintenance/work-orders/new?schedule=${scheduleId}`)}
        />
      )}
      
      {activeTab === 'history' && (
        <MaintenanceHistory 
          records={maintenanceRecords}
          attachments={attachments}
          onViewDetails={(id) => router.push(`/admin/maintenance/records/${id}`)}
          onAddRecord={() => setShowMaintenanceModal(true)}
        />
      )}
      
      {activeTab === 'documents' && (
        <DocumentsGallery 
          attachments={attachments}
          onUpload={() => setShowUploadModal(true)}
        />
      )}
      
      {/* Upload Modal */}
      {showUploadModal && (
        <UploadReceiptModal
          equipmentId={equipmentId}
          equipmentName={`${equipment?.equipment_number || equipment?.equipment_code} - ${equipment?.name}`}
          maintenanceRecords={maintenanceRecords}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            fetchData();
          }}
          isUploading={isUploading}
          setIsUploading={setIsUploading}
          uploadProgress={uploadProgress}
          setUploadProgress={setUploadProgress}
          dragActive={dragActive}
          setDragActive={setDragActive}
        />
      )}
      
      {/* New Maintenance Modal */}
      {showMaintenanceModal && (
        <NewMaintenanceModal
          equipmentId={equipmentId}
          equipmentName={`${equipment?.equipment_number || equipment?.equipment_code} - ${equipment?.name}`}
          currentHours={equipment?.current_hours}
          onClose={() => setShowMaintenanceModal(false)}
          onSuccess={() => {
            setShowMaintenanceModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// SUMMARY TAB
// ============================================================================

function SummaryTab({
  equipment,
  maintenanceRecords,
  schedules,
  attachments,
  totalCost,
  preventiveCount,
  correctiveCount,
  avgCostPerService,
  lastMaintenance,
  nextMaintenance
}: {
  equipment: Equipment | null;
  maintenanceRecords: MaintenanceRecord[];
  schedules: MaintenanceSchedule[];
  attachments: Attachment[];
  totalCost: number;
  preventiveCount: number;
  correctiveCount: number;
  avgCostPerService: number;
  lastMaintenance: MaintenanceRecord | null;
  nextMaintenance: MaintenanceSchedule | null;
}) {
  const daysSinceLastMaintenance = lastMaintenance
    ? Math.ceil((Date.now() - new Date(lastMaintenance.actual_date).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  
  const daysUntilNextMaintenance = nextMaintenance?.next_due_date
    ? Math.ceil((new Date(nextMaintenance.next_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  
  return (
    <div className="space-y-6">
      {/* Equipment Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Equipment Info */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[var(--muted)]">Purchase Date:</span>
                  <p className="font-medium">
                    {equipment?.purchase_date 
                      ? new Date(equipment.purchase_date).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })
                      : '—'
                    }
                  </p>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Current Hours:</span>
                  <p className="font-medium">{equipment?.current_hours?.toLocaleString() || '—'}</p>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Last Maintenance:</span>
                  <p className="font-medium">
                    {lastMaintenance 
                      ? `${new Date(lastMaintenance.actual_date).toLocaleDateString()} (${daysSinceLastMaintenance} days ago)`
                      : '—'
                    }
                  </p>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Next Maintenance:</span>
                  <p className={`font-medium ${daysUntilNextMaintenance && daysUntilNextMaintenance < 0 ? 'text-red-500' : daysUntilNextMaintenance && daysUntilNextMaintenance < 14 ? 'text-yellow-500' : ''}`}>
                    {nextMaintenance?.next_due_date
                      ? `${new Date(nextMaintenance.next_due_date).toLocaleDateString()} (${daysUntilNextMaintenance} days)`
                      : '—'
                    }
                  </p>
                </div>
              </div>
              
              {/* Serial/Make/Model */}
              {(equipment?.serial_number || equipment?.make || equipment?.model) && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <div className="text-sm space-y-1">
                    {equipment.make && equipment.model && (
                      <p><span className="text-[var(--muted)]">Make/Model:</span> {equipment.make} {equipment.model}</p>
                    )}
                    {equipment.serial_number && (
                      <p><span className="text-[var(--muted)]">Serial:</span> {equipment.serial_number}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Right: Stats */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-[var(--muted)]">Maintenance Stats (Last 12 Months):</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[var(--muted)]/10 rounded-lg">
                  <div className="text-2xl font-bold">{maintenanceRecords.length}</div>
                  <div className="text-xs text-[var(--muted)]">Total Records</div>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">{preventiveCount}</div>
                  <div className="text-xs text-[var(--muted)]">Preventive</div>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-orange-500">{correctiveCount}</div>
                  <div className="text-xs text-[var(--muted)]">Corrective</div>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-green-500">${totalCost.toLocaleString()}</div>
                  <div className="text-xs text-[var(--muted)]">Total Cost</div>
                </div>
              </div>
              <div className="text-sm text-[var(--muted)]">
                Avg Cost/Service: ${avgCostPerService.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">{schedules.length}</div>
            <div className="text-sm text-[var(--muted)]">Active Schedules</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">{attachments.length}</div>
            <div className="text-sm text-[var(--muted)]">Documents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">
              {attachments.filter(a => a.attachment_type === 'receipt' || a.attachment_type === 'invoice').length}
            </div>
            <div className="text-sm text-[var(--muted)]">Receipts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">
              {maintenanceRecords.filter(r => r.passed_inspection === true).length}
            </div>
            <div className="text-sm text-[var(--muted)]">Passed Inspections</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Certifications Status */}
      {equipment?.certifications_required && equipment.certifications_required.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Certifications Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {equipment.certifications_required.map((cert, i) => {
                const certRecord = maintenanceRecords.find(r => 
                  r.maintenance_type === 'certification' && 
                  (r.work_description?.includes(cert) || r.maintenance_type === cert)
                );
                const isValid = certRecord && certRecord.passed_inspection;
                
                return (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[var(--muted)]/5">
                    <span>{cert}</span>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      isValid ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {isValid ? '✓ Valid' : '✗ Needs Renewal'}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// SCHEDULE TAB
// ============================================================================

function ScheduleTab({
  schedules,
  overdue,
  upcoming,
  onScheduleNow
}: {
  schedules: MaintenanceSchedule[];
  overdue: MaintenanceSchedule[];
  upcoming: MaintenanceSchedule[];
  onScheduleNow: (scheduleId: string) => void;
}) {
  const getDaysInfo = (schedule: MaintenanceSchedule) => {
    if (!schedule.next_due_date) return null;
    const diff = new Date(schedule.next_due_date).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };
  
  const getStatusIcon = (schedule: MaintenanceSchedule) => {
    const days = getDaysInfo(schedule);
    if (days === null) return '⚪';
    if (days < 0) return '🔴';
    if (days <= 7) return '🟠';
    if (days <= 30) return '🟡';
    return '✅';
  };
  
  if (schedules.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--muted)]">
        <div className="text-4xl mb-2">📅</div>
        <p>No maintenance schedules configured</p>
        <p className="text-sm">Set up recurring maintenance schedules to stay on track</p>
        <Button className="mt-4">+ Add Schedule</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {schedules.map((schedule) => {
        const days = getDaysInfo(schedule);
        const isOverdue = days !== null && days < 0;
        const isDueSoon = days !== null && days >= 0 && days <= 14;
        
        return (
          <Card 
            key={schedule.id}
            className={`${isOverdue ? 'border-red-500/50 bg-red-500/5' : isDueSoon ? 'border-yellow-500/30' : ''}`}
          >
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{getStatusIcon(schedule)}</span>
                  <div>
                    <div className="font-medium">{schedule.schedule_name}</div>
                    <div className="text-sm text-[var(--muted)] capitalize">
                      {schedule.maintenance_type}
                    </div>
                    {schedule.next_due_date && (
                      <div className="text-sm mt-1">
                        <span className="text-[var(--muted)]">Next: </span>
                        <span className={isOverdue ? 'text-red-500 font-medium' : isDueSoon ? 'text-yellow-500' : ''}>
                          {new Date(schedule.next_due_date).toLocaleDateString()}
                          {days !== null && (
                            <span> ({isOverdue ? `${Math.abs(days)} days overdue` : `${days} days`})</span>
                          )}
                        </span>
                      </div>
                    )}
                    {/* Frequency info */}
                    <div className="text-xs text-[var(--muted)] mt-1">
                      {schedule.is_mandatory && (
                        <span className="text-red-500 font-medium">MANDATORY • </span>
                      )}
                      {schedule.next_due_hours && `Every ${schedule.next_due_hours} hours`}
                    </div>
                  </div>
                </div>
                
                <Button 
                  size="sm" 
                  variant={isOverdue ? 'default' : 'outline'}
                  onClick={() => onScheduleNow(schedule.id)}
                >
                  {isOverdue ? 'Schedule Now' : 'View'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAINTENANCE HISTORY TAB
// ============================================================================

function MaintenanceHistory({ 
  records,
  attachments,
  onViewDetails,
  onAddRecord
}: { 
  records: MaintenanceRecord[];
  attachments: Attachment[];
  onViewDetails: (id: string) => void;
  onAddRecord: () => void;
}) {
  // Get attachments for each record
  const getRecordAttachments = (recordId: string) => {
    return attachments.filter(a => a.maintenance_record_id === recordId);
  };
  
  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--muted)]">
        <div className="text-4xl mb-2">🔧</div>
        <p>No maintenance records yet</p>
        <p className="text-sm">Create your first maintenance record</p>
        <Button className="mt-4" onClick={onAddRecord}>+ Add Record</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="flex justify-end mb-2">
        <Button onClick={onAddRecord}>+ Add Record</Button>
      </div>
      
      {records.map((record) => {
        const recordAttachments = getRecordAttachments(record.id);
        
        return (
          <Card key={record.id} className="hover:border-[var(--primary)]/50 transition-colors cursor-pointer" onClick={() => onViewDetails(record.id)}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-[var(--muted)]">
                      {new Date(record.actual_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      record.maintenance_type === 'preventive' ? 'bg-blue-500/10 text-blue-500' :
                      record.maintenance_type === 'corrective' ? 'bg-orange-500/10 text-orange-500' :
                      record.maintenance_type === 'inspection' ? 'bg-green-500/10 text-green-500' :
                      'bg-gray-500/10 text-gray-500'
                    }`}>
                      {record.maintenance_type}
                    </span>
                    {record.passed_inspection !== null && (
                      <span className={`text-sm ${record.passed_inspection ? 'text-green-500' : 'text-red-500'}`}>
                        {record.passed_inspection ? '✓ Passed' : '✗ Failed'}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-medium mb-1">{record.work_description}</h3>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)]">
                    {record.vendor_name && (
                      <span>Vendor: {record.vendor_name} {record.technician_name && `(${record.technician_name})`}</span>
                    )}
                  </div>
                  
                  {/* Attachments */}
                  {recordAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {recordAttachments.slice(0, 3).map(att => (
                        <span key={att.id} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-[var(--muted)]/10 rounded">
                          📄 {att.file_name.length > 20 ? att.file_name.substring(0, 20) + '...' : att.file_name}
                        </span>
                      ))}
                      {recordAttachments.length > 3 && (
                        <span className="text-xs text-[var(--muted)]">+{recordAttachments.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <div className="font-medium">${record.cost_total?.toLocaleString() || '0'}</div>
                  <Button variant="ghost" size="sm" className="mt-1">
                    View Details →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================================
// DOCUMENTS GALLERY TAB
// ============================================================================

function DocumentsGallery({ 
  attachments,
  onUpload 
}: { 
  attachments: Attachment[];
  onUpload: () => void;
}) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  if (attachments.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--muted)]">
        <div className="text-4xl mb-2">📄</div>
        <p>No documents yet</p>
        <Button onClick={onUpload} className="mt-4">
          📁 Upload First Receipt
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      {/* View toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex border border-[var(--border)] rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 text-sm ${viewMode === 'grid' ? 'bg-[var(--primary)] text-white' : ''}`}
          >
            ▦ Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-[var(--primary)] text-white' : ''}`}
          >
            ≡ List
          </button>
        </div>
      </div>
      
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {attachments.map((attachment) => (
            <Card key={attachment.id} className="overflow-hidden hover:border-[var(--primary)]/50 transition-colors cursor-pointer">
              <div className="aspect-square bg-[var(--muted)]/10 flex items-center justify-center">
                {attachment.thumbnail_url ? (
                  <img 
                    src={attachment.thumbnail_url} 
                    alt={attachment.file_name}
                    className="w-full h-full object-cover"
                  />
                ) : attachment.file_type?.includes('pdf') ? (
                  <div className="text-4xl">📄</div>
                ) : (
                  <div className="text-4xl">🧾</div>
                )}
              </div>
              <CardContent className="p-3">
                <div className="text-sm font-medium truncate">{attachment.file_name}</div>
                <div className="text-xs text-[var(--muted)]">
                  {attachment.attachment_date 
                    ? new Date(attachment.attachment_date).toLocaleDateString() 
                    : new Date(attachment.uploaded_at).toLocaleDateString()
                  }
                  {attachment.amount && ` | $${attachment.amount}`}
                </div>
                {attachment.vendor_name && (
                  <div className="text-xs text-[var(--muted)] truncate">{attachment.vendor_name}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <Card key={attachment.id} className="hover:border-[var(--primary)]/50 transition-colors cursor-pointer">
              <CardContent className="py-3 flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--muted)]/10 rounded-lg flex items-center justify-center">
                  {attachment.file_type?.includes('pdf') ? '📄' : '🧾'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{attachment.file_name}</div>
                  <div className="text-sm text-[var(--muted)]">
                    {attachment.attachment_date 
                      ? new Date(attachment.attachment_date).toLocaleDateString() 
                      : new Date(attachment.uploaded_at).toLocaleDateString()
                    }
                    {attachment.vendor_name && ` • ${attachment.vendor_name}`}
                  </div>
                </div>
                <div className="text-right">
                  {attachment.amount && (
                    <div className="font-medium">${attachment.amount.toLocaleString()}</div>
                  )}
                  <div className="text-xs text-[var(--muted)] capitalize">{attachment.attachment_type}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


// ============================================================================
// UPLOAD RECEIPT MODAL
// ============================================================================

function UploadReceiptModal({
  equipmentId,
  equipmentName,
  maintenanceRecords,
  onClose,
  onSuccess,
  isUploading,
  setIsUploading,
  uploadProgress,
  setUploadProgress,
  dragActive,
  setDragActive
}: {
  equipmentId: string;
  equipmentName: string;
  maintenanceRecords: MaintenanceRecord[];
  onClose: () => void;
  onSuccess: () => void;
  isUploading: boolean;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  uploadProgress: number;
  setUploadProgress: React.Dispatch<React.SetStateAction<number>>;
  dragActive: boolean;
  setDragActive: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [attachmentType, setAttachmentType] = useState('receipt');
  const [vendorName, setVendorName] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [linkedRecordId, setLinkedRecordId] = useState('');
  const [createMaintenanceRecord, setCreateMaintenanceRecord] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };
  
  const validateAndSetFile = (file: File) => {
    setError(null);
    
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('File type not allowed. Use JPG, PNG, WebP, or PDF');
      return;
    }
    
    setSelectedFile(file);
  };
  
  const addTag = () => {
    if (newTag && !tags.includes(newTag.toLowerCase())) {
      setTags([...tags, newTag.toLowerCase()]);
      setNewTag('');
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('equipment_id', equipmentId);
      formData.append('attachment_type', attachmentType);
      formData.append('vendor_name', vendorName);
      formData.append('amount', amount);
      formData.append('attachment_date', receiptDate);
      formData.append('description', description);
      formData.append('tags', JSON.stringify(tags));
      formData.append('uploaded_via', 'web');
      
      if (linkedRecordId) {
        formData.append('maintenance_record_id', linkedRecordId);
      }
      
      if (createMaintenanceRecord) {
        formData.append('create_maintenance_record', 'true');
        formData.append('maintenance_data', JSON.stringify({
          maintenance_type: 'corrective',
          actual_date: receiptDate,
          work_description: description || 'Maintenance performed',
          vendor_name: vendorName,
          cost_total: parseFloat(amount) || 0
        }));
      }
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev: number) => Math.min(prev + 10, 90));
      }, 200);
      
      const res = await fetch('/api/maintenance/upload-receipt', {
        method: 'POST',
        body: formData
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }
      
      setTimeout(() => {
        onSuccess();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upload Receipt/Document</CardTitle>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)]">
            ✕
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Equipment */}
          <div className="text-sm text-[var(--muted)]">
            Equipment: <span className="font-medium text-[var(--foreground)]">{equipmentName}</span>
          </div>
          
          {/* Drop zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragActive 
                ? 'border-[var(--primary)] bg-[var(--primary)]/5' 
                : selectedFile 
                  ? 'border-green-500 bg-green-500/5'
                  : 'border-[var(--border)] hover:border-[var(--primary)]/50'
            }`}
          >
            {selectedFile ? (
              <div>
                <div className="text-4xl mb-2">✅</div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-[var(--muted)]">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <p className="text-xs text-[var(--primary)] mt-2">Click to change</p>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-2">📄</div>
                <p className="font-medium">Drop PDF or image here</p>
                <p className="text-sm text-[var(--muted)]">or click to browse</p>
                <p className="text-xs text-[var(--muted)] mt-2">
                  Accepted: PDF, JPG, PNG (max 10MB)
                </p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Document Type */}
          <div>
            <label className="text-sm font-medium">Receipt/Document Type</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { value: 'receipt', label: 'Receipt/Invoice' },
                { value: 'service_report', label: 'Service Report' },
                { value: 'certification', label: 'Certification' },
                { value: 'warranty', label: 'Warranty Document' },
                { value: 'parts_list', label: 'Parts List' },
                { value: 'other', label: 'Other' }
              ].map(opt => (
                <label 
                  key={opt.value}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm ${
                    attachmentType === opt.value 
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10' 
                      : 'border-[var(--border)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="documentType"
                    value={opt.value}
                    checked={attachmentType === opt.value}
                    onChange={(e) => setAttachmentType(e.target.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          
          {/* Form fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Vendor</label>
              <Input
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Vendor name"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Amount ($)</label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1"
            />
          </div>
          
          {/* Link to maintenance record */}
          <div>
            <label className="text-sm font-medium">Link to Maintenance Record</label>
            <select
              value={linkedRecordId}
              onChange={(e) => setLinkedRecordId(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
            >
              <option value="">Select existing record...</option>
              {maintenanceRecords.map(record => (
                <option key={record.id} value={record.id}>
                  {record.record_number} - {record.work_description.substring(0, 40)}...
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="createRecord"
              checked={createMaintenanceRecord}
              onChange={(e) => setCreateMaintenanceRecord(e.target.checked)}
              disabled={!!linkedRecordId}
            />
            <label htmlFor="createRecord" className="text-sm">
              Create new maintenance record
            </label>
          </div>
          
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this document for?"
              className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg min-h-[60px]"
            />
          </div>
          
          {/* Tags */}
          <div>
            <label className="text-sm font-medium">Tags</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {tags.map(tag => (
                <span 
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full text-xs"
                >
                  {tag}
                  <button onClick={() => setTags(tags.filter(t => t !== tag))}>✕</button>
                </span>
              ))}
              <div className="flex gap-1">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  className="w-24 h-7 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button size="sm" variant="outline" onClick={addTag} className="h-7 px-2">+</Button>
              </div>
            </div>
          </div>
          
          {/* Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="h-2 bg-[var(--muted)]/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[var(--primary)] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-center text-[var(--muted)]">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}
          
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isUploading}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              className="flex-1"
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? '⏳ Uploading...' : 'Upload & Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// NEW MAINTENANCE MODAL
// ============================================================================

function NewMaintenanceModal({
  equipmentId,
  equipmentName,
  currentHours,
  onClose,
  onSuccess
}: {
  equipmentId: string;
  equipmentName: string;
  currentHours?: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [maintenanceType, setMaintenanceType] = useState('preventive');
  const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [workDescription, setWorkDescription] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [equipmentHours, setEquipmentHours] = useState(currentHours?.toString() || '');
  const [conditionAfter, setConditionAfter] = useState('good');
  const [passedInspection, setPassedInspection] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  
  const handleSubmit = async () => {
    if (!workDescription) {
      setError('Work description is required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const res = await fetch('/api/maintenance/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_id: equipmentId,
          maintenance_type: maintenanceType,
          actual_date: maintenanceDate,
          work_description: workDescription,
          vendor_name: vendorName || null,
          technician_name: technicianName || null,
          cost_labour: parseFloat(laborCost) || 0,
          cost_parts: parseFloat(partsCost) || 0,
          odometer_hours: parseFloat(equipmentHours) || null,
          condition_after_service: conditionAfter,
          passed_inspection: passedInspection,
          notes: notes || null,
          status: 'completed'
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create maintenance record');
      }
      
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create record');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>New Maintenance Record</CardTitle>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)]">
            ✕
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Equipment */}
          <div className="text-sm text-[var(--muted)]">
            Equipment: <span className="font-medium text-[var(--foreground)]">{equipmentName}</span>
          </div>
          
          {/* Maintenance Type */}
          <div>
            <label className="text-sm font-medium">Maintenance Type</label>
            <select
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
            >
              <option value="preventive">Preventive Maintenance</option>
              <option value="corrective">Corrective (Repair)</option>
              <option value="inspection">Inspection</option>
              <option value="certification">Certification</option>
              <option value="emergency">Emergency Repair</option>
            </select>
          </div>
          
          {/* Date */}
          <div>
            <label className="text-sm font-medium">Date Performed</label>
            <Input
              type="date"
              value={maintenanceDate}
              onChange={(e) => setMaintenanceDate(e.target.value)}
              className="mt-1"
            />
          </div>
          
          {/* Work Description */}
          <div>
            <label className="text-sm font-medium">Work Description *</label>
            <textarea
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="Describe the maintenance work performed..."
              className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg min-h-[80px]"
              required
            />
          </div>
          
          {/* Vendor & Technician */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Vendor</label>
              <Input
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Vendor name"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Technician</label>
              <Input
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder="Technician name"
                className="mt-1"
              />
            </div>
          </div>
          
          {/* Costs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Labour Cost ($)</label>
              <Input
                type="number"
                step="0.01"
                value={laborCost}
                onChange={(e) => setLaborCost(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Parts Cost ($)</label>
              <Input
                type="number"
                step="0.01"
                value={partsCost}
                onChange={(e) => setPartsCost(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
          </div>
          
          {/* Equipment Hours */}
          <div>
            <label className="text-sm font-medium">Equipment Hours (current reading)</label>
            <Input
              type="number"
              step="0.1"
              value={equipmentHours}
              onChange={(e) => setEquipmentHours(e.target.value)}
              placeholder="Hour meter reading"
              className="mt-1"
            />
          </div>
          
          {/* Condition & Inspection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Condition After</label>
              <select
                value={conditionAfter}
                onChange={(e) => setConditionAfter(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="out_of_service">Out of Service</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Inspection Result</label>
              <select
                value={passedInspection === null ? '' : passedInspection ? 'pass' : 'fail'}
                onChange={(e) => {
                  if (e.target.value === '') setPassedInspection(null);
                  else setPassedInspection(e.target.value === 'pass');
                }}
                className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
              >
                <option value="">N/A</option>
                <option value="pass">Passed</option>
                <option value="fail">Failed</option>
              </select>
            </div>
          </div>
          
          {/* Notes */}
          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg min-h-[60px]"
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? '⏳ Saving...' : 'Create Record'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
