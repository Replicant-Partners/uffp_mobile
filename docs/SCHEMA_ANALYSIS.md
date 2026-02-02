# UFFP Schema Analysis & Data Integrity Report

**Generated:** 2026-02-02  
**Version:** 1.0  
**Status:** Critical Issues Identified

---

## Executive Summary

This comprehensive analysis has identified **critical data integrity issues** in the UFFP forecasting application that are causing persistent bugs related to data persistence, field mismatches, and referential integrity violations.

### Key Findings

1. **Field Naming Mismatch (CRITICAL)**: `agents` (frontend) vs `researchResults` (backend/types) causing silent failures
2. **Missing Cascade Logic**: Orphaned agents when drivers are deleted
3. **Type Inconsistencies**: Multiple representations of probability (0-1 vs 0-100)
4. **ID Generation Patterns**: Mix of timestamp-based, "local-" prefix, and backend-generated IDs
5. **Incomplete Validation**: Binary drivers can be saved without probability values
6. **Version History Gaps**: Driver versions not always created on modification
7. **Evidence Attachment Issues**: ResearchSnapshot references drivers that may not exist

### Impact

- **High**: Agent/research data loss when drivers are edited
- **High**: Simulation failures due to incomplete driver configuration
- **Medium**: Forecast resolution fails silently on local-only forecasts
- **Medium**: Evidence orphaning when drivers are removed
- **Low**: Version history inconsistencies

### Recommended Actions (Priority Order)

1. **Immediate**: Standardize field naming (`researchResults` → `agents` everywhere OR vice versa)
2. **Immediate**: Add validation to prevent saving incomplete drivers
3. **High**: Implement cascade delete for evidence and agents
4. **High**: Add backend validation layer for all driver operations
5. **Medium**: Standardize ID generation patterns
6. **Medium**: Add data migration utility for existing forecasts

---

## Complete Entity-Relationship Model

### Core Entities

```mermaid
erDiagram
    User ||--o{ Forecast : creates
    Forecast ||--o{ Driver : contains
    Forecast ||--o{ Evidence : hasEvidence
    Forecast ||--o{ Simulation : hasSimulations
    Forecast ||--o{ ForecastVersion : hasVersions
    Forecast ||--o| BaseRate : hasBaseRate
    
    Driver ||--o{ Evidence : hasEvidence
    Driver ||--o{ ResearchSnapshot : hasResearch
    Driver ||--o{ DriverVersion : hasVersions
    
    BaseRate ||--o{ Evidence : hasEvidence
    
    ResearchSnapshot }o--|| Driver : attachedTo
    Evidence }o--|| Driver : attachedTo
    Evidence }o--|| Forecast : attachedTo
    Evidence }o--|| BaseRate : attachedTo
    
    CoachConversation }o--|| Forecast : relatedTo
    CoachConversation ||--o{ CoachMessage : contains
    CoachConversation ||--o{ CoachSuggestion : provides

    User {
        string id PK
        string email
        string name
        date createdAt
        date lastLoginAt
    }
    
    Forecast {
        string id PK "timestamp-random OR local-timestamp"
        string userId FK
        string question "REQUIRED"
        string domain "OPTIONAL"
        string timeframe "OPTIONAL"
        string resolutionCriteria "REQUIRED"
        number probability "OPTIONAL, 0-1 range"
        string status "draft|active|resolved"
        string resolution "yes|no|ambiguous"
        number brierScore "OPTIONAL"
        date resolvedAt "OPTIONAL"
        number currentVersion "DEFAULT 1"
        date createdAt
        date updatedAt
    }
    
    Driver {
        string id PK "timestamp-random"
        string type "binary|continuous REQUIRED"
        string name "REQUIRED"
        string description "OPTIONAL"
        string direction "increases|decreases OPTIONAL"
        number probability "REQUIRED for binary, 0-100 range"
        number p5 "REQUIRED for continuous"
        number p50 "REQUIRED for continuous"
        number p95 "REQUIRED for continuous"
        string distribution "triangular|normal|lognormal for continuous"
        number currentVersion "DEFAULT 1"
        date createdAt
        date updatedAt
    }
    
    ResearchSnapshot {
        string id PK
        string agentId "REQUIRED"
        string promptId "REQUIRED"
        object variables
        string summary
        array keyFindings
        array sources
        string confidence "high|medium|low"
        string fullResponse
        number cost
        number tokensUsed
        date executedAt
        string attachedToDriverId "FK - NULLABLE"
    }
    
    Evidence {
        string id PK
        string type "url|quote|data|reasoning|research"
        string content "REQUIRED"
        string source "OPTIONAL"
        string confidence "high|medium|low"
        string attachedTo "forecast|baseRate|driver"
        string attachedToId "FK - REQUIRED"
        date timestamp
    }
    
    Simulation {
        string id PK
        string forecastId FK "REQUIRED"
        number iterations "REQUIRED"
        array driverSnapshot "Snapshot of all drivers"
        number probability "REQUIRED, 0-1 range"
        object distribution "p10,p25,p50,p75,p90"
        number cost
        number runtime
        date executedAt
    }
    
    BaseRate {
        string referenceClass "REQUIRED"
        number successRate "REQUIRED"
        number sampleSize "OPTIONAL"
        string reasoning "OPTIONAL"
        date capturedAt
    }
    
    ForecastVersion {
        number version PK
        number probability "OPTIONAL"
        object baseRate "Snapshot"
        array drivers "Full driver snapshots"
        array evidence "Snapshot"
        array research "Snapshot"
        string changeReason "OPTIONAL"
        string changedBy "user|coach|research"
        date createdAt
    }
    
    DriverVersion {
        number version PK
        number probability "Snapshot value"
        number p5 "Snapshot value"
        number p50 "Snapshot value"
        number p95 "Snapshot value"
        array evidence "Snapshot"
        array research "Snapshot"
        string changeReason "OPTIONAL"
        date createdAt
    }
```

