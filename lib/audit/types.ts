// COR Audit Types and Constants
// Based on IHSA COR (Certificate of Recognition) audit requirements

export interface CORElement {
  number: number;
  name: string;
  description: string;
  weight: number; // Percentage weight in audit
  requiredForms: string[];
  auditQuestions: AuditQuestion[];
}

export interface AuditQuestion {
  id: string;
  elementNumber: number;
  questionNumber: string;
  question: string;
  category: 'documentation' | 'interview' | 'observation';
  maxPoints: number;
  evidenceTypes: string[];
}

export interface EvidenceItem {
  id: string;
  type: 'form' | 'training' | 'inspection' | 'drill' | 'meeting' | 'certificate' | 'policy';
  title: string;
  formCode?: string;
  date: string;
  status: 'complete' | 'partial' | 'missing' | 'expired';
  linkedQuestions: string[];
  expiryDate?: string;
}

export interface ComplianceScore {
  elementNumber: number;
  elementName: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: 'passing' | 'at-risk' | 'failing';
  gaps: GapItem[];
}

export interface GapItem {
  id: string;
  elementNumber: number;
  type: 'missing_form' | 'overdue_inspection' | 'expired_training' | 'missing_drill' | 'incomplete_documentation';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  dueDate?: string;
  actionItem: string;
  estimatedTime: string;
}

export interface TimelineProjection {
  currentReadiness: number;
  projectedReadyDate: string;
  criticalPath: CriticalPathItem[];
  milestones: Milestone[];
}

export interface CriticalPathItem {
  id: string;
  task: string;
  dependency?: string;
  duration: number; // days
  startDate: string;
  endDate: string;
  status: 'completed' | 'in_progress' | 'pending' | 'blocked';
}

export interface Milestone {
  id: string;
  name: string;
  date: string;
  status: 'completed' | 'upcoming' | 'at_risk' | 'overdue';
  tasks: string[];
}

