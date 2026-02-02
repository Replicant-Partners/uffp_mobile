# Agent vs ResearchResults Fix - Summary

## What Was Fixed

We properly separated **Agent configuration** from **ResearchResults** (research outputs), fixing a fundamental data model flaw where both concepts were conflated into a single `agents[]` field.

## The Correct Model

```
Driver
  ├─ agents: Agent[]                    ← Configuration (mutable)
  │    └─ { name, query, schedule, threshold }
  │
  └─ researchResults: ResearchSnapshot[]  ← Outputs (immutable)
       └─ { agentId, executedAt, summary, keyFindings, ... }
```

### Agent (Configuration)
- **Purpose**: Define WHAT to research and WHEN
- **Properties**: name, query, schedule (daily/weekly/on-demand), threshold
- **Lifecycle**: Mutable, persists across driver versions
- **Example**: "@research_analyst should research 'TAM for SaaS' weekly"

### ResearchSnapshot (Output)
- **Purpose**: Record WHAT WAS FOUND and WHEN
- **Properties**: agentId, executedAt, summary, keyFindings, sources, confidence
- **Lifecycle**: Immutable, versioned snapshot
- **Example**: "On Feb 2 at 10am, @research_analyst found TAM = $50B"

## Changes Made

### 1. Type System (`lib/types.ts`)
```typescript
// NEW: Agent interface
export interface Agent {
  id: string;
  name: string;
  query: string;
  schedule: 'daily' | 'weekly' | 'on-demand';
  threshold?: number;
  createdAt: string;
  updatedAt: string;
}

// UPDATED: Driver now has both fields
export interface Driver {
  // ...
  agents: Agent[];  // NEW
  researchResults: ResearchSnapshot[];  // Already existed
}
```

### 2. Frontend (`src/screens/ForecastWorkspaceScreen.tsx`)

**Agent Configuration** (lines 1762-1771):
```typescript
// When user types @agent, /query, /save
const agentConfig = {
  id: Date.now().toString(),
  name: agentBeingConfigured.name,
  query: agentBeingConfigured.query,
  schedule: agentBeingConfigured.schedule || "on-demand",
  threshold: agentBeingConfigured.threshold,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

**Agent Execution** (lines 2449-2467):
```typescript
// When user types /run @agent
const researchSnapshot = {
  id: Date.now().toString(),
  agentId: agentName,
  executedAt: new Date(),
  summary: result.result?.summary,
  keyFindings: result.result?.keyFindings,
  // ... etc
};

setDriverBeingConfigured({
  ...driverBeingConfigured,
  researchResults: [...researchResults, researchSnapshot],
});
```

**UI Display** (lines 4605-4675):
- 🤖 Agents section: Shows configured agents with query and schedule
- 🔬 Research Results section: Shows execution history with timestamps

### 3. Backend Sync (`src/utils/backendSync.ts`)

**Before** (WRONG):
```typescript
// Incorrectly mapped agents → researchResults
researchResults: driverData.agents || []
```

**After** (CORRECT):
```typescript
// Keep both fields separate
agents: driverData.agents || [],
researchResults: driverData.researchResults || []
```

### 4. Backend (`lib/database.ts`)
```typescript
const newDriver: Driver = {
  ...driver,
  agents: driver.agents || [],  // NEW
  researchResults: driver.researchResults || [],
};
```

## Migration Required

Run this in browser console at uffpmobile.vercel.app:

```javascript
// 1. Paste migrate-agents-research.js contents
// 2. Run migration
migrateAgentsAndResearch()

// Expected output:
// ✓ Backup created
// 📦 Migrating drivers...
// ✅ Migrated X driver(s)
// 🔄 Refresh page

// If something goes wrong:
restoreAgentsBackup()
```

## Benefits

1. **Scheduling Works**: Agents can run daily/weekly/on-demand
2. **Research History**: Multiple executions create versioned snapshots
3. **Audit Trail**: Know when each piece of evidence was gathered
4. **Re-execution**: Run same agent multiple times, keep all results
5. **Proper Versioning**: Research snapshots attached to driver versions
6. **Clear Intent**: Separate "what should we research" from "what did we find"

## Testing Checklist

- [ ] Create forecast with `/question`
- [ ] Add driver with `/driver`
- [ ] Configure agent with `@research_analyst`, `/query`, `/save`
- [ ] Verify agent shows in "🤖 Agents" section
- [ ] Run agent with `/run @research_analyst`
- [ ] Verify result shows in "🔬 Research Results" section
- [ ] Save driver with `/save`
- [ ] Reload page and verify both agents and results persist
- [ ] Run agent again - verify second result is added (not replaced)

## Files Changed

- `lib/types.ts` - Added Agent interface, updated Driver
- `lib/database.ts` - Initialize both agents and researchResults
- `src/screens/ForecastWorkspaceScreen.tsx` - Separate agent config from execution
- `src/utils/backendSync.ts` - Sync both fields independently
- `migrate-agents-research.js` - Migration script for existing data
- `docs/AGENT_VS_RESEARCH_CLARIFICATION.md` - Detailed explanation
- `docs/SCHEMA_ANALYSIS.md` - Comprehensive schema audit (1,406 lines)

## Next Steps

1. Deploy changes to production
2. Run migration script on user data
3. Monitor for any issues
4. Update documentation
5. Consider implementing scheduled agent execution (Phase 2)

---

**Commit**: c0cf3c2  
**Date**: 2026-02-02
