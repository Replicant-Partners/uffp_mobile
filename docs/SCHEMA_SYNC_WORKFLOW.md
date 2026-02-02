# Schema Sync Workflow

**Purpose:** Keep schema files synchronized between `uffp_mobile` and `uffp-backend` repositories.

## 🔒 Regression Testing Guarantee

**CRITICAL:** Both mobile and backend repos now have **identical regression tests** that run on every commit via pre-commit hooks.

✅ **Mobile:** 12 tests (8 schema + 4 CLI) run before every commit  
✅ **Backend:** 12 tests (8 schema + 4 CLI) run before every commit

This ensures that **no schema-breaking changes** can be deployed to either repository without passing validation.

### Test Coverage
- Schema validation (25+ rules)
- ID format validation (nanoid with prefixes)
- Probability range validation (0-1)
- Direction field requirements
- Version field format
- Driver type requirements
- Evidence and research snapshot integrity

## Repository Setup

- **Mobile App:** `/home/ilabra/uffp_mobile` (React Native + Expo)
- **Backend API:** `/home/ilabra/uffp-backend` (Vercel Serverless Functions)
- **Backend URL:** https://uffp-backend.vercel.app

## Synced Files

The following files are kept in sync between repos:

| Mobile Location | Backend Location | Description |
|----------------|------------------|-------------|
| `lib/types.ts` | `lib/types.ts` | TypeScript interfaces (Forecast, Driver, Agent, etc.) |
| `lib/database.ts` | `lib/database.ts` | In-memory database & data operations |
| `src/utils/idGenerator.ts` | `lib/idGenerator.ts` | ID generation with nanoid + prefixes |
| `src/utils/probability.ts` | `lib/probability.ts` | Probability conversion utilities |
| `src/utils/schemaValidator.ts` | `lib/schemaValidator.ts` | Schema validation rules |

## When to Sync

Sync schemas whenever you make changes to:
- Type definitions (Driver, Forecast, Agent, etc.)
- Database operations
- ID generation logic
- Probability calculations
- Validation rules

## How to Sync

### Option 1: Using the Sync Script (Recommended)

```bash
# From uffp_mobile directory
cd /home/ilabra/uffp_mobile

# Dry run (see what would be synced)
./scripts/sync-schemas.sh --dry-run

# Sync mobile -> backend (default)
./scripts/sync-schemas.sh

# Sync backend -> mobile (if backend is source of truth)
./scripts/sync-schemas.sh --from-backend
```

### Option 2: Manual Sync

```bash
# Copy files from mobile to backend
cp /home/ilabra/uffp_mobile/lib/types.ts /home/ilabra/uffp-backend/lib/types.ts
cp /home/ilabra/uffp_mobile/lib/database.ts /home/ilabra/uffp-backend/lib/database.ts
cp /home/ilabra/uffp_mobile/src/utils/idGenerator.ts /home/ilabra/uffp-backend/lib/idGenerator.ts
cp /home/ilabra/uffp_mobile/src/utils/probability.ts /home/ilabra/uffp-backend/lib/probability.ts
cp /home/ilabra/uffp_mobile/src/utils/schemaValidator.ts /home/ilabra/uffp-backend/lib/schemaValidator.ts
```

## Post-Sync Steps

### 1. Fix Backend-Specific Issues

After syncing, check for import path differences:

```bash
cd /home/ilabra/uffp-backend

# Check for TypeScript errors
npx tsc --noEmit

# Common fixes needed:
# - schemaValidator.ts: Change import from "../../lib/types" to "./types"
# - Any relative path differences between repos
```

### 2. Test Backend

```bash
cd /home/ilabra/uffp-backend

# Check TypeScript compilation
npx tsc --noEmit 2>&1 | grep -v "@vercel/postgres"

# Expected: Only @vercel/postgres type warnings (safe to ignore)
```

### 3. Commit & Deploy Backend

```bash
cd /home/ilabra/uffp-backend

# Review changes
git diff

# Commit
git add -A
git commit -m "Sync schema changes from mobile

- Updated types/database/utilities
- Align with mobile schema validation"

# Deploy to Vercel
git push origin master
```

Vercel will automatically deploy when you push to `master`.

### 4. Verify Deployment

Check Vercel dashboard or:
```bash
curl https://uffp-backend.vercel.app/api/health
```

## Workflow Example

```bash
# 1. Make schema changes in mobile
cd /home/ilabra/uffp_mobile
# ... edit lib/types.ts, add new field to Driver ...
git add lib/types.ts
git commit -m "Add new field to Driver interface"
git push origin master

# 2. Sync to backend
./scripts/sync-schemas.sh

# 3. Deploy backend
cd /home/ilabra/uffp-backend
npx tsc --noEmit  # Verify no errors
git add -A
git commit -m "Sync schema changes from mobile"
git push origin master

# 4. Verify both deployments
# Mobile: Expo build will pick up changes
# Backend: Vercel auto-deploys on push
```

## Common Issues & Fixes

### Import Path Mismatch
**Problem:** `schemaValidator.ts` imports fail in backend
```
error TS2307: Cannot find module '../../lib/types'
```

**Fix:**
```bash
cd /home/ilabra/uffp-backend
sed -i 's|"../../lib/types"|"./types"|' lib/schemaValidator.ts
```

### Version Field Mismatch
**Problem:** Database uses old `currentVersion` field
```
error TS2339: Property 'currentVersion' does not exist on type 'Driver'
```

**Fix:** Already handled in sync - uses `version: {major, minor}` format

### Missing Dependencies
**Problem:** Backend missing packages like `nanoid`

**Fix:**
```bash
cd /home/ilabra/uffp-backend
npm install nanoid
```

## Schema Validation Tests

Both repos should run the same validation tests:

```bash
# Mobile
cd /home/ilabra/uffp_mobile
npm run test:schema
npm run test:cli

# Backend (if tests added)
cd /home/ilabra/uffp-backend
npm test
```

## Version History

- **2026-02-03:** Initial sync workflow established
  - Created sync script (`scripts/sync-schemas.sh`)
  - Synced 5 core schema files
  - Documented process
  - First successful mobile->backend sync deployed

## Future Improvements

1. **Shared NPM Package:** Extract schemas to `@uffp/shared-types` package
2. **Automated Testing:** Add backend schema tests that match mobile tests
3. **CI/CD Integration:** Auto-sync on schema changes via GitHub Actions
4. **Git Hooks:** Pre-commit hook to remind about syncing when schemas change
