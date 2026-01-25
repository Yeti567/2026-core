'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Target,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Plus,
  ChevronDown,
  ChevronRight,
  User,
  RefreshCw,
  Download,
  Mail,
  Lock,
  Play,
  ArrowLeft,
  X,
  MessageSquare,
  Paperclip,
  Flag
} from 'lucide-react';
import { COR_ELEMENTS } from '@/lib/audit/types';
import type { 
  ActionPlan, 
  ActionPhase, 
  ActionTask, 
  ActionSubtask,
  TaskStatus,
  TaskPriority 
} from '@/lib/audit/action-plan-generator';

// =============================================================================
// TYPES
// =============================================================================

interface TaskNote {
  id: string;
  user_name?: string;
  content: string;
  created_at: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ActionPlanPage() {
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<ActionTask | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Fetch action plan
  const fetchPlan = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/audit/action-plan');
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setPlan(data.plan);
        // Auto-expand in-progress phase
        if (data.plan?.phases) {
          const inProgressPhase = data.plan.phases.find(
            (p: ActionPhase) => p.status === 'in_progress'
          );
          if (inProgressPhase) {
            setExpandedPhases(new Set([inProgressPhase.id]));
          }
        }
      }
    } catch (err) {
      setError('Failed to load action plan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // Export plan as PDF
  const handleExportPlan = async () => {
    try {
      const response = await fetch('/api/audit/action-plan/export');
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `COR_Action_Plan_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export plan:', err);
      setError('Failed to export action plan. Please try again.');
    }
  };

  // Generate new plan
  const generatePlan = async () => {
    try {
      setGenerating(true);
      
      // For demo purposes, create sample gaps
      // In production, these would come from the compliance scoring engine
      const sampleGaps = [
        {
          requirement_id: 'gap_1',
          element_number: 1,
          description: '9 workers have not completed orientation training',
          requirement_description: 'All workers must complete safety orientation',
          severity: 'critical' as const,
          action_required: 'Complete orientation for 9 workers',
          estimated_effort_hours: 18
        },
        {
          requirement_id: 'gap_2',
          element_number: 3,
          description: 'No emergency drill conducted in past 12 months',
          requirement_description: 'Annual emergency drills are required',
          severity: 'critical' as const,
          action_required: 'Conduct emergency evacuation drill',
          estimated_effort_hours: 4
        },
        {
          requirement_id: 'gap_3',
          element_number: 2,
          description: 'Hazard assessments missing for 3 work activities',
          requirement_description: 'All work activities must have documented hazard assessments',
          severity: 'major' as const,
          action_required: 'Complete hazard assessments for remaining activities',
          estimated_effort_hours: 12
        },
        {
          requirement_id: 'gap_4',
          element_number: 5,
          description: 'PPE inspection records incomplete',
          requirement_description: 'PPE must be inspected and documented regularly',
          severity: 'major' as const,
          action_required: 'Implement PPE inspection tracking system',
          estimated_effort_hours: 6
        },
        {
          requirement_id: 'gap_5',
          element_number: 10,
          description: 'Contractor prequalification not documented',
          requirement_description: 'Contractors must be prequalified before work',
          severity: 'major' as const,
          action_required: 'Create contractor prequalification process',
          estimated_effort_hours: 8
        },
        {
          requirement_id: 'gap_6',
          element_number: 14,
          description: 'Health & Safety policy outdated (3 years old)',
          requirement_description: 'Policy must be reviewed annually',
          severity: 'minor' as const,
          action_required: 'Update Health & Safety policy',
          estimated_effort_hours: 4
        }
      ];

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 90); // 90 days from now

      const response = await fetch('/api/audit/action-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gaps: sampleGaps,
          targetDate: targetDate.toISOString(),
          estimatedHours: 80
        })
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setPlan(data.plan);
        // Expand first phase
        if (data.plan?.phases?.[0]) {
          setExpandedPhases(new Set([data.plan.phases[0].id]));
        }
      }
    } catch (err) {
      setError('Failed to generate action plan');
    } finally {
      setGenerating(false);
    }
  };

  // Toggle phase expansion
  const togglePhase = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  // Update task status
  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      const response = await fetch(`/api/audit/action-plan/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchPlan(); // Refresh plan data
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  // Open task modal
  const openTaskModal = (task: ActionTask) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
          <p className="text-slate-400">Loading action plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin/audit-dashboard" 
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Target className="w-7 h-7 text-teal-400" />
                COR Certification Action Plan
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Track tasks to achieve COR certification
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchPlan}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-slate-400" />
            </button>
            <button 
              onClick={handleExportPlan}
              disabled={!plan}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50" 
              title="Export Action Plan PDF"
            >
              <Download className="w-5 h-5 text-slate-400" />
            </button>
            <button 
              onClick={() => alert('Email functionality coming soon!')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors" 
              title="Email team"
            >
              <Mail className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300">{error}</span>
          </div>
        )}

        {!plan ? (
          <NoPlanView generating={generating} onGenerate={generatePlan} />
        ) : (
          <>
            {/* Progress Overview */}
            <ProgressOverview plan={plan} />

            {/* Alerts Section */}
            <AlertsSection plan={plan} />

            {/* Phases */}
            <div className="space-y-4">
              {plan.phases.map((phase) => (
                <PhaseCard
                  key={phase.id}
                  phase={phase}
                  expanded={expandedPhases.has(phase.id)}
                  onToggle={() => togglePhase(phase.id)}
                  onTaskClick={openTaskModal}
                  onTaskStatusChange={updateTaskStatus}
                />
              ))}
            </div>
          </>
        )}

        {/* Task Detail Modal */}
        {showTaskModal && selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            onClose={() => {
              setShowTaskModal(false);
              setSelectedTask(null);
            }}
            onUpdate={() => fetchPlan()}
          />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function NoPlanView({ 
  generating, 
  onGenerate 
}: { 
  generating: boolean; 
  onGenerate: () => void;
}) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
      <div className="w-20 h-20 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-6">
        <Target className="w-10 h-10 text-teal-400" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">
        No Action Plan Yet
      </h2>
      <p className="text-slate-400 mb-8 max-w-md mx-auto">
        Generate an action plan based on your current compliance gaps to create 
        a clear roadmap to COR certification.
      </p>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-medium hover:from-teal-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Plan...
          </>
        ) : (
          <>
            <Plus className="w-5 h-5" />
            Generate Action Plan
          </>
        )}
      </button>
    </div>
  );
}

