#!/bin/bash

# Verify Backend Sync Script
# Checks if backend files in mobile repo match backend repo
# Usage: ./scripts/verify-backend-sync.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Directories
MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${MOBILE_DIR}/../uffp-backend"

# Check if backend repo exists
if [ ! -d "$BACKEND_DIR" ]; then
  echo -e "${RED}Error: Backend repo not found at $BACKEND_DIR${NC}"
  exit 1
fi

echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Verify Backend Sync Status                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Define files to check
FILES=(
  "api/forecasts.ts"
  "api/analyze-driver.ts"
  "api/cors.ts"
  "lib/database.ts"
  "lib/types.ts"
  "lib/coach.ts"
  "lib/agents.ts"
  "lib/config.ts"
  "lib/researchCoordinator.ts"
)

IDENTICAL=0
DIFFERENT=0
MISSING=0

echo "Checking ${#FILES[@]} backend files..."
echo ""

for file in "${FILES[@]}"; do
  mobile_file="$MOBILE_DIR/$file"
  backend_file="$BACKEND_DIR/$file"

  if [ ! -f "$mobile_file" ]; then
    echo -e "${YELLOW}⚠${NC} $file - Missing in mobile repo"
    ((MISSING++))
    continue
  fi

  if [ ! -f "$backend_file" ]; then
    echo -e "${RED}✗${NC} $file - Missing in backend repo"
    ((DIFFERENT++))
    continue
  fi

  if diff -q "$mobile_file" "$backend_file" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $file - In sync"
    ((IDENTICAL++))
  else
    echo -e "${RED}✗${NC} $file - OUT OF SYNC"
    ((DIFFERENT++))
  fi
done

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

if [ $DIFFERENT -eq 0 ] && [ $MISSING -eq 0 ]; then
  echo -e "${GREEN}✓ All backend files are in sync!${NC}"
  echo ""
  echo "Summary:"
  echo "  In sync: $IDENTICAL files"
  exit 0
else
  echo -e "${RED}✗ Backend repos are OUT OF SYNC!${NC}"
  echo ""
  echo "Summary:"
  echo "  In sync:     $IDENTICAL files"
  echo "  Out of sync: $DIFFERENT files"
  echo "  Missing:     $MISSING files"
  echo ""
  echo -e "${YELLOW}Action required:${NC}"
  echo "  Run: ./scripts/push-backend.sh"
  echo ""
  exit 1
fi
