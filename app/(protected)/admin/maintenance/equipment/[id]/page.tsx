'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MAINTENANCE_TYPE_CONFIG,
  WORK_ORDER_STATUS_CONFIG,
  WORK_ORDER_PRIORITY_CONFIG,
  DOWNTIME_REASON_CONFIG,
  type MaintenanceRecord,
  type MaintenanceWorkOrder,
  type MaintenanceSchedule,
  type EquipmentDowntime,
  type MaintenanceReceipt,
  type EquipmentMaintenanceStats,
  type EquipmentAvailabilityStats,
} from '@/lib/maintenance/types';

interface Equipment {
  id: string;
  equipment_code: string;
  name: string;
  equipment_type: string;
  category?: string;
  make?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_price?: number;
  status: string;
  current_location?: string;
  current_hours?: number;
  inspection_frequency_days: number;
  last_inspection_date?: string;
  next_inspection_date?: string;
  inspection_status: string;
  notes?: string;
}

interface TimelineEvent {
  type: 'maintenance' | 'work_order' | 'downtime';
  date: string;
  title: string;
  description?: string;
  record_type?: string;
  status?: string;
  duration?: number;
  id: string;
}

interface EquipmentMaintenanceData {
  equipment: Equipment;
  maintenanceRecords: MaintenanceRecord[];
  receipts: MaintenanceReceipt[];
  workOrders: MaintenanceWorkOrder[];
  downtime: EquipmentDowntime[];
  schedules: MaintenanceSchedule[];
  certifications: MaintenanceRecord[];
  costStats: EquipmentMaintenanceStats | null;
  availabilityStats: EquipmentAvailabilityStats | null;
  timeline: TimelineEvent[];
}

