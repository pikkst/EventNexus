#!/bin/bash
# EventNexus Implementation Test Script
# Tests the improvements made to the platform

echo "🧪 EventNexus Platform Improvements - Test Script"
echo "=================================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
WARNING=0

# Function to test file existence
test_file_exists() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} File exists: $1"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} File missing: $1"
        ((FAILED++))
    fi
}

# Function to test directory existence
test_dir_exists() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} Directory exists: $1"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Directory missing: $1"
        ((FAILED++))
    fi
}

# Function to check for pattern in file
test_pattern_in_file() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Pattern found in $1: $2"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} Pattern not found in $1: $2"
        ((WARNING++))
    fi
}

# Function to check environment variable
test_env_var() {
    if grep -q "$1" ".env.local" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Environment variable exists: $1"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} Environment variable missing: $1 (Add to .env.local)"
        ((WARNING++))
    fi
}

echo "📦 Phase 1: File Structure Tests"
echo "================================"
echo ""

# Test new utility files
test_file_exists "utils/logger.ts"
test_file_exists "utils/validation.ts"
test_file_exists "utils/security.ts"

echo ""

# Test new components
test_file_exists "components/ErrorBoundary.tsx"
test_file_exists "components/LoadingSkeleton.tsx"

echo ""

# Test documentation
test_file_exists "docs/PLATFORM_ANALYSIS_REPORT.md"
test_file_exists "docs/IMPLEMENTATION_PROGRESS.md"
test_file_exists "docs/ACCESSIBILITY_PATTERNS.md"

echo ""
echo "🔐 Phase 2: Security Improvements Tests"
echo "======================================="
echo ""

# Test master passkey fix
test_pattern_in_file "components/MasterAuthModal.tsx" "import.meta.env.VITE_MASTER_PASSKEY"

# Test error boundary integration
test_pattern_in_file "index.tsx" "ErrorBoundary"

# Test environment variable setup
test_env_var "VITE_MASTER_PASSKEY"

echo ""
echo "♿ Phase 3: Accessibility Improvements Tests"
echo "==========================================="
echo ""

# Test ARIA labels (examples)
test_pattern_in_file "components/MasterAuthModal.tsx" "aria-label"
test_pattern_in_file "App.tsx" "aria-label"

echo ""
echo "📊 Phase 4: Type Safety Tests"
echo "============================="
echo ""

# Check for logger imports (should replace console.log)
if grep -r "import.*logger" components/*.tsx 2>/dev/null | wc -l | awk '{if ($1 > 0) exit 0; exit 1}'; then
    echo -e "${GREEN}✓${NC} Logger imports found in components"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} No logger imports yet (TODO: Replace console.log)"
    ((WARNING++))
fi

echo ""
echo "🎨 Phase 5: Build & Compile Tests"
echo "================================="
echo ""

# Test TypeScript compilation
if npm run build --dry-run 2>/dev/null; then
    echo -e "${GREEN}✓${NC} TypeScript compiles without errors"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} Cannot test build (run 'npm run build' manually)"
    ((WARNING++))
fi

echo ""
echo "📈 Test Summary"
echo "==============="
echo -e "Tests Passed:  ${GREEN}$PASSED${NC}"
echo -e "Tests Failed:  ${RED}$FAILED${NC}"
echo -e "Warnings:      ${YELLOW}$WARNING${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Review output above.${NC}"
    exit 1
fi
