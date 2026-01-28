import { NextRequest, NextResponse } from 'next/server';
import { getOrCalculateScore, getElementRequirements } from '@/lib/audit/compliance-scoring';

export const dynamic = 'force-dynamic';


type EvidenceType =
  | 'form'
  | 'training'
  | 'inspection'
  | 'drill'
  | 'meeting'
  | 'certificate'
  | 'policy'
  | 'document';

function isEvidenceType(value: unknown): value is EvidenceType {
  if (typeof value !== 'string') return false;
  return (
    value === 'form' ||
    value === 'training' ||
    value === 'inspection' ||
    value === 'drill' ||
    value === 'meeting' ||
    value === 'certificate' ||
    value === 'policy' ||
    value === 'document'
  );
}

export async function GET(request: NextRequest) {
  try {
    const companyId = request.headers.get('x-company-id');
    
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const score = await getOrCalculateScore(companyId);

    // Build evidence list from all elements
    const evidence = score.element_scores.flatMap(element =>
      element.found_evidence.map(e => ({
        id: e.id,
        type: isEvidenceType(e.evidence_type) ? e.evidence_type : 'document',
        title: e.description,
        formCode: e.reference,
        date: e.date,
        status: 'complete' as const,
        linkedQuestions: [e.requirement_id],
        elementNumber: element.element_number,
        elementName: element.element_name,
        requirementId: e.requirement_id,
      }))
    );

    // Group evidence by element
    const evidenceByElement: Record<number, typeof evidence> = {};
    for (let i = 1; i <= 14; i++) {
      // Safe: i is from a controlled loop (1-14), bounded by the loop condition
      // eslint-disable-next-line security/detect-object-injection
      evidenceByElement[i] = evidence.filter(e => e.elementNumber === i);
    }

    // Create evidence map (requirement -> evidence items)
    const evidenceMap: Record<string, typeof evidence> = {};
    score.element_scores.forEach(element => {
      element.required_evidence.forEach(req => {
        // Safe: req.id is from database/validated requirement data, not user input
         
        evidenceMap[req.id] = element.found_evidence
          .filter(e => e.requirement_id === req.id)
          .map(e => ({
            id: e.id,
            type: isEvidenceType(e.evidence_type) ? e.evidence_type : 'document',
            title: e.description,
            formCode: e.reference,
            date: e.date,
            status: 'complete' as const,
            linkedQuestions: [e.requirement_id],
            elementNumber: element.element_number,
            elementName: element.element_name,
            requirementId: e.requirement_id,
          }));
      });
    });

    // Build requirements with coverage status
    const requirementsCoverage = score.element_scores.flatMap(element =>
      element.required_evidence.map(req => {
        const foundCount = element.found_evidence.filter(e => e.requirement_id === req.id).length;
        const isMet = foundCount >= req.minimum_samples;
        const coverage = Math.min(100, (foundCount / req.minimum_samples) * 100);
        
        return {
          id: req.id,
          elementNumber: element.element_number,
          elementName: element.element_name,
          description: req.description,
          evidenceType: req.evidence_type,
          frequency: req.frequency,
          minimumSamples: req.minimum_samples,
          foundSamples: foundCount,
          pointValue: req.point_value,
          isMet,
          coverage: Math.round(coverage),
          status: isMet ? 'complete' : foundCount > 0 ? 'partial' : 'missing',
        };
      })
    );

    // Summary statistics
    const summary = {
      totalEvidence: evidence.length,
      totalRequirements: requirementsCoverage.length,
      metRequirements: requirementsCoverage.filter(r => r.isMet).length,
      partialRequirements: requirementsCoverage.filter(r => !r.isMet && r.foundSamples > 0).length,
      missingRequirements: requirementsCoverage.filter(r => r.foundSamples === 0).length,
      coverageByElement: score.element_scores.map(e => ({
        element: e.element_number,
        name: e.element_name,
        percentage: Math.round(e.percentage),
        evidenceCount: e.found_evidence.length,
        requirementCount: e.required_evidence.length,
      })),
    };

    return NextResponse.json({
      evidence,
      evidenceByElement,
      evidenceMap,
      requirementsCoverage,
      summary,
      totalCount: evidence.length,
      lastUpdated: score.last_calculated,
    });
  } catch (error) {
    console.error('Evidence mapping error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
