#!/bin/bash

# Educational Quiz Platform - Post-Deployment Health Check
# Run this script to test your deployed application

echo "🎓 Educational Quiz Platform - Health Check"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check status
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Get user input
read -p "Enter your deployed URL (e.g., https://edu-quiz-platform-abc123.vercel.app): " DEPLOYMENT_URL

if [ -z "$DEPLOYMENT_URL" ]; then
    echo -e "${RED}❌ No URL provided${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Testing deployment: $DEPLOYMENT_URL${NC}"
echo ""

# Test 1: Basic connectivity
echo "1. Testing basic connectivity..."
curl -s -f "$DEPLOYMENT_URL" > /dev/null
check_status $? "Site is accessible"

# Test 2: HTML content
echo "2. Checking HTML content..."
RESPONSE=$(curl -s "$DEPLOYMENT_URL")
if echo "$RESPONSE" | grep -q "Educational Quiz Platform"; then
    check_status 0 "Main page loads correctly"
else
    check_status 1 "Main page content missing"
fi

# Test 3: PWA Manifest
echo "3. Checking PWA manifest..."
curl -s -f "$DEPLOYMENT_URL/manifest.json" > /dev/null
check_status $? "PWA manifest accessible"

# Test 4: Service Worker
echo "4. Checking service worker..."
curl -s -f "$DEPLOYMENT_URL/sw.js" > /dev/null
check_status $? "Service worker accessible"

# Test 5: Environment variables check (basic)
echo "5. Checking for JavaScript bundle..."
curl -s "$DEPLOYMENT_URL" | grep -q "assets/"
check_status $? "JavaScript assets load"

echo ""
echo -e "${YELLOW}📱 Manual Testing Checklist:${NC}"
echo "Copy this list and test each feature:"
echo ""

echo "🔐 Authentication:"
echo "  [ ] Registration page loads"
echo "  [ ] Login page loads"
echo "  [ ] Can create new account"
echo "  [ ] Can login with existing account"
echo ""

echo "👤 User Management:"
echo "  [ ] Student dashboard accessible"
echo "  [ ] Instructor dashboard accessible"
echo "  [ ] Admin dashboard accessible"
echo "  [ ] Role switching works"
echo ""

echo "📚 Course Management:"
echo "  [ ] Can view courses"
echo "  [ ] Can create new course (instructor)"
echo "  [ ] Can enroll in course (student)"
echo "  [ ] Can manage lessons (instructor)"
echo ""

echo "🤖 AI Features:"
echo "  [ ] Quiz generation works"
echo "  [ ] Essay grading functional"
echo "  [ ] AI feedback displays"
echo ""

echo "📱 PWA Features:"
echo "  [ ] Install prompt appears"
echo "  [ ] App installs on mobile/desktop"
echo "  [ ] Works offline (basic)"
echo "  [ ] Fast loading (< 3 seconds)"
echo ""

echo "🔧 Admin Features:"
echo "  [ ] User management page"
echo "  [ ] Password reset approvals"
echo "  [ ] Role assignment"
echo "  [ ] Analytics dashboard"
echo ""

echo -e "${GREEN}🎉 Deployment Health Check Complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Test all features manually using the checklist above"
echo "2. Share your testing results"
echo "3. Report any issues you find"
echo ""
echo -e "${YELLOW}If you encounter issues:${NC}"
echo "1. Check Vercel deployment logs"
echo "2. Verify environment variables are set correctly"
echo "3. Test locally first with: cd frontend && npm run dev"
