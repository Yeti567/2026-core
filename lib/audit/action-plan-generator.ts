/**
 * Action Plan Generator
 * 
 * Converts compliance gaps into actionable, assignable tasks
 * organized into phases with dependencies and timelines.
 */

import { COR_ELEMENTS } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface ActionPlan {
  id: string;
  company_id: string;
  created_by?: string;
  title: string;
  overall_goal: string;
  target_completion_date: string;
  total_tasks: number;
  completed_tasks: number;
  progress_percentage: number;
  estimated_hours: number;
  actual_hours: number;
  status: PlanStatus;
  created_at: string;
  updated_at: string;
  phases: ActionPhase[];
}

export interface ActionPhase {
  id: string;
  plan_id: string;
  phase_number: number;
  phase_name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: PhaseStatus;
  total_tasks: number;
  completed_tasks: number;
  tasks: ActionTask[];
}

export interface ActionTask {
  id: string;
  plan_id: string;
  phase_id?: string;
  gap_id?: string;
  element_number: number;
  title: string;
  description: string;
  priority: TaskPriority;
  assigned_to?: string;
  assigned_to_name?: string;
  due_date: string;
  estimated_hours: number;
  actual_hours?: number;
  status: TaskStatus;
  completion_date?: string;
  completed_by?: string;
  notes?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  subtasks: ActionSubtask[];
  dependencies: string[];
}

export interface ActionSubtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
  due_date?: string;
  sort_order: number;
}

export interface TaskNote {
  id: string;
  task_id: string;
  user_id: string;
  user_name?: string;
  content: string;
  created_at: string;
}

export interface Gap {
  requirement_id: string;
  element_number: number;
  description: string;
  requirement_description: string;
  severity: 'critical' | 'major' | 'minor';
  action_required: string;
  estimated_effort_hours: number;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  position?: string;
}

export type PlanStatus = 'draft' | 'in_progress' | 'on_track' | 'at_risk' | 'behind' | 'completed' | 'cancelled';
export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'review' | 'completed' | 'cancelled';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

// =============================================================================
// CONSTANTS
// =============================================================================

const ASSIGNMENT_RULES: Record<string, string[]> = {
  training: ['admin', 'supervisor'],
  orientation: ['admin', 'supervisor'],
  documentation: ['admin', 'internal_auditor'],
  policy: ['admin'],
  equipment: ['supervisor'],
  inspection: ['supervisor', 'internal_auditor'],
  contractor: ['admin', 'supervisor'],
  emergency: ['admin', 'supervisor'],
  forms: ['admin', 'supervisor'],
  hazard: ['supervisor', 'internal_auditor'],
  ppe: ['supervisor'],
  default: ['admin', 'supervisor']
};

// =============================================================================
// MAIN GENERATOR FUNCTION
// =============================================================================

/**
 * Generate a complete action plan from compliance gaps
 */
export function generateActionPlanFromGaps(
  companyId: string,
  gaps: Gap[],
  users: User[],
  targetDate: Date,
  estimatedTotalHours: number
): ActionPlan {
  const planId = generateId();
  const now = new Date();

  // Sort gaps by severity
  const sortedGaps = sortGapsByPriority(gaps);

  // Group gaps into phases
  const phases = createPhases(planId, sortedGaps, now, targetDate, users);

  // Calculate totals
  const allTasks = phases.flatMap(p => p.tasks);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.status === 'completed').length;

  return {
    id: planId,
    company_id: companyId,
    title: 'COR Certification Action Plan',
    overall_goal: `Achieve 80%+ COR compliance by ${targetDate.toLocaleDateString('en-CA')}`,
    target_completion_date: targetDate.toISOString().split('T')[0],
    total_tasks: totalTasks,
    completed_tasks: completedTasks,
    progress_percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    estimated_hours: estimatedTotalHours,
    actual_hours: 0,
    status: 'in_progress',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    phases
  };
}

// =============================================================================
// PHASE CREATION
// =============================================================================

