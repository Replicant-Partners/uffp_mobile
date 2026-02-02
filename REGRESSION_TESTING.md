# 🔒 Regression Testing Setup

## Quick Status Check

Run this to verify everything is set up:

```bash
# Mobile repo
cd /home/ilabra/uffp_mobile
npm run test:all

# Backend repo  
cd /home/ilabra/uffp-backend
npm run test:all
```

Both should show: **12 passed, 0 failed**

## What's Protected

### Automatic Testing (Pre-commit Hooks)

Both repos run 12 tests automatically on every commit:
- **Mobile:** `.husky/pre-commit` runs before commits
- **Backend:** `.husky/pre-commit` runs before commits

If tests fail, the commit is **blocked** ❌

### Test Coverage

**8 Schema Validation Tests:**
1. Valid forecast structure
2. Invalid data detection
3. Required field validation
4. Probability range (0-1)
5. ID format (nanoid prefixes)
6. Direction field requirement
7. Version field format
8. Invalid version detection

**4 CLI Driver Creation Tests:**
1. Binary driver validation
2. Continuous driver validation
3. Required fields presence
4. Field type correctness

## Files Involved

### Mobile Repo (`/home/ilabra/uffp_mobile`)
```
tests/
  ├── schemaValidator.test.ts        # 8 schema tests
  └── cliDriverCreation.test.ts      # 4 CLI tests

src/utils/
  ├── schemaValidator.ts             # 25+ validation rules
  ├── idGenerator.ts                 # ID generation
  └── probability.ts                 # Probability utils

.husky/
  └── pre-commit                     # Runs tests automatically

scripts/
  └── sync-schemas.sh                # Sync to backend

.claude/
  └── PROJECT_RULES.md               # Rules for AI sessions
```

### Backend Repo (`/home/ilabra/uffp-backend`)
```
tests/                               # Identical to mobile
  ├── schemaValidator.test.ts        
  └── cliDriverCreation.test.ts      

lib/                                 # Synced from mobile
  ├── schemaValidator.ts             
  ├── idGenerator.ts                 
  └── probability.ts                 

.husky/
  └── pre-commit                     # Runs tests automatically

.claude/
  └── PROJECT_RULES.md               # Rules for AI sessions
```

## How It Works

### 1. Developer Makes Schema Change

```bash
cd /home/ilabra/uffp_mobile
vim lib/types.ts  # Add new field to Driver
```

### 2. Tests Run Automatically on Commit

```bash
git add lib/types.ts
git commit -m "Add newField to Driver"

# 🔍 Pre-commit hook runs:
# - 8 schema validation tests
# - 4 CLI driver creation tests
# 
# ✅ If all pass → commit succeeds
# ❌ If any fail → commit blocked
```

### 3. Sync to Backend

```bash
./scripts/sync-schemas.sh
cd /home/ilabra/uffp-backend
npm run test:all  # Verify backend tests pass
git commit -am "Sync schemas from mobile"
# Tests run again via pre-commit hook
git push origin master  # Deploys to Vercel
```

## What Happens in Each Session

When Claude Code starts in either repo, it reads `.claude/PROJECT_RULES.md` which contains:

✅ Must run regression tests before schema changes  
✅ Schema sync workflow documentation  
✅ Critical do's and don'ts  
✅ Complete workflow examples  

This ensures **every session** knows about regression testing requirements.

## Verifying Setup

### Check Pre-commit Hooks

```bash
# Mobile
ls -la /home/ilabra/uffp_mobile/.husky/pre-commit
cat /home/ilabra/uffp_mobile/.husky/pre-commit

# Backend
ls -la /home/ilabra/uffp-backend/.husky/pre-commit
cat /home/ilabra/uffp-backend/.husky/pre-commit
```

Both should run `npm run test:schema && npm run test:cli`

### Test the Pre-commit Hook

```bash
# Try a dummy commit
echo "# test" >> README.md
git add README.md
git commit -m "Test pre-commit hook"
# Should see: "🔍 Running schema validation tests..."
# Should run all 12 tests
git reset HEAD~1  # Undo the test commit
```

### Check NPM Scripts

```bash
npm run test        # Should run all tests
npm run test:all    # Should run all tests
npm run test:schema # Should run 8 tests
npm run test:cli    # Should run 4 tests
```

## Troubleshooting

### Tests Not Running on Commit

```bash
# Reinstall husky
npm run prepare
```

### Tests Failing

```bash
# See which test is failing
npm run test:all

# Common issues:
# - Import paths wrong (src/utils vs lib)
# - Missing required fields
# - Wrong probability range
# - Missing direction field
```

### Backend Tests Fail After Sync

```bash
cd /home/ilabra/uffp-backend
git diff  # See what changed

# Common fix: import paths
# Mobile uses: from "../src/utils/schemaValidator"
# Backend uses: from "../lib/schemaValidator"
```

## Documentation

- `.claude/PROJECT_RULES.md` - Rules for AI sessions
- `docs/SCHEMA_SYNC_WORKFLOW.md` - Complete sync workflow
- `docs/SCHEMA_VALIDATION.md` - Validation rules reference
- `docs/SECURITY_AUDIT.md` - Security status

## Success Metrics

✅ Both repos have 12 tests  
✅ Pre-commit hooks run automatically  
✅ Tests pass in both repos  
✅ `.claude/PROJECT_RULES.md` exists in both repos  
✅ Sync script works  
✅ Backend deployed successfully  

All metrics currently: **PASSING** ✅
