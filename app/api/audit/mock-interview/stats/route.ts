/**
 * Mock Interview Statistics API
 * 
 * GET: Get mock audit readiness statistics for the company
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuth, type AuthError } from '@/lib/auth/helpers';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = createRouteHandlerClient();

    // Get all workers in company
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('id, first_name, last_name, position')
      .eq('company_id', user.companyId);

    if (workersError) {
      console.error('Failed to fetch workers:', workersError);
      return NextResponse.json(
        { error: 'Failed to fetch workers' },
        { status: 500 }
      );
    }

    // Get all completed interview reports
    const { data: reports, error: reportsError } = await supabase
      .from('mock_interview_reports')
      .select('worker_id, user_profile_id, overall_score, ready_for_audit, completed_at')
      .eq('company_id', user.companyId)
      .order('completed_at', { ascending: false });

    if (reportsError) {
      console.error('Failed to fetch reports:', reportsError);
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      );
    }

    // Get session counts
    const { data: sessions } = await supabase
      .from('mock_interview_sessions')
      .select('id, status')
      .eq('company_id', user.companyId);

    // Calculate statistics
    const totalWorkers = workers?.length || 0;
    
    // Get unique workers who have completed a mock audit
    const workersWithReports = new Set<string>();
    const workerBestScores: Record<string, number> = {};
    
    for (const report of (reports || [])) {
      const workerId = report.worker_id || report.user_profile_id;
      if (workerId) {
        workersWithReports.add(workerId);
        // Safe: workerId is validated UUID from database
        // eslint-disable-next-line security/detect-object-injection
        const currentBest = workerBestScores[workerId] || 0;
        // Safe: workerId is validated UUID from database
        // eslint-disable-next-line security/detect-object-injection
        workerBestScores[workerId] = Math.max(currentBest, report.overall_score);
      }
    }

    const workersCompletedAudit = workersWithReports.size;
    const workersPassedAudit = Object.values(workerBestScores).filter(score => score >= 70).length;
    const workersFailedAudit = Object.values(workerBestScores).filter(score => score < 70).length;
    const workersNotAudited = Math.max(0, totalWorkers - workersCompletedAudit);

    // Calculate average score
    const allScores = Object.values(workerBestScores);
    const averageScore = allScores.length > 0 
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0;

    // Session statistics
    const totalSessions = sessions?.length || 0;
    const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;
    const abandonedSessions = sessions?.filter(s => s.status === 'abandoned').length || 0;

    // Get workers needing attention (failed or not audited)
    const workersNeedingAttention = workers?.filter(w => {
      const bestScore = workerBestScores[w.id];
      return bestScore === undefined || bestScore < 70;
    }).map(w => ({
      id: w.id,
      name: `${w.first_name} ${w.last_name}`,
      position: w.position,
      score: workerBestScores[w.id],
      status: workerBestScores[w.id] === undefined ? 'not_audited' : 'failed'
    })) || [];

    // Calculate readiness percentage
    const readinessPercentage = totalWorkers > 0
      ? Math.round((workersPassedAudit / totalWorkers) * 100)
      : 0;

    return NextResponse.json({
      summary: {
        totalWorkers,
        workersCompletedAudit,
        workersPassedAudit,
        workersFailedAudit,
        workersNotAudited,
        averageScore,
        readinessPercentage
      },
      sessions: {
        total: totalSessions,
        completed: completedSessions,
        abandoned: abandonedSessions,
        inProgress: totalSessions - completedSessions - abandonedSessions
      },
      workersNeedingAttention: workersNeedingAttention.slice(0, 10),
      readyForAudit: readinessPercentage >= 80,
      recommendation: getRecommendation(readinessPercentage, workersNotAudited, workersFailedAudit)
    });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}

function getRecommendation(
  readinessPercentage: number,
  workersNotAudited: number,
  workersFailedAudit: number
): string {
  if (readinessPercentage >= 80 && workersNotAudited === 0) {
    return 'Excellent! Your team is well-prepared for the COR audit interview component.';
  }
  
  if (workersNotAudited > workersFailedAudit) {
    return `Priority: ${workersNotAudited} workers haven't completed mock audits yet. Schedule practice sessions for these workers.`;
  }
  
  if (workersFailedAudit > 0) {
    return `${workersFailedAudit} workers need additional practice. Focus on training and re-testing these individuals.`;
  }
  
  return 'Continue regular mock audit practice to maintain readiness.';
}
