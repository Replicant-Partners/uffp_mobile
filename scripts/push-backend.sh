#!/bin/bash

# Push Backend Changes Script
# Automatically syncs backend files from mobile repo to backend repo and deploys
# Usage: ./scripts/push-backend.sh [--force] [--dry-run]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories
MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${MOBILE_DIR}/../uffp-backend"

# Options
FORCE=false
DRY_RUN=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --force)
      FORCE=true
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
    --help)
      echo "Usage: $0 [--force] [--dry-run]"
      echo ""
      echo "Options:"
      echo "  --force     Copy all files even if no changes detected"
      echo "  --dry-run   Show what would be done without making changes"
      echo "  --help      Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $arg${NC}"
      exit 1
      ;;
  esac
done

# Check if backend repo exists
if [ ! -d "$BACKEND_DIR" ]; then
  echo -e "${RED}Error: Backend repo not found at $BACKEND_DIR${NC}"
  echo "Expected: $BACKEND_DIR"
  echo ""
  echo "Clone the backend repo:"
  echo "  cd $(dirname "$BACKEND_DIR")"
  echo "  git clone https://github.com/Replicant-Partners/uffp-backend.git"
  exit 1
fi

echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Push Backend Changes to Production           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Mobile repo:  $MOBILE_DIR"
echo "Backend repo: $BACKEND_DIR"
echo "Force mode:   $FORCE"
echo "Dry run:      $DRY_RUN"
echo ""

# Check if backend repo is clean
cd "$BACKEND_DIR"
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  echo -e "${YELLOW}⚠ Warning: Backend repo has uncommitted changes${NC}"
  echo ""
  git status --short
  echo ""
  read -p "Continue anyway? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
fi

cd "$MOBILE_DIR"

# Define files to sync
API_FILES=(
  "api/forecasts.ts"
  "api/analyze-driver.ts"
  "api/cors.ts"
)

LIB_FILES=(
  "lib/database.ts"
  "lib/types.ts"
  "lib/coach.ts"
  "lib/agents.ts"
  "lib/config.ts"
  "lib/researchCoordinator.ts"
)

ALL_FILES=("${API_FILES[@]}" "${LIB_FILES[@]}")

# Track changes
CHANGED_FILES=()
IDENTICAL_FILES=()
ERRORS=()

echo -e "${BLUE}Checking files for changes...${NC}"
echo ""

for file in "${ALL_FILES[@]}"; do
  mobile_file="$MOBILE_DIR/$file"
  backend_file="$BACKEND_DIR/$file"

  if [ ! -f "$mobile_file" ]; then
    echo -e "${YELLOW}⚠${NC} Skipped: $file (not in mobile repo)"
    continue
  fi

  if [ ! -f "$backend_file" ]; then
    echo -e "${YELLOW}⚠${NC} New file: $file (will be copied)"
    CHANGED_FILES+=("$file")
    continue
  fi

  if ! diff -q "$mobile_file" "$backend_file" > /dev/null 2>&1 || [ "$FORCE" = true ]; then
    echo -e "${YELLOW}✗${NC} Changed: $file"
    CHANGED_FILES+=("$file")
  else
    echo -e "${GREEN}✓${NC} Identical: $file"
    IDENTICAL_FILES+=("$file")
  fi
done

echo ""

# Show summary
if [ ${#CHANGED_FILES[@]} -eq 0 ]; then
  echo -e "${GREEN}✓ All backend files are already in sync!${NC}"
  echo ""
  echo "No changes to deploy."
  exit 0
fi

echo -e "${YELLOW}Files to sync: ${#CHANGED_FILES[@]}${NC}"
for file in "${CHANGED_FILES[@]}"; do
  echo "  - $file"
done
echo ""

# Show diffs
echo -e "${BLUE}Showing diffs for changed files...${NC}"
echo ""

for file in "${CHANGED_FILES[@]}"; do
  mobile_file="$MOBILE_DIR/$file"
  backend_file="$BACKEND_DIR/$file"

  echo -e "${BLUE}━━━ $file ━━━${NC}"

  if [ ! -f "$backend_file" ]; then
    echo "(New file - will be created)"
  else
    diff -u "$backend_file" "$mobile_file" | head -30 || true
    echo ""
    echo "(Showing first 30 lines of diff)"
  fi
  echo ""
done

# Confirm before proceeding
if [ "$DRY_RUN" = false ]; then
  echo -e "${YELLOW}Ready to sync ${#CHANGED_FILES[@]} file(s) to backend repo.${NC}"
  echo ""
  read -p "Continue? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
fi

# Copy files
echo ""
echo -e "${BLUE}Syncing files...${NC}"
echo ""

for file in "${CHANGED_FILES[@]}"; do
  mobile_file="$MOBILE_DIR/$file"
  backend_file="$BACKEND_DIR/$file"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN]${NC} Would copy: $file"
  else
    # Create directory if needed
    mkdir -p "$(dirname "$backend_file")"

    # Copy file
    cp "$mobile_file" "$backend_file"
    echo -e "${GREEN}✓${NC} Copied: $file"
  fi
done

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo -e "${YELLOW}Dry run complete. No changes made.${NC}"
  exit 0
fi

# Commit and push
echo ""
echo -e "${BLUE}Committing to backend repo...${NC}"
echo ""

cd "$BACKEND_DIR"

# Stage files
git add "${CHANGED_FILES[@]}"

# Generate commit message
COMMIT_MSG="Sync backend files from mobile

Files updated:
$(for file in "${CHANGED_FILES[@]}"; do echo "- $file"; done)

Auto-synced by scripts/push-backend.sh"

echo "Commit message:"
echo "$COMMIT_MSG"
echo ""

# Commit
git commit -m "$COMMIT_MSG"

echo ""
echo -e "${GREEN}✓ Committed to backend repo${NC}"
echo ""

# Push
echo -e "${BLUE}Pushing to GitHub...${NC}"
echo ""

git push origin master

echo ""
echo -e "${GREEN}✓ Pushed to GitHub${NC}"
echo ""

# Show final status
echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                   Deployment Complete                 ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Backend changes deployed successfully!"
echo ""
echo "Files synced: ${#CHANGED_FILES[@]}"
echo "Already in sync: ${#IDENTICAL_FILES[@]}"
echo ""
echo "Vercel will automatically deploy these changes."
echo ""
echo -e "${GREEN}✓ Backend is now in sync with mobile${NC}"