function ProgressOverview({ plan }: { plan: ActionPlan }) {
  const daysRemaining = Math.ceil(
    (new Date(plan.target_completion_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const statusColors: Record<string, string> = {
    on_track: 'bg-emerald-500',
    at_risk: 'bg-amber-500',
    behind: 'bg-red-500',
    completed: 'bg-teal-500',
    in_progress: 'bg-blue-500'
  };

  const statusLabels: Record<string, string> = {
    on_track: '🟢 On Track',
    at_risk: '🟡 At Risk',
    behind: '🔴 Behind',
    completed: '✅ Completed',
    in_progress: '🔵 In Progress'
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{plan.overall_goal}</h2>
          <p className="text-slate-400 text-sm">
            Target: {new Date(plan.target_completion_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div className="text-right">
          <span className="text-lg font-medium">
            {statusLabels[plan.status] || plan.status}
          </span>
          <p className="text-slate-400 text-sm">
            {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Past due'}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Overall Progress</span>
          <span className="text-sm font-medium text-white">
            {plan.progress_percentage}% ({plan.completed_tasks}/{plan.total_tasks} tasks)
          </span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${statusColors[plan.status] || 'bg-teal-500'} transition-all duration-500`}
            style={{ width: `${plan.progress_percentage}%` }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-800">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{plan.total_tasks}</div>
          <div className="text-xs text-slate-400">Total Tasks</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-400">{plan.completed_tasks}</div>
          <div className="text-xs text-slate-400">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-400">{plan.total_tasks - plan.completed_tasks}</div>
          <div className="text-xs text-slate-400">Remaining</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{Math.round(plan.estimated_hours)}h</div>
          <div className="text-xs text-slate-400">Est. Hours</div>
        </div>
      </div>
    </div>
  );
}

function AlertsSection({ plan }: { plan: ActionPlan }) {
  const allTasks = plan.phases.flatMap(p => p.tasks);
  const now = new Date();
  const soonDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const overdue = allTasks.filter(t => 
    !['completed', 'cancelled'].includes(t.status) && new Date(t.due_date) < now
  );
  const dueSoon = allTasks.filter(t => 
    !['completed', 'cancelled'].includes(t.status) && 
    new Date(t.due_date) >= now && new Date(t.due_date) <= soonDate
  );

  if (overdue.length === 0 && dueSoon.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/50 border border-amber-500/30 rounded-xl p-4">
      <h3 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        NEEDS ATTENTION
      </h3>
      <div className="space-y-2 text-sm">
        {overdue.length > 0 && (
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>{overdue.length} task{overdue.length > 1 ? 's' : ''} overdue</span>
          </div>
        )}
        {dueSoon.length > 0 && (
          <div className="flex items-center gap-2 text-amber-400">
            <Clock className="w-4 h-4" />
            <span>{dueSoon.length} task{dueSoon.length > 1 ? 's' : ''} due this week</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PhaseCard({
  phase,
  expanded,
  onToggle,
  onTaskClick,
  onTaskStatusChange
}: {
  phase: ActionPhase;
  expanded: boolean;
  onToggle: () => void;
  onTaskClick: (task: ActionTask) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  const progress = phase.total_tasks > 0 
    ? Math.round((phase.completed_tasks / phase.total_tasks) * 100) 
    : 0;

  const isLocked = phase.status === 'pending' && phase.phase_number > 1;

  const phaseStatusColors: Record<string, string> = {
    pending: 'border-slate-700',
    in_progress: 'border-blue-500/50',
    completed: 'border-emerald-500/50',
    blocked: 'border-red-500/50'
  };

  return (
    <div className={`bg-slate-900/50 border ${phaseStatusColors[phase.status]} rounded-xl overflow-hidden`}>
      {/* Phase Header */}
      <button
        onClick={onToggle}
        disabled={isLocked}
        className={`w-full p-4 flex items-center justify-between ${
          isLocked ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-800/50'
        } transition-colors`}
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          )}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium text-white">
                Phase {phase.phase_number}: {phase.phase_name}
              </span>
              {isLocked && <Lock className="w-4 h-4 text-slate-500" />}
              {phase.status === 'completed' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              {new Date(phase.start_date).toLocaleDateString()} - {new Date(phase.end_date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-medium text-white">{progress}% Complete</div>
            <div className="text-xs text-slate-400">
              {phase.completed_tasks}/{phase.total_tasks} tasks
            </div>
          </div>
          <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                phase.status === 'completed' ? 'bg-emerald-500' :
                phase.status === 'in_progress' ? 'bg-blue-500' :
                'bg-slate-600'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </button>

      {/* Phase Tasks */}
      {expanded && !isLocked && (
        <div className="border-t border-slate-800 p-4 space-y-2">
          {phase.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onStatusChange={onTaskStatusChange}
            />
          ))}
        </div>
      )}

      {/* Locked Message */}
      {isLocked && (
        <div className="border-t border-slate-800 p-4 text-center text-slate-500 text-sm">
          <Lock className="w-4 h-4 inline mr-2" />
          Unlocks after Phase {phase.phase_number - 1} complete
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  onClick,
  onStatusChange
}: {
  task: ActionTask;
  onClick: () => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  const now = new Date();
  const dueDate = new Date(task.due_date);
  const isOverdue = !['completed', 'cancelled'].includes(task.status) && dueDate < now;
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const priorityColors: Record<TaskPriority, string> = {
    critical: 'text-red-400',
    high: 'text-amber-400',
    medium: 'text-blue-400',
    low: 'text-slate-400'
  };

  const statusIcons: Record<TaskStatus, React.ReactNode> = {
    todo: <Circle className="w-5 h-5 text-slate-500" />,
    in_progress: <Play className="w-5 h-5 text-blue-400 fill-blue-400" />,
    blocked: <AlertCircle className="w-5 h-5 text-red-400" />,
    review: <Clock className="w-5 h-5 text-amber-400" />,
    completed: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    cancelled: <X className="w-5 h-5 text-slate-500" />
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        task.status === 'completed' 
          ? 'bg-emerald-500/5 hover:bg-emerald-500/10' 
          : isOverdue 
            ? 'bg-red-500/10 hover:bg-red-500/15' 
            : 'hover:bg-slate-800/50'
      }`}
      onClick={onClick}
    >
      {/* Status Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          const nextStatus: TaskStatus = task.status === 'completed' ? 'todo' : 'completed';
          onStatusChange(task.id, nextStatus);
        }}
        className="flex-shrink-0"
      >
        {statusIcons[task.status]}
      </button>

      {/* Task Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${
            task.status === 'completed' ? 'text-slate-400 line-through' : 'text-white'
          }`}>
            {task.title}
          </span>
          <span className={`text-xs ${priorityColors[task.priority]}`}>
            {task.priority.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {task.assigned_to_name || 'Unassigned'}
          </span>
          <span className="text-slate-600">•</span>
          <span>Element {task.element_number}</span>
          {task.subtasks.length > 0 && (
            <>
              <span className="text-slate-600">•</span>
              <span>
                {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} subtasks
              </span>
            </>
          )}
        </div>
      </div>

      {/* Due Date */}
      <div className={`text-sm ${
        isOverdue ? 'text-red-400 font-medium' : 
        daysUntilDue <= 3 ? 'text-amber-400' : 
        'text-slate-400'
      }`}>
        {isOverdue ? (
          <span className="flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {Math.abs(daysUntilDue)}d overdue
          </span>
        ) : daysUntilDue === 0 ? (
          'Due today'
        ) : daysUntilDue === 1 ? (
          'Due tomorrow'
        ) : (
          `Due ${daysUntilDue}d`
        )}
      </div>
    </div>
  );
}

function TaskDetailModal({
  task,
  onClose,
  onUpdate
}: {
  task: ActionTask;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [status, setStatus] = useState(task.status);
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [subtasks, setSubtasks] = useState(task.subtasks);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const element = COR_ELEMENTS.find(e => e.number === task.element_number);

  const loadTaskNotes = useCallback(async () => {
    try {
      const response = await fetch(`/api/audit/action-plan/tasks/${task.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.task?.action_task_notes) {
          setNotes(data.task.action_task_notes.map((n: any) => ({
            id: n.id,
            user_name: n.user?.first_name ? `${n.user.first_name} ${n.user.last_name}` : 'Unknown',
            content: n.content,
            created_at: n.created_at
          })));
        }
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  }, [task.id]);

  // Load task notes on mount
  useEffect(() => {
    loadTaskNotes();
  }, [loadTaskNotes]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // In production, upload to storage and save URL
      // For now, just show the filename
      const newAttachments = Array.from(files).map(f => f.name);
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const priorityLabels: Record<TaskPriority, { label: string; color: string }> = {
    critical: { label: 'CRITICAL', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    high: { label: 'HIGH', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    medium: { label: 'MEDIUM', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    low: { label: 'LOW', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }
  };

  // Update task status
  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/audit/action-plan/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setStatus(newStatus);
        onUpdate();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle subtask
  const toggleSubtask = async (subtaskId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/audit/action-plan/tasks/${task.id}/subtasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtaskId, completed })
      });

      if (response.ok) {
        setSubtasks(prev => 
          prev.map(st => st.id === subtaskId ? { ...st, completed } : st)
        );
        onUpdate();
      }
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
    }
  };

  // Add note
  const addNote = async () => {
    if (!newNote.trim()) return;

    try {
      const response = await fetch(`/api/audit/action-plan/tasks/${task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote })
      });

      if (response.ok) {
        const data = await response.json();
        setNotes(prev => [...prev, data.note]);
        setNewNote('');
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  const completedSubtasks = subtasks.filter(s => s.completed).length;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white">{task.title}</h2>
              <div className="flex items-center gap-3 mt-2 text-sm">
                <span className="text-slate-400">
                  Element {task.element_number}: {element?.name}
                </span>
                <span className={`px-2 py-0.5 rounded border ${priorityLabels[task.priority].color}`}>
                  {priorityLabels[task.priority].label}
                </span>
                <span className="text-slate-400">
                  Due: {new Date(task.due_date).toLocaleDateString()}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">Description</h3>
            <p className="text-white whitespace-pre-wrap">{task.description}</p>
          </div>

          {/* Assignment & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Assigned to</h3>
              <div className="flex items-center gap-2 text-white">
                <User className="w-4 h-4 text-slate-400" />
                {task.assigned_to_name || 'Unassigned'}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Estimated effort</h3>
              <div className="flex items-center gap-2 text-white">
                <Clock className="w-4 h-4 text-slate-400" />
                {task.estimated_hours} hours
              </div>
            </div>
          </div>

          {/* Status Selector */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">Status</h3>
            <div className="flex gap-2">
              {(['todo', 'in_progress', 'completed'] as TaskStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={loading}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    status === s 
                      ? s === 'completed' 
                        ? 'bg-emerald-500 text-white' 
                        : s === 'in_progress'
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {s === 'todo' ? 'To Do' : s === 'in_progress' ? 'In Progress' : 'Completed'}
                </button>
              ))}
            </div>
          </div>

          {/* Subtasks */}
          {subtasks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">
                Subtasks ({completedSubtasks}/{subtasks.length} complete)
              </h3>
              <div className="space-y-2">
                {subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50"
                  >
                    <button
                      onClick={() => toggleSubtask(subtask.id, !subtask.completed)}
                      className="flex-shrink-0"
                    >
                      {subtask.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500" />
                      )}
                    </button>
                    <span className={subtask.completed ? 'text-slate-400 line-through' : 'text-white'}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Progress Notes
            </h3>
            
            {notes.length > 0 && (
              <div className="space-y-3 mb-4">
                {notes.map((note) => (
                  <div key={note.id} className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <span className="font-medium text-slate-300">{note.user_name}</span>
                      <span>•</span>
                      <span>{new Date(note.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-white text-sm">{note.content}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a progress note..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
              />
              <button
                onClick={addNote}
                disabled={!newNote.trim()}
                className="bg-teal-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Note
              </button>
            </div>
          </div>

          {/* Attachments Section */}
          {attachments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Attachments
              </h3>
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/50 rounded-lg p-2">
                    <Paperclip className="w-4 h-4 text-slate-400" />
                    <span>{file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex items-center justify-between">
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <Paperclip className="w-4 h-4" />
              Attach File
            </button>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
