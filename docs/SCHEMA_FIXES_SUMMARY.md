# Schema Fixes Implementation Summary

This document summarizes the implementation of fixes #3 and #4 from SCHEMA_ANALYSIS.md.

## Fix #3: Probability Range Standardization (0-1 vs 0-100)

### Problem
Binary drivers had inconsistent probability representation:
- Some code used 0-100 range (treating it as a percentage)
- Other code (forecast/simulation) used 0-1 range (standard probability)
- This caused validation errors and display inconsistencies

### Solution
Standardized to use **0-1 internally**, convert to 0-100 **only for display**.

### Changes Made

#### 1. Created Utility Functions
**File:** `/src/utils/probability.ts` (NEW)
- `percentToProb(percent)` - Convert user input (0-100) to internal (0-1)
- `probToPercent(prob)` - Convert internal (0-1) to display (0-100)
- `formatProbability(prob)` - Format for display as percentage string
- `isValidProbability(prob)` - Validate 0-1 range

#### 2. Updated Type Documentation
**File:** `/lib/types.ts`
- Added comment to `Driver.probability` field: `// Binary (0-1 range, e.g., 0.5 = 50%)`

#### 3. Updated Driver Creation (5 locations)
**File:** `/src/screens/ForecastWorkspaceScreen.tsx`
- Line 440: Changed default from `50` to `0.5`
- Line 2056: Changed default from `50` to `0.5`
- Line 3051: Changed default from `50` to `0.5`
- Line 5483: Changed default from `50` to `0.5`
- Line 5513: Changed default from `50` to `0.5`

#### 4. Updated /prob Command Handler
**File:** `/src/screens/ForecastWorkspaceScreen.tsx` (Line 2073)
- Now converts user input: `probability: probPercent / 100`
- User enters 0-100, stored as 0-1

#### 5. Updated Validation Logic
**File:** `/src/screens/ForecastWorkspaceScreen.tsx` (Line 774)
- Changed validation from `0-100` to `0-1` range
- Updated error message to reflect internal format

#### 6. Updated UI Display (4 locations)
**File:** `/src/screens/ForecastWorkspaceScreen.tsx`
- Line 926: Version history display - converts to percentage
- Line 1154: Initial config display - converts to percentage
- Line 4526: Driver config display - converts to percentage
- Line 4629: Driver list display - converts to percentage
- All use: `Math.round(probability * 100)` to convert 0-1 to 0-100

#### 7. Created Migration Script
**File:** `/migrate-probability-range.js` (NEW)
- Detects binary drivers with probability > 1 (old 0-100 range)
- Converts to 0-1 by dividing by 100
- Validates all probabilities are in correct range
- Run with: `node migrate-probability-range.js`

### Testing Checklist
- [ ] Create new binary driver - should default to 0.5 (displays as 50%)
- [ ] Use `/prob 75` command - should store 0.75, display as 75%
- [ ] Validate driver with no probability - should show error
- [ ] Validate driver with probability set - should pass
- [ ] View driver in list - should show percentage (e.g., "P(50%)")
- [ ] Run migration script on existing data - should convert 0-100 to 0-1

---

## Fix #4: ID Generation Standardization

### Problem
Inconsistent ID generation across the codebase:
- Backend: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
- Frontend: `Date.now().toString()`
- No semantic prefixes for different entity types
- Potential for collisions with timestamp-based IDs

### Solution
Use **nanoid** for all ID generation with semantic prefixes.

### Changes Made

#### 1. Installed nanoid
```bash
npm install nanoid
```

#### 2. Created ID Generator Utility
**File:** `/src/utils/idGenerator.ts` (NEW)
```typescript
export function generateId(size = 12): string
export function generatePrefixedId(prefix: string, size = 12): string
export const idGenerators = {
  driver: () => 'drv_' + nanoid(12)
  forecast: () => 'fct_' + nanoid(12)
  agent: () => 'agt_' + nanoid(12)
  researchSnapshot: () => 'res_' + nanoid(12)
  evidence: () => 'evd_' + nanoid(12)
  simulation: () => 'sim_' + nanoid(12)
  version: () => 'ver_' + nanoid(12)
}
```

#### 3. Updated Backend
**File:** `/lib/database.ts`
- Added import: `import { nanoid } from 'nanoid';`
- Updated `generateId()`: Changed from timestamp-based to `nanoid(12)`

