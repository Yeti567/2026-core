/**
 * API Routes for Action Plans
 * 
 * GET - Get the active action plan for the company
 * POST - Generate a new action plan from compliance gaps
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  generateActionPlanFromGaps, 
  ActionPlan, 
  Gap, 
  User 
} from '@/lib/audit/action-plan-generator';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check authorization
    if (!['admin', 'super_admin', 'internal_auditor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get the active action plan with all phases and tasks
    const { data: plan, error: planError } = await supabase
      .from('action_plans')
      .select(`
        *,
        action_phases (
          *,
          action_tasks (
            *,
            action_subtasks (*)
          )
        )
      `)
      .eq('company_id', profile.company_id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (planError && planError.code !== 'PGRST116') {
      console.error('Error fetching action plan:', planError);
      return NextResponse.json({ error: 'Failed to fetch action plan' }, { status: 500 });
    }

    if (!plan) {
      return NextResponse.json({ plan: null, message: 'No active action plan found' });
    }

    // Transform to match our ActionPlan interface
    const transformedPlan = transformDbPlanToActionPlan(plan);

    return NextResponse.json({ plan: transformedPlan });

  } catch (error) {
    console.error('Action plan GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, company_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check authorization
    if (!['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Only admins can generate action plans' }, { status: 403 });
    }

    const body = await request.json();
    const { gaps, targetDate, estimatedHours } = body;

    if (!gaps || !Array.isArray(gaps)) {
      return NextResponse.json({ error: 'Gaps array is required' }, { status: 400 });
    }

    // Get company users for assignment
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, role, position')
      .eq('company_id', profile.company_id)
      .in('role', ['admin', 'supervisor', 'internal_auditor']);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
    }

    // Generate the action plan
    const target = targetDate ? new Date(targetDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const plan = generateActionPlanFromGaps(
      profile.company_id,
      gaps as Gap[],
      (users || []) as User[],
      target,
      estimatedHours || 80
    );

    // Save plan to database
    const { data: savedPlan, error: planSaveError } = await supabase
      .from('action_plans')
      .insert({
        company_id: profile.company_id,
        created_by: profile.id,
        title: plan.title,
        overall_goal: plan.overall_goal,
        target_completion_date: plan.target_completion_date,
        total_tasks: plan.total_tasks,
        completed_tasks: plan.completed_tasks,
        progress_percentage: plan.progress_percentage,
        estimated_hours: plan.estimated_hours,
        actual_hours: plan.actual_hours,
        status: plan.status
      })
      .select()
      .single();

    if (planSaveError) {
      console.error('Error saving plan:', planSaveError);
      return NextResponse.json({ error: 'Failed to save action plan' }, { status: 500 });
    }

    // Save phases
    for (const phase of plan.phases) {
      const { data: savedPhase, error: phaseSaveError } = await supabase
        .from('action_phases')
        .insert({
          plan_id: savedPlan.id,
          phase_number: phase.phase_number,
          phase_name: phase.phase_name,
          description: phase.description,
          start_date: phase.start_date,
          end_date: phase.end_date,
          status: phase.status,
          total_tasks: phase.total_tasks,
          completed_tasks: phase.completed_tasks
        })
        .select()
        .single();

      if (phaseSaveError) {
        console.error('Error saving phase:', phaseSaveError);
        continue;
      }

      // Save tasks for this phase
      for (const task of phase.tasks) {
        const { data: savedTask, error: taskSaveError } = await supabase
          .from('action_tasks')
          .insert({
            plan_id: savedPlan.id,
            phase_id: savedPhase.id,
            gap_id: task.gap_id,
            element_number: task.element_number,
            title: task.title,
            description: task.description,
            priority: task.priority,
            assigned_to: task.assigned_to,
            due_date: task.due_date,
            estimated_hours: task.estimated_hours,
            status: task.status,
            sort_order: task.sort_order
          })
          .select()
          .single();

        if (taskSaveError) {
          console.error('Error saving task:', taskSaveError);
          continue;
        }

        // Save subtasks
        if (task.subtasks && task.subtasks.length > 0) {
          const subtasksToInsert = task.subtasks.map(st => ({
            task_id: savedTask.id,
            title: st.title,
            completed: st.completed,
            due_date: st.due_date,
            sort_order: st.sort_order
          }));

          const { error: subtaskSaveError } = await supabase
            .from('action_subtasks')
            .insert(subtasksToInsert);

          if (subtaskSaveError) {
            console.error('Error saving subtasks:', subtaskSaveError);
          }
        }
      }
    }

    // Fetch the complete saved plan
    const { data: completePlan, error: fetchError } = await supabase
      .from('action_plans')
      .select(`
        *,
        action_phases (
          *,
          action_tasks (
            *,
            action_subtasks (*)
          )
        )
      `)
      .eq('id', savedPlan.id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete plan:', fetchError);
      return NextResponse.json({ plan: savedPlan });
    }

    return NextResponse.json({ 
      plan: transformDbPlanToActionPlan(completePlan),
      message: 'Action plan generated successfully'
    });

  } catch (error) {
    console.error('Action plan POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper to transform DB structure to ActionPlan interface
function transformDbPlanToActionPlan(dbPlan: any): ActionPlan {
  return {
    id: dbPlan.id,
    company_id: dbPlan.company_id,
    created_by: dbPlan.created_by,
    title: dbPlan.title,
    overall_goal: dbPlan.overall_goal,
    target_completion_date: dbPlan.target_completion_date,
    total_tasks: dbPlan.total_tasks,
    completed_tasks: dbPlan.completed_tasks,
    progress_percentage: dbPlan.progress_percentage,
    estimated_hours: Number(dbPlan.estimated_hours),
    actual_hours: Number(dbPlan.actual_hours),
    status: dbPlan.status,
    created_at: dbPlan.created_at,
    updated_at: dbPlan.updated_at,
    phases: (dbPlan.action_phases || [])
      .sort((a: any, b: any) => a.phase_number - b.phase_number)
      .map((phase: any) => ({
        id: phase.id,
        plan_id: phase.plan_id,
        phase_number: phase.phase_number,
        phase_name: phase.phase_name,
        description: phase.description,
        start_date: phase.start_date,
        end_date: phase.end_date,
        status: phase.status,
        total_tasks: phase.total_tasks,
        completed_tasks: phase.completed_tasks,
        tasks: (phase.action_tasks || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((task: any) => ({
            id: task.id,
            plan_id: task.plan_id,
            phase_id: task.phase_id,
            gap_id: task.gap_id,
            element_number: task.element_number,
            title: task.title,
            description: task.description,
            priority: task.priority,
            assigned_to: task.assigned_to,
            due_date: task.due_date,
            estimated_hours: Number(task.estimated_hours),
            actual_hours: task.actual_hours ? Number(task.actual_hours) : undefined,
            status: task.status,
            completion_date: task.completion_date,
            notes: task.notes,
            sort_order: task.sort_order,
            created_at: task.created_at,
            updated_at: task.updated_at,
            subtasks: (task.action_subtasks || [])
              .sort((a: any, b: any) => a.sort_order - b.sort_order)
              .map((st: any) => ({
                id: st.id,
                task_id: st.task_id,
                title: st.title,
                completed: st.completed,
                completed_at: st.completed_at,
                due_date: st.due_date,
                sort_order: st.sort_order
              })),
            dependencies: []
          }))
      }))
  };
}
