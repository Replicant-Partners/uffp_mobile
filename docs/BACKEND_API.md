# UFFP Backend API Reference

**Base URL:** `https://uffp-backend.vercel.app/api`  
**Last Updated:** 2026-02-04  
**Backend Version:** commit `9bf5068`  
**Database:** Redis (ioredis) on production  

This document describes the complete UFFP backend API extracted from the actual deployed code.

## Architecture Overview

### Storage
- **Database:** Redis via ioredis package
- **Connection:** Environment variable `REDIS_URL`
- **Key Pattern:** 
  - `forecast:{id}` - Individual forecast data
  - `user:{userId}:forecasts` - User's forecast IDs (Redis Set)
  - `forecasts:all` - All forecast IDs (Redis Set)

### Routing
- **Pattern:** Action-based routing via query parameter
- **Format:** `/api/forecasts?action={ACTION}`
- **Method:** Primarily POST, some GET for retrieval

### Response Format
```json
{
  "success": true,
  "forecast": { /* Forecast object */ }
}
```

### Critical Implementation Notes

1. **NO DELETE ENDPOINT** - Backend does not support forecast deletion
2. **Nested Response** - Response is `{ success, forecast }`, not just the forecast
3. **Field Mapping** - Backend stores `researchResults`, frontend calls them `agents`
4. **ID Generation** - Uses `nanoid(12)` for all IDs
5. **Probability Range** - Drivers use 0-100 range (not 0-1)

---

## Data Schemas

### Forecast
```typescript
interface Forecast {
  id: string;
  userId?: string;
  question: string;
  domain?: string;
  timeframe?: string;
  resolutionCriteria: string;
  
  // Superforecaster methodology
  baseRate?: BaseRate;
  externalView?: ExternalView;
  drivers: Driver[];
  evidence: Evidence[];
  
  // Probability tracking
  probability?: number;
  initialProbability?: number;
  
  // Resolution
  outcome?: boolean;
  resolvedAt?: Date;
  brierScore?: number;
  
  // Simulation
  simulations?: Simulation[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  status?: "draft" | "active" | "resolved";
}
```

### Driver
```typescript
interface Driver {
  id: string;
  name: string;
  type: "binary" | "continuous";
  direction: "increases" | "decreases";
  description?: string;
  
  // Binary probability
  probability?: number; // 0-100 range
  
  // Continuous distribution
  distribution?: "normal" | "triangular" | "lognormal";
  p5?: number;
  p50?: number;
  p95?: number;
  
  // Research
  agents: Agent[];
  researchResults: ResearchSnapshot[];
  evidence: Evidence[];
  
  // Versioning
  version: { major: number; minor: number };
  versionHistory?: DriverVersion[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

### Agent
```typescript
interface Agent {
  id: string;
  name: string;
  promptId?: string;
  schedule: "daily" | "weekly" | "on-demand";
  variables?: Record<string, string>;
}
```

### Evidence
```typescript
interface Evidence {
  id: string;
  type: "url" | "quote" | "data" | "reasoning";
  content: string;
  source?: string;
  confidence?: "high" | "medium" | "low";
  attachedTo: "forecast" | "baseRate" | "driver";
  attachedToId: string;
  timestamp: Date;
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    favicon?: string;
    fetchedAt?: Date;
  };
}
```

### ResearchSnapshot
```typescript
interface ResearchSnapshot {
  id: string;
  agentId: string;
  promptId: string;
  variables: Record<string, string>;
  
  // Results
  summary: string;
  keyFindings: string[];
  sources: string[];
  confidence: "high" | "medium" | "low";
  fullResponse: string;
  
  // Cost
  cost: number;
  tokensUsed?: number;
  
  // Metadata
  executedAt: Date;
  attachedToDriverId?: string;
}
```

### BaseRate & ExternalView
```typescript
interface BaseRate {
  referenceClass: string;
  successRate: number; // 0-1 range
  sampleSize: number;
  evidence: Evidence[];
  capturedAt: Date;
}

