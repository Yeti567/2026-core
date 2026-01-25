#!/bin/bash

# Test Registration Flow Script
# This script tests the registration and onboarding flow

BASE_URL="${1:-http://localhost:3000}"
TEST_EMAIL="${2:-test@testcompany.ca}"

echo "🧪 Testing Registration Flow"
echo "============================"
echo "Base URL: $BASE_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Registration Endpoint
echo "📝 Test 1: Registration Endpoint"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"company_name\": \"Test Company Ltd.\",
    \"wsib_number\": \"999888777\",
    \"company_email\": \"info@testcompany.ca\",
    \"address\": \"123 Test Street\",
    \"city\": \"Toronto\",
    \"province\": \"ON\",
    \"postal_code\": \"M5V3A1\",
    \"phone\": \"4165551234\",
    \"registrant_name\": \"Test User\",
    \"registrant_position\": \"director\",
    \"registrant_email\": \"$TEST_EMAIL\",
    \"industry\": \"concrete_construction\",
    \"employee_count\": 10,
    \"years_in_business\": 3,
    \"main_services\": [\"Foundations\", \"Flatwork\"]
  }")

if echo "$RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}✅ Registration endpoint working${NC}"
else
  echo -e "${RED}❌ Registration endpoint failed${NC}"
  echo "Response: $RESPONSE"
fi

echo ""
echo "📧 Check your email at $TEST_EMAIL for verification link"
echo ""
echo "Next steps:"
echo "1. Click the verification link in the email"
echo "2. You should be redirected to /welcome"
echo "3. Verify company profile completion page works"
echo "4. Check dashboard integration"
