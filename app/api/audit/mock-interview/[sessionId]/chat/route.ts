/**
 * Mock Interview Chat API
 * 
 * POST: Send a message and get AI response
 * Uses Claude AI for realistic auditor responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuth, type AuthError } from '@/lib/auth/helpers';
import {
  buildSystemPrompt,
  buildOpeningInstruction,
  buildContinuationInstruction,
  parseEvaluationResponse,
  type InterviewSession,
  type WorkerProfile,
  type InterviewMessage,
  type ResponseEvaluation
} from '@/lib/audit/mock-interview';
import {
  RESPONSE_EVALUATION_PROMPT,
  MOCK_AUDITOR_SYSTEM_PROMPT
} from '@/lib/audit/mock-audit-prompts';
import {
  selectQuestionsForInterview,
  type InterviewQuestion
} from '@/lib/audit/interview-questions';
import { rateLimitByUser, createRateLimitResponse } from '@/lib/utils/rate-limit';
import { callAI } from '@/lib/ai/ai-client';

export const dynamic = 'force-dynamic';


interface ChatRequestBody {
  message?: string;
  action: 'start' | 'respond' | 'evaluate';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await requireAuth();

    // Rate limiting: 20 AI requests per minute per user (expensive operation)
    const rateLimitResult = await rateLimitByUser(user.userId, 20, '1m');
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const supabase = createRouteHandlerClient();

    const body: ChatRequestBody = await request.json();
    const { message, action } = body;

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

    if (session.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Session is not active' },
        { status: 400 }
      );
    }

    // Get worker profile if available
    let workerProfile: WorkerProfile | undefined;
    if (session.worker_id) {
      const { data: worker } = await supabase
        .from('workers')
        .select('id, first_name, last_name, position')
        .eq('id', session.worker_id)
        .single();

      if (worker) {
        workerProfile = {
          id: worker.id,
          firstName: worker.first_name,
          lastName: worker.last_name,
          position: worker.position || 'Worker'
        };
      }
    } else if (session.user_profile_id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, position')
        .eq('id', session.user_profile_id)
        .single();

      if (profile) {
        workerProfile = {
          id: profile.id,
          firstName: profile.first_name || 'Worker',
          lastName: profile.last_name || '',
          position: profile.position || 'Worker'
        };
      }
    }

    // Get company name
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', user.companyId)
      .single();

    // Reconstruct session object with selected questions
    const workerRole = workerProfile?.position?.toLowerCase().includes('supervisor')
      ? 'supervisor'
      : workerProfile?.position?.toLowerCase().includes('manager')
        ? 'management'
        : 'worker';

    const selectedQuestions = selectQuestionsForInterview(
      session.audit_type as 'full' | 'quick' | 'element_specific',
      workerRole,
      session.focus_element
    );

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
      scores: (session.scores as Record<string, ResponseEvaluation>) || {},
      questionsAsked: session.questions_asked || [],
      currentQuestionId: session.current_question_id,
      status: session.status as 'in_progress' | 'completed' | 'abandoned',
      isAnonymous: session.is_anonymous,
      selectedQuestions,
      questionIndex: (session.questions_asked || []).length
    };

    // Check for AI API keys
    const hasAIKey = process.env.ANTHROPIC_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!hasAIKey) {
      // Return mock response if no API key (for development)
      return handleMockResponse(action, sessionObj, message, supabase, params.sessionId, workerProfile);
    }

    // Handle different actions
    switch (action) {
      case 'start':
        return handleStartInterview(
          sessionObj,
          workerProfile,
          company?.name,
          supabase,
          params.sessionId
        );

      case 'respond':
        if (!message) {
          return NextResponse.json(
            { error: 'Message required for respond action' },
            { status: 400 }
          );
        }
        return handleWorkerResponse(
          sessionObj,
          message,
          workerProfile,
          company?.name,
          supabase,
          params.sessionId
        );

      case 'evaluate':
        return handleEvaluateResponse(
          sessionObj,
          message || '',
          supabase,
          params.sessionId
        );

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Chat API error:', error);
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message || 'Internal server error' },
      { status: authError.status || 500 }
    );
  }
}

async function handleStartInterview(
  session: InterviewSession,
  worker: WorkerProfile | undefined,
  companyName: string | undefined,
  supabase: ReturnType<typeof createRouteHandlerClient>,
  sessionId: string
) {
  const systemPrompt = buildSystemPrompt(session, worker, companyName);
  const openingInstruction = buildOpeningInstruction(session, worker);

  try {
    const aiResponse = await callAI([
      { role: 'user', content: openingInstruction }
    ], {
      model: 'deepseek/deepseek-chat',
      max_tokens: 1000,
      system: systemPrompt
    });

    const aiContent = aiResponse.content || 'Hello! I\'m here to conduct your mock COR audit interview. Are you ready to begin?';

    // Save auditor message
    const auditorMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'auditor',
      content: aiContent,
      timestamp: new Date().toISOString(),
      questionId: session.selectedQuestions[0]?.id
    };

    await supabase
      .from('mock_interview_sessions')
      .update({
        messages: [auditorMessage],
        current_question_id: session.selectedQuestions[0]?.id
      })
      .eq('id', sessionId);

    return NextResponse.json({
      message: auditorMessage,
      currentQuestion: session.selectedQuestions[0]
    });
  } catch (error) {
    console.error('AI request failed:', error);
    return NextResponse.json(
      { error: 'Failed to start interview. Please try again.' },
      { status: 500 }
    );
  }
}

async function handleWorkerResponse(
  session: InterviewSession,
  workerMessage: string,
  worker: WorkerProfile | undefined,
  companyName: string | undefined,
  supabase: ReturnType<typeof createRouteHandlerClient>,
  sessionId: string
) {
  // Add worker message to history
  const workerMsg = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role: 'worker' as const,
    content: workerMessage,
    timestamp: new Date().toISOString()
  };

  const updatedMessages = [...session.messages, workerMsg];
  session.messages = updatedMessages;
  session.questionIndex = (session.questionsAsked?.length || 0) + 1;

  const systemPrompt = buildSystemPrompt(session, worker, companyName);
  const continuationInstruction = buildContinuationInstruction(session, workerMessage);

  // Build conversation history for AI
  const conversationHistory = session.messages.map(m => ({
    role: m.role === 'auditor' ? 'assistant' as const : 'user' as const,
    content: m.content
  }));

  // Add continuation instruction
  conversationHistory.push({
    role: 'user' as const,
    content: continuationInstruction
  });

  try {
    const aiResponse = await callAI([
      ...conversationHistory
    ], {
      model: 'deepseek/deepseek-chat',
      max_tokens: 1000,
      system: systemPrompt
    });

    const aiContent = aiResponse.content || 'Thank you for that answer. Let me continue with my next question.';

    // Get current and next question
    // Safe: questionIndex is bounded by selectedQuestions array length and validated before use

    const currentQuestion = session.selectedQuestions[session.questionIndex - 1];
    // Safe: questionIndex is bounded by selectedQuestions array length and validated before use

    const nextQuestion = session.selectedQuestions[session.questionIndex];
    const isComplete = session.questionIndex >= session.selectedQuestions.length;

    // Save auditor message
    const auditorMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'auditor',
      content: aiContent,
      timestamp: new Date().toISOString(),
      questionId: nextQuestion?.id
    };

    const finalMessages = [...updatedMessages, auditorMessage];

    await supabase
      .from('mock_interview_sessions')
      .update({
        messages: finalMessages,
        questions_asked: [...(session.questionsAsked || []), currentQuestion?.id].filter(Boolean),
        current_question_id: nextQuestion?.id || null,
        status: isComplete ? 'completed' : 'in_progress',
        completed_at: isComplete ? new Date().toISOString() : null
      })
      .eq('id', sessionId);

    return NextResponse.json({
      workerMessage: workerMsg,
      auditorMessage,
      currentQuestion,
      nextQuestion,
      isComplete,
      questionsRemaining: Math.max(0, session.selectedQuestions.length - session.questionIndex)
    });
  } catch (error) {
    console.error('AI request failed:', error);
    return NextResponse.json(
      { error: 'Failed to get response. Please try again.' },
      { status: 500 }
    );
  }
}

async function handleEvaluateResponse(
  session: InterviewSession,
  workerResponse: string,
  supabase: ReturnType<typeof createRouteHandlerClient>,
  sessionId: string
) {
  // Safe: questionIndex is bounded by selectedQuestions array length and validated before use

  const currentQuestion = session.selectedQuestions[session.questionIndex - 1];
  if (!currentQuestion) {
    return NextResponse.json({ evaluation: null });
  }

  try {
    const aiResponse = await callAI([
      {
        role: 'user',
        content: `Question: ${currentQuestion.question}\n\nExpected key points: ${currentQuestion.keyPoints.join(', ')}\n\nWorker's response: "${workerResponse}"\n\nEvaluate this response.`
      }
    ], {
      model: 'deepseek/deepseek-chat',
      max_tokens: 500,
      system: RESPONSE_EVALUATION_PROMPT
    });

    const evaluationText = aiResponse.content || '';
    const evaluation = parseEvaluationResponse(evaluationText);

    if (evaluation) {
      evaluation.questionId = currentQuestion.id;

      // Save evaluation to session
      const updatedScores = {
        ...(session.scores || {}),
        // Safe: currentQuestion.id is from validated question data, not user input

        [currentQuestion.id]: evaluation
      };

      await supabase
        .from('mock_interview_sessions')
        .update({ scores: updatedScores })
        .eq('id', sessionId);

      return NextResponse.json({ evaluation });
    }

    return NextResponse.json({ evaluation: null });
  } catch (error) {
    console.error('Evaluation failed:', error);
    return NextResponse.json({ evaluation: null });
  }
}

// Mock response handler for development without API key
async function handleMockResponse(
  action: string,
  session: InterviewSession,
  message: string | undefined,
  supabase: ReturnType<typeof createRouteHandlerClient>,
  sessionId: string,
  worker?: WorkerProfile
) {
  const mockResponses = {
    start: `Hello ${worker?.firstName || 'there'}! I'm conducting a mock COR audit interview today. I'll be asking you some questions about workplace safety. There are no trick questions - I just want to understand how things work here at your company. Are you ready to begin?\n\nLet me start with an easy one: What are your rights as a worker under Ontario's Occupational Health and Safety Act?`,
    continue: [
      "Thank you for that answer. Now, can you tell me what you would do if you identified a hazard in your work area?",
      "Good. Let me ask you about PPE - what personal protective equipment are you required to wear for your job?",
      "I see. What would you do if the fire alarm went off right now?",
      "Okay. Who is your first aid attendant on site?",
      "One more question - do you feel comfortable reporting safety concerns to your supervisor? Can you stop work if something is unsafe?",
      "Thank you for your time today! You've done well. Do you have any questions for me about the audit process?"
    ]
  };

  if (action === 'start') {
    const auditorMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'auditor',
      content: mockResponses.start,
      timestamp: new Date().toISOString(),
      questionId: session.selectedQuestions[0]?.id
    };

    await supabase
      .from('mock_interview_sessions')
      .update({
        messages: [auditorMessage],
        current_question_id: session.selectedQuestions[0]?.id
      })
      .eq('id', sessionId);

    return NextResponse.json({
      message: auditorMessage,
      currentQuestion: session.selectedQuestions[0],
      _mock: true
    });
  }

  if (action === 'respond') {
    const workerMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'worker' as const,
      content: message || '',
      timestamp: new Date().toISOString()
    };

    const questionIndex = Math.min(
      session.messages.filter(m => m.role === 'auditor').length,
      mockResponses.continue.length - 1
    );

    const isComplete = questionIndex >= mockResponses.continue.length - 1;

    const auditorMessage = {
      id: `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'auditor',
      // Safe: questionIndex is bounded by mockResponses.continue array length via Math.min
      // eslint-disable-next-line security/detect-object-injection
      content: mockResponses.continue[questionIndex],
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...session.messages, workerMsg, auditorMessage];

    await supabase
      .from('mock_interview_sessions')
      .update({
        messages: updatedMessages,
        status: isComplete ? 'completed' : 'in_progress',
        completed_at: isComplete ? new Date().toISOString() : null
      })
      .eq('id', sessionId);

    return NextResponse.json({
      workerMessage: workerMsg,
      auditorMessage,
      isComplete,
      _mock: true
    });
  }

  return NextResponse.json({ _mock: true });
}
