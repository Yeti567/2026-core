#!/usr/bin/env node

/**
 * Security Dependency Check Script
 * 
 * Automatically checks for vulnerable dependencies and suggests updates
 * with focus on security-critical packages.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Security-critical packages that should always be updated
const SECURITY_CRITICAL_PACKAGES = [
  'jsonwebtoken',
  'bcryptjs',
  'helmet',
  'cors',
  'express',
  'axios',
  'lodash',
  'moment',
  'underscore',
  'request', // deprecated, should be replaced
  'debug',
  'tar',
  'minimist'
];

// Known vulnerable packages and their secure alternatives
const VULNERABLE_ALTERNATIVES = {
  'request': 'axios or node-fetch',
  'debug': 'remove if not needed or use latest',
  'tar': 'tar-fs or tar-stream',
  'minimist': 'yargs-parser or commander'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function log(message) {
  console.log(message);
}

function logInfo(message) {
  colorLog('blue', `[INFO] ${message}`);
}

function logSuccess(message) {
  colorLog('green', `[SUCCESS] ${message}`);
}

function logWarning(message) {
  colorLog('yellow', `[WARNING] ${message}`);
}

function logError(message) {
  colorLog('red', `[ERROR] ${message}`);
}

function logCritical(message) {
  colorLog('red', `[CRITICAL] ${message}`);
}

/**
 * Read package.json
 */
function readPackageJson() {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson;
  } catch (error) {
    logError('Could not read package.json');
    process.exit(1);
  }
}

/**
 * Get installed packages
 */
function getInstalledPackages() {
  try {
    const output = execSync('npm ls --depth=0 --json', { encoding: 'utf8' });
    const data = JSON.parse(output);
    return data.dependencies || {};
  } catch (error) {
    logError('Could not get installed packages');
    return {};
  }
}

/**
 * Get latest version of a package
 */
