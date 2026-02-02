# Schema Validation Test Harness - Implementation Summary

## ✅ Complete

A comprehensive test harness has been built to validate future versions of the application against a consistent schema.

## What Was Built

### 1. Schema Validator (`src/utils/schemaValidator.ts`)
- **400+ lines** of validation logic
- Validates forecasts, drivers, agents, research snapshots, and evidence
- Checks **20+ validation rules** including:
  - Required fields
  - Probability range (0-1)
  - Type constraints (binary/continuous)
  - ID format (nanoid with prefixes)
  - Data relationships (orphaned research, driver references)
  - Schedule validation (daily/weekly/on-demand)
  - URL format validation

### 2. Test Suite (`tests/schemaValidator.test.ts`)
- **5 comprehensive tests** covering:
  - ✅ Valid forecast (should pass)
  - ✅ Invalid forecast (catches 4 errors, 5 warnings)
  - ✅ Missing required fields (catches 4 errors)
  - ✅ Probability range violations
  - ✅ Old ID format warnings

**Test Results:**
```
📊 Test Summary: 5 passed, 0 failed
✅ All tests passed!
```

### 3. CLI Validation Tool (`scripts/validate-schema.ts`)
- Run tests: `npm run test:schema`
- Validate specific file: `npm run validate-schema <file.json>`
- Validate all forecasts: `npm run validate-schema:all`

### 4. Automatic Validation Hooks
Integrated into `src/utils/backendSync.ts`:
- **Before Save**: Validates driver data, blocks if errors found
- **After Load**: Validates all loaded forecasts, logs warnings/errors

### 5. Documentation
- **VALIDATION_QUICK_START.md** - Quick reference guide
- **SCHEMA_VALIDATION.md** - Complete documentation (60+ sections)
- Includes examples, troubleshooting, CI/CD integration

## Validation Rules Implemented

### Forecast Level
| Rule | Severity | Description |
|------|----------|-------------|
| REQUIRED_FIELD | Error | Must have id and question |
| PROBABILITY_RANGE | Error | Probability must be 0-1 |
| ID_FORMAT | Warning | Should use nanoid format (fct_) |

### Driver Level
| Rule | Severity | Description |
|------|----------|-------------|
| REQUIRED_FIELD | Error | Must have id, name, type |
| VALID_TYPE | Error | Type must be binary or continuous |
| BINARY_REQUIRES_PROBABILITY | Error | Binary drivers need probability |
| PROBABILITY_RANGE | Error | Probability must be 0-1 |
| CONTINUOUS_REQUIRES_DISTRIBUTION | Error | Continuous needs distribution |
| TRIANGULAR_REQUIRES_PERCENTILES | Error | Triangular needs p5, p50, p95 |
| ID_FORMAT | Warning | Should use nanoid format (drv_) |
| ORPHANED_RESEARCH | Warning | Research should reference valid agents |

### Agent Level
| Rule | Severity | Description |
|------|----------|-------------|
| REQUIRED_FIELD | Error | Must have id, name, query, schedule |
| VALID_SCHEDULE | Error | Schedule: daily/weekly/on-demand |
| ID_FORMAT | Warning | Should use nanoid format (agt_) |

### Research Snapshot Level
| Rule | Severity | Description |
|------|----------|-------------|
| REQUIRED_FIELD | Error/Warning | Must have id, should have agentId |
| DRIVER_REFERENCE_MISMATCH | Error | attachedToDriverId must match parent |
| ID_FORMAT | Warning | Should use nanoid format (res_) |

### Evidence Level
| Rule | Severity | Description |
|------|----------|-------------|
| REQUIRED_FIELD | Error | Must have id, content, type, attachedTo |
| VALID_TYPE | Error | Type: url/quote/data/reasoning |
| URL_FORMAT | Warning | URL type should have valid URL |
| ID_FORMAT | Warning | Should use nanoid format (evd_) |

## Usage Examples

### Run Tests
```bash
npm run test:schema
```

Output:
```
🧪 Running Schema Validation Tests
============================================================
✓ Test 1: Valid forecast
✅ PASSED

✓ Test 2: Invalid forecast (probability, orphaned research, etc.)
✅ PASSED: Found all 4 expected errors
...
📊 Test Summary: 5 passed, 0 failed
✅ All tests passed!
```

