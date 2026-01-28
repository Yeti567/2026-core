import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';


// ============================================================================
// GET /api/workers/[id]/certifications - Get worker's certifications
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Verify worker belongs to company
    const { data: worker } = await supabase
      .from('workers')
      .select('id, first_name, last_name, email, position, department, supervisor_id, certification_status, has_active_restrictions')
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .single();

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    // Get certifications
    const { data: certifications } = await supabase
      .from('certifications')
      .select(`
        *,
        certification_type:certification_types(*)
      `)
      .eq('worker_id', id)
      .eq('company_id', profile.company_id)
      .order('expiry_date', { ascending: true, nullsFirst: false });

    // Get training records
    const { data: trainingRecords } = await supabase
      .from('training_records')
      .select(`
        *,
        training_type:training_record_types(*)
      `)
      .eq('worker_id', id)
      .eq('company_id', profile.company_id)
      .order('completed_date', { ascending: false })
      .limit(50);

    // Get work restrictions
    const { data: restrictions } = await supabase
      .from('work_restrictions')
      .select('*')
      .eq('worker_id', id)
      .eq('company_id', profile.company_id)
      .eq('is_active', true);

    // Calculate summary stats
    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    const summary = {
      totalCertifications: certifications?.length || 0,
      activeCertifications: 0,
      expiringIn30Days: 0,
      expiredCertifications: 0,
      trainingHoursThisYear: 0,
      trainingSessionsThisYear: 0,
      activeRestrictions: restrictions?.length || 0,
    };

    const currentYear = today.getFullYear();

    if (certifications) {
      for (const cert of certifications) {
        if (cert.status === 'expired') {
          summary.expiredCertifications++;
        } else if (cert.status === 'active') {
          if (cert.expiry_date) {
            const expiryDate = new Date(cert.expiry_date);
            if (expiryDate < today) {
              summary.expiredCertifications++;
            } else if (expiryDate <= in30Days) {
              summary.expiringIn30Days++;
              summary.activeCertifications++;
            } else {
              summary.activeCertifications++;
            }
          } else {
            summary.activeCertifications++;
          }
        }
      }
    }

    if (trainingRecords) {
      for (const record of trainingRecords) {
        const recordDate = new Date(record.completed_date);
        if (recordDate.getFullYear() === currentYear) {
          summary.trainingSessionsThisYear++;
          if (record.hours_completed) {
            summary.trainingHoursThisYear += parseFloat(record.hours_completed);
          }
        }
      }
    }

    return NextResponse.json({
      worker,
      certifications: certifications || [],
      trainingRecords: trainingRecords || [],
      restrictions: restrictions || [],
      summary,
    });
  } catch (error) {
    console.error('Error in GET /api/workers/[id]/certifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
