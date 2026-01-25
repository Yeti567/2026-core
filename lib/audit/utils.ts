// Audit utility functions

import { COR_ELEMENTS, COR_PASSING_THRESHOLD, type ComplianceScore, type GapItem, type EvidenceItem, type TimelineProjection, type CriticalPathItem, type Milestone } from './types';

// Calculate compliance score for an element
export function calculateElementScore(
  elementNumber: number,
  submissions: { form_code: string; status: string; created_at: string }[],
  requiredForms: string[]
): { score: number; maxScore: number; percentage: number } {
  const element = COR_ELEMENTS.find(e => e.number === elementNumber);
  if (!element) return { score: 0, maxScore: 100, percentage: 0 };

  const maxScore = element.auditQuestions.reduce((sum, q) => sum + q.maxPoints, 0);
  
  // Calculate based on form completion
  const completedForms = requiredForms.filter(formCode => 
    submissions.some(s => 
      s.form_code === formCode && 
      (s.status === 'submitted' || s.status === 'approved')
    )
  );

  const completionRatio = requiredForms.length > 0 
    ? completedForms.length / requiredForms.length 
    : 0;
  
  const score = Math.round(maxScore * completionRatio);
  const percentage = Math.round(completionRatio * 100);

  return { score, maxScore, percentage };
}

// Calculate overall compliance percentage
export function calculateOverallCompliance(elementScores: ComplianceScore[]): number {
  const totalScore = elementScores.reduce((sum, e) => sum + e.score, 0);
  const totalMaxScore = elementScores.reduce((sum, e) => sum + e.maxScore, 0);
  return totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
}

// Determine status based on percentage
export function getComplianceStatus(percentage: number): 'passing' | 'at-risk' | 'failing' {
  if (percentage >= COR_PASSING_THRESHOLD) return 'passing';
  if (percentage >= 60) return 'at-risk';
  return 'failing';
}

// Generate gaps based on missing/incomplete items
export function generateGaps(
  elementScores: ComplianceScore[],
  submissions: { form_code: string; status: string; created_at: string }[]
): GapItem[] {
  const gaps: GapItem[] = [];
  
  COR_ELEMENTS.forEach(element => {
    const elementScore = elementScores.find(e => e.elementNumber === element.number);
    if (!elementScore || elementScore.percentage >= 100) return;

    // Check for missing required forms
    element.requiredForms.forEach(formCode => {
      const hasForm = submissions.some(s => 
        s.form_code === formCode && 
        (s.status === 'submitted' || s.status === 'approved')
      );
      
      if (!hasForm) {
        gaps.push({
          id: `gap-${element.number}-${formCode}`,
          elementNumber: element.number,
          type: 'missing_form',
          severity: element.weight >= 10 ? 'critical' : element.weight >= 5 ? 'high' : 'medium',
          title: `Missing: ${formCode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
          description: `Element ${element.number} (${element.name}) requires this form for compliance.`,
          actionItem: `Complete and submit the ${formCode.replace(/_/g, ' ')} form.`,
          estimatedTime: '15-30 minutes',
        });
      }
    });
  });

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  // Safe: a.severity and b.severity are controlled GapItem severity types
   
  return gaps.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

// Project timeline to audit readiness
export function projectTimeline(
  currentReadiness: number,
  gaps: GapItem[]
): TimelineProjection {
  const today = new Date();
  const criticalGaps = gaps.filter(g => g.severity === 'critical' || g.severity === 'high');
  const daysToComplete = criticalGaps.length * 2 + (gaps.length - criticalGaps.length); // Rough estimate
  
  const projectedDate = new Date(today);
  projectedDate.setDate(projectedDate.getDate() + daysToComplete);

  const criticalPath: CriticalPathItem[] = criticalGaps.slice(0, 5).map((gap, index) => {
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() + index * 2);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 2);
    
    return {
      id: gap.id,
      task: gap.title,
      duration: 2,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      status: 'pending' as const,
    };
  });

  const milestones: Milestone[] = [
    {
      id: 'ms-1',
      name: 'Critical Gaps Addressed',
      date: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: currentReadiness >= 60 ? 'completed' : 'upcoming',
      tasks: criticalGaps.slice(0, 3).map(g => g.title),
    },
    {
      id: 'ms-2',
      name: 'Documentation Complete',
      date: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: currentReadiness >= 75 ? 'completed' : 'upcoming',
      tasks: ['All forms completed', 'Policies reviewed', 'Records organized'],
    },
    {
      id: 'ms-3',
      name: 'Audit Ready',
      date: projectedDate.toISOString().split('T')[0],
      status: currentReadiness >= 80 ? 'completed' : 'upcoming',
      tasks: ['Mock audit passed', 'Package prepared', 'Staff briefed'],
    },
  ];

  return {
    currentReadiness,
    projectedReadyDate: projectedDate.toISOString().split('T')[0],
    criticalPath,
    milestones,
  };
}

// Format date for display
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Calculate days until date
export function daysUntil(dateString: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Get severity color classes
export function getSeverityColors(severity: GapItem['severity']) {
  const colors = {
    critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40', dot: 'bg-red-500' },
    high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40', dot: 'bg-orange-500' },
    medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40', dot: 'bg-amber-500' },
    low: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40', dot: 'bg-blue-500' },
  };
  // Safe: severity is a typed GapItem['severity'] parameter ('critical' | 'high' | 'medium' | 'low')
  // eslint-disable-next-line security/detect-object-injection
  return colors[severity];
}