/**
 * Create phases from sorted gaps
 */
function createPhases(
  planId: string,
  gaps: Gap[],
  startDate: Date,
  targetDate: Date,
  users: User[]
): ActionPhase[] {
  const phases: ActionPhase[] = [];
  
  // Calculate time available
  const totalDays = Math.max(1, Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Phase durations (adjust based on total time available)
  const phase1Duration = Math.ceil(totalDays * 0.2); // 20% for critical
  const phase2Duration = Math.ceil(totalDays * 0.35); // 35% for major
  const phase3Duration = Math.ceil(totalDays * 0.3); // 30% for minor
  const phase4Duration = Math.ceil(totalDays * 0.15); // 15% for final prep

  // Phase 1: Fix Critical Gaps
  const criticalGaps = gaps.filter(g => g.severity === 'critical');
  const phase1StartDate = startDate;
  const phase1EndDate = addDays(startDate, phase1Duration);
  const phase1Tasks = criticalGaps.map((gap, index) => 
    convertGapToTask(planId, generateId(), gap, users, phase1StartDate, phase1EndDate, index)
  );

  const phase1: ActionPhase = {
    id: generateId(),
    plan_id: planId,
    phase_number: 1,
    phase_name: 'Fix Critical Gaps',
    description: 'Address all critical compliance issues that would prevent certification. These must be resolved before proceeding.',
    start_date: phase1StartDate.toISOString().split('T')[0],
    end_date: phase1EndDate.toISOString().split('T')[0],
    status: 'in_progress',
    total_tasks: phase1Tasks.length,
    completed_tasks: 0,
    tasks: phase1Tasks
  };
  phases.push(phase1);

  // Phase 2: Address Major Gaps
  const majorGaps = gaps.filter(g => g.severity === 'major');
  const phase2StartDate = phase1EndDate;
  const phase2EndDate = addDays(phase2StartDate, phase2Duration);
  const phase2Tasks = majorGaps.map((gap, index) => 
    convertGapToTask(planId, generateId(), gap, users, phase2StartDate, phase2EndDate, index)
  );

  const phase2: ActionPhase = {
    id: generateId(),
    plan_id: planId,
    phase_number: 2,
    phase_name: 'Address Major Gaps',
    description: 'Improve compliance in areas with significant deficiencies. Focus on high-impact improvements.',
    start_date: phase2StartDate.toISOString().split('T')[0],
    end_date: phase2EndDate.toISOString().split('T')[0],
    status: 'pending',
    total_tasks: phase2Tasks.length,
    completed_tasks: 0,
    tasks: phase2Tasks
  };
  phases.push(phase2);

  // Phase 3: Polish & Documentation
  const minorGaps = gaps.filter(g => g.severity === 'minor');
  const phase3StartDate = phase2EndDate;
  const phase3EndDate = addDays(phase3StartDate, phase3Duration);
  const phase3Tasks = [
    ...minorGaps.map((gap, index) => 
      convertGapToTask(planId, generateId(), gap, users, phase3StartDate, phase3EndDate, index)
    ),
    createDocumentationTask(planId, users, phase3EndDate)
  ];

  const phase3: ActionPhase = {
    id: generateId(),
    plan_id: planId,
    phase_number: 3,
    phase_name: 'Polish & Documentation',
    description: 'Complete remaining items, finalize documentation, and prepare evidence packages.',
    start_date: phase3StartDate.toISOString().split('T')[0],
    end_date: phase3EndDate.toISOString().split('T')[0],
    status: 'pending',
    total_tasks: phase3Tasks.length,
    completed_tasks: 0,
    tasks: phase3Tasks
  };
  phases.push(phase3);

  // Phase 4: Final Review & Mock Audit
  const phase4StartDate = phase3EndDate;
  const phase4EndDate = targetDate;
  const phase4Tasks = [
    createMockAuditTask(planId, users, addDays(phase4StartDate, 3)),
    createFinalReviewTask(planId, users, addDays(phase4StartDate, 7)),
    createAuditPackageTask(planId, users, phase4EndDate)
  ];

  const phase4: ActionPhase = {
    id: generateId(),
    plan_id: planId,
    phase_number: 4,
    phase_name: 'Final Review & Audit Prep',
    description: 'Conduct mock audits, final reviews, and prepare the audit submission package.',
    start_date: phase4StartDate.toISOString().split('T')[0],
    end_date: phase4EndDate.toISOString().split('T')[0],
    status: 'pending',
    total_tasks: phase4Tasks.length,
    completed_tasks: 0,
    tasks: phase4Tasks
  };
  phases.push(phase4);

  // Update phase IDs in tasks
  for (const phase of phases) {
    for (const task of phase.tasks) {
      task.phase_id = phase.id;
    }
  }

  return phases;
}

// =============================================================================
// TASK CREATION
// =============================================================================

/**
 * Convert a gap into an actionable task
 */
function convertGapToTask(
  planId: string,
  phaseId: string,
  gap: Gap,
  users: User[],
  phaseStartDate: Date,
  phaseEndDate: Date,
  index: number
): ActionTask {
  const taskId = generateId();
  const assignee = determineAssignee(gap, users);
  const dueDate = calculateDueDate(gap, phaseStartDate, phaseEndDate, index);
  const subtasks = generateSubtasks(taskId, gap);
  const element = COR_ELEMENTS.find(e => e.number === gap.element_number);

  return {
    id: taskId,
    plan_id: planId,
    phase_id: phaseId,
    gap_id: gap.requirement_id,
    element_number: gap.element_number,
    title: gap.action_required || `Address ${element?.name || 'Element ' + gap.element_number} gap`,
    description: buildTaskDescription(gap),
    priority: mapSeverityToPriority(gap.severity),
    assigned_to: assignee?.id,
    assigned_to_name: assignee ? `${assignee.first_name} ${assignee.last_name}` : undefined,
    due_date: dueDate.toISOString().split('T')[0],
    estimated_hours: gap.estimated_effort_hours || 2,
    status: 'todo',
    sort_order: index,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    subtasks,
    dependencies: []
  };
}

/**
 * Create documentation review task
 */
function createDocumentationTask(planId: string, users: User[], dueDate: Date): ActionTask {
  const taskId = generateId();
  const assignee = users.find(u => u.role === 'admin' || u.role === 'internal_auditor');

  return {
    id: taskId,
    plan_id: planId,
    element_number: 14,
    title: 'Review and Organize All Documentation',
    description: 'Conduct a comprehensive review of all safety documentation to ensure completeness and organization for the audit.',
    priority: 'high',
    assigned_to: assignee?.id,
    assigned_to_name: assignee ? `${assignee.first_name} ${assignee.last_name}` : undefined,
    due_date: dueDate.toISOString().split('T')[0],
    estimated_hours: 8,
    status: 'todo',
    sort_order: 100,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    subtasks: [
      { id: generateId(), task_id: taskId, title: 'Collect all forms from the past 12 months', completed: false, sort_order: 0 },
      { id: generateId(), task_id: taskId, title: 'Organize forms by element number', completed: false, sort_order: 1 },
      { id: generateId(), task_id: taskId, title: 'Check for missing signatures/dates', completed: false, sort_order: 2 },
      { id: generateId(), task_id: taskId, title: 'Create evidence index for each element', completed: false, sort_order: 3 },
      { id: generateId(), task_id: taskId, title: 'File in audit binders', completed: false, sort_order: 4 }
    ],
    dependencies: []
  };
}

/**
 * Create mock audit task
 */
function createMockAuditTask(planId: string, users: User[], dueDate: Date): ActionTask {
  const taskId = generateId();
  const assignee = users.find(u => u.role === 'admin' || u.role === 'internal_auditor');

  return {
    id: taskId,
    plan_id: planId,
    element_number: 14,
    title: 'Conduct Mock Audit Interviews',
    description: 'Practice audit interviews with workers, supervisors, and management to ensure everyone is prepared for the real audit.',
    priority: 'high',
    assigned_to: assignee?.id,
    assigned_to_name: assignee ? `${assignee.first_name} ${assignee.last_name}` : undefined,
    due_date: dueDate.toISOString().split('T')[0],
    estimated_hours: 6,
    status: 'todo',
    sort_order: 101,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    subtasks: [
      { id: generateId(), task_id: taskId, title: 'Select 5-8 workers for mock interviews', completed: false, sort_order: 0 },
      { id: generateId(), task_id: taskId, title: 'Conduct mock interviews', completed: false, sort_order: 1 },
      { id: generateId(), task_id: taskId, title: 'Review interview results', completed: false, sort_order: 2 },
      { id: generateId(), task_id: taskId, title: 'Provide coaching where needed', completed: false, sort_order: 3 },
      { id: generateId(), task_id: taskId, title: 'Document any additional training needs', completed: false, sort_order: 4 }
    ],
    dependencies: []
  };
}

/**
 * Create final review task
 */
function createFinalReviewTask(planId: string, users: User[], dueDate: Date): ActionTask {
  const taskId = generateId();
  const assignee = users.find(u => u.role === 'admin');

  return {
    id: taskId,
    plan_id: planId,
    element_number: 14,
    title: 'Final Compliance Review',
    description: 'Conduct final review of all 14 elements to verify readiness. Address any last-minute issues.',
    priority: 'critical',
    assigned_to: assignee?.id,
    assigned_to_name: assignee ? `${assignee.first_name} ${assignee.last_name}` : undefined,
    due_date: dueDate.toISOString().split('T')[0],
    estimated_hours: 4,
    status: 'todo',
    sort_order: 102,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    subtasks: [
      { id: generateId(), task_id: taskId, title: 'Run compliance score check', completed: false, sort_order: 0 },
      { id: generateId(), task_id: taskId, title: 'Verify all critical gaps closed', completed: false, sort_order: 1 },
      { id: generateId(), task_id: taskId, title: 'Review all element scores', completed: false, sort_order: 2 },
      { id: generateId(), task_id: taskId, title: 'Sign off on audit readiness', completed: false, sort_order: 3 }
    ],
    dependencies: []
  };
}

/**
 * Create audit package task
 */
function createAuditPackageTask(planId: string, users: User[], dueDate: Date): ActionTask {
  const taskId = generateId();
  const assignee = users.find(u => u.role === 'admin' || u.role === 'internal_auditor');

  return {
    id: taskId,
    plan_id: planId,
    element_number: 14,
    title: 'Generate Final Audit Package',
    description: 'Generate the complete audit submission package and verify all evidence is properly organized.',
    priority: 'critical',
    assigned_to: assignee?.id,
    assigned_to_name: assignee ? `${assignee.first_name} ${assignee.last_name}` : undefined,
    due_date: dueDate.toISOString().split('T')[0],
    estimated_hours: 2,
    status: 'todo',
    sort_order: 103,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    subtasks: [
      { id: generateId(), task_id: taskId, title: 'Generate audit package PDF', completed: false, sort_order: 0 },
      { id: generateId(), task_id: taskId, title: 'Review generated package', completed: false, sort_order: 1 },
      { id: generateId(), task_id: taskId, title: 'Make any final corrections', completed: false, sort_order: 2 },
      { id: generateId(), task_id: taskId, title: 'Submit to certifying partner', completed: false, sort_order: 3 }
    ],
    dependencies: []
  };
}

// =============================================================================
// SUBTASK GENERATION
// =============================================================================

/**
 * Generate subtasks based on gap type
 */
function generateSubtasks(taskId: string, gap: Gap): ActionSubtask[] {
  const subtasks: ActionSubtask[] = [];
  const description = gap.description.toLowerCase();
  const action = gap.action_required.toLowerCase();

  // Worker-related subtasks (e.g., "9 workers need orientation")
  const workerMatch = description.match(/(\d+)\s*workers?/i);
  if (workerMatch && (description.includes('orientation') || description.includes('training'))) {
    const workerCount = parseInt(workerMatch[1]);
    for (let i = 1; i <= Math.min(workerCount, 10); i++) {
      subtasks.push({
        id: generateId(),
        task_id: taskId,
        title: `Complete ${description.includes('orientation') ? 'orientation' : 'training'} for worker ${i}`,
        completed: false,
        sort_order: i - 1
      });
    }
    if (workerCount > 10) {
      subtasks.push({
        id: generateId(),
        task_id: taskId,
        title: `Complete for remaining ${workerCount - 10} workers`,
        completed: false,
        sort_order: 10
      });
    }
    return subtasks;
  }

  // Emergency drill subtasks
  if (description.includes('emergency') && description.includes('drill')) {
    return [
      { id: generateId(), task_id: taskId, title: 'Schedule drill date and notify workers', completed: false, sort_order: 0 },
      { id: generateId(), task_id: taskId, title: 'Prepare drill scenario', completed: false, sort_order: 1 },
      { id: generateId(), task_id: taskId, title: 'Conduct emergency drill', completed: false, sort_order: 2 },
      { id: generateId(), task_id: taskId, title: 'Complete drill evaluation form', completed: false, sort_order: 3 },
      { id: generateId(), task_id: taskId, title: 'Address any issues identified', completed: false, sort_order: 4 }
    ];
  }

  // Policy document subtasks
  if (description.includes('policy') || action.includes('policy')) {
    return [
      { id: generateId(), task_id: taskId, title: 'Review current policy (if exists)', completed: false, sort_order: 0 },
      { id: generateId(), task_id: taskId, title: 'Draft new/updated policy document', completed: false, sort_order: 1 },
      { id: generateId(), task_id: taskId, title: 'Review with management', completed: false, sort_order: 2 },
      { id: generateId(), task_id: taskId, title: 'Obtain management signature', completed: false, sort_order: 3 },
      { id: generateId(), task_id: taskId, title: 'Distribute to all workers', completed: false, sort_order: 4 },
      { id: generateId(), task_id: taskId, title: 'Post in visible location', completed: false, sort_order: 5 }
    ];
  }

  // Inspection subtasks
  if (description.includes('inspection')) {
    return [
      { id: generateId(), task_id: taskId, title: 'Create/update inspection checklist', completed: false, sort_order: 0 },
      { id: generateId(), task_id: taskId, title: 'Schedule inspections', completed: false, sort_order: 1 },
      { id: generateId(), task_id: taskId, title: 'Conduct inspections', completed: false, sort_order: 2 },
      { id: generateId(), task_id: taskId, title: 'Document findings', completed: false, sort_order: 3 },
      { id: generateId(), task_id: taskId, title: 'Complete corrective actions', completed: false, sort_order: 4 }
    ];
  }

  // Hazard assessment subtasks
  if (description.includes('hazard') && (description.includes('assessment') || action.includes('assessment'))) {
    return [
      { id: generateId(), task_id: taskId, title: 'Identify work activities to assess', completed: false, sort_order: 0 },
      { id: generateId(), task_id: taskId, title: 'Conduct hazard identification', completed: false, sort_order: 1 },
      { id: generateId(), task_id: taskId, title: 'Assess risk levels', completed: false, sort_order: 2 },
      { id: generateId(), task_id: taskId, title: 'Document control measures', completed: false, sort_order: 3 },
      { id: generateId(), task_id: taskId, title: 'Review with affected workers', completed: false, sort_order: 4 }
    ];
  }

  // PPE subtasks
  if (description.includes('ppe') || description.includes('protective equipment')) {
    return [
      { id: generateId(), task_id: taskId, title: 'Assess PPE requirements', completed: false, sort_order: 0 },
      { id: generateId(), task_id: taskId, title: 'Procure required PPE', completed: false, sort_order: 1 },
      { id: generateId(), task_id: taskId, title: 'Train workers on proper use', completed: false, sort_order: 2 },
      { id: generateId(), task_id: taskId, title: 'Document PPE issuance', completed: false, sort_order: 3 }
    ];
  }

  // Default subtasks for any task
  return [
    { id: generateId(), task_id: taskId, title: 'Review requirements', completed: false, sort_order: 0 },
    { id: generateId(), task_id: taskId, title: 'Complete required action', completed: false, sort_order: 1 },
    { id: generateId(), task_id: taskId, title: 'Document completion', completed: false, sort_order: 2 },
    { id: generateId(), task_id: taskId, title: 'Verify effectiveness', completed: false, sort_order: 3 }
  ];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Sort gaps by priority (critical first, then by element number)
 */
function sortGapsByPriority(gaps: Gap[]): Gap[] {
  const severityOrder = { critical: 0, major: 1, minor: 2 };
  return [...gaps].sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.element_number - b.element_number;
  });
}

