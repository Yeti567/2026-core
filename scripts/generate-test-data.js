#!/usr/bin/env node

/**
 * TEST DATA GENERATOR
 * Creates realistic sample data for comprehensive feature testing
 * 
 * Usage:
 *   node scripts/generate-test-data.js
 *   COMPANY_NAME="Test Corp" node scripts/generate-test-data.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Configurable test company
const COMPANY_NAME = process.env.COMPANY_NAME || 'Automated Test Construction Co.';

// Test data templates
const COMPANY_DATA = {
  name: COMPANY_NAME,
  wsib_number: `BN-TEST-${Date.now()}`,
  address: '789 Test Drive', // Mapped to address
  city: 'Test City',
  province: 'ON', // Mapped to province
  postal_code: 'K1K 1K1',
  // country: 'Canada', // Not in schema
  phone: '613-555-9999',
  company_email: 'test@testcompany.local',
  // website: 'https://testcompany.local', // Not in schema
  industry: 'Construction - General',
  employee_count: 20,
  years_in_business: 5,
  main_services: ['Commercial Construction', 'Renovations', 'Project Management']
};

const TEST_WORKERS = [
  { first_name: 'Admin', last_name: 'User', email: 'admin@test.local', position: 'General Manager', role: 'admin', phone: '613-555-0001' },
  { first_name: 'Safety', last_name: 'Coordinator', email: 'safety@test.local', position: 'Safety Manager', role: 'internal_auditor', phone: '613-555-0002' },
  { first_name: 'Site', last_name: 'Lead', email: 'site@test.local', position: 'Site Supervisor', role: 'supervisor', phone: '613-555-0003' },
  { first_name: 'Crew', last_name: 'Chief', email: 'crew@test.local', position: 'Foreman', role: 'supervisor', phone: '613-555-0004' },
  { first_name: 'Skilled', last_name: 'Tradesperson', email: 'trade1@test.local', position: 'Carpenter', role: 'worker', phone: '613-555-0005' },
  { first_name: 'Apprentice', last_name: 'Tradesperson', email: 'trade2@test.local', position: 'Apprentice', role: 'worker', phone: '613-555-0006' },
  { first_name: 'Equipment', last_name: 'Operator A', email: 'operator1@test.local', position: 'Equipment Operator', role: 'worker', phone: '613-555-0007' },
  { first_name: 'Equipment', last_name: 'Operator B', email: 'operator2@test.local', position: 'Equipment Operator', role: 'worker', phone: '613-555-0008' },
  { first_name: 'General', last_name: 'Labourer A', email: 'labour1@test.local', position: 'Labourer', role: 'worker', phone: '613-555-0009' },
  { first_name: 'General', last_name: 'Labourer B', email: 'labour2@test.local', position: 'Labourer', role: 'worker', phone: '613-555-0010' }
];

const DEPARTMENTS = [
  { name: 'Management', description: 'Executive leadership and administration' },
  { name: 'Safety & Compliance', description: 'Health and safety oversight' },
  { name: 'Field Operations', description: 'On-site construction teams' },
  { name: 'Equipment & Logistics', description: 'Equipment management and logistics' }
];

const DOCUMENTS = [
  {
    control_number: 'TEST-POL-001',
    title: 'Corporate Health and Safety Policy',
    document_type_code: 'POL',
    sequence_number: 1,
    description: 'Overarching commitment to workplace safety',
    status: 'active',
    version: '1.0'
  },
  {
    control_number: 'TEST-SWP-001',
    title: 'Working at Heights Procedure',
    document_type_code: 'SWP',
    sequence_number: 1,
    description: 'Safe work procedure for elevated work',
    status: 'active',
    version: '1.0'
  },
  {
    control_number: 'TEST-SWP-002',
    title: 'Excavation and Trenching Safety',
    document_type_code: 'SWP',
    sequence_number: 2,
    description: 'Safe excavation practices',
    status: 'active',
    version: '1.0'
  },
  {
    control_number: 'TEST-SWP-003',
    title: 'Power Tool Safety',
    document_type_code: 'SWP',
    sequence_number: 3,
    description: 'Safe operation of power tools',
    status: 'active',
    version: '1.0'
  },
  {
    control_number: 'TEST-FRM-001',
    title: 'Pre-Task Hazard Assessment',
    document_type_code: 'FRM',
    sequence_number: 1,
    description: 'Daily hazard identification form',
    status: 'active',
    version: '1.0'
  },
  {
    control_number: 'TEST-FRM-002',
    title: 'Workplace Inspection Checklist',
    document_type_code: 'FRM',
    sequence_number: 2,
    description: 'Weekly site inspection form',
    status: 'active',
    version: '1.0'
  },
  {
    control_number: 'TEST-FRM-003',
    title: 'Incident Report Form',
    document_type_code: 'FRM',
    sequence_number: 3,
    description: 'Incident and near-miss reporting',
    status: 'active',
    version: '1.0'
  }
];

const EQUIPMENT = [
  {
    equipment_code: 'TEST-EQ-001',
    name: 'Skid Steer Loader',
    equipment_type: 'vehicle',
    make: 'Bobcat',
    model: 'S650',
    year_manufactured: 2021,
    serial_number: 'BSL-S650-12345',
    status: 'available',
    // requires_certification: true // Removed as not in schema directly? Or maybe it is? Schema has certifications_required TEXT[]
    certifications_required: ['Forklift Operation']
  },
  {
    equipment_code: 'TEST-EQ-002',
    name: 'Excavator',
    equipment_type: 'vehicle',
    make: 'Caterpillar',
    model: '320',
    year_manufactured: 2020,
    serial_number: 'CAT-320-67890',
    status: 'available',
    certifications_required: []
  },
  {
    equipment_code: 'TEST-EQ-003',
    name: 'Aerial Work Platform',
    equipment_type: 'aerial',
    make: 'Genie',
    model: 'Z-45/25J',
    year_manufactured: 2022,
    serial_number: 'GEN-Z45-11223',
    status: 'available',
    certifications_required: ['Aerial Work Platform (AWP)']
  },
  {
    equipment_code: 'TEST-EQ-004',
    name: 'Concrete Saw',
    equipment_type: 'tool',
    make: 'Husqvarna',
    model: 'K970',
    year_manufactured: 2021,
    serial_number: 'HUS-K970-33445',
    status: 'available',
    certifications_required: []
  },
  {
    equipment_code: 'TEST-EQ-005',
    name: 'Welding Machine',
    equipment_type: 'tool',
    make: 'Lincoln Electric',
    model: 'PowerMIG 260',
    year_manufactured: 2023,
    serial_number: 'LIN-PM260-55667',
    status: 'active',
    certifications_required: []
  }
];

const CERTIFICATION_TYPES = [
  {
    name: 'Working at Heights',
    short_code: 'WAH',
    description: 'Ministry of Labour approved WAH training',
    default_expiry_months: 36,
    required_for_work: true
  },
  {
    name: 'Aerial Work Platform (AWP)',
    short_code: 'AWP',
    description: 'Scissor lift and boom lift operation',
    default_expiry_months: 36,
    required_for_work: true
  },
  {
    name: 'Forklift Operation',
    short_code: 'FORK',
    description: 'Powered industrial truck operation',
    default_expiry_months: 36,
    required_for_work: false
  },
  {
    name: 'First Aid/CPR',
    short_code: 'FA',
    description: 'Standard First Aid and CPR Level C',
    default_expiry_months: 36,
    required_for_work: true
  },
  {
    name: 'WHMIS 2015',
    short_code: 'WHMIS',
    description: 'Workplace Hazardous Materials Information System',
    default_expiry_months: 36,
    required_for_work: true
  },
  {
    name: 'Confined Space Entry',
    short_code: 'CSE',
    description: 'Safe confined space entry procedures',
    default_expiry_months: 24,
    required_for_work: false
  }
];

// Helper functions
function log(message, type = 'info') {
  const symbols = { info: 'ℹ', success: '✓', error: '✗', warning: '⚠' };
  console.log(`${symbols[type] || 'ℹ'} ${message}`);
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// Main generation function
async function generateTestData() {
  console.log('\n' + '='.repeat(80));
  log('COR PATHWAYS - TEST DATA GENERATOR', 'info');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Create Company
    log('Creating test company...');
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert(COMPANY_DATA)
      .select()
      .single();

    if (companyError) throw companyError;
    log(`Company created: ${company.legal_name} (ID: ${company.id})`, 'success');

    const companyId = company.id;

    // 2. Create Workers & User Profiles
    log('\nCreating workers and user accounts...');
    const workerIds = [];
    const userIds = [];
    const profileIds = [];

    for (const worker of TEST_WORKERS) {
      // Create auth user
      let authData = { user: null };
      const { data: createdAuth, error: authError } = await supabase.auth.admin.createUser({
        email: worker.email,
        password: 'TestPassword123!@#',
        email_confirm: true,
        user_metadata: {
          full_name: `${worker.first_name} ${worker.last_name}`
        }
      });

      if (authError) {
        if (authError.message.includes('already been registered')) {
          // Fetch existing user to proceed
          const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
          if (users) {
            const existing = users.find(u => u.email === worker.email);
            if (existing) {
              authData = { user: existing };
              log(`User ${worker.email} already exists, using existing ID`, 'info');
            }
          }
        } else {
          log(`Failed to create auth user for ${worker.email}: ${authError.message}`, 'error');
          continue;
        }
      }

      else {
        authData = createdAuth;
      }

      const userId = authData.user?.id;
      if (!userId) {
        log(`Could not get ID for ${worker.email}`, 'error');
        continue;
      }
      userIds.push(userId);

      // Create user profile
      let profileId;
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          company_id: companyId,
          role: worker.role
        }, { onConflict: 'user_id' })
        .select('id')
        .single();

      if (profileError) {
        log(`Failed to create/fetch profile for ${worker.email}: ${profileError.message}`, 'error');
        // If conflict error persistence, try fetching directly
        if (profileError.message.includes('conflicts') || profileError.message.includes('violates')) {
          const { data: existingP } = await supabase.from('user_profiles').select('id').eq('user_id', userId).single();
          if (existingP) profileId = existingP.id;
        }
      } else {
        profileId = profileData.id;
      }

      if (profileId) {
        profileIds.push(profileId);
      } else {
        log(`Could not get profile ID for ${worker.email}, skipping worker creation which depends on it`, 'error');
        continue;
      }

      // Create worker record
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .insert({
          company_id: companyId,
          first_name: worker.first_name,
          last_name: worker.last_name,
          email: worker.email,
          position: worker.position,
          phone: worker.phone,
          // status: 'active', // Not in schema often, or defaulted? 001/013/030 don't seem to have simple 'status' on worker except certification_status
          hire_date: randomDate(new Date(2021, 0, 1), new Date(2024, 11, 31)).toISOString().split('T')[0]
        })
        .select()
        .single();

      if (workerError) {
        log(`Failed to create worker record for ${worker.first_name} ${worker.last_name}: ${workerError.message}`, 'error');
        continue;
      }

      workerIds.push(workerData.id);
      log(`Created: ${worker.first_name} ${worker.last_name} (${worker.role})`, 'success');
    }

    // 3. Create Departments
    log('\nCreating departments...');
    const deptIds = [];

    for (const dept of DEPARTMENTS) {
      const { data, error } = await supabase
        .from('departments')
        .insert({
          ...dept,
          company_id: companyId
        })
        .select()
        .single();

      if (error) {
        log(`Failed to create department ${dept.name}: ${error.message}`, 'error');
        continue;
      }

      deptIds.push(data.id);
      log(`Created: ${dept.name}`, 'success');
    }

    // 4. Assign Workers to Departments
    if (deptIds.length >= 4) {
      log('\nAssigning workers to departments...');

      const assignments = [
        { workerIdx: 0, deptIdx: 0 }, // Admin → Management
        { workerIdx: 1, deptIdx: 1 }, // Safety → Safety & Compliance
        { workerIdx: 2, deptIdx: 2 }, // Site Lead → Field Ops
        { workerIdx: 3, deptIdx: 2 }, // Crew Chief → Field Ops
        { workerIdx: 4, deptIdx: 2 }, // Skilled Trade → Field Ops
        { workerIdx: 5, deptIdx: 2 }, // Apprentice → Field Ops
        { workerIdx: 6, deptIdx: 3 }, // Operator A → Equipment
        { workerIdx: 7, deptIdx: 3 }, // Operator B → Equipment
        { workerIdx: 8, deptIdx: 2 }, // Labourer A → Field Ops
        { workerIdx: 9, deptIdx: 2 }  // Labourer B → Field Ops
      ];

      for (const assign of assignments) {
        if (workerIds[assign.workerIdx] && deptIds[assign.deptIdx]) {
          await supabase
            .from('workers')
            .update({ department_id: deptIds[assign.deptIdx] })
            .eq('id', workerIds[assign.workerIdx]);
        }
      }

      log('Workers assigned to departments', 'success');
    }

    // 5. Create Documents
    log('\nCreating documents...');
    const docIds = [];

    for (const doc of DOCUMENTS) {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          ...doc,
          company_id: companyId,
          company_id: companyId,
          created_by: profileIds[0] // Use profile ID, not auth ID
        })
        .select()
        .single();

      if (error) {
        log(`Failed to create document ${doc.title}: ${error.message}`, 'error');
        continue;
      }

      docIds.push(data.id);
      log(`Created: ${doc.control_number} - ${doc.title}`, 'success');
    }

    // 6. Create Equipment
    log('\nCreating equipment inventory...');
    const equipmentIds = [];

    for (const equip of EQUIPMENT) {
      const { data, error } = await supabase
        .from('equipment_inventory')
        .insert({
          ...equip,
          company_id: companyId,
          purchase_date: randomDate(new Date(2020, 0, 1), new Date(2023, 11, 31)).toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) {
        log(`Failed to create equipment ${equip.name}: ${error.message}`, 'error');
        continue;
      }

      equipmentIds.push(data.id);
      log(`Created: ${equip.equipment_code} - ${equip.name}`, 'success');
    }

    // 7. Create Certification Types
    log('\nCreating certification types...');
    const certTypeIds = [];

    for (const cert of CERTIFICATION_TYPES) {
      const { data, error } = await supabase
        .from('certification_types')
        .insert({
          ...cert,
          company_id: companyId
        })
        .select()
        .single();

      if (error) {
        log(`Failed to create certification type ${cert.name}: ${error.message}`, 'error');
        continue;
      }

      certTypeIds.push(data.id);
      log(`Created: ${cert.name}`, 'success');
    }

    // 8. Create Sample Worker Certifications
    log('\nCreating sample worker certifications...');

    const sampleCerts = [
      { workerIdx: 2, certIdx: 0, issueDate: new Date(2024, 5, 15) }, // Site Lead - WAH
      { workerIdx: 2, certIdx: 3, issueDate: new Date(2024, 3, 10) }, // Site Lead - First Aid
      { workerIdx: 3, certIdx: 0, issueDate: new Date(2024, 7, 20) }, // Crew Chief - WAH
      { workerIdx: 3, certIdx: 4, issueDate: new Date(2024, 0, 5) }, // Crew Chief - WHMIS
      { workerIdx: 4, certIdx: 0, issueDate: new Date(2025, 0, 10) }, // Skilled Trade - WAH
      { workerIdx: 6, certIdx: 1, issueDate: new Date(2024, 8, 12) }, // Operator A - AWP
      { workerIdx: 6, certIdx: 2, issueDate: new Date(2024, 6, 8) }, // Operator A - Forklift
      { workerIdx: 7, certIdx: 1, issueDate: new Date(2024, 9, 15) }  // Operator B - AWP
    ];

    for (const cert of sampleCerts) {
      if (workerIds[cert.workerIdx] && certTypeIds[cert.certIdx]) {
        const certType = CERTIFICATION_TYPES[cert.certIdx];
        const expiryDate = addMonths(cert.issueDate, certType.default_expiry_months);

        await supabase
          .from('worker_certifications')
          .insert({
            company_id: companyId,
            worker_id: workerIds[cert.workerIdx],
            certification_type_id: certTypeIds[cert.certIdx],
            issue_date: cert.issueDate.toISOString().split('T')[0],
            expiry_date: expiryDate.toISOString().split('T')[0],
            certification_number: `CERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            status: 'active'
          });
      }
    }

    log('Sample certifications created', 'success');

    // 9. Create Maintenance Schedules
    log('\nCreating maintenance schedules...');

    const schedules = [
      { equipIdx: 0, type: 'preventive', frequency: 'monthly', desc: 'Monthly inspection and servicing' },
      { equipIdx: 1, type: 'preventive', frequency: 'monthly', desc: 'Hydraulic fluid check and greasing' },
      { equipIdx: 2, type: 'preventive', frequency: 'quarterly', desc: 'Quarterly safety inspection' }
    ];

    for (const sched of schedules) {
      if (equipmentIds[sched.equipIdx]) {
        await supabase
          .from('maintenance_schedules')
          .insert({
            company_id: companyId,
            equipment_id: equipmentIds[sched.equipIdx],
            maintenance_type: sched.type,
            frequency: sched.frequency,
            description: sched.desc,
            next_due_date: addMonths(new Date(), 1).toISOString().split('T')[0]
          });
      }
    }

    log('Maintenance schedules created', 'success');

    // 10. Company Settings
    log('\nConfiguring company settings...');

    await supabase
      .from('company_settings')
      .insert({
        company_id: companyId,
        timezone: 'America/Toronto',
        date_format: 'YYYY-MM-DD',
        enable_notifications: true,
        audit_reminder_days: 30,
        certification_reminder_days: 60
      });

    log('Company settings configured', 'success');

    // Summary
    console.log('\n' + '='.repeat(80));
    log('TEST DATA GENERATION COMPLETE', 'success');
    console.log('='.repeat(80));

    console.log('\nGenerated Data Summary:');
    console.log(`  Company ID: ${companyId}`);
    console.log(`  Workers: ${workerIds.length}`);
    console.log(`  Departments: ${deptIds.length}`);
    console.log(`  Documents: ${docIds.length}`);
    console.log(`  Equipment: ${equipmentIds.length}`);
    console.log(`  Certification Types: ${certTypeIds.length}`);

    console.log('\nTest Credentials:');
    console.log('  Admin: admin@test.local / TestPassword123!@#');
    console.log('  Safety: safety@test.local / TestPassword123!@#');
    console.log('  Worker: labour1@test.local / TestPassword123!@#');

    console.log('\n✅ You can now login and test all features!\n');

    return {
      companyId,
      workerIds,
      userIds,
      deptIds,
      docIds,
      equipmentIds,
      certTypeIds
    };
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// Cleanup function
async function cleanupTestData(companyId) {
  log('\nCleaning up test data...');

  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', companyId);

  if (error) {
    log(`Cleanup failed: ${error.message}`, 'error');
  } else {
    log('Test data cleaned up successfully', 'success');
  }
}

// CLI execution
if (require.main === module) {
  generateTestData()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { generateTestData, cleanupTestData };
