import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// ============================================================================
// GET /api/certifications/reports/matrix - Get worker training matrix
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
    const format = searchParams.get('format') || 'json';
    const requiredOnly = searchParams.get('required_only') === 'true';

    // Get certification types (for columns)
    // Note: profile.company_id is server-controlled (from database query result)
    // but we validate it's a UUID for extra safety
    let typesQuery = supabase
      .from('certification_types')
      .select('id, name, short_code, required_for_work')
      .or(`company_id.is.null,company_id.eq.${profile.company_id}`)
      .eq('is_active', true)
      .order('name');

    if (requiredOnly) {
      typesQuery = typesQuery.eq('required_for_work', true);
    }

    const { data: certTypes } = await typesQuery;

    // Get all workers
    const { data: workers } = await supabase
      .from('workers')
      .select('id, first_name, last_name, email, position, department')
      .eq('company_id', profile.company_id)
      .order('last_name');

    // Get all certifications
    const { data: certifications } = await supabase
      .from('certifications')
      .select('id, worker_id, certification_type_id, expiry_date, status')
      .eq('company_id', profile.company_id);

    if (!workers || !certTypes) {
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    // Build matrix
    const matrix = workers.map(worker => {
      const workerCerts: Record<string, {
        status: 'valid' | 'expiring' | 'expired' | 'missing';
        expiryDate: string | null;
        certificationId: string | null;
      }> = {};

      for (const certType of certTypes) {
        // Find worker's certification of this type
        const workerCert = certifications?.find(
          c => c.worker_id === worker.id && c.certification_type_id === certType.id
        );

        if (!workerCert) {
          workerCerts[certType.id] = {
            status: 'missing',
            expiryDate: null,
            certificationId: null,
          };
        } else {
          let status: 'valid' | 'expiring' | 'expired' = 'valid';
          
          if (workerCert.status === 'expired') {
            status = 'expired';
          } else if (workerCert.expiry_date) {
            const expiryDate = new Date(workerCert.expiry_date);
            if (expiryDate < today) {
              status = 'expired';
            } else if (expiryDate <= in30Days) {
              status = 'expiring';
            }
          }

          workerCerts[certType.id] = {
            status,
            expiryDate: workerCert.expiry_date,
            certificationId: workerCert.id,
          };
        }
      }

      return {
        worker: {
          id: worker.id,
          name: `${worker.first_name} ${worker.last_name}`,
          email: worker.email,
          position: worker.position,
          department: worker.department,
        },
        certifications: workerCerts,
      };
    });

    // Handle CSV export
    if (format === 'csv') {
      const csvHeaders = [
        'Worker Name',
        'Email',
        'Position',
        'Department',
        ...certTypes.map(ct => ct.short_code || ct.name),
      ];

      const csvRows = matrix.map(row => [
        row.worker.name,
        row.worker.email || '',
        row.worker.position || '',
        row.worker.department || '',
        ...certTypes.map(ct => {
          const cert = row.certifications[ct.id];
          if (cert.status === 'missing') return 'Missing';
          if (cert.status === 'expired') return `Expired (${cert.expiryDate})`;
          if (cert.status === 'expiring') return `Expiring (${cert.expiryDate})`;
          return cert.expiryDate ? `Valid (${cert.expiryDate})` : 'Valid (No Expiry)';
        }),
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="certification_matrix_${today.toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Calculate summary stats
    const summary = {
      totalWorkers: workers.length,
      totalCertTypes: certTypes.length,
      compliance: {
        fullyCompliant: 0,
        partiallyCompliant: 0,
        nonCompliant: 0,
      },
    };

    for (const row of matrix) {
      const certStatuses = Object.values(row.certifications);
      const hasExpired = certStatuses.some(c => c.status === 'expired');
      const hasMissing = certStatuses.some(c => c.status === 'missing');
      
      if (!hasExpired && !hasMissing) {
        summary.compliance.fullyCompliant++;
      } else if (!hasExpired) {
        summary.compliance.partiallyCompliant++;
      } else {
        summary.compliance.nonCompliant++;
      }
    }

    return NextResponse.json({
      certificationTypes: certTypes,
      matrix,
      summary,
      generatedAt: today.toISOString(),
    });
  } catch (error) {
    console.error('Error in GET /api/certifications/reports/matrix:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
