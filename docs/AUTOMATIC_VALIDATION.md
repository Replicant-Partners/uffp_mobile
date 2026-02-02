# Automatic Schema Validation

## Overview

Schema validation tests now run automatically on every change through multiple mechanisms:

1. **Pre-commit hook** - Runs before every git commit
2. **Manual testing** - `npm test` or `npm run test:all`
3. **CI/CD pipeline** - Runs on every push/PR to GitHub

## Setup Complete ✅

All three mechanisms are now configured and ready to use!

---

## 1. Pre-Commit Hook (Git)

### What It Does
Automatically runs schema validation tests **before every commit**. If tests fail, the commit is blocked.

### How It Works
```bash
# You make changes and commit
git add .
git commit -m "Add new feature"

# Hook runs automatically:
🔍 Running schema validation tests...
✓ Test 1: Valid forecast ✅ PASSED
✓ Test 2: Invalid forecast ✅ PASSED
...
📊 Test Summary: 12 passed, 0 failed
✅ All schema validation tests passed!

# Commit proceeds
[master abc123] Add new feature
```

### If Tests Fail
```bash
git commit -m "Add broken feature"

🔍 Running schema validation tests...
✓ Test 1: Valid forecast ✅ PASSED
✓ Test 2: Invalid forecast ❌ FAILED
...
📊 Test Summary: 11 passed, 1 failed

❌ Schema validation tests failed!
Please fix the errors before committing.

# Commit is blocked - you must fix the issues first
```

### Configuration
- **File:** `.husky/pre-commit`
- **Installed via:** husky package
- **Runs:** `npm run test:schema && npm run test:cli`

### Disable (if needed)
```bash
# Temporarily bypass (not recommended!)
git commit --no-verify -m "Emergency fix"

# Permanently disable
rm .husky/pre-commit
```

---

## 2. Manual Testing (npm scripts)

### Run All Tests
```bash
npm test
# or
npm run test:all
```

**Output:**
```
📊 Test Summary: 8 passed, 0 failed (schema tests)
📊 Test Summary: 4 passed, 0 failed (CLI tests)
✅ Total: 12 tests passing
```

### Run Individual Test Suites
```bash
# Schema validation only (8 tests)
npm run test:schema

# CLI driver creation only (4 tests)
npm run test:cli

# Validate specific file
npm run validate-schema path/to/forecast.json

# Validate all saved forecasts
npm run validate-schema:all
```

### Test Breakdown

**Schema Tests (8 tests):**
1. Valid forecast passes
2. Invalid forecast caught
3. Missing required fields caught
4. Probability range validation
5. ID format validation
6. Direction field required
7. Version field validation
8. Invalid version format

**CLI Tests (4 tests):**
1. Binary driver via CLI
2. Continuous driver via CLI
3. All required fields present
4. All field types correct

**Total: 12 automated tests**

---

## 3. CI/CD Pipeline (GitHub Actions)

### What It Does
Runs schema validation tests automatically on:
- Every push to master/main/develop branches
- Every pull request
- Can be manually triggered

### How It Works
When you push code:
```bash
git push origin master

# GitHub Actions starts:
✓ Checkout code
✓ Setup Node.js
✓ Install dependencies
✓ Run schema validation tests
✓ Run CLI driver creation tests
✓ Validate all saved forecasts
✅ All checks passed
```

### Configuration
- **File:** `.github/workflows/schema-validation.yml`
- **Triggers:** Push to master/main/develop, Pull Requests
- **Node version:** 18
- **Cache:** npm dependencies cached for speed

### View Results
1. Go to your GitHub repository
2. Click "Actions" tab
3. See test results for each commit/PR

### Status Badge (Optional)
Add to README.md:
```markdown
![Schema Validation](https://github.com/YOUR_USERNAME/uffp_mobile/workflows/Schema%20Validation/badge.svg)
```

---

## When Tests Run

| Action | Pre-commit Hook | Manual | CI/CD |
|--------|----------------|--------|-------|
| `git commit` | ✅ Yes | No | No |
| `git push` | No | No | ✅ Yes |
| Pull Request | No | No | ✅ Yes |
| `npm test` | No | ✅ Yes | No |
| Code change | ✅ Yes (on commit) | Manual | ✅ Yes (on push) |

**Summary:** Tests run automatically on commit AND push, plus you can run them manually anytime.

---

## Integration with Your Workflow

### Typical Development Flow
```bash
# 1. Make changes
vim src/screens/ForecastWorkspaceScreen.tsx

# 2. Test manually (optional)
npm test

# 3. Commit (tests run automatically)
git add .
git commit -m "Add feature"
# ✅ Tests pass, commit succeeds

# 4. Push (tests run on GitHub)
git push origin master
# ✅ CI/CD runs, tests pass
```

