'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue, Task, RiskLevel } from '../types';
import { createBrowserClient } from '@supabase/ssr';

// Risk level configuration
const RISK_CONFIG: Record<RiskLevel, { icon: string; color: string }> = {
  critical: { icon: '⚫', color: 'text-black bg-black/10' },
  high: { icon: '🔴', color: 'text-red-600 bg-red-100' },
  medium: { icon: '🟠', color: 'text-orange-600 bg-orange-100' },
  low: { icon: '🟡', color: 'text-yellow-600 bg-yellow-100' },
  negligible: { icon: '🟢', color: 'text-green-600 bg-green-100' },
};

interface TaskSelectFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: string, taskDetails?: Task) => void;
  error?: string;
  disabled?: boolean;
  tasks?: Task[];
  categoryFilter?: string;
  tradeFilter?: string;
  onTaskSelected?: (task: Task) => void;
}

export function TaskSelectField({
  field,
  value,
  onChange,
  error,
  disabled,
  tasks: providedTasks,
  categoryFilter,
  tradeFilter,
  onTaskSelected,
}: TaskSelectFieldProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tasks, setTasks] = useState<Task[]>(providedTasks || []);
  const [isLoading, setIsLoading] = useState(!providedTasks);
  
  // Fetch tasks from database if not provided
  useEffect(() => {
    if (providedTasks) {
      setTasks(providedTasks);
      return;
    }
    
    const fetchTasks = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        let query = supabase
          .from('job_task_library')
          .select('*')
          .eq('is_active', true)
          .order('category')
          .order('name');
        
        if (categoryFilter) {
          query = query.eq('category', categoryFilter);
        }
        
        if (tradeFilter) {
          query = query.eq('trade', tradeFilter);
        }
        
        const { data, error: fetchError } = await query;
        
        if (fetchError) {
          console.error('Error fetching tasks:', fetchError);
          return;
        }
        
        // Transform data
        const transformedTasks: Task[] = (data || []).map(t => ({
          ...t,
          hazards: t.typical_hazards || [],
          procedure_steps: t.procedure_steps || [],
          required_equipment: t.required_equipment || [],
          required_certifications: t.required_certifications || [],
          ppe_required: t.ppe_required || [],
        }));
        
        setTasks(transformedTasks);
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTasks();
  }, [providedTasks, categoryFilter, tradeFilter]);
  
  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (searchTerm) {
        const searchStr = `${task.name} ${task.description || ''} ${task.task_code}`.toLowerCase();
        if (!searchStr.includes(searchTerm.toLowerCase())) return false;
      }
      return true;
    });
  }, [tasks, searchTerm]);
  
  // Group by category
  const tasksByCategory = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    filteredTasks.forEach(task => {
      if (!grouped[task.category]) {
        grouped[task.category] = [];
      }
      grouped[task.category].push(task);
    });
    return grouped;
  }, [filteredTasks]);
  
  const selectedTask = tasks.find(t => t.id === value);
  
  const handleChange = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    onChange(taskId, task);
    if (task && onTaskSelected) {
      onTaskSelected(task);
    }
  };
  
  if (isLoading) {
    return (
      <FieldWrapper
        label={field.label}
        fieldCode={field.field_code}
        required={field.validation_rules?.required}
        helpText={field.help_text}
        error={error}
      >
        <div className="h-10 flex items-center justify-center border rounded-md bg-muted/50">
          <span className="text-sm text-muted-foreground">Loading tasks...</span>
        </div>
      </FieldWrapper>
    );
  }
  
  return (
    <FieldWrapper
      label={field.label}
      fieldCode={field.field_code}
      required={field.validation_rules?.required}
      helpText={field.help_text}
      error={error}
    >
      <Select
        value={String(value ?? '')}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={field.field_code}
          aria-invalid={!!error}
          className="w-full"
        >
          <SelectValue placeholder={field.placeholder || 'Select task'}>
            {selectedTask && (
              <span className="flex items-center gap-2">
                <span>📋</span>
                <span className="truncate">{selectedTask.name}</span>
                {selectedTask.hazards && selectedTask.hazards.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({selectedTask.hazards.length} hazards)
                  </span>
                )}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {/* Search */}
          <div className="p-2 border-b sticky top-0 bg-background z-10">
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8"
            />
          </div>
          
          {/* Tasks grouped by category */}
          <div className="max-h-60 overflow-auto">
            {Object.entries(tasksByCategory).length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No tasks found
              </div>
            ) : (
              Object.entries(tasksByCategory).map(([category, categoryTasks]) => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                    📂 {category} ({categoryTasks.length})
                  </div>
                  {categoryTasks.map((task) => {
                    // Get highest risk level from hazards
                    const riskLevels = task.hazards?.map(h => h.risk_level) || [];
                    const highestRisk = riskLevels.includes('critical') ? 'critical' :
                                        riskLevels.includes('high') ? 'high' :
                                        riskLevels.includes('medium') ? 'medium' :
                                        riskLevels.includes('low') ? 'low' : 'negligible';
                    
                    return (
                      <SelectItem key={task.id} value={task.id}>
                        <div className="flex items-start gap-2 w-full py-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{task.name}</span>
                              <span className="text-xs font-mono text-muted-foreground">{task.task_code}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                              {task.typical_duration_hours && (
                                <span>⏱️ {task.typical_duration_hours}h</span>
                              )}
                              {(task.crew_size_min || task.crew_size_max) && (
                                <span>👥 {task.crew_size_min || 1}-{task.crew_size_max || task.crew_size_min || 1}</span>
                              )}
                              {task.hazards && task.hazards.length > 0 && (
                                // Safe: highestRisk is constrained to specific risk level strings
                                // eslint-disable-next-line security/detect-object-injection
                                <span className={RISK_CONFIG[highestRisk].color + ' px-1 rounded'}>
                                  {/* eslint-disable-next-line security/detect-object-injection */}
                                  {RISK_CONFIG[highestRisk].icon} {task.hazards.length} hazards
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </SelectContent>
      </Select>
      
      {/* Selected Task Details */}
      {selectedTask && (
        <div className="mt-2 p-3 bg-muted/30 rounded-lg text-sm">
          <div className="font-medium mb-2">{selectedTask.name}</div>
          {selectedTask.description && (
            <p className="text-muted-foreground text-xs mb-2">{selectedTask.description}</p>
          )}
          
          {/* Hazards Preview */}
          {selectedTask.hazards && selectedTask.hazards.length > 0 && (
            <div className="mb-2">
              <span className="text-xs font-medium text-muted-foreground">Associated Hazards:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedTask.hazards.slice(0, 5).map((h, i) => (
                  <Badge 
                    key={i} 
                    variant="outline" 
                    className={`text-xs ${RISK_CONFIG[h.risk_level]?.color || ''}`}
                  >
                    {RISK_CONFIG[h.risk_level]?.icon} {h.hazard_name}
                  </Badge>
                ))}
                {selectedTask.hazards.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedTask.hazards.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {/* Required PPE */}
          {selectedTask.ppe_required && selectedTask.ppe_required.length > 0 && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">Required PPE:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedTask.ppe_required.map((ppe, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    🦺 {ppe}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </FieldWrapper>
  );
}

export default TaskSelectField;
