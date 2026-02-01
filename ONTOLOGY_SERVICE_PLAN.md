# Agent Knowledge Protocol (AKP) - Architecture & Implementation Plan

## 🌟 Vision

**Agent Knowledge Protocol (AKP)** is a general-purpose ontology and knowledge service that enables agents to:
- Learn from user interactions across multiple applications
- Discover and collaborate with other agents via semantic matching
- Build collective intelligence through opt-in shared learning
- Provide context-aware coaching and suggestions

**AKP as Discrete Economic Entity:**
- Standalone service with its own infrastructure
- Multi-tenant architecture (UFFP is first client, many apps to come)
- Potential pricing model (free tier + paid plans)
- Public API for any agent/app to integrate

**First Use Case:** UFFP forecasting app with 7 agents (fermi, research_analyst, etc.)

---

# UFFP Ontology Service - Architecture & Implementation Plan (Original Title - Now AKP)

## 🎯 Goals

1. **Agent-OM Integration** - Enable agents to learn from each other and suggest optimal query combinations
2. **Three-Tier Learning** - Per-user personalization, opt-in aggregate, collective intelligence
3. **Custom Embeddings** - Fine-tune on forecasting domain
4. **Hybrid Architecture** - Keep client working while building service
5. **Bootstrap 7 Agents** - Teach agents how to collaborate in UFFP

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile App (React Native)                │
│  - Local ontology cache (offline fallback)                 │
│  - Context building (view, forecast, drivers)              │
│  - Query construction                                       │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              Vercel Edge Functions (Serverless)             │
│                                                             │
│  POST /api/ontology/query                                  │
│  - Natural language understanding                          │
│  - Concept explanation                                     │
│  - Context-aware coaching                                  │
│                                                             │
│  POST /api/ontology/match                                  │
│  - Agent-OM siamese matching                               │
│  - Query→Agent→Outcome learning                            │
│  - Multi-agent collaboration suggestions                   │
│                                                             │
│  POST /api/ontology/learn                                  │
│  - Record user observations                                │
│  - Update per-user patterns                                │
│  - Contribute to collective (if opted in)                  │
│                                                             │
│  GET /api/ontology/suggest                                 │
│  - Get personalized suggestions                            │
│  - Leverage collective intelligence                        │
│  - Command/action recommendations                          │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer (Vercel KV + Postgres)        │
│                                                             │
│  Per-User Storage (userId as key)                          │
│  ├─ Personal ontology graph                                │
│  ├─ Observation history                                    │
│  ├─ Custom concept notes                                   │
│  ├─ Agent usage patterns                                   │
│  └─ Opt-in preference                                      │
│                                                             │
│  Collective Storage (anonymized)                           │
│  ├─ Pattern frequencies                                    │
│  ├─ Agent→Query success rates                              │
│  ├─ Driver→Distribution mappings                           │
│  └─ Cross-agent collaboration patterns                     │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              LanceDB (Vector Embeddings)                    │
│                                                             │
│  Entity Embeddings (per-user + collective)                 │
│  ├─ Concept embeddings (triangular, p50, etc.)            │
│  ├─ Driver name embeddings (semantic similarity)           │
│  ├─ Query embeddings (for matching)                        │
│  └─ Agent capability embeddings                            │
│                                                             │
│  Agent-OM Tables                                           │
│  ├─ Source Agent Embeddings (7 agents × 3 layers)         │
│  ├─ Target Query Embeddings                                │
│  └─ Match History (query → agent → outcome)               │
└─────────────────────────────────────────────────────────────┘
```

## 🤖 Seven Agent Bootstrap

### **Agent Profiles to Bootstrap**

```typescript
const AGENT_PROFILES = {
  fermi: {
    type: "coach",
    capabilities: [
      "explain_concepts",
      "decompose_estimates", 
      "calibration_coaching",
      "command_suggestions"
    ],
    specialties: ["fermi_estimation", "distributions", "parameters"],
    queryPatterns: [
      "how do I...",
      "what is...",
      "why should I...",
      "explain..."
    ],
    collaboratesWith: ["research_analyst", "expert_synthesizer"],
    typicalFlow: "User asks concept → Fermi explains → Suggests research agent"
  },

  research_analyst: {
    type: "researcher",
    capabilities: [
      "deep_research",
      "citation_finding",
      "quantitative_analysis",
      "data_synthesis"
    ],
    specialties: ["market_data", "statistics", "academic_research"],
    queryPatterns: [
      "market size for...",
      "growth rate of...",
      "data on...",
      "research about..."
    ],
    collaboratesWith: ["market_researcher", "financial_analyst"],
    typicalFlow: "Gather quantitative evidence → Support driver configuration"
  },

  sentiment_monitor: {
    type: "listener",
    capabilities: [
      "social_listening",
      "sentiment_scoring",
      "trend_detection",
      "public_opinion"
    ],
    specialties: ["twitter_analysis", "reddit_sentiment", "news_monitoring"],
    queryPatterns: [
      "sentiment about...",
      "public opinion on...",
      "social buzz around...",
      "trending topics..."
    ],
    collaboratesWith: ["competitive_intel", "market_researcher"],
    typicalFlow: "Monitor sentiment → Flag shifts → Update likelihood drivers"
  },

  competitive_intel: {
    type: "tracker",
    capabilities: [
      "competitor_tracking",
      "benchmarking",
      "product_launches",
      "strategic_moves"
    ],
    specialties: ["competitive_landscape", "market_positioning", "threats"],
    queryPatterns: [
      "competitors in...",
      "benchmark against...",
      "competitive threat of...",
      "market share..."
    ],
    collaboratesWith: ["market_researcher", "sentiment_monitor"],
    typicalFlow: "Track competitors → Assess threats → Inform market drivers"
  },

  financial_analyst: {
    type: "modeler",
    capabilities: [
      "financial_modeling",
      "statement_analysis",
      "valuation",
      "revenue_forecasting"
    ],
    specialties: ["financial_statements", "DCF", "multiples", "ratios"],
    queryPatterns: [
      "revenue model for...",
      "valuation of...",
      "financial health of...",
      "earnings forecast..."
    ],
    collaboratesWith: ["research_analyst", "market_researcher"],
    typicalFlow: "Analyze financials → Build models → Quantify outcomes"
  },

  market_researcher: {
    type: "analyzer",
    capabilities: [
      "market_sizing",
      "TAM_SAM_SOM",
      "industry_analysis",
      "trend_forecasting"
    ],
    specialties: ["market_structure", "industry_reports", "addressable_market"],
    queryPatterns: [
      "market size of...",
      "TAM for...",
      "industry trends in...",
      "market opportunity..."
    ],
    collaboratesWith: ["research_analyst", "competitive_intel", "financial_analyst"],
    typicalFlow: "Size market → Identify segments → Estimate penetration → Calculate TAM"
  },

  expert_synthesizer: {
    type: "aggregator",
    capabilities: [
      "expert_opinion_aggregation",
      "prediction_synthesis",
      "consensus_building",
      "disagreement_analysis"
    ],
    specialties: ["superforecasting", "expert_predictions", "wisdom_of_crowds"],
    queryPatterns: [
      "expert opinions on...",
      "predictions about...",
      "consensus view...",
      "forecasters say..."
    ],
    collaboratesWith: ["research_analyst", "fermi"],
    typicalFlow: "Gather expert predictions → Synthesize → Compare with user's forecast"
  }
};
```

### **Agent-OM Embedding Strategy**

Each agent gets embedded at 3 semantic levels (like worldview):

1. **Syntactic** - Agent name and type
   - `"fermi coach"`
   - `"research_analyst researcher"`

2. **Lexical** - Capabilities description
   - `"Fermi helps explain forecasting concepts, decompose estimates, and improve calibration"`

3. **Semantic** - Context and relationships
   - `"Fermi coaches users on distributions and parameters, often suggests research_analyst for evidence gathering, especially helpful when configuring continuous drivers"`

### **Agent Collaboration Patterns**

```typescript
const COLLABORATION_PATTERNS = [
  {
    trigger: "user_asks_concept_question",
    flow: [
      { agent: "fermi", action: "explain_concept" },
      { agent: "fermi", action: "suggest_research_if_needed" },
      { agent: "research_analyst", action: "gather_evidence", conditional: true }
    ]
  },
  
  {
    trigger: "forecast_market_outcome",
    flow: [
      { agent: "market_researcher", action: "size_market" },
      { agent: "competitive_intel", action: "assess_competition" },
      { agent: "sentiment_monitor", action: "gauge_sentiment" },
      { agent: "financial_analyst", action: "model_revenue" },
      { agent: "expert_synthesizer", action: "gather_predictions" }
    ],
    note: "Agents work in parallel, fermi helps interpret results"
  },

  {
    trigger: "driver_needs_evidence",
    flow: [
      { agent: "fermi", action: "identify_driver_type" },
      { agent: "fermi", action: "recommend_agent", 
        rules: {
          "market_size": "market_researcher",
          "sentiment": "sentiment_monitor", 
          "financial": "financial_analyst",
          "competition": "competitive_intel",
          "general_data": "research_analyst"
        }
      }
    ]
  },

  {
    trigger: "conflicting_evidence",
    flow: [
      { agent: "expert_synthesizer", action: "analyze_disagreement" },
      { agent: "research_analyst", action: "find_resolving_data" },
      { agent: "fermi", action: "guide_probability_adjustment" }
    ]
  }
];
```

## 🗄️ Data Schema

### **Per-User Ontology (Vercel KV)**

```typescript
interface UserOntology {
  userId: string;
  optedInToCollective: boolean;
  graph: {
    entities: Entity[];           // User's personal entities
    relationships: Relationship[]; // User's observed patterns
  };
  observations: Observation[];    // Last 1000 observations
  agentUsage: {
    [agentId: string]: {
      queriesRun: number;
      successRate: number;
          avgResponseTime: number;
      lastUsed: Date;
      topQueries: string[];
    };
  };
  preferences: {
    defaultDistribution?: "triangular" | "normal" | "lognormal";
    fermiVerbosity?: "concise" | "detailed";
    autoSuggestAgents: boolean;
  };
  customConcepts: {
    [conceptId: string]: string; // User's own notes/definitions
  };
}
```

### **Collective Intelligence (Postgres)**

```typescript
interface CollectivePattern {
  patternId: string;
  type: "driver_config" | "agent_query" | "collaboration" | "concept_usage";
  frequency: number;             // How many users observed this
  successRate: number;           // When followed, how often led to good forecast
  context: {
    driverType?: string;
    forecastDomain?: string;
    agentCombination?: string[];
  };
  anonymizedMetadata: Record<string, any>;
  lastObserved: Date;
}

