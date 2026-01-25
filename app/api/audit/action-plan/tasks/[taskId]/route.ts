/**
 * API Routes for Action Tasks
 * 
 * GET - Get task details with subtasks and notes
 * PUT - Update task (status, assigned_to, due_date, etc.)
 * POST - Add a note to the task
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
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

    const { data: task, error } = await supabase
      .from('action_tasks')
      .select(`
        *,
        action_subtasks (*),
        action_task_notes (
          *,
          user:user_profiles (first_name, last_name)
        ),
        assigned_user:user_profiles!action_tasks_assigned_to_fkey (
          id, first_name, last_name, role
        )
      `)
      .eq('id', taskId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
    }

    return NextResponse.json({ task });

  } catch (error) {
    console.error('Task GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    // Get user profile for completion tracking
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const body = await request.json();
    const { status, assigned_to, due_date, actual_hours, notes, priority } = body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completion_date = new Date().toISOString();
        updateData.completed_by = profile?.id;
      } else if (status !== 'completed') {
        updateData.completion_date = null;
        updateData.completed_by = null;
      }
    }
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (actual_hours !== undefined) updateData.actual_hours = actual_hours;
    if (notes !== undefined) updateData.notes = notes;
    if (priority !== undefined) updateData.priority = priority;

    const { data: task, error } = await supabase
      .from('action_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select(`
        *,
        action_subtasks (*),
        assigned_user:user_profiles!action_tasks_assigned_to_fkey (
          id, first_name, last_name, role
        )
      `)
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    return NextResponse.json({ task });

  } catch (error) {
    console.error('Task PUT error:', error);
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

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
    }

    const { data: note, error } = await supabase
      .from('action_task_notes')
      .insert({
        task_id: taskId,
        user_id: profile.id,
        content: content.trim()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding note:', error);
      return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
    }

    return NextResponse.json({ 
      note: {
        ...note,
        user_name: `${profile.first_name} ${profile.last_name}`
      }
    });

  } catch (error) {
    console.error('Task note POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