export default function EquipmentMaintenanceDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id: equipmentId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<EquipmentMaintenanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'receipts' | 'certifications'>('overview');

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/maintenance/equipment/${equipmentId}`);
        if (!res.ok) throw new Error('Failed to fetch data');
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching equipment maintenance data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [equipmentId]);

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const res = await fetch(`/api/maintenance/equipment/${equipmentId}?action=export&format=${format}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maintenance-history-${data?.equipment.equipment_code}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-[var(--muted)]">Loading equipment data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-2">❌</div>
          <p className="text-[var(--muted)]">Equipment not found</p>
          <Button className="mt-4" onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const { equipment, costStats, availabilityStats, timeline, certifications, receipts, schedules } = data;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button 
            onClick={() => router.back()}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-2"
          >
            ← Back to Maintenance
          </button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            🔧 {equipment.equipment_code}
          </h1>
          <p className="text-lg text-[var(--muted)] mt-1">
            {equipment.name} • {equipment.equipment_type}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            📥 Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('json')}>
            📥 Export JSON
          </Button>
        </div>
      </div>

      {/* Equipment Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equipment Details */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Equipment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-[var(--muted)]">Make:</span>
                <p className="font-medium">{equipment.make || '-'}</p>
              </div>
              <div>
                <span className="text-[var(--muted)]">Model:</span>
                <p className="font-medium">{equipment.model || '-'}</p>
              </div>
              <div>
                <span className="text-[var(--muted)]">Serial #:</span>
                <p className="font-mono text-xs">{equipment.serial_number || '-'}</p>
              </div>
              <div>
                <span className="text-[var(--muted)]">Status:</span>
                <p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${
                    equipment.status === 'active' ? 'bg-green-500' :
                    equipment.status === 'maintenance' ? 'bg-yellow-500' :
                    equipment.status === 'retired' ? 'bg-red-500' : 'bg-gray-500'
                  }`}>
                    {equipment.status}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-[var(--muted)]">Location:</span>
                <p className="font-medium">{equipment.current_location || '-'}</p>
              </div>
              <div>
                <span className="text-[var(--muted)]">Hours:</span>
                <p className="font-medium">{equipment.current_hours?.toLocaleString() || '-'}</p>
              </div>
              <div>
                <span className="text-[var(--muted)]">Purchase Date:</span>
                <p className="font-medium">
                  {equipment.purchase_date ? new Date(equipment.purchase_date).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <span className="text-[var(--muted)]">Purchase Price:</span>
                <p className="font-medium">
                  {equipment.purchase_price ? `$${equipment.purchase_price.toLocaleString()}` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Summary */}
        <Card>
          <CardHeader>
            <CardTitle>💰 Maintenance Costs</CardTitle>
          </CardHeader>
          <CardContent>
            {costStats ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-green-500">
                    ${costStats.total_maintenance_cost.toLocaleString()}
                  </div>
                  <div className="text-sm text-[var(--muted)]">Total Lifetime Cost</div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-[var(--muted)]/10 rounded-lg text-center">
                    <div className="font-bold">${costStats.total_labor_cost.toLocaleString()}</div>
                    <div className="text-xs text-[var(--muted)]">Labor</div>
                  </div>
                  <div className="p-3 bg-[var(--muted)]/10 rounded-lg text-center">
                    <div className="font-bold">${costStats.total_parts_cost.toLocaleString()}</div>
                    <div className="text-xs text-[var(--muted)]">Parts</div>
                  </div>
                  <div className="p-3 bg-[var(--muted)]/10 rounded-lg text-center">
                    <div className="font-bold">{costStats.maintenance_record_count}</div>
                    <div className="text-xs text-[var(--muted)]">Records</div>
                  </div>
                  <div className="p-3 bg-[var(--muted)]/10 rounded-lg text-center">
                    <div className="font-bold">${costStats.annual_maintenance_cost.toLocaleString()}</div>
                    <div className="text-xs text-[var(--muted)]">Annual Avg</div>
                  </div>
                </div>
                {costStats.cost_per_hour && (
                  <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                    <div className="text-lg font-bold text-blue-500">
                      ${costStats.cost_per_hour.toFixed(2)}/hr
                    </div>
                    <div className="text-xs text-[var(--muted)]">Cost per Operating Hour</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--muted)]">
                <p>No cost data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Availability */}
        <Card>
          <CardHeader>
            <CardTitle>📈 Availability</CardTitle>
          </CardHeader>
          <CardContent>
            {availabilityStats ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center py-4">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="var(--muted)"
                        strokeWidth="10"
                        opacity="0.2"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke={availabilityStats.availability_30_days >= 95 ? '#22c55e' : 
                               availabilityStats.availability_30_days >= 85 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={`${(availabilityStats.availability_30_days / 100) * 352} 352`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-2xl font-bold">{availabilityStats.availability_30_days.toFixed(1)}%</span>
                      <span className="text-xs text-[var(--muted)]">30-Day</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-[var(--muted)]/10 rounded-lg text-center">
                    <div className="font-bold">{availabilityStats.availability_90_days.toFixed(1)}%</div>
                    <div className="text-xs text-[var(--muted)]">90-Day Avg</div>
                  </div>
                  <div className="p-3 bg-[var(--muted)]/10 rounded-lg text-center">
                    <div className="font-bold">{availabilityStats.availability_ytd.toFixed(1)}%</div>
                    <div className="text-xs text-[var(--muted)]">YTD Avg</div>
                  </div>
                  <div className="p-3 bg-[var(--muted)]/10 rounded-lg text-center">
                    <div className="font-bold">{availabilityStats.downtime_incidents_30_days}</div>
                    <div className="text-xs text-[var(--muted)]">Incidents (30d)</div>
                  </div>
                  <div className="p-3 bg-[var(--muted)]/10 rounded-lg text-center">
                    <div className="font-bold">{availabilityStats.mtbf_days || '-'}</div>
                    <div className="text-xs text-[var(--muted)]">MTBF (days)</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--muted)]">
                <p>No availability data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--muted)]/10 rounded-lg w-fit">
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'history', label: '📋 Service History' },
          { key: 'receipts', label: '🧾 Receipts' },
          { key: 'certifications', label: '📜 Certifications' },
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

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>📅 Service Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {timeline.slice(0, 20).map((event, idx) => {
                  const typeConfig = event.record_type ? MAINTENANCE_TYPE_CONFIG[event.record_type as keyof typeof MAINTENANCE_TYPE_CONFIG] : null;
                  return (
                    <div key={idx} className="flex gap-3 p-3 bg-[var(--muted)]/10 rounded-lg">
                      <div className="text-2xl">
                        {event.type === 'maintenance' && (typeConfig?.icon || '📋')}
                        {event.type === 'work_order' && '🔧'}
                        {event.type === 'downtime' && '⏱️'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{event.title}</div>
                        <div className="text-xs text-[var(--muted)]">
                          {new Date(event.date).toLocaleDateString()}
                          {event.status && ` • ${event.status}`}
                          {event.duration && ` • ${Math.floor(event.duration / 60)}h ${event.duration % 60}m`}
                        </div>
                        {event.description && (
                          <div className="text-xs text-[var(--muted)] mt-1 line-clamp-2">
                            {event.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {timeline.length === 0 && (
                  <div className="text-center py-8 text-[var(--muted)]">
                    <p>No service history yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Scheduled Maintenance */}
          <Card>
            <CardHeader>
              <CardTitle>📅 Maintenance Schedules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {schedules.map(schedule => {
                  const config = MAINTENANCE_TYPE_CONFIG[schedule.maintenance_type];
                  return (
                    <div key={schedule.id} className="p-3 bg-[var(--muted)]/10 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{schedule.schedule_name}</div>
                        {schedule.maintenance_status && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${
                            schedule.maintenance_status === 'overdue' ? 'bg-red-500' :
                            schedule.maintenance_status === 'due_soon' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}>
                            {schedule.maintenance_status === 'overdue' ? '❌ Overdue' :
                             schedule.maintenance_status === 'due_soon' ? '⚠️ Due Soon' : '✅ Scheduled'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--muted)] mt-1">
                        {config?.icon} {config?.label} • Every {schedule.frequency_value} {schedule.frequency_type}
                      </div>
                      {schedule.next_due_date && (
                        <div className="text-xs mt-1">
                          Next: {new Date(schedule.next_due_date).toLocaleDateString()}
                          {schedule.days_until_due !== undefined && (
                            <span className={`ml-1 ${
                              schedule.days_until_due < 0 ? 'text-red-500' :
                              schedule.days_until_due <= 7 ? 'text-yellow-500' : ''
                            }`}>
                              ({schedule.days_until_due < 0 
                                ? `${Math.abs(schedule.days_until_due)} days overdue`
                                : `in ${schedule.days_until_due} days`})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {schedules.length === 0 && (
                  <div className="text-center py-8 text-[var(--muted)]">
                    <p>No maintenance schedules</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'history' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--muted)]/10 border-b border-[var(--border)]">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">Date</th>
                  <th className="text-left p-4 font-medium text-sm">Type</th>
                  <th className="text-left p-4 font-medium text-sm">Title</th>
                  <th className="text-left p-4 font-medium text-sm">Performed By</th>
                  <th className="text-left p-4 font-medium text-sm">Cost</th>
                  <th className="text-left p-4 font-medium text-sm">Result</th>
                </tr>
              </thead>
              <tbody>
                {data.maintenanceRecords.map(record => {
                  const config = MAINTENANCE_TYPE_CONFIG[record.record_type];
                  return (
                    <tr key={record.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/5">
                      <td className="p-4 text-sm">{new Date(record.maintenance_date).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${config?.color || 'bg-gray-500'}`}>
                          {config?.icon} {config?.label || record.record_type}
                        </span>
                      </td>
                      <td className="p-4 text-sm">{record.title}</td>
                      <td className="p-4 text-sm">{record.performed_by || '-'}</td>
                      <td className="p-4 text-sm">
                        {record.total_cost ? `$${record.total_cost.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-4">
                        {record.passed !== null && record.passed !== undefined && (
                          <span className={`text-sm font-medium ${record.passed ? 'text-green-500' : 'text-red-500'}`}>
                            {record.passed ? '✅ Passed' : '❌ Failed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {data.maintenanceRecords.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-[var(--muted)]">
                      <div className="text-4xl mb-2">📋</div>
                      <p>No maintenance history</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'receipts' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--muted)]/10 border-b border-[var(--border)]">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">Date</th>
                  <th className="text-left p-4 font-medium text-sm">Vendor</th>
                  <th className="text-left p-4 font-medium text-sm">Receipt #</th>
                  <th className="text-left p-4 font-medium text-sm">Category</th>
                  <th className="text-left p-4 font-medium text-sm">Amount</th>
                  <th className="text-left p-4 font-medium text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(receipt => (
                  <tr key={receipt.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/5">
                    <td className="p-4 text-sm">
                      {receipt.receipt_date ? new Date(receipt.receipt_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4 text-sm">{receipt.vendor_name || '-'}</td>
                    <td className="p-4 font-mono text-sm">{receipt.receipt_number || '-'}</td>
                    <td className="p-4 text-sm">{receipt.expense_category || '-'}</td>
                    <td className="p-4 text-sm font-medium">
                      {receipt.total_amount ? `$${receipt.total_amount.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${
                        receipt.approved ? 'bg-green-500' : 'bg-yellow-500'
                      }`}>
                        {receipt.approved ? '✅ Approved' : '⏳ Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
                {receipts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-[var(--muted)]">
                      <div className="text-4xl mb-2">🧾</div>
                      <p>No receipts</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'certifications' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--muted)]/10 border-b border-[var(--border)]">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">Date</th>
                  <th className="text-left p-4 font-medium text-sm">Type</th>
                  <th className="text-left p-4 font-medium text-sm">Certificate #</th>
                  <th className="text-left p-4 font-medium text-sm">Certifying Body</th>
                  <th className="text-left p-4 font-medium text-sm">Expiry</th>
                  <th className="text-left p-4 font-medium text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {certifications.map(cert => {
                  const isExpired = cert.certification_expiry && new Date(cert.certification_expiry) < new Date();
                  const isExpiringSoon = cert.certification_expiry && !isExpired && 
                    new Date(cert.certification_expiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  
                  return (
                    <tr key={cert.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/5">
                      <td className="p-4 text-sm">{new Date(cert.maintenance_date).toLocaleDateString()}</td>
                      <td className="p-4 text-sm">{cert.certification_type || cert.title}</td>
                      <td className="p-4 font-mono text-sm">{cert.certificate_number || '-'}</td>
                      <td className="p-4 text-sm">{cert.certifying_body || '-'}</td>
                      <td className="p-4 text-sm">
                        {cert.certification_expiry ? new Date(cert.certification_expiry).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${
                          isExpired ? 'bg-red-500' :
                          isExpiringSoon ? 'bg-yellow-500' : 'bg-green-500'
                        }`}>
                          {isExpired ? '❌ Expired' :
                           isExpiringSoon ? '⚠️ Expiring Soon' : '✅ Valid'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {certifications.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-[var(--muted)]">
                      <div className="text-4xl mb-2">📜</div>
                      <p>No certifications</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
