/**
 * API Endpoint: Export Forms as CSV
 * 
 * GET /api/admin/forms/export-csv
 * 
 * Returns a CSV file of all form templates for planning and tracking.
 * Requires admin or super_admin role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth';
import { allFormConfigs, formConfigsByElement } from '@/lib/form-builder/form-configs';
import { FormConfig } from '@/lib/form-builder/import-forms';

export const dynamic = 'force-dynamic';


// COR Element names
const COR_ELEMENT_NAMES: Record<number, string> = {
  2: 'Hazard Identification & Assessment',
  3: 'Hazard Control',
  4: 'Competency & Training',
  5: 'Workplace Behavior',
  6: 'Personal Protective Equipment',
  7: 'Maintenance',
  8: 'Training & Communication',
  9: 'Workplace Inspections',
  10: 'Incident Investigation',
  11: 'Emergency Preparedness',
  12: 'Statistics & Records',
  13: 'Regulatory Awareness',
  14: 'Management System',
};

// Frequency display names
const FREQUENCY_NAMES: Record<string, string> = {
  'daily': 'Daily',
  'weekly': 'Weekly',
  'monthly': 'Monthly',
  'quarterly': 'Quarterly',
  'annual': 'Annual',
  'as_needed': 'As Needed',
  'per_shift': 'Per Shift',
  'per_task': 'Per Task',
  'per_incident': 'Per Incident',
  'per_drill': 'Per Drill',
  'per_project': 'Per Project',
};

function getWhenUsed(config: FormConfig): string {
  const code = config.code.toLowerCase();
  
  if (code.includes('pre_task') || code.includes('pretask')) {
    return 'Before starting any task';
  }
  if (code.includes('incident') || code.includes('accident')) {
    return 'After any incident occurs';
  }
  if (code.includes('inspection') || code.includes('checklist')) {
    return 'During scheduled inspections';
  }
  if (code.includes('drill') || code.includes('emergency')) {
    return 'During emergency drills';
  }
  if (code.includes('orientation') || code.includes('onboarding')) {
    return 'During new worker orientation';
  }
  if (code.includes('training')) {
    return 'After training sessions';
  }
  if (code.includes('meeting') || code.includes('toolbox')) {
    return 'During safety meetings';
  }
  if (code.includes('review') || code.includes('evaluation')) {
    return 'During periodic reviews';
  }
  if (config.frequency === 'as_needed') {
    return 'When situation arises';
  }
  
  return `${FREQUENCY_NAMES[config.frequency] || config.frequency} basis`;
}

function getWhoFillsOut(config: FormConfig): string {
  const code = config.code.toLowerCase();
  
  if (code.includes('supervisor') || code.includes('management')) {
    return 'Supervisor';
  } else if (code.includes('jhsc') || code.includes('joint_health')) {
    return 'JHSC Member';
  } else if (code.includes('worker') || code.includes('employee')) {
    return 'Worker';
  } else if (code.includes('safety') && code.includes('manager')) {
    return 'Safety Manager';
  }
  
  // Default based on element
  switch (config.cor_element) {
    case 2:
    case 3:
      return 'Supervisor + Workers';
    case 5:
    case 8:
      return 'Supervisor';
    case 9:
      return 'JHSC Member';
    case 10:
      return 'Safety Manager';
    case 12:
    case 13:
    case 14:
      return 'Management';
    default:
      return 'Supervisor';
  }
}

function escapeCSVField(field: string | number | boolean): string {
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCSV(): string {
  const headers = [
    'Element',
    'Element_Name',
    'Form_Name',
    'Form_Code',
    'When_Used',
    'Frequency',
    'Who_Fills_Out',
    'Est_Time_Minutes',
    'Is_Mandatory',
    'Description',
  ];
  
  const rows: string[] = [headers.join(',')];
  
  // Sort by element, then by name
  const sortedConfigs = [...allFormConfigs].sort((a, b) => {
    if (a.cor_element !== b.cor_element) return a.cor_element - b.cor_element;
    return a.name.localeCompare(b.name);
  });
  
  for (const config of sortedConfigs) {
    rows.push([
      escapeCSVField(config.cor_element),
      escapeCSVField(COR_ELEMENT_NAMES[config.cor_element] || `Element ${config.cor_element}`),
      escapeCSVField(config.name),
      escapeCSVField(config.code),
      escapeCSVField(getWhenUsed(config)),
      escapeCSVField(FREQUENCY_NAMES[config.frequency] || config.frequency),
      escapeCSVField(getWhoFillsOut(config)),
      escapeCSVField(config.estimated_time_minutes || 15),
      escapeCSVField(config.is_mandatory ? 'Yes' : 'No'),
      escapeCSVField(config.description || ''),
    ].join(','));
  }
  
  return rows.join('\n');
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check authorization (admin or super_admin)
    if (!['admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Generate CSV
    const csv = generateCSV();
    
    // Return as downloadable file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="cor-forms-checklist.csv"',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSV' },
      { status: 500 }
    );
  }
}

// Also support POST with filters
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (!['admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { elements, mandatory_only } = body;
    
    // Filter configs based on request
    let filteredConfigs = [...allFormConfigs];
    
    if (elements && Array.isArray(elements) && elements.length > 0) {
      filteredConfigs = filteredConfigs.filter(c => elements.includes(c.cor_element));
    }
    
    if (mandatory_only) {
      filteredConfigs = filteredConfigs.filter(c => c.is_mandatory);
    }
    
    // Sort
    filteredConfigs.sort((a, b) => {
      if (a.cor_element !== b.cor_element) return a.cor_element - b.cor_element;
      return a.name.localeCompare(b.name);
    });
    
    // Generate filtered CSV
    const headers = [
      'Element',
      'Element_Name',
      'Form_Name',
      'Form_Code',
      'When_Used',
      'Frequency',
      'Who_Fills_Out',
      'Est_Time_Minutes',
      'Is_Mandatory',
      'Description',
    ];
    
    const rows: string[] = [headers.join(',')];
    
    for (const config of filteredConfigs) {
      rows.push([
        escapeCSVField(config.cor_element),
        escapeCSVField(COR_ELEMENT_NAMES[config.cor_element] || `Element ${config.cor_element}`),
        escapeCSVField(config.name),
        escapeCSVField(config.code),
        escapeCSVField(getWhenUsed(config)),
        escapeCSVField(FREQUENCY_NAMES[config.frequency] || config.frequency),
        escapeCSVField(getWhoFillsOut(config)),
        escapeCSVField(config.estimated_time_minutes || 15),
        escapeCSVField(config.is_mandatory ? 'Yes' : 'No'),
        escapeCSVField(config.description || ''),
      ].join(','));
    }
    
    const csv = rows.join('\n');
    
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="cor-forms-checklist.csv"',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSV' },
      { status: 500 }
    );
  }
}
