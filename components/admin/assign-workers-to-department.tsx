'use client';

import { useState, useEffect, useCallback } from 'react';

interface Worker {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position?: string;
  department_id?: string;
}

interface AssignWorkersProps {
  departmentId: string;
  departmentName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignWorkersToDepartment({
  departmentId,
  departmentName,
  onClose,
  onSuccess,
}: AssignWorkersProps) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchWorkers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/employees');
      if (response.ok) {
        const data = await response.json();
        setWorkers(data.employees || []);
        
        // Pre-select workers already in this department
        const inDept = (data.employees || [])
          .filter((w: Worker) => w.department_id === departmentId)
          .map((w: Worker) => w.id);
        setSelectedIds(new Set(inDept));
      }
    } catch (error) {
      console.error('Error fetching workers:', error);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const handleToggle = (workerId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(workerId)) {
      newSelected.delete(workerId);
    } else {
      newSelected.add(workerId);
    }
    setSelectedIds(newSelected);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/departments/${departmentId}/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_ids: Array.from(selectedIds),
        }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to assign workers');
      }
    } catch (error) {
      console.error('Error assigning workers:', error);
      alert('Failed to assign workers');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-[var(--muted)]">Loading workers...</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-4">
        Assign Workers to {departmentName}
      </h3>

      <div className="max-h-96 overflow-y-auto space-y-2 mb-4">
        {workers.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No workers available</p>
        ) : (
          workers.map((worker) => (
            <label
              key={worker.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 hover:border-indigo-500/50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(worker.id)}
                onChange={() => handleToggle(worker.id)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600"
              />
              <div className="flex-1">
                <div className="font-medium">
                  {worker.first_name} {worker.last_name}
                </div>
                <div className="text-sm text-[var(--muted)]">
                  {worker.email} {worker.position && `• ${worker.position}`}
                </div>
              </div>
            </label>
          ))
        )}
      </div>

      <div className="flex gap-4 pt-4 border-t border-slate-700">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary flex-1"
        >
          {saving ? 'Saving...' : `Assign ${selectedIds.size} Worker${selectedIds.size !== 1 ? 's' : ''}`}
        </button>
        <button
          onClick={onClose}
          disabled={saving}
          className="btn border border-slate-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
