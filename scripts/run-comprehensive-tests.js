#!/usr/bin/env node

/**
 * COMPREHENSIVE TEST RUNNER
 * Orchestrates security tests, E2E tests, and generates detailed reports
 * 
 * Usage:
 *   npm run test:comprehensive
 *   node scripts/run-comprehensive-tests.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  console.log('\n' + '='.repeat(80));
  log(message, 'bright');
  console.log('='.repeat(80) + '\n');
}

function section(message) {
  console.log('\n' + '-'.repeat(80));
  log(message, 'cyan');
  console.log('-'.repeat(80));
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function warning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ ${message}`, 'blue');
}

// Test suite configuration
const testSuites = [
  {
    name: 'Environment Checks',
    command: null, // Custom function
    critical: true
  },
  {
    name: 'Database Connection & Schema',
    command: null, // Custom function
    critical: true
  },
  {
    name: 'Security Penetration Tests',
    command: 'npx tsx security-penetration-tests.spec.ts',
    critical: true
  },
  {
    name: 'End-to-End Company Journey',
    command: 'npx tsx end-to-end-journey-test.spec.ts',
    critical: false
  },
  {
    name: 'Existing Test Suite',
    command: 'npm run test:all',
    critical: false
  }
];

// Test results tracker
const results = {
  timestamp: new Date().toISOString(),
  suites: [],
  passed: 0,
  failed: 0,
  skipped: 0,
  duration: 0
};

/**
 * Environment checks
 */
async function checkEnvironment() {
  section('Checking Environment Configuration');

  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const optionalEnvVars = [
    'NEXT_PUBLIC_APP_URL',
    'ANTHROPIC_API_KEY',
    'RESEND_API_KEY',
    'AUDITSOFT_WEBHOOK_SECRET',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN'
  ];

  let allRequired = true;

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      success(`${envVar} is set`);
    } else {
      error(`${envVar} is MISSING (REQUIRED)`);
      allRequired = false;
    }
  }

  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      info(`${envVar} is set`);
    } else {
      warning(`${envVar} is not set (optional, some features may not work)`);
    }
  }

  if (!allRequired) {
    throw new Error('Missing required environment variables');
  }

  success('All required environment variables are set');
  return true;
}

/**
 * Database connectivity check
 */
async function checkDatabase() {
  section('Checking Database Connection');

  try {
    const { createClient } = require('@supabase/supabase-js');
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test connection by fetching companies
    const { data, error } = await client.from('companies').select('count').limit(1);

    if (error) {
      throw error;
    }

    success('Database connection successful');

    // Check critical tables exist
    const tables = [
      'companies',
      'user_profiles',
      'workers',
      'documents',
      'forms',
      'audit_questions',
      'certifications',
      'equipment_inventory',
      'cor_phases'
    ];

    for (const table of tables) {
      const { error: tableError } = await client.from(table).select('count').limit(1);
      if (tableError) {
        error(`Table '${table}' check failed: ${tableError.message}`);
      } else {
        success(`Table '${table}' exists and is accessible`);
      }
    }

    return true;
  } catch (err) {
    error(`Database check failed: ${err.message}`);
    throw err;
  }
}

/**
 * Run a test suite
 */
async function runTestSuite(suite) {
  const startTime = Date.now();

  try {
    section(`Running: ${suite.name}`);

    let passed = true;
    let output = '';

    // Handle custom checks
    if (!suite.command) {
      if (suite.name === 'Environment Checks') {
        await checkEnvironment();
      } else if (suite.name === 'Database Connection & Schema') {
        await checkDatabase();
      }
    } else {
      // Run command
      try {
        output = execSync(suite.command, {
          encoding: 'utf8',
          stdio: 'pipe',
          env: { ...process.env, FORCE_COLOR: '1' },
          cwd: path.join(__dirname, '..')
        });
        success(`${suite.name} PASSED`);
      } catch (err) {
        error(`${suite.name} FAILED`);
        output = err.stdout + err.stderr;
        passed = false;

        if (suite.critical) {
          throw new Error(`Critical test suite failed: ${suite.name}`);
        }
      }
    }

    const duration = Date.now() - startTime;

    results.suites.push({
      name: suite.name,
      passed,
      duration,
      output: output.substring(0, 10000) // Limit output size
    });

    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }

    return passed;
  } catch (err) {
    const duration = Date.now() - startTime;

    results.suites.push({
      name: suite.name,
      passed: false,
      duration,
      error: err.message
    });

    results.failed++;

    if (suite.critical) {
      throw err;
    }

    return false;
  }
}

/**
 * Generate test report
 */
function generateReport() {
  section('Generating Test Report');

  const totalDuration = results.suites.reduce((sum, s) => sum + s.duration, 0);
  results.duration = totalDuration;

  // Console summary
  header('TEST SUMMARY');
  console.log(`Total Suites: ${results.suites.length}`);
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, 'red');
  console.log(`Duration: ${(totalDuration / 1000).toFixed(2)}s\n`);

  // Suite breakdown
  console.log('Suite Results:');
  results.suites.forEach(suite => {
    const status = suite.passed ? '✓' : '✗';
    const color = suite.passed ? 'green' : 'red';
    log(`  ${status} ${suite.name} (${(suite.duration / 1000).toFixed(2)}s)`, color);
  });

  // Save JSON report
  const reportPath = path.join(__dirname, '..', 'test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  success(`\nJSON report saved to: ${reportPath}`);

  // Save HTML report
  const htmlReport = generateHtmlReport();
  const htmlPath = path.join(__dirname, '..', 'test-results.html');
  fs.writeFileSync(htmlPath, htmlReport);
  success(`HTML report saved to: ${htmlPath}`);

  // Save Markdown report
  const mdReport = generateMarkdownReport();
  const mdPath = path.join(__dirname, '..', 'TEST_RESULTS.md');
  fs.writeFileSync(mdPath, mdReport);
  success(`Markdown report saved to: ${mdPath}`);
}

