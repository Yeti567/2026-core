'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Task, RISK_LEVEL_CONFIG } from './types';
import { useTaskLibrary } from '../hooks/use-task-library';

function TaskCard({ task, onViewDetails, onUseTemplate }: {
  task: Task;
  onViewDetails: (task: Task) => void;
  onUseTemplate: (task: Task) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  
  const highRiskHazards = task.hazards.filter(h => h.risk_level === 'critical' || h.risk_level === 'high');
  
  return (
    <Card className="hover:border-[var(--primary)]/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs text-[var(--muted)]">{task.task_code}</span>
              {!task.is_global && (
                <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">
                  Custom
                </Badge>
              )}
            </div>
            <h4 className="font-semibold">{task.name}</h4>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="flex flex-wrap gap-3 mt-3 text-sm">
          {task.typical_duration_hours && (
            <span className="flex items-center gap-1 text-[var(--muted)]">
              ⏱️ {task.typical_duration_hours} hrs
            </span>
          )}
          {(task.crew_size_min || task.crew_size_max) && (
            <span className="flex items-center gap-1 text-[var(--muted)]">
              👥 {task.crew_size_min || 1}-{task.crew_size_max || task.crew_size_min || 1} crew
            </span>
          )}
          <span className="flex items-center gap-1 text-[var(--muted)]">
            ⚠️ {task.hazards.length} hazards
          </span>
        </div>
        
        {/* Hazards Preview */}
        {highRiskHazards.length > 0 && (
          <div className="mt-3 p-2 bg-red-500/10 rounded border border-red-500/20">
            <p className="text-xs text-red-400 mb-1">High Risk Hazards:</p>
            <div className="flex flex-wrap gap-1">
              {highRiskHazards.slice(0, 3).map((h, i) => (
                <Badge key={i} variant="outline" className="text-xs border-red-500/50 text-red-400">
                  {h.hazard_name}
                </Badge>
              ))}
              {highRiskHazards.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{highRiskHazards.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {/* Expanded Content */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
            {task.description && (
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">Description:</p>
                <p className="text-sm">{task.description}</p>
              </div>
            )}
            
            {task.procedure_steps.length > 0 && (
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">Procedure Steps:</p>
                <ol className="text-sm pl-4 space-y-1 list-decimal">
                  {task.procedure_steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
            
            {task.required_certifications.length > 0 && (
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">Required Certifications:</p>
                <div className="flex flex-wrap gap-1">
                  {task.required_certifications.map((cert, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{cert}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {task.ppe_required.length > 0 && (
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">Required PPE:</p>
                <div className="flex flex-wrap gap-1">
                  {task.ppe_required.map((ppe, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{ppe}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)]">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[var(--primary)] hover:underline"
          >
            {expanded ? 'Show Less' : 'Show More'}
          </button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onViewDetails(task)}>
              View Details
            </Button>
            <Button size="sm" onClick={() => onUseTemplate(task)}>
              Use Template
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskDetailModal({ task, isOpen, onClose }: {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!task) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📋 Task Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Header */}
          <div>
            <span className="font-mono text-sm text-[var(--muted)]">{task.task_code}</span>
            <h2 className="text-xl font-bold mt-1">{task.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge>{task.trade}</Badge>
              <Badge variant="outline">{task.category}</Badge>
            </div>
          </div>
          
          {/* Description */}
          {task.description && (
            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-sm text-[var(--muted)]">{task.description}</p>
            </div>
          )}
          
          {/* Quick Info */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-[var(--muted)]/10 rounded-lg">
            <div className="text-center">
              <div className="text-2xl mb-1">⏱️</div>
              <div className="font-semibold">{task.typical_duration_hours || '-'} hrs</div>
              <div className="text-xs text-[var(--muted)]">Typical Duration</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">👥</div>
              <div className="font-semibold">{task.crew_size_min || 1} - {task.crew_size_max || task.crew_size_min || 1}</div>
              <div className="text-xs text-[var(--muted)]">Crew Size</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">⚠️</div>
              <div className="font-semibold">{task.hazards.length}</div>
              <div className="text-xs text-[var(--muted)]">Identified Hazards</div>
            </div>
          </div>
          
          {/* Procedure Steps */}
          {task.procedure_steps.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Procedure Steps</h4>
              <ol className="space-y-2">
                {task.procedure_steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          
          {/* Hazards */}
          {task.hazards.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Associated Hazards</h4>
              <div className="space-y-2">
                {task.hazards.map((hazard, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-[var(--muted)]/10 rounded">
                    <span className="text-sm">{hazard.hazard_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_LEVEL_CONFIG[hazard.risk_level].bgColor} ${RISK_LEVEL_CONFIG[hazard.risk_level].color}`}>
                      {RISK_LEVEL_CONFIG[hazard.risk_level].icon} {RISK_LEVEL_CONFIG[hazard.risk_level].label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Required Equipment */}
          {task.required_equipment.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Required Equipment</h4>
              <div className="flex flex-wrap gap-2">
                {task.required_equipment.map((eq, i) => (
                  <Badge key={i} variant="secondary">{eq}</Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Certifications */}
          {task.required_certifications.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Required Certifications</h4>
              <div className="flex flex-wrap gap-2">
                {task.required_certifications.map((cert, i) => (
                  <Badge key={i} variant="outline" className="border-blue-500 text-blue-500">{cert}</Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* PPE */}
          {task.ppe_required.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Required PPE</h4>
              <div className="flex flex-wrap gap-2">
                {task.ppe_required.map((ppe, i) => (
                  <Badge key={i} variant="outline">{ppe}</Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-[var(--border)]">
            <Button className="flex-1">Use as JHA Template</Button>
            <Button variant="outline" className="flex-1">Edit Task</Button>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TaskLibraryTab() {
  const { tasks, isLoading, error } = useTaskLibrary();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Concrete']));
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    tasks.forEach(t => cats.add(t.category));
    return Array.from(cats).sort();
  }, [tasks]);
  
  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (search) {
        const searchLower = search.toLowerCase();
        const matches = 
          task.name.toLowerCase().includes(searchLower) ||
          task.task_code.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower);
        if (!matches) return false;
      }
      
      if (categoryFilter && task.category !== categoryFilter) return false;
      
      return true;
    });
  }, [tasks, search, categoryFilter]);
  
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
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };
  
  const handleUseTemplate = (task: Task) => {
    // TODO: Navigate to JHA form with task pre-populated
    console.log('Use template:', task);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-[var(--muted)]">Loading task library...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            📋 Job/Task Library
          </h2>
          <p className="text-[var(--muted)] mt-1">
            {filteredTasks.length} of {tasks.length} tasks • Pre-built templates with hazard assessments
          </p>
        </div>
        
        <Button>
          + Create Task
        </Button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center p-4 bg-[var(--card)] rounded-lg border border-[var(--border)]">
        <div className="flex-1 min-w-[200px]">
          <Input
            type="search"
            placeholder="🔍 Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        
        {(search || categoryFilter) && (
          <button
            onClick={() => {
              setSearch('');
              setCategoryFilter('');
            }}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Clear filters ✕
          </button>
        )}
      </div>
      
      {/* Task Categories */}
      <div className="space-y-4">
        {Object.entries(tasksByCategory)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, categoryTasks]) => (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-4 bg-[var(--card)] hover:bg-[var(--muted)]/10 rounded-lg border border-[var(--border)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📂</span>
                  <div className="text-left">
                    <h3 className="font-semibold">{category} Tasks</h3>
                    <p className="text-sm text-[var(--muted)]">{categoryTasks.length} tasks</p>
                  </div>
                </div>
                <span className="text-[var(--muted)] transition-transform" style={{ transform: expandedCategories.has(category) ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ▼
                </span>
              </button>
              
              {expandedCategories.has(category) && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {categoryTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onViewDetails={setSelectedTask}
                      onUseTemplate={handleUseTemplate}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
      
      {filteredTasks.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="font-semibold mb-2">No tasks found</h3>
            <p className="text-[var(--muted)]">
              Try adjusting your filters or create a new task
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}
