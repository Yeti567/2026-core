/**
 * Mock Interview AI Logic
 * 
 * Core functionality for conducting AI-powered mock COR audit interviews.
 * Uses Claude AI to simulate realistic auditor interactions.
 */

import {
  MOCK_AUDITOR_SYSTEM_PROMPT,
  MOCK_AUDITOR_CONCLUSION_PROMPT,
  RESPONSE_EVALUATION_PROMPT,
  AUDIT_TYPE_INSTRUCTIONS,
  COR_ELEMENT_FOCUS,
  WORKER_CONTEXT_TEMPLATE
} from './mock-audit-prompts';
import {
  selectQuestionsForInterview,
  type InterviewQuestion
} from './interview-questions';

// =============================================================================
// TYPES
// =============================================================================

export type AuditType = 'full' | 'quick' | 'element_specific';
export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface WorkerProfile {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department?: string;
  yearsExperience?: number;
  recentTraining?: string[];
}

export interface InterviewMessage {
  id: string;
  role: 'auditor' | 'worker';
  content: string;
  timestamp: string;
  questionId?: string;
}

export interface ResponseEvaluation {
  questionId: string;
  score: number;
  reasoning: string;
  keyPointsCovered: string[];
  missingPoints: string[];
  wouldPassAudit: boolean;
}

export interface InterviewSession {
  id: string;
  companyId: string;
  workerId?: string;
  userProfileId?: string;
  auditType: AuditType;
  focusElement?: number;
  startedAt: string;
  completedAt?: string;
  messages: InterviewMessage[];
  scores: Record<string, ResponseEvaluation>;
  questionsAsked: string[];
  currentQuestionId?: string;
  status: SessionStatus;
  isAnonymous: boolean;
  selectedQuestions: InterviewQuestion[];
  questionIndex: number;
}

export interface InterviewReport {
  sessionId: string;
  workerId?: string;
  completedAt: string;
  durationMinutes: number;
  overallScore: number;
  questionsAsked: number;
  questionsAnsweredWell: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  feedback: string;
  readyForAudit: boolean;
  assessment: 'pass' | 'needs_improvement' | 'needs_significant_work';
}

export interface AIResponse {
  content: string;
  error?: string;
}

// =============================================================================
// INTERVIEW SESSION MANAGEMENT
// =============================================================================

/**
 * Create a new mock interview session
 */
