import { NextRequest, NextResponse } from 'next/server';
import { getOrCalculateScore, getElementRequirements } from '@/lib/audit/compliance-scoring';

export const dynamic = 'force-dynamic';


interface RouteParams {
  params: Promise<{ number: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const companyId = request.headers.get('x-company-id');
    const { number } = await params;
    const elementNumber = parseInt(number, 10);
    
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isNaN(elementNumber) || elementNumber < 1 || elementNumber > 14) {
      return NextResponse.json({ error: 'Invalid element number. Must be 1-14.' }, { status: 400 });
    }

    const score = await getOrCalculateScore(companyId);
    const elementScore = score.element_scores.find(e => e.element_number === elementNumber);

    if (!elementScore) {
      return NextResponse.json({ error: 'Element not found' }, { status: 404 });
    }

    // Get detailed requirements for this element
    const requirements = getElementRequirements(elementNumber);

    // Build detailed requirement status
    const requirementDetails = requirements.map(req => {
      const foundEvidence = elementScore.found_evidence.filter(e => e.requirement_id === req.id);
      const gap = elementScore.gaps.find(g => g.requirement_id === req.id);
      const foundCount = foundEvidence.length;
      const isMet = foundCount >= req.minimum_samples;
      
      return {
        id: req.id,
        description: req.description,
        evidenceType: req.evidence_type,
        frequency: req.frequency,
        minimumSamples: req.minimum_samples,
        foundSamples: foundCount,
        pointValue: req.point_value,
        earnedPoints: isMet ? req.point_value : Math.round((foundCount / req.minimum_samples) * req.point_value),
        formCodes: req.form_codes || [],
        status: isMet ? 'complete' : foundCount > 0 ? 'partial' : 'missing',
        evidence: foundEvidence.map(e => ({
          id: e.id,
          date: e.date,
          description: e.description,
          reference: e.reference,
        })),
        gap: gap ? {
          severity: gap.severity,
          description: gap.description,
          actionRequired: gap.action_required,
          estimatedHours: gap.estimated_effort_hours,
        } : null,
      };
    });

    // Element-level advice based on score
    const advice = generateElementAdvice(elementScore.percentage, elementScore.gaps);

    return NextResponse.json({
      element: {
        number: elementScore.element_number,
        name: elementScore.element_name,
        maxPoints: elementScore.max_points,
        earnedPoints: elementScore.earned_points,
        percentage: Math.round(elementScore.percentage),
        status: elementScore.status,
        weight: getElementWeight(elementNumber),
      },
      requirements: requirementDetails,
      gaps: elementScore.gaps.map(g => ({
        requirementId: g.requirement_id,
        requirementDescription: g.requirement_description,
        severity: g.severity,
        description: g.description,
        actionRequired: g.action_required,
        estimatedHours: g.estimated_effort_hours,
      })),
      evidence: elementScore.found_evidence,
      summary: {
        totalRequirements: requirements.length,
        metRequirements: requirementDetails.filter(r => r.status === 'complete').length,
        partialRequirements: requirementDetails.filter(r => r.status === 'partial').length,
        missingRequirements: requirementDetails.filter(r => r.status === 'missing').length,
        totalEvidence: elementScore.found_evidence.length,
        criticalGaps: elementScore.gaps.filter(g => g.severity === 'critical').length,
        majorGaps: elementScore.gaps.filter(g => g.severity === 'major').length,
        minorGaps: elementScore.gaps.filter(g => g.severity === 'minor').length,
      },
      advice,
      lastUpdated: score.last_calculated,
    });
  } catch (error) {
    console.error('Element detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getElementWeight(elementNumber: number): number {
  const weights: Record<number, number> = {
    1: 1.2, 2: 1.2, 3: 1.2, 4: 1.1,
    5: 1.0, 6: 1.0, 7: 1.0, 8: 1.0, 9: 1.0,
    10: 1.1, 11: 1.1, 12: 1.0, 13: 1.0, 14: 1.0,
  };
  // Safe: elementNumber is validated to be between 1-14 before this function is called
  // eslint-disable-next-line security/detect-object-injection
  return weights[elementNumber] || 1.0;
}

function generateElementAdvice(percentage: number, gaps: { severity: string; action_required: string }[]): {
  status: string;
  message: string;
  priorityActions: string[];
} {
  const criticalGaps = gaps.filter(g => g.severity === 'critical');
  const majorGaps = gaps.filter(g => g.severity === 'major');

  if (percentage >= 90) {
    return {
      status: 'excellent',
      message: 'This element is well-documented. Continue maintaining records as required.',
      priorityActions: gaps.slice(0, 2).map(g => g.action_required),
    };
  } else if (percentage >= 80) {
    return {
      status: 'good',
      message: 'This element meets minimum requirements. Address remaining gaps to strengthen compliance.',
      priorityActions: gaps.slice(0, 3).map(g => g.action_required),
    };
  } else if (percentage >= 60) {
    return {
      status: 'needs_improvement',
      message: 'This element needs attention. Focus on critical and major gaps first.',
      priorityActions: [...criticalGaps, ...majorGaps].slice(0, 4).map(g => g.action_required),
    };
  } else {
    return {
      status: 'critical',
      message: 'This element requires immediate action. Critical gaps must be addressed before audit.',
      priorityActions: criticalGaps.slice(0, 5).map(g => g.action_required),
    };
  }
}
