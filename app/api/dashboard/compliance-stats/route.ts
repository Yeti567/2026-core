/**
 * Dashboard Compliance Stats API
 * 
 * Aggregates compliance statistics from the audit engine for the home dashboard.
 * Tracks inspections, hazard assessments, training, and compares against required frequencies.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerUserOrRedirect } from '@/lib/auth/helpers';

// Frequency requirements based on COR audit standards
const FREQUENCY_REQUIREMENTS = {
  daily: {
    hazard_assessments: { min: 20, label: 'Daily Hazard Assessments', period: 'month' },
  },
  weekly: {
    inspections: { min: 4, label: 'Weekly Inspections', period: 'month' },
    toolbox_talks: { min: 4, label: 'Toolbox Talks', period: 'month' },
  },
  monthly: {
    safety_meetings: { min: 1, label: 'Safety Meetings', period: 'month' },
    equipment_inspections: { min: 1, label: 'Equipment Inspections', period: 'month' },
  },
  quarterly: {
    emergency_drills: { min: 1, label: 'Emergency Drills', period: 'quarter' },
    management_reviews: { min: 1, label: 'Management Reviews', period: 'quarter' },
  },
  annual: {
    policy_reviews: { min: 1, label: 'Policy Reviews', period: 'year' },
    training_needs_assessment: { min: 1, label: 'Training Needs Assessment', period: 'year' },
  },
};

// Form codes that map to each activity type
const FORM_CODE_MAPPING: Record<string, string[]> = {
  hazard_assessments: ['hazard_assessment', 'jha_form', 'job_hazard_analysis', 'field_level_hazard_assessment'],
  inspections: ['workplace_inspection', 'site_inspection', 'safety_inspection', 'inspection_form'],
  toolbox_talks: ['toolbox_talk', 'safety_talk', 'tailgate_meeting'],
  safety_meetings: ['safety_meeting', 'safety_committee_meeting', 'jhsc_meeting'],
  equipment_inspections: ['equipment_inspection', 'pre_use_inspection', 'vehicle_inspection'],
  emergency_drills: ['emergency_drill', 'fire_drill', 'evacuation_drill'],
  management_reviews: ['management_review', 'annual_review', 'safety_program_review'],
  policy_reviews: ['policy_review', 'policy_acknowledgment'],
  training_needs_assessment: ['training_needs', 'competency_assessment'],
};

export async function GET() {
  try {
    const user = await getServerUserOrRedirect();
    const supabase = await createClient();

    if (!user.companyId) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    const companyId = user.companyId;
    const now = new Date();
    
    // Calculate date ranges
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Fetch form submissions for the current period
    const { data: submissions } = await supabase
      .from('form_submissions')
      .select('id, form_template_id, submitted_at, status, form_templates(form_code, name)')
      .eq('company_id', companyId)
      .eq('status', 'submitted')
      .gte('submitted_at', startOfYear.toISOString());

    // Count submissions by form code
    const submissionCounts: Record<string, { month: number; quarter: number; year: number }> = {};
    
    for (const submission of submissions || []) {
      const formCode = (submission.form_templates as any)?.form_code;
      if (!formCode) continue;
      
      if (!submissionCounts[formCode]) {
        submissionCounts[formCode] = { month: 0, quarter: 0, year: 0 };
      }
      
      const submittedAt = new Date(submission.submitted_at);
      submissionCounts[formCode].year++;
      
      if (submittedAt >= startOfQuarter) {
        submissionCounts[formCode].quarter++;
      }
      if (submittedAt >= startOfMonth) {
        submissionCounts[formCode].month++;
      }
    }

    // Calculate activity stats
    const activityStats: Record<string, { done: number; required: number; label: string; status: 'good' | 'warning' | 'critical' }> = {};

    for (const [activityType, formCodes] of Object.entries(FORM_CODE_MAPPING)) {
      let totalCount = 0;
      
      for (const code of formCodes) {
        if (submissionCounts[code]) {
          // Determine which period to use based on frequency
          if (FREQUENCY_REQUIREMENTS.daily[activityType as keyof typeof FREQUENCY_REQUIREMENTS.daily]) {
            totalCount += submissionCounts[code].month;
          } else if (FREQUENCY_REQUIREMENTS.weekly[activityType as keyof typeof FREQUENCY_REQUIREMENTS.weekly]) {
            totalCount += submissionCounts[code].month;
          } else if (FREQUENCY_REQUIREMENTS.monthly[activityType as keyof typeof FREQUENCY_REQUIREMENTS.monthly]) {
            totalCount += submissionCounts[code].month;
          } else if (FREQUENCY_REQUIREMENTS.quarterly[activityType as keyof typeof FREQUENCY_REQUIREMENTS.quarterly]) {
            totalCount += submissionCounts[code].quarter;
          } else if (FREQUENCY_REQUIREMENTS.annual[activityType as keyof typeof FREQUENCY_REQUIREMENTS.annual]) {
            totalCount += submissionCounts[code].year;
          }
        }
      }

      // Find the requirement for this activity
      let requirement: { min: number; label: string; period: string } | null = null;
      let label = activityType.replace(/_/g, ' ');
      
      for (const freq of Object.values(FREQUENCY_REQUIREMENTS)) {
        const freqTyped = freq as Record<string, { min: number; label: string; period: string }>;
        if (freqTyped[activityType]) {
          requirement = freqTyped[activityType];
          label = requirement.label;
          break;
        }
      }

      const required = requirement?.min || 0;
      const percentage = required > 0 ? (totalCount / required) * 100 : 100;
      
      activityStats[activityType] = {
        done: totalCount,
        required,
        label,
        status: percentage >= 100 ? 'good' : percentage >= 50 ? 'warning' : 'critical',
      };
    }

    // Fetch certification/training stats
    const { data: employees } = await supabase
      .from('company_users')
      .select('user_id')
      .eq('company_id', companyId)
      .eq('is_active', true);

    const employeeCount = employees?.length || 0;

    const { data: certifications } = await supabase
      .from('certifications')
      .select('id, worker_id, expiry_date, status')
      .eq('company_id', companyId);

    // Calculate training stats
    const validCerts = certifications?.filter(c => 
      c.status === 'valid' || 
      (c.expiry_date && new Date(c.expiry_date) > now)
    ).length || 0;

    const expiringSoon = certifications?.filter(c => 
      c.expiry_date && 
      new Date(c.expiry_date) > now && 
      new Date(c.expiry_date) <= thirtyDaysFromNow
    ).length || 0;

    const expired = certifications?.filter(c => 
      c.expiry_date && new Date(c.expiry_date) <= now
    ).length || 0;

    // Get unique workers with valid certs
    const workersWithCerts = new Set(
      certifications?.filter(c => 
        c.status === 'valid' || 
        (c.expiry_date && new Date(c.expiry_date) > now)
      ).map(c => c.worker_id) || []
    );

    const trainingCompliancePercent = employeeCount > 0 
      ? Math.round((workersWithCerts.size / employeeCount) * 100) 
      : 0;

    // Fetch audit readiness from existing API
    let auditReadiness = { percentage: 0, status: 'critical', gapsCount: 0 };
    try {
      const auditRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/audit/compliance`, {
        headers: { cookie: '' }, // Will use server-side auth
      });
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        auditReadiness = {
          percentage: auditData.overall?.percentage || 0,
          status: auditData.overall?.status || 'critical',
          gapsCount: auditData.elements?.reduce((sum: number, el: any) => sum + (el.gaps?.length || 0), 0) || 0,
        };
      }
    } catch (e) {
      // Audit API not available, use defaults
    }

    // Build response
    const response = {
      summary: {
        auditReadiness: auditReadiness.percentage,
        auditStatus: auditReadiness.status,
        trainingCompliance: trainingCompliancePercent,
        totalGaps: auditReadiness.gapsCount,
        expiringSoon,
        expired,
      },
      activities: {
        daily: {
          hazardAssessments: activityStats.hazard_assessments,
        },
        weekly: {
          inspections: activityStats.inspections,
          toolboxTalks: activityStats.toolbox_talks,
        },
        monthly: {
          safetyMeetings: activityStats.safety_meetings,
          equipmentInspections: activityStats.equipment_inspections,
        },
        quarterly: {
          emergencyDrills: activityStats.emergency_drills,
          managementReviews: activityStats.management_reviews,
        },
        annual: {
          policyReviews: activityStats.policy_reviews,
        },
      },
      training: {
        totalEmployees: employeeCount,
        employeesWithCerts: workersWithCerts.size,
        compliancePercent: trainingCompliancePercent,
        validCertifications: validCerts,
        expiringSoon,
        expired,
      },
      period: {
        month: startOfMonth.toISOString(),
        quarter: startOfQuarter.toISOString(),
        year: startOfYear.toISOString(),
      },
      lastUpdated: now.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Compliance stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compliance stats' },
      { status: 500 }
    );
  }
}