export function createInterviewSession(
  companyId: string,
  auditType: AuditType,
  worker?: WorkerProfile,
  focusElement?: number,
  isAnonymous: boolean = false
): InterviewSession {
  const workerRole = worker?.position?.toLowerCase().includes('supervisor') 
    ? 'supervisor' 
    : worker?.position?.toLowerCase().includes('manager') 
      ? 'management' 
      : 'worker';

  const selectedQuestions = selectQuestionsForInterview(
    auditType,
    workerRole,
    focusElement
  );

  return {
    id: generateSessionId(),
    companyId,
    workerId: worker?.id,
    auditType,
    focusElement,
    startedAt: new Date().toISOString(),
    messages: [],
    scores: {},
    questionsAsked: [],
    status: 'in_progress',
    isAnonymous,
    selectedQuestions,
    questionIndex: 0
  };
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// AI INTERACTION FUNCTIONS
// =============================================================================

/**
 * Build the system prompt with worker context
 */
export function buildSystemPrompt(
  session: InterviewSession,
  worker?: WorkerProfile,
  companyName?: string
): string {
  let prompt = MOCK_AUDITOR_SYSTEM_PROMPT;

  // Add audit type instructions
  // Safe: session.auditType is a typed AuditType enum ('full' | 'quick' | 'element_specific')
   
  prompt += '\n\n' + AUDIT_TYPE_INSTRUCTIONS[session.auditType];

  // Add element focus if applicable
  if (session.auditType === 'element_specific' && session.focusElement) {
    const elementInfo = COR_ELEMENT_FOCUS[session.focusElement as keyof typeof COR_ELEMENT_FOCUS];
    if (elementInfo) {
      prompt += `\n\nFOCUS ELEMENT ${session.focusElement}: ${elementInfo}`;
    }
  }

  // Add worker context
  if (worker) {
    const workerContext = WORKER_CONTEXT_TEMPLATE
      .replace('{{name}}', `${worker.firstName} ${worker.lastName}`)
      .replace('{{position}}', worker.position || 'Worker')
      .replace('{{department}}', worker.department || 'General')
      .replace('{{years_experience}}', String(worker.yearsExperience || 'Not specified'))
      .replace('{{recent_training}}', worker.recentTraining?.join(', ') || 'Not specified')
      .replace('{{audit_type}}', session.auditType)
      .replace('{{focus_areas}}', session.focusElement ? `Element ${session.focusElement}` : 'All elements')
      .replace('{{company_name}}', companyName || 'the company');

    prompt += '\n' + workerContext;
  }

  // Add current progress context
  prompt += `\n\nCURRENT PROGRESS:
- Questions asked: ${session.questionsAsked.length}
- Target questions: ${session.selectedQuestions.length}
- Interview status: ${session.status}`;

  return prompt;
}

/**
 * Build the opening message for the interview
 */
export function buildOpeningInstruction(
  session: InterviewSession,
  worker?: WorkerProfile
): string {
  const name = worker ? worker.firstName : 'the worker';
  const firstQuestion = session.selectedQuestions[0];
  
  return `Begin the COR audit interview with ${name}. Introduce yourself warmly as a COR auditor, explain that you'll be asking some questions about workplace safety, and that there are no trick questions - you just want to understand how things work here. Make them feel comfortable, then ask your first question which should be about: "${firstQuestion?.question || 'their understanding of their safety rights as a worker'}"`;
}

/**
 * Build instruction for continuing the interview
 */
export function buildContinuationInstruction(
  session: InterviewSession,
  workerResponse: string
): string {
  const nextQuestionIndex = session.questionIndex;
  // Safe: nextQuestionIndex is from session.questionIndex which is a controlled integer index
  // eslint-disable-next-line security/detect-object-injection
  const nextQuestion = session.selectedQuestions[nextQuestionIndex];
  const isNearEnd = nextQuestionIndex >= session.selectedQuestions.length - 1;
  const isComplete = nextQuestionIndex >= session.selectedQuestions.length;

  if (isComplete) {
    return `The worker responded: "${workerResponse}"

This is the end of the interview. Thank the worker for their time, let them know they did well (be specific about something they answered well if possible), and ask if they have any questions for you. Keep it brief and professional.`;
  }

  if (isNearEnd) {
    return `The worker responded: "${workerResponse}"

Acknowledge their answer briefly. You have one more main question to ask. Your next question should be about: "${nextQuestion?.question}"

After this question and their response, you'll wrap up the interview.`;
  }

  return `The worker responded: "${workerResponse}"

Acknowledge their answer (briefly - one sentence is fine unless you need to ask a follow-up). Then ask your next question. Your next question should be about: "${nextQuestion?.question}"

Keep the conversation flowing naturally. You don't need to comment extensively on every answer.`;
}

/**
 * Parse AI response for evaluation
 */
export function parseEvaluationResponse(responseText: string): ResponseEvaluation | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        questionId: '',
        score: parsed.score || 3,
        reasoning: parsed.reasoning || '',
        keyPointsCovered: parsed.key_points_covered || [],
        missingPoints: parsed.missing_points || [],
        wouldPassAudit: parsed.would_pass_audit ?? parsed.score >= 3
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse AI response for final report
 */
export function parseReportResponse(responseText: string): Partial<InterviewReport> | null {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        overallScore: parsed.score_percentage || 0,
        readyForAudit: parsed.ready_for_audit ?? false,
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        recommendations: parsed.recommendations || [],
        feedback: parsed.summary || '',
        assessment: parsed.assessment || 'needs_improvement'
      };
    }
    return null;
  } catch {
    return null;
  }
}

// =============================================================================
// SCORING AND REPORTING
// =============================================================================

/**
 * Calculate overall score from individual evaluations
 */
export function calculateOverallScore(scores: Record<string, ResponseEvaluation>): number {
  const evaluations = Object.values(scores);
  if (evaluations.length === 0) return 0;

  const totalScore = evaluations.reduce((sum, e) => sum + e.score, 0);
  const maxScore = evaluations.length * 5;
  
  return Math.round((totalScore / maxScore) * 100);
}

/**
 * Calculate interview duration in minutes
 */
