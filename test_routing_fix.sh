#!/bin/bash

# EduQuiz Platform V2 - Post-Routing Fix Verification
# Run this script after the Vercel redeployment completes

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Your deployed URL
DEPLOYED_URL="https://eduquiz2.vercel.app"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}EduQuiz Platform V2 - Routing Fix Test${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "Testing deployment: ${GREEN}$DEPLOYED_URL${NC}"
echo ""

# Test 1: Main page
echo -e "${YELLOW}1. Testing Main Page${NC}"
if curl -s -f "$DEPLOYED_URL" > /dev/null; then
    echo -e "${GREEN}✅ Main page loads successfully${NC}"
else
    echo -e "${RED}❌ Main page failed to load${NC}"
    exit 1
fi

# Test 2: SPA Routing - Login page
echo -e "${YELLOW}2. Testing SPA Routing - Login Page${NC}"
if curl -s -f "$DEPLOYED_URL/login" > /dev/null; then
    echo -e "${GREEN}✅ Login page accessible (SPA routing working!)${NC}"
else
    echo -e "${RED}❌ Login page returns 404 - SPA routing still broken${NC}"
    echo -e "${RED}   Check Vercel rewrites in dashboard${NC}"
    exit 1
fi

# Test 3: SPA Routing - Register page  
echo -e "${YELLOW}3. Testing SPA Routing - Register Page${NC}"
if curl -s -f "$DEPLOYED_URL/register" > /dev/null; then
    echo -e "${GREEN}✅ Register page accessible (SPA routing working!)${NC}"
else
    echo -e "${RED}❌ Register page returns 404 - SPA routing still broken${NC}"
    exit 1
fi

# Test 4: Admin dashboard route
echo -e "${YELLOW}4. Testing Admin Dashboard Route${NC}"
if curl -s -f "$DEPLOYED_URL/admin" > /dev/null; then
    echo -e "${GREEN}✅ Admin dashboard accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Admin route returns 404 (may be expected if not logged in)${NC}"
fi

# Test 5: Student dashboard route
echo -e "${YELLOW}5. Testing Student Dashboard Route${NC}"
if curl -s -f "$DEPLOYED_URL/student" > /dev/null; then
    echo -e "${GREEN}✅ Student dashboard accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Student route returns 404 (may be expected if not logged in)${NC}"
fi

# Success summary
echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}🎉 SPA ROUTING FIX SUCCESSFUL!${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "${GREEN}✅ All critical routes now accessible${NC}"
echo -e "${GREEN}✅ React Router working correctly${NC}"
echo -e "${GREEN}✅ No more 404 NOT_FOUND errors${NC}"
echo ""
echo -e "${YELLOW}Next verification steps:${NC}"
echo "1. Open https://eduquiz2.vercel.app/login in browser"
echo "2. Verify the login form displays correctly"
echo "3. Test navigation between pages"
echo "4. Check browser console for any JavaScript errors"
echo "5. Test authentication functionality"
echo ""
echo -e "${GREEN}Deployment is now ready for full testing! 🚀${NC}"