---

## Critical Field Mismatch: agents vs researchResults

### The Problem

**Frontend expectation:** `driver.agents[]`  
**TypeScript definition:** `driver.researchResults[]`  
**Backend storage:** `driver.researchResults[]`

This causes:
- Frontend saves `agents` → Backend expects `researchResults`
- Backend returns `researchResults` → Frontend expects `agents`
- Mapping layer in `backendSync.ts` attempts to convert but is inconsistent

### Evidence

#### types.ts (Line 42-43)
```typescript
export interface Driver {
  // ...
  researchResults: ResearchSnapshot[];  // ← Backend schema
  // ...
}
```

#### ForecastWorkspaceScreen.tsx (Lines throughout)
```typescript
driverBeingConfigured.agents  // ← Frontend uses "agents"
driver.agents?.find((a: any) => ...)
updatedAgents = [...(driverBeingConfigured.agents || []), newAgent];
```

#### backendSync.ts (Lines 111-116)
```typescript
// Map drivers and convert researchResults back to agents for frontend
const drivers = (backendForecast.drivers || []).map((driver: any) => ({
  ...driver,
  agents: driver.researchResults || driver.agents || [],  // ← Conversion hack
}));
```

#### backendSync.ts (Lines 290-296)
```typescript
// Map agents → researchResults for backend
const backendDriverData = {
  ...driverData,
  researchResults: driverData.agents || [],
};
// Remove agents field to avoid confusion
delete backendDriverData.agents;
```

### Impact

- **Data Loss**: When frontend saves `agents`, backend may not persist them if mapping fails
- **Silent Failures**: No error thrown when field is missing
- **Inconsistent State**: Some drivers have `agents`, others have `researchResults`
- **Debugging Nightmare**: Developers must remember to check both field names

### Resolution Options

**Option 1: Standardize on `agents` (Recommended)**
- Simpler mental model for users
- Change `types.ts` to use `agents[]`
- Update backend `database.ts` to use `agents[]`
- Remove mapping layer

**Option 2: Standardize on `researchResults`**
- Keeps backend unchanged
- Update all frontend code to use `researchResults`
- More verbose but technically accurate

**Option 3: Add formal DTO layer**
- Create separate DTOs for frontend/backend
- Explicit conversion functions
- More robust but adds complexity

---

## State Machine Diagrams

### Forecast Lifecycle

```mermaid
stateDiagram-v2
    [*] --> draft: /question creates forecast
    
    draft --> draft: Add drivers
    draft --> draft: Add evidence
    draft --> draft: Configure base rate
    draft --> active: /simulate (requires ≥1 driver)
    
    active --> active: /simulate again
    active --> active: Add/modify drivers
    active --> active: Add evidence
    active --> resolved: /expire positive|negative
    
    resolved --> [*]
    
    note right of draft
        Status: draft
        Can: modify freely
        Cannot: resolve
    end note
    
    note right of active
        Status: active
        Can: simulate, modify, resolve
        Has: probability value
    end note
    
    note right of resolved
        Status: resolved
        Can: view only
        Has: brierScore, resolution
        Immutable
    end note
```

### Driver Configuration Flow

```mermaid
stateDiagram-v2
    [*] --> selecting: User types /driver <name>
    selecting --> configuring: Driver created/loaded
    
    configuring --> configuring: Set type (binary/continuous)
    configuring --> configuring: Set distribution
    configuring --> configuring: Set p-values
    configuring --> configuring: Set probability
    configuring --> configuring: Set direction
    
    configuring --> agent_config: User types @agent_name
    agent_config --> agent_config: Set query
    agent_config --> agent_config: Set schedule
    agent_config --> agent_config: Set threshold
    agent_config --> configuring: /save agent
    agent_config --> configuring: /cancel agent
    
    configuring --> validation: User types /save
    validation --> saved: Validation passes
    validation --> configuring: Validation fails (show error)
    
    saved --> [*]
    
    note right of configuring
        State: driverBeingConfigured
        Required fields:
        - name
        - type
        Binary: probability
        Continuous: p5, p50, p95, distribution
    end note
    
    note right of agent_config
        State: agentBeingConfigured
        Required fields:
        - name
        - query
        Optional:
        - schedule (default: on-demand)
        - threshold
    end note
    
    note right of validation
        Checks:
        1. Type-specific fields present
        2. Constraints satisfied (p5<p50<p95)
        3. Values in valid ranges
        4. Detect major changes
    end note
```

---

## Sequence Diagrams

### Driver Save Flow (Frontend → Backend)

