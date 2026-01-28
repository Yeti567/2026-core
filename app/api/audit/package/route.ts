/**
 * Audit Package Generation API
 * 
 * POST: Generate a complete COR audit package PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import {
  generateAuditPackage,
  type CompanyInfo,
  type ElementScore,
  type PackageOptions
} from '@/lib/audit/package-generator';
import { calculateOverallScore } from '@/lib/audit/compliance-scoring';
import { COR_ELEMENTS } from '@/lib/audit/types';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthWithRole(['admin', 'internal_auditor', 'super_admin']);
    const supabase = createRouteHandlerClient();

    const body = await request.json();
    const {
      includeElements,
      format = 'full',
      includePhotos = true
    } = body as {
      includeElements?: number[];
      format?: 'full' | 'executive' | 'element' | 'custom';
      includePhotos?: boolean;
    };

    // Get company info
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, wsib_number, address')
      .eq('id', user.companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Get compliance scores
    const scores = await calculateOverallScore(user.companyId);

    // Transform to package format
    const companyInfo: CompanyInfo = {
      id: company.id,
      name: company.name,
      wsib_number: company.wsib_number || undefined,
      address: company.address || undefined,
      industry: 'Construction',
      safety_manager_name: 'Safety Manager'
    };

    const elementScores: ElementScore[] = scores.element_scores.map(e => ({
      element_number: e.element_number,
      element_name: e.element_name,
      percentage: Math.round(e.percentage),
      status: e.status === 'excellent' || e.status === 'good' ? 'good' : 
              e.status === 'needs_improvement' ? 'needs_improvement' : 'critical',
      found_evidence: e.found_evidence.map(ev => ({
        id: ev.id || '',
        type: ev.evidence_type as 'form' | 'training' | 'inspection' | 'drill' | 'meeting' | 'certificate' | 'policy',
        reference: ev.reference || 'N/A',
        title: ev.description || ev.evidence_type,
        description: ev.description || '',
        date: ev.date || new Date().toISOString()
      })),
      gaps: e.gaps.map(g => ({
        description: g.description,
        severity: g.severity
      }))
    }));

    // Prepare options
    const options: PackageOptions = {
      includeElements: format === 'custom' ? includeElements :
                      format === 'element' ? (includeElements?.slice(0, 1) || [1]) : [],
      includeAppendices: format !== 'executive',
      includeExecutiveSummary: true,
      maxFormsPerElement: format === 'executive' ? 2 : 5,
      includePhotos
    };

    // Generate PDF
    const pdfBytes = await generateAuditPackage(
      companyInfo,
      elementScores,
      options
    );

    // Return PDF as response
    const dateStr = new Date().toISOString().split('T')[0];
    const formatSuffix = format === 'executive' ? '_Executive' :
                        format === 'element' && includeElements?.length ? `_Element${includeElements[0]}` : '';
    const filename = `COR_Audit_Package_${company.name.replace(/\s+/g, '_')}${formatSuffix}_${dateStr}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBytes.length)
      }
    });
  } catch (error) {
    console.error('Package generation error:', error);
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message || 'Failed to generate package' },
      { status: authError.status || 500 }
    );
  }
}

/**
 * GET: Get package generation status/info
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthWithRole(['admin', 'internal_auditor', 'super_admin']);
    const supabase = createRouteHandlerClient();

    // Get compliance data for estimates
    const scores = await calculateOverallScore(user.companyId);

    // Calculate estimates
    const elementEstimates = scores.element_scores.map(e => {
      const corElement = COR_ELEMENTS.find(el => el.number === e.element_number);
      return {
        elementNumber: e.element_number,
        elementName: e.element_name,
        percentage: Math.round(e.percentage),
        evidenceCount: e.found_evidence.length,
        estimatedPages: Math.max(5, Math.ceil(e.percentage / 5)),
        status: e.status
      };
    });

    const totalPages = elementEstimates.reduce((sum, e) => sum + e.estimatedPages, 0);
    const totalEvidence = elementEstimates.reduce((sum, e) => sum + e.evidenceCount, 0);

    return NextResponse.json({
      estimates: {
        totalPages,
        totalEvidence,
        fullPackagePages: totalPages,
        executiveSummaryPages: Math.ceil(totalPages * 0.15),
        estimatedGenerationTime: Math.ceil(totalPages / 50) // ~50 pages per minute
      },
      elements: elementEstimates
    });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
