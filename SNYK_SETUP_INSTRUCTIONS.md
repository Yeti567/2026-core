# Quick Start: Snyk Authentication & GitHub Setup

## 🚀 Quick Setup (5 minutes)

### Step 1: Authenticate Snyk CLI

**Option A: Browser (Easiest)**
```bash
snyk auth
```
- Browser opens automatically
- Sign in or create free account
- Authorize CLI access
- Done!

**Option B: API Token (If browser doesn't work)**
```bash
# Get token from: https://app.snyk.io/account → Auth Token
snyk config set api=<your-token-here>
```

### Step 2: Test Authentication

```bash
npm run security:scan
```

Should run without errors. If you see authentication errors, repeat Step 1.

---

### Step 3: Add Token to GitHub Secrets

1. **Get your Snyk API token:**
   - Go to: https://app.snyk.io/account
   - Click **General** → **Auth Token** → **Show Token**
   - Copy the token

2. **Add to GitHub:**
   - Go to your repository on GitHub
   - Click **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `SNYK_TOKEN`
   - Value: Paste your token
   - Click **Add secret**

---

### Step 4: Verify GitHub Actions

The workflow is already configured at:
```
.github/workflows/snyk-security-scan.yml
```

**To test:**
1. Push any commit to `main` or `develop` branch
2. Go to **Actions** tab in GitHub
3. Check workflow runs successfully

---

## 📋 What Happens Next

### Automatic Scans

✅ **On every push** to main/develop  
✅ **On every pull request**  
✅ **Daily at 2 AM UTC**  
✅ **Manual trigger** from Actions tab

### Reports

- **PR Comments:** Scan results posted automatically
- **Artifacts:** JSON reports saved for 30 days
- **Snyk Dashboard:** View detailed results at https://app.snyk.io

---

## 🔧 Commands Reference

```bash
# Authenticate (one-time)
snyk auth

# Run scan locally
npm run security:scan

# Generate detailed report
npm run security:report

# Monitor project (creates project in Snyk dashboard)
npm run security:monitor
```

---

## ❓ Troubleshooting

### "Authentication failed (timeout)"
- Use API token method instead: `snyk config set api=<token>`

### "SNYK_TOKEN not found" in GitHub Actions
- Add `SNYK_TOKEN` secret in repository settings

### No vulnerabilities found
- This is good! Verify with: `snyk test --prod`

---

## 📚 Full Documentation

- **GitHub Setup:** See `SNYK_GITHUB_SETUP.md`
- **Snyk Setup:** See `SNYK_SECURITY_SETUP.md`
- **Workflow File:** `.github/workflows/snyk-security-scan.yml`

---

*Ready to start? Run `snyk auth` now!*