interface AgentCollaboration {
  sourceAgent: string;
  targetAgent: string;
  triggerContext: string;
  frequency: number;
  avgSuccessRate: number;
  exampleFlows: string[];
}

interface QueryAgentMapping {
  queryEmbedding: number[];      // Embedded user query
  matchedAgent: string;
  queryText: string;             // Anonymized/generalized
  outcomeQuality: number;        // Did it help? (1-5)
  contextTags: string[];         // ["market_sizing", "tech_industry", etc]
  frequency: number;
}
```

### **LanceDB Schema**

```typescript
// Table: agent_embeddings
interface AgentEmbedding {
  agent_id: string;
  embedding_type: "syntactic" | "lexical" | "semantic";
  content: string;
  embedding: number[];           // 1536-dim from OpenAI
  metadata: {
    capabilities: string[];
    specialties: string[];
    collaborators: string[];
  };
}

// Table: user_queries (per-user, for matching)
interface UserQueryEmbedding {
  user_id: string;
  query_id: string;
  query_text: string;
  embedding: number[];
  context: {
    view: string;
    driverType?: string;
    forecastDomain?: string;
  };
  matched_agents: string[];
  outcome_quality?: number;
}

// Table: concept_embeddings (collective)
interface ConceptEmbedding {
  concept_id: string;
  concept_name: string;
  explanation: string;
  embedding: number[];
  usage_count: number;
  avg_user_rating: number;
}
```

## 🔄 API Endpoints

### **POST /api/ontology/query**

**Request:**
```typescript
{
  userId: string;
  query: string;                  // "What distribution for stock prices?"
  context: {
    view: "workspace" | "simulation" | "evidence";
    activeForecast?: {
      id: string;
      question: string;
      drivers: Driver[];
    };
    activeDriver?: Driver;
    recentActions: string[];
  };
}
```

**Response:**
```typescript
{
  response: string;               // Natural language answer
  reasoning: string;              // How we arrived at answer
  conceptsExplained: {
    [conceptId: string]: string;
  };
  suggestedActions: Array<{
    type: "command" | "agent_query" | "navigation";
    action: string;
    description: string;
    confidence: number;
  }>;
  relatedQueries: string[];       // "You might also want to know..."
  confidence: number;
}
```

**Processing Flow:**
1. Embed user query
2. Search concept embeddings for matches
3. Check user's personal ontology for custom notes
4. Search collective patterns for similar questions
5. Generate response using matched concepts + context
6. Suggest next actions based on Agent-OM patterns

---

### **POST /api/ontology/match**

**Request:**
```typescript
{
  userId: string;
  query: string;                  // "Market size for AI coding assistants"
  context: {
    forecast: ForecastSummary;
    drivers: DriverSummary[];
    desiredOutcome?: "evidence" | "decomposition" | "prediction";
  };
  options?: {
    maxAgents: number;            // Default 3
    includeCollaboration: boolean; // Suggest multi-agent flows
  };
}
```

**Response:**
```typescript
{
  matches: Array<{
    agent: string;
    confidence: number;
    reasoning: string;
    suggestedQuery: string;       // Refined query for this agent
    expectedValue: string;        // What this will give you
    embedding_similarity: {
      syntactic: number;
      lexical: number;
      semantic: number;
      rrfScore: number;           // Reciprocal Rank Fusion
    };
  }>;
  collaborationFlow?: {
    agents: string[];
    sequence: "parallel" | "sequential";
    description: string;
    estimatedTime: string;
  };
  similarSuccessfulQueries: Array<{
    originalQuery: string;        // Anonymized
    agentsUsed: string[];
    outcomeQuality: number;
  }>;
}
```

**Processing Flow:**
1. Embed user query (3 levels: syntactic, lexical, semantic)
2. Search agent embeddings using RRF (Reciprocal Rank Fusion)
3. Check user's past agent usage patterns
4. Check collective patterns for this query type
5. Rank agents by combined similarity + past success
6. Suggest collaboration flow if multiple agents needed

---

### **POST /api/ontology/learn**

**Request:**
```typescript
{
  userId: string;
  observation: {
    type: "driver_created" | "agent_invoked" | "simulation_run" | "evidence_applied";
    entity: string;
    entityType: EntityType;
    target?: string;
    targetType?: EntityType;
    context: string;
    metadata: Record<string, any>;
  };
  outcome?: {
    success: boolean;
    quality: number;              // 1-5 rating
    timeToComplete?: number;      // ms
  };
}
```

**Response:**
```typescript
{
  learned: boolean;
  personalPatternsUpdated: string[];
  collectiveContribution: boolean; // Only if opted in
  newSuggestions: Suggestion[];
  insights: string[];             // "You often use lognormal for TAM forecasts"
}
```

**Processing Flow:**
1. Record observation in user's personal graph
2. Update agent usage statistics
3. If opted in: contribute anonymized pattern to collective
4. Re-embed affected entities
5. Generate new suggestions based on updated patterns
6. Return personalized insights

---

### **GET /api/ontology/suggest**

**Request:**
```typescript
{
  userId: string;
  context: {
    view: string;
    activeForecast?: ForecastSummary;
    activeDriver?: DriverSummary;
  };
  suggestionType?: "all" | "agents" | "commands" | "concepts";
}
```

**Response:**
```typescript
{
  suggestions: Array<{
    type: "agent_query" | "command" | "concept_to_learn" | "driver_to_add";
    priority: "high" | "medium" | "low";
    confidence: number;
    reasoning: string;
    action: {
      type: string;
      command?: string;
      agent?: string;
      query?: string;
    };
    source: "personal_pattern" | "collective_intelligence" | "agent_collaboration";
  }>;
  personalInsights: string[];     // Based on user's patterns
  collectiveInsights: string[];   // Based on successful forecasters
}
```

## 📊 Three-Tier Learning Implementation

### **Tier 1: Per-User (Always Active)**

```typescript
class PersonalOntologyManager {
  async recordObservation(userId: string, observation: Observation) {
    // Add to user's graph
    const userOntology = await kv.get(`user:${userId}:ontology`);
    userOntology.observations.push(observation);
    
    // Update patterns
    const patterns = detectPatterns(userOntology.observations);
    userOntology.patterns = patterns;
    
    // Save
    await kv.set(`user:${userId}:ontology`, userOntology);
  }
  
