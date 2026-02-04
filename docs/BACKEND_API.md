# UFFP Backend API Complete Reference

**Base URL**: `https://uffp-backend.vercel.app/api`  
**Dev URL**: `http://localhost:3000/api`

**Last Updated**: 2026-02-04  
**Source**: Extracted from `src/services/researchService.ts`

---

## Authentication Endpoints

### POST `/auth/register`
Register a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "name": "Optional Name"
}
```

**Response**: User object with token

---

### POST `/auth/login`
Authenticate and get session token.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response**: 
```json
{
  "token": "jwt_token_here",
  "user": { ... }
}
```

---

### GET `/auth/me`
Get current user info.

**Headers**: `Authorization: Bearer {token}`

**Response**: User object

---

## Forecast Endpoints

All forecast endpoints use `/forecasts?action={ACTION}` pattern.

### POST `/forecasts?action=create`
Create a new forecast.

**Request Body**:
```json
{
  "userId": "user_id (optional)",
  "question": "Will X happen by Y?",
  "domain": "technology|finance|geopolitics|general",
  "timeframe": "2026-12-31",
  "resolutionCriteria": "Forecast resolves when...",
  "privacy": "private|unlisted|public|organization",
  "tags": ["tag1", "tag2"]
}
```

**Response**:
```json
{
  "success": true,
  "forecast": {
    "id": "forecast_id",
    "question": "...",
    ...
  }
}
```

**Note**: Forecast is created WITHOUT drivers. Add drivers separately.

---

### GET `/forecasts?action=get&id={forecastId}`
Get a single forecast by ID.

**Response**: Complete forecast object with drivers

---

### GET `/forecasts?action=list&userId={userId}&status={status}&limit={N}&offset={N}`
List forecasts.

**Query Params**:
- `userId` (optional): Filter by user
- `status` (optional): `draft|active|resolved`
- `limit` (optional): Max results (default 50)
- `offset` (optional): Pagination offset

**Response**:
```json
{
  "forecasts": [...],
  "total": 100
}
```

---

### POST `/forecasts?action=addDriver`
Add a driver to a forecast.

**Request Body**:
```json
{
  "forecastId": "forecast_id",
  "driver": {
    "name": "Driver Name",
    "type": "binary|continuous",
    "direction": "increases|decreases",
    "probability": 0.75,           // For binary (0-1 range)
    "p5": 20,                      // For continuous
    "p50": 50,
    "p95": 100,
    "distribution": "triangular|normal|lognormal",
    "reasoning": "Why this driver matters",
    "evidence": [],                // Optional
    "researchResults": [],         // Optional (agents)
    "version": { "major": 1, "minor": 0 },
    "versionHistory": []
  }
}
```

**Response**: Updated forecast

**CRITICAL**: Backend expects `researchResults`, NOT `agents`!

---

### POST `/forecasts?action=updateDriver`
Update an existing driver.

**Request Body**:
```json
{
  "forecastId": "forecast_id",
  "driverId": "driver_id",
  "updates": {
    // Any driver fields to update
  },
  "changeReason": "Why the update (optional)"
}
```

**Response**: Updated forecast

---

### POST `/forecasts?action=removeDriver`
Remove a driver from forecast.

**Request Body**:
```json
{
  "forecastId": "forecast_id",
  "driverId": "driver_id"
}
```

**Response**: Updated forecast

---

### POST `/forecasts?action=simulate`
Run Monte Carlo simulation.

**Request Body (Option 1 - with forecastId)**:
```json
{
  "forecastId": "forecast_id",
  "iterations": 10000
}
```

**Request Body (Option 2 - standalone)**:
```json
{
  "question": "...",
  "drivers": [...]
}
```

**Response**:
```json
{
  "probability": 0.65,
  "distribution": { ... },
  "simulations": [...]
}
```

---

### POST `/forecasts?action=update`
Update forecast metadata (question, domain, etc).

**Request Body**:
```json
{
  "forecastId": "forecast_id",
  "updates": {
    "question": "Updated question?",
    "domain": "new_domain",
    "timeframe": "2027-01-01",
    "resolutionCriteria": "...",
    "probability": 0.75,
    "resolved": false,
    "actualOutcome": true
  }
}
```

**Response**: Updated forecast

---

### POST `/forecasts?action=resolve`
Mark forecast as resolved with outcome.

**Request Body**:
```json
{
  "forecastId": "forecast_id",
  "actualOutcome": true,
  "resolvedAt": "2026-02-04T10:00:00Z"
}
```

**Response**: Updated forecast with Brier score

---

### POST `/forecasts?action=setBaseRate`
Set external view / base rate.

**Request Body**:
```json
{
  "forecastId": "forecast_id",
  "baseRate": {
    "referenceClass": "Similar historical events",
    "baseRate": 0.45,              // 0-1 range
    "source": "Data source",
    "generatedBy": "fermi|user",
    "confidence": "high|medium|low",
    "reasoning": "Why this base rate",
    "updatedAt": "ISO timestamp"
  }
}
```

**Response**: Updated forecast

---

### POST `/forecasts?action=addEvidence`
Add evidence to forecast or driver.

**Request Body**:
```json
{
  "forecastId": "forecast_id",
  "driverId": "driver_id (optional)",
  "evidence": {
    "id": "evd_xyz",
    "type": "url|quote|data|reasoning",
    "content": "Evidence text",
    "source": "Source name",
    "confidence": "high|medium|low",
    "attachedTo": "forecast|driver|baseRate",
    "attachedToId": "parent_id",
    "timestamp": "ISO timestamp"
  }
}
```

**Response**: Updated forecast

---

### GET `/forecasts?action=stats&userId={userId}`
Get user statistics.

**Response**:
```json
{
  "totalForecasts": 50,
  "brierScore": 0.15,
  "accuracy": 0.85,
  ...
}
```

---

### GET `/forecasts?action=stats&leaderboard=true&domain={domain}&limit={N}`
Get leaderboard.

**Response**: Array of user stats ranked by performance

---

### GET `/forecasts/discover?tags={tags}&domain={domain}&limit={N}&offset={N}`
Discover public forecasts.

**Response**: Array of public forecasts

---

## Research Endpoints

### POST `/agents/execute`
Execute a research agent.

**Request Body**:
```json
{
  "agentId": "market_researcher",
  "promptId": "analyze_market",
  "variables": {
    "market": "EV",
    "year": "2026"
  }
}
```

**Response**:
```json
{
  "result": {
    "id": "...",
    "timestamp": "...",
    "summary": "...",
    "keyFindings": [...],
    "sources": [...],
    "confidence": "high|medium|low"
  }
}
```

---

### GET `/research/results?limit={N}&offset={N}`
Get research results history.

**Response**:
```json
{
  "results": [...]
}
```

---

### GET `/research/results?id={id}`
Get single research result.

**Response**:
```json
{
  "result": { ... }
}
```

---

### POST `/research/schedule`
Schedule recurring research.

**Request Body**:
```json
{
  "agentId": "agent_id",
  "promptId": "prompt_id",
  "frequency": "daily|weekly|monthly",
  "variables": { ... },
  "enabled": true
}
```

**Response**:
```json
{
  "scheduledResearch": { ... }
}
```

---

### GET `/research/schedule`
Get all scheduled research.

**Response**:
```json
{
  "scheduled": [...]
}
```

---

## AI Coach Endpoints

### POST `/coach/chat`
Chat with AI coach.

**Request Body**:
```json
{
  "stage": "review|decompose|evidence|simulation",
  "context": {
    "forecastId": "...",
    ... // Any context data
  },
  "userMessage": "User's message",
  "conversationHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response**: AI coach message

---

### POST `/coach/review`
Get AI review of forecast.

**Request Body**:
```json
{
  "forecastId": "forecast_id",
  "forecast": {
    "question": "...",
    "drivers": [...],
    "probability": 0.65
  }
}
```

**Response**: Review feedback

---

### POST `/coach/decompose`
AI-powered driver decomposition.

**Request Body**:
```json
{
  "question": "Will X happen?",
  "forecastId": "forecast_id (optional)",
  "existingDrivers": [...]
}
```

**Response**:
```json
{
  "suggestions": [
    {
      "data": {
        "name": "Driver Name",
        "description": "...",
        "type": "binary|continuous",
        "direction": "increases|decreases"
      }
    }
  ],
  "message": "AI explanation"
}
```

---

## Utility Endpoints

### POST `/parse-question`
Parse natural language question into structured format.

**Request Body**:
```json
{
  "userInput": "Will Tesla reach $300 by end of 2026?"
}
```

**Response**:
```json
{
  "question": "Normalized question",
  "domain": "technology",
  "timeframe": "2026-12-31",
  "confidence": "high"
}
```

---

### GET `/prompts/templates`
Get available prompt templates for agents.

**Response**:
```json
{
  "prompts": [...]
}
```

---

## Important Notes

### Schema Requirements
All entities must follow schema validation:

**Driver**:
- Required: `id`, `name`, `type`, `direction`, `version`, `createdAt`, `updatedAt`
- Binary: Must have `probability` (0-1 range)
- Continuous: Must have `p5`, `p50`, `p95`, `distribution`
- Direction: Must be "increases" or "decreases"

**Evidence**:
- Required: `id`, `type`, `content`, `attachedTo`, `attachedToId`, `timestamp`
- Type: Must be "url", "quote", "data", or "reasoning"
- NOT "manual" or "research"!

**Agent** (stored as researchResults in backend):
- Required: `id`, `name`, `schedule`
- Schedule: Must be "daily", "weekly", or "on-demand"

### Backend Limitations
- **NO DELETE OPERATION**: Backend doesn't support deleting forecasts via API
- **Agents vs ResearchResults**: Frontend uses "agents", backend uses "researchResults"
- **ID Formats**: Backend accepts old IDs without prefixes (warnings only)

### Error Responses
All endpoints return errors in format:
```json
{
  "error": "Error message",
  "details": "..."  // Optional
}
```

HTTP Status Codes:
- `200`: Success
- `400`: Bad request / validation error
- `401`: Unauthorized
- `404`: Not found
- `500`: Server error
