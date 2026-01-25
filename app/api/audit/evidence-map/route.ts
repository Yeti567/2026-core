import { NextRequest, NextResponse } from 'next/server';
import { 
  generateEvidenceReport, 
  getEvidenceCoverageStats,
  getElementEvidenceSummary,
  type CompanyEvidenceReport 
} from '@/lib/audit/evidence-mapper';

/**
 * GET /api/audit/evidence-map
 * 
 * Query params:
 * - element: Get summary for specific element (1-14)
 * - summary: Get quick coverage stats only
 * - full: Get complete evidence report with all mappings
 */
export async function GET(request: NextRequest) {
  try {
    const companyId = request.headers.get('x-company-id');
    
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const element = searchParams.get('element');
    const summaryOnly = searchParams.get('summary') === 'true';
    const fullReport = searchParams.get('full') === 'true';

    // Get specific element summary
    if (element) {
      const elementNum = parseInt(element, 10);
      if (isNaN(elementNum) || elementNum < 1 || elementNum > 14) {
        return NextResponse.json({ error: 'Invalid element number' }, { status: 400 });
      }

      const elementSummary = await getElementEvidenceSummary(companyId, elementNum);
      if (!elementSummary) {
        return NextResponse.json({ error: 'Element not found' }, { status: 404 });
      }

      return NextResponse.json({
        element: elementSummary,
        lastUpdated: new Date().toISOString(),
      });
    }

    // Get quick stats only
    if (summaryOnly) {
      const stats = await getEvidenceCoverageStats(companyId);
      return NextResponse.json({
        stats,
        lastUpdated: new Date().toISOString(),
      });
    }

    // Get full report
    const report = await generateEvidenceReport(companyId);

    // For non-full reports, omit the detailed evidence_map to reduce payload size
    if (!fullReport) {
      const { evidence_map, ...summaryReport } = report;
      return NextResponse.json({
        report: {
          ...summaryReport,
          // Include element summaries but without detailed questions
          elements: summaryReport.elements.map(e => ({
            element_number: e.element_number,
            element_name: e.element_name,
            total_questions: e.total_questions,
            questions_with_evidence: e.questions_with_evidence,
            questions_sufficient: e.questions_sufficient,
            total_evidence: e.total_evidence,
            overall_coverage: Math.round(e.overall_coverage),
            earned_points: e.earned_points,
            max_points: e.max_points,
            percentage: Math.round(e.percentage),
          })),
        },
        lastUpdated: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      report,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Evidence map error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