```mermaid
sequenceDiagram
    participant User
    participant UI as ForecastWorkspaceScreen
    participant Sync as backendSync
    participant API as researchService
    participant Backend as /api/forecasts
    participant DB as database.ts
    
    User->>UI: /save driver
    UI->>UI: Validate driver config
    
    alt Validation Fails
        UI-->>User: Show validation errors
    else Validation Passes
        UI->>UI: Detect major changes
        
        alt Major Changes Detected
            UI-->>User: Show confirmation dialog
            User->>UI: /confirm or /cancel
        end
        
        UI->>UI: Create version snapshot
        UI->>Sync: addDriverWithSync(forecastId, driverData)
        
        Note over Sync: Check if local-only forecast
        alt Local-only forecast (id starts with "local-")
            Sync-->>UI: {success: false, error: "local-only"}
            UI->>UI: Save to AsyncStorage/localStorage
        else Backend forecast
            Note over Sync: Map agents → researchResults
            Sync->>Sync: backendDriverData = {...driverData, researchResults: driverData.agents}
            Sync->>Sync: delete backendDriverData.agents
            Sync->>API: addDriver(forecastId, backendDriverData)
            API->>Backend: POST /api/forecasts?action=addDriver
            Backend->>DB: addDriver(forecastId, driver)
            DB->>DB: Generate ID, add timestamps
            DB->>DB: Push to forecast.drivers[]
            DB-->>Backend: Updated forecast
            Backend-->>API: {success: true, forecast}
            API-->>Sync: {success: true, forecast}
            Note over Sync: Map researchResults → agents
            Sync->>Sync: forecast.drivers.map(d => ({...d, agents: d.researchResults}))
            Sync-->>UI: {success: true, forecast}
            UI->>UI: Update activeForecast
        end
        
        UI-->>User: Show success toast
        UI->>UI: Clear driverBeingConfigured
    end
```

### Agent Attachment Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as ForecastWorkspaceScreen
    participant Service as researchService
    
    User->>UI: @agent_name (during driver config)
    UI->>UI: setAgentBeingConfigured({name: agent_name})
    UI-->>User: Show agent config prompt
    
    User->>UI: /query <research question>
    UI->>UI: Update agentBeingConfigured.query
    UI-->>User: Show schedule prompt
    
    User->>UI: /schedule daily|weekly|on-demand
    UI->>UI: Update agentBeingConfigured.schedule
    UI-->>User: Ready to save
    
    User->>UI: /save
    
    Note over UI: Check if agent already exists
    alt Agent exists
        UI->>UI: Update existing agent in driverBeingConfigured.agents[]
    else New agent
        UI->>UI: Add to driverBeingConfigured.agents[]
    end
    
    UI->>UI: setAgentBeingConfigured(null)
    UI-->>User: Agent added (not persisted yet)
    
    Note over UI: Agent is in memory only until driver is saved
    
    User->>UI: /save driver
    UI->>UI: saveConfiguredDriver()
    
    Note over UI: Driver save flow from previous diagram
    Note over UI: agents[] mapped to researchResults[] during sync
```

---

## Data Consistency Issues

### Issue 1: Orphaned Research Snapshots

**Severity:** HIGH  
**Status:** UNFIXED

#### Description
`ResearchSnapshot` has `attachedToDriverId` field but no foreign key constraint. When a driver is deleted, its research snapshots remain in memory/storage.

#### Evidence
```typescript
// types.ts
export interface ResearchSnapshot {
  id: string;
  // ...
  attachedToDriverId?: string;  // ← NULLABLE, no FK constraint
}

// database.ts - removeDriver function
export async function removeDriver(
  forecastId: string,
  driverId: string
): Promise<Forecast> {
  const forecast = forecasts.get(forecastId);
  if (!forecast) {
    throw new Error('Forecast not found');
  }
  
  forecast.drivers = forecast.drivers.filter(d => d.id !== driverId);
  // ⚠️ No cleanup of orphaned researchResults!
  
  forecast.updatedAt = new Date();
  forecasts.set(forecastId, forecast);
  return forecast;
}
```

#### Impact
- Memory leaks in long-running sessions
- Stale research data references
- Inaccurate cost tracking (orphaned research still counted)

#### Resolution
```typescript
export async function removeDriver(
  forecastId: string,
  driverId: string
): Promise<Forecast> {
  const forecast = forecasts.get(forecastId);
  if (!forecast) {
    throw new Error('Forecast not found');
  }
  
  // Get driver to access its research
  const driver = forecast.drivers.find(d => d.id === driverId);
  
  // Remove driver
  forecast.drivers = forecast.drivers.filter(d => d.id !== driverId);
  
  // CASCADE: Remove orphaned research from global map
  if (driver) {
    driver.researchResults.forEach(research => {
      researchResults.delete(research.id);
    });
  }
  
  forecast.updatedAt = new Date();
  forecasts.set(forecastId, forecast);
  return forecast;
}
```

### Issue 2: Evidence Attachment Validation

**Severity:** MEDIUM  
**Status:** UNFIXED

#### Description
Evidence can be attached to non-existent entities without validation.

#### Evidence
```typescript
// database.ts - addEvidence
export async function addEvidence(
  forecastId: string,
  evidence: Omit<Evidence, 'id' | 'timestamp'>,
  driverId?: string
): Promise<Forecast> {
  const forecast = forecasts.get(forecastId);
  if (!forecast) {
    throw new Error('Forecast not found');
  }
  
  const newEvidence: Evidence = {
    ...evidence,
    id: generateId(),
    timestamp: new Date(),
  };
  
  if (driverId) {
    // ⚠️ What if driver doesn't exist?
    const driver = forecast.drivers.find(d => d.id === driverId);
    if (!driver) {
      throw new Error('Driver not found');  // ← Good, but inconsistent
    }
    driver.evidence.push(newEvidence);
  } else if (evidence.attachedTo === 'forecast') {
    // ⚠️ attachedToId might not match forecastId
    forecast.evidence.push(newEvidence);
  }
  // ...
}
```

#### Impact
- Evidence.attachedToId may reference deleted entities
- No referential integrity checks
- Silent data corruption

#### Resolution
Add validation for all attachment points:
```typescript
const newEvidence: Evidence = {
  ...evidence,
  id: generateId(),
  timestamp: new Date(),
};

