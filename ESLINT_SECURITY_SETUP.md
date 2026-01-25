# ESLint Security Plugin Setup

## Status

**Plugin Installed:** ✅ `eslint-plugin-security` v3.0.1
**ESLint Installed:** ✅ ESLint v8.57.1
**Configuration:** ⚠️ **PENDING** - Compatibility issue with Next.js ESLint config

---

## Issue

There's a compatibility issue between `eslint-plugin-security` and Next.js's ESLint configuration that causes a circular reference error. This is a known issue with some ESLint plugin configurations.

---

## Workaround: Manual Security Rules

Since the plugin's recommended config has compatibility issues, we can add security rules manually. Here's the recommended configuration:

### Option 1: Add Security Rules Manually (Recommended)

Update `.eslintrc.json`:

```json
{
  "extends": ["next/core-web-vitals"],
  "plugins": ["security"],
  "rules": {
    "security/detect-object-injection": "warn",
    "security/detect-non-literal-fs-filename": "warn",
    "security/detect-non-literal-regexp": "warn",
    "security/detect-non-literal-require": "warn",
    "security/detect-possible-timing-attacks": "warn",
    "security/detect-eval-with-expression": "error",
    "security/detect-unsafe-regex": "error",
    "security/detect-buffer-noassert": "warn",
    "security/detect-child-process": "warn",
    "security/detect-disable-mustache-escape": "warn",
    "security/detect-new-buffer": "warn"
  }
}
```

### Option 2: Use ESLint Override for Specific Files

```json
{
  "extends": ["next/core-web-vitals"],
  "overrides": [
    {
      "files": ["**/*.ts", "**/*.tsx"],
      "plugins": ["security"],
      "rules": {
        "security/detect-eval-with-expression": "error",
        "security/detect-unsafe-regex": "error",
        "security/detect-non-literal-regexp": "warn"
      }
    }
  ]
}
```

---

## Security Rules Reference

### Critical Rules (Error Level)

- `security/detect-eval-with-expression` - Detects use of `eval()` with expressions
- `security/detect-unsafe-regex` - Detects potentially unsafe regular expressions

### Important Rules (Warning Level)

- `security/detect-object-injection` - Detects potential object injection vulnerabilities
- `security/detect-non-literal-fs-filename` - Detects non-literal file system paths
- `security/detect-non-literal-regexp` - Detects non-literal regular expressions
- `security/detect-non-literal-require` - Detects non-literal require() calls
- `security/detect-possible-timing-attacks` - Detects potential timing attacks
- `security/detect-buffer-noassert` - Detects unsafe Buffer operations
- `security/detect-child-process` - Detects use of child_process
- `security/detect-disable-mustache-escape` - Detects disabled mustache escaping
- `security/detect-new-buffer` - Detects use of deprecated Buffer constructor

---

## Running Security Scan

Once configured, run:

```bash
# Using Next.js lint command
npm run lint

# Or directly with ESLint
npx eslint app lib components --ext .ts,.tsx
```

---

## Next Steps

1. Test the manual rules configuration
2. If compatibility issues persist, consider:
   - Using ESLint v9 with flat config format
   - Creating a separate ESLint config for security scanning
   - Using a different security linting tool (e.g., Semgrep, SonarQube)

---

*Setup attempted: $(date)*
*Status: ⚠️ Configuration pending due to compatibility issues*