/**
 * Determine best assignee for a task
 */
function determineAssignee(gap: Gap, users: User[]): User | undefined {
  const category = categorizeGap(gap);
  // Safe: category is derived from categorizeGap() which returns controlled string literals from a fixed set
  // eslint-disable-next-line security/detect-object-injection
  const preferredRoles = ASSIGNMENT_RULES[category] || ASSIGNMENT_RULES.default;

  // Find user with preferred role
  for (const role of preferredRoles) {
    const user = users.find(u => u.role === role);
    if (user) return user;
  }

  // Fall back to any admin
  return users.find(u => u.role === 'admin') || users[0];
}

/**
 * Categorize a gap for assignment purposes
 */
function categorizeGap(gap: Gap): string {
  const text = `${gap.description} ${gap.action_required}`.toLowerCase();

  if (text.includes('training') || text.includes('orientation') || text.includes('competenc')) {
    return 'training';
  }
  if (text.includes('policy') || text.includes('procedure') || text.includes('document')) {
    return 'documentation';
  }
  if (text.includes('equipment') || text.includes('maintenance') || text.includes('vehicle')) {
    return 'equipment';
  }
  if (text.includes('inspection') || text.includes('audit') || text.includes('review')) {
    return 'inspection';
  }
  if (text.includes('contractor') || text.includes('subcontractor')) {
    return 'contractor';
  }
  if (text.includes('emergency') || text.includes('drill') || text.includes('evacuation')) {
    return 'emergency';
  }
  if (text.includes('hazard') || text.includes('risk') || text.includes('jha')) {
    return 'hazard';
  }
  if (text.includes('ppe') || text.includes('protective') || text.includes('safety equipment')) {
    return 'ppe';
  }
  if (text.includes('form')) {
    return 'forms';
  }

  return 'default';
}