interface ExternalView {
  referenceClass: string;
  baseRate?: number;
  reasoning?: string;
  source?: string;
  generatedBy?: "fermi" | "user";
  confidence?: "high" | "medium" | "low";
  updatedAt?: Date | string;
}
```

---

## API Endpoints

### 1. Parse Question

**Endpoint:** `POST /api/forecasts?action=parse`

**Request:**
```json
{
  "userInput": "Will I get a promotion in 2026?"
}
```

**Response:**
```json
{
  "success": true,
  "question": "Will I get a promotion in 2026?",
  "domain": "career",
  "timeframe": "2026",
  "resolutionCriteria": "Job title changes to senior level or higher"
}
```

---

### 2. Create Forecast

**Endpoint:** `POST /api/forecasts?action=create`

**Request:**
```json
{
  "userId": "user_123",
  "question": "Will I get a promotion in 2026?",
  "domain": "career",
  "timeframe": "2026",
  "resolutionCriteria": "Job title changes to senior level or higher"
}
```

**Response:**
```json
{
  "success": true,
  "forecast": {
    "id": "fct_AbC123XyZ",
    "userId": "user_123",
    "question": "Will I get a promotion in 2026?",
    "domain": "career",
    "timeframe": "2026",
    "resolutionCriteria": "Job title changes to senior level or higher",
    "drivers": [],
    "evidence": [],
    "createdAt": "2026-02-04T10:30:00.000Z",
    "updatedAt": "2026-02-04T10:30:00.000Z",
    "status": "draft"
  }
}
```

---

### 3. Get Forecast

**Endpoint:** `GET /api/forecasts?action=get&id={forecastId}`

**Response:**
```json
{
  "success": true,
  "forecast": { /* Full Forecast object */ }
}
```

**Error (404):**
```json
{
  "error": "Forecast not found"
}
```

---

### 4. List Forecasts

**Endpoint:** `GET /api/forecasts?action=list&userId={userId}&status={status}&limit={limit}&offset={offset}`

**Query Parameters:**
- `userId` (optional) - Filter by user
- `status` (optional) - Filter by status: "draft" | "active" | "resolved"
- `limit` (optional) - Max results (default: 50)
- `offset` (optional) - Skip first N results (default: 0)

**Response:**
```json
{
  "success": true,
  "forecasts": [
    { /* Forecast 1 */ },
    { /* Forecast 2 */ }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

---

### 5. Update Forecast

**Endpoint:** `POST /api/forecasts?action=updateForecast`

**Request:**
```json
{
  "forecastId": "fct_AbC123XyZ",
  "updates": {
    "question": "Updated question?",
    "status": "active",
    "probability": 65
  }
}
```

**Response:**
```json
{
  "success": true,
  "forecast": { /* Updated Forecast */ }
}
```

---

### 6. Add Driver

**Endpoint:** `POST /api/forecasts?action=addDriver`

**Request:**
```json
{
  "forecastId": "fct_AbC123XyZ",
  "driver": {
    "name": "Strong performance reviews",
    "type": "binary",
    "direction": "increases",
    "probability": 75,
    "agents": [],
    "researchResults": [],
    "evidence": [],
    "version": { "major": 1, "minor": 0 }
  }
}
```

**Response:**
```json
{
  "success": true,
  "forecast": { /* Forecast with new driver */ }
}
```

**Notes:**
- Driver ID is auto-generated if not provided
- `createdAt` and `updatedAt` timestamps are added automatically
- Evidence items without IDs get auto-generated IDs

---

### 7. Update Driver

**Endpoint:** `POST /api/forecasts?action=updateDriver`

**Request:**
```json
{
  "forecastId": "fct_AbC123XyZ",
  "driverId": "drv_XyZ789AbC",
  "updates": {
    "probability": 80,
    "evidence": [ /* Updated evidence array */ ]
  },
  "changeReason": "New data from Q4 review"
}
```

**Response:**
```json
{
  "success": true,
  "forecast": { /* Forecast with updated driver */ }
}
```

**Notes:**
- `changeReason` is extracted but not currently used (future: version history)
- Updates are partial - only specified fields are changed
- `updatedAt` timestamp is automatically updated

---

### 8. Remove Driver

**Endpoint:** `POST /api/forecasts?action=removeDriver`

**Request:**
```json
{
  "forecastId": "fct_AbC123XyZ",
  "driverId": "drv_XyZ789AbC"
}
```

**Response:**
```json
{
  "success": true,
  "forecast": { /* Forecast without the driver */ }
}
```

---

### 9. Add Evidence

**Endpoint:** `POST /api/forecasts?action=addEvidence`

**Request:**
```json
{
  "forecastId": "fct_AbC123XyZ",
  "evidence": {
    "type": "url",
    "content": "https://example.com/article",
    "source": "Industry Report 2026",
    "confidence": "high",
    "attachedTo": "driver",
    "attachedToId": "drv_XyZ789AbC"
  },
  "driverId": "drv_XyZ789AbC"
}
```

**Response:**
```json
{
  "success": true,
  "forecast": { /* Forecast with new evidence */ }
}
```

**Notes:**
- Evidence ID and timestamp are auto-generated
- `driverId` parameter is extracted but not currently used

---

### 10. Set Base Rate

**Endpoint:** `POST /api/forecasts?action=setBaseRate`

**Request:**
```json
{
  "forecastId": "fct_AbC123XyZ",
  "baseRate": {
    "referenceClass": "Promotions in tech companies for mid-level engineers",
    "successRate": 0.35,
    "sampleSize": 1000,
    "evidence": []
  }
}
```

**Response:**
```json
{
  "success": true,
  "forecast": { /* Forecast with base rate */ }
}
```

---

### 11. Run Simulation

**Endpoint:** `POST /api/forecasts?action=simulate`

**Request:**
```json
{
  "forecastId": "fct_AbC123XyZ",
  "iterations": 10000,
  "reasonForRun": "Updated driver probabilities"
}
```

**Response:**
```json
{
  "success": true,
  "forecast": { /* Forecast with simulation results */ },
  "simulation": {
    "id": "sim_123abc",
    "forecastId": "fct_AbC123XyZ",
    "iterations": 10000,
    "probability": 68.5,
    "distribution": {
      "histogram": [/* 100 buckets */],
      "bins": 100,
      "p10": 55.2,
      "p25": 62.1,
      "p50": 68.5,
      "p75": 74.8,
      "p90": 81.3
    },
    "cost": 0.02,
    "runtime": 127,
    "executedAt": "2026-02-04T11:00:00.000Z"
  }
}
```

**Algorithm:**
- Monte Carlo simulation with conjunction of binary drivers
- Each iteration: all drivers must "succeed" (random < probability/100)
- Currently only supports binary drivers
- Default iterations: 10000

---

### 12. Get User Stats

**Endpoint:** `GET /api/forecasts?action=stats&userId={userId}`

**Response:**
```json
{
  "success": true,
  "userId": "user_123",
  "stats": {
    "totalForecasts": 15,
    "resolvedForecasts": 8,
    "averageBrierScore": 0.18,
    "calibration": "well-calibrated"
  }
}
```

---

### 13. Get Leaderboard

**Endpoint:** `GET /api/forecasts?action=stats&leaderboard=true`

**Response:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "userId": "user_123",
      "username": "alice",
      "averageBrierScore": 0.15,
      "totalForecasts": 42
    }
  ]
}
```

---

## Error Responses

All endpoints return standard error format:

```json
{
  "error": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad request (missing fields, invalid data)
- `404` - Resource not found
- `500` - Internal server error (Redis, unexpected errors)

---

## Special Behaviors

### 1. No Delete Endpoint
The backend intentionally does not provide a DELETE operation for forecasts. Use `removeDriver` to remove drivers, but forecasts themselves cannot be deleted once created.

### 2. Nested Response Format
All responses follow `{ success: boolean, [dataKey]: {...} }` pattern. When fetching a forecast, access it via `response.forecast`, not just `response`.

### 3. Probability Range
- Drivers use **0-100 range** for probability
- Base rates use **0-1 range** for successRate
- This inconsistency is intentional for UX reasons

### 4. Automatic ID Generation
- Forecasts: `nanoid(12)` 
- Drivers: `nanoid(12)`
- Evidence: `nanoid(12)` if not provided
- All IDs are URL-safe alphanumeric

### 5. Date Handling
- All dates stored as ISO strings in Redis
- `createdAt`/`updatedAt` explicitly converted to Date objects
- Other dates may remain as strings - check type

### 6. Evidence ID Assignment
Evidence items are checked for missing IDs when added. If `id` field is missing, a new ID is generated automatically using `nanoid(12)`.

### 7. Simulation Cost
Monte Carlo simulations have a fixed cost of `0.02` per simulation. This is a placeholder value and doesn't reflect actual compute cost.

---

## Complete Example Workflow

```javascript
// 1. Parse question
const parseResp = await fetch('/api/forecasts?action=parse', {
  method: 'POST',
  body: JSON.stringify({ userInput: "Will I get promoted?" })
});
const { question, domain, timeframe, resolutionCriteria } = await parseResp.json();

// 2. Create forecast
const createResp = await fetch('/api/forecasts?action=create', {
  method: 'POST',
  body: JSON.stringify({ question, domain, timeframe, resolutionCriteria })
});
const { forecast } = await createResp.json();

// 3. Add driver
const driverResp = await fetch('/api/forecasts?action=addDriver', {
  method: 'POST',
  body: JSON.stringify({
    forecastId: forecast.id,
    driver: {
      name: "Strong performance",
      type: "binary",
      direction: "increases",
      probability: 75,
      agents: [],
      researchResults: [],
      evidence: [],
      version: { major: 1, minor: 0 }
    }
  })
});

// 4. Add evidence
await fetch('/api/forecasts?action=addEvidence', {
  method: 'POST',
  body: JSON.stringify({
    forecastId: forecast.id,
    evidence: {
      type: "data",
      content: "Exceeded goals by 15%",
      confidence: "high",
      attachedTo: "driver",
      attachedToId: forecast.drivers[0].id
    }
  })
});

// 5. Run simulation
const simResp = await fetch('/api/forecasts?action=simulate', {
  method: 'POST',
  body: JSON.stringify({
    forecastId: forecast.id,
    iterations: 10000
  })
});
const { simulation } = await simResp.json();
console.log(`Probability: ${simulation.probability}%`);

// 6. List all forecasts
const listResp = await fetch('/api/forecasts?action=list&userId=user_123');
const { forecasts } = await listResp.json();
```

---

## Production Deployment

**URL:** `https://uffp-backend.vercel.app`  
**Platform:** Vercel Serverless Functions  
**Auto-Deploy:** Pushes to `master` branch in `uffp-backend` repo  
**Environment Variables Required:**
- `REDIS_URL` - Redis connection string
- `ANTHROPIC_API_KEY` - Claude API key (for coach/agents)
- `DATABASE_URL` - PostgreSQL (for auth features)

**Health Check:** GET `/api/forecasts?action=list` (returns empty array if healthy)

---

**End of Documentation**
