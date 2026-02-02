# Claude Code Project Rules

## 🔒 Critical: Regression Testing Required

**BEFORE making ANY schema or type changes, you MUST:**

1. **Run regression tests:**
   ```bash
   npm run test:all
   ```

2. **Verify all 12 tests pass:**
   - 8 schema validation tests
   - 4 CLI driver creation tests

3. **If you add new schema fields/rules, update tests FIRST**

4. **After changes, sync to backend:**
   ```bash
   ./scripts/sync-schemas.sh
   cd /home/ilabra/uffp-backend
   npm run test:all  # Verify backend tests still pass
   git add -A && git commit -m "Sync schemas" && git push origin master
   ```

## 📁 Repository Structure

This project has TWO repositories that must stay in sync:

- **Mobile:** `/home/ilabra/uffp_mobile` (React Native + Expo)
- **Backend:** `/home/ilabra/uffp-backend` (Vercel Serverless)

Both have identical regression test suites and pre-commit hooks.

## 🧪 Test Files Location

- `tests/schemaValidator.test.ts` - Core schema validation
- `tests/cliDriverCreation.test.ts` - CLI driver creation validation
- `src/utils/schemaValidator.ts` - Validation rules (25+ rules)

## 📋 Schema Files (Keep Synced)

Files that must stay synchronized between mobile and backend:

| File | Mobile Path | Backend Path |
|------|-------------|--------------|
| Types | `lib/types.ts` | `lib/types.ts` |
| Database | `lib/database.ts` | `lib/database.ts` |
| ID Generator | `src/utils/idGenerator.ts` | `lib/idGenerator.ts` |
| Probability Utils | `src/utils/probability.ts` | `lib/probability.ts` |
| Schema Validator | `src/utils/schemaValidator.ts` | `lib/schemaValidator.ts` |

## 🚫 Never Do This

- ❌ Change `lib/types.ts` without running tests
- ❌ Modify Driver/Forecast interfaces without updating tests
- ❌ Sync to backend without testing backend
- ❌ Skip pre-commit hooks (`--no-verify`)
- ❌ Add new required fields without migration plan

## ✅ Always Do This

- ✅ Run `npm run test:all` before schema changes
- ✅ Update tests when adding new schema rules
- ✅ Sync schemas to backend after mobile changes
- ✅ Document breaking changes in commit messages
- ✅ Test both repos after syncing

## 📖 Key Documentation

- `docs/SCHEMA_SYNC_WORKFLOW.md` - Complete sync workflow
- `docs/SCHEMA_VALIDATION.md` - Validation rules documentation
- `docs/SECURITY_AUDIT.md` - Security vulnerabilities status

## 🔄 Typical Workflow

```bash
# 1. Make schema change in mobile
vim lib/types.ts

# 2. Update tests if needed
vim tests/schemaValidator.test.ts

# 3. Test mobile
npm run test:all

# 4. Commit (tests run automatically via pre-commit hook)
git add -A
git commit -m "Add field X to Driver interface"

# 5. Sync to backend
./scripts/sync-schemas.sh
cd /home/ilabra/uffp-backend

# 6. Test backend
npm run test:all

# 7. Deploy backend
git add -A
git commit -m "Sync schemas from mobile"  # Tests run here too
git push origin master  # Auto-deploys to Vercel
```

## 🎯 Schema Validation Rules (25+)

The schema validator checks:
- ID format (nanoid with semantic prefixes)
- Probability ranges (0-1 internal, 0-100 display)
- Required fields (direction, version, etc.)
- Type constraints (binary vs continuous)
- Referential integrity (drivers, agents, research)
- Version format (major/minor)
- Evidence and research snapshot attachment

## 🆘 If Tests Fail

1. **Don't force the commit** - Fix the issue
2. **Read the error message** - Tests are descriptive
3. **Check the schema validator** - `src/utils/schemaValidator.ts`
4. **Verify types match code** - `lib/types.ts` should match actual usage
5. **Ask for help** - Tests are your friend, not enemy

## 📊 Current Test Status

Both repos should always show:
```
📊 Test Summary: 12 passed, 0 failed
✅ All tests passed!
```

If this ever shows failures, **STOP** and investigate before proceeding.
