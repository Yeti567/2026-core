'use client';

import { useState, useEffect, useCallback } from 'react';
import { DepartmentForm } from './department-form';
import { OrgChart } from './org-chart';

interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
  parent_department_id?: string;
  superintendent_id?: string;
  manager_id?: string;
  department_type: string;
  display_order: number;
  color_code?: string;
  worker_count: number;
  equipment_count: number;
  superintendent?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    position: string;
  };
  manager?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    position: string;
  };
  parent_department?: {
    id: string;
    name: string;
    code?: string;
  };
}

interface Worker {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position?: string;
  phone?: string;
  department_id?: string;
}

export function DepartmentsManager() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [settingUp, setSettingUp] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuickSetup = async () => {
    if (!confirm('This will create all 6 departments for Maple Ridge Concrete Ltd. Continue?')) {
      return;
    }

    setSettingUp(true);
    const departments = [
      {name:'Foundations Division',code:'FND',description:'Specializes in foundation work including excavation, formwork, and concrete placement',department_type:'division',display_order:1,color_code:'#3b82f6'},
      {name:'Flatwork Division',code:'FLT',description:'Handles flatwork projects including driveways, sidewalks, and patios',department_type:'division',display_order:2,color_code:'#10b981'},
      {name:'Structural Division',code:'STR',description:'Focuses on structural concrete work including beams, columns, and slabs',department_type:'division',display_order:3,color_code:'#f59e0b'},
      {name:'Decorative Finishes',code:'DEC',description:'Specialized decorative concrete finishes and architectural elements',department_type:'crew',display_order:4,color_code:'#8b5cf6'},
      {name:'Equipment & Fleet Management',code:'EQP',description:'Manages all company equipment, vehicles, and maintenance',department_type:'department',display_order:5,color_code:'#ef4444'},
      {name:'Administration',code:'ADM',description:'Administrative support, HR, training records, and document control',department_type:'department',display_order:6,color_code:'#6366f1'}
    ];

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const dept of departments) {
      try {
        const response = await fetch('/api/admin/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dept),
        });

        const data = await response.json();
        if (response.ok) {
          created++;
        } else if (data.error?.includes('already exists') || data.error?.includes('unique')) {
          skipped++;
        } else {
          failed++;
          console.error(`Failed to create ${dept.name}:`, data.error);
        }
      } catch (error: any) {
        failed++;
        console.error(`Error creating ${dept.name}:`, error);
      }
    }

    setSettingUp(false);
    alert(`Setup complete!\n✅ Created: ${created}\n⚠️ Already existed: ${skipped}\n❌ Failed: ${failed}\n\nRefresh the page to see departments.`);
    fetchData();
  };

  const fetchData = async () => {
    try {
      // Fetch departments
      const deptRes = await fetch('/api/admin/departments');
      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(deptData.departments || []);
      }

      // Fetch workers for assignment
      const workersRes = await fetch('/api/admin/employees');
      if (workersRes.ok) {
        const workersData = await workersRes.json();
        setWorkers(workersData.employees || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    setShowAddForm(false);
    setEditingDept(null);
    fetchData();
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department? Workers and equipment will be unassigned.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/departments?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
      } else {
        alert('Failed to delete department');
      }
    } catch (error) {
      console.error('Error deleting department:', error);
      alert('Failed to delete department');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-[var(--muted)]">Loading departments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Departments & Organization</h2>
          <p className="text-sm text-[var(--muted)]">
            Organize your company into departments, assign workers and equipment
          </p>
        </div>
        <div className="flex gap-2">
          {departments.length === 0 && (
            <button
              onClick={handleQuickSetup}
              disabled={settingUp}
              className="btn bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {settingUp ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Quick Setup (Create All 6 Departments)
                </>
              )}
            </button>
          )}
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'chart' : 'list')}
            className="btn border border-slate-700"
          >
            {viewMode === 'list' ? (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                View Org Chart
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                View List
              </>
            )}
          </button>
          <button
            onClick={() => {
              setEditingDept(null);
              setShowAddForm(true);
            }}
            className="btn btn-primary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Department
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="card">
          <DepartmentForm
            department={editingDept}
            departments={departments}
            workers={workers}
            onSave={handleSave}
            onCancel={() => {
              setShowAddForm(false);
              setEditingDept(null);
            }}
          />
        </div>
      )}

      {/* View Mode */}
      {viewMode === 'list' ? (
        <div className="grid md:grid-cols-2 gap-4">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="card cursor-pointer hover:border-indigo-500/50 transition-colors"
              onClick={() => setSelectedDept(selectedDept === dept.id ? null : dept.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{dept.name}</h3>
                    {dept.code && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-400">
                        {dept.code}
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 capitalize">
                      {dept.department_type}
                    </span>
                  </div>
                  {dept.description && (
                    <p className="text-sm text-[var(--muted)] mb-2">{dept.description}</p>
                  )}
                  {dept.parent_department && (
                    <p className="text-xs text-[var(--muted)] mb-2">
                      Parent: {dept.parent_department.name}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(dept);
                    }}
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(dept.id);
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-2xl font-bold text-indigo-400">{dept.worker_count}</div>
                  <div className="text-xs text-[var(--muted)]">Workers</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-400">{dept.equipment_count}</div>
                  <div className="text-xs text-[var(--muted)]">Equipment</div>
                </div>
              </div>

              {/* Leadership */}
              {(dept.superintendent || dept.manager) && (
                <div className="pt-3 border-t border-slate-700 space-y-2">
                  {dept.superintendent && (
                    <div className="text-sm">
                      <span className="text-[var(--muted)]">Superintendent: </span>
                      <span className="font-medium">
                        {dept.superintendent.first_name} {dept.superintendent.last_name}
                      </span>
                    </div>
                  )}
                  {dept.manager && (
                    <div className="text-sm">
                      <span className="text-[var(--muted)]">Manager: </span>
                      <span className="font-medium">
                        {dept.manager.first_name} {dept.manager.last_name}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Expanded Details */}
              {selectedDept === dept.id && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <DepartmentDetails departmentId={dept.id} />
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Open assign workers modal
                        alert('Assign workers functionality - coming soon');
                      }}
                      className="btn btn-secondary text-sm flex-1"
                    >
                      Assign Workers
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Open assign equipment modal
                        alert('Assign equipment functionality - coming soon');
                      }}
                      className="btn btn-secondary text-sm flex-1"
                    >
                      Assign Equipment
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <OrgChart departments={departments} />
        </div>
      )}

      {departments.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-[var(--muted)] mb-4">No departments created yet.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            Create Your First Department
          </button>
        </div>
      )}
    </div>
  );
}

