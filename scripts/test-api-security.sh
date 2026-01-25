#!/bin/bash

# =============================================================================
# API Security Test Script
# =============================================================================
# Tests API endpoints for security vulnerabilities
# Requires: curl, jq (optional)
# Usage: bash scripts/test-api-security.sh [BASE_URL] [AUTH_TOKEN]
# =============================================================================

set -e

BASE_URL="${1:-http://localhost:3000}"
AUTH_TOKEN="${2:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

# =============================================================================
# Helper Functions
# =============================================================================

test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data="${5:-}"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -d "$data" \
            "$BASE_URL$endpoint" 2>/dev/null || echo -e "\n000")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            "$BASE_URL$endpoint" 2>/dev/null || echo -e "\n000")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS:${NC} $description (HTTP $http_code)"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL:${NC} $description (Expected $expected_status, got $http_code)"
        echo "   Response: $body"
        ((FAILED++))
    fi
}

# =============================================================================
# Tests
# =============================================================================

echo "🔒 API Security Tests"
echo "===================="
echo "Base URL: $BASE_URL"
echo ""

# =============================================================================
# 1. Authentication Tests
# =============================================================================

echo "1. Authentication Tests"
echo "------------------------"

# Test: Protected route without auth
test_endpoint "GET" "/api/documents" "401" \
    "Protected route requires authentication"

# Test: Protected route with invalid token
AUTH_TOKEN="invalid-token"
test_endpoint "GET" "/api/documents" "401" \
    "Invalid token rejected"

# Reset token
AUTH_TOKEN="${2:-}"

echo ""

# =============================================================================
# 2. Authorization Tests
# =============================================================================

echo "2. Authorization Tests"
echo "-----------------------"

if [ -n "$AUTH_TOKEN" ]; then
    # Test: Admin route as non-admin (if token is worker)
    test_endpoint "POST" "/api/invitations" "403" \
        "Non-admin cannot access admin routes"
    
    echo ""
else
    echo -e "${YELLOW}⏭️  SKIP:${NC} Authorization tests (no auth token provided)"
    echo ""
fi

# =============================================================================
# 3. Rate Limiting Tests
# =============================================================================

echo "3. Rate Limiting Tests"
echo "----------------------"

if [ -n "$AUTH_TOKEN" ]; then
    echo -e "${YELLOW}ℹ️  INFO:${NC} Rate limiting tests require authenticated requests"
    echo "   Run manually: Make 21+ rapid requests to /api/forms/convert-pdf/{id}/test-submit"
    echo ""
else
    echo -e "${YELLOW}⏭️  SKIP:${NC} Rate limiting tests (no auth token provided)"
    echo ""
fi

# =============================================================================
# 4. Input Validation Tests
# =============================================================================

echo "4. Input Validation Tests"
echo "--------------------------"

# Test: SQL injection attempt
test_endpoint "GET" "/api/documents/search?q=' OR '1'='1" "400" \
    "SQL injection attempt blocked"

# Test: XSS attempt
test_endpoint "POST" "/api/documents" "401" \
    "XSS in request body" \
    '{"title":"<script>alert(\"xss\")</script>"}'

echo ""

# =============================================================================
# 5. Security Headers Tests
# =============================================================================

echo "5. Security Headers Tests"
echo "-------------------------"

headers=$(curl -s -I "$BASE_URL" | grep -i "content-security-policy\|strict-transport-security\|x-frame-options" || true)

if [ -n "$headers" ]; then
    echo -e "${GREEN}✅ PASS:${NC} Security headers present"
    echo "$headers" | sed 's/^/   /'
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL:${NC} Security headers missing"
    ((FAILED++))
fi

echo ""

# =============================================================================
# Summary
# =============================================================================

echo "===================="
echo "Test Summary"
echo "===================="
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All API security tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Review above.${NC}"
    exit 1
fi
