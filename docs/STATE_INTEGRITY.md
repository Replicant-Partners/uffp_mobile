# State Integrity Testing

## Overview

State integrity tests validate that UI state remains synchronized with backend state after operations complete. These tests catch a critical class of bugs where backend operations succeed but the UI doesn't reflect the changes.

## Why State Integrity Matters

**The Problem:**
- Backend operation succeeds ✅
- No error is thrown ✅
- User can't see their data ❌

**Example Bug:**
User creates a forecast with `/question`. Backend creates forecast with ID `fct_abc123` and returns success. But the forecast doesn't appear in `/list` because `savedForecasts` state wasn't updated.

## Test Coverage

### 1. Forecast Creation (Test 1)
**Constraint:** When a forecast is created on the backend, it MUST be added to `savedForecasts` state.

**Why:** Without this, forecasts are "invisible" - they exist in the database but don't appear in `/list`.

**Fixed in:** commit `dcf6a2d`

### 2. Driver Synchronization (Test 2)
**Constraint:** When a driver is synced to backend, the `activeForecast` MUST be updated with the backend response.

**Why:** The backend may modify driver data (add IDs, timestamps, etc). If we don't update `activeForecast`, the UI shows stale data.

**Status:** Already working correctly

### 3. Simulation Execution (Test 3)
**Constraint:** When a simulation runs, `activeForecast.probability` and `activeForecast.simulations` MUST be updated.

**Why:** Users need to see:
- The calculated probability
- Simulation history for tracking changes over time

**Status:** Already working correctly (see `ForecastWorkspaceScreen.tsx:3104`)

### 4. Forecast Resolution (Test 4)
**Constraint:** When a forecast is resolved, `activeForecast.resolved`, `activeForecast.brierScore`, and `activeForecast.actualOutcome` MUST be updated.

**Why:** Users need to see:
- That the forecast is resolved (no longer active)
- Their Brier score for calibration tracking
- The actual outcome for learning

**Status:** Already working correctly (see `ForecastWorkspaceScreen.tsx:1681`)

### 5. Local Storage Clearing (Test 5)
**Constraint:** When forecasts are loaded from backend, local storage MUST be cleared.

**Why:** Prevents state conflicts where local and backend data diverge, causing duplicate forecasts or lost data.

**Status:** Already working correctly (see `ForecastWorkspaceScreen.tsx:294`)

## Running Tests

```bash
# Run state integrity tests only
npm run test:state

# Run all validation tests
npm run test:all
```

## Pre-commit Hook

State integrity tests run automatically on every commit via the pre-commit hook. If any test fails, the commit is blocked.

This prevents bugs from reaching production.

## Adding New Tests

When adding a new backend sync operation:

1. **Identify the sync function** (e.g., `createForecastWithSync`, `addDriverWithSync`)
2. **Identify the state to update** (e.g., `savedForecasts`, `activeForecast`)
3. **Add a test scenario** in `tests/stateIntegrity.test.ts`:

```typescript
{
  name: 'Your test name',
  description: 'What constraint this enforces',
  setup: () => ({
    // Before state
    stateBefore: { ... },
    // Backend response
    backendResponse: { success: true, data: { ... } },
    // After state (CORRECT behavior)
    stateAfter: { ... },
  }),
  validate: (state) => {
    // Check that stateAfter matches expectations
    if (/* state mismatch */) {
      return { valid: false, error: 'Explain the bug' };
    }
    return { valid: true };
  },
}
```

## Entity Coverage

| Entity | Backend Sync? | State Integrity Test? |
|--------|---------------|----------------------|
| Forecast | ✅ Yes | ✅ Yes (Test 1) |
| Driver | ✅ Yes | ✅ Yes (Test 2) |
| Evidence | ⚠️ Via driver | ⚠️ Covered by driver test |
| Agent | ⚠️ Via driver | ⚠️ Covered by driver test |
| Simulation | ✅ Yes | ✅ Yes (Test 3) |
| Resolution | ✅ Yes | ✅ Yes (Test 4) |

**Note:** Evidence and agents are added to `driverBeingConfigured` (in-memory state) and only synced when the driver is saved. They don't need separate state integrity tests because they're covered by the driver synchronization test.

## Best Practices

1. **Always update state after backend success**
   ```typescript
   const result = await backendSync(...);
   if (result.success) {
     setActiveForecast(result.forecast);  // ✅ Update state
     setSavedForecasts(prev => [...prev, result.forecast]); // ✅ Add to list
   }
   ```

2. **Use backend response as source of truth**
   ```typescript
   // ❌ Don't do this
   setActiveForecast({ ...localData, id: result.id });
   
   // ✅ Do this
   setActiveForecast(result.forecast);
   ```

3. **Test both activeForecast and savedForecasts**
   - `activeForecast` = what the user is currently viewing
   - `savedForecasts` = what appears in `/list`

4. **Clear local storage when backend is authoritative**
   ```typescript
   if (result.fromBackend) {
     localStorage.removeItem(STORAGE_KEY); // Prevent conflicts
   }
   ```

## Related Documentation

- [Schema Validation](./SCHEMA_ANALYSIS.md) - Data structure validation
- [Backend Sync](../src/utils/backendSync.ts) - Synchronization implementation
- [CLI Driver Creation](../tests/cliDriverCreation.test.ts) - CLI workflow tests