### Validate Programmatically
```typescript
import { validateForecast } from './utils/schemaValidator';

const result = validateForecast(myForecast);

if (!result.valid) {
  console.error('Validation failed:');
  result.errors.forEach(err => {
    console.log(`${err.entity}.${err.field}: ${err.message}`);
  });
}
```

### Automatic Validation (Built-in)
```typescript
// Validation runs automatically when saving
await saveDriver(driverData);
// ❌ Blocks if validation fails

// Validation runs automatically when loading
const forecasts = await loadForecasts();
// ⚠️ Warns but doesn't block
```

## Benefits

### 1. Early Error Detection
- Catches schema violations **before** they reach the database
- Prevents invalid data from corrupting the system
- Clear error messages for easy debugging

### 2. Backwards Compatibility
- **Errors** block operations (breaking changes)
- **Warnings** allow operation (deprecated patterns)
- Supports gradual migration from old to new formats

### 3. Developer Experience
- **5 tests** run in ~2 seconds
- Clear, actionable error messages
- Easy to add new validation rules

### 4. Future-Proof
- All new data validated against current schema
- Old data flagged with warnings for migration
- Test suite ensures consistency across versions

### 5. CI/CD Ready
```yaml
# .github/workflows/test.yml
- name: Validate schema
  run: npm run test:schema
```

## Example Error Output

```
❌ Schema validation failed

Errors (4):
  - [Forecast:old-123] probability: Forecast probability must be 0-1, got 150
  - [Driver:drv_456] probability: Binary drivers must have a probability value
  - [Agent:agt_789] schedule: Agent schedule must be 'daily', 'weekly', or 'on-demand', got 'hourly'
  - [ResearchSnapshot:res_999] attachedToDriverId: Doesn't match parent driver

Warnings (2):
  - [Driver:1234567890] id: Driver ID should use nanoid format with prefix (drv_)
  - [ResearchSnapshot:res_999] agentId: Research result references non-existent agent
```

## Integration Points

### Frontend
- ✅ `src/utils/backendSync.ts` - Validates before save, after load
- ✅ Console logging for developers
- ✅ Error propagation to UI

### Backend
- ✅ Backend has independent validation
- ✅ Frontend validation reduces API load
- ✅ Defense in depth approach

### Testing
- ✅ Automated test suite
- ✅ CLI validation tools
- ✅ CI/CD integration ready

## Files Created/Modified

### Created (6 files)
1. `src/utils/schemaValidator.ts` - Core validation logic (520 lines)
2. `tests/schemaValidator.test.ts` - Test suite (280 lines)
3. `scripts/validate-schema.ts` - CLI tool (90 lines)
4. `docs/SCHEMA_VALIDATION.md` - Full documentation (400 lines)
5. `docs/VALIDATION_QUICK_START.md` - Quick reference (150 lines)
6. `docs/TEST_HARNESS_SUMMARY.md` - This document

### Modified (2 files)
1. `src/utils/backendSync.ts` - Added validation hooks
2. `package.json` - Added npm scripts

**Total:** ~1,500 lines of validation code and documentation

## Test Coverage

| Scenario | Test | Status |
|----------|------|--------|
| Valid data passes | Test 1 | ✅ Pass |
| Invalid probability caught | Test 2, 4 | ✅ Pass |
| Missing fields caught | Test 3 | ✅ Pass |
| Invalid schedule caught | Test 2 | ✅ Pass |
| Orphaned data caught | Test 2 | ✅ Pass |
| Wrong references caught | Test 2 | ✅ Pass |
| Old ID format warned | Test 5 | ✅ Pass |

## Migration Support

For existing data with issues:

### Probability Range (0-100 → 0-1)
```bash
node migrate-probability-range.js
```

### Old ID Formats
- **Warnings only** - no migration needed
- New data uses correct format automatically
- Both formats supported for backwards compatibility

## Next Steps

1. **Run tests regularly**: `npm run test:schema`
2. **Add to CI/CD**: Ensure schema consistency in deployments
3. **Monitor warnings**: Gradually migrate old data formats
4. **Extend rules**: Add new validation as schema evolves

## Conclusion

✅ **Complete test harness built**
- Validates 20+ rules across 5 entity types
- 100% test pass rate (5/5 tests)
- Automatic validation on save/load
- CLI tools for manual validation
- Comprehensive documentation

The schema validation system ensures that future versions of the application maintain data consistency and catch errors early in the development process.