#### 4. Updated Frontend Files
**File:** `/src/screens/ForecastWorkspaceScreen.tsx`
- Added import: `import { idGenerators } from "../utils/idGenerator";`
- Replaced 7 instances of `Date.now().toString()`:
  - Line 427: Driver creation → `idGenerators.driver()`
  - Line 1041: Agent creation → `idGenerators.agent()`
  - Line 1766: Agent config → `idGenerators.agent()`
  - Line 2399: Agent run → `idGenerators.agent()`
  - Line 2453: Research snapshot → `idGenerators.researchSnapshot()`
  - Line 3040: Driver creation → `idGenerators.driver()`
  - Line 5472: Driver creation → `idGenerators.driver()`

**File:** `/src/screens/CreateForecastScreen.tsx`
- Added import: `import { idGenerators } from "../utils/idGenerator";`
- Line 93: Evidence creation → `idGenerators.evidence()`

**File:** `/src/components/EvidenceManager.tsx`
- Added import: `import { idGenerators } from "../utils/idGenerator";`
- Line 35: Evidence creation → `idGenerators.evidence()`

### Benefits
1. **Better randomness**: nanoid provides cryptographically strong random IDs
2. **URL-safe**: Uses URL-safe alphabet (A-Za-z0-9_-)
3. **Collision-resistant**: 12 characters = ~3.5 trillion combinations
4. **Semantic prefixes**: Easy to identify entity type from ID
5. **Consistent**: Same ID generation logic across frontend and backend

### ID Format Examples
- Driver: `drv_V1StGXR8_Z5j`
- Agent: `agt_4f8K2h9X_L3p`
- Research: `res_9mKl4P2w_Q8n`
- Evidence: `evd_7xL3T6n9_M2k`

### Testing Checklist
- [ ] Create new driver - should have `drv_` prefix
- [ ] Create new agent - should have `agt_` prefix
- [ ] Run agent research - snapshot should have `res_` prefix
- [ ] Add evidence - should have `evd_` prefix
- [ ] Create forecast - should have `fct_` prefix (backend)
- [ ] Verify IDs are 16 characters (prefix + underscore + 12 random)
- [ ] Verify no ID collisions across multiple creations

---

## Summary Statistics

### Files Created
- `/src/utils/probability.ts` - Probability conversion utilities
- `/src/utils/idGenerator.ts` - ID generation with semantic prefixes
- `/migrate-probability-range.js` - Migration script for existing data
- `/docs/SCHEMA_FIXES_SUMMARY.md` - This document

### Files Modified
- `/lib/types.ts` - Updated Driver interface documentation
- `/lib/database.ts` - Updated backend ID generation
- `/src/screens/ForecastWorkspaceScreen.tsx` - 15 updates (probability + IDs)
- `/src/screens/CreateForecastScreen.tsx` - 2 updates (ID generation)
- `/src/components/EvidenceManager.tsx` - 2 updates (ID generation)

### Lines Changed
- Probability standardization: ~30 lines modified
- ID generation: ~15 lines modified
- New utility code: ~80 lines added
- Total: ~125 lines changed/added

### Estimated Time
- Probability fix: ~30 minutes
- ID generation fix: ~30 minutes
- Testing: ~20 minutes (pending)
- **Total: ~1 hour 20 minutes**

---

## Migration Path for Existing Data

### For Probability Range
```bash
# Run migration script to convert existing probabilities
node migrate-probability-range.js
```

### For ID Format
No migration needed - new IDs will use nanoid format, old IDs will continue to work.
The system handles both formats gracefully.

---

## Next Steps (Optional)

### Remaining Schema Issues from SCHEMA_ANALYSIS.md

**Completed:**
- ✅ #1: Agent/Research separation
- ✅ #2: Cascade deletes
- ✅ #3: Probability range standardization
- ✅ #4: ID generation patterns
- ✅ #7: Orphaned data cleanup

**Remaining (Lower Priority):**
- #5: Driver type validation (enforce binary vs continuous constraints)
- #6: Evidence source validation (URL format, date format)
- #8: Version history integrity (ensure version numbers increment correctly)
- #9: Simulation snapshot validation (ensure driverSnapshot matches current drivers)
- #10: Research result attachment validation (ensure attachedToDriverId exists)

These can be addressed in future iterations as needed.
