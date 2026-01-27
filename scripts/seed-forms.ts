/**
 * Form Seeding CLI Script
 * 
 * This script seeds the database with form templates from JSON configurations.
 * Run with: npx tsx scripts/seed-forms.ts
 * 
 * Options:
 *   --company-id <id>  Import forms for a specific company
 *   --global           Import as global templates (default)
 *   --skip-existing    Skip forms that already exist (default: true)
 *   --force            Overwrite existing forms
 * 
 * @example
 * ```bash
 * # Seed global templates
 * npx tsx scripts/seed-forms.ts
 * 
 * # Seed for a specific company
 * npx tsx scripts/seed-forms.ts --company-id abc-123
 * 
 * # Force overwrite existing
 * npx tsx scripts/seed-forms.ts --force
 * ```
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

import {
  bulkImportForms,
  bulkImportFormsIfNotExists,
  type FormConfig
} from '../lib/form-builder/import-forms';

// Import all COR form configurations
import {
  allFormConfigs,
  formConfigsByElement,
  corElementDescriptions,
  formCountSummary,
} from '../lib/form-builder/form-configs';

// =============================================================================
// SAMPLE FORM CONFIGURATIONS (for reference/testing)
// =============================================================================

/**
 * Sample: Daily Safety Inspection Form
 * COR Element 7 - Inspections
 */
const dailySafetyInspection: FormConfig = {
  code: 'DAILY_SAFETY_INSPECTION',
  name: 'Daily Safety Inspection',
  description: 'Daily workplace safety inspection checklist for supervisors and workers.',
  cor_element: 7,
  frequency: 'daily',
  estimated_time_minutes: 15,
  icon: 'ClipboardCheck',
  color: '#10B981',
  is_mandatory: true,
  sections: [
    {
      title: 'Site Information',
      description: 'Basic information about the inspection location',
      order_index: 0,
      fields: [
        {
          code: 'inspection_date',
          label: 'Inspection Date',
          field_type: 'date',
          order_index: 0,
          width: 'half',
          validation_rules: { required: true },
        },
        {
          code: 'inspection_time',
          label: 'Inspection Time',
          field_type: 'time',
          order_index: 1,
          width: 'half',
          validation_rules: { required: true },
        },
        {
          code: 'jobsite',
          label: 'Jobsite',
          field_type: 'jobsite_select',
          order_index: 2,
          width: 'full',
          validation_rules: { required: true },
        },
        {
          code: 'inspector',
          label: 'Inspector',
          field_type: 'worker_select',
          order_index: 3,
          width: 'full',
          validation_rules: { required: true },
        },
      ],
    },
    {
      title: 'General Site Conditions',
      description: 'Assess general site safety conditions',
      order_index: 1,
      fields: [
        {
          code: 'housekeeping',
          label: 'Housekeeping - Is the work area clean and organized?',
          field_type: 'radio',
          options: ['Pass', 'Fail', 'N/A'],
          order_index: 0,
          width: 'full',
          validation_rules: { required: true },
        },
        {
          code: 'access_egress',
          label: 'Access/Egress - Are pathways clear and unobstructed?',
          field_type: 'radio',
          options: ['Pass', 'Fail', 'N/A'],
          order_index: 1,
          width: 'full',
          validation_rules: { required: true },
        },
        {
          code: 'lighting',
          label: 'Lighting - Is lighting adequate for safe work?',
          field_type: 'radio',
          options: ['Pass', 'Fail', 'N/A'],
          order_index: 2,
          width: 'full',
          validation_rules: { required: true },
        },
        {
          code: 'signage',
          label: 'Signage - Are safety signs visible and in good condition?',
          field_type: 'radio',
          options: ['Pass', 'Fail', 'N/A'],
          order_index: 3,
          width: 'full',
          validation_rules: { required: true },
        },
      ],
    },
    {
      title: 'PPE Compliance',
      description: 'Check personal protective equipment usage',
      order_index: 2,
      fields: [
        {
          code: 'hard_hats',
          label: 'Hard Hats - Being worn where required?',
          field_type: 'radio',
          options: ['Pass', 'Fail', 'N/A'],
          order_index: 0,
          width: 'full',
          validation_rules: { required: true },
        },
        {
          code: 'safety_glasses',
          label: 'Safety Glasses - Being worn where required?',
          field_type: 'radio',
          options: ['Pass', 'Fail', 'N/A'],
          order_index: 1,
          width: 'full',
          validation_rules: { required: true },
        },
        {
          code: 'safety_boots',
          label: 'Safety Boots - Being worn by all workers?',
          field_type: 'radio',
          options: ['Pass', 'Fail', 'N/A'],
          order_index: 2,
          width: 'full',
          validation_rules: { required: true },
        },
        {
          code: 'high_visibility',
          label: 'High Visibility Clothing - Being worn where required?',
          field_type: 'radio',
          options: ['Pass', 'Fail', 'N/A'],
          order_index: 3,
          width: 'full',
          validation_rules: { required: true },
        },
      ],
    },
    {
      title: 'Comments & Actions',
      description: 'Additional notes and corrective actions',
      order_index: 3,
      fields: [
        {
          code: 'deficiencies_found',
          label: 'Were any deficiencies found?',
          field_type: 'radio',
          options: ['Yes', 'No'],
          order_index: 0,
          width: 'full',
          validation_rules: { required: true },
        },
        {
          code: 'deficiency_details',
          label: 'Describe deficiencies and corrective actions taken',
          field_type: 'textarea',
          placeholder: 'Enter details of any deficiencies found and corrective actions...',
          order_index: 1,
          width: 'full',
          conditional_logic: {
            field_code: 'deficiencies_found',
            operator: 'equals',
            value: 'Yes',
          },
        },
        {
          code: 'photos',
          label: 'Photos (if applicable)',
          field_type: 'photo',
          help_text: 'Take photos of any hazards or deficiencies',
          order_index: 2,
          width: 'full',
        },
        {
          code: 'additional_comments',
          label: 'Additional Comments',
          field_type: 'textarea',
          placeholder: 'Any other observations or comments...',
          order_index: 3,
          width: 'full',
        },
      ],
    },
    {
      title: 'Sign-Off',
      description: 'Inspector verification',
      order_index: 4,
      fields: [
        {
          code: 'inspector_signature',
          label: 'Inspector Signature',
          field_type: 'signature',
          order_index: 0,
          width: 'full',
          validation_rules: { required: true },
        },
        {
          code: 'gps_location',
          label: 'GPS Location',
          field_type: 'gps',
          help_text: 'Automatically captures location for audit trail',
          order_index: 1,
          width: 'full',
        },
      ],
    },
  ],
  workflow: {
    submit_to_role: 'supervisor',
    notify_roles: ['supervisor', 'admin'],
    creates_task: true,
    task_template: {
      title: 'Review Daily Safety Inspection',
      priority: 'normal',
      due_hours: 24,
    },
    sync_priority: 2,
    requires_approval: false,
  },
};

