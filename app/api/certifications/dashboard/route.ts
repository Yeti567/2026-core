import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// ============================================================================
// GET /api/certifications/dashboard - Get certification dashboard stats
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

    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);
    const in60Days = new Date(today);
    in60Days.setDate(in60Days.getDate() + 60);

    // Get total workers
    const { count: totalWorkers } = await supabase
      .from('workers')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id);

    // Get all certifications
    const { data: certifications } = await supabase
      .from('certifications')
      .select('id, status, expiry_date, verified')
      .eq('company_id', profile.company_id);

    // Calculate stats
    const stats = {
      totalWorkers: totalWorkers || 0,
      totalCertifications: certifications?.length || 0,
      activeCertifications: 0,
      expiringSoon: 0, // within 30 days
      expiringWarning: 0, // within 60 days
      expired: 0,
      pendingVerification: 0,
      workersWithRestrictions: 0,
      complianceRate: 0,
    };

    if (certifications) {
      for (const cert of certifications) {
        if (cert.status === 'expired') {
          stats.expired++;
        } else if (cert.status === 'pending_verification') {
          stats.pendingVerification++;
        } else if (cert.status === 'active') {
          if (cert.expiry_date) {
            const expiryDate = new Date(cert.expiry_date);
            if (expiryDate < today) {
              stats.expired++;
            } else if (expiryDate <= in30Days) {
              stats.expiringSoon++;
              stats.activeCertifications++;
            } else if (expiryDate <= in60Days) {
              stats.expiringWarning++;
              stats.activeCertifications++;
            } else {
              stats.activeCertifications++;
            }
          } else {
            // No expiry = always active
            stats.activeCertifications++;
          }
        }

        if (!cert.verified) {
          stats.pendingVerification++;
        }
      }
    }

    // Get workers with restrictions
    const { count: restrictedWorkers } = await supabase
      .from('work_restrictions')
      .select('worker_id', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('is_active', true);

    stats.workersWithRestrictions = restrictedWorkers || 0;

    // Calculate compliance rate
    if (stats.totalCertifications > 0) {
      stats.complianceRate = Math.round(
        ((stats.activeCertifications) / stats.totalCertifications) * 100
      );
    }

    // Get expiring certifications for the list
    const { data: expiringCerts } = await supabase
      .from('certifications')
      .select(`
        id, name, expiry_date, status,
        worker:workers(id, first_name, last_name, email),
        certification_type:certification_types(id, name, short_code)
      `)
      .eq('company_id', profile.company_id)
      .eq('status', 'active')
      .not('expiry_date', 'is', null)
      .lte('expiry_date', in60Days.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true })
      .limit(20);

    // Get recently expired
    const { data: recentlyExpired } = await supabase
      .from('certifications')
      .select(`
        id, name, expiry_date, status,
        worker:workers(id, first_name, last_name, email),
        certification_type:certification_types(id, name, short_code)
      `)
      .eq('company_id', profile.company_id)
      .eq('status', 'expired')
      .order('expiry_date', { ascending: false })
      .limit(10);

    // Get worker certification summary by status
    const { data: workerStats } = await supabase
      .from('workers')
      .select('certification_status')
      .eq('company_id', profile.company_id);

    const workerStatusCounts = {
      compliant: 0,
      expiring_soon: 0,
      expired: 0,
      not_checked: 0,
    };

    if (workerStats) {
      for (const worker of workerStats) {
        const status = worker.certification_status as keyof typeof workerStatusCounts;
        if (status in workerStatusCounts) {
          // Safe: status is validated with 'in' check against known keys
          // eslint-disable-next-line security/detect-object-injection
          workerStatusCounts[status]++;
        }
      }
    }

    return NextResponse.json({
      stats,
      expiringCertifications: expiringCerts?.map(cert => ({
        ...cert,
        daysUntilExpiry: cert.expiry_date
          ? Math.ceil((new Date(cert.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })) || [],
      recentlyExpired: recentlyExpired || [],
      workerStatusCounts,
    });
  } catch (error) {
    console.error('Error in GET /api/certifications/dashboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
