# Backend Sync Status - February 3, 2026

## Overview
This document tracks which commands sync data to backend vs. only saving locally.

## ✅ Commands with Backend Sync (FIXED)

| Command | Syncs Via | Status | Commit |
|---------|-----------|--------|--------|
| `/question` | `createForecastWithSync()` | ✅ Syncs | Already working |
| `/driver` + `/save` (new) | `addDriverWithSync()` | ✅ Syncs | Already working |
| `/driver` + `/save` (existing) | `updateDriverWithSync()` | ✅ Syncs | **8726cf5** (Feb 3) |
| `/base-rate` | `setBaseRateWithSync()` | ✅ Syncs | **b77e719** (Feb 3) |
| `/external` | `setBaseRateWithSync()` | ✅ Syncs | **b77e719** (Feb 3) |
| `/simulate` | `runSimulationWithSync()` | ✅ Syncs | Already working |
| `/remove driver` | `removeDriverWithSync()` | ✅ Syncs | **7cda926** (Feb 3) |

## ⚠️ Commands WITHOUT Backend Sync (NEED FIXING)

These commands only save to localStorage. Changes are lost when reloading from backend.

### High Priority

| Command | What It Modifies | Backend Endpoint Needed | Risk Level |
|---------|-----------------|------------------------|------------|
| `/edit question` | `forecast.question` | `action=updateForecast` | **HIGH** - Users edit questions and changes disappear |
| `/grounding` | `forecast.grounding` | `action=updateForecast` | **HIGH** - Grounding strategy lost on reload |
| `/setprob` | `forecast.probability` | `action=updateForecast` | **HIGH** - Manual probability overrides lost |

### Medium Priority

| Command | What It Modifies | Backend Endpoint Needed | Risk Level |
|---------|-----------------|------------------------|------------|
| `addFermiMessage()` | `forecast.fermiConversation[]` | `action=updateForecast` or separate endpoint | **MEDIUM** - Conversation history lost for backend forecasts |
| `/run agent` (saved driver) | `driver.evidence[]`, `driver.versionHistory[]` | Uses `updateDriverWithSync()` now? | **MEDIUM** - Need to verify if fixed by driver update sync |

### Low Priority

| Command | What It Modifies | Backend Endpoint Needed | Risk Level |
|---------|-----------------|------------------------|------------|
| `/premortem` | `forecast.premortem`, `forecast.grounding` | `action=updateForecast` | **LOW** - Feature marked "coming soon", low usage |

## Backend API Gaps

The backend needs a general forecast update endpoint:

```typescript
// Backend needs this endpoint:
POST /api/forecasts?action=updateForecast
Body: {
  forecastId: string,
  updates: {
    question?: string,
    grounding?: string,
    probability?: number,
    premortem?: object,
    fermiConversation?: array,
    // ... other forecast-level fields
  }
}
```

Currently the backend has:
- ✅ `action=addDriver` - add new driver
- ✅ `action=updateDriver` - update existing driver  
- ✅ `action=removeDriver` - remove driver
- ✅ `action=setBaseRate` - update external view/base rate
- ✅ `action=simulate` - run simulation
- ❌ `action=updateForecast` - **MISSING** - needed for question, grounding, probability, etc.

## Workaround Until Backend Fixed

For the commands that need `action=updateForecast`, we have two options:

### Option 1: Use Existing `updateForecast` Method (Frontend Has It)
The frontend already has `researchService.updateForecast()` but the backend doesn't implement `action=update`. This is dead code that never works.

**Code location:** `src/services/researchService.ts:338`

### Option 2: Wait for Backend Implementation
Backend team needs to add the `updateForecast` endpoint handler in:
- `uffp-backend/api/forecasts.ts`
- `uffp-backend/lib/database.ts`

## Recommended Fix Order

1. **Backend Work Required:**
   - Add `action=updateForecast` endpoint to backend
   - Add `updateForecast()` function to database.ts
   - Support updating: question, grounding, probability, premortem, fermiConversation

2. **Frontend Work (After Backend Ready):**
   - Create `updateForecastWithSync()` in backendSync.ts
   - Update `/edit question` to use it
   - Update `/grounding` to use it  
   - Update `/setprob` to use it
   - Update `/premortem` to use it
   - Update `addFermiMessage()` to use it

## Testing Strategy

After fixes, add state integrity tests:
- Test 11: Question edit syncs to backend
- Test 12: Grounding change syncs to backend
- Test 13: Manual probability syncs to backend
- Test 14: Fermi conversation syncs to backend

## Impact Assessment

### Current Situation
Users experience "phantom edits" where:
1. User edits question with `/edit question`
2. Question appears changed in current session
3. User navigates away or refreshes
4. Old question reappears from backend (backend never got the update)

Same issue affects:
- Grounding strategy changes
- Manual probability overrides  
- Premortem settings
- Fermi conversation history

### After Full Fix
All user actions will persist across:
- Navigation (already fixed with overnight state sync patches)
- Page reloads (requires backend sync - partially fixed)
- Multiple devices (requires backend sync - partially fixed)

## Progress Summary

**Total Commands Analyzed:** 15

**Backend Sync Status:**
- ✅ **7 commands** syncing correctly (47%)
- ⚠️ **5 commands** need fixing (33%)
- ✅ **3 commands** are OK (staged changes in driver config) (20%)

**Bugs Fixed Today:**
1. Base rate disappearing - b77e719
2. External view disappearing - b77e719
3. Evidence disappearing - 8726cf5
4. Driver removal not persisting - 7cda926

**Bugs Remaining:**
1. Question edits not persisting (needs backend)
2. Grounding changes not persisting (needs backend)
3. Manual probability not persisting (needs backend)
4. Fermi conversation not persisting (needs backend)
5. Premortem settings not persisting (needs backend)

## Related Documentation

- **STATE_SYNC_BUG_FIXES.md** - Overnight fixes for 11 local state sync bugs
- **STATE_INTEGRITY.md** - State synchronization patterns
- **TEST_HARNESS_SUMMARY.md** - Test coverage (30 tests)

---

**Last Updated:** February 3, 2026  
**Next Action:** Backend team needs to implement `action=updateForecast` endpoint  
**Tracking Issue:** TBD
