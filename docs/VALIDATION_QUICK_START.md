# Schema Validation Quick Start

## What is it?

A test harness that validates your forecast data against consistent schema rules, catching errors before they cause problems.

## Quick Commands

```bash
# Run the test suite (5 tests, ~2 seconds)
npm run test:schema

# Validate a specific forecast file
npm run validate-schema path/to/forecast.json

# Validate all saved forecasts
npm run validate-schema:all
```

## What does it check?

✅ **Required fields** - No missing IDs, names, questions
✅ **Probability range** - All probabilities 0-1 (not 0-100)
✅ **Type constraints** - Binary drivers have probability, continuous have distribution
✅ **Valid references** - Research results reference existing agents
✅ **ID format** - New nanoid format with semantic prefixes
✅ **Data consistency** - Drivers match their parent forecasts

## Example Output

### Passing Validation
```
✅ Schema validation passed!
```

### Failing Validation
```
❌ Schema validation failed

Errors (3):
  - [Driver:drv_123] probability: Binary driver probability must be 0-1, got 50
  - [Agent:agt_456] schedule: Agent schedule must be 'daily', 'weekly', or 'on-demand', got 'hourly'
  - [ResearchSnapshot:res_789] attachedToDriverId: Research snapshot attachedToDriverId doesn't match parent driver

Warnings (2):
  - [Driver:1234567890] id: Driver ID should use nanoid format with prefix (drv_)
  - [ResearchSnapshot:res_999] agentId: Research result references non-existent agent: agt_deleted
```

## How does it work?

### Automatic Validation

**Before Save:**
```typescript
// Validation runs automatically
const driver = createNewDriver();
await saveDriver(driver);
// ❌ Blocks if validation fails
```

**After Load:**
```typescript
// Validation runs on load
const forecasts = await loadForecasts();
// ⚠️ Warns but doesn't block
```

### Manual Validation

**In Your Code:**
```typescript
import { validateForecast } from './utils/schemaValidator';

const result = validateForecast(myForecast);

if (!result.valid) {
  console.error('Errors:', result.errors);
}
```

## Common Issues & Fixes

### Issue: "Probability must be between 0 and 1"
**Why:** Old data stored probabilities as 0-100 instead of 0-1
**Fix:**
```bash
node migrate-probability-range.js
```

### Issue: "Binary driver missing probability"
**Why:** Driver was created as binary but probability wasn't set
**Fix:** Use `/prob 50` command to set probability to 0.5 (50%)

### Issue: "Old ID format warning"
**Why:** Data created before nanoid migration
**Fix:** Warning only, no action needed. New data uses correct format.

### Issue: "Orphaned research result"
**Why:** Agent was deleted but research results weren't cleaned up
**Fix:** Cascade deletes now handle this automatically for new deletions

## Integration with Development Workflow

### Local Development
```bash
# Before committing
npm run test:schema

# If tests pass, commit
git add .
git commit -m "Add new feature"
```

### CI/CD Pipeline
Add to `.github/workflows/test.yml`:
```yaml
- name: Validate schema
  run: npm run test:schema
```

### Pre-deployment
```bash
# Validate production data before deploying
npm run validate-schema:all
```

## What's Next?

After validation passes:
1. ✅ Your data follows consistent schema rules
2. ✅ No probability range issues (0-1 vs 0-100)
3. ✅ All IDs use nanoid format with prefixes
4. ✅ No orphaned data (agents, research, evidence)
5. ✅ Type constraints enforced (binary/continuous)

## Learn More

- Full documentation: `docs/SCHEMA_VALIDATION.md`
- Schema analysis: `docs/SCHEMA_ANALYSIS.md`
- Implementation details: `docs/SCHEMA_FIXES_SUMMARY.md`
- Validation code: `src/utils/schemaValidator.ts`
- Test suite: `tests/schemaValidator.test.ts`
