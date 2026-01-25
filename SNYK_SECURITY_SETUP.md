# Snyk Security Vulnerability Scanning Setup

## Status

**Snyk CLI Installed:** ✅ Version 1.1302.0
**Authentication:** ⚠️ **REQUIRED** - User must authenticate manually
**Status:** ⚠️ **AWAITING AUTHENTICATION**

---

## Installation Complete

Snyk CLI has been installed globally:
```bash
npm install -g snyk
```

**Version:** 1.1302.0

---

## Authentication Required

Snyk requires authentication to run vulnerability scans. You have two options:

### Option 1: Authenticate with Snyk Account (Recommended)

1. **Run authentication command:**
   ```bash
   snyk auth
   ```

2. **Follow the prompts:**
   - Snyk will open a browser window
   - Sign in or create a free Snyk account
   - Authorize the CLI access
   - Return to the terminal

3. **Verify authentication:**
   ```bash
   snyk auth
   ```

### Option 2: Use API Token

1. **Get API token from Snyk:**
   - Go to https://app.snyk.io/account
   - Navigate to "General" → "Auth Token"
   - Copy your API token

2. **Set token:**
   ```bash
   snyk config set api=<your-token>
   ```

---

## Running Vulnerability Scans

### Basic Scan

```bash
# Test for vulnerabilities
snyk test
```

### Detailed JSON Report

```bash
# Generate JSON report
snyk test --json > snyk-report.json

# View report
cat snyk-report.json | jq
```

### Scan Specific Files/Directories

```bash
# Scan only production dependencies
snyk test --prod

# Scan with severity filter
snyk test --severity-threshold=high

# Scan and show only vulnerabilities
snyk test --json | jq '.vulnerabilities'
```

---

## Integration Options

### 1. CI/CD Integration

Add to your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Run Snyk security scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    args: --severity-threshold=high
```

### 2. Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
snyk test --severity-threshold=high
```

### 3. Package.json Script

Add to `package.json`:

```json
{
  "scripts": {
    "security:scan": "snyk test",
    "security:monitor": "snyk monitor"
  }
}
```

---

## Snyk Commands Reference

### Testing

- `snyk test` - Test for vulnerabilities
- `snyk test --json` - Output JSON format
- `snyk test --severity-threshold=high` - Filter by severity
- `snyk test --prod` - Test only production dependencies

### Monitoring

- `snyk monitor` - Monitor project continuously
- `snyk monitor --all-projects` - Monitor all projects

### Fixing

- `snyk wizard` - Interactive fix wizard
- `snyk fix` - Automatically fix vulnerabilities (if available)

### Configuration

- `snyk config get <key>` - Get configuration
- `snyk config set <key>=<value>` - Set configuration
- `snyk ignore` - Ignore specific vulnerabilities

---

## Expected Output

After authentication, running `snyk test` will show:

```
Testing cor-2026...

Tested 599 dependencies for known vulnerabilities, found 0 vulnerabilities
```

Or if vulnerabilities are found:

```
✗ High severity vulnerability found in package-name@version
  Description: Vulnerability description
  Info: https://snyk.io/vuln/SNYK-JS-PACKAGENAME-123456
  Introduced through: parent-package@version
  Fixed in: package-name@fixed-version
```

---

## Next Steps

1. **Authenticate with Snyk:**
   ```bash
   snyk auth
   ```

2. **Run initial scan:**
   ```bash
   snyk test
   ```

3. **Generate detailed report:**
   ```bash
   snyk test --json > snyk-report.json
   ```

4. **Set up continuous monitoring:**
   ```bash
   snyk monitor
   ```

5. **Review and fix vulnerabilities:**
   - Use `snyk wizard` for interactive fixing
   - Or manually update vulnerable packages

---

## Troubleshooting

### Authentication Errors

**Error:** `Authentication error (SNYK-0005)`

**Solution:**
```bash
snyk auth
```

### No Vulnerabilities Found

If `snyk test` shows no vulnerabilities, this is good! However:
- Ensure you're scanning production dependencies: `snyk test --prod`
- Check that all dependencies are in `package.json`
- Verify Snyk database is up to date

### False Positives

If you need to ignore a vulnerability:

```bash
snyk ignore --id=<vulnerability-id> --reason="<reason>"
```

---

## Security Best Practices

1. **Run scans regularly:**
   - Before each release
   - After dependency updates
   - In CI/CD pipeline

2. **Monitor continuously:**
   - Use `snyk monitor` for ongoing monitoring
   - Set up alerts in Snyk dashboard

3. **Fix vulnerabilities promptly:**
   - Prioritize high/critical severity
   - Test fixes before deploying
   - Update dependencies regularly

4. **Review reports:**
   - Check JSON reports for detailed information
   - Review vulnerability descriptions
   - Verify fix recommendations

---

*Setup completed: $(date)*
*Snyk CLI version: 1.1302.0*
*Status: ⚠️ Awaiting authentication*