  async getPersonalizedSuggestions(userId: string, context: Context) {
    const userOntology = await kv.get(`user:${userId}:ontology`);
    return generateSuggestions(userOntology, context);
  }
}
```

### **Tier 2: Anonymized Aggregate (Opt-In Only)**

```typescript
class AggregateContributor {
  async contributeIfOptedIn(userId: string, observation: Observation) {
    const user = await kv.get(`user:${userId}:ontology`);
    
    if (!user.optedInToCollective) {
      return; // Don't contribute
    }
    
    // Anonymize observation
    const anonymized = {
      patternType: observation.type,
      context: observation.context,
      entityType: observation.entityType,
      // Remove PII: no userId, no specific names, no timestamps
    };
    
    // Contribute to collective
    await postgres.query(`
      INSERT INTO collective_patterns (pattern_type, context, frequency)
      VALUES ($1, $2, 1)
      ON CONFLICT (pattern_type, context) 
      DO UPDATE SET frequency = collective_patterns.frequency + 1
    `, [anonymized.patternType, anonymized.context]);
  }
}
```

### **Tier 3: Collective Intelligence (All Opt-Ins)**

```typescript
class CollectiveIntelligence {
  async getCollectiveRecommendation(context: Context) {
    // Query patterns from all opted-in users
    const patterns = await postgres.query(`
      SELECT pattern_type, context, frequency, success_rate
      FROM collective_patterns
      WHERE context SIMILAR TO $1
      ORDER BY success_rate DESC, frequency DESC
      LIMIT 10
    `, [context.contextPattern]);
    
    return {
      topPatterns: patterns.rows,
      insights: generateInsights(patterns.rows),
      confidence: calculateCollectiveConfidence(patterns.rows)
    };
  }
  
