# Agent vs ResearchResults: Semantic Distinction

## The Correct Model

**Agents** and **ResearchResults** are NOT the same thing. They have a clear semantic distinction:

### Agent (Configuration)
- **What it is**: A configured research task with scheduling parameters
- **Properties**:
  - `name`: Which agent to use (e.g., "research_analyst")
  - `query`: What to research
  - `schedule`: When to run ("daily", "weekly", "on-demand")
  - `threshold`: When to alert/notify
  - `createdAt`: When configured
  - `updatedAt`: When last modified
- **Lifecycle**: Persists across driver versions, can be modified
- **Purpose**: Defines WHAT to research and WHEN

### ResearchResult (Output/Snapshot)
- **What it is**: Point-in-time output from executing an agent
- **Properties**:
  - `agentId`: Which agent produced this
  - `executedAt`: When it ran
  - `summary`: Research findings summary
  - `keyFindings`: Array of insights
  - `sources`: URLs/references
  - `confidence`: "high|medium|low"
  - `fullResponse`: Complete AI response
  - `cost`: API cost
  - `tokensUsed`: Token count
  - `attachedToDriverId`: Which driver version
- **Lifecycle**: Immutable snapshot, never modified, versioned with driver
- **Purpose**: Records WHAT WAS FOUND and WHEN

## The Relationship

```
Driver (v1.0)
  └─ agents: [Agent]                    ← Configuration (mutable)
       ├─ @research_analyst
       │    ├─ query: "TAM for SaaS"
       │    └─ schedule: "weekly"
       └─ @sentiment_monitor
            ├─ query: "Market sentiment"
            └─ schedule: "daily"
  
  └─ researchResults: [ResearchSnapshot]  ← Outputs (immutable snapshots)
       ├─ ResearchSnapshot
       │    ├─ agentId: "research_analyst"
       │    ├─ executedAt: "2026-02-01T10:00:00Z"
       │    ├─ summary: "TAM estimated at $50B..."
       │    └─ attachedToDriverVersion: 1.0
       └─ ResearchSnapshot
            ├─ agentId: "sentiment_monitor"
            ├─ executedAt: "2026-02-02T08:00:00Z"
            ├─ summary: "Positive sentiment detected..."
            └─ attachedToDriverVersion: 1.0
```

## Why This Matters

### 1. Versioning
When you update a driver (e.g., change p50 from 50 to 60):
- **Agents** stay the same (still configured to research the same thing)
- **ResearchResults** get snapshotted with the version they belong to

### 2. Scheduling
- **Agents** have schedules ("run this weekly")
- **ResearchResults** are point-in-time executions (ran on Feb 2 at 8am)

### 3. Re-execution
- You can re-run an **Agent** with the same query
- Each execution produces a NEW **ResearchResult**
- Old results remain as historical evidence

### 4. Evidence Trail
- **ResearchResults** are immutable evidence
- Attached to specific driver versions
- Provide audit trail of "what did we know when we made this forecast?"

## Current Bug: Field Name Confusion

### What's Wrong
Frontend code treats them as the same thing:
```typescript
// ForecastWorkspaceScreen.tsx
driverBeingConfigured.agents  // ← Frontend uses "agents"

// But stores ResearchResults, not Agent configs!
setDriverBeingConfigured({
  ...driverBeingConfigured,
  agents: [...currentAgents, agentConfig],  // ← This is Agent CONFIG
});
```

### What Should Happen
```typescript
// Driver schema
interface Driver {
  // Agent configurations (mutable)
  agents: Agent[];
  
  // Research outputs (immutable snapshots)
  researchResults: ResearchSnapshot[];
}

// When user configures agent
const agentConfig: Agent = {
  name: "research_analyst",
  query: "What is TAM for SaaS?",
  schedule: "weekly",
  threshold: 10,
};

// When agent executes research
const researchResult: ResearchSnapshot = {
  agentId: agentConfig.name,
  executedAt: new Date(),
  summary: "TAM estimated at $50B...",
  keyFindings: [...],
  sources: [...],
  attachedToDriverId: driver.id,
  attachedToDriverVersion: driver.version,
};
```

