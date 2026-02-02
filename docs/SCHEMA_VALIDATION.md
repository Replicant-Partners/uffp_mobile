# Schema Validation System

This document describes the schema validation system that ensures data consistency across the application.

## Overview

The schema validation system validates forecast data against the rules defined in `SCHEMA_ANALYSIS.md`. It runs automatically during save/load operations and can be run manually for testing.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│  (ForecastWorkspaceScreen, CreateForecastScreen, etc.)       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 Backend Sync Layer                           │
│              (src/utils/backendSync.ts)                      │
│                                                              │
│  • Validates before save (addDriverWithSync)                 │
│  • Validates after load (loadForecastsWithSync)              │
│  • Blocks invalid saves, warns on invalid loads              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Schema Validator                                │
│         (src/utils/schemaValidator.ts)                       │
│                                                              │
│  • validateForecast() - Main validation function             │
│  • validateDriver() - Driver-specific rules                  │
│  • validateAgent() - Agent-specific rules                    │
│  • validateResearchSnapshot() - Research rules               │
│  • validateEvidence() - Evidence rules                       │
└──────────────────────────────────────────────────────────────┘
```

## Validation Rules

### Forecast Level
- **REQUIRED_FIELD**: Must have `id` and `question`
- **PROBABILITY_RANGE**: If set, probability must be 0-1
- **ID_FORMAT**: Should use nanoid format with prefix `fct_`

### Driver Level
- **REQUIRED_FIELD**: Must have `id`, `name`, `type`
- **VALID_TYPE**: Type must be `binary` or `continuous`
- **BINARY_REQUIRES_PROBABILITY**: Binary drivers must have probability (0-1)
- **PROBABILITY_RANGE**: Probability must be 0-1
- **CONTINUOUS_REQUIRES_DISTRIBUTION**: Continuous drivers must have distribution
- **TRIANGULAR_REQUIRES_PERCENTILES**: Triangular needs p5, p50, p95
- **ID_FORMAT**: Should use nanoid format with prefix `drv_`
- **ORPHANED_RESEARCH**: Research results should reference valid agents

### Agent Level
- **REQUIRED_FIELD**: Must have `id`, `name`, `query`, `schedule`
- **VALID_SCHEDULE**: Schedule must be `daily`, `weekly`, or `on-demand`
- **ID_FORMAT**: Should use nanoid format with prefix `agt_`

### Research Snapshot Level
- **REQUIRED_FIELD**: Must have `id`, should have `agentId`
- **DRIVER_REFERENCE_MISMATCH**: `attachedToDriverId` must match parent driver
- **ID_FORMAT**: Should use nanoid format with prefix `res_`

### Evidence Level
- **REQUIRED_FIELD**: Must have `id`, `title`, `source`
- **URL_FORMAT**: If URL is provided, it should be valid
- **ID_FORMAT**: Should use nanoid format with prefix `evd_`

## Usage

### Automatic Validation

Validation runs automatically in these scenarios:

**1. Before Saving Driver**
```typescript
// In backendSync.ts > addDriverWithSync()
const result = await addDriverWithSync(forecastId, driverData);

if (!result.success) {
  // Validation failed - driver not saved
  console.error(result.error);
}
```

**2. After Loading Forecasts**
```typescript
// In backendSync.ts > loadForecastsWithSync()
const { forecasts } = await loadForecastsWithSync();

// Validation errors/warnings are logged to console
// Invalid forecasts are still loaded but flagged
```

### Manual Validation

**Run Test Suite**
```bash
npm run test:schema
```

This runs the comprehensive test suite with:
- Valid forecast test (should pass)
- Invalid forecast test (should catch all errors)
- Missing fields test
- Probability range test
- ID format test

**Validate Specific File**
```bash
npm run validate-schema path/to/forecast.json
```

**Validate All Saved Forecasts**
```bash
npm run validate-schema:all
```

This searches for all `*.json` files in common data directories and validates them.

### Programmatic Validation

```typescript
import { validateForecast, formatValidationResults } from './utils/schemaValidator';

const forecast: Forecast = {
  // ... your forecast data
};

const result = validateForecast(forecast);

if (!result.valid) {
  console.error('Validation failed:');
  console.error(formatValidationResults(result));
  
  // Access specific errors
  result.errors.forEach(error => {
    console.log(`${error.entity}.${error.field}: ${error.message}`);
  });
}

