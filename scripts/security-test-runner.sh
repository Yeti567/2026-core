#!/bin/bash

# =============================================================================
# Security Test Runner Script
# =============================================================================
# Automated security testing script
# Run: bash scripts/security-test-runner.sh
# =============================================================================

set -e

echo "🔒 Security Test Runner"
echo "======================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
SKIPPED=0

# =============================================================================
# Helper Functions
# =============================================================================

test_pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((PASSED++))
}

test_fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((FAILED++))
}

test_skip() {
    echo -e "${YELLOW}⏭️  SKIP:${NC} $1"
    ((SKIPPED++))
}

test_info() {
    echo -e "${YELLOW}ℹ️  INFO:${NC} $1"
}

# =============================================================================
# 1. Build Test
# =============================================================================

echo "1. Testing Production Build"
echo "---------------------------"

if npm run build > /dev/null 2>&1; then
    test_pass "Production build succeeds"
else
    test_fail "Production build fails"
    echo "Run 'npm run build' to see errors"
fi

echo ""

# =============================================================================
# 2. TypeScript Check
# =============================================================================

echo "2. Testing TypeScript"
echo "---------------------"

if command -v tsc &> /dev/null; then
    if npx tsc --noEmit > /dev/null 2>&1; then
        test_pass "TypeScript compilation succeeds"
    else
        test_fail "TypeScript compilation fails"
        echo "Run 'npx tsc --noEmit' to see errors"
    fi
else
    test_skip "TypeScript not available"
fi

echo ""

# =============================================================================
# 3. ESLint Security Check
# =============================================================================

echo "3. Testing ESLint Security"
echo "--------------------------"

if npm run lint:security > /dev/null 2>&1; then
    test_pass "ESLint security check passes"
else
    test_fail "ESLint security check fails"
    echo "Run 'npm run lint:security' to see errors"
fi

echo ""

# =============================================================================
# 4. npm Audit
# =============================================================================

echo "4. Testing npm Audit"
echo "--------------------"

if npm audit --audit-level=moderate > /dev/null 2>&1; then
    test_pass "npm audit passes (moderate and above)"
else
    test_fail "npm audit found vulnerabilities"
    echo "Run 'npm audit' to see details"
fi

echo ""

# =============================================================================
# 5. Environment Variables Check
# =============================================================================

echo "5. Testing Environment Variables"
echo "---------------------------------"

REQUIRED_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    test_pass "Required environment variables set"
else
    test_fail "Missing environment variables: ${MISSING_VARS[*]}"
fi

echo ""

# =============================================================================
# 6. File Existence Checks
# =============================================================================

echo "6. Testing Security Files"
echo "--------------------------"

SECURITY_FILES=(
    "middleware.ts"
    "lib/utils/rate-limit.ts"
    "lib/utils/file-upload-validation.ts"
    "SECURITY_PRE_LAUNCH_CHECKLIST.md"
)

for file in "${SECURITY_FILES[@]}"; do
    if [ -f "$file" ]; then
        test_pass "Security file exists: $file"
    else
        test_fail "Security file missing: $file"
    fi
done

echo ""

# =============================================================================
# 7. CSP Header Check (in middleware.ts)
# =============================================================================

echo "7. Testing CSP Implementation"
echo "------------------------------"

if grep -q "Content-Security-Policy" middleware.ts 2>/dev/null; then
    test_pass "CSP header implementation found"
else
    test_fail "CSP header not found in middleware.ts"
fi

echo ""

# =============================================================================
# 8. Rate Limiting Check
# =============================================================================

echo "8. Testing Rate Limiting"
echo "------------------------"

if grep -q "rateLimit" lib/utils/rate-limit.ts 2>/dev/null; then
    test_pass "Rate limiting utility exists"
else
    test_fail "Rate limiting utility not found"
fi

echo ""

# =============================================================================
# 9. Security Headers Check (next.config.js)
# =============================================================================

echo "9. Testing Security Headers"
echo "---------------------------"

if grep -q "Strict-Transport-Security\|X-Frame-Options" next.config.js 2>/dev/null; then
    test_pass "Security headers configured"
else
    test_fail "Security headers not found in next.config.js"
fi

echo ""

# =============================================================================
# 10. Sentry Configuration Check
# =============================================================================

echo "10. Testing Sentry Configuration"
echo "----------------------------------"

if [ -f "sentry.server.config.ts" ] && [ -f "sentry.client.config.ts" ]; then
    test_pass "Sentry configuration files exist"
else
    test_skip "Sentry configuration files not found (optional)"
fi

echo ""

# =============================================================================
# Summary
# =============================================================================

echo "======================"
echo "Test Summary"
echo "======================"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${YELLOW}Skipped:${NC} $SKIPPED"
echo ""

TOTAL=$((PASSED + FAILED + SKIPPED))
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All critical tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Review above.${NC}"
    exit 1
fi
