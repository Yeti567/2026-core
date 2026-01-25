# Automated Security Testing Setup

## Overview

GitHub Actions workflows have been configured for automated security testing on every push, pull request, and weekly schedule.

---

## Workflows Created

### 1. Security Audit Workflow (`.github/workflows/security.yml`)

**Triggers:**
- ✅ Push to `main` or `develop` branches
- ✅ Pull requests to `main` or `develop`
- ✅ Weekly schedule (Monday at midnight UTC)
- ✅ Manual trigger (workflow_dispatch)

**Checks:**
- ✅ npm audit (moderate+ severity)
- ✅ Snyk security scan (if configured)
- ✅ ESLint security scan

**Outputs:**
- JSON reports as artifacts
- PR comments with summary
- GitHub Actions summary

---

## Setup Steps

### Step 1: Add Snyk Token (Optional but Recommended)

1. **Get your Snyk API token:**
   - Go to https://app.snyk.io/account
   - Navigate to **General** → **Auth Token**
   - Copy your token

2. **Add to GitHub Secrets:**
   - Repository → **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `SNYK_TOKEN`
   - Value: Paste your Snyk token
   - Click **Add secret**

### Step 2: Verify Workflow

The workflow is already configured at:
```
.github/workflows/security.yml
```

**To test:**
1. Push a commit to `main` or `develop`
2. Create a pull request
3. Check **Actions** tab in GitHub
4. View workflow run results

---

## What Gets Checked

### ✅ npm audit

- Scans all dependencies for known vulnerabilities
- Reports moderate+ severity issues
- Generates JSON report
- Fails build if critical/high vulnerabilities found

### ✅ Snyk Security Scan

- Deep dependency scanning
- Checks for known CVEs
- Provides fix recommendations
- Generates detailed JSON report

### ✅ ESLint Security Scan

- Static code analysis
- Detects security anti-patterns
- Checks for unsafe code practices
- Uses `eslint-plugin-security`

---

## Workflow Features

### Automatic Scanning

- **On Push:** Scans code when pushed to main/develop
- **On PR:** Scans pull requests and comments results
- **Weekly:** Scheduled scan every Monday
- **Manual:** Can be triggered from Actions tab

### Reports & Artifacts

- **npm audit report:** `npm-audit-report.json` (30-day retention)
- **Snyk report:** `snyk-report.json` (30-day retention)
- **PR Comments:** Automatic summary comments on PRs
- **GitHub Summary:** Step summary with results

### Failure Handling

- **Continue on error:** Workflow doesn't fail if one check fails
- **Artifacts preserved:** Reports saved even if checks fail
- **Graceful degradation:** Snyk skipped if token not configured

---

## npm Scripts Added

### Local Security Audits

```bash
# Run security audit (npm audit + ESLint)
npm run audit:security

# Full security audit (npm audit + ESLint + Snyk)
npm run audit:security:full
```

---

## Workflow Output Example

### PR Comment

```
## 🔒 Security Audit Results

### ✅ npm audit
No vulnerabilities found!

### ✅ Snyk Security Scan
No vulnerabilities found!

---
*Full reports available in workflow artifacts*
```

### GitHub Actions Summary

```
## 🔒 Security Audit Summary

### ✅ npm audit
- No vulnerabilities found

### Snyk Security Scan
- Report available in artifacts

📄 Full reports available in workflow artifacts
```

---

## Configuration

### Severity Thresholds

**npm audit:**
- `--audit-level=moderate` (moderate+ severity)

**Snyk:**
- `--severity-threshold=high` (high+ severity)

**To change thresholds:**

Edit `.github/workflows/security.yml`:

```yaml
# npm audit - change audit level
run: npm audit --audit-level=high

# Snyk - change severity threshold
args: --severity-threshold=critical
```

### Schedule

**Current:** Weekly on Monday at midnight UTC

**To change:**

Edit `.github/workflows/security.yml`:

```yaml
schedule:
  - cron: '0 0 * * 1'  # Monday at midnight UTC
  # Format: minute hour day month weekday
  # Examples:
  # '0 0 * * 0'  # Sunday at midnight
  # '0 12 * * *' # Daily at noon
  # '0 0 1 * *'  # First day of month
```

---

## Troubleshooting

### npm audit Fails

**Issue:** Workflow fails on npm audit

**Solution:**
- Review vulnerabilities in `npm-audit-report.json`
- Fix vulnerabilities: `npm audit fix`
- Update vulnerable packages
- Or adjust `--audit-level` threshold

### Snyk Not Running

**Issue:** Snyk scan skipped

**Solution:**
1. Verify `SNYK_TOKEN` secret is set in GitHub
2. Check workflow logs for errors
3. Verify token is valid: `snyk auth` locally

### ESLint Security Errors

**Issue:** ESLint security scan finds issues

**Solution:**
- Review errors in workflow logs
- Fix security issues in code
- Or adjust ESLint rules in `eslint.config.mjs`

---

## Integration with Existing Workflows

### Snyk Workflow

The existing `.github/workflows/snyk-security-scan.yml` provides:
- Detailed Snyk scanning
- PR comments with vulnerability details
- Source map uploads

The new `.github/workflows/security.yml` provides:
- Comprehensive security audit (npm + Snyk + ESLint)
- Weekly scheduled scans
- Combined reporting

**Both workflows can run in parallel** - they complement each other.

---

## Best Practices

1. **Review Weekly Reports**
   - Check Monday security scan results
   - Address vulnerabilities promptly

2. **Fix Before Merging**
   - Review PR security comments
   - Fix critical/high vulnerabilities before merging

3. **Monitor Artifacts**
   - Download and review JSON reports
   - Track vulnerability trends over time

4. **Update Dependencies**
   - Run `npm audit fix` regularly
   - Update packages monthly
   - Review changelogs for security fixes

---

## Next Steps

1. ✅ **Add SNYK_TOKEN** to GitHub Secrets (if not done)
2. ✅ **Test workflow** by pushing a commit
3. ✅ **Review first scan** results
4. ✅ **Set up alerts** (optional) for critical vulnerabilities
5. ✅ **Schedule reviews** of weekly security reports

---

## Quick Reference

### Workflow Files

- **Security Audit:** `.github/workflows/security.yml`
- **Snyk Scan:** `.github/workflows/snyk-security-scan.yml`

### Local Commands

```bash
# Run security audit locally
npm run audit:security

# Full security audit
npm run audit:security:full

# npm audit only
npm audit --audit-level=moderate

# ESLint security only
npm run lint:security
```

### GitHub Actions

- **View runs:** Repository → **Actions** tab
- **Download reports:** Click workflow run → **Artifacts**
- **Manual trigger:** Actions → **Security Audit** → **Run workflow**

---

*Setup Date: January 20, 2026*  
*Status: ✅ Complete - Ready for Use*
