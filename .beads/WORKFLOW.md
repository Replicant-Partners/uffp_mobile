# Beads Workflow for UFFP Mobile

## Issue Lifecycle

```
open → working → pending-verification → closed
  ↓                                        ↑
  └─────────── blocked ──────────────────┘
```

## Roles & Responsibilities

### AI Agent (Claude)
1. **Discovery**: When finding a bug/issue, immediately create it in Beads
2. **Investigation**: Update status to `working` when starting work
3. **Implementation**: Make code changes, commit with issue ID in message
4. **Verification Request**: Update status to `pending-verification` when done
5. **Documentation**: Update issue with solution details and verification steps

### Human Developer
1. **Verification**: Test the fix thoroughly
2. **Feedback**: Comment on issue if problems found
3. **Closure**: Close issue when verified working
4. **Prioritization**: Adjust priorities as needed

## Issue Creation Guidelines

### When to Create
- ✅ Any bug discovered (UI, backend, integration)
- ✅ Feature requests from user
- ✅ Technical debt identified
- ✅ Performance issues
- ✅ Documentation gaps
- ❌ Trivial fixes (typos in comments)

### Issue Templates

**Bug:**
```bash
bd create "Brief description" -p 0-2 -t bug \
  -d "What's broken: [describe]
  Expected: [behavior]
  Actual: [behavior]
  Steps to reproduce: [list]
  Console logs: [relevant errors]" \
  -l bug,component-name
```

**Feature:**
```bash
bd create "Feature name" -p 1-3 -t feature \
  -d "User story: As a [user], I want [goal] so that [benefit]
  Acceptance criteria:
  - [ ] Criterion 1
  - [ ] Criterion 2" \
  -l feature,component-name
```

**Technical Debt:**
```bash
bd create "Refactor/improve X" -p 2-3 -t chore \
  -d "Current state: [describe]
  Proposed improvement: [describe]
  Benefits: [list]" \
  -l tech-debt,component-name
```

## Status Definitions

- **open**: Issue created, not started
- **working**: Actively being worked on
- **pending-verification**: Fix deployed, awaiting human verification
- **blocked**: Cannot proceed due to dependency
- **closed**: Verified working, done

## Priority Guidelines

- **P0**: Critical - breaks core functionality, blocks users
- **P1**: High - significant impact, should fix soon  
- **P2**: Medium - nice to have, normal priority
- **P3**: Low - minor issue, can wait
- **P4**: Trivial - cosmetic, very low priority

## Labels

Use consistent labels for filtering:
- **Component**: `backend`, `frontend`, `ui`, `api`, `agent-system`
- **Type**: `bug`, `feature`, `tech-debt`, `docs`
- **Area**: `auth`, `forecast`, `driver`, `sync`, `autocomplete`

## Dependencies

Link related issues:
```bash
# X blocks Y (Y cannot start until X is done)
bd dep add <Y-id> <X-id> --type blocks

# X relates to Y (informational link)
bd dep add <Y-id> <X-id> --type related
```

## Commit Messages

Reference issue ID in commits:
```
[uffp_mobile-abc] Fix backend sync issue

- Add retry logic for network failures
- Improve error messages
- Add unit tests

Fixes uffp_mobile-abc
```

## Verification Checklist

Before closing, verify:
- [ ] Fix deployed to production
- [ ] Manual testing in browser/app
- [ ] No console errors
- [ ] No regression in related features
- [ ] Performance is acceptable

## Quick Reference

```bash
# See what's ready to work on
bd ready

# Start working on an issue
bd update uffp_mobile-abc --status working

# Mark as pending verification
bd update uffp_mobile-abc --status pending-verification \
  --notes "Deployed to production. Please verify: [steps]"

# Close verified issue
bd close uffp_mobile-abc

# View issue details
bd show uffp_mobile-abc

# Search issues
bd list --label bug --status open
bd list --priority 0
```

## Current Workflow Implementation

For UFFP Mobile, we use a hybrid approach:
- Beads tracks status: `open`, `in_progress`, `blocked`, `deferred`, `closed`
- For verification stage, we add notes: "Deployed. Ready for verification: [steps]"
- Human verifies and closes the issue

### Custom Status Flow

Since Beads doesn't have a native `pending-verification` status, we use:
1. `in_progress` - AI is working on the fix
2. `in_progress` + note "Ready for verification" - Fix deployed, awaiting human test
3. `closed` - Human verified and closed

### AI Update Pattern

When fix is ready:
```bash
bd update uffp_mobile-abc \
  --notes "Fix deployed to production.

Verification steps:
1. [Step 1]
2. [Step 2]

Expected: [behavior]

Ready for verification by human."
```

This signals to the human that the issue is ready to test.