  async getBestAgentForQuery(queryEmbedding: number[]) {
    // Find most successful agent matches from collective data
    const matches = await postgres.query(`
      SELECT agent_id, AVG(outcome_quality) as avg_quality, COUNT(*) as frequency
      FROM query_agent_outcomes
      WHERE query_embedding <-> $1 < 0.3  -- cosine similarity threshold
      GROUP BY agent_id
      ORDER BY avg_quality DESC, frequency DESC
    `, [queryEmbedding]);
    
    return matches.rows[0];
  }
}
```

## 🚀 Implementation Phases

### **Phase 1: Backend Foundation (Week 1-2)**
- [ ] Set up Vercel Edge Functions structure
- [ ] Configure LanceDB connection
- [ ] Port worldview core (graph.ts, types.ts)
- [ ] Create basic /query endpoint (concept lookup only)
- [ ] Test with mobile app (hybrid mode)

### **Phase 2: Agent-OM Integration (Week 2-3)**
- [ ] Port Agent-OM matching logic from worldview
- [ ] Bootstrap 7 agents with embeddings
- [ ] Create /match endpoint
- [ ] Implement RRF scoring
- [ ] Test agent recommendations

### **Phase 3: Three-Tier Learning (Week 3-4)**
- [ ] Implement per-user storage (Vercel KV)
- [ ] Create /learn endpoint
- [ ] Add opt-in preference management
- [ ] Build anonymization pipeline
- [ ] Set up collective patterns DB

### **Phase 4: Agent Collaboration (Week 4-5)**
- [ ] Define collaboration patterns
- [ ] Implement multi-agent flow suggestions
- [ ] Track cross-agent success rates
- [ ] Build agent learning from each other

### **Phase 5: Custom Embeddings (Week 5-6)**
- [ ] Collect forecasting corpus
- [ ] Fine-tune embedding model
- [ ] Re-embed all entities
- [ ] A/B test improvements

## ✅ Architecture Decisions

### **1. New Repository: Agent Knowledge Protocol**
- Standalone service, not part of UFFP backend
- Multi-tenant from day one
- Own infrastructure and deployment
- May become separate economic entity

### **2. Authentication Strategy**
**Approach:** JWT Bearer Token (Industry Standard)

```typescript
// Request headers
Authorization: Bearer <jwt_token>

