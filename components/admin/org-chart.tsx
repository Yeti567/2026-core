'use client';

import { useMemo } from 'react';

interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
  parent_department_id?: string;
  superintendent_id?: string;
  manager_id?: string;
  department_type: string;
  worker_count: number;
  equipment_count: number;
  color_code?: string;
  superintendent?: {
    first_name: string;
    last_name: string;
  };
  manager?: {
    first_name: string;
    last_name: string;
  };
}

interface OrgChartProps {
  departments: Department[];
}

export function OrgChart({ departments }: OrgChartProps) {
  // Build hierarchy tree
  const hierarchy = useMemo(() => {
    const deptMap = new Map<string, Department>();
    const rootDepts: Department[] = [];

    // Create map
    departments.forEach(dept => {
      deptMap.set(dept.id, dept);
    });

    // Find root departments (no parent)
    departments.forEach(dept => {
      if (!dept.parent_department_id) {
        rootDepts.push(dept);
      }
    });

    // Build children for each department
    const buildChildren = (dept: Department): Department[] => {
      return departments.filter(d => d.parent_department_id === dept.id);
    };

    return { rootDepts, buildChildren };
  }, [departments]);

  const getColor = (dept: Department) => {
    return dept.color_code || '#6366f1';
  };

  const DepartmentNode = ({ dept, level = 0 }: { dept: Department; level?: number }) => {
    const children = departments.filter(d => d.parent_department_id === dept.id);
    const color = getColor(dept);

    return (
      <div className="flex flex-col items-center">
        {/* Department Card */}
        <div
          className="relative bg-slate-800 border-2 rounded-lg p-4 min-w-[200px] mb-4 shadow-lg"
          style={{ borderColor: color }}
        >
          <div className="text-center">
            <div className="font-semibold text-white mb-1">{dept.name}</div>
            {dept.code && (
              <div className="text-xs text-[var(--muted)] mb-2">{dept.code}</div>
            )}
            <div className="flex items-center justify-center gap-4 text-xs mt-2">
              <div>
                <span className="text-indigo-400 font-bold">{dept.worker_count}</span>
                <span className="text-[var(--muted)] ml-1">workers</span>
              </div>
              <div>
                <span className="text-emerald-400 font-bold">{dept.equipment_count}</span>
                <span className="text-[var(--muted)] ml-1">equipment</span>
              </div>
            </div>
            {(dept.superintendent || dept.manager) && (
              <div className="mt-2 pt-2 border-t border-slate-700 text-xs">
                {dept.superintendent && (
                  <div className="text-[var(--muted)]">
                    Sup: {dept.superintendent.first_name} {dept.superintendent.last_name}
                  </div>
                )}
                {dept.manager && (
                  <div className="text-[var(--muted)]">
                    Mgr: {dept.manager.first_name} {dept.manager.last_name}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Children */}
        {children.length > 0 && (
          <>
            {/* Connector Line */}
            <div className="w-0.5 h-4 mb-4" style={{ backgroundColor: color }} />
            
            {/* Children Container */}
            <div className="flex gap-8 items-start">
              {children.map((child, index) => (
                <div key={child.id} className="flex flex-col items-center">
                  {/* Horizontal connector */}
                  {index > 0 && (
                    <div
                      className="absolute w-4 h-0.5 -ml-4"
                      style={{ backgroundColor: color }}
                    />
                  )}
                  <DepartmentNode dept={child} level={level + 1} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  if (hierarchy.rootDepts.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--muted)]">
        No departments to display. Create departments to see the org chart.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto py-8">
      <div className="flex justify-center items-start gap-8 min-w-max">
        {hierarchy.rootDepts.map((dept) => (
          <DepartmentNode key={dept.id} dept={dept} />
        ))}
      </div>
    </div>
  );
}
