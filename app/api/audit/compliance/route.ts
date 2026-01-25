import { NextRequest, NextResponse } from 'next/server';
import { 
  getOrCalculateScore, 
  calculateOverallScore,
  type OverallScore 
} from '@/lib/audit/compliance-scoring';

export async function GET(request: NextRequest) {
  try {
    const companyId = request.headers.get('x-company-id');
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';
    
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or calculate the compliance score
    const score: OverallScore = await getOrCalculateScore(companyId, forceRefresh);

    // Transform to the format expected by the frontend
    const response = {
      overall: {
        score: Math.round(score.element_scores.reduce((sum, e) => sum + e.earned_points, 0)),
        maxScore: Math.round(score.element_scores.reduce((sum, e) => sum + e.max_points, 0)),
        percentage: score.overall_percentage,
        status: mapStatus(score.overall_status),
        passingThreshold: 80,
      },
      elements: score.element_scores.map(e => ({
        elementNumber: e.element_number,
        elementName: e.element_name,
        score: e.earned_points,
        maxScore: e.max_points,
        percentage: Math.round(e.percentage),
        status: mapStatus(e.status),
        gaps: e.gaps.map(g => ({
          id: g.requirement_id,
          elementNumber: e.element_number,
          type: 'missing_form' as const,
          severity: g.severity,
          title: g.description,
          description: g.requirement_description,
          actionItem: g.action_required,
          estimatedTime: formatEffortTime(g.estimated_effort_hours),
        })),
        evidenceCount: e.found_evidence.length,
        requirementCount: e.required_evidence.length,
      })),
      readiness: {
        ready_for_audit: score.ready_for_audit,
        critical_gaps: score.critical_gaps_count,
        major_gaps: score.major_gaps_count,
        minor_gaps: score.minor_gaps_count,
        total_gaps: score.total_gaps_count,
        estimated_hours: score.estimated_hours_to_ready,
        projected_ready_date: score.projected_ready_date,
      },
      lastUpdated: score.last_calculated,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Compliance calculation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST endpoint to force refresh
export async function POST(request: NextRequest) {
  try {
    const companyId = request.headers.get('x-company-id');
    
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Force recalculation
    const score = await calculateOverallScore(companyId);

    return NextResponse.json({
      success: true,
      message: 'Compliance score recalculated',
      overall_percentage: score.overall_percentage,
      last_calculated: score.last_calculated,
    });
  } catch (error) {
    console.error('Compliance recalculation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function mapStatus(status: string): 'passing' | 'at-risk' | 'failing' {
  switch (status) {
    case 'excellent':
    case 'good':
      return 'passing';
    case 'needs_improvement':
      return 'at-risk';
    case 'critical':
    default:
      return 'failing';
  }
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
