/**
 * Audit Evidence Report API
 * 
 * GET - Generate evidence report for audit
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateFullEvidenceReport,
  generateElementEvidenceReport,
  findPotentialEvidence,
  getDocumentsDueForReview,
} from '@/lib/documents';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's company
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const elementNumber = searchParams.get('element');
    
    switch (action) {
      case 'element': {
        if (!elementNumber) {
          return NextResponse.json({ error: 'element parameter required' }, { status: 400 });
        }
        const report = await generateElementEvidenceReport(
          profile.company_id,
          parseInt(elementNumber, 10)
        );
        return NextResponse.json(report);
      }
      
      case 'suggestions': {
        if (!elementNumber) {
          return NextResponse.json({ error: 'element parameter required' }, { status: 400 });
        }
        const suggestions = await findPotentialEvidence(
          profile.company_id,
          parseInt(elementNumber, 10)
        );
        return NextResponse.json(suggestions);
      }
      
      case 'reviews_due': {
        const daysAhead = parseInt(searchParams.get('days') || '30', 10);
        const documents = await getDocumentsDueForReview(profile.company_id, daysAhead);
        return NextResponse.json(documents);
      }
      
      default: {
        // Full report for all elements
        const report = await generateFullEvidenceReport(profile.company_id);
        return NextResponse.json(report);
      }
    }
  } catch (error) {
    return handleApiError(error, 'Failed to generate report');
  }
}
