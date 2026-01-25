# Snyk GitHub Integration Setup Guide

## Overview

This guide will help you set up Snyk for automatic security scanning in your GitHub repository.

---

## Step 1: Authenticate Snyk CLI (One-Time Setup)

### Option A: Browser Authentication (Recommended)

1. **Run the authentication command:**
   ```bash
   snyk auth
   ```

2. **Complete authentication:**
   - A browser window will open (or copy the URL from terminal)
   - Sign in to Snyk or create a free account at https://app.snyk.io
   - Authorize the CLI access
   - Return to the terminal

3. **Verify authentication:**
   ```bash
   snyk test
   ```
   Should run without authentication errors.

### Option B: API Token Authentication

1. **Get your Snyk API token:**
   - Go to https://app.snyk.io/account
   - Navigate to **General** → **Auth Token**
   - Click **Show Token** and copy it

2. **Set the token:**
   ```bash
   snyk config set api=<your-token-here>
   ```

3. **Verify:**
   ```bash
   snyk test
   ```

---

## Step 2: Get Snyk Token for GitHub Actions

1. **Get your Snyk API token:**
   - Go to https://app.snyk.io/account
   - Navigate to **General** → **Auth Token**
   - Click **Show Token** and copy it
   - **Keep this token secure** - you'll add it to GitHub Secrets

---

## Step 3: Add Snyk Token to GitHub Secrets

1. **Go to your GitHub repository:**
   - Navigate to: `Settings` → `Secrets and variables` → `Actions`

2. **Add new secret:**
   - Click **New repository secret**
   - Name: `SNYK_TOKEN`
   - Value: Paste your Snyk API token
   - Click **Add secret**

---

## Step 4: Verify GitHub Actions Workflow

The workflow file is already created at:
```
.github/workflows/snyk-security-scan.yml
```

### What it does:

- ✅ Runs on every push to `main` and `develop` branches
- ✅ Runs on pull requests
- ✅ Runs daily at 2 AM UTC (scheduled scan)
- ✅ Can be manually triggered
- ✅ Scans for high-severity vulnerabilities
- ✅ Uploads reports as artifacts
- ✅ Comments on PRs with scan results

### Test the workflow:

1. **Push a commit** to trigger the workflow
2. **Check Actions tab** in GitHub
3. **View workflow run** to see results

---

## Step 5: Run Initial Scan Locally

After authentication, run:

```bash
# Basic scan
npm run security:scan

# Detailed JSON report
npm run security:report

# Monitor project (creates project in Snyk dashboard)
npm run security:monitor
```

---

## Step 6: View Results

### In GitHub:

1. **Actions Tab:**
   - View workflow runs
   - Download `snyk-security-report` artifact
   - Check PR comments for scan results

2. **Security Tab:**
   - Go to repository → **Security** tab
   - View vulnerability alerts (if any)

### In Snyk Dashboard:

1. **Go to:** https://app.snyk.io
2. **View projects:**
   - After running `snyk monitor`, your project appears
   - View vulnerability details
   - Get fix recommendations

---

## Workflow Features

### Automatic Scanning

- **On Push:** Scans code when pushed to main/develop
- **On PR:** Scans pull requests and comments results
- **Daily:** Scheduled scan at 2 AM UTC
- **Manual:** Can be triggered from Actions tab

### Severity Threshold

Currently set to **high** severity only. To change:

Edit `.github/workflows/snyk-security-scan.yml`:

```yaml
args: --severity-threshold=medium  # or 'low' or 'critical'
```

### Report Artifacts

- JSON reports saved for 30 days
- Downloadable from Actions tab
- Includes vulnerability details and fix recommendations

---

## Troubleshooting

### GitHub Actions Fails: "SNYK_TOKEN not found"

**Solution:**
1. Go to repository → Settings → Secrets
2. Ensure `SNYK_TOKEN` secret exists
3. Verify token is valid (test with `snyk test` locally)

### Authentication Timeout

**Solution:**
- Use API token method instead of browser auth
- Set token: `snyk config set api=<token>`

### No Vulnerabilities Found

**This is good!** But verify:
- Dependencies are in `package.json`
- Running `snyk test --prod` to scan production deps
- Check Snyk dashboard for project status

### Workflow Not Running

**Check:**
1. Workflow file exists: `.github/workflows/snyk-security-scan.yml`
2. File is valid YAML (check syntax)
3. Branch name matches (`main` or `develop`)
4. Workflows are enabled in repository settings

---

## Advanced Configuration

### Custom Severity Threshold

Edit workflow file:

```yaml
args: --severity-threshold=critical  # Only critical vulnerabilities
```

### Scan Only Production Dependencies

```yaml
args: --severity-threshold=high --prod
```

### Fail Build on Vulnerabilities

Remove `continue-on-error: true` from workflow steps.

### Multiple Package Managers

If using multiple package managers (npm, yarn, pnpm):

```yaml
- name: Run Snyk for npm
  uses: snyk/actions/npm@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

- name: Run Snyk for yarn
  uses: snyk/actions/yarn@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

## Security Best Practices

1. **Regular Scans:**
   - Daily scheduled scans (already configured)
   - Pre-commit hooks (optional)
   - Before releases

2. **Fix Promptly:**
   - Review high/critical vulnerabilities immediately
   - Use `snyk wizard` for interactive fixes
   - Test fixes before deploying

3. **Monitor Continuously:**
   - Use `snyk monitor` to track project
   - Set up email alerts in Snyk dashboard
   - Review reports regularly

4. **Keep Dependencies Updated:**
   - Run `npm audit` regularly
   - Update dependencies monthly
   - Use `npm outdated` to check versions

---

## Next Steps

1. ✅ **Authenticate Snyk CLI** (if not done)
   ```bash
   snyk auth
   ```

2. ✅ **Add SNYK_TOKEN to GitHub Secrets**
   - Repository → Settings → Secrets → Actions
   - Add `SNYK_TOKEN` with your API token

3. ✅ **Run initial scan**
   ```bash
   npm run security:scan
   ```

4. ✅ **Monitor project**
   ```bash
   npm run security:monitor
   ```

5. ✅ **Push to GitHub** to trigger workflow

6. ✅ **Review results** in GitHub Actions and Snyk dashboard

---

## Quick Reference

### Local Commands

```bash
# Authenticate (one-time)
snyk auth

# Run scan
npm run security:scan

# Generate report
npm run security:report

# Monitor project
npm run security:monitor
```

### GitHub Actions

- **Workflow:** `.github/workflows/snyk-security-scan.yml`
- **Secret:** `SNYK_TOKEN` (add in repository settings)
- **Triggers:** Push, PR, Daily schedule, Manual

### Snyk Dashboard

- **URL:** https://app.snyk.io
- **Projects:** View after running `snyk monitor`
- **Settings:** https://app.snyk.io/account

---

*Setup Guide Created: January 20, 2026*  
*Status: ✅ Ready for Setup*
