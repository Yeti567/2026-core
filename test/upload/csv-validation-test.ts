/**
 * CSV Validation Test
 * 
 * Tests the CSV parsing and validation logic with test-employees.csv
 * 
 * Run with: npx tsx test/upload/csv-validation-test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

// Import validation functions
import {
  validateCSV,
  validateHeaders,
  isValidEmail,
  isValidPhone,
  isValidHireDate,
  isValidRole,
  type CSVRow,
} from '../../lib/validation/csv';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function log(test: string, passed: boolean, details?: string) {
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} ${test}`);
  if (details) {
    console.log(`     └─ ${details}`);
  }
  results.push({ name: test, passed, details });
}

async function runTests() {
  console.log('🧪 Testing CSV Validation...\n');

  // =========================================================================
  // TEST 1: Email Validation
  // =========================================================================
  console.log('TEST 1: Email Validation');
  
  log('Valid email accepted', isValidEmail('john.smith@testco.com'));
  log('Valid email with subdomain', isValidEmail('user@mail.company.com'));
  log('Invalid email rejected (no @)', !isValidEmail('not-an-email'));
  log('Invalid email rejected (no domain)', !isValidEmail('user@'));
  log('Invalid email rejected (spaces)', !isValidEmail('user @test.com'));
  log('Empty email rejected', !isValidEmail(''));

  // =========================================================================
  // TEST 2: Phone Validation
  // =========================================================================
  console.log('\nTEST 2: Phone Validation');
  
  log('Format (xxx) xxx-xxxx accepted', isValidPhone('(613) 555-1001'));
  log('Format xxx-xxx-xxxx accepted', isValidPhone('613-555-1001'));
  log('Format xxxxxxxxxx accepted', isValidPhone('6135551001'));
  log('Empty phone accepted (optional)', isValidPhone(''));
  log('Invalid phone rejected (too short)', !isValidPhone('555-1234'));
  log('Invalid phone rejected (too long)', !isValidPhone('16135551001'));

  // =========================================================================
  // TEST 3: Hire Date Validation
  // =========================================================================
  console.log('\nTEST 3: Hire Date Validation');
  
  log('Valid date accepted', isValidHireDate('2024-01-15'));
  log('Empty date accepted (optional)', isValidHireDate(''));
  log('Invalid format rejected', !isValidHireDate('01/15/2024'));
  log('Invalid format rejected (no dashes)', !isValidHireDate('20240115'));
  log('Future date rejected', !isValidHireDate('2099-12-31'));

  // =========================================================================
  // TEST 4: Role Validation
  // =========================================================================
  console.log('\nTEST 4: Role Validation');
  
  log('admin accepted', isValidRole('admin'));
  log('internal_auditor accepted', isValidRole('internal_auditor'));
  log('supervisor accepted', isValidRole('supervisor'));
  log('worker accepted', isValidRole('worker'));
  log('Invalid role rejected', !isValidRole('invalid_role'));
  log('Empty role rejected', !isValidRole(''));
  log('Case insensitive', isValidRole('WORKER'));

  // =========================================================================
  // TEST 5: Header Validation
  // =========================================================================
  console.log('\nTEST 5: Header Validation');
  
  const validHeaders = ['first_name', 'last_name', 'email', 'position', 'role', 'phone', 'hire_date'];
  const missingHeaders = ['first_name', 'last_name', 'email'];
  
  log('Valid headers pass', validateHeaders(validHeaders).length === 0);
  log('Missing required headers detected', validateHeaders(missingHeaders).length > 0);
  log('Missing position detected', validateHeaders(['first_name', 'last_name', 'email', 'role']).some(e => e.includes('position')));

  // =========================================================================
  // TEST 6: Parse Test CSV File
  // =========================================================================
  console.log('\nTEST 6: Parse Test CSV File');
  
  const csvPath = path.join(__dirname, '../data/test-employees.csv');
  
  let csvContent: string;
  try {
    csvContent = fs.readFileSync(csvPath, 'utf-8');
    log('CSV file loaded', true);
  } catch (err) {
    log('CSV file loaded', false, `File not found: ${csvPath}`);
    printSummary();
    return;
  }

  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.toLowerCase().trim(),
  });

  log('CSV parsed successfully', parseResult.errors.length === 0);
  log('Correct row count', parseResult.data.length === 6, `Found ${parseResult.data.length} rows`);

  // =========================================================================
  // TEST 7: Full CSV Validation
  // =========================================================================
  console.log('\nTEST 7: Full CSV Validation');
  
  const validation = validateCSV(parseResult.data as CSVRow[], []);

  log('Total rows detected', validation.total === 6, `Total: ${validation.total}`);
  log('Valid rows count', validation.valid === 4, `Valid: ${validation.valid}`);
  log('Invalid rows count', validation.invalid === 2, `Invalid: ${validation.invalid}`);

  // =========================================================================
  // TEST 8: Specific Row Validation
  // =========================================================================
  console.log('\nTEST 8: Specific Row Validation');

  // Find the O'Brien row (special character handling)
  const obrienRow = validation.rows.find(r => r.data.last_name === "O'Brien");
  log("Special characters handled (O'Brien)", obrienRow?.isValid === true);

  // Find invalid rows
  const invalidEmailRow = validation.rows.find(r => r.data.email === 'not-an-email');
  log('Invalid email detected', invalidEmailRow?.isValid === false);
  log('Invalid email error message', 
    invalidEmailRow?.errors.some(e => e.field === 'email') === true,
    invalidEmailRow?.errors.find(e => e.field === 'email')?.message
  );

  const invalidRoleRow = validation.rows.find(r => r.data.role === 'invalid_role');
  log('Invalid role detected', 
    invalidRoleRow?.errors.some(e => e.field === 'role') === true
  );

  const missingNameRow = validation.rows.find(r => !r.data.first_name && r.data.last_name === 'MissingFirst');
  log('Missing first name detected', 
    missingNameRow?.errors.some(e => e.field === 'first_name') === true
  );

  // =========================================================================
  // TEST 9: Duplicate Detection
  // =========================================================================
  console.log('\nTEST 9: Duplicate Detection');

  // Test with existing emails
  const existingEmails = ['john.smith@testco.com'];
  const validationWithExisting = validateCSV(parseResult.data as CSVRow[], existingEmails);

  const duplicateRow = validationWithExisting.rows.find(r => r.data.email === 'john.smith@testco.com');
  log('Existing email detected as duplicate', 
    duplicateRow?.errors.some(e => e.message.includes('exists')) === true
  );

  // Test CSV internal duplicates
  const duplicateCSV: CSVRow[] = [
    { first_name: 'John', last_name: 'Doe', email: 'same@test.com', position: 'Worker', role: 'worker' },
    { first_name: 'Jane', last_name: 'Doe', email: 'same@test.com', position: 'Worker', role: 'worker' },
  ];
  const duplicateValidation = validateCSV(duplicateCSV, []);
  const secondDuplicate = duplicateValidation.rows[1];
  log('CSV internal duplicate detected', 
    secondDuplicate?.errors.some(e => e.message.includes('Duplicate')) === true
  );

  // Print summary
  printSummary();
}

function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\n  Total:  ${total}`);
  console.log(`  Passed: ${passed} ✅`);
  console.log(`  Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`\n  Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n  Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`    ❌ ${r.name}`);
      if (r.details) console.log(`       └─ ${r.details}`);
    });
  }

  console.log('\n🎉 CSV validation tests complete!\n');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests();
