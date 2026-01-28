/**
 * API Routes for Single Action Plan
 * 
 * GET - Get specific plan details
 * PUT - Update plan (status, target date, etc.)
 * DELETE - Cancel/archive a plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: plan, error } = await supabase
      .from('action_plans')
      .select(`
        *,
        action_phases (
          *,
          action_tasks (
            *,
            action_subtasks (*),
            action_task_notes (
              *,
              user:user_profiles (first_name, last_name)
            )
          )
        )
      `)
      .eq('id', planId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 });
    }

    return NextResponse.json({ plan });

  } catch (error) {
    console.error('Plan GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { target_completion_date, status, overall_goal } = body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (target_completion_date) updateData.target_completion_date = target_completion_date;
    if (status) updateData.status = status;
    if (overall_goal) updateData.overall_goal = overall_goal;

    const { data: plan, error } = await supabase
      .from('action_plans')
      .update(updateData)
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
    }

    return NextResponse.json({ plan });

  } catch (error) {
    console.error('Plan PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete - mark as cancelled
    const { error } = await supabase
      .from('action_plans')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', planId);

    if (error) {
      return NextResponse.json({ error: 'Failed to cancel plan' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Plan cancelled successfully' });

  } catch (error) {
    console.error('Plan DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
