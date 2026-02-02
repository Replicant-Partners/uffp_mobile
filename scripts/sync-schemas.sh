#!/bin/bash

# Schema Sync Script
# Syncs schema and utility files between uffp_mobile and uffp-backend repos
# Usage: ./scripts/sync-schemas.sh [--dry-run] [--to-backend|--from-backend]

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

# Default direction: mobile -> backend
DIRECTION="to-backend"
DRY_RUN=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      ;;
    --to-backend)
      DIRECTION="to-backend"
      ;;
    --from-backend)
      DIRECTION="from-backend"
      ;;
    --help)
      echo "Usage: $0 [--dry-run] [--to-backend|--from-backend]"
      echo ""
      echo "Options:"
      echo "  --dry-run       Show what would be synced without copying"
      echo "  --to-backend    Sync from mobile to backend (default)"
      echo "  --from-backend  Sync from backend to mobile"
      echo "  --help          Show this help message"
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
  echo "Expected directory: $BACKEND_DIR"
  exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Schema Sync Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Mobile repo:  $MOBILE_DIR"
echo "Backend repo: $BACKEND_DIR"
echo "Direction:    $DIRECTION"
echo "Dry run:      $DRY_RUN"
echo ""

# Function to copy file
copy_file() {
  local src="$1"
  local dest="$2"
  local label="$3"

  if [ ! -f "$src" ]; then
    echo -e "${YELLOW}⚠${NC} Skipped: $label (source not found: $src)"
    return 1
  fi

  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN]${NC} Would copy: $label"
    echo "           $src -> $dest"
  else
    # Create destination directory if it doesn't exist
    mkdir -p "$(dirname "$dest")"

    # Copy file
    cp "$src" "$dest"
    echo -e "${GREEN}✓${NC} Copied: $label"
  fi
  return 0
}

# Sync files
echo -e "${BLUE}Syncing files...${NC}"
echo ""

SYNCED_COUNT=0
SKIPPED_COUNT=0

# Define files to sync
if [ "$DIRECTION" = "to-backend" ]; then
  # Mobile -> Backend
  copy_file "${MOBILE_DIR}/lib/types.ts" "${BACKEND_DIR}/lib/types.ts" "lib/types.ts" && ((SYNCED_COUNT++)) || ((SKIPPED_COUNT++))
  copy_file "${MOBILE_DIR}/lib/database.ts" "${BACKEND_DIR}/lib/database.ts" "lib/database.ts" && ((SYNCED_COUNT++)) || ((SKIPPED_COUNT++))
  copy_file "${MOBILE_DIR}/src/utils/idGenerator.ts" "${BACKEND_DIR}/lib/idGenerator.ts" "idGenerator.ts" && ((SYNCED_COUNT++)) || ((SKIPPED_COUNT++))
  copy_file "${MOBILE_DIR}/src/utils/probability.ts" "${BACKEND_DIR}/lib/probability.ts" "probability.ts" && ((SYNCED_COUNT++)) || ((SKIPPED_COUNT++))
  copy_file "${MOBILE_DIR}/src/utils/schemaValidator.ts" "${BACKEND_DIR}/lib/schemaValidator.ts" "schemaValidator.ts" && ((SYNCED_COUNT++)) || ((SKIPPED_COUNT++))
else
  # Backend -> Mobile
  copy_file "${BACKEND_DIR}/lib/types.ts" "${MOBILE_DIR}/lib/types.ts" "lib/types.ts" && ((SYNCED_COUNT++)) || ((SKIPPED_COUNT++))
  copy_file "${BACKEND_DIR}/lib/database.ts" "${MOBILE_DIR}/lib/database.ts" "lib/database.ts" && ((SYNCED_COUNT++)) || ((SKIPPED_COUNT++))
  copy_file "${BACKEND_DIR}/lib/idGenerator.ts" "${MOBILE_DIR}/src/utils/idGenerator.ts" "idGenerator.ts" && ((SYNCED_COUNT++)) || ((SKIPPED_COUNT++))
  copy_file "${BACKEND_DIR}/lib/probability.ts" "${MOBILE_DIR}/src/utils/probability.ts" "probability.ts" && ((SYNCED_COUNT++)) || ((SKIPPED_COUNT++))
  copy_file "${BACKEND_DIR}/lib/schemaValidator.ts" "${MOBILE_DIR}/src/utils/schemaValidator.ts" "schemaValidator.ts" && ((SYNCED_COUNT++)) || ((SKIPPED_COUNT++))
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Sync complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Synced:  $SYNCED_COUNT files"
echo "Skipped: $SKIPPED_COUNT files"
echo ""

if [ "$DRY_RUN" = false ] && [ "$DIRECTION" = "to-backend" ]; then
  echo -e "${YELLOW}Next steps:${NC}"
  echo "1. Review changes in backend repo:"
  echo "   cd $BACKEND_DIR && git diff"
  echo ""
  echo "2. Commit changes:"
  echo "   cd $BACKEND_DIR && git add -A && git commit -m 'Sync schemas from mobile'"
  echo ""
  echo "3. Push to deploy:"
  echo "   cd $BACKEND_DIR && git push origin main"
  echo ""
fi
