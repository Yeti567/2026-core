/**
 * Mock Interview Report API
 * 
 * POST: Generate final report for completed session
 * GET: Get existing report for session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuth, type AuthError } from '@/lib/auth/helpers';
import {
  generateBasicReport,
  parseReportResponse,
  calculateDuration,
  calculateOverallScore,
  type InterviewSession,
  type InterviewMessage
} from '@/lib/audit/mock-interview';
import { MOCK_AUDITOR_CONCLUSION_PROMPT } from '@/lib/audit/mock-audit-prompts';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await requireAuth();
    const supabase = createRouteHandlerClient();

    // Check for existing report
    const { data: report, error } = await supabase
      .from('mock_interview_reports')
      .select('*')
      .eq('session_id', params.sessionId)
      .eq('company_id', user.companyId)
      .single();

    if (error || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ report });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await requireAuth();
    const supabase = createRouteHandlerClient();

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('mock_interview_sessions')
      .select('*')
      .eq('id', params.sessionId)
      .eq('company_id', user.companyId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if report already exists
    const { data: existingReport } = await supabase
      .from('mock_interview_reports')
      .select('id')
      .eq('session_id', params.sessionId)
      .single();

    if (existingReport) {
      // Return existing report
      const { data: report } = await supabase
        .from('mock_interview_reports')
        .select('*')
        .eq('id', existingReport.id)
        .single();

      return NextResponse.json({ report, existing: true });
    }

    // Reconstruct session object
    const sessionObj: InterviewSession = {
      id: session.id,
      companyId: session.company_id,
      workerId: session.worker_id,
      userProfileId: session.user_profile_id,
      auditType: session.audit_type as 'full' | 'quick' | 'element_specific',
      focusElement: session.focus_element,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      messages: session.messages as InterviewMessage[] || [],
      scores: session.scores as Record<string, { score: number; reasoning: string; keyPointsCovered: string[]; missingPoints: string[]; wouldPassAudit: boolean; questionId: string }> || {},
      questionsAsked: session.questions_asked || [],
      currentQuestionId: session.current_question_id,
      status: session.status as 'in_progress' | 'completed' | 'abandoned',
      isAnonymous: session.is_anonymous,
      selectedQuestions: [],
      questionIndex: (session.questions_asked || []).length
    };

    // Check for Anthropic API key
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    let report = generateBasicReport(sessionObj);

    if (anthropicKey && sessionObj.messages.length > 0) {
      // Use AI to generate detailed feedback
      try {
        const conversationSummary = sessionObj.messages.map(m => 
          `${m.role === 'auditor' ? 'Auditor' : 'Worker'}: ${m.content}`
        ).join('\n\n');

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000,
            system: MOCK_AUDITOR_CONCLUSION_PROMPT,
            messages: [
              {
                role: 'user',
                content: `Review this mock COR audit interview and provide detailed feedback:\n\n${conversationSummary}\n\nProvide your assessment in the specified JSON format.`
              }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const aiReport = parseReportResponse(data.content?.[0]?.text || '');
          
          if (aiReport) {
            // Merge AI insights with basic report
            report = {
              ...report,
              overallScore: aiReport.overallScore || report.overallScore,
              readyForAudit: aiReport.readyForAudit ?? report.readyForAudit,
              strengths: aiReport.strengths || report.strengths,
              weaknesses: aiReport.weaknesses || report.weaknesses,
              recommendations: aiReport.recommendations || report.recommendations,
              feedback: aiReport.feedback || report.feedback,
              assessment: aiReport.assessment || report.assessment
            };
          }
        }
      } catch (aiError) {
        console.error('AI report generation failed, using basic report:', aiError);
      }
    }

    // Save report to database
    const { data: savedReport, error: saveError } = await supabase
      .from('mock_interview_reports')
      .insert({
        session_id: params.sessionId,
        company_id: user.companyId,
        worker_id: session.worker_id,
        user_profile_id: session.user_profile_id,
        completed_at: new Date().toISOString(),
        duration_minutes: report.durationMinutes,
        overall_score: report.overallScore,
        questions_asked: report.questionsAsked,
        questions_answered_well: report.questionsAnsweredWell,
        strengths: report.strengths,
        weaknesses: report.weaknesses,
        recommendations: report.recommendations,
        feedback: report.feedback,
        ready_for_audit: report.readyForAudit
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save report:', saveError);
      return NextResponse.json(
        { error: 'Failed to save report' },
        { status: 500 }
      );
    }

    // Update session status to completed if not already
    if (session.status !== 'completed') {
      await supabase
        .from('mock_interview_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', params.sessionId);
    }

    return NextResponse.json({ 
      report: {
        ...savedReport,
        assessment: report.assessment
      }
    });
  } catch (error) {
    console.error('Report generation error:', error);
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message || 'Failed to generate report' },
      { status: authError.status || 500 }
    );
  }
}