// Check warnings
if (result.warnings.length > 0) {
  console.warn('Validation warnings:');
  result.warnings.forEach(warning => {
    console.log(`${warning.entity}.${warning.field}: ${warning.message}`);
  });
}
```

## Error vs Warning

### Errors (severity: 'error')
- **Block save operations** - Data will not be persisted
- Indicate serious schema violations
- Examples:
  - Missing required fields
  - Invalid probability range (not 0-1)
  - Binary driver missing probability
  - Invalid type/schedule values

### Warnings (severity: 'warning')
- **Do not block operations** - Data is still saved/loaded
- Indicate minor issues or backwards compatibility concerns
- Examples:
  - Old ID format (timestamp-based instead of nanoid)
  - Invalid URL format
  - Orphaned research results
  - Research snapshot referencing non-existent agent

## Test Fixtures

The test suite includes fixtures for:

### Valid Forecast
Complete, well-formed forecast with:
- Proper ID format (`fct_`, `drv_`, `agt_`, etc.)
- Probability in 0-1 range
- All required fields present
- Valid agent/research/evidence relationships

### Invalid Forecast
Intentionally broken forecast to test error detection:
- Old timestamp-based IDs
- Probability > 1 (150 instead of 0.15)
- Binary driver missing probability
- Invalid schedule (`every-hour` instead of `daily`/`weekly`/`on-demand`)
- Orphaned research (references non-existent agent)
- Wrong driver reference in research snapshot

### Missing Fields Forecast
Tests required field validation:
- Empty ID, question, name
- Missing distribution parameters for continuous drivers

## Adding New Validation Rules

To add a new validation rule:

**1. Add the rule to schemaValidator.ts**
```typescript
// In appropriate validation function
if (someCondition) {
  errors.push({
    entity: 'Driver',
    entityId: driver.id,
    field: 'someField',
    rule: 'MY_NEW_RULE',
    message: 'Detailed error message',
    severity: 'error', // or 'warning'
  });
}
```

**2. Add test case to schemaValidator.test.ts**
```typescript
const testForecast: Forecast = {
  // ... forecast that violates new rule
};

const result = validateForecast(testForecast);
const hasError = result.errors.some(e => e.rule === 'MY_NEW_RULE');
// Assert hasError is true
```

**3. Update this documentation**
Add the new rule to the "Validation Rules" section above.

## Integration Points

### Frontend
- `src/utils/backendSync.ts` - Validates before/after backend operations
- Errors shown to user via existing error handling
- Warnings logged to console (visible in dev tools)

### Backend
- Backend validation happens independently via `lib/database.ts`
- Frontend validation catches errors before backend call
- Reduces unnecessary API calls and improves UX

### CLI Tools
- `scripts/validate-schema.ts` - Standalone validation CLI
- `tests/schemaValidator.test.ts` - Automated test suite
- Can be integrated into CI/CD pipeline

## CI/CD Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Run schema validation tests
  run: npm run test:schema

- name: Validate all fixture data
  run: npm run validate-schema:all
```

This ensures schema consistency across deployments.

## Performance Considerations

- Validation is **synchronous** but fast (< 10ms per forecast)
- Runs in-memory, no I/O operations
- Safe to run on every save/load operation
- For bulk operations, consider:
  - Batching validation results
  - Running in background worker (future enhancement)

## Migration Path

### Existing Data
Existing forecasts may have:
- Old ID formats (timestamp-based)
- Probabilities in 0-100 range instead of 0-1
- Missing fields that are now required

**These generate warnings, not errors**, allowing gradual migration:

1. Run `npm run validate-schema:all` to see all warnings
2. Use migration scripts to fix:
   - `node migrate-probability-range.js` - Fix probability range
   - Future: ID migration script (if needed)
3. Re-run validation to confirm

### New Data
All new data created after validation implementation:
- Uses nanoid IDs with prefixes
- Stores probability as 0-1
- Validates before save (errors block operation)

## Troubleshooting

### "Validation failed: Probability must be between 0 and 1"
**Cause**: Probability stored as 0-100 instead of 0-1
**Fix**: Run `node migrate-probability-range.js` to convert existing data

### "Agent schedule must be 'daily', 'weekly', or 'on-demand'"
**Cause**: Invalid schedule value
**Fix**: Update agent schedule to one of the valid values

### "Research result references non-existent agent"
**Cause**: Agent was deleted but research snapshot remains
**Fix**: Either restore the agent or remove the orphaned research

### "Binary drivers must have a probability value"
**Cause**: Binary driver created without probability
**Fix**: Set probability using `/prob <value>` command

## Future Enhancements

- [ ] Async validation for large datasets
- [ ] Validation report generation (HTML/PDF)
- [ ] Auto-fix capabilities for common issues
- [ ] Schema versioning and migration tracking
- [ ] GraphQL-style query validation
- [ ] Real-time validation in UI (before save)
- [ ] Validation metrics dashboard

## References

- `docs/SCHEMA_ANALYSIS.md` - Original schema analysis
- `docs/SCHEMA_FIXES_SUMMARY.md` - Implemented fixes
- `src/utils/schemaValidator.ts` - Validation implementation
- `tests/schemaValidator.test.ts` - Test suite
