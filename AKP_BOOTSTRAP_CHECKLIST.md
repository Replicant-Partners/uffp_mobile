# Agent Knowledge Protocol (AKP) - Bootstrap Checklist

## 📋 What We Have

### ✅ Documentation
- [x] `ONTOLOGY_SERVICE_PLAN.md` - Full architecture, API endpoints, 3-tier learning, Agent College vision
- [x] `ONTOLOGY_SYSTEM.md` - Client-side ontology implementation notes
- [x] Worldview plugin code at `/home/ilabra/worldview_plugin/` (reference implementation)

### ✅ Key Decisions Made

**1. Architecture:**
- Standalone repo: `agent-knowledge-protocol` (new repo, not created yet)
- Database: PostgreSQL + LanceDB
- Auth: JWT Bearer tokens with multi-tenancy
- Multi-tenant: app_id partitioning from day one

**2. Agent Bootstrap:**
- UFFP agents located: `/home/ilabra/uffp_mobile/uffp-backend`
- 7 agents to bootstrap:
  - fermi (coach)
  - research_analyst
  - sentiment_monitor
  - competitive_intel
  - financial_analyst
  - market_researcher
  - expert_synthesizer

**3. Deployment:**
- Vercel Edge Functions (serverless)
- API endpoints: /query, /match, /learn, /suggest
- Deferred: Synthetic data testing (use real UFFP data first)

**4. Agent College Vision:**
- Cross-domain learning (UFFP → BioConversion → Medical → Legal...)
- Opt-in collective intelligence
- Knowledge Commons with credit system
- Custom ontology seeds per app

### ✅ Current UFFP Ontology (Client-Side)

Located in `src/services/ontology/`:
- `types.ts` - Entity/Relationship types for forecasting
- `graph.ts` - In-memory graph storage
- `observer.ts` - Pattern detection
- `seed.ts` - UFFP domain seed (13 entities, 17 relationships)
- `index.ts` - Service interface

**Seed Entities:**
FORECAST, DRIVER, EVIDENCE, SIMULATION, OUTCOME, DISTRIBUTION, PARAMETER, METRIC, USER, AGENT, QUERY, COMMAND, RESEARCH

## 📦 What We Need to Extract

### 1. Agent System Prompts (from uffp-backend)
**Location:** `/home/ilabra/uffp_mobile/uffp-backend`

**Need to extract:**
- [ ] fermi system prompt
- [ ] research_analyst system prompt
- [ ] sentiment_monitor system prompt
- [ ] competitive_intel system prompt
- [ ] financial_analyst system prompt
- [ ] market_researcher system prompt
- [ ] expert_synthesizer system prompt

**For each agent, extract:**
- System prompt text
- Capabilities list
- Specialties
- Query patterns (example queries they handle well)
- Collaboration preferences (which other agents they work with)

### 2. Worldview Plugin Code to Adapt

**Location:** `/home/ilabra/worldview_plugin/src/`

**Files to port/adapt:**
- [ ] `graph.ts` - Core graph with Agent-OM integration
- [ ] `types.ts` - Type definitions (already adapted to some extent)
- [ ] `observer.ts` - Pattern detection (already adapted)
- [ ] `inference-engine.ts` - Rule-based inference
- [ ] `inference/rules.ts` - Default inference rules
- [ ] `agents/retrieval-agent.ts` - Agent retrieval logic
- [ ] `agents/matching-agent.ts` - Agent-OM matching
- [ ] `matching/scorer.ts` - RRF scoring
- [ ] `matching/rrf.ts` - Reciprocal Rank Fusion
- [ ] `storage/lance-store.ts` - LanceDB integration
- [ ] `storage/embedding-service.ts` - Embedding generation

**Key changes needed:**
- Remove ElizaOS dependencies (`elizaLogger`, `IAgentRuntime`, `Memory`)
- Keep PostgreSQL + LanceDB architecture
- Generalize for multi-domain (not just forecasting)
- Add multi-tenancy (app_id throughout)

## 🚀 Bootstrap Plan

