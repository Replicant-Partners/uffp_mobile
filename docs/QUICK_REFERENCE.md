# Quick Reference Guide

## 🚨 Most Important Command

**After ANY backend change (`api/`, `lib/`):**

```bash
./scripts/push-backend.sh
```

This is **mandatory**. Forgetting this means your backend changes won't deploy to production.

---

## Common Commands

### Development

```bash
# Start development server
npm start

# Run all tests
npm run test:all

# Verify backend is synced
./scripts/verify-backend-sync.sh
```

### Backend Deployment

```bash
# Sync and deploy backend changes (REQUIRED after api/ or lib/ changes)
./scripts/push-backend.sh

# Dry run (see what would be synced without deploying)
./scripts/push-backend.sh --dry-run

# Force sync all files
./scripts/push-backend.sh --force
```

### Testing

```bash
# Run all tests (33 tests)
npm run test:all

# Schema validation only (16 tests)
npm run test:schema

# CLI driver tests only (4 tests)
npm run test:cli

# State integrity tests only (13 tests)
npm run test:state
```

---

## When to Use Each Command

| Situation | Command | Why |
|-----------|---------|-----|
| Changed `src/` files only | `git push` | Frontend-only, no backend sync needed |
| Changed `api/` or `lib/` files | `git push` + `./scripts/push-backend.sh` | Must deploy to backend repo |
| Before submitting PR | `npm run test:all` | Ensure all tests pass |
| Unsure if backend synced | `./scripts/verify-backend-sync.sh` | Check sync status |
| Backend out of sync | `./scripts/push-backend.sh` | Sync and deploy |

---

## File Locations

### Frontend Files (Mobile-only)
- `src/` - React Native components, screens, utils
- `tests/` - Test files
- `docs/` - Documentation

### Backend Files (Must sync to both repos)
- `api/` - Vercel serverless functions
- `lib/` - Backend logic (database, types, coach, etc.)

---

## Git Workflow

### Standard Workflow

```bash
# 1. Make changes
vim src/screens/MyScreen.tsx

# 2. Test
npm run test:all

# 3. Commit and push
git add .
git commit -m "Add feature X"
git push origin master

# 4. If backend changed, sync it
./scripts/push-backend.sh
```

### Backend Change Workflow

```bash
# 1. Make backend changes
vim api/forecasts.ts

# 2. Test
npm run test:all

# 3. Commit to mobile repo
git add api/forecasts.ts
git commit -m "Add new API endpoint"
git push origin master

# 4. REQUIRED: Sync to backend repo
./scripts/push-backend.sh

# The script will:
# - Copy files to backend repo
# - Show diffs
# - Commit
# - Push to deploy
```

---

## State Management Pattern

**Always update BOTH state arrays:**

```typescript
// Update activeForecast
setActiveForecast(updatedForecast);

// Update savedForecasts (for /list visibility)
setSavedForecasts(prev =>
  prev.map(f => f.id === forecast.id ? updatedForecast : f)
);
```

---

## Backend Sync Pattern

**Always use sync functions:**

```typescript
// Import
const { updateForecastWithSync } = await import("../utils/backendSync");

// Call
const result = await updateForecastWithSync(forecastId, updates);

// Handle result
if (result.success && result.forecast) {
  setActiveForecast(result.forecast);
  setSavedForecasts(prev =>
    prev.map(f => f.id === forecastId ? result.forecast : f)
  );
}
```

---

## Available Sync Functions

| Function | Use Case |
|----------|----------|
| `createForecastWithSync()` | Create new forecast |
| `updateForecastWithSync()` | Update forecast fields (question, grounding, probability) |
| `addDriverWithSync()` | Add new driver |
| `updateDriverWithSync()` | Update existing driver (evidence, probability) |
| `removeDriverWithSync()` | Remove driver |
| `setBaseRateWithSync()` | Update base rate or external view |
| `runSimulationWithSync()` | Run Monte Carlo simulation |

---

## Troubleshooting

### "Backend out of sync" error

```bash
./scripts/push-backend.sh
```

### Tests failing

```bash
# See which tests failed
npm run test:all

# Run specific test suite
npm run test:schema
npm run test:state
```

### Pre-push hook warning about backend changes

**Don't ignore it!** After push completes:

```bash
./scripts/push-backend.sh
```

### Changes not appearing in production

Check if backend was synced:

```bash
./scripts/verify-backend-sync.sh
```

If out of sync:

```bash
./scripts/push-backend.sh
```

---

## Help

- **Architecture:** [DUAL_REPO_ARCHITECTURE.md](DUAL_REPO_ARCHITECTURE.md)
- **Contributing:** [CONTRIBUTING.md](../CONTRIBUTING.md)
- **State Management:** [STATE_INTEGRITY.md](STATE_INTEGRITY.md)
- **Testing:** [TEST_HARNESS_SUMMARY.md](TEST_HARNESS_SUMMARY.md)

---

**Remember:** Backend changes = `./scripts/push-backend.sh` 🚨
