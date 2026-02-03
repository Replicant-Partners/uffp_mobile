# State Synchronization Bug Fixes - February 3, 2026

## Executive Summary

Fixed 11 critical state synchronization bugs where modifications to `activeForecast` were not propagating to `savedForecasts` array, causing data to disappear when users navigated away and returned.

**Discovery:** User reported evidence disappearing after navigation on mobile device. Investigation revealed a systematic pattern affecting multiple features.

**Impact:** High-severity - users experienced data loss across evidence, driver management, and forecast edits.

**Status:** ✅ All bugs fixed, 4 new tests added, 29/29 tests passing

---

## The Bug Pattern

### Root Cause
React state management in ForecastWorkspaceScreen.tsx maintains two separate state arrays:
- `activeForecast` - The currently displayed forecast
- `savedForecasts` - Array of all forecasts shown in `/list`

When `activeForecast` was updated but `savedForecasts` wasn't synced, changes appeared in the current view but disappeared when navigating to `/list` and back.

### How It Manifested
1. User adds evidence: "adding evidence also worked, but then when i backed out and came back the evidence was gone in the ui"
2. Data appears to save successfully (updates `activeForecast`)
3. Navigate to `/list` - changes not visible
4. Click forecast to reload - evidence/changes missing (loaded from stale `savedForecasts`)

---

## Bugs Fixed

### High Severity (Critical User Impact)

#### 1. Evidence Disappearing (Line 2087) ⭐ **User-Reported**
**Location:** `src/screens/ForecastWorkspaceScreen.tsx:2087`

**Command:** `/run @agent` (agent research results)

**Symptoms:** 
- Evidence added via agent research appears immediately
- Navigate away → evidence gone
- Driver shows evidence count but detail view empty

**Fix:**
```typescript
setActiveForecast(updatedForecast);
// ADD THIS:
setSavedForecasts(prev => 
  prev.map(f => f.id === activeForecast.id ? updatedForecast : f)
);
await saveForecast(updatedForecast);
```

**Test Added:** Test 6 - "Evidence additions update both activeForecast AND savedForecasts"

---

#### 2. Driver Removal Not Persisting (Line 3422)
**Location:** `src/screens/ForecastWorkspaceScreen.tsx:3422`

**Command:** `/remove driver <name>`

**Symptoms:**
- Remove driver → appears removed
- Navigate to `/list` → driver count updates
- Click forecast → driver reappears (zombie driver!)

**Fix:** Same pattern - sync `savedForecasts` after `setActiveForecast`

**Test Added:** Test 7 - "Driver removal updates both activeForecast AND savedForecasts"

---

#### 3. UI Driver Addition (Line 6018)
**Location:** `src/screens/ForecastWorkspaceScreen.tsx:6018`

**Command:** Click decomposition chip to add driver from UI

**Symptoms:**
- Add driver via UI → appears in workspace
- Navigate to `/list` → driver not in list
- Count badge shows 0 but driver exists in `activeForecast`

**Fix:** Same pattern - sync `savedForecasts` after adding driver

**Impact:** Affected Fermi decomposition workflow where users add drivers via chip suggestions

---

### Medium Severity (Data Inconsistency)

#### 4. External View Reference Class (Line 2861)
**Command:** `/external <reference class>`

**Symptoms:** Reference class updates in current view but old value shows in `/list`

**Fix:** Sync `savedForecasts` when updating external view

---

#### 5. Base Rate Changes (Line 2907)
**Command:** `/base-rate <percentage>`

**Symptoms:** Base rate updates appear to save but revert when navigating

**Fix:** Sync `savedForecasts` when updating base rate

**Test Added:** Test 9 - "Base rate updates sync to savedForecasts"

---

#### 6. Question Edits (Line 3504)
**Command:** `/edit question <new text>`

**Symptoms:** Question updates in workspace but old question shows in `/list`

**Fix:** Sync `savedForecasts` when editing question

**Test Added:** Test 8 - "Question edits update both activeForecast AND savedForecasts"

**Impact:** Particularly bad UX - users see old question in list, confusing them about which forecast they're viewing

---

### Low Severity (Less Frequent Features)

#### 7. Fermi Conversation Updates (Line 591)
**Feature:** Fermi AI chat messages

**Symptoms:** Conversation history not persisting in `/list` view

**Fix:** Sync `savedForecasts` after adding Fermi message

---

#### 8. Premortem Status (Line 2967)
**Command:** `/premortem`

**Symptoms:** Premortem mode flag not persisting

**Fix:** Sync `savedForecasts` when setting premortem status

