'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================================
// TYPES
// ============================================================================

interface Equipment {
  id: string;
  equipment_code: string;
  equipment_number?: string;
  name: string;
  equipment_type: string;
  current_hours?: number;
  current_location?: string;
}

interface MaintenanceSchedule {
  id: string;
  equipment_id: string;
  schedule_name: string;
  maintenance_type: string;
  frequency_type?: string;
  frequency_value?: number;
  frequency_unit?: string;
  next_due_date?: string;
  work_description?: string;
  estimated_duration_hours?: number;
  estimated_cost?: number;
  is_mandatory?: boolean;
  regulatory_reference?: string;
}

interface Worker {
  id: string;
  name: string;
  role: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function NewWorkOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scheduleId = searchParams.get('schedule');
  const equipmentIdParam = searchParams.get('equipment');
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [schedule, setSchedule] = useState<MaintenanceSchedule | null>(null);
  
  // Form
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(equipmentIdParam || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maintenanceType, setMaintenanceType] = useState('preventive');
  const [priority, setPriority] = useState('medium');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [safetyConcern, setSafetyConcern] = useState(false);
  const [safetyNotes, setSafetyNotes] = useState('');
  
  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch equipment
        const eqRes = await fetch('/api/admin/equipment');
        if (eqRes.ok) {
          const data = await eqRes.json();
          setEquipment(data.equipment || []);
        }
        
        // Fetch workers (for assignment)
        const workersRes = await fetch('/api/admin/workers');
        if (workersRes.ok) {
          const data = await workersRes.json();
          setWorkers(data.workers || []);
        }
        
        // If schedule ID provided, fetch schedule details
        if (scheduleId) {
          const schedRes = await fetch(`/api/maintenance/schedules?id=${scheduleId}`);
          if (schedRes.ok) {
            const data = await schedRes.json();
            const sched = data.schedules?.[0] || data.schedule;
            if (sched) {
              setSchedule(sched);
              setSelectedEquipmentId(sched.equipment_id);
              setTitle(sched.schedule_name);
              setDescription(sched.work_description || '');
              setMaintenanceType(sched.maintenance_type || 'preventive');
              if (sched.next_due_date) {
                setDueDate(sched.next_due_date);
              }
              if (sched.estimated_duration_hours) {
                setEstimatedHours(sched.estimated_duration_hours.toString());
              }
              if (sched.estimated_cost) {
                setEstimatedCost(sched.estimated_cost.toString());
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [scheduleId]);
  
  // Get selected equipment details
  const selectedEquipment = equipment.find(e => e.id === selectedEquipmentId);
  
  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEquipmentId || !title) {
      setError('Equipment and title are required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const res = await fetch('/api/maintenance/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_id: selectedEquipmentId,
          title,
          description,
          maintenance_type: maintenanceType,
          priority,
          scheduled_date: scheduledDate || null,
          due_date: dueDate || null,
          schedule_id: scheduleId || null,
          assigned_to: assignedTo || null,
          estimated_labor_hours: estimatedHours ? parseFloat(estimatedHours) : null,
          estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
          problem_description: problemDescription || null,
          safety_concern: safetyConcern,
          safety_notes: safetyConcern ? safetyNotes : null
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create work order');
      }
      
      const workOrder = await res.json();
      
      // Redirect to work order or dashboard
      router.push(`/admin/maintenance/work-orders/${workOrder.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create work order');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-[var(--muted)]">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      {/* Header */}
      <div className="mb-6">
        <button 
          onClick={() => router.back()}
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-2"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold">🔧 Create Work Order</h1>
        {schedule && (
          <p className="text-[var(--muted)]">
            From schedule: {schedule.schedule_name}
            {schedule.is_mandatory && <span className="text-red-500 ml-2">(MANDATORY)</span>}
          </p>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Work Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Equipment Selection */}
            <div>
              <label className="text-sm font-medium">Equipment *</label>
              <select
                value={selectedEquipmentId}
                onChange={(e) => setSelectedEquipmentId(e.target.value)}
                required
                className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
              >
                <option value="">Select equipment...</option>
                {equipment.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.equipment_code || eq.equipment_number} - {eq.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Equipment Info */}
            {selectedEquipment && (
              <div className="p-3 bg-[var(--muted)]/10 rounded-lg text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-[var(--muted)]">Type:</span> {selectedEquipment.equipment_type}</div>
                  <div><span className="text-[var(--muted)]">Hours:</span> {selectedEquipment.current_hours || '—'}</div>
                  <div><span className="text-[var(--muted)]">Location:</span> {selectedEquipment.current_location || '—'}</div>
                </div>
              </div>
            )}
            
            {/* Title */}
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Work order title"
                required
                className="mt-1"
              />
            </div>
            
            {/* Type & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Maintenance Type</label>
                <select
                  value={maintenanceType}
                  onChange={(e) => setMaintenanceType(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
                >
                  <option value="preventive">Preventive</option>
                  <option value="corrective">Corrective</option>
                  <option value="inspection">Inspection</option>
                  <option value="certification">Certification</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="critical">🔴 Critical</option>
                </select>
              </div>
            </div>
            
            {/* Description */}
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the work to be performed..."
                className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg min-h-[80px]"
              />
            </div>
            
            {/* Problem Description */}
            <div>
              <label className="text-sm font-medium">Problem Description (if applicable)</label>
              <textarea
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="Describe the issue or reason for this work order..."
                className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg min-h-[60px]"
              />
            </div>
            
            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Scheduled Date</label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            
            {/* Assignment */}
            <div>
              <label className="text-sm font-medium">Assign To</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
              >
                <option value="">Unassigned</option>
                {workers.map(worker => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name} ({worker.role})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Estimates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Estimated Hours</label>
                <Input
                  type="number"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Estimated Cost ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
            </div>
            
            {/* Safety */}
            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={safetyConcern}
                  onChange={(e) => setSafetyConcern(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="font-medium">⚠️ Safety Concern</span>
              </label>
              
              {safetyConcern && (
                <div className="mt-3">
                  <label className="text-sm font-medium">Safety Notes</label>
                  <textarea
                    value={safetyNotes}
                    onChange={(e) => setSafetyNotes(e.target.value)}
                    placeholder="Describe safety concerns or precautions..."
                    className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg min-h-[60px]"
                  />
                </div>
              )}
            </div>
            
            {/* Regulatory Reference */}
            {schedule?.regulatory_reference && (
              <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                <div className="text-sm font-medium text-red-500 mb-1">Regulatory Requirement</div>
                <div className="text-sm">{schedule.regulatory_reference}</div>
              </div>
            )}
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
                {error}
              </div>
            )}
            
            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? '⏳ Creating...' : 'Create Work Order'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

export default function NewWorkOrderPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-[var(--muted)]">Loading...</p>
        </div>
      </div>
    }>
      <NewWorkOrderContent />
    </Suspense>
  );
}