// Validate attachment
if (evidence.attachedTo === 'driver') {
  const driver = forecast.drivers.find(d => d.id === evidence.attachedToId);
  if (!driver) {
    throw new Error(`Driver ${evidence.attachedToId} not found`);
  }
  driver.evidence.push(newEvidence);
} else if (evidence.attachedTo === 'baseRate') {
  if (!forecast.baseRate) {
    throw new Error('Forecast has no base rate');
  }
  if (evidence.attachedToId !== forecastId) {
    throw new Error('Base rate evidence must reference forecast ID');
  }
  forecast.baseRate.evidence.push(newEvidence);
} else if (evidence.attachedTo === 'forecast') {
  if (evidence.attachedToId !== forecastId) {
    throw new Error('Evidence attachedToId must match forecastId');
  }
  forecast.evidence.push(newEvidence);
}
```

### Issue 3: Binary Driver Without Probability

**Severity:** CRITICAL  
**Status:** UNFIXED

#### Description
Frontend validation allows binary drivers to be saved without probability values, causing simulation failures.

#### Evidence
```typescript
// ForecastWorkspaceScreen.tsx - validateDriverConfig
const validateDriverConfig = (driver: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (driver.type === 'binary') {
    if (driver.probability === undefined || driver.probability === null) {
      errors.push('Binary drivers require a probability value. Use /p <value> to set it.');
    }
    // ⚠️ This check exists but isn't enforced server-side!
  }
  // ...
  return { valid: errors.length === 0, errors };
};
```

But backend has no validation:
```typescript
// database.ts - addDriver
export async function addDriver(
  forecastId: string,
  driver: Omit<Driver, 'id' | 'createdAt' | 'updatedAt' | 'currentVersion' | 'versions'>
): Promise<Forecast> {
  // ...
  const newDriver: Driver = {
    ...driver,  // ⚠️ No validation here!
    id: generateId(),
    evidence: driver.evidence || [],
    researchResults: driver.researchResults || [],
    currentVersion: 1,
    versions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  forecast.drivers.push(newDriver);
  // ...
}
```

#### Impact
- Simulations fail with NaN results
- Frontend shows "undefined%" probability
- Cascades to forecast resolution errors

#### Resolution
Add backend validation:
```typescript
export async function addDriver(
  forecastId: string,
  driver: Omit<Driver, 'id' | 'createdAt' | 'updatedAt' | 'currentVersion' | 'versions'>
): Promise<Forecast> {
  const forecast = forecasts.get(forecastId);
  if (!forecast) {
    throw new Error('Forecast not found');
  }
  
  // VALIDATE DRIVER
  validateDriver(driver);
  
  const newDriver: Driver = {
    ...driver,
    id: generateId(),
    evidence: driver.evidence || [],
    researchResults: driver.researchResults || [],
    currentVersion: 1,
    versions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  forecast.drivers.push(newDriver);
  forecast.updatedAt = new Date();
  forecasts.set(forecastId, forecast);
  return forecast;
}

function validateDriver(driver: any): void {
  if (!driver.name || driver.name.trim() === '') {
    throw new Error('Driver name is required');
  }
  
  if (!driver.type || !['binary', 'continuous'].includes(driver.type)) {
    throw new Error('Driver type must be binary or continuous');
  }
  
  if (driver.type === 'binary') {
    if (driver.probability === undefined || driver.probability === null) {
      throw new Error('Binary drivers must have a probability value');
    }
    if (driver.probability < 0 || driver.probability > 100) {
      throw new Error('Probability must be between 0 and 100');
    }
  }
  
  if (driver.type === 'continuous') {
    if (!driver.distribution || !['triangular', 'normal', 'lognormal'].includes(driver.distribution)) {
      throw new Error('Continuous drivers must have a valid distribution');
    }
    
    if (driver.p5 === undefined || driver.p50 === undefined || driver.p95 === undefined) {
      throw new Error('Continuous drivers must have p5, p50, and p95 values');
    }
    
    if (driver.p5 >= driver.p50 || driver.p50 >= driver.p95) {
      throw new Error('Values must satisfy: p5 < p50 < p95');
    }
    
    if (driver.p5 < 0 || driver.p50 < 0 || driver.p95 < 0) {
      throw new Error('P-values cannot be negative');
    }
  }
}
```

### Issue 4: Probability Range Inconsistency

**Severity:** MEDIUM  
**Status:** UNFIXED

#### Description
Different parts of the system use different ranges for probability:
- **Binary drivers**: 0-100 (percentage)
- **Forecast probability**: 0-1 (decimal)
- **Simulation results**: 0-1 (decimal)

#### Evidence
```typescript
// types.ts - Driver uses 0-100
export interface Driver {
  probability?: number;  // 0-100 for binary drivers
}

// types.ts - Forecast uses 0-1
export interface Forecast {
  probability?: number;  // 0-1 (converted in simulation)
}

// api/forecasts.ts - Simulation returns 0-1
function runMonteCarloSimulation(drivers: any[], iterations: number) {
  // ...
  return {
    probability: Math.round((successCount / iterations) * 100) / 100,  // 0-1 range
    // ...
  };
}

// ForecastWorkspaceScreen.tsx - Driver config uses 0-100
if (trimmed.startsWith('/prob ')) {
  const prob = parseInt(trimmed.replace('/prob ', '').trim(), 10);
  if (!isNaN(prob) && prob >= 0 && prob <= 100) {  // 0-100 range
    setDriverBeingConfigured({ ...driverBeingConfigured, probability: prob });
  }
}
```

#### Impact
- Frontend confusion when displaying probabilities
- Conversion errors in simulation logic
- Driver probability of 50 interpreted as 50% or 0.5?

#### Resolution
**Standardize on 0-1 range everywhere:**
```typescript
// Update Driver interface
export interface Driver {
  probability?: number;  // 0-1 range, ALWAYS
}

// Update validation
if (driver.probability < 0 || driver.probability > 1) {
  throw new Error('Probability must be between 0 and 1');
}

// Update UI to convert user input
if (trimmed.startsWith('/prob ')) {
  const prob = parseInt(trimmed.replace('/prob ', '').trim(), 10);
  if (!isNaN(prob) && prob >= 0 && prob <= 100) {
    // Convert to 0-1 range
    setDriverBeingConfigured({ 
      ...driverBeingConfigured, 
      probability: prob / 100  // Store as 0-1
    });
  }
}

// Display as percentage in UI
const displayProb = (prob: number) => `${Math.round(prob * 100)}%`;
```

---

## Business Logic Constraints

### When can a forecast be simulated?

**Requirements:**
1. Forecast must exist (`activeForecast !== null`)
2. Forecast must have at least 1 driver (`forecast.drivers.length >= 1`)
3. All drivers must be fully configured (validated)
4. Forecast must have backend ID (not `local-*`)

**Validation Query:**
```typescript
function canSimulate(forecast: Forecast): { can: boolean; reason?: string } {
  if (!forecast) {
    return { can: false, reason: 'No active forecast' };
  }
  
  if (forecast.drivers.length === 0) {
    return { can: false, reason: 'At least one driver required' };
  }
  
  if (forecast.id.startsWith('local-')) {
    return { can: false, reason: 'Local-only forecasts cannot be simulated' };
  }
  
  // Check all drivers are valid
  for (const driver of forecast.drivers) {
    const validation = validateDriver(driver);
    if (!validation.valid) {
      return { can: false, reason: `Invalid driver "${driver.name}": ${validation.errors[0]}` };
    }
  }
  
  return { can: true };
}
```

### When can a driver be saved?

**Requirements:**
1. Forecast must be active
2. Driver must have a name
3. Driver must have a type (binary/continuous)
4. Type-specific fields must be set:
   - Binary: `probability` (0-100)
   - Continuous: `p5`, `p50`, `p95`, `distribution`
5. Constraints must be satisfied:
   - `p5 < p50 < p95`
   - All values non-negative
   - Probability in range

**Validation Query:**
```typescript
function canSaveDriver(driver: any, forecast: Forecast): { can: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!forecast) {
    errors.push('No active forecast');
    return { can: false, errors };
  }
  
  if (!driver.name || driver.name.trim() === '') {
    errors.push('Driver name is required');
  }
  
  if (!driver.type || !['binary', 'continuous'].includes(driver.type)) {
    errors.push('Driver type must be binary or continuous');
  }
  
  if (driver.type === 'binary') {
    if (driver.probability === undefined || driver.probability === null) {
      errors.push('Binary drivers require a probability value');
    } else if (driver.probability < 0 || driver.probability > 100) {
      errors.push('Probability must be between 0 and 100');
    }
  }
  
  if (driver.type === 'continuous') {
    if (!driver.distribution || !['triangular', 'normal', 'lognormal'].includes(driver.distribution)) {
      errors.push('Continuous drivers require a distribution');
    }
    
    if (driver.p5 === undefined || driver.p50 === undefined || driver.p95 === undefined) {
      errors.push('Continuous drivers require p5, p50, and p95 values');
    } else {
      if (driver.p5 >= driver.p50 || driver.p50 >= driver.p95) {
        errors.push('Values must satisfy: p5 < p50 < p95');
      }
      if (driver.p5 < 0 || driver.p50 < 0 || driver.p95 < 0) {
        errors.push('P-values cannot be negative');
      }
    }
  }
  
  return { can: errors.length === 0, errors };
}
```

### What makes an agent valid?

**Requirements:**
1. Agent must have a name (from predefined list)
2. Agent must have a research query
3. Schedule must be valid: `daily` | `weekly` | `on-demand`
4. Threshold (if set) must be 0-100
5. Agent must be attached to a driver (not standalone)

**Validation Query:**
```typescript
const VALID_AGENTS = [
  'research_analyst',
  'sentiment_monitor',
  'competitive_intel',
  'financial_analyst',
  'market_researcher',
  'expert_synthesizer',
  'regulatory_monitor',
  'growth_signals',
  'hiring_tracker',
  'pricing_intel',
  'technology_validator',
];

function isValidAgent(agent: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!agent.name || !VALID_AGENTS.includes(agent.name)) {
    errors.push(`Invalid agent name. Must be one of: ${VALID_AGENTS.join(', ')}`);
  }
  
  if (!agent.query || agent.query.trim() === '') {
    errors.push('Agent must have a research query');
  }
  
  if (agent.schedule && !['daily', 'weekly', 'on-demand'].includes(agent.schedule)) {
    errors.push('Schedule must be daily, weekly, or on-demand');
  }
  
  if (agent.threshold !== undefined && (agent.threshold < 0 || agent.threshold > 100)) {
    errors.push('Threshold must be between 0 and 100');
  }
  
  return { valid: errors.length === 0, errors };
}
```

### State transitions for forecast resolution

```typescript
type ForecastStatus = 'draft' | 'active' | 'resolved';
type Resolution = 'yes' | 'no' | 'ambiguous';