/**
 * Sample: Toolbox Talk Form
 * COR Element 5 - Training
 */
const toolboxTalk: FormConfig = {
  code: 'TOOLBOX_TALK',
  name: 'Toolbox Talk / Safety Meeting',
  description: 'Document toolbox talks and safety meeting attendance.',
  cor_element: 5,
  frequency: 'weekly',
  estimated_time_minutes: 20,
  icon: 'Users',
  color: '#6366F1',
  is_mandatory: true,
  sections: [
    {
      title: 'Meeting Details',
      order_index: 0,
      fields: [
        {
          code: 'meeting_date',
          label: 'Meeting Date',
          field_type: 'date',
          order_index: 0,
          width: 'half',
          validation_rules: { required: true },
        },
        {
          code: 'meeting_time',
          label: 'Meeting Time',
          field_type: 'time',
          order_index: 1,
          width: 'half',
          validation_rules: { required: true },
        },
        {
          code: 'jobsite',
          label: 'Jobsite / Location',
          field_type: 'jobsite_select',
          order_index: 2,
          width: 'full',
          validation_rules: { required: true },
        },
        {
          code: 'presenter',
          label: 'Meeting Presenter',
          field_type: 'worker_select',
          order_index: 3,
          width: 'full',
          validation_rules: { required: true },
        },
      ],
    },
    {
      title: 'Meeting Content',
      order_index: 1,
      fields: [
        {
          code: 'topic',
          label: 'Topic',
          field_type: 'text',
          placeholder: 'Enter the main topic of discussion',
          order_index: 0,
          width: 'full',
          validation_rules: { required: true, max_length: 200 },
        },
        {
          code: 'topic_category',
          label: 'Topic Category',
          field_type: 'dropdown',
          options: [
            { value: 'hazard_awareness', label: 'Hazard Awareness' },
            { value: 'ppe', label: 'Personal Protective Equipment' },
            { value: 'emergency_procedures', label: 'Emergency Procedures' },
            { value: 'equipment_safety', label: 'Equipment Safety' },
            { value: 'ergonomics', label: 'Ergonomics' },
            { value: 'environmental', label: 'Environmental' },
            { value: 'incident_review', label: 'Incident Review' },
            { value: 'other', label: 'Other' },
          ],
          order_index: 1,
          width: 'full',
          validation_rules: { required: true },
        },
        {
          code: 'discussion_points',
          label: 'Key Discussion Points',
          field_type: 'textarea',
          placeholder: 'Summarize the key points discussed during the meeting...',
          order_index: 2,
          width: 'full',
          validation_rules: { required: true, min_length: 50 },
        },
        {
          code: 'worker_feedback',
          label: 'Worker Feedback / Questions',
          field_type: 'textarea',
          placeholder: 'Document any questions or feedback from workers...',
          order_index: 3,
          width: 'full',
        },
      ],
    },
    {
      title: 'Attendance',
      description: 'Record all workers who attended the meeting',
      order_index: 2,
      fields: [
        {
          code: 'attendees',
          label: 'Attendees',
          field_type: 'worker_select',
          help_text: 'Select all workers who attended this meeting',
          order_index: 0,
          width: 'full',
          validation_rules: { required: true },
        },
        {
          code: 'attendance_count',
          label: 'Total Attendance Count',
          field_type: 'number',
          help_text: 'Include any visitors or contractors not in the system',
          order_index: 1,
          width: 'half',
          validation_rules: { required: true, min_value: 1 },
        },
        {
          code: 'meeting_duration',
          label: 'Meeting Duration (minutes)',
          field_type: 'number',
          order_index: 2,
          width: 'half',
          validation_rules: { required: true, min_value: 5, max_value: 120 },
        },
      ],
    },
    {
      title: 'Sign-Off',
      order_index: 3,
      fields: [
        {
          code: 'presenter_signature',
          label: 'Presenter Signature',
          field_type: 'signature',
          order_index: 0,
          width: 'full',
          validation_rules: { required: true },
        },
      ],
    },
  ],
  workflow: {
    submit_to_role: 'supervisor',
    notify_roles: ['admin'],
    creates_task: false,
    sync_priority: 3,
    requires_approval: false,
  },
};