## Required Changes

### 1. Update Driver Interface
```typescript
// types.ts
export interface Driver {
  id: string;
  name: string;
  type: 'binary' | 'continuous';
  
  // Agent configurations (what to research)
  agents: Agent[];
  
  // Research outputs (point-in-time results)
  researchResults: ResearchSnapshot[];
  
  // ... other fields
}

export interface Agent {
  id: string;
  name: string;           // e.g., "research_analyst"
  query: string;          // What to research
  schedule: 'daily' | 'weekly' | 'on-demand';
  threshold?: number;     // Alert threshold
  createdAt: string;
  updatedAt: string;
}

export interface ResearchSnapshot {
  id: string;
  agentId: string;        // Which agent produced this
  promptId: string;       // Which prompt template
  variables: object;      // Prompt variables
  summary: string;
  keyFindings: string[];
  sources: string[];
  confidence: 'high' | 'medium' | 'low';
  fullResponse: string;
  cost: number;
  tokensUsed: number;
  executedAt: Date;
  attachedToDriverId?: string;
  attachedToDriverVersion?: number;
}
```

### 2. Fix Frontend Code
```typescript
// When user saves agent configuration
setDriverBeingConfigured({
  ...driverBeingConfigured,
  agents: [...(driverBeingConfigured.agents || []), agentConfig],  // ✓ Correct
});

// When agent executes research (via /run @agent)
const result = await researchService.executeResearch({...});
setDriverBeingConfigured({
  ...driverBeingConfigured,
  researchResults: [                    // ✓ Add to researchResults
    ...(driverBeingConfigured.researchResults || []),
    {
      agentId: agentName,
      executedAt: new Date(),
      summary: result.summary,
      keyFindings: result.keyFindings,
      // ... etc
    }
  ]
});
```

### 3. Update Backend
```typescript
// database.ts - Driver already has both fields correctly!
export interface Driver {
  // ...existing fields...
  evidence: Evidence[];
  researchResults: ResearchSnapshot[];  // ✓ Already correct!
  // ...
}
```

### 4. Update UI Display
```typescript
// Show agent configurations
{driver.agents?.map(agent => (
  <View>
    <Text>Agent: @{agent.name}</Text>
    <Text>Query: {agent.query}</Text>
    <Text>Schedule: {agent.schedule}</Text>
  </View>
))}

// Show research results
{driver.researchResults?.map(result => (
  <View>
    <Text>From: @{result.agentId}</Text>
    <Text>Executed: {result.executedAt}</Text>
    <Text>Summary: {result.summary}</Text>
    <Text>Confidence: {result.confidence}</Text>
  </View>
))}
```

## Migration Strategy

### Phase 1: Add Both Fields
- Add `agents: Agent[]` to Driver type
- Keep `researchResults: ResearchSnapshot[]`
- Update UI to differentiate

### Phase 2: Migrate Data
For existing drivers that have "agents" array:
```typescript
// Old structure (incorrect)
driver.agents = [
  { name: "research_analyst", query: "...", schedule: "weekly" }
]

// New structure (correct)
driver.agents = [
  { 
    id: "ag-xyz",
    name: "research_analyst", 
    query: "...", 
    schedule: "weekly",
    createdAt: "...",
    updatedAt: "..."
  }
]
driver.researchResults = []  // Empty until agent executes
```

### Phase 3: Update Workflows
1. **Agent Configuration**: Updates `driver.agents[]`
2. **Agent Execution** (`/run @agent`): Adds to `driver.researchResults[]`
3. **Display**: Show both separately

## Conclusion

**NOT a naming choice** - both concepts need to exist:
- **agents**: Configured research tasks (mutable)
- **researchResults**: Point-in-time research outputs (immutable)

The bug is that frontend conflated these two concepts into one field.