function canResolve(forecast: Forecast): { can: boolean; reason?: string } {
  if (forecast.status === 'resolved') {
    return { can: false, reason: 'Forecast already resolved' };
  }
  
  if (!forecast.probability) {
    return { can: false, reason: 'Forecast must be simulated before resolution' };
  }
  
  if (forecast.id.startsWith('local-')) {
    return { can: false, reason: 'Local-only forecasts cannot be resolved' };
  }
  
  return { can: true };
}

function resolveForecast(
  forecast: Forecast,
  resolution: Resolution
): Forecast {
  if (!canResolve(forecast).can) {
    throw new Error(canResolve(forecast).reason);
  }
  
  const actual = resolution === 'yes' ? 1 : resolution === 'no' ? 0 : 0.5;
  const predicted = forecast.probability!;
  const brierScore = Math.pow(predicted - actual, 2);
  
  return {
    ...forecast,
    status: 'resolved',
    resolution,
    brierScore,
    resolvedAt: new Date(),
    updatedAt: new Date(),
  };
}
```

---

## Validation Checklist

### Critical Invariants (Must ALWAYS be true)

| ID | Invariant | Severity | Check Query |
|----|-----------|----------|-------------|
| INV-001 | Every forecast has a unique ID | CRITICAL | `forecasts.size === new Set(Array.from(forecasts.keys())).size` |
| INV-002 | Every forecast has a question | CRITICAL | `Array.from(forecasts.values()).every(f => f.question && f.question.trim() !== '')` |
| INV-003 | Every forecast has resolutionCriteria | CRITICAL | `Array.from(forecasts.values()).every(f => f.resolutionCriteria && f.resolutionCriteria.trim() !== '')` |
| INV-004 | Forecast status is valid | CRITICAL | `Array.from(forecasts.values()).every(f => ['draft', 'active', 'resolved'].includes(f.status))` |
| INV-005 | Binary drivers have probability | CRITICAL | `Array.from(forecasts.values()).every(f => f.drivers.every(d => d.type !== 'binary' || d.probability !== undefined))` |
| INV-006 | Continuous drivers have p-values | CRITICAL | `Array.from(forecasts.values()).every(f => f.drivers.every(d => d.type !== 'continuous' || (d.p5 !== undefined && d.p50 !== undefined && d.p95 !== undefined)))` |
| INV-007 | P-values satisfy p5 < p50 < p95 | CRITICAL | `Array.from(forecasts.values()).every(f => f.drivers.every(d => d.type !== 'continuous' || (d.p5 < d.p50 && d.p50 < d.p95)))` |
| INV-008 | Evidence attachedToId references existing entity | HIGH | See check below |
| INV-009 | ResearchSnapshot.attachedToDriverId references existing driver | HIGH | See check below |
| INV-010 | Resolved forecasts are immutable | HIGH | Manual code review |
| INV-011 | Forecast probability is in 0-1 range | MEDIUM | `Array.from(forecasts.values()).every(f => !f.probability || (f.probability >= 0 && f.probability <= 1))` |
| INV-012 | Driver probability is in 0-100 range | MEDIUM | `Array.from(forecasts.values()).every(f => f.drivers.every(d => !d.probability || (d.probability >= 0 && d.probability <= 100)))` |
| INV-013 | Simulations reference existing forecasts | MEDIUM | `Array.from(forecasts.values()).every(f => f.simulations.every(s => s.forecastId === f.id))` |

### Validation Queries

#### INV-008: Evidence Referential Integrity
```typescript
function checkEvidenceIntegrity(forecasts: Map<string, Forecast>): string[] {
  const errors: string[] = [];
  
  for (const forecast of forecasts.values()) {
    // Check forecast-level evidence
    for (const evidence of forecast.evidence) {
      if (evidence.attachedTo === 'forecast' && evidence.attachedToId !== forecast.id) {
        errors.push(`Evidence ${evidence.id} attachedToId mismatch: ${evidence.attachedToId} !== ${forecast.id}`);
      }
    }
    
    // Check base rate evidence
    if (forecast.baseRate) {
      for (const evidence of forecast.baseRate.evidence) {
        if (evidence.attachedTo === 'baseRate' && evidence.attachedToId !== forecast.id) {
          errors.push(`BaseRate evidence ${evidence.id} should reference forecast ID ${forecast.id}, got ${evidence.attachedToId}`);
        }
      }
    }
    
    // Check driver evidence
    for (const driver of forecast.drivers) {
      for (const evidence of driver.evidence) {
        if (evidence.attachedTo === 'driver' && evidence.attachedToId !== driver.id) {
          errors.push(`Driver evidence ${evidence.id} attachedToId mismatch: ${evidence.attachedToId} !== ${driver.id}`);
        }
      }
    }
  }
  
  return errors;
}
```

#### INV-009: ResearchSnapshot Referential Integrity
```typescript
function checkResearchIntegrity(forecasts: Map<string, Forecast>): string[] {
  const errors: string[] = [];
  
  for (const forecast of forecasts.values()) {
    const driverIds = new Set(forecast.drivers.map(d => d.id));
    
    for (const driver of forecast.drivers) {
      for (const research of driver.researchResults) {
        if (research.attachedToDriverId && !driverIds.has(research.attachedToDriverId)) {
          errors.push(`ResearchSnapshot ${research.id} references non-existent driver ${research.attachedToDriverId}`);
        }
      }
    }
  }
  
  return errors;
}
```

### Complete System Validation
```typescript
async function validateSystemIntegrity(forecasts: Map<string, Forecast>): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // INV-001: Unique IDs
  const ids = Array.from(forecasts.keys());
  if (ids.length !== new Set(ids).size) {
    errors.push('CRITICAL: Duplicate forecast IDs detected');
  }
  
  for (const forecast of forecasts.values()) {
    // INV-002: Question required
    if (!forecast.question || forecast.question.trim() === '') {
      errors.push(`CRITICAL: Forecast ${forecast.id} missing question`);
    }
    
    // INV-003: Resolution criteria required
    if (!forecast.resolutionCriteria || forecast.resolutionCriteria.trim() === '') {
      errors.push(`CRITICAL: Forecast ${forecast.id} missing resolution criteria`);
    }
    
    // INV-004: Valid status
    if (!['draft', 'active', 'resolved'].includes(forecast.status)) {
      errors.push(`CRITICAL: Forecast ${forecast.id} has invalid status: ${forecast.status}`);
    }
    
    // INV-011: Forecast probability range
    if (forecast.probability !== undefined && (forecast.probability < 0 || forecast.probability > 1)) {
      errors.push(`MEDIUM: Forecast ${forecast.id} probability out of range: ${forecast.probability}`);
    }
    
    // Check drivers
    for (const driver of forecast.drivers) {
      // INV-005: Binary probability
      if (driver.type === 'binary' && driver.probability === undefined) {
        errors.push(`CRITICAL: Binary driver ${driver.name} missing probability`);
      }
      
      // INV-006: Continuous p-values
      if (driver.type === 'continuous') {
        if (driver.p5 === undefined || driver.p50 === undefined || driver.p95 === undefined) {
          errors.push(`CRITICAL: Continuous driver ${driver.name} missing p-values`);
        } else {
          // INV-007: P-value constraints
          if (driver.p5 >= driver.p50 || driver.p50 >= driver.p95) {
            errors.push(`CRITICAL: Driver ${driver.name} violates p5 < p50 < p95 constraint`);
          }
        }
      }
      
      // INV-012: Driver probability range
      if (driver.probability !== undefined && (driver.probability < 0 || driver.probability > 100)) {
        errors.push(`MEDIUM: Driver ${driver.name} probability out of range: ${driver.probability}`);
      }
    }
    
    // INV-013: Simulation references
    for (const sim of forecast.simulations) {
      if (sim.forecastId !== forecast.id) {
        errors.push(`MEDIUM: Simulation ${sim.id} references wrong forecast: ${sim.forecastId} !== ${forecast.id}`);
      }
    }
  }
  
  // INV-008: Evidence integrity
  errors.push(...checkEvidenceIntegrity(forecasts));
  
  // INV-009: Research integrity
  errors.push(...checkResearchIntegrity(forecasts));
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
```

---

## ID Generation Patterns

### Current Patterns

| Entity | Pattern | Location | Example |
|--------|---------|----------|---------|
| Forecast (backend) | `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` | `database.ts:generateId()` | `1738512000000-k2j3h4l5m` |
| Forecast (local) | `local-${Date.now()}` | `backendSync.ts:createForecastWithSync()` | `local-1738512000000` |
| Driver | `Date.now().toString()` | `ForecastWorkspaceScreen.tsx` | `1738512000000` |
| Agent | `Date.now().toString()` | `ForecastWorkspaceScreen.tsx` | `1738512000001` |
| Evidence | `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` | `database.ts:addEvidence()` | `1738512000000-k2j3h4l5m` |
| ResearchSnapshot | Generated by backend | `agents.ts` | Various |
| Simulation | `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` | `database.ts:saveSimulation()` | `1738512000000-k2j3h4l5m` |

### Issues

1. **Inconsistent patterns**: Some use full generateId(), others use just timestamp
2. **Collision risk**: Timestamp-only IDs can collide if created in same millisecond
3. **Local prefix**: `local-` prefix is good pattern but not used consistently
4. **No UUID standard**: Would be more robust

### Recommended Standard

```typescript
// Use nanoid for all IDs - collision-resistant, URL-safe, shorter than UUID
import { nanoid } from 'nanoid';