/**
 * Sample: Incident Report Form
 * COR Element 11 - Incident Investigation
 */
const incidentReport: FormConfig = {
  code: 'INCIDENT_REPORT',
  name: 'Incident Report',
  description: 'Report workplace incidents, near misses, and accidents.',
  cor_element: 11,
  frequency: 'as_needed',
  estimated_time_minutes: 30,
  icon: 'AlertTriangle',
  color: '#EF4444',
  is_mandatory: true,
  sections: [
    {
      title: 'Incident Details',
      order_index: 0,
      fields: [
        {
          code: 'incident_date',
          label: 'Date of Incident',
          field_type: 'date',
          order_index: 0,
          width: 'half',
          validation_rules: { required: true },
        },
        {
          code: 'incident_time',
          label: 'Time of Incident',
          field_type: 'time',
          order_index: 1,
          width: 'half',
          validation_rules: { required: true },
        },
        {
          code: 'jobsite',
          label: 'Jobsite / Location',
          field_type: 'jobsite_select',
          order_index: 2,
          width: 'full',
          validation_rules: { required: true },
        },
        {
          code: 'specific_location',
          label: 'Specific Location',
          field_type: 'text',
          placeholder: 'e.g., Loading dock, Floor 3, Parking lot',
          order_index: 3,
          width: 'full',
          validation_rules: { required: true },
        },
        {
          code: 'incident_type',
          label: 'Incident Type',
          field_type: 'dropdown',
          options: [
            { value: 'injury', label: 'Injury / Illness' },
            { value: 'near_miss', label: 'Near Miss' },
            { value: 'property_damage', label: 'Property Damage' },
            { value: 'environmental', label: 'Environmental Incident' },
            { value: 'security', label: 'Security Incident' },
            { value: 'vehicle', label: 'Vehicle Incident' },
            { value: 'other', label: 'Other' },
          ],
          order_index: 4,
          width: 'full',
          validation_rules: { required: true },
        },
      ],
    },
    {
      title: 'People Involved',
      order_index: 1,
      fields: [
        {
          code: 'injured_worker',
          label: 'Injured/Affected Worker(s)',
          field_type: 'worker_select',
          help_text: 'Select all workers who were injured or affected',
          order_index: 0,
          width: 'full',
        },
        {
          code: 'witnesses',
          label: 'Witnesses',
          field_type: 'worker_select',
          help_text: 'Select all workers who witnessed the incident',
          order_index: 1,
          width: 'full',
        },
        {
          code: 'supervisor_notified',
          label: 'Supervisor Notified',
          field_type: 'worker_select',
          order_index: 2,
          width: 'full',
          validation_rules: { required: true },
        },
      ],
    },
    {
      title: 'Incident Description',
      order_index: 2,
      fields: [
        {
          code: 'description',
          label: 'Description of Incident',
          field_type: 'textarea',
          placeholder: 'Describe what happened in detail. Include: what was the worker doing, what happened, how did it happen...',
          order_index: 0,
          width: 'full',
          validation_rules: { required: true, min_length: 100 },
        },
        {
          code: 'immediate_cause',
          label: 'Immediate Cause',
          field_type: 'textarea',
          placeholder: 'What was the immediate/direct cause of the incident?',
          order_index: 1,
          width: 'full',
          validation_rules: { required: true },
        },
        {
          code: 'contributing_factors',
          label: 'Contributing Factors',
          field_type: 'multiselect',
          options: [
            { value: 'inadequate_training', label: 'Inadequate Training' },
            { value: 'lack_of_ppe', label: 'Lack of/Improper PPE' },
            { value: 'equipment_failure', label: 'Equipment Failure' },
            { value: 'unsafe_conditions', label: 'Unsafe Conditions' },
            { value: 'procedural_violation', label: 'Procedural Violation' },
            { value: 'fatigue', label: 'Fatigue' },
            { value: 'rushing', label: 'Rushing' },
            { value: 'distraction', label: 'Distraction' },
            { value: 'communication', label: 'Communication Failure' },
            { value: 'weather', label: 'Weather Conditions' },
            { value: 'other', label: 'Other' },
          ],
          order_index: 2,
          width: 'full',
        },
      ],
    },
    {
      title: 'Injury Details',
      description: 'Complete this section if there was an injury',
      order_index: 3,
      conditional_logic: {
        field_code: 'incident_type',
        operator: 'equals',
        value: 'injury',
      },
      fields: [
        {
          code: 'injury_type',
          label: 'Type of Injury',
          field_type: 'dropdown',
          options: [
            { value: 'cut_laceration', label: 'Cut/Laceration' },
            { value: 'bruise_contusion', label: 'Bruise/Contusion' },
            { value: 'fracture', label: 'Fracture' },
            { value: 'sprain_strain', label: 'Sprain/Strain' },
            { value: 'burn', label: 'Burn' },
            { value: 'eye_injury', label: 'Eye Injury' },
            { value: 'respiratory', label: 'Respiratory' },
            { value: 'other', label: 'Other' },
          ],
          order_index: 0,
          width: 'half',
        },
        {
          code: 'body_part',
          label: 'Body Part Affected',
          field_type: 'text',
          order_index: 1,
          width: 'half',
        },
        {
          code: 'medical_treatment',
          label: 'Medical Treatment',
          field_type: 'dropdown',
          options: [
            { value: 'none', label: 'No Treatment Required' },
            { value: 'first_aid', label: 'First Aid On-Site' },
            { value: 'medical_attention', label: 'Medical Attention Required' },
            { value: 'hospital', label: 'Hospital Visit' },
            { value: 'ambulance', label: 'Ambulance Called' },
          ],
          order_index: 2,
          width: 'full',
        },
        {
          code: 'lost_time',
          label: 'Lost Time Incident?',
          field_type: 'radio',
          options: ['Yes', 'No', 'Unknown'],
          order_index: 3,
          width: 'full',
        },
      ],
    },
    {
      title: 'Immediate Actions',
      order_index: 4,
      fields: [
        {
          code: 'immediate_actions',
          label: 'Immediate Actions Taken',
          field_type: 'textarea',
          placeholder: 'Describe what actions were taken immediately following the incident...',
          order_index: 0,
          width: 'full',
          validation_rules: { required: true },
        },
        {
          code: 'area_secured',
          label: 'Was the area secured?',
          field_type: 'radio',
          options: ['Yes', 'No', 'N/A'],
          order_index: 1,
          width: 'full',
        },
        {
          code: 'photos',
          label: 'Incident Photos',
          field_type: 'photo',
          help_text: 'Take photos of the incident scene, equipment involved, injuries (if appropriate)',
          order_index: 2,
          width: 'full',
        },
      ],
    },
    {
      title: 'Sign-Off',
      order_index: 5,
      fields: [
        {
          code: 'reporter',
          label: 'Reported By',
          field_type: 'worker_select',
          order_index: 0,
          width: 'full',
          validation_rules: { required: true },
        },
        {
          code: 'reporter_signature',
          label: 'Reporter Signature',
          field_type: 'signature',
          order_index: 1,
          width: 'full',
          validation_rules: { required: true },
        },
        {
          code: 'gps_location',
          label: 'GPS Location',
          field_type: 'gps',
          order_index: 2,
          width: 'full',
        },
      ],
    },
  ],
  workflow: {
    submit_to_role: 'supervisor',
    notify_roles: ['supervisor', 'admin', 'internal_auditor'],
    creates_task: true,
    task_template: {
      title: 'Investigate Incident',
      priority: 'high',
      due_hours: 4,
    },
    sync_priority: 1, // Highest priority - sync immediately
    requires_approval: true,
  },
};

