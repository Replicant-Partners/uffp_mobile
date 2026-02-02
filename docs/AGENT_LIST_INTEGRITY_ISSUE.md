# Agent List Integrity Issue

## Problem Discovered

**User Report:** `/agent-list` command shows 11 agents in the list, but only 6 show up as clickable chips and in @agent autocomplete.

## Schema Integrity Violation

**Type:** UI Consistency / Data Presentation Integrity
**Severity:** Medium - Confusing UX, hidden functionality

### What's Happening

**Code Location:** `src/screens/ForecastWorkspaceScreen.tsx:1462-1543`

```typescript
// /agent-list command
const agentList = [
  { name: "research_analyst", ... },      // 1
  { name: "sentiment_monitor", ... },     // 2
  { name: "competitive_intel", ... },     // 3
  { name: "financial_analyst", ... },     // 4
  { name: "market_researcher", ... },     // 5
  { name: "expert_synthesizer", ... },    // 6
  { name: "regulatory_monitor", ... },    // 7 ❌ NOT IN CHIPS
  { name: "growth_signals", ... },        // 8 ❌ NOT IN CHIPS
  { name: "hiring_tracker", ... },        // 9 ❌ NOT IN CHIPS
  { name: "pricing_intel", ... },         // 10 ❌ NOT IN CHIPS
  { name: "technology_validator", ... },  // 11 ❌ NOT IN CHIPS
];

// Shows all 11 in text
agentsText = `🤖 Available Research Agents (${agentList.length})\n\n`;
agentList.forEach((agent) => {
  agentsText += `${agent.icon} @${agent.name}\n`;  // All 11 shown
});

// But only creates chips for first 6
const agentSuggestions = agentList
  .slice(0, 6)  // ❌ INCONSISTENCY
  .map((agent) => ({
    label: `@${agent.name}`,
    ...
  }));
```

### User Experience

**What user sees:**
```
🤖 Available Research Agents (11)

📊 @research_analyst       [CHIP]
💭 @sentiment_monitor      [CHIP]
🔍 @competitive_intel      [CHIP]
💰 @financial_analyst      [CHIP]
📈 @market_researcher      [CHIP]
🎓 @expert_synthesizer     [CHIP]
⚖️ @regulatory_monitor     ❌ NO CHIP
📱 @growth_signals         ❌ NO CHIP
👥 @hiring_tracker         ❌ NO CHIP
💵 @pricing_intel          ❌ NO CHIP
🔧 @technology_validator   ❌ NO CHIP
```

**Problem:** User can see agents 7-11 in the list, but:
- ❌ No clickable chips
- ❌ Not in @agent autocomplete (assumption)
- ❌ Harder to use
- ❌ Looks incomplete/buggy

## Root Cause

Arbitrary limitation: `.slice(0, 6)` at line 1536

**Intent:** Likely to avoid UI clutter with too many chips
**Effect:** Inconsistent UX - some agents are "second class"

## Schema Violations

This violates several integrity principles:

1. **Presentation Consistency:** All items in a list should have equal affordance
2. **Discoverability:** If something is listed, it should be usable
3. **User Expectation:** Seeing 11 agents implies all 11 are equally accessible
4. **Data Completeness:** UI should reflect complete data model

## Proposed Solutions

### Option 1: Show All Agents as Chips (Recommended)
**Pro:** Complete, consistent, discoverable
**Con:** More UI space (but acceptable)

```typescript
const agentSuggestions = agentList.map((agent) => ({
  label: `@${agent.name}`,
  description: agent.description,
}));
```

### Option 2: Paginated Chips
**Pro:** Keeps UI compact
**Con:** More complex

```typescript
const agentSuggestions = agentList.map(...);
// Add "Show more agents" chip at the end
```

### Option 3: Popular vs All Agents
**Pro:** Highlights most useful agents
**Con:** Requires explicit categorization

```typescript
const popularAgents = [
  "research_analyst", "sentiment_monitor", "market_researcher"
];
const agentSuggestions = [
  ...popularAgents.map(name => /* popular chips */),
  { label: "See all 11 agents", command: "/agent-list --all" }
];
```

### Option 4: Dynamic Layout
**Pro:** Adapts to screen size
**Con:** More complex logic

```typescript
const maxChips = screenWidth > 600 ? 11 : 6;
const agentSuggestions = agentList.slice(0, maxChips).map(...);
```

## Recommended Fix

**Solution:** Option 1 (Show all chips)

**Reasoning:**
1. 11 chips is reasonable
2. Maintains consistency
3. Simple implementation
4. No hidden functionality
5. Users can scroll if needed

**Implementation:**
```typescript
// Line 1536 - Remove .slice(0, 6)
const agentSuggestions: CommandSuggestion[] = agentList
  .map((agent) => ({
    key: agent.name,
    label: `@${agent.name}`,
    description: agent.description,
  }));
```

## Additional Considerations

### 1. Agent Configuration Source
**Question:** Should agents be hardcoded or configurable?

**Current:** Hardcoded list in ForecastWorkspaceScreen.tsx
**Alternative:** 
- Configuration file: `config/agents.json`
- Database: User-configurable agents
- Plugin system: Dynamically loaded agents

**Recommendation:** For now, keep hardcoded but document as single source of truth

### 2. Agent Autocomplete
**Current assumption:** @agent autocomplete might also only show first 6
**Action needed:** Verify and fix if true

**Check locations:**
- Command input handler
- Autocomplete suggestions logic
- @agent mention detection

### 3. Schema Validation Rule
**Add validation:** Ensure chip count matches list count

```typescript
// In schemaValidator.ts or new agentValidator.ts
export function validateAgentList(agentList, suggestions) {
  if (agentList.length !== suggestions.length) {
    return {
      valid: false,
      error: `Agent list has ${agentList.length} items but only ${suggestions.length} suggestions`,
    };
  }
  return { valid: true };
}
```

## Testing Checklist

After fix:
- [ ] All 11 agents show as chips
- [ ] All 11 agents work when clicked
- [ ] @agent autocomplete shows all 11
- [ ] UI layout looks good with 11 chips
- [ ] Mobile view handles 11 chips gracefully
- [ ] No performance impact

## Priority

**Severity:** Medium
**Impact:** User Experience
**Effort:** Low (5 minutes to remove .slice())
**Risk:** Low (just removing a filter)

**Recommendation:** Fix immediately - it's a one-line change

## Related Issues

Check for similar patterns elsewhere:
- Driver type suggestions
- Command autocomplete
- Evidence type suggestions
- Any other lists with partial chip rendering

## Documentation Updates Needed

After fix:
- Update agent list documentation
- Document agent architecture
- Add agent configuration guide
- Add to schema validation (if we create agent config validation)
