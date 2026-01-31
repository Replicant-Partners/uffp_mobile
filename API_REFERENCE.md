# UFFP Backend API Reference

**Base URL**: `https://uffp-backend.vercel.app/api`

---

## 📋 Table of Contents

1. [Forecasts API](#forecasts-api)
2. [Research Agents API](#research-agents-api)
3. [AI Coach API](#ai-coach-api)
4. [Data Models](#data-models)
5. [Example Workflows](#example-workflows)

---

## Forecasts API

**Endpoint**: `/forecasts?action={action}`

### Parse Question

Parse natural language into structured forecast.

**POST** `/forecasts?action=parse`

```json
// Request
{
  "userInput": "Will SpaceX land on Mars by 2030?"
}

// Response
{
  "success": true,
  "parsed": {
    "question": "Will SpaceX successfully land on Mars by 2030?",
    "domain": "technology",
    "timeframe": "by 2030",
    "suggestedDrivers": [
      "Starship development timeline",
      "Mars mission window availability",
      "NASA partnership status"
    ],
    "suggestedResearch": ["tech_analyst", "space_industry_researcher"],
    "confidence": 0.92
  }
}
```

### Create Forecast

**POST** `/forecasts?action=create`

```json
// Request
{
  "userId": "user123",  // optional
  "question": "Will SpaceX successfully land on Mars by 2030?",
  "domain": "technology",
  "timeframe": "by 2030",
  "resolutionCriteria": "Official SpaceX/NASA confirmation"
}

// Response
{
  "success": true,
  "forecast": {
    "id": "1769816625453-ko8o62pmt",
    "question": "Will SpaceX successfully land on Mars by 2030?",
    "domain": "technology",
    "status": "draft",
    "drivers": [],
    "evidence": [],
    "simulations": [],
    "currentVersion": 1,
    "createdAt": "2026-01-30T23:43:45.453Z"
  }
}
```

### Get Forecast

**GET** `/forecasts?action=get&id={forecastId}`

```json
// Response
{
  "success": true,
  "forecast": {
    "id": "1769816625453-ko8o62pmt",
    "question": "Will SpaceX successfully land on Mars by 2030?",
    "probability": 0.54,
    "drivers": [...],
    "evidence": [...],
    "simulations": [...]
  }
}
```

### List Forecasts

**GET** `/forecasts?action=list&userId={userId}&status={status}&limit={limit}&offset={offset}`

Query Parameters:
- `userId` (optional): Filter by user
- `status` (optional): `draft`, `active`, `resolved`
- `limit` (optional): Default 50
- `offset` (optional): Default 0

```json
// Response
{
  "success": true,
  "forecasts": [...],
  "total": 42
}
```

### Add Driver

**POST** `/forecasts?action=addDriver`

```json
// Request
{
  "forecastId": "1769816625453-ko8o62pmt",
  "driver": {
    "name": "Technical feasibility",
    "description": "Can the technology work?",
    "type": "binary",  // or "continuous"
    "probability": 75  // for binary
    // OR for continuous:
    // "p5": 100, "p50": 250, "p95": 500,
    // "distribution": "triangular"
  }
}

// Response
{
  "success": true,
  "forecast": { /* updated forecast */ }
}
```

### Update Driver

**POST** `/forecasts?action=updateDriver`

```json
// Request
{
  "forecastId": "1769816625453-ko8o62pmt",
  "driverId": "1769816625860-qy6d7g7ip",
  "updates": {
    "probability": 80
  },
  "changeReason": "Updated based on new evidence"
}

// Response
{
  "success": true,
  "forecast": { /* updated forecast with version history */ }
}
```

### Remove Driver

**POST** `/forecasts?action=removeDriver`

```json
// Request
{
  "forecastId": "1769816625453-ko8o62pmt",
  "driverId": "1769816625860-qy6d7g7ip"
}
```

### Add Evidence

**POST** `/forecasts?action=addEvidence`

```json
// Request
{
  "forecastId": "1769816625453-ko8o62pmt",
  "driverId": "1769816625860-qy6d7g7ip",  // optional - attach to specific driver
  "evidence": {
    "type": "url",  // "url", "quote", "data", "reasoning"
    "content": "https://spacex.com/mars-mission",
    "source": "SpaceX Official",
    "confidence": "high",  // "high", "medium", "low"
    "attachedTo": "driver",  // "forecast", "driver", "baseRate"
    "attachedToId": "1769816625860-qy6d7g7ip"
  }
}
```

### Set Base Rate

**POST** `/forecasts?action=setBaseRate`

```json
// Request
{
  "forecastId": "1769816625453-ko8o62pmt",
  "baseRate": {
    "referenceClass": "Previous Mars missions",
    "successRate": 0.35,  // 35%
    "sampleSize": 20,
    "reasoning": "Historical success rate of Mars landings"
  }
}
```

### Run Simulation

**POST** `/forecasts?action=simulate`

```json
// Request
{
  "forecastId": "1769816625453-ko8o62pmt",
  "iterations": 10000  // optional, default 10000
}

// Response
{
  "success": true,
  "simulation": {
    "id": "sim-123",
    "probability": 0.54,  // Final forecast probability
    "distribution": {
      "p10": 0,
      "p25": 0,
      "p50": 1,
      "p75": 1,
      "p90": 1
    },
    "iterations": 10000,
    "runtime": 16,  // milliseconds
    "cost": 0.02,   // USD
    "executedAt": "2026-01-30T23:43:46.763Z"
  },
  "forecast": { /* updated forecast with new probability */ }
}
```

### Get User Stats

**GET** `/forecasts?action=stats&userId={userId}`

```json
// Response
{
  "success": true,
  "stats": {
    "totalForecasts": 15,
    "resolvedForecasts": 8,
    "averageBrierScore": 0.12,
    "byDomain": {
      "finance": { "count": 5, "avgBrier": 0.10 },
      "technology": { "count": 3, "avgBrier": 0.15 }
    }
  }
}
```

### Get Leaderboard

**GET** `/forecasts?action=stats&leaderboard=true&domain={domain}&limit={limit}`

Query Parameters:
- `domain` (optional): Filter by domain
- `limit` (optional): Default 100

```json
// Response
{
  "success": true,
  "leaderboard": [
    {
      "userId": "user123",
      "brierScore": 0.08,
      "forecastCount": 25
    },
    {
      "userId": "user456",
      "brierScore": 0.12,
      "forecastCount": 18
    }
  ]
}
```

---

## Research Agents API

### Execute Research

**POST** `/agents/execute`

```json
// Request
{
  "agentId": "sentiment_monitor",
  "promptId": "sentiment_tracking",
  "variables": {
    "COMPANY_OR_PRODUCT": "Tesla",
    "TIME_PERIOD": "past week"
  }
}

// Response
{
  "success": true,
  "result": {
    "id": "res-123",
    "agentId": "sentiment_monitor",
    "promptId": "sentiment_tracking",
    "summary": "Tesla sentiment improved 15% over past week...",
    "keyFindings": [
      "Positive sentiment increased to 62%",
      "Volume: 15,430 mentions analyzed"
    ],
    "sources": [
      "https://twitter.com/analytics",
      "https://reddit.com/r/teslamotors"
    ],
    "confidence": "high",
    "fullResponse": "...",
    "executedAt": "2026-01-30T23:43:45.453Z"
  }
}
```

### List Prompt Templates

**GET** `/prompts/templates`

```json
// Response
{
  "prompts": [
    {
      "id": "market_tam_sizing",
      "name": "Market TAM Sizing",
      "description": "Estimate total addressable market",
      "category": "Market Research",
      "variables": ["MARKET_SEGMENT", "GEOGRAPHY"],
      "schedulable": true,
      "frequency": "monthly",
      "outputFormat": "structured_data"
    },
    {
      "id": "sentiment_tracking",
      "name": "Sentiment Tracking",
      "description": "Monitor public sentiment",
      "category": "Sentiment Analysis",
      "variables": ["COMPANY_OR_PRODUCT", "TIME_PERIOD"],
      "schedulable": true,
      "frequency": "daily",
      "outputFormat": "sentiment_score"
    }
    // ... 8 more prompts
  ]
}
```

### Available Research Agents

| Agent ID | Name | Use Case |
|----------|------|----------|
| `research_analyst` | Research Analyst | Deep research with citations |
| `sentiment_monitor` | Sentiment Monitor | Social listening & sentiment |
| `competitive_intel` | Competitive Intelligence | Competitor tracking |
| `financial_analyst` | Financial Analyst | Financial statement analysis |
| `market_researcher` | Market Researcher | Market sizing & TAM |
| `expert_synthesizer` | Expert Synthesizer | Expert opinion aggregation |
| `technology_validator` | Technology Validator | Technical feasibility |
| `regulatory_monitor` | Regulatory Monitor | Policy impact analysis |
| `hiring_tracker` | Hiring Tracker | Growth inference from hiring |
| `growth_signals` | Growth Signals | User growth metrics |
| `pricing_intel` | Pricing Intelligence | Competitive pricing |

### Available Prompt Templates

| Prompt ID | Name | Variables |
|-----------|------|-----------|
| `market_tam_sizing` | Market TAM Sizing | MARKET_SEGMENT, GEOGRAPHY |
| `sentiment_tracking` | Sentiment Tracking | COMPANY_OR_PRODUCT, TIME_PERIOD |
| `competitor_benchmarking` | Competitor Benchmarking | COMPANY_NAME, MARKET_SEGMENT |
| `financial_fundamentals` | Financial Fundamentals | COMPANY_TICKER |
| `expert_consensus` | Expert Opinion Consensus | FORECAST_QUESTION |
| `technology_validation` | Technology Validation | TECHNOLOGY_OR_PRODUCT |
| `regulatory_impact` | Regulatory Impact | COMPANY_OR_INDUSTRY, JURISDICTION |
| `hiring_trends` | Hiring Trends | COMPANY_NAME |
| `user_growth_proxy` | User Growth Metrics | PRODUCT_OR_SERVICE |
| `pricing_analysis` | Pricing Analysis | PRODUCT_CATEGORY |

---

## AI Coach API

### Chat with Coach

**POST** `/coach/chat`

```json
// Request
{
  "stage": "drivers",  // "base_rate", "drivers", "quantify", "review"
  "context": {
    "question": "Will SpaceX land on Mars by 2030?",
    "domain": "technology",
    "baseRate": { /* optional */ },
    "drivers": [ /* optional */ ]
  },
  "userMessage": "I think technical capability and funding",
  "conversationHistory": [
    { "role": "coach", "content": "What are the key drivers?" },
    { "role": "user", "content": "Technical capability and funding" }
  ]
}

// Response
{
  "success": true,
  "response": {
    "message": "Great start! Let's break down technical capability further...",
    "suggestions": [
      {
        "type": "driver",
        "data": {
          "name": "Rocket reliability",
          "description": "Starship success rate",
          "type": "binary"
        }
      },
      {
        "type": "research",
        "data": {
          "agentId": "technology_validator",
          "promptId": "technology_validation"
        }
      }
    ],
    "nextStage": "quantify"
  }
}
```

### Coach Stages

| Stage | Purpose | Coach Helps With |
|-------|---------|------------------|
| `base_rate` | Find reference class | Suggest similar past events, ask for success rate |
| `drivers` | Decompose question | Suggest 3-5 independent drivers, explain importance |
| `quantify` | Estimate probabilities | Guide confidence intervals, suggest research |
| `review` | Final check | Review completeness, suggest improvements |

---

## Data Models

### Forecast

```typescript
interface Forecast {
  id: string;
  userId?: string;
  question: string;
  domain?: string;  // "finance", "technology", "weather", etc.
  timeframe?: string;
  resolutionCriteria: string;
  
  baseRate?: BaseRate;
  drivers: Driver[];
  evidence: Evidence[];
  
  probability?: number;  // From latest simulation
  simulations: Simulation[];
  
  currentVersion: number;
  versions: ForecastVersion[];
  
  status: 'draft' | 'active' | 'resolved';
  resolvedAt?: Date;
  resolution?: 'yes' | 'no' | 'ambiguous';
  brierScore?: number;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Driver

```typescript
interface Driver {
  id: string;
  name: string;
  description?: string;
  type: 'binary' | 'continuous';
  
  // Binary
  probability?: number;  // 0-100
  
  // Continuous
  p5?: number;
  p50?: number;
  p95?: number;
  distribution?: 'normal' | 'triangular' | 'lognormal';
  
  evidence: Evidence[];
  researchResults: ResearchSnapshot[];
  
  currentVersion: number;
  versions: DriverVersion[];
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Evidence

```typescript
interface Evidence {
  id: string;
  type: 'url' | 'quote' | 'data' | 'reasoning';
  content: string;
  source?: string;
  confidence?: 'high' | 'medium' | 'low';
  
  attachedTo: 'forecast' | 'baseRate' | 'driver';
  attachedToId: string;
  
  timestamp: Date;
}
```

### Simulation

```typescript
interface Simulation {
  id: string;
  forecastId: string;
  iterations: number;
  
  probability: number;  // 0-1
  distribution?: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  
  cost: number;  // USD
  runtime: number;  // milliseconds
  
  executedAt: Date;
}
```

---

## Example Workflows

### Complete Forecast Creation

```javascript
// 1. Parse question
const parsed = await fetch('/api/forecasts?action=parse', {
  method: 'POST',
  body: JSON.stringify({ userInput: 'Will ASTS reach $20 by 2026?' })
}).then(r => r.json());

// 2. Create forecast
const forecast = await fetch('/api/forecasts?action=create', {
  method: 'POST',
  body: JSON.stringify({
    question: parsed.parsed.question,
    domain: parsed.parsed.domain,
    timeframe: parsed.parsed.timeframe,
    resolutionCriteria: 'Stock price at market close on Dec 31, 2026'
  })
}).then(r => r.json());

const forecastId = forecast.forecast.id;

// 3. Set base rate
await fetch('/api/forecasts?action=setBaseRate', {
  method: 'POST',
  body: JSON.stringify({
    forecastId,
    baseRate: {
      referenceClass: 'Small cap satellite stocks doubling in 1 year',
      successRate: 0.15,
      reasoning: 'Historical data from similar companies'
    }
  })
});

// 4. Add drivers (use suggested ones)
for (const driverName of parsed.parsed.suggestedDrivers) {
  await fetch('/api/forecasts?action=addDriver', {
    method: 'POST',
    body: JSON.stringify({
      forecastId,
      driver: {
        name: driverName,
        type: 'binary',
        probability: 70  // User estimates
      }
    })
  });
}

// 5. Run research for first driver
const research = await fetch('/api/agents/execute', {
  method: 'POST',
  body: JSON.stringify({
    agentId: 'financial_analyst',
    promptId: 'financial_fundamentals',
    variables: { COMPANY_TICKER: 'ASTS' }
  })
}).then(r => r.json());

// 6. Attach research as evidence
await fetch('/api/forecasts?action=addEvidence', {
  method: 'POST',
  body: JSON.stringify({
    forecastId,
    driverId: drivers[0].id,
    evidence: {
      type: 'reasoning',
      content: research.result.summary,
      source: 'Research Agent: Financial Analyst',
      confidence: research.result.confidence,
      attachedTo: 'driver',
      attachedToId: drivers[0].id
    }
  })
});

// 7. Run simulation
const simulation = await fetch('/api/forecasts?action=simulate', {
  method: 'POST',
  body: JSON.stringify({
    forecastId,
    iterations: 10000
  })
}).then(r => r.json());

console.log('Final probability:', simulation.simulation.probability);
```

### Coach-Guided Creation

```javascript
// Start with question parsing
const parsed = await fetch('/api/forecasts?action=parse', {
  method: 'POST',
  body: JSON.stringify({ userInput: userInput })
}).then(r => r.json());

// Get coach help for base rate
const coachResponse = await fetch('/api/coach/chat', {
  method: 'POST',
  body: JSON.stringify({
    stage: 'base_rate',
    context: {
      question: parsed.parsed.question,
      domain: parsed.parsed.domain
    }
  })
}).then(r => r.json());

// Display coach message to user
console.log(coachResponse.response.message);

// Show suggestions if any
coachResponse.response.suggestions.forEach(suggestion => {
  if (suggestion.type === 'baseRate') {
    console.log('Suggested:', suggestion.data.referenceClass);
  }
});
```

### Research & Evidence Flow

```javascript
// Get available prompts
const prompts = await fetch('/api/prompts/templates')
  .then(r => r.json());

// Find relevant prompt
const sentimentPrompt = prompts.prompts.find(
  p => p.id === 'sentiment_tracking'
);

// Execute research
const research = await fetch('/api/agents/execute', {
  method: 'POST',
  body: JSON.stringify({
    agentId: 'sentiment_monitor',
    promptId: 'sentiment_tracking',
    variables: {
      COMPANY_OR_PRODUCT: 'Tesla',
      TIME_PERIOD: 'past week'
    }
  })
}).then(r => r.json());

// Auto-extract evidence from research
const evidenceItems = [
  // Summary as reasoning
  {
    type: 'reasoning',
    content: research.result.summary,
    source: 'Sentiment Monitor Agent',
    confidence: research.result.confidence
  },
  // Key findings as data
  ...research.result.keyFindings.map(finding => ({
    type: 'data',
    content: finding,
    source: 'Sentiment Monitor Agent'
  })),
  // Sources as URLs
  ...research.result.sources.map(url => ({
    type: 'url',
    content: url,
    source: 'Sentiment Monitor Agent'
  }))
];

// Attach all evidence
for (const evidence of evidenceItems) {
  await fetch('/api/forecasts?action=addEvidence', {
    method: 'POST',
    body: JSON.stringify({
      forecastId,
      driverId,
      evidence: {
        ...evidence,
        attachedTo: 'driver',
        attachedToId: driverId
      }
    })
  });
}
```

---

## Rate Limits & Costs

### Research Agent Costs

| Agent | Avg Cost | Avg Tokens |
|-------|----------|------------|
| Research Analyst | ~$0.05 | ~4,000 |
| Sentiment Monitor | ~$0.03 | ~3,000 |
| Financial Analyst | ~$0.06 | ~3,500 |
| Others | ~$0.04 | ~3,000 |

### Simulation Costs

- Monte Carlo simulation: $0.02 per run
- Typical runtime: 10-50ms for 10,000 iterations

### Storage

- In-memory storage (current): No cost, resets on deploy
- Vercel KV (future): ~$0.30/month for moderate usage

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "error": "Error message here"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad request (missing fields)
- `404`: Not found
- `405`: Method not allowed
- `500`: Server error

---

## Notes

1. **In-Memory Storage**: Current implementation uses in-memory storage. Data persists during runtime but resets on deployment. Migration to Vercel KV or PostgreSQL recommended for production.

2. **Authentication**: No authentication currently implemented. Add `userId` to all requests for multi-user support.

3. **Versioning**: All driver updates create version snapshots automatically. Use `versions` array to see history.

4. **Coach**: The AI coach uses Claude Sonnet 4 and costs ~$0.02-0.05 per conversation depending on length.

5. **Simulations**: Monte Carlo uses simple AND logic for binary drivers. More complex simulation logic can be implemented as needed.

---

**Backend Base URL**: `https://uffp-backend.vercel.app/api`

**Status**: ✅ Fully operational
**Last Updated**: January 30, 2026
