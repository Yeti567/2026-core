/**
 * Code Structure Verification
 * Verifies all components and routes exist before server testing
 */

import * as fs from 'fs';
import * as path from 'path';

interface CheckResult {
  check: string;
  passed: boolean;
  message: string;
}

const results: CheckResult[] = [];

function checkFile(filePath: string, description: string): boolean {
  const fullPath = path.join(process.cwd(), filePath);
  const exists = fs.existsSync(fullPath);
  results.push({
    check: description,
    passed: exists,
    message: exists ? 'File exists' : `File missing: ${filePath}`
  });
  return exists;
}

function checkDirectory(dirPath: string, description: string): boolean {
  const fullPath = path.join(process.cwd(), dirPath);
  const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
  results.push({
    check: description,
    passed: exists,
    message: exists ? 'Directory exists' : `Directory missing: ${dirPath}`
  });
  return exists;
}

console.log('🔍 Verifying Code Structure');
console.log('='.repeat(60));

// Check migrations
console.log('\n📦 Database Migrations:');
checkFile('supabase/migrations/027_add_company_industry.sql', 'Industry migration file');

// Check API routes
console.log('\n🔌 API Routes:');
checkFile('app/api/register/route.ts', 'Registration API route');
checkFile('app/api/admin/company/profile/route.ts', 'Company profile API route');
checkFile('app/api/phases/route.ts', 'Phases API route');
checkFile('app/api/phases/[phaseId]/route.ts', 'Phase detail API route');
checkFile('app/api/phases/[phaseId]/prompts/[promptId]/route.ts', 'Prompt API route');

// Check pages
console.log('\n📄 Pages:');
checkFile('app/(auth)/register/page.tsx', 'Registration page');
checkFile('app/(protected)/welcome/page.tsx', 'Welcome page');
checkFile('app/(protected)/phases/page.tsx', 'Phases page');
checkFile('app/(protected)/phases/[phaseId]/page.tsx', 'Phase detail page');
checkFile('app/(protected)/admin/profile/page.tsx', 'Company profile page');
checkFile('app/(protected)/dashboard/page.tsx', 'Dashboard page');
checkFile('app/auth/register-callback/route.ts', 'Registration callback route');

// Check components
console.log('\n🧩 Components:');
checkFile('components/welcome/welcome-onboarding.tsx', 'Welcome onboarding component');
checkFile('components/admin/company-profile-form.tsx', 'Company profile form');
checkFile('components/phases/phases-dashboard.tsx', 'Phases dashboard');
checkFile('components/phases/phase-detail.tsx', 'Phase detail component');
checkFile('components/dashboard/phases-widget.tsx', 'Phases widget');

// Check validation
console.log('\n✅ Validation:');
checkFile('lib/validation/company.ts', 'Company validation');

// Check types
console.log('\n📚 Types:');
checkFile('lib/audit/types.ts', 'COR elements types');

// Check migration content
console.log('\n🔍 Migration Content Check:');
const migrationPath = path.join(process.cwd(), 'supabase/migrations/027_add_company_industry.sql');
if (fs.existsSync(migrationPath)) {
  const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
  const hasIndustryColumn = migrationContent.includes('ADD COLUMN IF NOT EXISTS industry');
  const hasEmployeeCount = migrationContent.includes('employee_count');
  const hasFunctionUpdate = migrationContent.includes('use_registration_token');
  
  results.push({
    check: 'Migration includes industry column',
    passed: hasIndustryColumn,
    message: hasIndustryColumn ? 'Industry column defined' : 'Missing industry column'
  });
  
  results.push({
    check: 'Migration includes employee_count',
    passed: hasEmployeeCount,
    message: hasEmployeeCount ? 'Employee count defined' : 'Missing employee_count'
  });
  
  results.push({
    check: 'Migration updates use_registration_token function',
    passed: hasFunctionUpdate,
    message: hasFunctionUpdate ? 'Function update included' : 'Missing function update'
  });
}

// Check validation includes industry
console.log('\n🔍 Validation Content Check:');
const validationPath = path.join(process.cwd(), 'lib/validation/company.ts');
if (fs.existsSync(validationPath)) {
  const validationContent = fs.readFileSync(validationPath, 'utf-8');
  const hasIndustries = validationContent.includes('INDUSTRIES');
  const hasIndustryField = validationContent.includes('industry?:');
  
  results.push({
    check: 'Validation includes INDUSTRIES constant',
    passed: hasIndustries,
    message: hasIndustries ? 'INDUSTRIES defined' : 'Missing INDUSTRIES'
  });
  
  results.push({
    check: 'Validation includes industry field',
    passed: hasIndustryField,
    message: hasIndustryField ? 'Industry field in interface' : 'Missing industry field'
  });
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(60));

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const total = results.length;

console.log(`Total Checks: ${total}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

console.log('\n📋 Detailed Results:');
results.forEach((result, index) => {
  const icon = result.passed ? '✅' : '❌';
  console.log(`${index + 1}. ${icon} ${result.check}`);
  console.log(`   ${result.message}`);
});

if (failed === 0) {
  console.log('\n🎉 All code structure checks passed!');
  console.log('✅ System is ready for testing.');
} else {
  console.log('\n⚠️  Some checks failed. Please review the errors above.');
}