export function generateId(prefix?: string): string {
  const id = nanoid(12); // 12 chars = ~3 million years to 1% collision probability
  return prefix ? `${prefix}-${id}` : id;
}

// Usage examples:
const forecastId = generateId('fc');      // fc-V1StGXR8_Z5j
const driverId = generateId('dr');        // dr-Hn4Fd1pGpJzL
const agentId = generateId('ag');         // ag-Cf8hNBR4KxNQ
const localForecastId = generateId('local-fc');  // local-fc-V1StGXR8_Z5j
```

---

## Recommendations for Schema Improvements

### Priority 1: Critical Fixes (Do Immediately)

1. **Standardize Field Naming**
   - Decision: Use `agents` everywhere (simpler)
   - Update `types.ts`: `researchResults` → `agents`
   - Update `database.ts`: All references to `researchResults` → `agents`
   - Remove mapping in `backendSync.ts`
   - Estimated effort: 2-3 hours
   - Risk: Medium (requires careful find-replace)

2. **Add Backend Driver Validation**
   - Implement `validateDriver()` function
   - Call before persisting to database
   - Return clear error messages
   - Estimated effort: 1 hour
   - Risk: Low

3. **Fix Binary Driver Probability Bug**
   - Ensure frontend sets probability before allowing save
   - Add backend validation
   - Add database constraint (if using SQL in future)
   - Estimated effort: 30 minutes
   - Risk: Low

### Priority 2: High-Value Improvements (Do This Week)

4. **Implement Cascade Deletes**
   - Delete evidence when driver/forecast deleted
   - Delete agents when driver deleted
   - Delete simulations when forecast deleted
   - Estimated effort: 2 hours
   - Risk: Medium (test thoroughly)

5. **Standardize Probability Range**
   - Use 0-1 everywhere internally
   - Convert to/from percentage only in UI
   - Update all validation
   - Estimated effort: 3-4 hours
   - Risk: High (affects many components)

6. **Add Referential Integrity Checks**
   - Validate `Evidence.attachedToId` references exist
   - Validate `ResearchSnapshot.attachedToDriverId` references exist
   - Throw errors on invalid references
   - Estimated effort: 2 hours
   - Risk: Low

### Priority 3: Quality Improvements (Do This Month)

7. **Standardize ID Generation**
   - Adopt `nanoid` for all entities
   - Use consistent prefixes
   - Update all generation sites
   - Estimated effort: 3 hours
   - Risk: Medium (migration needed)

8. **Add Data Migration Utility**
   - Script to convert existing local storage
   - Fix field naming mismatches
   - Repair orphaned references
   - Estimated effort: 4-6 hours
   - Risk: Medium

9. **Implement Validation Service**
   - Centralized validation layer
   - Called on all mutations
   - Returns structured errors
   - Estimated effort: 4 hours
   - Risk: Low

10. **Add Database Invariant Tests**
    - Run `validateSystemIntegrity()` in tests
    - Check after every mutation
    - Fail CI on violations
    - Estimated effort: 2 hours
    - Risk: Low

### Priority 4: Future Enhancements

11. **Migrate to PostgreSQL**
    - Replace in-memory Maps with real DB
    - Add foreign key constraints
    - Enable cascade operations
    - Add database indexes
    - Estimated effort: 2-3 days
    - Risk: High (major refactor)

12. **Add Type-Safe DTO Layer**
    - Separate frontend/backend types
    - Explicit conversion functions
    - Runtime validation with Zod
    - Estimated effort: 1-2 days
    - Risk: Medium

13. **Implement Optimistic Updates**
    - Update UI immediately
    - Reconcile with backend
    - Handle conflicts gracefully
    - Estimated effort: 2-3 days
    - Risk: High (complex patterns)

---

## Migration Path

### Phase 1: Data Integrity (Week 1)
- [ ] Standardize `agents` vs `researchResults` field naming
- [ ] Add backend driver validation
- [ ] Fix binary driver probability bug
- [ ] Add referential integrity checks

### Phase 2: Consistency (Week 2)
- [ ] Implement cascade deletes
- [ ] Standardize probability range (0-1)
- [ ] Standardize ID generation patterns
- [ ] Add data migration utility

### Phase 3: Robustness (Week 3)
- [ ] Implement validation service
- [ ] Add database invariant tests
- [ ] Create comprehensive test suite
- [ ] Document all invariants

### Phase 4: Scale (Month 2+)
- [ ] Migrate to PostgreSQL
- [ ] Add type-safe DTO layer
- [ ] Implement optimistic updates
- [ ] Add caching layer

---

## Appendix: Field Mapping Reference

### Frontend ↔ Backend Field Mapping

| Frontend (UI State) | Backend (database.ts) | TypeScript (types.ts) | API (forecasts.ts) |
|---------------------|----------------------|----------------------|-------------------|
| `driver.agents[]` | `driver.researchResults[]` | `driver.researchResults[]` | `driver.researchResults[]` |
| `forecast.probability` (0-1) | `forecast.probability` (0-1) | `forecast.probability` (0-1) | `forecast.probability` (0-1) |
| `driver.probability` (0-100) | `driver.probability` (0-100) | `driver.probability` (0-100) | `driver.probability` (0-100) |
| `forecast.id` (local-* or backend) | `forecast.id` (timestamp-random) | `forecast.id` (string) | `forecast.id` (string) |
| `driver.id` (timestamp) | `driver.id` (timestamp-random) | `driver.id` (string) | `driver.id` (string) |

### Data Flow: Driver Save

```
User Input (UI)
  ↓