// =============================================================================
// ALL FORM CONFIGURATIONS
// =============================================================================

// Use the comprehensive form configs from the form-configs module
// This includes all 28+ forms across all 13 COR elements
export const formConfigs: FormConfig[] = allFormConfigs;

// Legacy sample forms for backwards compatibility
export const sampleFormConfigs: FormConfig[] = [
  dailySafetyInspection,
  toolboxTalk,
  incidentReport,
];

// Export individual sample configs for selective importing
export {
  dailySafetyInspection,
  toolboxTalk,
  incidentReport,
};

// Re-export comprehensive configs
export {
  allFormConfigs,
  formConfigsByElement,
  corElementDescriptions,
  formCountSummary,
};

// =============================================================================
// CLI SCRIPT
// =============================================================================

async function parseArgs(): Promise<{
  companyId: string | null;
  skipExisting: boolean;
}> {
  const args = process.argv.slice(2);

  let companyId: string | null = null;
  let skipExisting = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--company-id' && args[i + 1]) {
      companyId = args[i + 1];
      i++; // Skip next arg
    } else if (arg === '--global') {
      companyId = null;
    } else if (arg === '--force') {
      skipExisting = false;
    } else if (arg === '--skip-existing') {
      skipExisting = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Form Seeding CLI Script

Usage: npx tsx scripts/seed-forms.ts [options]

Options:
  --company-id <id>  Import forms for a specific company
  --global           Import as global templates (default)
  --skip-existing    Skip forms that already exist (default)
  --force            Overwrite existing forms
  --help, -h         Show this help message

Examples:
  npx tsx scripts/seed-forms.ts                    # Seed global templates
  npx tsx scripts/seed-forms.ts --company-id abc  # Seed for company
  npx tsx scripts/seed-forms.ts --force           # Force overwrite
      `);
      process.exit(0);
    }
  }

  return { companyId, skipExisting };
}

async function seedAllForms() {
  console.log('🌱 COR Form Seeding Script\n');
  console.log('═'.repeat(50));

  const { companyId, skipExisting } = await parseArgs();

  console.log(`\n📋 Configuration:`);
  console.log(`   Target: ${companyId ? `Company ${companyId}` : 'Global templates'}`);
  console.log(`   Skip existing: ${skipExisting}`);
  console.log(`   Forms to import: ${formConfigs.length}`);
  console.log(`   Mandatory forms: ${formCountSummary.mandatory}`);
  console.log(`   Optional forms: ${formCountSummary.optional}`);

  console.log(`\n📦 Forms by COR Element:`);
  Object.entries(formConfigsByElement).forEach(([element, forms]) => {
    const elementNum = Number(element);
    const desc = corElementDescriptions[elementNum] || 'Unknown';
    console.log(`   Element ${element}: ${forms.length} forms (${desc})`);
  });

  console.log('\n' + '═'.repeat(50) + '\n');

  console.log('🚀 Starting import...\n');

  // Create Supabase client for CLI usage
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const result = skipExisting
    ? await bulkImportFormsIfNotExists(formConfigs, companyId, true, supabase)
    : await bulkImportForms(formConfigs, companyId, supabase);

  console.log('\n' + '═'.repeat(50));
  console.log('\n📊 Import Results:');
  console.log(`   ✅ Successful: ${result.successful}/${result.total}`);
  console.log(`   ❌ Failed: ${result.failed}/${result.total}`);

  if (result.imported_ids.length > 0) {
    console.log(`\n📝 Imported Template IDs:`);
    result.imported_ids.forEach(id => {
      console.log(`   - ${id}`);
    });
  }

  if (result.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    result.errors.forEach(err => {
      console.log(`   - ${err.form}: ${err.error}`);
    });
  }

  console.log('\n' + '═'.repeat(50));
  console.log('✨ Seeding complete!\n');

  // Exit with error code if any failures
  if (result.failed > 0) {
    process.exit(1);
  }
}

// Run the script
seedAllForms().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
