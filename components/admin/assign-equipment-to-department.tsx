'use client';

import { useState, useEffect, useCallback } from 'react';

interface Equipment {
  id: string;
  equipment_number: string;
  equipment_type: string;
  name?: string;
  make?: string;
  model?: string;
  status: string;
  department_id?: string;
}

interface AssignEquipmentProps {
  departmentId: string;
  departmentName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignEquipmentToDepartment({
  departmentId,
  departmentName,
  onClose,
  onSuccess,
}: AssignEquipmentProps) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchEquipment = useCallback(async () => {
    try {
      // Fetch all equipment (we'll need to create this endpoint or use existing one)
      const response = await fetch('/api/admin/equipment');
      if (response.ok) {
        const data = await response.json();
        setEquipment(data.equipment || []);
        
        // Pre-select equipment already in this department
        const inDept = (data.equipment || [])
          .filter((e: Equipment) => e.department_id === departmentId)
          .map((e: Equipment) => e.id);
        setSelectedIds(new Set(inDept));
      } else {
        // If endpoint doesn't exist, try alternative
        console.log('Equipment endpoint not found, will need to create it');
      }
    } catch (error) {
      console.error('Error fetching equipment:', error);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const handleToggle = (equipmentId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(equipmentId)) {
      newSelected.delete(equipmentId);
    } else {
      newSelected.add(equipmentId);
    }
    setSelectedIds(newSelected);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/departments/${departmentId}/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_ids: Array.from(selectedIds),
        }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to assign equipment');
      }
    } catch (error) {
      console.error('Error assigning equipment:', error);
      alert('Failed to assign equipment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-[var(--muted)]">Loading equipment...</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-4">
        Assign Equipment to {departmentName}
      </h3>

      <div className="max-h-96 overflow-y-auto space-y-2 mb-4">
        {equipment.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No equipment available. Equipment will appear here once added to the system.
          </p>
        ) : (
          equipment.map((eq) => (
            <label
              key={eq.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 hover:border-indigo-500/50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(eq.id)}
                onChange={() => handleToggle(eq.id)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600"
              />
              <div className="flex-1">
                <div className="font-medium">
                  {eq.equipment_number} - {eq.equipment_type}
                </div>
                <div className="text-sm text-[var(--muted)]">
                  {eq.name && `${eq.name} `}
                  {eq.make && eq.model && `${eq.make} ${eq.model}`}
                  {eq.status && ` • ${eq.status}`}
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
          {saving ? 'Saving...' : `Assign ${selectedIds.size} Equipment`}
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
