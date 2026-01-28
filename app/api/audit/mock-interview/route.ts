/**
 * Mock Interview API - Start/Get Sessions
 * 
 * POST: Start a new mock interview session
 * GET: Get session history for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuth, type AuthError } from '@/lib/auth/helpers';
import {
  createInterviewSession,
  buildSystemPrompt,
  buildOpeningInstruction,
  type AuditType,
  type WorkerProfile
} from '@/lib/audit/mock-interview';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = createRouteHandlerClient();

    const body = await request.json();
    const {
      auditType,
      workerId,
      focusElement,
      isAnonymous = false
    } = body as {
      auditType: AuditType;
      workerId?: string;
      focusElement?: number;
      isAnonymous?: boolean;
    };

    // Validate audit type
    if (!['full', 'quick', 'element_specific'].includes(auditType)) {
      return NextResponse.json(
        { error: 'Invalid audit type' },
        { status: 400 }
      );
    }

    // Validate element-specific audit has element
    if (auditType === 'element_specific' && !focusElement) {
      return NextResponse.json(
        { error: 'Element number required for element-specific audit' },
        { status: 400 }
      );
    }

    // Get worker profile if workerId provided
    let workerProfile: WorkerProfile | undefined;
    if (workerId) {
      const { data: worker } = await supabase
        .from('workers')
        .select('id, first_name, last_name, position')
        .eq('id', workerId)
        .eq('company_id', user.companyId)
        .single();

      if (worker) {
        workerProfile = {
          id: worker.id,
          firstName: worker.first_name,
          lastName: worker.last_name,
          position: worker.position || 'Worker'
        };
      }
    }

    // Get user profile for session if no worker specified
    let userProfileId: string | undefined;
    if (!workerId) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, position')
        .eq('user_id', user.userId)
        .single();

      if (profile) {
        userProfileId = profile.id;
        if (!workerProfile) {
          workerProfile = {
            id: profile.id,
            firstName: profile.first_name || 'Worker',
            lastName: profile.last_name || '',
            position: profile.position || 'Worker'
          };
        }
      }
    }

    // Get company name
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', user.companyId)
      .single();

    // Create the interview session
    const session = createInterviewSession(
      user.companyId,
      auditType,
      workerProfile,
      focusElement,
      isAnonymous
    );

    // Build system prompt for context
    const systemPrompt = buildSystemPrompt(session, workerProfile, company?.name);
    const openingInstruction = buildOpeningInstruction(session, workerProfile);

    // Save session to database
    const { data: savedSession, error: saveError } = await supabase
      .from('mock_interview_sessions')
      .insert({
        id: session.id,
        company_id: user.companyId,
        worker_id: workerId || null,
        user_profile_id: userProfileId || null,
        audit_type: auditType,
        focus_element: focusElement || null,
        started_at: session.startedAt,
        messages: session.messages,
        scores: session.scores,
        questions_asked: session.questionsAsked,
        status: session.status,
        is_anonymous: isAnonymous
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save session:', saveError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session: {
        ...session,
        systemPrompt,
        openingInstruction
      },
      worker: workerProfile
    });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = createRouteHandlerClient();

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const workerId = url.searchParams.get('workerId');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    let query = supabase
      .from('mock_interview_sessions')
      .select(`
        id,
        worker_id,
        user_profile_id,
        audit_type,
        focus_element,
        started_at,
        completed_at,
        status,
        is_anonymous,
        created_at
      `)
      .eq('company_id', user.companyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (workerId) {
      query = query.eq('worker_id', workerId);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Failed to fetch sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
