#!/bin/bash

# EduQuiz Platform V2 - Deployment Verification Script
# Usage: ./verify_deployment.sh [DEPLOYED_URL]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the deployed URL (first argument or use default)
DEPLOYED_URL="${1:-https://edu-quiz-platform-v2.vercel.app}"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}EduQuiz Platform V2 - Deployment Verification${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "Testing URL: ${GREEN}$DEPLOYED_URL${NC}"
echo ""

# Test 1: Main page
echo -e "${YELLOW}Test 1: Main Page Loading${NC}"
if curl -s -f "$DEPLOYED_URL" > /dev/null; then
    echo -e "${GREEN}✅ Main page loads successfully${NC}"
else
    echo -e "${RED}❌ Main page failed to load${NC}"
    exit 1
fi

# Test 2: Login page
echo -e "${YELLOW}Test 2: Login Page (SPA Routing)${NC}"
if curl -s -f "$DEPLOYED_URL/login" > /dev/null; then
    echo -e "${GREEN}✅ Login page accessible${NC}"
else
    echo -e "${RED}❌ Login page returns 404 - SPA routing may be broken${NC}"
    echo -e "${YELLOW}   This could indicate Vercel rewrites are not working properly${NC}"
    exit 1
fi

# Test 3: Register page
echo -e "${YELLOW}Test 3: Register Page (SPA Routing)${NC}"
if curl -s -f "$DEPLOYED_URL/register" > /dev/null; then
    echo -e "${GREEN}✅ Register page accessible${NC}"
else
    echo -e "${RED}❌ Register page returns 404 - SPA routing may be broken${NC}"
    exit 1
fi

# Test 4: Assets loading
echo -e "${YELLOW}Test 4: Static Assets${NC}"
if curl -s -f "$DEPLOYED_URL/assets" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Assets directory accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Assets directory check inconclusive${NC}"
fi

# Test 5: JavaScript bundles
echo -e "${YELLOW}Test 5: JavaScript Bundles${NC}"
JS_BUNDLE=$(curl -s "$DEPLOYED_URL" | grep -o 'src="[^"]*\.js"' | head -1 | cut -d'"' -f2)
if [ -n "$JS_BUNDLE" ]; then
    FULL_JS_URL="$DEPLOYED_URL$JS_BUNDLE"
    if curl -s -f "$FULL_JS_URL" > /dev/null; then
        echo -e "${GREEN}✅ JavaScript bundle loads successfully${NC}"
        echo -e "   Bundle: ${JS_BUNDLE}"
    else
        echo -e "${RED}❌ JavaScript bundle failed to load${NC}"
        echo -e "   URL attempted: ${FULL_JS_URL}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Could not find JavaScript bundle in page${NC}"
fi

# Test 6: CSS loading
echo -e "${YELLOW}Test 6: CSS Stylesheets${NC}"
CSS_FILE=$(curl -s "$DEPLOYED_URL" | grep -o 'href="[^"]*\.css"' | head -1 | cut -d'"' -f2)
if [ -n "$CSS_FILE" ]; then
    FULL_CSS_URL="$DEPLOYED_URL$CSS_FILE"
    if curl -s -f "$FULL_CSS_URL" > /dev/null; then
        echo -e "${GREEN}✅ CSS stylesheet loads successfully${NC}"
        echo -e "   Stylesheet: ${CSS_FILE}"
    else
        echo -e "${RED}❌ CSS stylesheet failed to load${NC}"
        echo -e "   URL attempted: ${FULL_CSS_URL}"
    fi
fi

# Summary
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Verification Summary${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "${GREEN}✅ Basic deployment verification completed${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Test authentication flow (login/register)"
echo "2. Verify environment variables are loaded in browser"
echo "3. Test Supabase connection"
echo "4. Check browser console for JavaScript errors"
echo "5. Test on mobile devices"
echo ""
echo -e "${YELLOW}If login/register pages return 404, check:${NC}"
echo "1. Vercel dashboard > Project > Settings > Rewrites"
echo "2. Ensure vercel.json has correct SPA routing rules"
echo "3. Verify environment variables are set in Vercel"
echo ""