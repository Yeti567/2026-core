'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================================
// TYPES
// ============================================================================

interface WorkOrder {
  id: string;
  work_order_number: string;
  equipment_id: string;
  title: string;
  description?: string;
  maintenance_type: string;
  status: string;
  priority: string;
  requested_date?: string;
  scheduled_date?: string;
  due_date?: string;
  started_at?: string;
  completed_at?: string;
  assigned_to?: string;
  estimated_labor_hours?: number;
  actual_labor_hours?: number;
  estimated_cost?: number;
  actual_cost?: number;
  problem_description?: string;
  safety_concern?: boolean;
  safety_notes?: string;
  completion_notes?: string;
  equipment?: {
    equipment_code: string;
    name: string;
    equipment_type: string;
    current_location?: string;
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WorkOrderDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params);
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Fetch work order
  useEffect(() => {
    async function fetchWorkOrder() {
      try {
        const res = await fetch(`/api/maintenance/work-orders/${id}`);
        if (res.ok) {
          const data = await res.json();
          setWorkOrder(data);
        } else {
          setError('Work order not found');
        }
      } catch (err) {
        console.error('Failed to fetch work order:', err);
        setError('Failed to load work order');
      } finally {
        setIsLoading(false);
      }
    }
    fetchWorkOrder();
  }, [id]);
  
  // Update status
  const updateStatus = async (newStatus: string, notes?: string) => {
    if (!workOrder) return;
    
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/maintenance/work-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          completion_notes: notes
        })
      });
      
      if (res.ok) {
        const updated = await res.json();
        setWorkOrder(updated);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-500/10 text-gray-500',
      open: 'bg-blue-500/10 text-blue-500',
      assigned: 'bg-indigo-500/10 text-indigo-500',
      in_progress: 'bg-yellow-500/10 text-yellow-500',
      on_hold: 'bg-orange-500/10 text-orange-500',
      completed: 'bg-green-500/10 text-green-500',
      cancelled: 'bg-red-500/10 text-red-500'
    };
    // Safe: Status comes from database enum/constrained values, not arbitrary user input
    // eslint-disable-next-line security/detect-object-injection
    return colors[status] || 'bg-gray-500/10 text-gray-500';
  };
  
  const getPriorityIcon = (priority: string) => {
    const icons: Record<string, string> = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };
    // Safe: Priority comes from database enum/constrained values, not arbitrary user input
    // eslint-disable-next-line security/detect-object-injection
    return icons[priority] || '⚪';
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-[var(--muted)]">Loading work order...</p>
        </div>
      </div>
    );
  }
  
  if (error || !workOrder) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-2">❌</div>
          <p className="text-red-500">{error || 'Work order not found'}</p>
          <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button 
            onClick={() => router.back()}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-2"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{workOrder.work_order_number}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(workOrder.status)}`}>
              {workOrder.status.replace('_', ' ')}
            </span>
            <span className="text-xl">{getPriorityIcon(workOrder.priority)}</span>
          </div>
          <p className="text-lg text-[var(--muted)]">{workOrder.title}</p>
        </div>
        
        {/* Status Actions */}
        <div className="flex gap-2">
          {workOrder.status === 'open' && (
            <Button onClick={() => updateStatus('in_progress')} disabled={isUpdating}>
              ▶ Start Work
            </Button>
          )}
          {workOrder.status === 'in_progress' && (
            <>
              <Button variant="outline" onClick={() => updateStatus('on_hold')} disabled={isUpdating}>
                ⏸ Put On Hold
              </Button>
              <Button onClick={() => updateStatus('completed')} disabled={isUpdating}>
                ✓ Complete
              </Button>
            </>
          )}
          {workOrder.status === 'on_hold' && (
            <Button onClick={() => updateStatus('in_progress')} disabled={isUpdating}>
              ▶ Resume
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Equipment */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Equipment</CardTitle>
            </CardHeader>
            <CardContent>
              {workOrder.equipment ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {workOrder.equipment.equipment_code}: {workOrder.equipment.name}
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      {workOrder.equipment.equipment_type}
                      {workOrder.equipment.current_location && ` • ${workOrder.equipment.current_location}`}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push(`/admin/equipment/${workOrder.equipment_id}/maintenance`)}
                  >
                    View Equipment →
                  </Button>
                </div>
              ) : (
                <p className="text-[var(--muted)]">Equipment details not available</p>
              )}
            </CardContent>
          </Card>
          
          {/* Description */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{workOrder.description || 'No description provided'}</p>
              
              {workOrder.problem_description && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <div className="text-sm font-medium text-[var(--muted)] mb-1">Problem Description</div>
                  <p>{workOrder.problem_description}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Safety */}
          {workOrder.safety_concern && (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-yellow-500">⚠️ Safety Concern</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{workOrder.safety_notes || 'Safety precautions required'}</p>
              </CardContent>
            </Card>
          )}
          
          {/* Completion Notes */}
          {workOrder.status === 'completed' && workOrder.completion_notes && (
            <Card className="border-green-500/50 bg-green-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-green-500">✓ Completion Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{workOrder.completion_notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-[var(--muted)]">Maintenance Type</div>
                <div className="font-medium capitalize">{workOrder.maintenance_type}</div>
              </div>
              <div>
                <div className="text-sm text-[var(--muted)]">Priority</div>
                <div className="font-medium flex items-center gap-2">
                  {getPriorityIcon(workOrder.priority)} {workOrder.priority}
                </div>
              </div>
              {workOrder.assigned_to && (
                <div>
                  <div className="text-sm text-[var(--muted)]">Assigned To</div>
                  <div className="font-medium">{workOrder.assigned_to}</div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Dates */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {workOrder.requested_date && (
                <div>
                  <div className="text-sm text-[var(--muted)]">Requested</div>
                  <div>{new Date(workOrder.requested_date).toLocaleDateString()}</div>
                </div>
              )}
              {workOrder.scheduled_date && (
                <div>
                  <div className="text-sm text-[var(--muted)]">Scheduled</div>
                  <div>{new Date(workOrder.scheduled_date).toLocaleDateString()}</div>
                </div>
              )}
              {workOrder.due_date && (
                <div>
                  <div className="text-sm text-[var(--muted)]">Due</div>
                  <div className={
                    new Date(workOrder.due_date) < new Date() && workOrder.status !== 'completed'
                      ? 'text-red-500 font-medium'
                      : ''
                  }>
                    {new Date(workOrder.due_date).toLocaleDateString()}
                  </div>
                </div>
              )}
              {workOrder.started_at && (
                <div>
                  <div className="text-sm text-[var(--muted)]">Started</div>
                  <div>{new Date(workOrder.started_at).toLocaleString()}</div>
                </div>
              )}
              {workOrder.completed_at && (
                <div>
                  <div className="text-sm text-[var(--muted)]">Completed</div>
                  <div className="text-green-500">{new Date(workOrder.completed_at).toLocaleString()}</div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Costs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Estimates & Costs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-[var(--muted)]">Est. Hours</div>
                  <div className="font-medium">{workOrder.estimated_labor_hours || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-[var(--muted)]">Actual Hours</div>
                  <div className="font-medium">{workOrder.actual_labor_hours || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-[var(--muted)]">Est. Cost</div>
                  <div className="font-medium">
                    {workOrder.estimated_cost ? `$${workOrder.estimated_cost.toLocaleString()}` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[var(--muted)]">Actual Cost</div>
                  <div className="font-medium text-green-500">
                    {workOrder.actual_cost ? `$${workOrder.actual_cost.toLocaleString()}` : '—'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
