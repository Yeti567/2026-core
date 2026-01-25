import { NextRequest, NextResponse } from 'next/server';
import { getOrCalculateScore } from '@/lib/audit/compliance-scoring';

export async function GET(request: NextRequest) {
  try {
    const companyId = request.headers.get('x-company-id');
    
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get compliance score (uses cache if available)
    const score = await getOrCalculateScore(companyId);

    // Flatten all gaps from element scores
    const gaps = score.element_scores.flatMap(element => 
      element.gaps.map(gap => ({
        id: `${element.element_number}-${gap.requirement_id}`,
        elementNumber: element.element_number,
        elementName: element.element_name,
        type: categorizeGapType(gap.requirement_id),
        severity: gap.severity,
        title: gap.description,
        description: gap.requirement_description,
        dueDate: calculateDueDate(gap.severity),
        actionItem: gap.action_required,
        estimatedTime: formatEffortTime(gap.estimated_effort_hours),
        estimatedHours: gap.estimated_effort_hours,
      }))
    );

    // Sort by severity (critical first)
    const severityOrder = { critical: 0, major: 1, minor: 2 };
    const sortedGaps = gaps.sort((a, b) => 
      severityOrder[a.severity] - severityOrder[b.severity]
    );

    // Summary statistics
    const summary = {
      total: gaps.length,
      critical: score.critical_gaps_count,
      high: score.major_gaps_count, // Map major to high for UI consistency
      medium: score.minor_gaps_count,
      low: 0,
      byType: {
        missing_form: gaps.filter(g => g.type === 'missing_form').length,
        overdue_inspection: gaps.filter(g => g.type === 'overdue_inspection').length,
        expired_training: gaps.filter(g => g.type === 'expired_training').length,
        missing_drill: gaps.filter(g => g.type === 'missing_drill').length,
        incomplete_documentation: gaps.filter(g => g.type === 'incomplete_documentation').length,
      },
      byElement: score.element_scores.reduce((acc, e) => {
        acc[e.element_number] = e.gaps.length;
        return acc;
      }, {} as Record<number, number>),
    };

    // Auto-generated action plan (prioritized)
    const actionPlan = sortedGaps.slice(0, 10).map((gap, index) => ({
      priority: index + 1,
      action: gap.actionItem,
      element: `Element ${gap.elementNumber}`,
      estimatedHours: gap.estimatedHours,
      severity: gap.severity,
    }));

    return NextResponse.json({
      gaps: sortedGaps,
      summary,
      actionPlan,
      readiness: {
        ready_for_audit: score.ready_for_audit,
        estimated_hours_to_ready: score.estimated_hours_to_ready,
        projected_ready_date: score.projected_ready_date,
      },
      lastUpdated: score.last_calculated,
    });
  } catch (error) {
    console.error('Gap detection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function categorizeGapType(requirementId: string): string {
  if (requirementId.includes('inspection') || requirementId.includes('workplace')) {
    return 'overdue_inspection';
  }
  if (requirementId.includes('training') || requirementId.includes('competency')) {
    return 'expired_training';
  }
  if (requirementId.includes('drill') || requirementId.includes('emergency')) {
    return 'missing_drill';
  }
  if (requirementId.includes('policy') || requirementId.includes('procedure') || requirementId.includes('program')) {
    return 'incomplete_documentation';
  }
  return 'missing_form';
}

function calculateDueDate(severity: string): string | undefined {
  const today = new Date();
  switch (severity) {
    case 'critical':
      today.setDate(today.getDate() + 7); // 1 week
      break;
    case 'major':
      today.setDate(today.getDate() + 14); // 2 weeks
      break;
    case 'minor':
      today.setDate(today.getDate() + 30); // 1 month
      break;
    default:
      return undefined;
  }
  return today.toISOString().split('T')[0];
}

function formatEffortTime(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} minutes`;
  } else if (hours < 8) {
    return `${hours.toFixed(1)} hours`;
  } else {
    const days = Math.ceil(hours / 8);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
}
