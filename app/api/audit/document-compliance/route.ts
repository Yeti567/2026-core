/**
 * Document Compliance API
 * 
 * GET: Get overall document compliance or for specific element
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  getOverallDocumentCompliance, 
  scoreDocumentCompliance,
  findDocumentEvidenceForAudit
} from '@/lib/audit/document-audit-integration';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


/**
 * GET /api/audit/document-compliance
 * Get document compliance scores
 * 
 * Query params:
 * - element: specific element number (1-14)
 * - evidence_only: if true, only return evidence without scoring
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const elementParam = searchParams.get('element');
    const evidenceOnly = searchParams.get('evidence_only') === 'true';

    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile for company ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // If specific element requested
    if (elementParam) {
      const elementNumber = parseInt(elementParam);
      
      if (isNaN(elementNumber) || elementNumber < 1 || elementNumber > 14) {
        return NextResponse.json(
          { error: 'Invalid element number. Must be 1-14.' },
          { status: 400 }
        );
      }

      if (evidenceOnly) {
        const evidence = await findDocumentEvidenceForAudit(
          profile.company_id,
          elementNumber
        );
        return NextResponse.json({ evidence });
      }

      const score = await scoreDocumentCompliance(
        profile.company_id,
        elementNumber
      );
      return NextResponse.json({ score });
    }

    // Get overall compliance
    const compliance = await getOverallDocumentCompliance(profile.company_id);
    
    return NextResponse.json({ compliance });
  } catch (error) {
    return handleApiError(error, 'Failed to get document compliance', 500, 'Document compliance API');
  }
}
