import { NextRequest, NextResponse } from 'next/server';
import { getAllAuditQuestions, getElementAuditQuestions } from '@/lib/audit/evidence-mapper';

export const dynamic = 'force-dynamic';


/**
 * GET /api/audit/questions
 * 
 * Query params:
 * - element: Filter by element number (1-14)
 */
export async function GET(request: NextRequest) {
  try {
    const companyId = request.headers.get('x-company-id');
    
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const element = searchParams.get('element');

    // Get questions for specific element
    if (element) {
      const elementNum = parseInt(element, 10);
      if (isNaN(elementNum) || elementNum < 1 || elementNum > 14) {
        return NextResponse.json({ error: 'Invalid element number (1-14)' }, { status: 400 });
      }

      const questions = await getElementAuditQuestions(elementNum);
      return NextResponse.json({
        element: elementNum,
        questions,
        count: questions.length,
      });
    }

    // Get all questions
    const questions = await getAllAuditQuestions();
    
    // Group by element
    const byElement: Record<number, any[]> = {};
    for (let i = 1; i <= 14; i++) {
      // Safe: i is a controlled loop variable (1-14)
      // eslint-disable-next-line security/detect-object-injection
      byElement[i] = questions.filter(q => q.element_number === i);
    }

    return NextResponse.json({
      questions,
      byElement,
      totalCount: questions.length,
    });
  } catch (error) {
    console.error('Audit questions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