---

#### 9. Grounding Method Changes (Line 2994)
**Command:** `/grounding <method>`

**Symptoms:** Grounding method reverts after navigation

**Fix:** Sync `savedForecasts` when updating grounding method

---

#### 10. Manual Probability Override (Line 3030)
**Command:** `/setprob <percentage>`

**Symptoms:** Manual probability overrides not persisting

**Fix:** Sync `savedForecasts` when setting probability manually

---

#### 11. Simulation Fallback (Line 3128)
**Command:** `/simulate` (fallback path)

**Symptoms:** Simulation probability not persisting in edge cases

**Fix:** Sync `savedForecasts` in simulation fallback branch

**Note:** Main simulation path already had correct sync via `runSimulationWithSync`

---

## Test Coverage Enhancement

### New Tests Added (4)

#### Test 6: Evidence State Sync
```typescript
name: "Evidence additions update both activeForecast AND savedForecasts"
```
Validates evidence added via `/evidence` or agent research persists in both state arrays.

**Why It Matters:** This is the exact bug user discovered on mobile.

---

#### Test 7: Driver Removal State Sync
```typescript
name: "Driver removal updates both activeForecast AND savedForecasts"
```
Validates driver removal via `/remove driver` persists across navigation.

**Why It Matters:** Prevents zombie drivers that reappear after removal.

---

#### Test 8: Question Edit State Sync
```typescript
name: "Question edits update both activeForecast AND savedForecasts"
```
Validates question updates via `/edit question` show in `/list`.

**Why It Matters:** Question text in list is primary UI for forecast identification.

---

#### Test 9: Base Rate State Sync
```typescript
name: "Base rate updates sync to savedForecasts"
```
Validates base rate changes via `/base-rate` persist in `/list`.

**Why It Matters:** Base rate is core to external view forecasting methodology.

---

## Test Results

### Before Fixes
- **Schema Tests:** 16/16 passing ✅
- **CLI Tests:** 4/4 passing ✅
- **State Integrity Tests:** 5/5 passing ⚠️ (but Test 2 was incomplete)

**Problem:** Test 2 only checked `activeForecast`, missing the bug!

### After Fixes
- **Schema Tests:** 16/16 passing ✅
- **CLI Tests:** 4/4 passing ✅
- **State Integrity Tests:** 9/9 passing ✅

**Total:** 29/29 tests passing

**Pre-commit Hook:** All tests run automatically, catching future regressions

---

## The Fix Pattern

### Standard Fix (Applied to All 11 Locations)

```typescript
// BEFORE (buggy code):
const updatedForecast = {
  ...activeForecast,
  [field]: newValue,
  updatedAt: new Date().toISOString(),
};

setActiveForecast(updatedForecast);
await saveForecast(updatedForecast);

// AFTER (fixed code):
const updatedForecast = {
  ...activeForecast,
  [field]: newValue,
  updatedAt: new Date().toISOString(),
};

setActiveForecast(updatedForecast);
// ⭐ ADD THIS LINE:
setSavedForecasts(prev => 
  prev.map(f => f.id === activeForecast.id ? updatedForecast : f)
);
await saveForecast(updatedForecast);
```

### Why This Works
1. **Immutable Update:** `map()` creates new array reference, triggering React re-render
2. **ID Matching:** Only updates the specific forecast being modified
3. **Preserves Others:** Other forecasts in array remain unchanged
4. **Atomic:** State update is synchronous, no race conditions

---

## Code Locations Reference

| Line | Command/Feature | Severity | Status |
|------|----------------|----------|--------|
| 591 | Fermi conversation | Low | ✅ Fixed |
| 2087 | Agent research (evidence) | **High** | ✅ Fixed |
| 2861 | External view reference class | Medium | ✅ Fixed |
| 2907 | Base rate updates | Medium | ✅ Fixed |
| 2967 | Premortem status | Low | ✅ Fixed |
| 2994 | Grounding method | Low | ✅ Fixed |
| 3030 | Manual probability | Low | ✅ Fixed |
| 3128 | Simulation fallback | Low | ✅ Fixed |
| 3422 | Driver removal | **High** | ✅ Fixed |
| 3504 | Question edits | Medium | ✅ Fixed |
| 6018 | UI driver click | **High** | ✅ Fixed |

---

## Impact Assessment

### User Experience
**Before:** Frustrating data loss, users questioning if data was actually saved

**After:** All changes persist across navigation, consistent UX

### Data Integrity
**Before:** Silent data loss - no error messages, just missing data

**After:** All state updates atomic and synchronized