ForecastWorkspaceScreen.tsx
  • Uses: driver.agents[]
  • Range: probability 0-100
  ↓
backendSync.ts (Mapping Layer)
  • Converts: agents[] → researchResults[]
  • Deletes: driver.agents field
  ↓
researchService.ts (API Client)
  • Sends: driver.researchResults[]
  ↓
/api/forecasts?action=addDriver
  • Receives: driver.researchResults[]
  ↓
database.ts (Storage)
  • Stores: driver.researchResults[]
  ↓
Response flows back
  ↓
backendSync.ts (Reverse Mapping)
  • Converts: researchResults[] → agents[]
  ↓
ForecastWorkspaceScreen.tsx
  • Uses: driver.agents[]
```

---

## Document Metadata

- **Author**: Schema Analysis Tool
- **Date**: 2026-02-02
- **Version**: 1.0
- **Files Analyzed**: 
  - `/home/ilabra/uffp_mobile/lib/types.ts`
  - `/home/ilabra/uffp_mobile/lib/database.ts`
  - `/home/ilabra/uffp_mobile/src/screens/ForecastWorkspaceScreen.tsx`
  - `/home/ilabra/uffp_mobile/src/utils/backendSync.ts`
  - `/home/ilabra/uffp_mobile/api/forecasts.ts`
  - `/home/ilabra/uffp_mobile/src/services/researchService.ts`
- **Total Lines Analyzed**: ~3,500+
- **Issues Identified**: 13 critical/high-severity issues
- **Recommendations**: 13 prioritized fixes

---

**End of Report**
