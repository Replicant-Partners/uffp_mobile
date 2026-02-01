# Version Tracking Workflow

## Current Implementation Status

### ✅ Driver-Level Version Tracking (Implemented)

**How it works:**
1. When you create a new driver, it starts at v1.0
2. When you edit a driver and make **major changes**, a new version is created
3. Major changes are detected automatically

**Major changes include:**
- Any p-value change (p5, p50, p95)
- Any probability change (for binary drivers)
- Type change (continuous ↔ binary)
- Direction change (increases ↔ decreases)
- Distribution change (triangular/normal/lognormal)

**Minor changes include:**
- Evidence additions (manual or from agents)
- Name changes
- Other cosmetic changes

**Workflow:**
1. Edit a driver by clicking on it
2. Make changes using `/p`, `/prob`, `/type`, `/direction`, `/dist` commands
3. When you type `/save`:
   - If major changes detected → Warning banner appears with change list
   - Choose "Save Changes" to confirm (increments major version)
   - Or "Continue Editing" to keep modifying
4. After save, driver shows new version badge (e.g., v2.0)
5. Use `/history` command while editing driver to see version timeline

**Commands:**
- `/history` - View version timeline for current driver (shows in error area)
- Version badges appear on driver cards automatically

**Testing checklist for drivers:**
- [ ] Create new driver → should be v1.0
- [ ] Edit driver p-values → should trigger major change warning
- [ ] Save with major changes → should increment to v2.0
- [ ] Edit driver evidence → should NOT trigger warning (minor change)
- [ ] Use `/history` → should show version timeline with changes
- [ ] Version badge should appear on driver card

---

### ⚠️ Forecast-Level Version Tracking (Partially Implemented)

**Current status:**
- Forecasts initialize with v1.0 when created
- Version field exists on SavedForecast interface
- Version badge displays on forecast header
- **BUT**: No auto-increment logic for forecast versions yet

**What needs to be implemented:**
1. Detect when forecast-level changes occur:
   - External view changes
   - Pre-mortem changes
   - Grounding changes
   - Driver additions/removals
   - Simulation runs with new results
2. Auto-increment forecast version when these changes happen
3. Store forecast-level version history (similar to drivers)
4. Add `/history` command at forecast level (not just driver level)

**Temporary workflow:**
- Forecasts show v1.0 badge
- Badge is visible but version doesn't increment yet
- Need to add logic to detect forecast-level changes and create forecast versions

---

## What Got Broken in Recent Changes

### Issues fixed:
1. ✅ Evidence not syncing to backend → Fixed (now includes evidence/agents/version fields)
2. ✅ Agent autocomplete broken → Fixed (proper @ replacement logic)
3. ✅ Hints not clickable → Fixed (delay on onBlur)
4. ✅ Hints cut off → Fixed (ScrollView with maxHeight)
5. ✅ Evidence not readable → Fixed (expandable cards with full results)

### Known issues to address:
1. Forecast versions don't increment (only initialize to v1.0)
2. Override warnings only appear in console, not in UI
3. Driver suggestions could be enriched with Fermi estimation context

---

## Next Steps

### Priority 1: Complete Forecast Version Tracking
Add auto-increment logic for forecast versions when:
- `/external` command changes reference class
- `/grounding` command changes grounding
- Drivers are added/removed
- Major simulation results change

### Priority 2: Surface Override Warnings
Move console warnings about AI recommendation overrides to the UI banner

### Priority 3: Enrich Driver Suggestions
Add Fermi estimation context to AI driver analysis for richer suggestions

---

## File Locations

**Main file:** `src/screens/ForecastWorkspaceScreen.tsx`

**Key sections:**
- Lines 18-62: Version tracking interfaces
- Lines 387-456: `createDriverVersion()` function
- Lines 459-517: `detectMajorChanges()` function
- Lines 518-650: `saveConfiguredDriver()` with version logic
- Lines 1091-1129: `/history` command handler
- Lines 2754-2842: Driver cards with version badges and expandable evidence
- Lines 2244-2254: Forecast header with version badge

**Backend sync:** `src/utils/backendSync.ts`
- Lines 121-133: Initialize forecasts with v1.0
- Lines 562-575: Send version data when adding drivers