### If You Break the Schema
```bash
# 1. Make breaking change
# Remove updatedAt from driver creation

# 2. Try to commit
git commit -m "Update driver creation"

# Pre-commit hook runs:
❌ Test 7: Version field validation FAILED
Error: Driver must have updatedAt field

# Commit is BLOCKED

# 3. Fix the issue
# Add updatedAt back

# 4. Commit again
git commit -m "Update driver creation"
✅ All tests pass, commit succeeds
```

---

## What Gets Validated

### Schema Rules (25+ checks)
- ✅ Required fields present
- ✅ Field types correct
- ✅ ID format (nanoid with prefixes)
- ✅ Probability range (0-1)
- ✅ Direction values (increases/decreases)
- ✅ Version format and numbers
- ✅ Type constraints (binary/continuous)
- ✅ Data relationships
- ✅ Array initialization
- ✅ Date formats

### CLI Workflows
- ✅ Driver creation via `/driver` command
- ✅ Custom driver creation
- ✅ Binary drivers (with probability)
- ✅ Continuous drivers (with p5/p50/p95)
- ✅ All required fields initialized
- ✅ Correct types and formats

---

## Troubleshooting

### Pre-commit Hook Not Running

**Check if husky is installed:**
```bash
ls -la .husky/pre-commit
# Should exist and be executable

# Make executable if needed:
chmod +x .husky/pre-commit
```

**Reinstall if needed:**
```bash
npm install --save-dev husky
npx husky init
```

### Tests Failing Locally But Not in CI

**Check Node version:**
```bash
node --version
# Should be 18.x or later

# Update if needed
nvm install 18
nvm use 18
```

**Clear npm cache:**
```bash
rm -rf node_modules package-lock.json
npm install
npm test
```

### Skip Pre-commit Hook (Emergency Only)

```bash
# Only use in emergencies!
git commit --no-verify -m "Hotfix"

# Then fix the issue in next commit
```

---

## Performance

### Test Speed
- Schema tests: ~2 seconds
- CLI tests: ~1 second
- Total: ~3 seconds per commit

**Very fast!** Won't slow down your workflow.

### CI/CD Time
- Full pipeline: ~30-60 seconds
- Includes: checkout, install, test, validate
- Cached dependencies make it faster

---

## Maintenance

### Adding New Tests

**1. Add to test file:**
```typescript
// tests/schemaValidator.test.ts
console.log("\n✓ Test 9: My new test");
const result9 = validateForecast(myTestForecast);
if (result9.valid) {
  console.log("✅ PASSED");
  passed++;
}
```

**2. Test runs automatically:**
- On next commit (pre-commit hook)
- On next push (CI/CD)
- Via `npm test`

### Adding New Validation Rules

**1. Add to validator:**
```typescript
// src/utils/schemaValidator.ts
if (someCondition) {
  errors.push({
    entity: 'Driver',
    field: 'myField',
    rule: 'MY_NEW_RULE',
    message: 'Error description',
    severity: 'error',
  });
}
```

**2. Add test case**
**3. Runs automatically everywhere**

---

## Benefits

### For You
- ✅ Never accidentally commit broken schema
- ✅ Instant feedback on changes
- ✅ No manual testing needed
- ✅ Catch errors before they reach production

### For Team
- ✅ All PRs tested automatically
- ✅ Code review sees test results
- ✅ Consistent quality across commits
- ✅ Documentation of what's tested

### For Codebase
- ✅ Schema integrity guaranteed
- ✅ No schema drift over time
- ✅ Safe refactoring
- ✅ Regression prevention

---

## Summary

**Three layers of protection:**

1. **Pre-commit** - Catches issues before commit
2. **Manual** - Test anytime with `npm test`
3. **CI/CD** - Validates on push/PR

**12 automated tests** covering schema + CLI validation

**~3 seconds** per run (very fast!)

**Zero configuration needed** - it's already set up and running!

---

## Quick Reference

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:schema
npm run test:cli

# Validate specific file
npm run validate-schema forecast.json

# Validate all saved data
npm run validate-schema:all

# Bypass pre-commit (emergency only!)
git commit --no-verify

# View CI/CD results
# GitHub → Actions tab
```

---

## Next Steps

✅ **Already done!** The system is running automatically.

Just code normally and:
- Tests run on commit
- Tests run on push
- Tests run on PR
- You can run tests manually anytime

**No action needed from you** - it just works! 🎉
