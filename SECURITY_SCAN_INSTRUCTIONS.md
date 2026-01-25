# Security Scanning Instructions

## Quick Start

### Option 1: Snyk (Recommended - Requires Authentication)

**Step 1: Authenticate**
```bash
snyk auth
```
This will open a browser for you to sign in or create a free Snyk account.

**Step 2: Run Scan**
```bash
npm run security:scan
```

**Step 3: Generate Report**
```bash
npm run security:report
```

---

### Option 2: npm audit (No Authentication Required)

**Run scan:**
```bash
npm audit
```

**Generate JSON report:**
```bash
npm audit --json > npm-audit-report.json
```

**Fix vulnerabilities automatically (if possible):**
```bash
npm audit fix
```

**Fix vulnerabilities including breaking changes:**
```bash
npm audit fix --force
```

---

## Current Status

### Snyk CLI
- ✅ **Installed:** Version 1.1302.0
- ⚠️ **Status:** Requires authentication
- **Next Step:** Run `snyk auth` to authenticate

### npm audit
- ✅ **Available:** Built into npm
- ✅ **Status:** Ready to use (no authentication needed)
- **Command:** `npm audit`

---

## Comparison

| Feature | Snyk | npm audit |
|---------|------|-----------|
| Authentication | Required | Not required |
| Database | Larger, more comprehensive | npm registry vulnerabilities |
| CI/CD Integration | Excellent | Basic |
| Monitoring | Continuous monitoring | One-time scan |
| Fix Suggestions | Detailed | Basic |
| Free Tier | Yes | Yes (built-in) |

---

## Recommended Workflow

1. **Immediate:** Use `npm audit` for quick scan (no auth needed)
2. **Setup:** Authenticate with Snyk for comprehensive scanning
3. **Ongoing:** Use both tools regularly:
   - `npm audit` - Quick checks before commits
   - `snyk test` - Comprehensive scans before releases

---

## Commands Reference

### Snyk Commands
```bash
# Authenticate (required first time)
snyk auth

# Basic scan
npm run security:scan
# or
snyk test

# Generate JSON report
npm run security:report
# or
snyk test --json > snyk-report.json

# Monitor continuously
npm run security:monitor
# or
snyk monitor

# Scan production dependencies only
snyk test --prod

# Scan with severity filter
snyk test --severity-threshold=high
```

### npm audit Commands
```bash
# Basic scan
npm audit

# JSON report
npm audit --json > npm-audit-report.json

# Fix automatically
npm audit fix

# Fix including breaking changes
npm audit fix --force

# Audit specific package
npm audit <package-name>
```

---

## Next Steps

1. **For immediate scanning (no auth):**
   ```bash
   npm audit
   ```

2. **For comprehensive scanning:**
   ```bash
   snyk auth          # Authenticate first
   npm run security:scan
   ```

3. **Set up continuous monitoring:**
   ```bash
   snyk monitor
   ```

---

*Last updated: $(date)*
