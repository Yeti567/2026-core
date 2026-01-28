/**
 * API Routes for Task Subtasks
 * 
 * PUT - Update subtask completion status
 * POST - Add new subtask
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const body = await request.json();
    const { subtaskId, completed } = body;

    if (!subtaskId) {
      return NextResponse.json({ error: 'Subtask ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      completed: !!completed
    };

    if (completed) {
      updateData.completed_at = new Date().toISOString();
      updateData.completed_by = profile?.id;
    } else {
      updateData.completed_at = null;
      updateData.completed_by = null;
    }

    const { data: subtask, error } = await supabase
      .from('action_subtasks')
      .update(updateData)
      .eq('id', subtaskId)
      .eq('task_id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating subtask:', error);
      return NextResponse.json({ error: 'Failed to update subtask' }, { status: 500 });
    }

    return NextResponse.json({ subtask });

  } catch (error) {
    console.error('Subtask PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, due_date } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Subtask title is required' }, { status: 400 });
    }

    // Get current max sort order
    const { data: existingSubtasks } = await supabase
      .from('action_subtasks')
      .select('sort_order')
      .eq('task_id', taskId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextSortOrder = (existingSubtasks?.[0]?.sort_order ?? -1) + 1;

    const { data: subtask, error } = await supabase
      .from('action_subtasks')
      .insert({
        task_id: taskId,
        title: title.trim(),
        due_date: due_date || null,
        completed: false,
        sort_order: nextSortOrder
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating subtask:', error);
      return NextResponse.json({ error: 'Failed to create subtask' }, { status: 500 });
    }

    return NextResponse.json({ subtask });

  } catch (error) {
    console.error('Subtask POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
