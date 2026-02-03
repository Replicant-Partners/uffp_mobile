# Contributing to UFFP Mobile

Thank you for contributing! Please follow these guidelines to ensure code quality and smooth deployments.

## 🚨 CRITICAL RULES

### Rule #1: Backend Changes MUST Be Pushed to Both Repos

**This is the most important rule in the project.**

When you modify ANY file in `api/` or `lib/`:

1. ✅ Commit and push to **mobile repo** (`uffp_mobile`)
2. ✅ **MUST ALSO** push to **backend repo** (`uffp-backend`)

**Why?** The mobile repo is for development, but only the backend repo is deployed to Vercel production.

**Use the automated script:**

```bash
# After committing to mobile repo:
./scripts/push-backend.sh
```

The script will:
- Copy changed backend files
- Show diffs for review
- Commit and push to backend repo
- Deploy to production

**See:** [DUAL_REPO_ARCHITECTURE.md](docs/DUAL_REPO_ARCHITECTURE.md) for details.

### Rule #2: All Tests Must Pass

Before committing:

```bash
npm run test:all
```

This runs:
- **16 schema validation tests** - Ensure data structure is valid
- **4 CLI driver tests** - Verify CLI workflow
- **13 state integrity tests** - Check UI/backend sync

**Pre-commit hooks will block commits if tests fail.**

### Rule #3: Backend Sync Must Be Verified

Before considering your work complete:

```bash
./scripts/verify-backend-sync.sh
```

If it shows "OUT OF SYNC":

```bash
./scripts/push-backend.sh
```

## Development Workflow

### 1. Setting Up

```bash
# Clone both repos
git clone https://github.com/Replicant-Partners/uffp_mobile.git
git clone https://github.com/Replicant-Partners/uffp-backend.git

# Install dependencies
cd uffp_mobile
npm install
```

### 2. Making Changes

#### Frontend-Only Changes (`src/`)

```bash
# Edit files in src/
git add src/
git commit -m "Add feature X"
git push origin master

# Done! Frontend-only changes don't need backend sync
```

#### Backend Changes (`api/`, `lib/`)

```bash
# Edit files in api/ or lib/
git add api/ lib/
git commit -m "Add API endpoint Y"
git push origin master

# ⚠️ CRITICAL: Now sync to backend repo
./scripts/push-backend.sh

# Verify
./scripts/verify-backend-sync.sh
```

### 3. Before Submitting PR

Run full test suite:

```bash
npm run test:all
```

Verify backend sync:

```bash
./scripts/verify-backend-sync.sh
```

## Code Standards

### TypeScript

- Use strict mode
- Avoid `any` types - use proper interfaces
- Export types from `lib/types.ts`

### State Management

**ALWAYS update BOTH state arrays when modifying forecasts or drivers:**

```typescript
// ✅ CORRECT
setActiveForecast(updated);
setSavedForecasts(prev => prev.map(f => f.id === id ? updated : f));

// ❌ WRONG - Only updates activeForecast
setActiveForecast(updated);
```

**See:** [STATE_INTEGRITY.md](docs/STATE_INTEGRITY.md)

### Backend Sync Pattern

When modifying forecast/driver data, use sync functions:

```typescript
// ✅ CORRECT - Syncs to backend
const { updateForecastWithSync } = await import("../utils/backendSync");
const result = await updateForecastWithSync(forecastId, { question: newQuestion });

if (result.success && result.forecast) {
  setActiveForecast(result.forecast);
  setSavedForecasts(prev => prev.map(f => f.id === id ? result.forecast : f));
}

// ❌ WRONG - Only saves locally
const updated = { ...forecast, question: newQuestion };
setActiveForecast(updated);
await saveForecast(updated); // Only saves to localStorage!
```

**Available sync functions:**
- `createForecastWithSync()` - Create new forecast
- `updateForecastWithSync()` - Update forecast fields
- `addDriverWithSync()` - Add new driver
- `updateDriverWithSync()` - Update existing driver
- `removeDriverWithSync()` - Remove driver
- `setBaseRateWithSync()` - Update base rate
- `runSimulationWithSync()` - Run Monte Carlo simulation

## Testing

### Schema Validation Tests

Add tests when modifying data structures:

```bash
npm run test:schema
```

Located in: `tests/schemaValidator.test.ts`

### State Integrity Tests

Add tests when modifying UI state management:

```bash
npm run test:state
```

Located in: `tests/stateIntegrity.test.ts`

### CLI Driver Tests

Ensure CLI commands create valid data:

```bash
npm run test:cli
```

Located in: `tests/cliDriverCreation.test.ts`

## Common Mistakes

### ❌ Mistake #1: Forgetting Backend Sync

```bash
# Changed api/forecasts.ts
git commit -m "Fix API"
git push origin master
# ⚠️ FORGOT TO SYNC BACKEND - Production broken!
```

**Fix:** Always run `./scripts/push-backend.sh` after backend changes.

### ❌ Mistake #2: Only Updating activeForecast

```typescript
// User adds evidence
const updated = { ...activeForecast, evidence: [...evidence, newEvidence] };
setActiveForecast(updated);
// ⚠️ FORGOT savedForecasts - evidence disappears in /list!
```

**Fix:** Always update BOTH state arrays.

### ❌ Mistake #3: Not Using Backend Sync Functions

```typescript
// User edits question
forecast.question = newQuestion;
await saveForecast(forecast);
// ⚠️ Only saves to localStorage - disappears on reload!
```

**Fix:** Use `updateForecastWithSync()`.

## Git Hooks

### Pre-Commit Hook

Runs tests before committing:
- Schema validation (16 tests)
- CLI driver creation (4 tests)
- State integrity (13 tests)

**Total: 33 tests must pass**

### Pre-Push Hook

Warns if backend files changed but backend repo not synced:

```
⚠ WARNING: Backend files were modified!

Changed backend files:
  - api/forecasts.ts
  - lib/database.ts

IMPORTANT: These changes must also be pushed to uffp-backend repo!

After this push completes, run:
  ./scripts/push-backend.sh
```

**Don't ignore this warning!**

## Documentation

When making significant changes, update:

- `CHANGELOG.md` - User-facing changes
- `docs/BACKEND_SYNC_STATUS.md` - Backend sync status
- `docs/STATE_INTEGRITY.md` - State management patterns
- `docs/TEST_HARNESS_SUMMARY.md` - Test coverage

## Getting Help

- **Dual-repo questions:** See [DUAL_REPO_ARCHITECTURE.md](docs/DUAL_REPO_ARCHITECTURE.md)
- **State sync questions:** See [STATE_INTEGRITY.md](docs/STATE_INTEGRITY.md)
- **Test questions:** See [TEST_HARNESS_SUMMARY.md](docs/TEST_HARNESS_SUMMARY.md)

## Questions?

Ask in #development channel or open a GitHub issue.

---

**Most Important Rule:** Backend changes (`api/`, `lib/`) MUST be pushed to BOTH repos!

Use: `./scripts/push-backend.sh` after every backend change.
