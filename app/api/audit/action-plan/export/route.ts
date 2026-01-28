/**
 * API Route for Exporting Action Plan as PDF
 * 
 * GET - Generate and download action plan PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company and profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get company info
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', profile.company_id)
      .single();

    // Get the active action plan with all details
    const { data: plan, error: planError } = await supabase
      .from('action_plans')
      .select(`
        *,
        action_phases (
          *,
          action_tasks (
            *,
            action_subtasks (*),
            assigned_user:user_profiles!action_tasks_assigned_to_fkey (
              first_name, last_name
            )
          )
        )
      `)
      .eq('company_id', profile.company_id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'No action plan found' }, { status: 404 });
    }

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pageWidth = 612; // Letter size
    const pageHeight = 792;
    const margin = 50;
    const contentWidth = pageWidth - 2 * margin;

    // =========================================================================
    // COVER PAGE
    // =========================================================================
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - 100;

    // Title
    page.drawText('COR CERTIFICATION', {
      x: margin,
      y,
      size: 32,
      font: helveticaBold,
      color: rgb(0.2, 0.4, 0.6)
    });

    y -= 45;
    page.drawText('ACTION PLAN', {
      x: margin,
      y,
      size: 32,
      font: helveticaBold,
      color: rgb(0.2, 0.4, 0.6)
    });

    y -= 60;
    page.drawText(company?.name || 'Company Name', {
      x: margin,
      y,
      size: 18,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3)
    });

    y -= 30;
    page.drawText(`Generated: ${new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`, {
      x: margin,
      y,
      size: 12,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Summary box
    y -= 80;
    const boxHeight = 180;
    page.drawRectangle({
      x: margin,
      y: y - boxHeight,
      width: contentWidth,
      height: boxHeight,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1
    });

    y -= 30;
    page.drawText('PLAN SUMMARY', {
      x: margin + 20,
      y,
      size: 14,
      font: helveticaBold,
      color: rgb(0.2, 0.2, 0.2)
    });

    const summaryItems = [
      ['Overall Goal:', plan.overall_goal],
      ['Target Date:', new Date(plan.target_completion_date).toLocaleDateString()],
      ['Total Tasks:', `${plan.total_tasks}`],
      ['Completed:', `${plan.completed_tasks} (${plan.progress_percentage}%)`],
      ['Estimated Hours:', `${plan.estimated_hours}h`],
      ['Status:', plan.status.replace('_', ' ').toUpperCase()]
    ];

    y -= 25;
    for (const [label, value] of summaryItems) {
      page.drawText(label, {
        x: margin + 20,
        y,
        size: 11,
        font: helveticaBold,
        color: rgb(0.4, 0.4, 0.4)
      });
      page.drawText(value, {
        x: margin + 140,
        y,
        size: 11,
        font: helvetica,
        color: rgb(0.2, 0.2, 0.2)
      });
      y -= 20;
    }

    // =========================================================================
    // PHASES & TASKS
    // =========================================================================
    const sortedPhases = (plan.action_phases || []).sort(
      (a: any, b: any) => a.phase_number - b.phase_number
    );

    for (const phase of sortedPhases) {
      // New page for each phase
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;

      // Phase header
      const phaseProgress = phase.total_tasks > 0 
        ? Math.round((phase.completed_tasks / phase.total_tasks) * 100) 
        : 0;

      page.drawText(`PHASE ${phase.phase_number}: ${phase.phase_name.toUpperCase()}`, {
        x: margin,
        y,
        size: 16,
        font: helveticaBold,
        color: rgb(0.2, 0.4, 0.6)
      });

      y -= 20;
      page.drawText(`${phase.start_date} to ${phase.end_date} | ${phaseProgress}% Complete | ${phase.total_tasks} tasks`, {
        x: margin,
        y,
        size: 10,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5)
      });

      y -= 15;
      page.drawText(phase.description || '', {
        x: margin,
        y,
        size: 10,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4)
      });

      y -= 30;

      // Tasks
      const sortedTasks = (phase.action_tasks || []).sort(
        (a: any, b: any) => a.sort_order - b.sort_order
      );

      for (const task of sortedTasks) {
        // Check if we need a new page
        if (y < 150) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }

        // Task status indicator
        const statusSymbol = task.status === 'completed' ? '✓' : 
                            task.status === 'in_progress' ? '▸' : '○';
        const statusColor = task.status === 'completed' ? rgb(0.2, 0.7, 0.4) :
                           task.status === 'in_progress' ? rgb(0.3, 0.5, 0.9) :
                           rgb(0.5, 0.5, 0.5);

        page.drawText(statusSymbol, {
          x: margin,
          y,
          size: 12,
          font: helvetica,
          color: statusColor
        });

        // Task title
        const titleColor = task.status === 'completed' ? rgb(0.5, 0.5, 0.5) : rgb(0.2, 0.2, 0.2);
        page.drawText(task.title.substring(0, 70) + (task.title.length > 70 ? '...' : ''), {
          x: margin + 20,
          y,
          size: 11,
          font: helveticaBold,
          color: titleColor
        });

        // Priority badge
        const priorityColors: Record<string, any> = {
          critical: rgb(0.9, 0.2, 0.2),
          high: rgb(0.9, 0.6, 0.1),
          medium: rgb(0.3, 0.5, 0.9),
          low: rgb(0.5, 0.5, 0.5)
        };
        page.drawText(task.priority.toUpperCase(), {
          x: pageWidth - margin - 60,
          y,
          size: 8,
          font: helveticaBold,
          color: priorityColors[task.priority] || rgb(0.5, 0.5, 0.5)
        });

        y -= 15;

        // Task details
        const assignedName = task.assigned_user 
          ? `${task.assigned_user.first_name} ${task.assigned_user.last_name}`
          : 'Unassigned';
        
        const dueDate = new Date(task.due_date);
        const isOverdue = task.status !== 'completed' && dueDate < new Date();
        const dueDateColor = isOverdue ? rgb(0.9, 0.2, 0.2) : rgb(0.5, 0.5, 0.5);

        page.drawText(`Assigned: ${assignedName} | Due: ${task.due_date} | Est: ${task.estimated_hours}h | Element ${task.element_number}`, {
          x: margin + 20,
          y,
          size: 9,
          font: helvetica,
          color: dueDateColor
        });

        y -= 20;

        // Subtasks (if any, limit to 5)
        const subtasks = (task.action_subtasks || []).slice(0, 5);
        for (const subtask of subtasks) {
          const stSymbol = subtask.completed ? '☑' : '☐';
          const stColor = subtask.completed ? rgb(0.4, 0.4, 0.4) : rgb(0.3, 0.3, 0.3);
          
          page.drawText(`    ${stSymbol} ${subtask.title.substring(0, 60)}`, {
            x: margin + 20,
            y,
            size: 9,
            font: helvetica,
            color: stColor
          });
          y -= 14;
        }

        if ((task.action_subtasks || []).length > 5) {
          page.drawText(`    ... and ${task.action_subtasks.length - 5} more subtasks`, {
            x: margin + 20,
            y,
            size: 9,
            font: helvetica,
            color: rgb(0.5, 0.5, 0.5)
          });
          y -= 14;
        }

        y -= 10;
      }
    }

    // =========================================================================
    // TIMELINE PAGE
    // =========================================================================
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;

    page.drawText('PROJECT TIMELINE', {
      x: margin,
      y,
      size: 18,
      font: helveticaBold,
      color: rgb(0.2, 0.4, 0.6)
    });

    y -= 40;

    for (const phase of sortedPhases) {
      const phaseProgress = phase.total_tasks > 0 
        ? Math.round((phase.completed_tasks / phase.total_tasks) * 100) 
        : 0;

      // Phase bar
      page.drawRectangle({
        x: margin,
        y: y - 20,
        width: contentWidth,
        height: 25,
        color: rgb(0.95, 0.95, 0.95)
      });

      // Progress fill
      page.drawRectangle({
        x: margin,
        y: y - 20,
        width: (contentWidth * phaseProgress) / 100,
        height: 25,
        color: phase.status === 'completed' ? rgb(0.2, 0.7, 0.4) :
               phase.status === 'in_progress' ? rgb(0.3, 0.5, 0.9) :
               rgb(0.7, 0.7, 0.7)
      });

      page.drawText(`Phase ${phase.phase_number}: ${phase.phase_name} (${phaseProgress}%)`, {
        x: margin + 10,
        y: y - 13,
        size: 10,
        font: helveticaBold,
        color: rgb(0.2, 0.2, 0.2)
      });

      page.drawText(`${phase.start_date} → ${phase.end_date}`, {
        x: pageWidth - margin - 120,
        y: y - 13,
        size: 9,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4)
      });

      y -= 45;
    }

    // Add page numbers
    const totalPages = pdfDoc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const pg = pdfDoc.getPage(i);
      pg.drawText(`Page ${i + 1} of ${totalPages}`, {
        x: pageWidth - margin - 60,
        y: 30,
        size: 9,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5)
      });
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    const filename = `COR_Action_Plan_${(company?.name || 'Company').replace(/\s+/g, '_')}_${Date.now()}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Export PDF error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
