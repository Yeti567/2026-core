import { NextRequest, NextResponse } from 'next/server';
import { getOrCalculateScore } from '@/lib/audit/compliance-scoring';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    const companyId = request.headers.get('x-company-id');
    
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const score = await getOrCalculateScore(companyId);
    const today = new Date();

    // Build critical path from elements with gaps
    const elementsWithGaps = score.element_scores
      .filter(e => e.gaps.length > 0)
      .sort((a, b) => {
        // Prioritize by: 1) critical gaps, 2) element weight, 3) percentage completion
        const aWeight = getElementWeight(a.element_number);
        const bWeight = getElementWeight(b.element_number);
        const aCritical = a.gaps.filter(g => g.severity === 'critical').length;
        const bCritical = b.gaps.filter(g => g.severity === 'critical').length;
        
        if (aCritical !== bCritical) return bCritical - aCritical;
        if (aWeight !== bWeight) return bWeight - aWeight;
        return a.percentage - b.percentage;
      });

    // Calculate critical path
    let dayOffset = 0;
    const criticalPath = elementsWithGaps.slice(0, 8).map((element, index) => {
      const totalHours = element.gaps.reduce((sum, g) => sum + g.estimated_effort_hours, 0);
      const duration = Math.max(1, Math.ceil(totalHours / 8)); // At least 1 day, 8 hours per day
      
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() + dayOffset);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration);
      
      // Allow some parallel work (overlap 30%)
      dayOffset += Math.ceil(duration * 0.7);
      
      const hasCriticalGaps = element.gaps.some(g => g.severity === 'critical');
      
      return {
        id: `cp-${element.element_number}`,
        task: `Complete Element ${element.element_number}: ${element.element_name}`,
        elementNumber: element.element_number,
        dependency: index > 0 ? `cp-${elementsWithGaps[index - 1].element_number}` : undefined,
        duration,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        status: getTaskStatus(element.percentage, hasCriticalGaps),
        gapsCount: element.gaps.length,
        hoursNeeded: totalHours,
      };
    });

    // Calculate milestones based on projected timeline
    const totalDays = criticalPath.length > 0 
      ? Math.max(...criticalPath.map(cp => {
          const end = new Date(cp.endDate);
          return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }))
      : 0;

    const milestones = [
      {
        id: 'ms-critical',
        name: 'Critical Gaps Resolved',
        date: new Date(today.getTime() + Math.ceil(totalDays * 0.3) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: getMilestoneStatus(score.critical_gaps_count === 0, score.overall_percentage >= 50),
        tasks: score.element_scores
          .filter(e => e.gaps.some(g => g.severity === 'critical'))
          .slice(0, 3)
          .map(e => `Element ${e.element_number}: ${e.element_name}`),
        description: `Address all ${score.critical_gaps_count} critical gaps to establish baseline compliance.`,
      },
      {
        id: 'ms-documentation',
        name: 'Documentation Complete',
        date: new Date(today.getTime() + Math.ceil(totalDays * 0.6) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: getMilestoneStatus(score.overall_percentage >= 70, score.overall_percentage >= 50),
        tasks: ['All policies updated', 'Forms in regular use', 'Training records current'],
        description: 'Complete all required documentation and establish routine completion habits.',
      },
      {
        id: 'ms-mock-audit',
        name: 'Internal Mock Audit',
        date: new Date(today.getTime() + Math.ceil(totalDays * 0.85) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: getMilestoneStatus(score.overall_percentage >= 80, score.overall_percentage >= 70),
        tasks: ['Self-assessment complete', 'Interview practice done', 'Final gaps identified'],
        description: 'Conduct internal audit simulation to identify any remaining issues.',
      },
      {
        id: 'ms-ready',
        name: 'Audit Ready',
        date: score.projected_ready_date,
        status: getMilestoneStatus(score.ready_for_audit, score.overall_percentage >= 80),
        tasks: ['80%+ score achieved', 'Zero critical gaps', 'Audit package prepared'],
        description: 'Ready to schedule and pass the official COR audit.',
      },
    ];

    // Element progress for visualization
    const elementProgress = score.element_scores.map(e => ({
      element: e.element_number,
      name: e.element_name,
      percentage: Math.round(e.percentage),
      status: e.status,
      weight: getElementWeight(e.element_number),
      gapsCount: e.gaps.length,
      criticalGaps: e.gaps.filter(g => g.severity === 'critical').length,
    }));

    const timeline = {
      currentReadiness: score.overall_percentage,
      projectedReadyDate: score.projected_ready_date,
      criticalPath,
      milestones,
      totalDaysToReady: Math.max(0, calculateDaysUntil(score.projected_ready_date)),
      totalHoursNeeded: score.estimated_hours_to_ready,
    };

    return NextResponse.json({
      timeline,
      elementProgress,
      summary: {
        ready_for_audit: score.ready_for_audit,
        overall_percentage: score.overall_percentage,
        critical_gaps: score.critical_gaps_count,
        total_gaps: score.total_gaps_count,
      },
      lastUpdated: score.last_calculated,
    });
  } catch (error) {
    console.error('Timeline projection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getElementWeight(elementNumber: number): number {
  const weights: Record<number, number> = {
    1: 1.2, 2: 1.2, 3: 1.2, 4: 1.1,
    5: 1.0, 6: 1.0, 7: 1.0, 8: 1.0, 9: 1.0,
    10: 1.1, 11: 1.1, 12: 1.0, 13: 1.0, 14: 1.0,
  };
  // Safe: elementNumber is validated to be 1-14 in calling code
  // eslint-disable-next-line security/detect-object-injection
  return weights[elementNumber] || 1.0;
}

function getTaskStatus(percentage: number, hasCriticalGaps: boolean): 'completed' | 'in_progress' | 'pending' | 'blocked' {
  if (percentage >= 100) return 'completed';
  if (hasCriticalGaps) return 'blocked';
  if (percentage > 0) return 'in_progress';
  return 'pending';
}

function getMilestoneStatus(isComplete: boolean, isInProgress: boolean): 'completed' | 'upcoming' | 'at_risk' | 'overdue' {
  if (isComplete) return 'completed';
  if (isInProgress) return 'upcoming';
  return 'at_risk';
}

function calculateDaysUntil(dateString: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
