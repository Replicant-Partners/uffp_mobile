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
| `/edit question` | `updateForecastWithSync()` | ✅ Syncs | **9a4ac2f** (Feb 3) |
| `/grounding` | `updateForecastWithSync()` | ✅ Syncs | **9a4ac2f** (Feb 3) |
| `/setprob` | `updateForecastWithSync()` | ✅ Syncs | **9a4ac2f** (Feb 3) |

## ⚠️ Commands WITHOUT Backend Sync (NEED FIXING)

These commands only save to localStorage. Changes are lost when reloading from backend.

### High Priority

**NONE - All high priority commands now fixed!**

### Medium Priority

| Command | What It Modifies | Backend Endpoint Needed | Risk Level |
|---------|-----------------|------------------------|------------|
| `addFermiMessage()` | `forecast.fermiConversation[]` | `action=updateForecast` or separate endpoint | **MEDIUM** - Conversation history lost for backend forecasts |
| `/run agent` (saved driver) | `driver.evidence[]`, `driver.versionHistory[]` | Uses `updateDriverWithSync()` now? | **MEDIUM** - Need to verify if fixed by driver update sync |

### Low Priority

| Command | What It Modifies | Backend Endpoint Needed | Risk Level |
|---------|-----------------|------------------------|------------|
| `/premortem` | `forecast.premortem`, `forecast.grounding` | `action=updateForecast` | **LOW** - Feature marked "coming soon", low usage |

## Backend API Status

The backend now has all necessary forecast endpoints:

```typescript
// ✅ NOW IMPLEMENTED in commit 9a4ac2f:
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

Backend endpoints available:
- ✅ `action=addDriver` - add new driver
- ✅ `action=updateDriver` - update existing driver  
- ✅ `action=removeDriver` - remove driver
- ✅ `action=setBaseRate` - update external view/base rate
- ✅ `action=simulate` - run simulation
- ✅ `action=updateForecast` - **NOW AVAILABLE** - updates question, grounding, probability, etc.

## Implementation Complete ✅

All high-priority backend sync issues have been resolved:

### Backend Work (Commit 9a4ac2f):
   - ✅ Added `action=updateForecast` endpoint to `api/forecasts.ts`
   - ✅ Imported `updateForecast()` from `database.ts` (already existed)
   - ✅ Supports updating: question, grounding, probability, and any forecast-level field

### Frontend Work (Commit 9a4ac2f):
   - ✅ Created `updateForecastWithSync()` in `src/utils/backendSync.ts`
   - ✅ Updated `/edit question` to use it
   - ✅ Updated `/grounding` to use it  
   - ✅ Updated `/setprob` to use it
   
### Remaining Low Priority:
   - ⚠️ `/premortem` - Can use `updateForecastWithSync()` when feature is implemented
   - ⚠️ `addFermiMessage()` - Can use `updateForecastWithSync()` for conversation history (medium priority)

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
- ✅ **10 commands** syncing correctly (67%)
- ⚠️ **2 commands** need fixing (13%) - low priority
- ✅ **3 commands** are OK (staged changes in driver config) (20%)

**Bugs Fixed Today (February 3, 2026):**
1. Base rate disappearing - b77e719
2. External view disappearing - b77e719
3. Evidence disappearing - 8726cf5
4. Driver removal not persisting - 7cda926
5. Question edits not persisting - 9a4ac2f ✨ **NEW**
6. Grounding changes not persisting - 9a4ac2f ✨ **NEW**
7. Manual probability not persisting - 9a4ac2f ✨ **NEW**

**Bugs Remaining (Low Priority):**
1. Fermi conversation not persisting (medium priority - can use `updateForecastWithSync()`)
2. Premortem settings not persisting (low priority - feature not yet implemented)

## Related Documentation

- **STATE_SYNC_BUG_FIXES.md** - Overnight fixes for 11 local state sync bugs
- **STATE_INTEGRITY.md** - State synchronization patterns
- **TEST_HARNESS_SUMMARY.md** - Test coverage (30 tests)

---

**Last Updated:** February 3, 2026  
**Status:** ✅ **All high-priority backend sync issues resolved**  
**Commits:** b77e719, 8726cf5, 7cda926, 9a4ac2f