function DepartmentDetails({ departmentId }: { departmentId: string }) {
  const [workers, setWorkers] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(async () => {
    try {
      const [workersRes, equipmentRes] = await Promise.all([
        fetch(`/api/admin/departments/${departmentId}/workers`),
        fetch(`/api/admin/departments/${departmentId}/equipment`),
      ]);

      if (workersRes.ok) {
        const data = await workersRes.json();
        setWorkers(data.workers || []);
      }

      if (equipmentRes.ok) {
        const data = await equipmentRes.json();
        setEquipment(data.equipment || []);
      }
    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Workers */}
      <div>
        <h4 className="font-medium mb-2 text-sm">Workers ({workers.length})</h4>
        {workers.length > 0 ? (
          <div className="space-y-1">
            {workers.slice(0, 5).map((worker) => (
              <div key={worker.id} className="text-xs text-[var(--muted)]">
                {worker.first_name} {worker.last_name} - {worker.position || 'Worker'}
              </div>
            ))}
            {workers.length > 5 && (
              <div className="text-xs text-[var(--muted)]">+{workers.length - 5} more</div>
            )}
          </div>
        ) : (
          <p className="text-xs text-[var(--muted)]">No workers assigned</p>
        )}
      </div>

      {/* Equipment */}
      <div>
        <h4 className="font-medium mb-2 text-sm">Equipment ({equipment.length})</h4>
        {equipment.length > 0 ? (
          <div className="space-y-1">
            {equipment.slice(0, 5).map((eq) => (
              <div key={eq.id} className="text-xs text-[var(--muted)]">
                {eq.equipment_number} - {eq.equipment_type} {eq.name ? `(${eq.name})` : ''}
              </div>
            ))}
            {equipment.length > 5 && (
              <div className="text-xs text-[var(--muted)]">+{equipment.length - 5} more</div>
            )}
          </div>
        ) : (
          <p className="text-xs text-[var(--muted)]">No equipment assigned</p>
        )}
      </div>
    </div>
  );
}