// JWT payload
{
  "sub": "user_123",           // User ID
  "app": "uffp",               // Application ID (for multi-tenancy)
  "iat": 1234567890,
  "exp": 1234567890,
  "scopes": ["query", "learn", "match"]
}
```

**Migration Path to Hyper-Secure:**
- Phase 1: Simple JWT validation
- Phase 2: Add refresh tokens
- Phase 3: API key + JWT combo for apps
- Phase 4: OAuth 2.0 for third-party apps
- Phase 5: mTLS for enterprise customers

### **3. Database Architecture**
**Separate Database (Not shared with UFFP)**

**Option A: PostgreSQL + pgvector** (Recommended)
```
- User ontologies (JSONB)
- Collective patterns (relational)
- Vector embeddings (pgvector extension)
- Agent profiles
- Multi-tenant with app_id partitioning
```

**Option B: PostgreSQL + LanceDB**
```
- PostgreSQL: Structured data (ontologies, patterns, users)
- LanceDB: Vector embeddings (high-performance similarity search)
```

**No Redis/Vercel KV needed initially** - Postgres can handle everything with good indexing.

### **4. Agent Prompts**
**Location:** UFFP backend agents (need file path from user)
**Bootstrap Strategy:**
1. Extract system prompts from UFFP backend
2. Parse capabilities, specialties, query patterns
3. Generate 3-level embeddings (syntactic, lexical, semantic)
4. Store in AKP agent registry

### **5. Synthetic Data for Testing**
**Test Data Generation Strategy:**

```typescript
// Generate realistic test scenarios
const SYNTHETIC_TEST_SUITE = {
  // 1. User observation patterns
  userObservations: [
    generateDriverConfigurations(100),  // 100 fake driver configs
    generateAgentQueries(200),          // 200 fake queries
    generateSimulations(50),            // 50 fake sim runs
  ],
  
  // 2. Multi-agent conversations
  agentCollaborations: [
    simulateMarketSizingFlow(),         // fermi → market_researcher
    simulateEvidenceGathering(),        // research_analyst → evidence
    simulateConflictResolution(),       // expert_synthesizer flow
  ],
  
  // 3. Forecast scenarios
  forecastScenarios: [
    { domain: "tech_market", agents: ["market_researcher", "financial_analyst"] },
    { domain: "sentiment", agents: ["sentiment_monitor", "competitive_intel"] },
    { domain: "expert_consensus", agents: ["expert_synthesizer", "research_analyst"] },
  ],
  
  // 4. Load testing
  loadTests: {
    simultaneousUsers: 1000,
    queriesPerSecond: 100,
    embeddingOperations: 500,
  }
};
```

**Synthetic Data Benefits:**
- Test three-tier learning without real users
- Validate Agent-OM matching accuracy
- Benchmark performance under load
- Train collective intelligence before launch

### **6. Multi-Tenancy Design**
Every request includes `app_id` (from JWT):

```typescript
// Database partitioning
user_ontologies
  - user_id (PK)
  - app_id (partition key)
  - ontology_data

collective_patterns
  - pattern_id (PK)
  - app_id (partition key)
  - pattern_data

// Query isolation
SELECT * FROM user_ontologies 
WHERE app_id = 'uffp' AND user_id = 'user_123';
```

**Benefits:**
- UFFP data isolated from future apps
- Each app can have custom ontology seeds
- Billing/usage tracked per app
- Easy to add new apps without migration

## 🔍 Remaining Questions

1. **Database Choice**: PostgreSQL-only or PostgreSQL + LanceDB for vectors?

2. **Agent Prompts**: What's the file path in UFFP backend? (e.g., `/api/agents/prompts.ts`?)

3. **Synthetic Data Scope**: Generate all 4 categories above, or start smaller?

4. **Public API**: Should we design API for third-party apps from day one, or defer?

5. **Custom Domains**: Should apps be able to register non-forecasting domains (medical, legal, etc.)?

Ready to start building once these are answered! Can proceed with UI issues in parallel.
