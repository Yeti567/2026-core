/**
 * API Routes for Action Plan Notifications
 * 
 * POST - Send notifications for task assignments, reminders, overdue alerts
 * GET - Check for pending notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface NotificationPayload {
  type: 'task_assigned' | 'task_reminder' | 'task_overdue' | 'phase_complete' | 'plan_at_risk';
  taskId?: string;
  planId?: string;
  recipientId?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, taskId, planId, recipientId } = body as NotificationPayload;

    // For now, we'll log the notification intent
    // In production, this would integrate with an email service (SendGrid, Resend, etc.)
    console.log('Notification requested:', { type, taskId, planId, recipientId });

    let notificationData: Record<string, unknown> = {};

    switch (type) {
      case 'task_assigned':
        if (!taskId) {
          return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
        }
        
        // Get task details
        const { data: task, error: taskError } = await supabase
          .from('action_tasks')
          .select(`
            *,
            assigned_user:user_profiles!action_tasks_assigned_to_fkey (
              id, first_name, last_name, user_id
            ),
            plan:action_plans (title, overall_goal)
          `)
          .eq('id', taskId)
          .single();

        if (taskError || !task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        notificationData = {
          type: 'task_assigned',
          recipient: task.assigned_user,
          subject: `New Task Assigned: ${task.title}`,
          body: `You have been assigned a new task: "${task.title}".\n\nDue Date: ${new Date(task.due_date).toLocaleDateString()}\nPriority: ${task.priority.toUpperCase()}\nEstimated Time: ${task.estimated_hours} hours\n\nDescription: ${task.description || 'No description provided.'}\n\nThis task is part of: ${task.plan?.overall_goal}`,
          task
        };
        break;

      case 'task_reminder':
        if (!taskId) {
          return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
        }
        
        const { data: reminderTask } = await supabase
          .from('action_tasks')
          .select(`
            *,
            assigned_user:user_profiles!action_tasks_assigned_to_fkey (
              id, first_name, last_name, user_id
            )
          `)
          .eq('id', taskId)
          .single();

        if (!reminderTask) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        const daysUntilDue = Math.ceil(
          (new Date(reminderTask.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        notificationData = {
          type: 'task_reminder',
          recipient: reminderTask.assigned_user,
          subject: `Reminder: Task "${reminderTask.title}" due in ${daysUntilDue} days`,
          body: `This is a reminder that your task "${reminderTask.title}" is due on ${new Date(reminderTask.due_date).toLocaleDateString()}.\n\nPlease ensure you complete this task on time to keep the COR certification action plan on track.`,
          task: reminderTask
        };
        break;

      case 'task_overdue':
        if (!taskId) {
          return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
        }
        
        const { data: overdueTask } = await supabase
          .from('action_tasks')
          .select(`
            *,
            assigned_user:user_profiles!action_tasks_assigned_to_fkey (
              id, first_name, last_name, user_id
            )
          `)
          .eq('id', taskId)
          .single();

        if (!overdueTask) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        const daysOverdue = Math.ceil(
          (Date.now() - new Date(overdueTask.due_date).getTime()) / (1000 * 60 * 60 * 24)
        );

        notificationData = {
          type: 'task_overdue',
          recipient: overdueTask.assigned_user,
          subject: `OVERDUE: Task "${overdueTask.title}" is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
          body: `Your task "${overdueTask.title}" was due on ${new Date(overdueTask.due_date).toLocaleDateString()} and is now ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue.\n\nPlease complete this task as soon as possible or contact your manager if you need assistance.`,
          task: overdueTask,
          escalate: daysOverdue > 3 // Escalate if more than 3 days overdue
        };
        break;

      case 'phase_complete':
        notificationData = {
          type: 'phase_complete',
          subject: 'Phase Complete',
          body: 'A phase in your action plan has been completed.'
        };
        break;

      case 'plan_at_risk':
        notificationData = {
          type: 'plan_at_risk',
          subject: 'Action Plan At Risk',
          body: 'Your action plan has multiple overdue tasks and may miss the target completion date.'
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    // In production, send actual email here using SendGrid, Resend, etc.
    // For now, we return the notification data that would be sent
    return NextResponse.json({ 
      success: true, 
      message: 'Notification queued',
      notification: notificationData
    });

  } catch (error) {
    console.error('Notification POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get tasks that need notifications
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Tasks due within 3 days (for reminders)
    const { data: dueSoonTasks } = await supabase
      .from('action_tasks')
      .select(`
        id, title, due_date, status, priority,
        assigned_user:user_profiles!action_tasks_assigned_to_fkey (
          id, first_name, last_name
        ),
        plan:action_plans!inner (company_id)
      `)
      .eq('plan.company_id', profile.company_id)
      .not('status', 'in', '("completed","cancelled")')
      .gte('due_date', now.toISOString().split('T')[0])
      .lte('due_date', threeDaysFromNow.toISOString().split('T')[0]);

    // Overdue tasks
    const { data: overdueTasks } = await supabase
      .from('action_tasks')
      .select(`
        id, title, due_date, status, priority,
        assigned_user:user_profiles!action_tasks_assigned_to_fkey (
          id, first_name, last_name
        ),
        plan:action_plans!inner (company_id)
      `)
      .eq('plan.company_id', profile.company_id)
      .not('status', 'in', '("completed","cancelled")')
      .lt('due_date', now.toISOString().split('T')[0]);

    return NextResponse.json({
      pendingReminders: dueSoonTasks || [],
      overdueAlerts: overdueTasks || [],
      totalPending: (dueSoonTasks?.length || 0) + (overdueTasks?.length || 0)
    });

  } catch (error) {
    console.error('Notification GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