/**
 * Calculate due date for a task within a phase
 */
function calculateDueDate(
  gap: Gap,
  phaseStart: Date,
  phaseEnd: Date,
  index: number
): Date {
  const phaseDuration = phaseEnd.getTime() - phaseStart.getTime();
  const taskCount = Math.max(1, 10); // Assume max 10 tasks per phase for spacing
  const offset = (phaseDuration / taskCount) * (index + 1);
  
  // Critical gaps get shorter deadlines
  let adjustedOffset = offset;
  if (gap.severity === 'critical') {
    adjustedOffset = offset * 0.6;
  } else if (gap.severity === 'major') {
    adjustedOffset = offset * 0.8;
  }

  const dueDate = new Date(phaseStart.getTime() + adjustedOffset);
  
  // Don't exceed phase end date
  return dueDate > phaseEnd ? phaseEnd : dueDate;
}

/**
 * Build task description from gap
 */
function buildTaskDescription(gap: Gap): string {
  const element = COR_ELEMENTS.find(e => e.number === gap.element_number);
  let description = gap.description;
  
  if (gap.requirement_description && gap.requirement_description !== gap.description) {
    description += `\n\nRequirement: ${gap.requirement_description}`;
  }
  
  description += `\n\nThis task addresses a compliance gap in Element ${gap.element_number}: ${element?.name || 'Unknown'}.`;
  
  return description;
}

/**
 * Map gap severity to task priority
 */
function mapSeverityToPriority(severity: string): TaskPriority {
  switch (severity) {
    case 'critical': return 'critical';
    case 'major': return 'high';
    case 'minor': return 'medium';
    default: return 'medium';
  }
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// PLAN STATISTICS
// =============================================================================

/**
 * Calculate plan statistics
 */
export function calculatePlanStats(plan: ActionPlan): {
  overdueTasks: ActionTask[];
  dueSoon: ActionTask[];
  blockedTasks: ActionTask[];
  userWorkloads: Record<string, number>;
  statusSummary: Record<TaskStatus, number>;
  prioritySummary: Record<TaskPriority, number>;
} {
  const allTasks = plan.phases.flatMap(p => p.tasks);
  const now = new Date();
  const soonDate = addDays(now, 7);

  const overdueTasks = allTasks.filter(t => 
    t.status !== 'completed' && t.status !== 'cancelled' && new Date(t.due_date) < now
  );

  const dueSoon = allTasks.filter(t => 
    t.status !== 'completed' && t.status !== 'cancelled' && 
    new Date(t.due_date) >= now && new Date(t.due_date) <= soonDate
  );

  const blockedTasks = allTasks.filter(t => t.status === 'blocked');

  const userWorkloads: Record<string, number> = {};
  for (const task of allTasks) {
    if (task.assigned_to && task.status !== 'completed' && task.status !== 'cancelled') {
      const key = task.assigned_to_name || task.assigned_to;
      // Safe: key is from task.assigned_to_name or task.assigned_to which are user display names/IDs from the database
      // eslint-disable-next-line security/detect-object-injection
      userWorkloads[key] = (userWorkloads[key] || 0) + 1;
    }
  }

  const statusSummary: Record<TaskStatus, number> = {
    todo: 0, in_progress: 0, blocked: 0, review: 0, completed: 0, cancelled: 0
  };
  const prioritySummary: Record<TaskPriority, number> = {
    critical: 0, high: 0, medium: 0, low: 0
  };

  for (const task of allTasks) {
    statusSummary[task.status]++;
    prioritySummary[task.priority]++;
  }

  return {
    overdueTasks,
    dueSoon,
    blockedTasks,
    userWorkloads,
    statusSummary,
    prioritySummary
  };
}

/**
 * Get tasks needing attention
 */
export function getTasksNeedingAttention(plan: ActionPlan): {
  message: string;
  severity: 'warning' | 'error' | 'info';
}[] {
  const stats = calculatePlanStats(plan);
  const alerts: { message: string; severity: 'warning' | 'error' | 'info' }[] = [];

  if (stats.overdueTasks.length > 0) {
    alerts.push({
      message: `${stats.overdueTasks.length} task${stats.overdueTasks.length > 1 ? 's' : ''} overdue`,
      severity: 'error'
    });
  }

  if (stats.dueSoon.length > 0) {
    alerts.push({
      message: `${stats.dueSoon.length} task${stats.dueSoon.length > 1 ? 's' : ''} due this week`,
      severity: 'warning'
    });
  }

  if (stats.blockedTasks.length > 0) {
    alerts.push({
      message: `${stats.blockedTasks.length} task${stats.blockedTasks.length > 1 ? 's' : ''} blocked`,
      severity: 'warning'
    });
  }

  // Check for overloaded users
  for (const [user, count] of Object.entries(stats.userWorkloads)) {
    if (count > 8) {
      alerts.push({
        message: `${user} has ${count} open tasks (consider reassigning)`,
        severity: 'info'
      });
    }
  }

  return alerts;
}
