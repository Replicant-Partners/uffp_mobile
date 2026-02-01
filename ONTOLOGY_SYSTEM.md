# UFFP Ontology System

## Overview

The UFFP Ontology System gives @fermi (the forecasting coach agent) conceptual understanding of the forecasting domain. It's a simplified, cleaner adaptation of the worldview plugin originally built for ElizaOS.

## Architecture

### Core Components

1. **Types** (`src/services/ontology/types.ts`)
   - Entity types: FORECAST, DRIVER, EVIDENCE, SIMULATION, OUTCOME, etc.
   - Relationship types: HAS, INFLUENCES, SUPPORTS, CREATED_BY, etc.
   - Cardinality semantics: OneToOne, OneToMany, ManyToOne, ManyToMany

2. **Graph** (`src/services/ontology/graph.ts`)
   - Entity and relationship storage
   - Query methods for traversing the graph
   - Statistics and export capabilities

3. **Observer** (`src/services/ontology/observer.ts`)
   - Pattern detection from user interactions
   - Co-occurrence analysis
   - Suggestion generation for new relationships

4. **Seed Ontology** (`src/services/ontology/seed.ts`)
   - 13 core entities representing UFFP concepts
   - 17 foundational relationships
   - Concept explanations for distributions, parameters, commands

5. **Service** (`src/services/ontology/index.ts`)
   - Main API for @fermi integration
   - Context-aware coaching
   - Concept lookup and search

## Key Differences from Original Worldview Plugin

### Removed (for simplicity)
- ✗ ElizaOS dependencies (Memory, IAgentRuntime, elizaLogger)
- ✗ Vector stores and embeddings (LanceDB, embedding service)
- ✗ LLM-based enrichment (syntactic/lexical/semantic)
- ✗ Agent-OM matching and validation
- ✗ Mermaid diagram serialization
- ✗ Complex inference engine with transitive rules

### Added (UFFP-specific)
- ✓ Forecasting domain entities and relationships
- ✓ Concept explanations database
- ✓ Context-aware coaching for different views
- ✓ Command suggestions based on user state
- ✓ Pattern learning from user behavior

### Simplified
- Lightweight pattern detection (no NER, just regex + context)
- Simple observation-based learning
- Direct TypeScript/React Native integration
- No external database dependencies

## Seed Ontology Structure

### Entities

**Core Forecasting:**
- FORECAST - A prediction with drivers and outcome
- DRIVER - Factor influencing the forecast
- EVIDENCE - Research supporting drivers
- SIMULATION - Monte Carlo simulation run
- OUTCOME - The predicted result

**Configuration:**
- DISTRIBUTION - Probability distribution type
- PARAMETER - Quantile values (p5, p50, p95)
- METRIC - Brier scores, calibration metrics

**User Interaction:**
- USER - The forecaster
- AGENT - AI assistant
- QUERY - User question
- COMMAND - Action like /p, /dist, /save
- RESEARCH - Agent-generated analysis

### Key Relationships

```
FORECAST ||--o{ DRIVER        (has)
FORECAST ||--|| OUTCOME        (has)
FORECAST ||--o{ SIMULATION     (produces)

DRIVER ||--|| DISTRIBUTION     (has)
DRIVER ||--o{ PARAMETER        (has)
DRIVER }o--o{ DRIVER          (influences)

EVIDENCE }o--|| DRIVER        (supports)
AGENT ||--o{ RESEARCH         (produces)
RESEARCH ||--o{ EVIDENCE      (produces)

USER }o--o{ AGENT             (invokes)
USER }o--o{ DRIVER            (configures)
```

## How @fermi Uses the Ontology

### 1. Concept Lookup

When user asks about a concept:
```typescript
@fermi: "triangular"
→ Returns explanation of triangular distribution
```

### 2. Context Awareness

Different guidance based on current view:
- **forecast_list**: Suggest creating/reviewing forecasts
- **workspace**: Suggest adding drivers, running research
- **simulation**: Help interpret results
- **evidence**: Help apply research to drivers

### 3. Pattern Learning