function getLatestVersion(packageName) {
  try {
    const output = execSync(`npm view ${packageName} version`, { encoding: 'utf8' });
    return output.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Check if package is deprecated
 */
function isDeprecated(packageName) {
  try {
    const output = execSync(`npm view ${packageName} deprecated`, { encoding: 'utf8' });
    return output.trim() !== '';
  } catch (error) {
    return false;
  }
}

/**
 * Run npm audit and parse results
 */
function runNpmAudit() {
  try {
    const output = execSync('npm audit --json', { encoding: 'utf8' });
    return JSON.parse(output);
  } catch (error) {
    // npm audit returns non-zero exit code when vulnerabilities are found
    try {
      return JSON.parse(error.stdout);
    } catch (parseError) {
      logError('Could not parse npm audit results');
      return { vulnerabilities: {}, metadata: { vulnerabilities: {} } };
    }
  }
}

/**
 * Check for security advisories
 */
function checkSecurityAdvisories(packageName, currentVersion) {
  try {
    const output = execSync(`npm audit ${packageName}`, { encoding: 'utf8' });
    return output.includes('vulnerabilities');
  } catch (error) {
    return false;
  }
}

/**
 * Main security check function
 */
function runSecurityCheck() {
  logInfo('🔒 Starting security dependency check...');
  
  const packageJson = readPackageJson();
  const installedPackages = getInstalledPackages();
  const auditResults = runNpmAudit();
  
  let criticalIssues = 0;
  let highIssues = 0;
  let moderateIssues = 0;
  let lowIssues = 0;
  let deprecatedPackages = [];
  let outdatedPackages = [];
  let vulnerablePackages = [];
  
  log('\n📦 Analyzing installed packages...\n');
  
  // Check each installed package
  for (const [packageName, info] of Object.entries(installedPackages)) {
    const currentVersion = info.version || info;
    const latestVersion = getLatestVersion(packageName);
    const deprecated = isDeprecated(packageName);
    const hasAdvisory = checkSecurityAdvisories(packageName, currentVersion);
    
    // Check if it's a security-critical package
    const isSecurityCritical = SECURITY_CRITICAL_PACKAGES.includes(packageName);
    
    // Check for vulnerabilities from npm audit
    const vulnerability = auditResults.vulnerabilities[packageName];
    const severity = vulnerability?.severity;
    
    if (deprecated) {
      deprecatedPackages.push({
        name: packageName,
        currentVersion,
        alternative: VULNERABLE_ALTERNATIVES[packageName] || 'Check npm for alternatives'
      });
      logCritical(`🚨 ${packageName}@${currentVersion} is DEPRECATED`);
      log(`   → Recommended alternative: ${VULNERABLE_ALTERNATIVES[packageName] || 'Check npm for alternatives'}`);
    }
    
    if (hasAdvisory || vulnerability) {
      vulnerablePackages.push({
        name: packageName,
        currentVersion,
        severity: severity || 'unknown',
        advisory: true
      });
      
      if (severity === 'critical') criticalIssues++;
      else if (severity === 'high') highIssues++;
      else if (severity === 'moderate') moderateIssues++;
      else if (severity === 'low') lowIssues++;
      
      logCritical(`🚨 ${packageName}@${currentVersion} has ${severity || 'unknown'} severity vulnerabilities`);
    }
    
    if (latestVersion && currentVersion !== latestVersion) {
      outdatedPackages.push({
        name: packageName,
        currentVersion,
        latestVersion,
        isSecurityCritical
      });
      
      if (isSecurityCritical) {
        logWarning(`⚠️  ${packageName}@${currentVersion} → ${latestVersion} (SECURITY CRITICAL)`);
      } else {
        logInfo(`📦 ${packageName}@${currentVersion} → ${latestVersion}`);
      }
    }
  }
  
  // Summary
  log('\n📊 Security Check Summary:');
  log('═'.repeat(50));
  
  if (criticalIssues > 0) {
    logCritical(`Critical vulnerabilities: ${criticalIssues}`);
  }
  if (highIssues > 0) {
    logError(`High severity vulnerabilities: ${highIssues}`);
  }
  if (moderateIssues > 0) {
    logWarning(`Moderate severity vulnerabilities: ${moderateIssues}`);
  }
  if (lowIssues > 0) {
    logInfo(`Low severity vulnerabilities: ${lowIssues}`);
  }
  
  log(`Deprecated packages: ${deprecatedPackages.length}`);
  log(`Outdated packages: ${outdatedPackages.length}`);
  log(`Vulnerable packages: ${vulnerablePackages.length}`);
  
  // Recommendations
  log('\n🔧 Recommendations:');
  log('═'.repeat(50));
  
  if (criticalIssues > 0 || highIssues > 0) {
    logCritical('🚨 URGENT: Update critical and high severity packages immediately');
    log('   Run: npm audit fix --force');
    log('   Then test thoroughly and fix any breaking changes');
  }
  
  if (deprecatedPackages.length > 0) {
    logCritical('🚨 Replace deprecated packages:');
    deprecatedPackages.forEach(pkg => {
      log(`   • ${pkg.name} → ${pkg.alternative}`);
    });
  }
  
  if (outdatedPackages.length > 0) {
    logWarning('📦 Update outdated packages:');
    const securityCriticalOutdated = outdatedPackages.filter(pkg => pkg.isSecurityCritical);
    if (securityCriticalOutdated.length > 0) {
      logCritical('   Security-critical packages (update these first):');
      securityCriticalOutdated.forEach(pkg => {
        log(`     • ${pkg.name}@${pkg.currentVersion} → ${pkg.latestVersion}`);
      });
    }
    
    const regularOutdated = outdatedPackages.filter(pkg => !pkg.isSecurityCritical);
    if (regularOutdated.length > 0) {
      logInfo('   Other packages:');
      regularOutdated.slice(0, 10).forEach(pkg => {
        log(`     • ${pkg.name}@${pkg.currentVersion} → ${pkg.latestVersion}`);
      });
      if (regularOutdated.length > 10) {
        log(`     ... and ${regularOutdated.length - 10} more`);
      }
    }
  }
  
  // Generate update commands
  log('\n🛠️  Suggested Update Commands:');
  log('═'.repeat(50));
  
  if (criticalIssues > 0 || highIssues > 0) {
    logCritical('Immediate actions:');
    log('npm audit fix --force');
    log('npm install');
  }
  
  if (securityCriticalOutdated.length > 0) {
    logWarning('Update security-critical packages:');
    const updateCommand = securityCriticalOutdated
      .map(pkg => `${pkg.name}@latest`)
      .join(' ');
    log(`npm install ${updateCommand}`);
  }
  
  if (deprecatedPackages.length > 0) {
    logWarning('Replace deprecated packages:');
    deprecatedPackages.forEach(pkg => {
      log(`# Remove: npm uninstall ${pkg.name}`);
      log(`# Install alternative: npm install ${pkg.alternative}`);
    });
  }
  
  // Create report file
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      criticalIssues,
      highIssues,
      moderateIssues,
      lowIssues,
      deprecatedPackages: deprecatedPackages.length,
      outdatedPackages: outdatedPackages.length,
      vulnerablePackages: vulnerablePackages.length
    },
    deprecatedPackages,
    outdatedPackages,
    vulnerablePackages,
    recommendations: {
      immediate: criticalIssues > 0 || highIssues > 0,
      updateSecurityCritical: securityCriticalOutdated.length > 0,
      replaceDeprecated: deprecatedPackages.length > 0
    }
  };
  
  fs.writeFileSync('security-dependency-report.json', JSON.stringify(report, null, 2));
  logSuccess('\n📄 Detailed report saved to: security-dependency-report.json');
  
  // Exit with appropriate code
  if (criticalIssues > 0 || highIssues > 0) {
    logCritical('\n🚨 Critical or high severity vulnerabilities found!');
    process.exit(2);
  } else if (moderateIssues > 0 || deprecatedPackages.length > 0) {
    logWarning('\n⚠️  Moderate issues or deprecated packages found');
    process.exit(1);
  } else {
    logSuccess('\n✅ No critical security issues found');
    process.exit(0);
  }
}

// Run the security check
if (require.main === module) {
  runSecurityCheck();
}

module.exports = {
  runSecurityCheck,
  SECURITY_CRITICAL_PACKAGES,
  VULNERABLE_ALTERNATIVES
};