export function calculateDuration(session: InterviewSession): number {
  const start = new Date(session.startedAt);
  const end = session.completedAt ? new Date(session.completedAt) : new Date();
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

/**
 * Determine if worker is ready for audit based on score
 */
export function isReadyForAudit(score: number): boolean {
  return score >= 70;
}

/**
 * Get assessment category based on score
 */
export function getAssessment(score: number): 'pass' | 'needs_improvement' | 'needs_significant_work' {
  if (score >= 70) return 'pass';
  if (score >= 50) return 'needs_improvement';
  return 'needs_significant_work';
}

/**
 * Generate a basic report from session data
 */
export function generateBasicReport(session: InterviewSession): InterviewReport {
  const overallScore = calculateOverallScore(session.scores);
  const evaluations = Object.values(session.scores);
  const questionsAnsweredWell = evaluations.filter(e => e.score >= 3).length;

  // Extract strengths and weaknesses from evaluations
  const strengths = new Set<string>();
  const weaknesses = new Set<string>();

  for (const evaluation of evaluations) {
    for (const point of evaluation.keyPointsCovered) {
      strengths.add(point);
    }
    for (const point of evaluation.missingPoints) {
      weaknesses.add(point);
    }
  }

  return {
    sessionId: session.id,
    workerId: session.workerId,
    completedAt: new Date().toISOString(),
    durationMinutes: calculateDuration(session),
    overallScore,
    questionsAsked: session.questionsAsked.length,
    questionsAnsweredWell,
    strengths: Array.from(strengths).slice(0, 5),
    weaknesses: Array.from(weaknesses).slice(0, 5),
    recommendations: generateRecommendations(Array.from(weaknesses)),
    feedback: generateBasicFeedback(overallScore, questionsAnsweredWell, session.questionsAsked.length),
    readyForAudit: isReadyForAudit(overallScore),
    assessment: getAssessment(overallScore)
  };
}

/**
 * Generate basic recommendations based on weaknesses
 */
function generateRecommendations(weaknesses: string[]): string[] {
  const recommendations: string[] = [];
  
  const weaknessCategories: Record<string, string[]> = {
    rights: ['right to know', 'right to refuse', 'worker rights', 'OHSA'],
    hazards: ['hazard', 'JHA', 'hazard assessment', 'risk'],
    ppe: ['PPE', 'protective equipment', 'safety glasses', 'hard hat'],
    emergency: ['emergency', 'evacuation', 'muster', 'first aid', 'fire'],
    training: ['training', 'certification', 'toolbox', 'orientation'],
    reporting: ['report', 'supervisor', 'incident', 'near-miss']
  };

  for (const [category, keywords] of Object.entries(weaknessCategories)) {
    const hasWeakness = weaknesses.some(w => 
      keywords.some(k => w.toLowerCase().includes(k.toLowerCase()))
    );

    if (hasWeakness) {
      switch (category) {
        case 'rights':
          recommendations.push('Review worker rights under OHSA (right to know, participate, refuse unsafe work)');
          break;
        case 'hazards':
          recommendations.push('Practice completing Job Hazard Analyses and identifying workplace hazards');
          break;
        case 'ppe':
          recommendations.push('Review PPE requirements for your role and proper inspection procedures');
          break;
        case 'emergency':
          recommendations.push('Familiarize yourself with emergency procedures, muster points, and first aid locations');
          break;
        case 'training':
          recommendations.push('Discuss training needs with your supervisor and ensure certifications are current');
          break;
        case 'reporting':
          recommendations.push('Review hazard and incident reporting procedures with your H&S representative');
          break;
      }
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue attending safety meetings and toolbox talks');
    recommendations.push('Practice explaining safety procedures in your own words');
  }

  return recommendations.slice(0, 4);
}

/**
 * Generate basic feedback message
 */
function generateBasicFeedback(
  score: number,
  questionsAnsweredWell: number,
  totalQuestions: number
): string {
  const percentage = Math.round((questionsAnsweredWell / totalQuestions) * 100);
  
  if (score >= 80) {
    return `Excellent performance! You demonstrated strong safety knowledge across ${percentage}% of the questions. You appear well-prepared for a real COR audit.`;
  } else if (score >= 70) {
    return `Good job! You showed solid understanding of workplace safety, answering ${percentage}% of questions well. A bit more practice and you'll be fully ready for the audit.`;
  } else if (score >= 50) {
    return `You have a good foundation but there are some gaps in your safety knowledge. Review the areas for improvement and consider doing another practice session.`;
  } else {
    return `This practice session identified several areas where additional training would be helpful. Don't worry - this is exactly what practice is for! Review the recommendations and try again.`;
  }
}

// =============================================================================
// HINT SYSTEM
// =============================================================================

/**
 * Get a hint for the current question
 */
export function getQuestionHint(question: InterviewQuestion): string {
  const hints: Record<string, string[]> = {
    worker_rights: [
      'Remember your three basic rights: know, participate, refuse',
      'Think about what information you\'re entitled to receive',
      'You always have the right to refuse unsafe work'
    ],
    hazards: [
      'Think about physical, chemical, and ergonomic hazards',
      'Consider the hierarchy of controls',
      'Remember to mention specific hazards for your work area'
    ],
    training: [
      'Think about orientation, WHMIS, and job-specific training',
      'Toolbox talks count as safety training!',
      'Mention certifications you hold'
    ],
    ppe: [
      'Think about head, eye, hand, and foot protection',
      'Remember to mention inspection before use',
      'Consider how you get replacement PPE'
    ],
    equipment: [
      'Pre-use inspection is key',
      'If it\'s defective, tag it out and report it',
      'Think about lockout/tagout procedures'
    ],
    emergency: [
      'Know your muster point location',
      'Think about fire, injury, and evacuation procedures',
      'Who is the first aid attendant?'
    ],
    incidents: [
      'Even minor injuries should be reported',
      'Near-misses are important to report too',
      'Think about the incident investigation process'
    ],
    culture: [
      'Consider how management shows commitment to safety',
      'Think about whether you feel comfortable raising concerns',
      'Can you stop work for safety?'
    ],
    inspections: [
      'Think about formal and informal inspections',
      'What happens when issues are found?',
      'Who participates in inspections?'
    ]
  };

  // Safe: question.category is from InterviewQuestion with controlled category type
   
  const categoryHints = hints[question.category] || [
    'Think about your day-to-day safety practices',
    'What would you actually do in this situation?',
    'Be specific - give examples if you can'
  ];

  return categoryHints[Math.floor(Math.random() * categoryHints.length)];
}
