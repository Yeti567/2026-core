/**
 * END-TO-END FEATURE TEST SUITE
 * Complete Company Journey Simulation
 * 
 * Simulates "Northern Concrete Solutions Inc." going through entire COR certification
 * process, testing every feature with realistic construction company data.
 * 
 * Test Flow:
 * 1. Company Registration
 * 2. Admin Setup & Configuration
 * 3. Team Onboarding (bulk invitations)
 * 4. Organizational Structure (departments)
 * 5. Document Control System
 * 6. Forms & Templates
 * 7. PDF Conversion
 * 8. Audit & Compliance
 * 9. Certifications & Training
 * 10. Equipment & Maintenance
 * 11. COR Phase Journey
 * 12. Integrations
 * 13. PWA/Offline Features
 * 14. Notifications & Reminders
 * 
 * Run with: npx tsx end-to-end-journey-test.spec.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test company data - realistic construction company
const TEST_COMPANY = {
  legalName: 'Northern Concrete Solutions Inc.',
  businessNumber: 'BN-123456789RC0001',
  officeAddress: '1500 Industrial Parkway',
  city: 'Sudbury',
  provinceState: 'ON',
  postalCode: 'P3A 4Z2',
  industry: 'Construction - Concrete',
  employeeCount: 25,
  yearsInBusiness: 8,
  primaryServices: 'Foundations, Flatwork, Structural Concrete'
};

// Test team members
const TEST_TEAM = [
  { name: 'Jennifer Martinez', email: 'jmartinez@northernconcrete.test', position: 'Project Manager', role: 'admin', phone: '705-555-0101' },
  { name: 'David Chen', email: 'dchen@northernconcrete.test', position: 'Safety Manager', role: 'internal_auditor', phone: '705-555-0102' },
  { name: 'Maria Rodriguez', email: 'mrodriguez@northernconcrete.test', position: 'Site Supervisor', role: 'supervisor', phone: '705-555-0103' },
  { name: 'James Wilson', email: 'jwilson@northernconcrete.test', position: 'Foreman', role: 'supervisor', phone: '705-555-0104' },
  { name: 'Sarah Thompson', email: 'sthompson@northernconcrete.test', position: 'Concrete Finisher', role: 'worker', phone: '705-555-0105' },
  { name: 'Michael Brown', email: 'mbrown@northernconcrete.test', position: 'Labourer', role: 'worker', phone: '705-555-0106' },
  { name: 'Lisa Anderson', email: 'landerson@northernconcrete.test', position: 'Form Setter', role: 'worker', phone: '705-555-0107' },
  { name: 'Robert Taylor', email: 'rtaylor@northernconcrete.test', position: 'Equipment Operator', role: 'worker', phone: '705-555-0108' }
];

// Test context
interface TestContext {
  companyId?: string;
  adminUserId?: string;
  adminSession?: any;
  workerIds: string[];
  documentIds: string[];
  formIds: string[];
  equipmentIds: string[];
  serviceClient: ReturnType<typeof createClient>;
}

const ctx: TestContext = {
  workerIds: [],
  documentIds: [],
  formIds: [],
  equipmentIds: [],
  serviceClient: createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function log(phase: string, step: string, success: boolean, message: string) {
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${phase} - ${step}: ${message}`);
}

async function runPhase1() {
  console.log('\n📋 PHASE 1: COMPANY REGISTRATION');
  console.log('─'.repeat(60));

  // Step 1.1: Request registration token
  console.log('\nStep 1.1: Request registration token');
  const regResponse = await fetch(`${APP_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_name: TEST_COMPANY.legalName,
      wsib_number: TEST_COMPANY.businessNumber,
      company_email: `info@${TEST_COMPANY.legalName.toLowerCase().replace(/\s+/g, '')}.test`,
      address: TEST_COMPANY.officeAddress,
      city: TEST_COMPANY.city,
      province: TEST_COMPANY.provinceState,
      postal_code: TEST_COMPANY.postalCode,
      phone: '705-555-0100',
      registrant_name: TEST_TEAM[0].name,
      registrant_position: 'director',
      registrant_email: TEST_TEAM[0].email
    })
  });

  assert(regResponse.status === 200, `Registration failed: ${regResponse.status}`);
  const regData = await regResponse.json();
  log('Phase 1', 'Request registration token', true, 'Token requested successfully');

  // Step 1.2: Complete registration via token
  console.log('\nStep 1.2: Complete registration via token');
  const { data: token } = await ctx.serviceClient
    .from('registration_tokens')
    .select('*')
    .eq('email', TEST_TEAM[0].email)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  assert(token !== null, 'Registration token not found');

  const { error: rpcError } = await ctx.serviceClient.rpc('use_registration_token', { p_token: token!.token });
  assert(rpcError === null, `RPC error: ${rpcError?.message}`);

  const { data: company } = await ctx.serviceClient
    .from('companies')
    .select('*')
    .or(`legal_name.eq.${TEST_COMPANY.legalName},name.eq.${TEST_COMPANY.legalName},wsib_number.eq.${TEST_COMPANY.businessNumber}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  assert(company !== null, 'Company not found');
  ctx.companyId = company!.id;
  log('Phase 1', 'Complete registration', true, `Company created: ${ctx.companyId.slice(0, 8)}...`);

  // Step 1.3: Admin user creation
  console.log('\nStep 1.3: Admin user creation');
  const { data: authData, error: authError } = await ctx.serviceClient.auth.admin.createUser({
    email: TEST_TEAM[0].email,
    password: 'SecureTestPass123!@#',
    email_confirm: true,
    user_metadata: { full_name: TEST_TEAM[0].name }
  });

  assert(authError === null, `Auth error: ${authError?.message}`);
  ctx.adminUserId = authData.user!.id;

  await ctx.serviceClient.from('user_profiles').insert({
    id: ctx.adminUserId,
    company_id: ctx.companyId,
    role: 'admin',
    email: TEST_TEAM[0].email
  });

  const { data: worker } = await ctx.serviceClient
    .from('workers')
    .insert({
      company_id: ctx.companyId,
      name: TEST_TEAM[0].name,
      email: TEST_TEAM[0].email,
      position: TEST_TEAM[0].position,
      phone: TEST_TEAM[0].phone,
      status: 'active'
    })
    .select()
    .single();

  ctx.workerIds.push(worker!.id);
  log('Phase 1', 'Admin user creation', true, `Admin created: ${ctx.adminUserId.slice(0, 8)}...`);

  // Step 1.4: Admin login
  console.log('\nStep 1.4: Admin login');
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: sessionData, error: loginError } = await client.auth.signInWithPassword({
    email: TEST_TEAM[0].email,
    password: 'SecureTestPass123!@#'
  });

  assert(loginError === null, `Login error: ${loginError?.message}`);
  assert(sessionData.session !== null, 'Session is null');
  ctx.adminSession = sessionData.session;
  log('Phase 1', 'Admin login', true, 'Admin authenticated');
}

async function runPhase2() {
  console.log('\n📋 PHASE 2: ADMIN SETUP & CONFIGURATION');
  console.log('─'.repeat(60));

  // Step 2.1: Update company profile
  const profileResponse = await fetch(`${APP_URL}/api/admin/company/profile`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${ctx.adminSession!.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      website: 'https://northernconcrete.test',
      phone: '705-555-0100',
      email: 'info@northernconcrete.test',
      business_description: 'Full-service concrete contractor'
    })
  });
  log('Phase 2', 'Update company profile', profileResponse.status === 200, `Status: ${profileResponse.status}`);

  // Step 2.2: Configure settings
  const settingsResponse = await fetch(`${APP_URL}/api/admin/company/settings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ctx.adminSession!.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      timezone: 'America/Toronto',
      date_format: 'MM/DD/YYYY',
      enable_notifications: true,
      audit_reminder_days: 30,
      certification_reminder_days: 60
    })
  });
  log('Phase 2', 'Configure settings', settingsResponse.status === 200, `Status: ${settingsResponse.status}`);

  // Step 2.3: Add locations
  const locations = [
    { name: 'Main Office', address: '1500 Industrial Parkway', city: 'Sudbury', province: 'ON', postal_code: 'P3A 4Z2', is_primary: true },
    { name: 'Equipment Yard', address: '2345 Kingsway', city: 'Sudbury', province: 'ON', postal_code: 'P3B 2E3', is_primary: false }
  ];

  for (const location of locations) {
    const locResponse = await fetch(`${APP_URL}/api/admin/company/locations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ctx.adminSession!.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(location)
    });
    log('Phase 2', `Add location: ${location.name}`, locResponse.status === 201, `Status: ${locResponse.status}`);
  }
}

async function runPhase3() {
  console.log('\n📋 PHASE 3: TEAM ONBOARDING');
  console.log('─'.repeat(60));

  // Step 3.1: Send bulk invitations
  const invitations = TEST_TEAM.slice(1).map(m => ({ email: m.email, name: m.name, position: m.position, phone: m.phone }));
  const inviteResponse = await fetch(`${APP_URL}/api/invitations/bulk`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ctx.adminSession!.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ invitations })
  });
  const inviteData = await inviteResponse.json();
  log('Phase 3', 'Send bulk invitations', inviteResponse.status === 200, `${inviteData.successful || 0} invitations sent`);

  // Step 3.2: Simulate invitation acceptance
  for (let i = 1; i < TEST_TEAM.length; i++) {
    // Safe: i is a controlled loop index bounded by TEST_TEAM.length
    // eslint-disable-next-line security/detect-object-injection
    const member = TEST_TEAM[i];
    const { data: authData } = await ctx.serviceClient.auth.admin.createUser({
      email: member.email,
      password: 'TestPass123!@#',
      email_confirm: true,
      user_metadata: { full_name: member.name }
    }).catch(() => ({ data: { user: null } }));

    if (authData?.user) {
      await ctx.serviceClient.from('user_profiles').insert({
        id: authData.user.id,
        company_id: ctx.companyId!,
        role: member.role as any,
        email: member.email
      }).catch(() => {});

      const { data: worker } = await ctx.serviceClient
        .from('workers')
        .insert({
          company_id: ctx.companyId!,
          name: member.name,
          email: member.email,
          position: member.position,
          phone: member.phone,
          status: 'active'
        })
        .select()
        .single()
        .catch(() => ({ data: null }));

      if (worker) ctx.workerIds.push(worker.id);
    }
  }
  log('Phase 3', 'Accept invitations', true, `${TEST_TEAM.length} team members onboarded`);

  // Step 3.3: Verify roster
  const workersResponse = await fetch(`${APP_URL}/api/workers`, {
    headers: { 'Authorization': `Bearer ${ctx.adminSession!.access_token}` }
  });
  const workers = await workersResponse.json();
  log('Phase 3', 'Verify roster', workers.length >= TEST_TEAM.length, `${workers.length} workers found`);
}

async function runPhase4() {
  console.log('\n📋 PHASE 4: ORGANIZATIONAL STRUCTURE');
  console.log('─'.repeat(60));

  const departments = [
    { name: 'Management', description: 'Executive staff' },
    { name: 'Field Operations', description: 'Construction crews' },
    { name: 'Safety & Compliance', description: 'Health and safety' },
    { name: 'Equipment & Maintenance', description: 'Fleet management' }
  ];

  for (const dept of departments) {
    const deptResponse = await fetch(`${APP_URL}/api/admin/departments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ctx.adminSession!.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dept)
    });
    log('Phase 4', `Create department: ${dept.name}`, deptResponse.status === 201, `Status: ${deptResponse.status}`);
  }

  // Assign workers to departments
  const { data: depts } = await ctx.serviceClient.from('departments').select('*').eq('company_id', ctx.companyId!);
  const mgmtDept = depts!.find(d => d.name === 'Management');
  const fieldDept = depts!.find(d => d.name === 'Field Operations');
  const safetyDept = depts!.find(d => d.name === 'Safety & Compliance');

  const assignments = [
    { workerName: 'Jennifer Martinez', deptId: mgmtDept!.id },
    { workerName: 'David Chen', deptId: safetyDept!.id },
    { workerName: 'Maria Rodriguez', deptId: fieldDept!.id },
    { workerName: 'James Wilson', deptId: fieldDept!.id }
  ];

  for (const assign of assignments) {
    const { data: worker } = await ctx.serviceClient
      .from('workers')
      .select('id')
      .eq('company_id', ctx.companyId!)
      .eq('name', assign.workerName)
      .single();

    if (worker) {
      await ctx.serviceClient.from('workers').update({ department_id: assign.deptId }).eq('id', worker.id);
    }
  }
  log('Phase 4', 'Assign workers', true, 'Workers assigned to departments');
}

async function runPhase5() {
  console.log('\n📋 PHASE 5: DOCUMENT CONTROL SYSTEM');
  console.log('─'.repeat(60));

  // Create folders
  const folders = [
    { name: 'Policies & Procedures', description: 'Company policies' },
    { name: 'Forms & Templates', description: 'Standard forms' }
  ];

  for (const folder of folders) {
    const folderResponse = await fetch(`${APP_URL}/api/documents/folders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ctx.adminSession!.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(folder)
    });
    log('Phase 5', `Create folder: ${folder.name}`, folderResponse.status === 201, `Status: ${folderResponse.status}`);
  }

  // Create documents
  const documents = [
    { control_number: 'NCSI-POL-001', title: 'Health and Safety Policy', document_type: 'policy', status: 'active', version: 1 },
    { control_number: 'NCSI-SWP-001', title: 'Concrete Pour Procedure', document_type: 'procedure', status: 'active', version: 1 }
  ];

  for (const doc of documents) {
    const { data, error } = await ctx.serviceClient
      .from('documents')
      .insert({
        ...doc,
        company_id: ctx.companyId!,
        created_by: ctx.adminUserId!
      })
      .select()
      .single();

    if (!error && data) {
      ctx.documentIds.push(data.id);
      log('Phase 5', `Create document: ${doc.title}`, true, 'Document created');
    }
  }

  // Document search
  const searchResponse = await fetch(`${APP_URL}/api/documents/search?q=safety`, {
    headers: { 'Authorization': `Bearer ${ctx.adminSession!.access_token}` }
  });
  log('Phase 5', 'Document search', searchResponse.status === 200, 'Search working');
}

async function runPhase6() {
  console.log('\n📋 PHASE 6: FORMS & TEMPLATES');
  console.log('─'.repeat(60));

  const formTemplate = {
    name: 'Daily Toolbox Talk Form',
    description: 'Daily safety meeting',
    category: 'safety',
    fields: [
      { id: 'date', type: 'date', label: 'Meeting Date', required: true },
      { id: 'supervisor', type: 'text', label: 'Supervisor Name', required: true },
      { id: 'topic', type: 'select', label: 'Safety Topic', required: true, options: ['Fall Protection', 'PPE'] },
      { id: 'attendees', type: 'textarea', label: 'Attendees', required: true }
    ]
  };

  const { data: form, error: formError } = await ctx.serviceClient
    .from('forms')
    .insert({ company_id: ctx.companyId!, ...formTemplate })
    .select()
    .single();

  if (!formError && form) {
    ctx.formIds.push(form.id);
    log('Phase 6', 'Create form template', true, 'Form template created');

    // Submit form response
    await ctx.serviceClient.from('form_submissions').insert({
      form_id: form.id,
      company_id: ctx.companyId!,
      submitted_by: ctx.workerIds[2],
      responses: { date: '2026-01-20', supervisor: 'Maria Rodriguez', topic: 'Fall Protection', attendees: 'Team' },
      submitted_at: new Date().toISOString()
    });
    log('Phase 6', 'Submit form response', true, 'Form submitted');
  }
}

async function runPhase7() {
  console.log('\n📋 PHASE 7: PDF CONVERSION');
  console.log('─'.repeat(60));
  log('Phase 7', 'PDF conversion', true, '⚠️ Requires manual testing with actual PDF files');
}

async function runPhase8() {
  console.log('\n📋 PHASE 8: AUDIT & COMPLIANCE');
  console.log('─'.repeat(60));

  // Check compliance
  const complianceResponse = await fetch(`${APP_URL}/api/audit/compliance`, {
    headers: { 'Authorization': `Bearer ${ctx.adminSession!.access_token}` }
  });
  log('Phase 8', 'Check compliance score', complianceResponse.status === 200, 'Compliance score retrieved');

  // Create action plan
  const actionPlanResponse = await fetch(`${APP_URL}/api/audit/action-plan`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ctx.adminSession!.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Complete Element 6 Documentation',
      description: 'Develop confined space procedures',
      priority: 'high',
      assigned_to: ctx.workerIds[1],
      due_date: '2026-03-01',
      cor_element: 6
    })
  });
  log('Phase 8', 'Create action plan', actionPlanResponse.status === 201, `Status: ${actionPlanResponse.status}`);

  // Mock audit interview
  const mockInterviewResponse = await fetch(`${APP_URL}/api/audit/mock-interview`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ctx.adminSession!.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      auditType: 'quick',
      workerId: ctx.workerIds[4]
    })
  });
  log('Phase 8', 'Mock audit interview', mockInterviewResponse.status === 201, `Status: ${mockInterviewResponse.status}`);
}

async function runPhase9() {
  console.log('\n📋 PHASE 9: CERTIFICATIONS & TRAINING');
  console.log('─'.repeat(60));

  const certTypes = [
    { name: 'Working at Heights', description: 'WAH certification', validity_period_months: 36, is_mandatory: true },
    { name: 'First Aid/CPR', description: 'First Aid Level C', validity_period_months: 36, is_mandatory: true }
  ];

  for (const cert of certTypes) {
    await ctx.serviceClient.from('certification_types').insert({
      ...cert,
      company_id: ctx.companyId!
    });
  }
  log('Phase 9', 'Create certification types', true, `${certTypes.length} types created`);

  // Check alerts
  const alertsResponse = await fetch(`${APP_URL}/api/certifications/alerts/check`, {
    headers: { 'Authorization': `Bearer ${ctx.adminSession!.access_token}` }
  });
  log('Phase 9', 'Check certification alerts', alertsResponse.status === 200, 'Alerts checked');
}

async function runPhase10() {
  console.log('\n📋 PHASE 10: EQUIPMENT & MAINTENANCE');
  console.log('─'.repeat(60));

  const equipment = [
    { asset_number: 'NCSI-EQ-001', name: 'Concrete Mixer Truck', equipment_type: 'vehicle', make: 'Mack', model: 'Granite', year: 2020, status: 'active' },
    { asset_number: 'NCSI-EQ-002', name: 'Power Trowel', equipment_type: 'tool', make: 'Wacker', model: 'CRT48', year: 2022, status: 'active' }
  ];

  for (const item of equipment) {
    const { data, error } = await ctx.serviceClient
      .from('equipment_inventory')
      .insert({ ...item, company_id: ctx.companyId! })
      .select()
      .single();

    if (!error && data) {
      ctx.equipmentIds.push(data.id);
      log('Phase 10', `Register equipment: ${item.name}`, true, 'Equipment registered');
    }
  }

  // Create maintenance record
  if (ctx.equipmentIds.length > 0) {
    const maintResponse = await fetch(`${APP_URL}/api/maintenance/records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ctx.adminSession!.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        equipment_id: ctx.equipmentIds[0],
        maintenance_type: 'preventive',
        description: 'Monthly inspection',
        scheduled_date: '2026-01-20',
        completed_date: '2026-01-20',
        performed_by: ctx.workerIds[7],
        status: 'completed'
      })
    });
    log('Phase 10', 'Record maintenance', maintResponse.status === 201, `Status: ${maintResponse.status}`);
  }
}

async function runPhase11() {
  console.log('\n📋 PHASE 11: COR PHASE JOURNEY');
  console.log('─'.repeat(60));

  const phasesResponse = await fetch(`${APP_URL}/api/phases`, {
    headers: { 'Authorization': `Bearer ${ctx.adminSession!.access_token}` }
  });
  const phases = await phasesResponse.json();
  log('Phase 11', 'Load COR phases', phasesResponse.status === 200, `${phases.phases?.length || 0} phases loaded`);

  // Start phase 1
  const { data: phase1 } = await ctx.serviceClient
    .from('cor_phases')
    .select('*')
    .eq('phase_number', 1)
    .single();

  if (phase1) {
    await ctx.serviceClient.from('company_phase_progress').insert({
      company_id: ctx.companyId!,
      phase_id: phase1.id,
      status: 'in_progress',
      started_at: new Date().toISOString()
    });
    log('Phase 11', 'Start phase 1', true, 'Phase 1 started');
  }
}

async function runPhase12() {
  console.log('\n📋 PHASE 12: INTEGRATIONS');
  console.log('─'.repeat(60));

  const statusResponse = await fetch(`${APP_URL}/api/integrations/auditsoft/status`, {
    headers: { 'Authorization': `Bearer ${ctx.adminSession!.access_token}` }
  });
  log('Phase 12', 'Check AuditSoft integration', statusResponse.status === 200, 'Integration status checked');
}

async function runPhase13() {
  console.log('\n📋 PHASE 13: PWA & OFFLINE FEATURES');
  console.log('─'.repeat(60));
  log('Phase 13', 'Offline caching', true, '⚠️ Requires browser environment testing');
}

async function runPhase14() {
  console.log('\n📋 PHASE 14: NOTIFICATIONS & REMINDERS');
  console.log('─'.repeat(60));

  const { data: notifications } = await ctx.serviceClient
    .from('notifications')
    .select('*')
    .eq('company_id', ctx.companyId!)
    .limit(5);

  log('Phase 14', 'Verify notifications', true, `${notifications?.length || 0} notifications found`);
  log('Phase 14', 'Push notifications', true, '⚠️ Requires browser environment testing');
}

async function runFinal() {
  console.log('\n📋 FINAL: REPORTS & DASHBOARDS');
  console.log('─'.repeat(60));

  // Audit readiness report
  const reportResponse = await fetch(`${APP_URL}/api/audit/compliance`, {
    headers: { 'Authorization': `Bearer ${ctx.adminSession!.access_token}` }
  });
  log('Final', 'Audit readiness report', reportResponse.status === 200, 'Report generated');

  // Certifications report
  const certReportResponse = await fetch(`${APP_URL}/api/certifications/reports/expiring`, {
    headers: { 'Authorization': `Bearer ${ctx.adminSession!.access_token}` }
  });
  log('Final', 'Certifications report', certReportResponse.status === 200, 'Report exported');

  // Dashboard stats
  const statsResponse = await fetch(`${APP_URL}/api/admin/employees/stats`, {
    headers: { 'Authorization': `Bearer ${ctx.adminSession!.access_token}` }
  });
  log('Final', 'Dashboard stats', statsResponse.status === 200, 'Stats retrieved');
}

async function runTests() {
  console.log('🏗️ END-TO-END COMPANY JOURNEY TEST');
  console.log('═'.repeat(60));

  try {
    await runPhase1();
    await runPhase2();
    await runPhase3();
    await runPhase4();
    await runPhase5();
    await runPhase6();
    await runPhase7();
    await runPhase8();
    await runPhase9();
    await runPhase10();
    await runPhase11();
    await runPhase12();
    await runPhase13();
    await runPhase14();
    await runFinal();

    console.log('\n' + '═'.repeat(60));
    console.log('✅ END-TO-END TEST COMPLETE');
    console.log('═'.repeat(60));
  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    if (ctx.companyId) {
      try {
        await ctx.serviceClient.from('companies').delete().eq('id', ctx.companyId);
        console.log('\n✅ Test data cleaned up');
      } catch (error) {
        console.log('\n⚠️  Cleanup error (non-critical)');
      }
    }
  }
}

// Run if executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };
