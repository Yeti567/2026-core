/**
 * Registration Simulation Script for Jennifer Martinez
 * Maple Ridge Concrete Ltd.
 * 
 * This script demonstrates the registration flow
 * Run with: npx tsx scripts/register-jennifer-martinez.ts
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface RegistrationData {
  company_name: string;
  wsib_number: string;
  company_email: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  phone: string;
  registrant_name: string;
  registrant_position: string;
  registrant_email: string;
  industry?: string;
  employee_count?: number;
  years_in_business?: number;
  main_services?: string[];
}

const jenniferData: RegistrationData = {
  company_name: 'Maple Ridge Concrete Ltd.',
  wsib_number: '123456789',
  company_email: 'info@mapleridgeconcrete.ca',
  address: '2500 Industrial Parkway',
  city: 'Ottawa',
  province: 'ON',
  postal_code: 'K1G 4K9',
  phone: '6135557800',
  registrant_name: 'Jennifer Martinez',
  registrant_position: 'director',
  registrant_email: 'jennifer@mapleridgeconcrete.ca',
  industry: 'concrete_construction',
  employee_count: 32,
  years_in_business: 5,
  main_services: ['Foundations', 'Flatwork', 'Structural Concrete', 'Decorative Finishes']
};

async function registerCompany() {
  console.log('🚀 Starting Registration Process for Jennifer Martinez');
  console.log('=' .repeat(60));
  console.log('\n📋 Registration Data:');
  console.log(JSON.stringify(jenniferData, null, 2));
  console.log('\n');

  try {
    // Step 1: Submit Registration
    console.log('📝 Step 1: Submitting Registration Form...');
    const response = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jenniferData),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Registration Failed:');
      console.error(result);
      return;
    }

    console.log('✅ Registration Submitted Successfully!');
    console.log(`📧 Verification email sent to: ${jenniferData.registrant_email}`);
    console.log('\n📬 Next Steps:');
    console.log('1. Check email inbox for verification link');
    console.log('2. Click the verification link');
    console.log('3. You will be redirected to /welcome');
    console.log('4. Complete your company profile if needed');
    console.log('5. Start your 12-phase COR certification journey');

    console.log('\n📊 Registration Response:');
    console.log(JSON.stringify(result, null, 2));

    // Simulate what happens after email verification
    console.log('\n\n🎯 Simulated Flow After Email Verification:');
    console.log('=' .repeat(60));
    console.log('\n✅ Email Verified');
    console.log('✅ Company Created: Maple Ridge Concrete Ltd.');
    console.log('✅ User Profile Created: Jennifer Martinez (Admin)');
    console.log('✅ Worker Record Created');
    console.log('✅ Industry Data Saved:');
    console.log('   - Industry: Concrete Construction');
    console.log('   - Employees: 32');
    console.log('   - Years in Business: 5');
    console.log('   - Services: Foundations, Flatwork, Structural Concrete, Decorative Finishes');
    console.log('\n➡️  Redirecting to /welcome...');

    console.log('\n\n🎉 Welcome Page Experience:');
    console.log('=' .repeat(60));
    console.log('Welcome to COR Pathways, Maple Ridge Concrete Ltd.!');
    console.log('\n📋 Company Information:');
    console.log('   - Name: Maple Ridge Concrete Ltd.');
    console.log('   - Industry: Concrete Construction');
    console.log('   - Employees: 32');
    console.log('   - Years in Business: 5');
    console.log('   - Services: Foundations, Flatwork, Structural Concrete, Decorative Finishes');
    
    console.log('\n📚 The 14 COR Elements:');
    const elements = [
      { num: 1, name: 'Health & Safety Policy', weight: '5%' },
      { num: 2, name: 'Hazard Assessment', weight: '10%' },
      { num: 3, name: 'Safe Work Practices', weight: '10%' },
      { num: 4, name: 'Safe Job Procedures', weight: '10%' },
      { num: 5, name: 'Company Safety Rules', weight: '5%' },
      { num: 6, name: 'Personal Protective Equipment', weight: '5%' },
      { num: 7, name: 'Preventative Maintenance', weight: '5%' },
      { num: 8, name: 'Training & Communication', weight: '10%' },
      { num: 9, name: 'Workplace Inspections', weight: '10%' },
      { num: 10, name: 'Incident Investigation', weight: '10%' },
      { num: 11, name: 'Emergency Preparedness', weight: '5%' },
      { num: 12, name: 'Statistics & Records', weight: '5%' },
      { num: 13, name: 'Legislation & Compliance', weight: '5%' },
      { num: 14, name: 'Management Review', weight: '5%' },
    ];
    
    elements.forEach(el => {
      console.log(`   ${el.num}. ${el.name} (${el.weight})`);
    });

    console.log('\n🚀 Your Next Steps:');
    console.log('1. Review all 14 COR elements');
    console.log('2. Navigate to /phases to see your 12-phase journey');
    console.log('3. Add your 32 team members at /admin/employees');
    console.log('4. Start Phase 1: Company Onboarding');
    console.log('5. Begin uploading safety documents');
    console.log('6. Track your progress in the dashboard');

    console.log('\n\n📈 Dashboard Overview:');
    console.log('=' .repeat(60));
    console.log('Overall Progress: 0%');
    console.log('Phases Completed: 0/12');
    console.log('Current Phase: Phase 1 - Company Onboarding');
    console.log('Status: Ready to begin');

  } catch (error) {
    console.error('❌ Error during registration:');
    console.error(error);
  }
}

// Run if executed directly
if (require.main === module) {
  registerCompany().catch(console.error);
}

export { registerCompany, jenniferData };