### Phase 1: Create AKP Repository (Week 1)
- [ ] Create new repo: `agent-knowledge-protocol`
- [ ] Set up project structure:
  ```
  agent-knowledge-protocol/
  ├── src/
  │   ├── api/          # Vercel endpoints
  │   ├── core/         # Graph, types, observer
  │   ├── agents/       # Agent-OM matching
  │   ├── storage/      # Postgres + LanceDB
  │   ├── inference/    # Rule engine
  │   └── embeddings/   # OpenAI integration
  ├── seeds/            # Domain ontology seeds
  │   ├── uffp.json
  │   └── bioconversion.json
  ├── tests/
  └── docs/
  ```
- [ ] Set up TypeScript, PostgreSQL schema, LanceDB config
- [ ] Implement JWT auth middleware

### Phase 2: Port Core Components (Week 1-2)
- [ ] Port graph.ts with Agent-OM
- [ ] Port types.ts (multi-domain)
- [ ] Port observer.ts
- [ ] Port inference engine
- [ ] Set up PostgreSQL schema with app_id partitioning
- [ ] Set up LanceDB connection

### Phase 3: Extract & Bootstrap UFFP Agents (Week 2)
- [ ] Find agent prompts in uffp-backend
- [ ] Create agent profiles:
  ```typescript
  {
    id: "research_analyst",
    appId: "uffp",
    systemPrompt: "...",
    capabilities: ["deep_research", "citations", ...],
    specialties: ["market_data", "statistics", ...],
    queryPatterns: ["market size for...", ...],
    collaboratesWith: ["market_researcher", "financial_analyst"]
  }
  ```
- [ ] Generate 3-level embeddings (syntactic, lexical, semantic)
- [ ] Store in LanceDB

### Phase 4: Build API Endpoints (Week 2-3)
- [ ] POST /api/ontology/query
  - Concept lookup
  - Context-aware coaching
  - Natural language understanding
- [ ] POST /api/ontology/match
  - Agent-OM siamese matching
  - RRF scoring
  - Multi-agent collaboration suggestions
- [ ] POST /api/ontology/learn
  - Record observations
  - Update per-user ontology
  - Contribute to collective (if opted in)
- [ ] GET /api/ontology/suggest
  - Personalized suggestions
  - Collective intelligence queries
  - Command recommendations

### Phase 5: Integrate with UFFP Mobile (Week 3)
- [ ] Update UFFP mobile to call AKP endpoints
- [ ] Keep client-side ontology as fallback
- [ ] Test agent matching
- [ ] Test concept lookup
- [ ] Test learning/observations

### Phase 6: Three-Tier Learning (Week 3-4)
- [ ] Per-user storage in Postgres
- [ ] Opt-in preference system
- [ ] Anonymization pipeline
- [ ] Collective patterns aggregation
- [ ] Knowledge Commons credit system

## 🎯 Immediate Next Steps

1. **Extract UFFP agent prompts** from uffp-backend
2. **Create agent-knowledge-protocol repo**
3. **Port worldview core** (graph, types, observer)
4. **Set up databases** (Postgres + LanceDB)
5. **Bootstrap UFFP agents** with embeddings

## 📝 Questions to Answer

1. **Repo hosting:** GitHub under Replicant-Partners org?
2. **Infrastructure:** Vercel project setup - who owns/pays?
3. **Database:** Hosted Postgres (Supabase? Neon?) or self-hosted?
4. **LanceDB:** Hosted or self-hosted?
5. **Embeddings:** OpenAI API key - whose account?

## 📚 Reference Files

- Main plan: `/home/ilabra/uffp_mobile/ONTOLOGY_SERVICE_PLAN.md`
- Worldview plugin: `/home/ilabra/worldview_plugin/`
- UFFP backend: `/home/ilabra/uffp_mobile/uffp-backend/`
- UFFP ontology: `/home/ilabra/uffp_mobile/src/services/ontology/`

---

**Status:** Ready to start Phase 1
**Next Action:** Extract agent prompts from uffp-backend
