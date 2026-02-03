# Dual Repo Architecture

## Overview

The UFFP application uses a **dual repository architecture**:

1. **Mobile Repo** (`uffp_mobile`) - Frontend React Native app + backend code for development
2. **Backend Repo** (`uffp-backend`) - Backend-only code deployed to Vercel

## Why This Architecture?

The mobile repo contains the full stack for easier local development:
- Frontend: React Native mobile app (`src/`)
- Backend: Vercel serverless functions (`api/`, `lib/`)

However, **only the backend repo is deployed to production via Vercel**.

## ⚠️ CRITICAL RULE: Backend Changes Must Be Synced

**ANY changes to backend files (`api/*`, `lib/*`) MUST be pushed to BOTH repos:**

1. ✅ Commit to mobile repo (for development)
2. ✅ **Copy files to backend repo** (for production deployment)
3. ✅ **Commit and push backend repo** (to deploy)

### Files That Must Always Be Synced

| File | Location | Purpose |
|------|----------|---------|
| `api/forecasts.ts` | `api/` | Main forecast API endpoints |
| `api/analyze-driver.ts` | `api/` | Driver analysis endpoint |
| `api/cors.ts` | `api/` | CORS configuration |
| `lib/database.ts` | `lib/` | Database operations |
| `lib/types.ts` | `lib/` | TypeScript type definitions |
| `lib/coach.ts` | `lib/` | AI coaching logic |
| `lib/agents.ts` | `lib/` | Research agent definitions |
| `lib/config.ts` | `lib/` | Configuration |
| `lib/researchCoordinator.ts` | `lib/` | Research orchestration |

## Automated Sync Script

Use the provided script to sync backend changes:

```bash
# From mobile repo root:
./scripts/push-backend.sh
```

This script:
1. Copies all backend files from mobile → backend
2. Shows a diff for review
3. Commits with a proper message
4. Pushes to backend repo
5. Verifies deployment

## Manual Sync Process

If you need to sync manually:

```bash
# 1. Copy changed files
cp api/forecasts.ts ../uffp-backend/api/forecasts.ts
cp lib/database.ts ../uffp-backend/lib/database.ts
# ... repeat for all changed files

# 2. Commit to backend repo
cd ../uffp-backend
git add -A
git commit -m "Sync backend changes from mobile: [describe changes]"

# 3. Push to deploy
git push origin master
```

## Common Mistakes to Avoid

❌ **WRONG:** Only pushing to mobile repo
```bash
git add api/forecasts.ts
git commit -m "Fix API endpoint"
git push origin master
# ⚠️ Backend NOT deployed - changes only in mobile repo!
```

✅ **CORRECT:** Pushing to both repos
```bash
# In mobile repo
git add api/forecasts.ts
git commit -m "Fix API endpoint"
git push origin master

# Copy to backend
cp api/forecasts.ts ../uffp-backend/api/forecasts.ts

# In backend repo
cd ../uffp-backend
git add api/forecasts.ts
git commit -m "Fix API endpoint"
git push origin master
# ✅ Changes deployed to production!
```

## Verification

After syncing, verify files are identical:

```bash
# Check specific file
diff lib/database.ts ../uffp-backend/lib/database.ts

# Check all backend files
./scripts/verify-backend-sync.sh
```

## Pre-Push Hook

The mobile repo has a pre-push hook that warns if backend files changed but backend repo wasn't updated. **Do not ignore these warnings!**

## Emergency: Backend Out of Sync

If you discover backend is out of sync:

1. Run full sync script:
   ```bash
   ./scripts/push-backend.sh --force
   ```

2. Review all diffs carefully

3. Commit and push to backend

4. Verify deployment on Vercel

## Related Scripts

- `scripts/push-backend.sh` - Automated sync and push
- `scripts/verify-backend-sync.sh` - Check if repos are in sync
- `scripts/sync-schemas.sh` - Legacy schema-only sync (deprecated)

## Questions?

If unsure whether a change needs backend sync:
- **Does it touch `api/` or `lib/`?** → YES, sync it!
- **Only touched `src/`?** → NO, frontend-only

**When in doubt, sync it!** Better safe than sorry.

---

**Last Updated:** February 3, 2026  
**Critical Rule:** Backend changes MUST be pushed to both repos
