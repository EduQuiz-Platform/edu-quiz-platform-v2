#!/bin/bash

# EduQuiz Platform - Deployment Verification Script
# This script tests the deployed React application to verify it's working correctly

echo "🎓 EduQuiz Platform - Deployment Verification"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="https://eduquiz2.vercel.app"

# Test results
declare -A test_results

# Function to test URL
test_url() {
    local url="$1"
    local description="$2"
    
    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo "URL: $url"
    
    # Test the URL
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" -eq 200 ]; then
        echo -e "${GREEN}✅ SUCCESS: HTTP $response${NC}"
        test_results["$description"]="PASS"
        return 0
    else
        echo -e "${RED}❌ FAILED: HTTP $response${NC}"
        test_results["$description"]="FAIL (HTTP $response)"
        return 1
    fi
}

# Function to test for specific content
test_content() {
    local url="$1"
    local description="$2"
    local search_term="$3"
    
    echo -e "\n${YELLOW}Testing Content: $description${NC}"
    echo "URL: $url"
    echo "Looking for: $search_term"
    
    # Fetch content and check for specific terms
    content=$(curl -s "$url")
    
    if echo "$content" | grep -qi "$search_term"; then
        echo -e "${GREEN}✅ SUCCESS: Found expected content${NC}"
        test_results["$description"]="PASS"
        return 0
    else
        echo -e "${RED}❌ FAILED: Content not found${NC}"
        echo "Content preview:"
        echo "$content" | head -5
        test_results["$description"]="FAIL (Content)"
        return 1
    fi
}

echo -e "\n🔍 Starting Deployment Verification Tests..."
echo "Base URL: $BASE_URL"
echo "Timestamp: $(date)"

# Test main routes
test_url "$BASE_URL/" "Main Page Load"
test_url "$BASE_URL/login" "Login Page Load"  
test_url "$BASE_URL/register" "Register Page Load"
test_url "$BASE_URL/dashboard" "Dashboard Page Load"

# Test specific React content (look for React-specific indicators)
test_content "$BASE_URL/" "React App Content" "react\|React\|root"
test_content "$BASE_URL/login" "Login Form Content" "login\|email\|password"

# Test static assets
test_url "$BASE_URL/assets" "Assets Directory"
test_url "$BASE_URL/favicon.ico" "Favicon"

# Test API routes (should return 404 for non-existent APIs)
echo -e "\n${YELLOW}Testing API Routes (should return 404)${NC}"
api_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/test")
if [ "$api_response" -eq 404 ]; then
    echo -e "${GREEN}✅ SUCCESS: API correctly returns 404${NC}"
    test_results["API Route Handling"]="PASS"
else
    echo -e "${RED}❌ UNEXPECTED: API returned HTTP $api_response${NC}"
    test_results["API Route Handling"]="UNEXPECTED (HTTP $api_response)"
fi

# Test SPA routing (login should load via client-side routing)
echo -e "\n${YELLOW}Testing SPA Routing (Client-Side)${NC}"
login_html=$(curl -s "$BASE_URL/login")
if echo "$login_html" | grep -qi "react\|root"; then
    echo -e "${GREEN}✅ SUCCESS: SPA routing working (React app loads)${NC}"
    test_results["SPA Routing"]="PASS"
else
    echo -e "${RED}❌ FAILED: SPA routing not working${NC}"
    test_results["SPA Routing"]="FAIL"
fi

# Performance test
echo -e "\n${YELLOW}Performance Test${NC}"
response_time=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/")
if (( $(echo "$response_time < 3" | bc -l) )); then
    echo -e "${GREEN}✅ SUCCESS: Response time ${response_time}s${NC}"
    test_results["Performance"]="PASS (${response_time}s)"
else
    echo -e "${YELLOW}⚠️  SLOW: Response time ${response_time}s${NC}"
    test_results["Performance"]="SLOW (${response_time}s)"
fi

# Summary
echo -e "\n🎯 DEPLOYMENT VERIFICATION SUMMARY"
echo "===================================="
total_tests=0
passed_tests=0

for test_name in "${!test_results[@]}"; do
    total_tests=$((total_tests + 1))
    result="${test_results[$test_name]}"
    
    if [[ "$result" == "PASS"* ]]; then
        passed_tests=$((passed_tests + 1))
        echo -e "${GREEN}✅ $test_name: $result${NC}"
    else
        echo -e "${RED}❌ $test_name: $result${NC}"
    fi
done

echo -e "\nResults: $passed_tests/$total_tests tests passed"

if [ $passed_tests -eq $total_tests ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! Deployment is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please check the deployment configuration.${NC}"
    exit 1
fi