### Test Coverage
**Before:** 25 tests, state integrity tests incomplete

**After:** 29 tests, comprehensive state sync validation

---

## Lessons Learned

### 1. Test What Users Actually Do
**Mistake:** Test 2 only checked `activeForecast` after backend sync.

**User Behavior:** Navigate to `/list` and back - loads from `savedForecasts`.

**Fix:** Enhanced Test 2 to check BOTH state arrays.

**Quote from User:** "this should have been caught by our new test cases!"

### 2. State Duplication Creates Sync Bugs
**Architecture Issue:** Maintaining two state arrays (`activeForecast` + `savedForecasts`) requires disciplined synchronization.

**Better Pattern:** Single source of truth, or automated sync layer.

**Future Work:** Consider architectural refactor to eliminate dual state.

### 3. Bug Patterns Are Systematic
**Discovery:** Finding one instance (evidence) led to finding 10 more.

**Lesson:** When you find a pattern bug, search for ALL instances immediately.

**Tool:** Used Task agent to analyze all `setActiveForecast` calls - found 11 bugs in minutes.

### 4. Mobile Testing Reveals Hidden Bugs
**User's Discovery:** "ok i just tried on my phone and it worked. adding evidence also worked, but then when i backed out and came back the evidence was gone"

**Why Mobile Matters:** Navigation patterns differ - users navigate away more frequently.

**Lesson:** Always test on mobile, especially state persistence and navigation.

---

## Prevention Strategy

### For Future Development

#### 1. Use State Sync Helper
Create a wrapper function:

```typescript
const updateForecast = (updater: (prev: SavedForecast) => SavedForecast) => {
  const updated = updater(activeForecast);
  setActiveForecast(updated);
  setSavedForecasts(prev => 
    prev.map(f => f.id === updated.id ? updated : f)
  );
  return updated;
};

// Usage:
updateForecast(f => ({
  ...f,
  question: newQuestion,
  updatedAt: new Date().toISOString(),
}));
```

#### 2. Add Pre-commit Hook Enforcement
Already implemented! Pre-commit hook runs all 29 tests:
```bash
npm run test:all  # Runs schema + CLI + state integrity
```

#### 3. State Integrity Test for Every Feature
When adding new features that modify `activeForecast`, add corresponding state integrity test:

```typescript
{
  name: "New feature updates both activeForecast AND savedForecasts",
  description: "...",
  validate: (state) => {
    // Check activeForecast
    // Check savedForecasts
    // Return error if mismatch
  }
}
```

#### 4. Code Review Checklist
When reviewing PRs that modify forecast state:
- [ ] Does it call `setActiveForecast`?
- [ ] Does it also update `savedForecasts`?
- [ ] Is there a state integrity test?
- [ ] Does the test check BOTH state arrays?

---

## Related Documentation

- **TEST_HARNESS_SUMMARY.md** - Overview of all 29 tests
- **HOW_TO_BUILD_REGRESSION_HARNESS.md** - Guide for building test harnesses
- **STATE_INTEGRITY.md** - Deep dive on state synchronization patterns
- **tests/stateIntegrity.test.ts** - Test implementation

---

## Commit History

### Main Fix Commit
```
feeb245 - Fix 11 state sync bugs: evidence, removal, edits, base rate, and more
```

**Files Changed:**
- `src/screens/ForecastWorkspaceScreen.tsx` - 11 sync fixes
- `tests/stateIntegrity.test.ts` - 4 new tests

**Lines Changed:** +439 insertions

**Test Results:** 29/29 passing (16 schema + 4 CLI + 9 state integrity)

---

## Acknowledgments

**Bug Discovery:** User testing on mobile device revealed evidence disappearing pattern

**User Quote:** "ok i just tried on my phone and it worked. adding evedince also worked, but then when i backed out and came back he evidence was gone in the ui. sother eis some real weirdness happening."

**Overnight Fix Request:** "can you do that now and surprise me in the morning? include updates to the integrit tests please and see if th epattern is a heappening anywhere else."

**Outcome:** All 11 bugs fixed, 4 tests added, comprehensive documentation created

---

## Questions?

For technical questions about these fixes, see:
- Code comments in ForecastWorkspaceScreen.tsx (lines marked "Update savedForecasts so X appears in /list")
- State integrity test implementations in tests/stateIntegrity.test.ts
- STATE_INTEGRITY.md for architectural patterns

---

**Last Updated:** February 3, 2026  
**Status:** ✅ All fixes deployed and tested  
**Next Steps:** Monitor production for any remaining edge cases