Observes user actions:
```typescript
ontology.observe({
  type: "create",
  entity: "USER",
  target: "DRIVER",
  context: "created driver: Market Size (continuous)"
});
```

After multiple observations, suggests new relationships:
```typescript
→ Suggestion: "USER frequently configures DRIVER after invoking AGENT"
→ Could suggest: "Run research before configuring parameters?"
```

### 4. Command Suggestions

Based on current context:
```typescript
getCommandSuggestions(context)
→ ["/p [p5] [p50] [p95] - Set driver parameters",
   "/dist [type] - Set distribution type",
   "@fermi Ask me anything!"]
```

## Integration Points

### ForecastWorkspaceScreen.tsx

1. **@fermi Invocation** (line 408)
   - Loads ontology service
   - Observes user query
   - Checks for concept matches
   - Provides context-aware coaching

2. **Driver Save** (line 906)
   - Observes driver creation/modification
   - Learns user patterns
   - Builds relationship graph

### Future Integration Points

- Research agent invocation (observe AGENT → RESEARCH → EVIDENCE)
- Simulation runs (observe FORECAST → SIMULATION)
- Evidence application (observe EVIDENCE → DRIVER)
- View changes (observe USER → VIEW patterns)

## Concept Database

Pre-loaded explanations for:

**Distributions:** triangular, normal, lognormal
**Parameters:** p5, p50, p95
**Direction:** increases, decreases
**Evidence:** research support
**Simulation:** Monte Carlo process
**Metrics:** Brier score
**Commands:** /p, /dist, /direction, /save

## Example Usage

```typescript
// Initialize (happens automatically on first import)
import { getOntologyService } from '../services/ontology';
const ontology = getOntologyService();

// Observe user action
ontology.observe({
  type: "create",
  entity: "USER",
  target: "FORECAST",
  context: "created forecast: Will AMD reach $200?"
});

// Get context for @fermi
const context = ontology.getContext({
  currentView: "workspace",
  activeForecastId: "forecast-123",
  recentActions: ["configured driver", "ran research"]
});

// Lookup concept
const explanation = ontology.explainConcept("p95");
// Returns: "p95 (95th percentile): You're 95% confident..."

// Search concepts
const results = ontology.searchConcepts("distribution");
// Returns: [{concept: "triangular", explanation: "..."}, ...]

// Get suggestions from patterns
const suggestions = ontology.getSuggestions();
// Returns: [{type: "new_relationship", confidence: 0.8, ...}]
```

## Performance Considerations

- Singleton pattern - one instance per app lifecycle
- In-memory storage only (no disk I/O)
- Bounded observation history (max 100 recent actions)
- No expensive LLM calls or embeddings
- Lightweight pattern matching

## Future Enhancements

### Phase 2: Natural Language Understanding
- Parse user queries like "What's the best distribution for stock prices?"
- Extract intent and entities from free-form text
- Generate contextual responses beyond canned explanations

### Phase 3: Advanced Pattern Learning
- Detect user expertise level from observation patterns
- Personalized coaching based on common mistakes
- Suggest research queries based on driver types
- Auto-complete driver configurations from similar past cases

### Phase 4: Collaborative Ontology
- Share learned patterns across users (privacy-preserving)
- Community-validated concept explanations
- Best practices database from top forecasters

## Testing

The ontology system will be tested through:

1. **Concept Lookup**: Ask @fermi about "triangular", "p50", "/p"
2. **Pattern Learning**: Create multiple drivers, check for suggestions
3. **Context Awareness**: Invoke @fermi from different views
4. **Command Suggestions**: Check suggestions match current state

## Maintenance

The seed ontology should be updated when:
- New entity types are added (e.g., TEAM for collaboration)
- New relationship types emerge (e.g., CONFLICTS_WITH)
- Concept explanations need clarification
- New commands are added to the interface

## References

- Original worldview plugin: `/home/ilabra/worldview_plugin`
- ElizaOS framework: https://github.com/elizaos/eliza
- Ontology design patterns: http://ontologydesignpatterns.org
