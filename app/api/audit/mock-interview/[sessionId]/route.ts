/**
 * Mock Interview Session API
 * 
 * GET: Get a specific session
 * PUT: Update session (add message, update status)
 * DELETE: Abandon a session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuth, type AuthError } from '@/lib/auth/helpers';

export const dynamic = 'force-dynamic';


export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await requireAuth();
    const supabase = createRouteHandlerClient();

    const { data: session, error } = await supabase
      .from('mock_interview_sessions')
      .select('*')
      .eq('id', params.sessionId)
      .eq('company_id', user.companyId)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await requireAuth();
    const supabase = createRouteHandlerClient();

    const body = await request.json();
    const { action, data } = body as {
      action: 'add_message' | 'update_status' | 'add_score' | 'update_question';
      data: unknown;
    };

    // Get current session
    const { data: session, error: fetchError } = await supabase
      .from('mock_interview_sessions')
      .select('*')
      .eq('id', params.sessionId)
      .eq('company_id', user.companyId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Prepare update based on action
    type SessionUpdate = {
      messages?: unknown[];
      status?: string;
      completed_at?: string;
      scores?: Record<string, unknown>;
      questions_asked?: string[];
      current_question_id?: string;
    };
    const updates: SessionUpdate = {};

    switch (action) {
      case 'add_message': {
        const messageData = data as {
          role: 'auditor' | 'worker';
          content: string;
          questionId?: string;
        };
        const newMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: messageData.role,
          content: messageData.content,
          timestamp: new Date().toISOString(),
          questionId: messageData.questionId
        };
        updates.messages = [...(session.messages || []), newMessage];
        break;
      }

      case 'update_status': {
        const statusData = data as { status: string };
        updates.status = statusData.status;
        if (statusData.status === 'completed') {
          updates.completed_at = new Date().toISOString();
        }
        break;
      }

      case 'add_score': {
        const scoreData = data as {
          questionId: string;
          score: number;
          reasoning: string;
          keyPointsCovered: string[];
          missingPoints: string[];
          wouldPassAudit: boolean;
        };
        updates.scores = {
          ...(session.scores || {}),
          [scoreData.questionId]: scoreData
        };
        updates.questions_asked = [...(session.questions_asked || []), scoreData.questionId];
        break;
      }

      case 'update_question': {
        const questionData = data as { questionId: string };
        updates.current_question_id = questionData.questionId;
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Apply updates
    const { data: updatedSession, error: updateError } = await supabase
      .from('mock_interview_sessions')
      .update(updates)
      .eq('id', params.sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update session:', updateError);
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ session: updatedSession });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await requireAuth();
    const supabase = createRouteHandlerClient();

    // Update session status to abandoned
    const { error } = await supabase
      .from('mock_interview_sessions')
      .update({ status: 'abandoned' })
      .eq('id', params.sessionId)
      .eq('company_id', user.companyId);

    if (error) {
      console.error('Failed to abandon session:', error);
      return NextResponse.json(
        { error: 'Failed to abandon session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
