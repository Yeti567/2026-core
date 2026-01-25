'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================================
// TYPES
// ============================================================================

interface DowntimeRecord {
  id: string;
  equipment_id: string;
  equipment?: {
    equipment_code: string;
    name: string;
  };
  work_order_id?: string;
  maintenance_record_id?: string;
  downtime_start: string;
  downtime_end?: string;
  downtime_duration_hours?: number;
  reason: string;
  description?: string;
  impact_level?: string;
  resolved: boolean;
  created_at: string;
}

interface DowntimeTrackerProps {
  equipmentId: string;
  equipmentName: string;
  currentStatus?: string;
  onStatusChange?: (newStatus: string) => void;
}

// ============================================================================
// DOWNTIME TRACKER COMPONENT
// ============================================================================

export function DowntimeTracker({
  equipmentId,
  equipmentName,
  currentStatus,
  onStatusChange
}: DowntimeTrackerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [activeDowntime, setActiveDowntime] = useState<DowntimeRecord | null>(null);
  const [recentDowntime, setRecentDowntime] = useState<DowntimeRecord[]>([]);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  
  const fetchDowntime = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/maintenance/downtime?equipment_id=${equipmentId}`);
      if (res.ok) {
        const data = await res.json();
        const records = data.downtime || [];
        
        // Find active (unresolved) downtime
        const active = records.find((d: DowntimeRecord) => !d.downtime_end && !d.resolved);
        setActiveDowntime(active || null);
        
        // Recent resolved downtime (last 10)
        setRecentDowntime(records.filter((d: DowntimeRecord) => d.resolved || d.downtime_end).slice(0, 10));
      }
    } catch (err) {
      console.error('Failed to fetch downtime:', err);
    } finally {
      setIsLoading(false);
    }
  }, [equipmentId]);
  
  // Fetch downtime records
  useEffect(() => {
    fetchDowntime();
  }, [fetchDowntime]);
  
  // Calculate stats
  const last30DaysDowntime = recentDowntime
    .filter(d => {
      const start = new Date(d.downtime_start);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return start >= thirtyDaysAgo;
    })
    .reduce((sum, d) => sum + (d.downtime_duration_hours || 0), 0);
  
  const totalHoursIn30Days = 30 * 24;
  const availability30Days = ((totalHoursIn30Days - last30DaysDowntime) / totalHoursIn30Days) * 100;
  
  // Format duration
  const formatDuration = (hours?: number) => {
    if (!hours) return '—';
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${hours.toFixed(1)} hrs`;
    return `${(hours / 24).toFixed(1)} days`;
  };
  
  // Calculate live duration for active downtime
  const getActiveDuration = () => {
    if (!activeDowntime) return 0;
    const start = new Date(activeDowntime.downtime_start);
    const now = new Date();
    return (now.getTime() - start.getTime()) / (1000 * 60 * 60);
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-[var(--muted)]">
          <div className="animate-spin text-2xl">⏳</div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Current Status */}
      <Card className={activeDowntime ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-2xl ${activeDowntime ? 'animate-pulse' : ''}`}>
                  {activeDowntime ? '🔴' : '🟢'}
                </span>
                <span className="text-lg font-bold">
                  {activeDowntime ? 'Out of Service' : 'Operational'}
                </span>
              </div>
              
              {activeDowntime && (
                <div className="mt-2 text-sm text-[var(--muted)]">
                  <div>Started: {new Date(activeDowntime.downtime_start).toLocaleString()}</div>
                  <div>Duration: {formatDuration(getActiveDuration())}</div>
                  <div>Reason: {activeDowntime.reason}</div>
                </div>
              )}
            </div>
            
            <div>
              {activeDowntime ? (
                <Button onClick={() => setShowEndModal(true)}>
                  ✓ Mark as Resolved
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setShowStartModal(true)}>
                  🔴 Record Downtime
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{formatDuration(last30DaysDowntime)}</div>
            <div className="text-sm text-[var(--muted)]">Downtime (30 days)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className={`text-2xl font-bold ${availability30Days >= 95 ? 'text-green-500' : availability30Days >= 90 ? 'text-yellow-500' : 'text-red-500'}`}>
              {availability30Days.toFixed(1)}%
            </div>
            <div className="text-sm text-[var(--muted)]">Availability (30 days)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{recentDowntime.length}</div>
            <div className="text-sm text-[var(--muted)]">Incidents (30 days)</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent History */}
      {recentDowntime.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Downtime History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentDowntime.map((record) => (
                <div 
                  key={record.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--muted)]/10"
                >
                  <div>
                    <div className="font-medium">{record.reason}</div>
                    <div className="text-sm text-[var(--muted)]">
                      {new Date(record.downtime_start).toLocaleString()}
                      {record.downtime_end && ` → ${new Date(record.downtime_end).toLocaleString()}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatDuration(record.downtime_duration_hours)}</div>
                    <div className="text-xs text-[var(--muted)] capitalize">{record.impact_level || 'normal'}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Start Downtime Modal */}
      {showStartModal && (
        <StartDowntimeModal
          equipmentId={equipmentId}
          equipmentName={equipmentName}
          onClose={() => setShowStartModal(false)}
          onSuccess={() => {
            setShowStartModal(false);
            fetchDowntime();
            onStatusChange?.('out_of_service');
          }}
        />
      )}
      
      {/* End Downtime Modal */}
      {showEndModal && activeDowntime && (
        <EndDowntimeModal
          downtime={activeDowntime}
          onClose={() => setShowEndModal(false)}
          onSuccess={() => {
            setShowEndModal(false);
            fetchDowntime();
            onStatusChange?.('active');
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// START DOWNTIME MODAL
// ============================================================================

function StartDowntimeModal({
  equipmentId,
  equipmentName,
  onClose,
  onSuccess
}: {
  equipmentId: string;
  equipmentName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [reason, setReason] = useState('breakdown');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [impactLevel, setImpactLevel] = useState('normal');
  const [createWorkOrder, setCreateWorkOrder] = useState(false);
  
  const handleSubmit = async () => {
    if (!reason) {
      setError('Reason is required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const res = await fetch('/api/maintenance/downtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_id: equipmentId,
          downtime_start: new Date(startTime).toISOString(),
          reason,
          description,
          impact_level: impactLevel,
          create_work_order: createWorkOrder
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record downtime');
      }
      
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record downtime');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>🔴 Record Downtime</CardTitle>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)]">✕</button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-[var(--muted)]/10 rounded-lg">
            <div className="text-sm text-[var(--muted)]">Equipment</div>
            <div className="font-medium">{equipmentName}</div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Reason *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
            >
              <option value="breakdown">Breakdown</option>
              <option value="scheduled_maintenance">Scheduled Maintenance</option>
              <option value="parts_unavailable">Parts Unavailable</option>
              <option value="awaiting_inspection">Awaiting Inspection</option>
              <option value="safety_concern">Safety Concern</option>
              <option value="operator_unavailable">Operator Unavailable</option>
              <option value="weather">Weather</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Start Time</label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Impact Level</label>
            <select
              value={impactLevel}
              onChange={(e) => setImpactLevel(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
            >
              <option value="low">Low - Minimal impact</option>
              <option value="normal">Normal</option>
              <option value="high">High - Significant delays</option>
              <option value="critical">Critical - Work stoppage</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue..."
              className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg min-h-[80px]"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="createWO"
              checked={createWorkOrder}
              onChange={(e) => setCreateWorkOrder(e.target.checked)}
            />
            <label htmlFor="createWO" className="text-sm">Create work order for this issue</label>
          </div>
          
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}
          
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? '⏳ Recording...' : 'Record Downtime'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// END DOWNTIME MODAL
// ============================================================================

function EndDowntimeModal({
  downtime,
  onClose,
  onSuccess
}: {
  downtime: DowntimeRecord;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [endTime, setEndTime] = useState(new Date().toISOString().slice(0, 16));
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [createMaintenanceRecord, setCreateMaintenanceRecord] = useState(false);
  
  // Calculate duration
  const startDate = new Date(downtime.downtime_start);
  const endDate = new Date(endTime);
  const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const res = await fetch('/api/maintenance/downtime', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: downtime.id,
          downtime_end: new Date(endTime).toISOString(),
          resolution_notes: resolutionNotes,
          resolved: true,
          create_maintenance_record: createMaintenanceRecord
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to end downtime');
      }
      
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end downtime');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>✓ Resolve Downtime</CardTitle>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)]">✕</button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Downtime Summary */}
          <div className="p-3 bg-[var(--muted)]/10 rounded-lg space-y-1">
            <div className="text-sm">
              <span className="text-[var(--muted)]">Started:</span>{' '}
              {startDate.toLocaleString()}
            </div>
            <div className="text-sm">
              <span className="text-[var(--muted)]">Reason:</span>{' '}
              {downtime.reason}
            </div>
            {downtime.description && (
              <div className="text-sm">
                <span className="text-[var(--muted)]">Description:</span>{' '}
                {downtime.description}
              </div>
            )}
          </div>
          
          <div>
            <label className="text-sm font-medium">End Time</label>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1"
            />
          </div>
          
          {/* Duration display */}
          <div className="p-3 bg-green-500/10 rounded-lg">
            <div className="text-sm text-[var(--muted)]">Total Downtime Duration</div>
            <div className="text-xl font-bold text-green-500">
              {durationHours < 1 
                ? `${Math.round(durationHours * 60)} minutes`
                : `${durationHours.toFixed(1)} hours`
              }
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Resolution Notes</label>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="What was done to resolve the issue?"
              className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg min-h-[80px]"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="createMR"
              checked={createMaintenanceRecord}
              onChange={(e) => setCreateMaintenanceRecord(e.target.checked)}
            />
            <label htmlFor="createMR" className="text-sm">Create maintenance record for this repair</label>
          </div>
          
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}
          
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? '⏳ Saving...' : 'Mark Resolved'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
