'use client';

import { useState, useEffect } from 'react';

interface Department {
  id?: string;
  name: string;
  code?: string;
  description?: string;
  parent_department_id?: string;
  superintendent_id?: string;
  manager_id?: string;
  department_type: string;
  display_order: number;
  color_code?: string;
}

interface Worker {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position?: string;
}

interface DepartmentFormProps {
  department?: Department | null;
  departments: Department[];
  workers: Worker[];
  onSave: () => void;
  onCancel: () => void;
}

export function DepartmentForm({
  department,
  departments,
  workers,
  onSave,
  onCancel,
}: DepartmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Department>({
    name: department?.name || '',
    code: department?.code || '',
    description: department?.description || '',
    parent_department_id: department?.parent_department_id || '',
    superintendent_id: department?.superintendent_id || '',
    manager_id: department?.manager_id || '',
    department_type: department?.department_type || 'division',
    display_order: department?.display_order || 0,
    color_code: department?.color_code || '',
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Department name is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const url = department?.id
        ? '/api/admin/departments'
        : '/api/admin/departments';
      const method = department?.id ? 'PATCH' : 'POST';

      const body: Partial<Department> & { id?: string } = {
        ...formData,
        parent_department_id: formData.parent_department_id || undefined,
        superintendent_id: formData.superintendent_id || undefined,
        manager_id: formData.manager_id || undefined,
        code: formData.code || undefined,
        description: formData.description || undefined,
        color_code: formData.color_code || undefined,
      };

      if (department?.id) {
        body.id = department.id;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save department');
      }

      onSave();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save department';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Filter out current department from parent options
  const parentOptions = departments.filter(d => d.id !== department?.id);

  // Filter workers who are admins/supervisors for leadership roles
  const leadershipWorkers = workers.filter(w =>
    w.position?.toLowerCase().includes('superintendent') ||
    w.position?.toLowerCase().includes('manager') ||
    w.position?.toLowerCase().includes('supervisor') ||
    w.position?.toLowerCase().includes('director')
  );

  return (
    <div>
      <h3 className="font-semibold mb-4">
        {department ? 'Edit Department' : 'Add Department'}
      </h3>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              Department Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`input ${validationErrors.name ? 'border-red-500' : ''}`}
              placeholder="Foundations Division"
              disabled={loading}
            />
            {validationErrors.name && (
              <p className="text-xs text-red-400 mt-1">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label className="label">Department Code</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="input"
              placeholder="FND"
              maxLength={10}
              disabled={loading}
            />
            <p className="text-xs text-[var(--muted)] mt-1">Short code for identification</p>
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input min-h-[80px]"
            placeholder="Brief description of the department's purpose and responsibilities"
            disabled={loading}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Department Type</label>
            <select
              value={formData.department_type}
              onChange={(e) => setFormData({ ...formData, department_type: e.target.value })}
              className="input"
              disabled={loading}
            >
              <option value="division">Division</option>
              <option value="department">Department</option>
              <option value="crew">Crew</option>
              <option value="team">Team</option>
              <option value="section">Section</option>
            </select>
          </div>

          <div>
            <label className="label">Parent Department</label>
            <select
              value={formData.parent_department_id || ''}
              onChange={(e) => setFormData({ ...formData, parent_department_id: e.target.value || undefined })}
              className="input"
              disabled={loading}
            >
              <option value="">None (Top Level)</option>
              {parentOptions.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} {dept.code && `(${dept.code})`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Superintendent</label>
            <select
              value={formData.superintendent_id || ''}
              onChange={(e) => setFormData({ ...formData, superintendent_id: e.target.value || undefined })}
              className="input"
              disabled={loading}
            >
              <option value="">None</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.first_name} {worker.last_name} {worker.position && `- ${worker.position}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Manager</label>
            <select
              value={formData.manager_id || ''}
              onChange={(e) => setFormData({ ...formData, manager_id: e.target.value || undefined })}
              className="input"
              disabled={loading}
            >
              <option value="">None</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.first_name} {worker.last_name} {worker.position && `- ${worker.position}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Display Order</label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
              className="input"
              min="0"
              disabled={loading}
            />
            <p className="text-xs text-[var(--muted)] mt-1">Lower numbers appear first</p>
          </div>

          <div>
            <label className="label">Color Code</label>
            <input
              type="color"
              value={formData.color_code || '#6366f1'}
              onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
              className="input h-10"
              disabled={loading}
            />
            <p className="text-xs text-[var(--muted)] mt-1">For org chart visualization</p>
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t border-slate-700">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex-1"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Department
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn border border-slate-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