export interface MockAuditQuestion {
  id: string;
  elementNumber: number;
  question: string;
  category: 'worker' | 'supervisor' | 'management';
  expectedKeywords: string[];
  sampleAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface AuditPackageSection {
  elementNumber: number;
  elementName: string;
  evidence: PackageEvidence[];
  summary: string;
}

export interface PackageEvidence {
  type: string;
  title: string;
  date: string;
  description: string;
  pageCount: number;
}

// COR 14 Elements Definition
export const COR_ELEMENTS: CORElement[] = [
  {
    number: 1,
    name: 'Health & Safety Policy',
    description: 'Written health and safety policy signed by senior management',
    weight: 5,
    requiredForms: ['safety_policy', 'policy_acknowledgment'],
    auditQuestions: [
      { id: '1.1', elementNumber: 1, questionNumber: '1.1', question: 'Is there a written health and safety policy?', category: 'documentation', maxPoints: 5, evidenceTypes: ['policy'] },
      { id: '1.2', elementNumber: 1, questionNumber: '1.2', question: 'Is the policy signed by senior management?', category: 'documentation', maxPoints: 5, evidenceTypes: ['policy'] },
      { id: '1.3', elementNumber: 1, questionNumber: '1.3', question: 'Is the policy communicated to all workers?', category: 'interview', maxPoints: 5, evidenceTypes: ['form', 'training'] },
    ]
  },
  {
    number: 2,
    name: 'Hazard Assessment',
    description: 'Identifying, assessing, and controlling workplace hazards',
    weight: 10,
    requiredForms: ['hazard_assessment', 'hazard_reporting', 'jha_form'],
    auditQuestions: [
      { id: '2.1', elementNumber: 2, questionNumber: '2.1', question: 'Are formal hazard assessments conducted?', category: 'documentation', maxPoints: 10, evidenceTypes: ['form', 'inspection'] },
      { id: '2.2', elementNumber: 2, questionNumber: '2.2', question: 'Are hazard controls implemented and documented?', category: 'documentation', maxPoints: 10, evidenceTypes: ['form'] },
      { id: '2.3', elementNumber: 2, questionNumber: '2.3', question: 'Are workers involved in hazard identification?', category: 'interview', maxPoints: 10, evidenceTypes: ['form', 'meeting'] },
    ]
  },
  {
    number: 3,
    name: 'Safe Work Practices',
    description: 'Written safe work procedures and practices',
    weight: 10,
    requiredForms: ['swp_form', 'sop_acknowledgment', 'critical_task_analysis'],
    auditQuestions: [
      { id: '3.1', elementNumber: 3, questionNumber: '3.1', question: 'Are safe work practices documented?', category: 'documentation', maxPoints: 10, evidenceTypes: ['policy', 'form'] },
      { id: '3.2', elementNumber: 3, questionNumber: '3.2', question: 'Are workers trained on safe work practices?', category: 'interview', maxPoints: 10, evidenceTypes: ['training'] },
      { id: '3.3', elementNumber: 3, questionNumber: '3.3', question: 'Are safe work practices followed?', category: 'observation', maxPoints: 10, evidenceTypes: ['inspection'] },
    ]
  },
  {
    number: 4,
    name: 'Safe Job Procedures',
    description: 'Step-by-step safe job procedures for critical tasks',
    weight: 10,
    requiredForms: ['sjp_form', 'task_analysis', 'lockout_tagout'],
    auditQuestions: [
      { id: '4.1', elementNumber: 4, questionNumber: '4.1', question: 'Are safe job procedures written for critical tasks?', category: 'documentation', maxPoints: 10, evidenceTypes: ['policy', 'form'] },
      { id: '4.2', elementNumber: 4, questionNumber: '4.2', question: 'Are procedures accessible to workers?', category: 'observation', maxPoints: 10, evidenceTypes: ['form'] },
      { id: '4.3', elementNumber: 4, questionNumber: '4.3', question: 'Do workers follow safe job procedures?', category: 'interview', maxPoints: 10, evidenceTypes: ['inspection', 'training'] },
    ]
  },
  {
    number: 5,
    name: 'Company Safety Rules',
    description: 'Established safety rules and enforcement procedures',
    weight: 5,
    requiredForms: ['safety_rules', 'rule_violation_report', 'disciplinary_action'],
    auditQuestions: [
      { id: '5.1', elementNumber: 5, questionNumber: '5.1', question: 'Are company safety rules documented?', category: 'documentation', maxPoints: 5, evidenceTypes: ['policy'] },
      { id: '5.2', elementNumber: 5, questionNumber: '5.2', question: 'Are safety rules communicated to workers?', category: 'interview', maxPoints: 5, evidenceTypes: ['training', 'form'] },
      { id: '5.3', elementNumber: 5, questionNumber: '5.3', question: 'Is there a progressive discipline system?', category: 'documentation', maxPoints: 5, evidenceTypes: ['policy', 'form'] },
    ]
  },
  {
    number: 6,
    name: 'Personal Protective Equipment',
    description: 'PPE selection, provision, training, and use',
    weight: 5,
    requiredForms: ['ppe_assessment', 'ppe_issuance', 'ppe_inspection'],
    auditQuestions: [
      { id: '6.1', elementNumber: 6, questionNumber: '6.1', question: 'Is PPE hazard assessment conducted?', category: 'documentation', maxPoints: 5, evidenceTypes: ['form', 'inspection'] },
      { id: '6.2', elementNumber: 6, questionNumber: '6.2', question: 'Is PPE provided and maintained?', category: 'observation', maxPoints: 5, evidenceTypes: ['form'] },
      { id: '6.3', elementNumber: 6, questionNumber: '6.3', question: 'Are workers trained on PPE use?', category: 'interview', maxPoints: 5, evidenceTypes: ['training'] },
    ]
  },
  {
    number: 7,
    name: 'Preventative Maintenance',
    description: 'Equipment maintenance and inspection programs',
    weight: 5,
    requiredForms: ['equipment_inspection', 'maintenance_log', 'pre_use_inspection'],
    auditQuestions: [
      { id: '7.1', elementNumber: 7, questionNumber: '7.1', question: 'Is there a preventative maintenance program?', category: 'documentation', maxPoints: 5, evidenceTypes: ['policy', 'form'] },
      { id: '7.2', elementNumber: 7, questionNumber: '7.2', question: 'Are equipment inspections documented?', category: 'documentation', maxPoints: 5, evidenceTypes: ['form', 'inspection'] },
      { id: '7.3', elementNumber: 7, questionNumber: '7.3', question: 'Is defective equipment taken out of service?', category: 'interview', maxPoints: 5, evidenceTypes: ['form'] },
    ]
  },
  {
    number: 8,
    name: 'Training & Communication',
    description: 'Safety training and communication programs',
    weight: 10,
    requiredForms: ['training_record', 'toolbox_talk', 'orientation_checklist'],
    auditQuestions: [
      { id: '8.1', elementNumber: 8, questionNumber: '8.1', question: 'Is there a formal training program?', category: 'documentation', maxPoints: 10, evidenceTypes: ['policy', 'training'] },
      { id: '8.2', elementNumber: 8, questionNumber: '8.2', question: 'Are training records maintained?', category: 'documentation', maxPoints: 10, evidenceTypes: ['form', 'training'] },
      { id: '8.3', elementNumber: 8, questionNumber: '8.3', question: 'Is safety communication effective?', category: 'interview', maxPoints: 10, evidenceTypes: ['form', 'meeting'] },
    ]
  },
  {
    number: 9,
    name: 'Workplace Inspections',
    description: 'Regular workplace safety inspections',
    weight: 10,
    requiredForms: ['workplace_inspection', 'inspection_corrective_action', 'site_audit'],
    auditQuestions: [
      { id: '9.1', elementNumber: 9, questionNumber: '9.1', question: 'Are regular workplace inspections conducted?', category: 'documentation', maxPoints: 10, evidenceTypes: ['form', 'inspection'] },
      { id: '9.2', elementNumber: 9, questionNumber: '9.2', question: 'Are inspection findings corrected?', category: 'documentation', maxPoints: 10, evidenceTypes: ['form'] },
      { id: '9.3', elementNumber: 9, questionNumber: '9.3', question: 'Do workers participate in inspections?', category: 'interview', maxPoints: 10, evidenceTypes: ['form'] },
    ]
  },
  {
    number: 10,
    name: 'Incident Investigation',
    description: 'Incident reporting, investigation, and corrective actions',
    weight: 10,
    requiredForms: ['incident_report', 'incident_investigation', 'corrective_action', 'near_miss_report'],
    auditQuestions: [
      { id: '10.1', elementNumber: 10, questionNumber: '10.1', question: 'Is there an incident reporting system?', category: 'documentation', maxPoints: 10, evidenceTypes: ['policy', 'form'] },
      { id: '10.2', elementNumber: 10, questionNumber: '10.2', question: 'Are incidents investigated?', category: 'documentation', maxPoints: 10, evidenceTypes: ['form'] },
      { id: '10.3', elementNumber: 10, questionNumber: '10.3', question: 'Are corrective actions implemented?', category: 'documentation', maxPoints: 10, evidenceTypes: ['form'] },
    ]
  },
  {
    number: 11,
    name: 'Emergency Preparedness',
    description: 'Emergency response plans, drills, and equipment',
    weight: 5,
    requiredForms: ['emergency_plan', 'emergency_drill', 'fire_drill_log', 'evacuation_record'],
    auditQuestions: [
      { id: '11.1', elementNumber: 11, questionNumber: '11.1', question: 'Is there a written emergency response plan?', category: 'documentation', maxPoints: 5, evidenceTypes: ['policy'] },
      { id: '11.2', elementNumber: 11, questionNumber: '11.2', question: 'Are emergency drills conducted?', category: 'documentation', maxPoints: 5, evidenceTypes: ['form', 'drill'] },
      { id: '11.3', elementNumber: 11, questionNumber: '11.3', question: 'Do workers know emergency procedures?', category: 'interview', maxPoints: 5, evidenceTypes: ['training'] },
    ]
  },
  {
    number: 12,
    name: 'Statistics & Records',
    description: 'Safety statistics tracking and record keeping',
    weight: 5,
    requiredForms: ['injury_log', 'first_aid_log', 'safety_statistics'],
    auditQuestions: [
      { id: '12.1', elementNumber: 12, questionNumber: '12.1', question: 'Are safety statistics tracked?', category: 'documentation', maxPoints: 5, evidenceTypes: ['form'] },
      { id: '12.2', elementNumber: 12, questionNumber: '12.2', question: 'Are records properly maintained?', category: 'documentation', maxPoints: 5, evidenceTypes: ['form'] },
      { id: '12.3', elementNumber: 12, questionNumber: '12.3', question: 'Are statistics used for improvement?', category: 'interview', maxPoints: 5, evidenceTypes: ['meeting', 'form'] },
    ]
  },
  {
    number: 13,
    name: 'Legislation & Compliance',
    description: 'Compliance with health and safety legislation',
    weight: 5,
    requiredForms: ['compliance_checklist', 'regulatory_update_log', 'wsib_form_7'],
    auditQuestions: [
      { id: '13.1', elementNumber: 13, questionNumber: '13.1', question: 'Is legislation accessible to workers?', category: 'observation', maxPoints: 5, evidenceTypes: ['policy'] },
      { id: '13.2', elementNumber: 13, questionNumber: '13.2', question: 'Is the company compliant with legislation?', category: 'documentation', maxPoints: 5, evidenceTypes: ['form', 'inspection'] },
      { id: '13.3', elementNumber: 13, questionNumber: '13.3', question: 'Are regulatory requirements tracked?', category: 'documentation', maxPoints: 5, evidenceTypes: ['form'] },
    ]
  },
  {
    number: 14,
    name: 'Management Review',
    description: 'Regular management review of safety program',
    weight: 5,
    requiredForms: ['management_review', 'safety_meeting_minutes', 'annual_review'],
    auditQuestions: [
      { id: '14.1', elementNumber: 14, questionNumber: '14.1', question: 'Does management review the safety program?', category: 'documentation', maxPoints: 5, evidenceTypes: ['meeting', 'form'] },
      { id: '14.2', elementNumber: 14, questionNumber: '14.2', question: 'Are improvements identified and implemented?', category: 'documentation', maxPoints: 5, evidenceTypes: ['form'] },
      { id: '14.3', elementNumber: 14, questionNumber: '14.3', question: 'Is senior management committed to safety?', category: 'interview', maxPoints: 5, evidenceTypes: ['meeting'] },
    ]
  },
];

// Mock audit interview questions for simulator
export const MOCK_AUDIT_QUESTIONS: MockAuditQuestion[] = [
  // Worker Questions
  {
    id: 'w1',
    elementNumber: 1,
    question: 'What is your company\'s safety policy and where can you find it?',
    category: 'worker',
    expectedKeywords: ['policy', 'posted', 'bulletin board', 'safety', 'handbook'],
    sampleAnswer: 'Our company has a health and safety policy that states all workers have the right to a safe workplace. It\'s posted on the bulletin board and in our employee handbook.',
    difficulty: 'easy'
  },
  {
    id: 'w2',
    elementNumber: 2,
    question: 'How do you report a hazard you discover at work?',
    category: 'worker',
    expectedKeywords: ['report', 'supervisor', 'form', 'immediately', 'hazard'],
    sampleAnswer: 'I report hazards immediately to my supervisor and fill out a hazard report form. If it\'s urgent, I can also use the emergency contact number.',
    difficulty: 'easy'
  },
  {
    id: 'w3',
    elementNumber: 6,
    question: 'What PPE is required for your job and how do you know when it needs replacement?',
    category: 'worker',
    expectedKeywords: ['PPE', 'hard hat', 'safety glasses', 'inspect', 'damaged', 'replacement'],
    sampleAnswer: 'I need a hard hat, safety glasses, and steel-toe boots. I inspect them daily before use and request replacement when they\'re damaged or worn out.',
    difficulty: 'medium'
  },
  {
    id: 'w4',
    elementNumber: 10,
    question: 'What would you do if you witnessed a workplace incident?',
    category: 'worker',
    expectedKeywords: ['help', 'first aid', 'report', 'supervisor', 'scene', 'secure'],
    sampleAnswer: 'I would ensure the scene is safe, help the injured person if trained to do so, call for first aid, report to my supervisor immediately, and not disturb the scene.',
    difficulty: 'medium'
  },
  {
    id: 'w5',
    elementNumber: 11,
    question: 'What is the emergency evacuation procedure and where is your muster point?',
    category: 'worker',
    expectedKeywords: ['alarm', 'exit', 'muster point', 'assembly', 'evacuate', 'headcount'],
    sampleAnswer: 'When the alarm sounds, I stop work, leave via the nearest exit, go to the muster point in the north parking lot, and wait for a headcount.',
    difficulty: 'easy'
  },
  // Supervisor Questions
  {
    id: 's1',
    elementNumber: 8,
    question: 'How do you ensure workers are competent to perform their tasks safely?',
    category: 'supervisor',
    expectedKeywords: ['training', 'orientation', 'competency', 'observe', 'verify', 'records'],
    sampleAnswer: 'I ensure workers complete orientation and task-specific training before starting work. I verify competency through observation and maintain training records.',
    difficulty: 'medium'
  },
  {
    id: 's2',
    elementNumber: 9,
    question: 'How often do you conduct workplace inspections and what do you do with findings?',
    category: 'supervisor',
    expectedKeywords: ['weekly', 'monthly', 'inspect', 'document', 'correct', 'follow up'],
    sampleAnswer: 'I conduct weekly workplace inspections using a checklist. Findings are documented, corrective actions assigned with deadlines, and I follow up to ensure completion.',
    difficulty: 'medium'
  },
  {
    id: 's3',
    elementNumber: 3,
    question: 'How do you ensure workers follow safe work practices?',
    category: 'supervisor',
    expectedKeywords: ['observe', 'correct', 'train', 'discipline', 'positive', 'recognition'],
    sampleAnswer: 'I regularly observe work activities, correct unsafe behaviors immediately, provide additional training if needed, and recognize workers who follow safe practices.',
    difficulty: 'hard'
  },
  // Management Questions
  {
    id: 'm1',
    elementNumber: 14,
    question: 'How does management demonstrate commitment to health and safety?',
    category: 'management',
    expectedKeywords: ['resources', 'meetings', 'review', 'policy', 'participation', 'budget'],
    sampleAnswer: 'Management demonstrates commitment by allocating budget for safety, participating in safety meetings, reviewing safety performance monthly, and being visible on site.',
    difficulty: 'hard'
  },
  {
    id: 'm2',
    elementNumber: 1,
    question: 'How is the health and safety policy communicated throughout the organization?',
    category: 'management',
    expectedKeywords: ['orientation', 'posted', 'meetings', 'review', 'signed', 'communication'],
    sampleAnswer: 'The policy is reviewed during orientation, posted in all work areas, discussed in safety meetings, and workers sign acknowledgment forms.',
    difficulty: 'medium'
  },
];

// Passing threshold for COR audit
export const COR_PASSING_THRESHOLD = 80;

// Status colors
export const STATUS_COLORS = {
  passing: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'at-risk': { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  failing: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  complete: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  partial: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  missing: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  expired: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
};
