# CLI Workflow vs Schema Audit

## Schema Requirements (from Driver interface)

### Required Fields
- ✅ id
- ✅ name  
- ✅ type
- ✅ direction
- ✅ agents (array)
- ✅ researchResults (array)
- ✅ evidence (array)
- ✅ version: { major, minor }
- ✅ versionHistory (array)
- ✅ createdAt
- ❓ updatedAt

### Optional Fields
- ✅ description
- ✅ probability (binary)
- ✅ p5, p50, p95 (continuous)
- ✅ distribution (continuous)
- ✅ aiRecommendation
- ✅ resolutionDate

## CLI Driver Creation Analysis

### Location 1: AI Driver Creation (Line 426)
**Command:** `/driver <name>` or suggestion chip

**Creates:**
```typescript
{
  id: idGenerators.driver(),           // ✅
  name: suggestedDriver,                // ✅
  type: recommendation.type,            // ✅
  direction: recommendation.direction,  // ✅
  agents: [],                           // ✅
  evidence: [],                         // ✅
  createdAt: new Date().toISOString(),  // ✅
  aiRecommendation: recommendation,     // ✅
  version: { major: 1, minor: 0 },     // ✅
  versionHistory: [],                   // ✅
  // + probability or p5/p50/p95 based on type
}
```

**Missing:**
- ❌ updatedAt
- ❌ researchResults (empty array not added)

### Location 2: Custom Driver with AI (Line 3039)
**Command:** User types custom driver name

**Creates:** Same as Location 1

**Missing:** Same as Location 1

### Location 3: Loading from Backend (Line 5472)
**Command:** Loading saved forecast

**Creates:**
```typescript
{
  id: Date.now().toString(),  // ⚠️ OLD FORMAT (should use idGenerators)
  name: driverData.name,
  type: driverType,
  agents: [],
  evidence: [],
  researchResults: [],        // ✅ Added
  // ... rest from driverData
}
```

**Issues:**
- ⚠️ Uses old ID format instead of idGenerators
- May be missing version/versionHistory if not in saved data

## Findings

### ✅ Good News
1. **Direction field:** Already included in CLI creation ✅
2. **AI Recommendation:** Stored properly ✅
3. **Version tracking:** Created with v1.0 ✅
4. **Probability:** Uses 0-1 range correctly ✅
5. **Arrays initialized:** agents, evidence, versionHistory ✅

### ⚠️ Issues Found

#### Issue 1: Missing `updatedAt` field
**Where:** All driver creation points
**Impact:** Schema requires Date but CLI doesn't set it
**Severity:** Medium - Missing required field

#### Issue 2: Missing `researchResults` initialization
**Where:** Lines 426, 3039 (AI driver creation)
**Impact:** Field exists but not initialized to empty array
**Severity:** Low - Backend may handle it, but inconsistent

#### Issue 3: Old ID format on load (Line 5472)
**Where:** When creating drivers from loaded data
**Impact:** Uses `Date.now().toString()` instead of `idGenerators.driver()`
**Severity:** Low - Only affects loaded data recreation

#### Issue 4: No validation before save
**Where:** CLI doesn't validate driver before allowing save
**Impact:** Users could save invalid drivers
**Severity:** Medium - Schema validator catches it at backend, but UX could be better

## Recommended Fixes

### Fix 1: Add updatedAt to driver creation
```typescript
const newDriver: any = {
  // ... existing fields
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),  // ADD THIS
}
```

### Fix 2: Initialize researchResults
```typescript
const newDriver: any = {
  // ... existing fields
  agents: [] as any[],
  researchResults: [] as any[],  // ADD THIS
  evidence: [],
}
```

### Fix 3: Use idGenerators on load
```typescript
// Line 5472 - Replace:
id: Date.now().toString(),
// With:
id: driverData.id || idGenerators.driver(),
```

### Fix 4: Add pre-save validation in CLI
**Where:** Before calling saveConfiguredDriver
**What:** Run schema validator and show errors to user
```typescript
// Before save:
const validationResult = validateDriver(driverBeingConfigured);
if (!validationResult.valid) {
  setError(`Cannot save: ${validationResult.errors.map(e => e.message).join(', ')}`);
  return;
}
```

## Commands That Create/Modify Drivers

### Direct Creation
- `/driver <name>` - Creates with AI recommendation ✅
- Suggestion chips - Creates with AI recommendation ✅

### Modifications  
- `/type <binary|continuous>` - Updates type ✅
- `/prob <0-100>` - Sets probability ✅
- `/p <p5> <p50> <p95>` - Sets continuous params ✅
- `/direction <increases|decreases>` - Sets direction ✅
- `/agent` - Adds agent (doesn't modify core driver) ✅
- `/evidence` - Adds evidence (doesn't modify core driver) ✅

**All modification commands work with existing driverBeingConfigured state, so they preserve all fields.**

## Test: Can CLI Create Valid Drivers?

Let me trace through a complete workflow:

1. User: `/driver "AI Funding"`
2. CLI creates driver with AI recommendation
3. Driver has: id, name, type, direction, version, createdAt, aiRecommendation ✅
4. **Missing:** updatedAt ❌, researchResults not initialized ❌
5. User saves
6. Backend sync adds it
7. Schema validator checks it
8. **Result:** Would fail validation for missing updatedAt

## Priority Assessment

| Issue | Severity | User Impact | Fix Complexity |
|-------|----------|-------------|----------------|
| Missing updatedAt | High | Fails validation | Easy - 1 line |
| Missing researchResults | Low | Backend handles | Easy - 1 line |
| Old ID on load | Low | Only affects edge case | Easy - 1 line |
| No pre-save validation | Medium | Poor error UX | Medium - Add validator |

## Conclusion

**Status:** ⚠️ **Not Fully Reconciled**

The CLI creates drivers with most fields correctly, but is missing:
1. `updatedAt` field (required)
2. `researchResults` initialization (optional but good practice)

**Action Needed:**
- Add 2 fields to driver creation
- Optionally add pre-save validation for better UX

**Good News:**
- Direction is already included ✅
- Version tracking works ✅
- AI recommendations stored ✅
- Type/probability handling correct ✅

The fixes are simple - just 2-3 lines of code to add the missing fields!
