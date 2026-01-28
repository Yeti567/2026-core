import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';


// Types for Supabase join relations
interface WorkerRelation {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  position: string | null;
  department: string | null;
}

interface CertificationTypeRelation {
  id: string;
  name: string;
  short_code: string | null;
  required_for_work: boolean;
}

// Helper to extract relation data (handles array or single object from Supabase)
function getRelation<T>(data: unknown): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] as T || null;
  return data as T;
}

// ============================================================================
// GET /api/certifications/reports/expiring - Get expiring certifications report
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: cookieStore.toString(),
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'No profile found' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '90');
    const format = searchParams.get('format') || 'json';

    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    // Get expiring certifications
    const { data: certifications, error } = await supabase
      .from('certifications')
      .select(`
        id, name, certificate_number, issue_date, expiry_date, status, verified,
        alert_60_sent, alert_30_sent, alert_7_sent, alert_expired_sent,
        worker:workers(id, first_name, last_name, email, position, department),
        certification_type:certification_types(id, name, short_code, required_for_work)
      `)
      .eq('company_id', profile.company_id)
      .eq('status', 'active')
      .not('expiry_date', 'is', null)
      .lte('expiry_date', futureDate.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true });

    if (error) {
      console.error('Error fetching expiring certifications:', error);
      return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
    }

    // Transform data with days until expiry
    const reportData = certifications?.map(cert => {
      const worker = getRelation<WorkerRelation>(cert.worker);
      const certificationType = getRelation<CertificationTypeRelation>(cert.certification_type);

      const expiryDate = new Date(cert.expiry_date!);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...cert,
        worker,
        certification_type: certificationType,
        daysUntilExpiry,
        urgency: daysUntilExpiry <= 0 ? 'expired' :
          daysUntilExpiry <= 7 ? 'critical' :
            daysUntilExpiry <= 30 ? 'warning' : 'notice',
      };
    }) || [];

    // Handle CSV export
    if (format === 'csv') {
      const csvHeaders = [
        'Worker Name',
        'Email',
        'Position',
        'Department',
        'Certification',
        'Certificate Number',
        'Expiry Date',
        'Days Until Expiry',
        'Status',
        'Required for Work',
      ];

      const csvRows = reportData.map(cert => [
        `${cert.worker?.first_name || ''} ${cert.worker?.last_name || ''}`.trim(),
        cert.worker?.email || '',
        cert.worker?.position || '',
        cert.worker?.department || '',
        cert.name,
        cert.certificate_number || '',
        cert.expiry_date || '',
        cert.daysUntilExpiry.toString(),
        cert.urgency,
        cert.certification_type?.required_for_work ? 'Yes' : 'No',
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="expiring_certifications_${today.toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Group by urgency for summary
    const summary = {
      total: reportData.length,
      expired: reportData.filter(c => c.urgency === 'expired').length,
      critical: reportData.filter(c => c.urgency === 'critical').length,
      warning: reportData.filter(c => c.urgency === 'warning').length,
      notice: reportData.filter(c => c.urgency === 'notice').length,
    };

    return NextResponse.json({
      report: reportData,
      summary,
      generatedAt: today.toISOString(),
      parameters: { days },
    });
  } catch (error) {
    console.error('Error in GET /api/certifications/reports/expiring:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
