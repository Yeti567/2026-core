/**
 * Export Forms to CSV Script
 * 
 * Generates a CSV checklist of all COR forms for planning and tracking.
 * Can be run standalone or as part of the seed process.
 * 
 * Usage:
 *   npx tsx scripts/export-forms-csv.ts
 *   npx tsx scripts/export-forms-csv.ts --output ./my-forms.csv
 */

import { allFormConfigs, formConfigsByElement } from '../lib/form-builder/form-configs';
import { FormConfig } from '../lib/form-builder/import-forms';
import * as fs from 'fs';
import * as path from 'path';

// COR Element names for reference
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

// Role mappings for "Who fills out"
const ROLE_MAPPINGS: Record<string, string> = {
  'supervisor': 'Supervisor',
  'safety_manager': 'Safety Manager',
  'worker': 'Worker',
  'management': 'Management',
  'admin': 'Administrator',
  'hr': 'HR',
  'jhsc': 'JHSC Member',
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

interface CSVRow {
  element: number;
  element_name: string;
  form_name: string;
  form_code: string;
  when_used: string;
  frequency: string;
  who_fills_out: string;
  est_time_minutes: number;
  is_mandatory: string;
  sections_count: number;
  notes: string;
}

function getWhenUsed(config: FormConfig): string {
  // Derive "when used" from form code and description
  const code = config.code.toLowerCase();
  const desc = (config.description || '').toLowerCase();
  
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
  if (code.includes('reporting') || code.includes('report')) {
    return 'When reporting is required';
  }
  if (config.frequency === 'as_needed') {
    return 'When situation arises';
  }
  
  return `${FREQUENCY_NAMES[config.frequency] || config.frequency} basis`;
}

function getWhoFillsOut(config: FormConfig): string {
  const roles: string[] = [];
  
  // Check workflow config for submit_to_role
  if (config.workflow?.submit_to_role) {
    const role = ROLE_MAPPINGS[config.workflow.submit_to_role] || config.workflow.submit_to_role;
    if (!roles.includes(role)) {
      roles.push(role);
    }
  }
  
  // Derive from form type
  const code = config.code.toLowerCase();
  
  if (code.includes('supervisor') || code.includes('management')) {
    if (!roles.includes('Supervisor')) roles.unshift('Supervisor');
  } else if (code.includes('jhsc') || code.includes('joint_health')) {
    roles.unshift('JHSC Member');
  } else if (code.includes('worker') || code.includes('employee')) {
    roles.unshift('Worker');
  } else if (code.includes('safety') && code.includes('manager')) {
    roles.unshift('Safety Manager');
  } else {
    // Default based on element
    switch (config.cor_element) {
      case 2:
      case 3:
        roles.unshift('Supervisor + Workers');
        break;
      case 5:
      case 8:
        roles.unshift('Supervisor');
        break;
      case 9:
        roles.unshift('JHSC Member');
        break;
      case 10:
        roles.unshift('Safety Manager');
        break;
      case 12:
      case 13:
      case 14:
        roles.unshift('Management');
        break;
      default:
        roles.unshift('Supervisor');
    }
  }
  
  return roles.join(' / ');
}

function getNotes(config: FormConfig): string {
  const notes: string[] = [];
  
  // Add key features
  if (config.workflow?.requires_approval) {
    notes.push('Requires approval');
  }
  if (config.sections?.some(s => s.fields?.some(f => f.type === 'signature'))) {
    notes.push('Signature required');
  }
  if (config.sections?.some(s => s.fields?.some(f => f.type === 'photo'))) {
    notes.push('Photo evidence');
  }
  if (config.sections?.some(s => s.fields?.some(f => f.type === 'gps'))) {
    notes.push('GPS location');
  }
  
  // Add a brief note based on the form
  if (config.is_mandatory) {
    notes.push('COR audit requirement');
  }
  
  return notes.join('; ') || config.description?.slice(0, 50) || '';
}

function formConfigToCSVRow(config: FormConfig): CSVRow {
  return {
    element: config.cor_element,
    element_name: COR_ELEMENT_NAMES[config.cor_element] || `Element ${config.cor_element}`,
    form_name: config.name,
    form_code: config.code,
    when_used: getWhenUsed(config),
    frequency: FREQUENCY_NAMES[config.frequency] || config.frequency,
    who_fills_out: getWhoFillsOut(config),
    est_time_minutes: config.estimated_time_minutes || 15,
    is_mandatory: config.is_mandatory ? 'Yes' : 'No',
    sections_count: config.sections?.length || 0,
    notes: getNotes(config),
  };
}

function escapeCSVField(field: string | number | boolean): string {
  const str = String(field);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCSV(rows: CSVRow[]): string {
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
    'Sections_Count',
    'Notes',
  ];
  
  const csvRows: string[] = [headers.join(',')];
  
  for (const row of rows) {
    csvRows.push([
      escapeCSVField(row.element),
      escapeCSVField(row.element_name),
      escapeCSVField(row.form_name),
      escapeCSVField(row.form_code),
      escapeCSVField(row.when_used),
      escapeCSVField(row.frequency),
      escapeCSVField(row.who_fills_out),
      escapeCSVField(row.est_time_minutes),
      escapeCSVField(row.is_mandatory),
      escapeCSVField(row.sections_count),
      escapeCSVField(row.notes),
    ].join(','));
  }
  
  return csvRows.join('\n');
}

function parseArgs(): { outputPath: string; verbose: boolean } {
  const args = process.argv.slice(2);
  let outputPath = 'public/downloads/cor-forms-checklist.csv';
  let verbose = false;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '--output' || arg === '-o') && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Export COR Forms to CSV

Usage: npx tsx scripts/export-forms-csv.ts [options]

Options:
  --output, -o <path>  Output file path (default: public/downloads/cor-forms-checklist.csv)
  --verbose, -v        Show detailed output
  --help, -h           Show this help message

Examples:
  npx tsx scripts/export-forms-csv.ts
  npx tsx scripts/export-forms-csv.ts --output ./forms.csv
  npx tsx scripts/export-forms-csv.ts -v
      `);
      process.exit(0);
    }
  }
  
  return { outputPath, verbose };
}

async function main() {
  console.log('📊 COR Forms CSV Export\n');
  console.log('═'.repeat(50));
  
  const { outputPath, verbose } = parseArgs();
  
  // Convert all form configs to CSV rows
  const rows: CSVRow[] = allFormConfigs
    .map(formConfigToCSVRow)
    .sort((a, b) => {
      // Sort by element, then by name
      if (a.element !== b.element) return a.element - b.element;
      return a.form_name.localeCompare(b.form_name);
    });
  
  console.log(`\n📋 Forms Summary:`);
  console.log(`   Total forms: ${rows.length}`);
  console.log(`   Mandatory: ${rows.filter(r => r.is_mandatory === 'Yes').length}`);
  console.log(`   Optional: ${rows.filter(r => r.is_mandatory === 'No').length}`);
  
  // Show breakdown by element
  console.log(`\n📦 Forms by COR Element:`);
  for (let el = 2; el <= 14; el++) {
    const count = rows.filter(r => r.element === el).length;
    if (count > 0) {
      console.log(`   Element ${el}: ${count} forms (${COR_ELEMENT_NAMES[el]})`);
    }
  }
  
  // Generate CSV
  const csv = generateCSV(rows);
  
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write to file
  fs.writeFileSync(outputPath, csv, 'utf-8');
  console.log(`\n✅ CSV exported to: ${outputPath}`);
  console.log(`   File size: ${(csv.length / 1024).toFixed(2)} KB`);
  
  // If verbose, show the CSV content
  if (verbose) {
    console.log('\n' + '═'.repeat(50));
    console.log('CSV Content:\n');
    console.log(csv);
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log('✨ Export complete!\n');
  
  // Return CSV for programmatic use
  return csv;
}

// Run if called directly
main().catch(console.error);

// Export for programmatic use
export { generateCSV, formConfigToCSVRow, CSVRow };