/**
 * Generate HTML report
 */
function generateHtmlReport() {
  const passRate = ((results.passed / results.suites.length) * 100).toFixed(1);

  return `
<!DOCTYPE html>
<html>
<head>
  <title>COR Pathways - Test Results</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2rem; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #0066cc; padding-bottom: 1rem; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 2rem 0; }
    .metric { background: #f8f9fa; padding: 1.5rem; border-radius: 6px; text-align: center; }
    .metric h3 { margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem; font-weight: 500; }
    .metric .value { font-size: 2rem; font-weight: 700; }
    .passed { color: #28a745; }
    .failed { color: #dc3545; }
    .suite { border: 1px solid #dee2e6; border-radius: 6px; padding: 1rem; margin: 1rem 0; }
    .suite-header { display: flex; justify-content: space-between; align-items: center; }
    .suite-name { font-weight: 600; font-size: 1.1rem; }
    .status-badge { padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.85rem; font-weight: 600; }
    .status-passed { background: #d4edda; color: #155724; }
    .status-failed { background: #f8d7da; color: #721c24; }
    .timestamp { color: #666; font-size: 0.9rem; margin-top: 2rem; }
    pre { background: #f8f9fa; padding: 1rem; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 COR Pathways - Comprehensive Test Results</h1>
    
    <div class="summary">
      <div class="metric">
        <h3>Total Suites</h3>
        <div class="value">${results.suites.length}</div>
      </div>
      <div class="metric">
        <h3>Passed</h3>
        <div class="value passed">${results.passed}</div>
      </div>
      <div class="metric">
        <h3>Failed</h3>
        <div class="value failed">${results.failed}</div>
      </div>
      <div class="metric">
        <h3>Pass Rate</h3>
        <div class="value">${passRate}%</div>
      </div>
    </div>

    <h2>Test Suite Details</h2>
    ${results.suites.map(suite => `
      <div class="suite">
        <div class="suite-header">
          <span class="suite-name">${suite.name}</span>
          <span class="status-badge ${suite.passed ? 'status-passed' : 'status-failed'}">
            ${suite.passed ? '✓ PASSED' : '✗ FAILED'}
          </span>
        </div>
        <div style="margin-top: 0.5rem; color: #666; font-size: 0.9rem;">
          Duration: ${(suite.duration / 1000).toFixed(2)}s
        </div>
        ${suite.error ? `<div style="margin-top: 1rem;"><strong>Error:</strong><pre>${suite.error}</pre></div>` : ''}
      </div>
    `).join('')}

    <div class="timestamp">
      <strong>Generated:</strong> ${new Date(results.timestamp).toLocaleString()}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate Markdown report
 */
function generateMarkdownReport() {
  const passRate = ((results.passed / results.suites.length) * 100).toFixed(1);

  return `# 🧪 COR Pathways - Test Results

**Generated:** ${new Date(results.timestamp).toLocaleString()}

## Summary

| Metric | Value |
|--------|-------|
| Total Suites | ${results.suites.length} |
| ✓ Passed | ${results.passed} |
| ✗ Failed | ${results.failed} |
| Pass Rate | ${passRate}% |
| Total Duration | ${(results.duration / 1000).toFixed(2)}s |

## Suite Results

${results.suites.map(suite => `
### ${suite.passed ? '✓' : '✗'} ${suite.name}

- **Status:** ${suite.passed ? 'PASSED' : 'FAILED'}
- **Duration:** ${(suite.duration / 1000).toFixed(2)}s
${suite.error ? `- **Error:** ${suite.error}` : ''}
`).join('\n')}

---

## Next Steps

${results.failed > 0 ? `
⚠️ **${results.failed} test suite(s) failed.** Review the failures above and address issues before production deployment.

### Failed Suites:
${results.suites.filter(s => !s.passed).map(s => `- ${s.name}`).join('\n')}
` : `
✅ **All tests passed!** The application is ready for production deployment.

### Pre-Deployment Checklist:
- [ ] Review manual testing checklist (MANUAL_TESTING_CHECKLIST.md)
- [ ] Verify environment variables in production
- [ ] Run database migrations in production
- [ ] Test with real user data
- [ ] Enable monitoring and alerts
- [ ] Prepare rollback plan
`}
  `.trim();
}

/**
 * Main test runner
 */
async function main() {
  const startTime = Date.now();

  header('COR PATHWAYS - COMPREHENSIVE TEST SUITE');
  info(`Starting tests at ${new Date().toLocaleString()}`);

  try {
    // Run all test suites
    for (const suite of testSuites) {
      await runTestSuite(suite);
    }

    // Generate reports
    generateReport();

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    if (results.failed === 0) {
      header('🎉 ALL TESTS PASSED!');
      success(`Test suite completed in ${totalTime}s`);
      process.exit(0);
    } else {
      header('⚠️  SOME TESTS FAILED');
      error(`${results.failed} suite(s) failed`);
      error(`Review test results for details`);
      process.exit(1);
    }
  } catch (err) {
    error(`\n❌ CRITICAL ERROR: ${err.message}`);
    error('Test suite aborted');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
