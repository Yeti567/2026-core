/**
 * Element 7 Audit API
 * GET - Get Element 7 (Preventive Maintenance) score and evidence
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scoreElement7WithMaintenance, getElement7QuickScore } from '@/lib/audit/element-7-maintenance';
import { getMaintenanceEvidenceSummary, exportMaintenanceEvidenceForAudit } from '@/lib/audit/maintenance-evidence-finder';
import { generateMaintenanceEvidenceHTML } from '@/lib/audit/maintenance-evidence-pdf';
import { handleApiError } from '@/lib/utils/error-handling';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    // Check permissions (admin or auditor roles)
    if (!['super_admin', 'admin', 'auditor', 'supervisor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'full'; // 'full' | 'quick' | 'summary' | 'export'
    const format = searchParams.get('format') || 'json'; // 'json' | 'csv' | 'html'
    
    const companyId = profile.company_id;
    
    switch (mode) {
      case 'quick': {
        // Quick score for dashboard
        const quickScore = await getElement7QuickScore(companyId);
        return NextResponse.json(quickScore);
      }
      
      case 'summary': {
        // Evidence summary only
        const summary = await getMaintenanceEvidenceSummary(companyId);
        return NextResponse.json(summary);
      }
      
      case 'export': {
        // Export for audit package
        if (format === 'csv') {
          const csvData = await exportMaintenanceEvidenceForAudit(companyId, 'csv');
          return new NextResponse(csvData, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="element-7-maintenance-evidence.csv"`
            }
          });
        } else if (format === 'html') {
          const htmlData = await generateMaintenanceEvidenceHTML(companyId);
          return new NextResponse(htmlData, {
            headers: {
              'Content-Type': 'text/html'
            }
          });
        } else {
          const jsonData = await exportMaintenanceEvidenceForAudit(companyId, 'json');
          return new NextResponse(jsonData, {
            headers: {
              'Content-Type': 'application/json',
              'Content-Disposition': `attachment; filename="element-7-maintenance-evidence.json"`
            }
          });
        }
      }
      
      case 'full':
      default: {
        // Full score with all details
        const fullScore = await scoreElement7WithMaintenance(companyId);
        return NextResponse.json(fullScore);
      }
    }
  } catch (error) {
    return handleApiError(error, 'Failed to get Element 7 score', 500, 'Element 7 API');
  }
}
