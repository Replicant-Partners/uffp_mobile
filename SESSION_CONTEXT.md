# UFFP Mobile App - Session Context (Updated)

## Session Overview

**Date:** January 31, 2026  
**Project:** Universal Forecasting Platform Mobile App  
**Repository:** https://github.com/Replicant-Partners/uffp_mobile  
**Live Apps:**
- Mobile Web: https://uffpmobile.vercel.app
- Backend API: https://uffp-backend.vercel.app

## What We Built

### 1. Complete Backend (uffp-backend)

**Location:** /home/ilabra/uffp-backend

**Core Files:**
- `lib/types.ts` - Complete TypeScript type system for forecasts
- `lib/database.ts` - In-memory forecast storage with full CRUD
- `lib/coach.ts` - AI Coach for question parsing and driver suggestions
- `lib/agents.ts` - LLM execution layer (Claude Sonnet 4)
- `lib/config.ts` - 10 research agent configurations

**API Endpoints (all with CORS):**
- `/api/forecasts?action=parse` - Parse natural language questions
- `/api/forecasts?action=create` - Create new forecasts
- `/api/forecasts?action=get&id={id}` - Get forecast by ID
- `/api/forecasts?action=addDriver` - Add probability drivers
- `/api/forecasts?action=simulate` - Run Monte Carlo simulation
- `/api/coach/chat` - Chat with AI coach
- `/api/agents/execute` - Execute research agents
- `/api/prompts/templates` - Get prompt templates

**Key Features:**
- AI-powered question parsing (extracts domain, timeframe, suggests drivers)
- 10 specialized research agents with Claude Sonnet 4
- Monte Carlo simulation for probability calculations
- Version tracking for forecasts and drivers
- Brier score calculation
- Leaderboard functionality

### 2. Mobile Frontend (uffp_mobile)

**Location:** /home/ilabra/uffp_mobile

**Key Screens:**
- `src/screens/HomeScreen.tsx` - Clean landing page with Gruvbox theme
- `src/screens/ForecastInputScreen.tsx` - Main forecasting interface
- `src/screens/ResearchScreen.tsx` - Research agents interface

**Services:**
- `src/services/researchService.ts` - API client for backend
  - parseQuestion()
  - createForecast()
  - getForecast()
  - addDriver()
  - simulate()
  - chatWithCoach()

**Design System:**
- `src/styles/tufte.ts` - Gruvbox dark theme
- Background: #282828
- Text: #ebdbb2
- Accents: Blue (#458588), Green (#98971a), Yellow (#d79921)

## Current Workflow

**End-to-end forecast creation:**

1. User enters question: "Will Real Madrid win the Champions League this year?"
2. Click "Parse Question" → AI parses and suggests drivers
3. Click "Create Forecast" → Forecast created with ID
4. Add drivers:
   - Click suggested drivers (AI-provided)
   - OR click "+ Add Custom Driver" to enter your own
5. Click "Run Simulation" → Monte Carlo simulation calculates probability
6. View results with probability percentage

## Technical Details

### Frontend-Backend Integration

**API Base URL:**
```typescript
const API_BASE_URL =
  typeof __DEV__ !== "undefined" && __DEV__
    ? "http://localhost:3000"
    : "https://uffp-backend.vercel.app";
```

**CORS Configuration:**
```typescript
// api/cors.ts
export function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}
```

### Data Flow

**Parse Question:**
```
User Input → POST /api/forecasts?action=parse
         ← {success: true, parsed: {question, domain, timeframe, suggestedDrivers, confidence}}
```

**Create Forecast:**
```
{question, domain, timeframe, resolutionCriteria} → POST /api/forecasts?action=create
                                                  ← {success: true, forecast: {id, ...}}
```

**Add Driver:**
```
{forecastId, driver: {name, description, direction, magnitude}} → POST /api/forecasts?action=addDriver
                                                                ← {success: true, forecast: {...}}
```

**Get Forecast:**
```
GET /api/forecasts?action=get&id={forecastId}
  ← {success: true, forecast: {...}}
```

**Run Simulation:**
```
{forecastId, iterations: 10000} → POST /api/forecasts?action=simulate
                                ← {success: true, forecast: {probability: 0.54, ...}}
```

## Recent Issues Fixed

### Issue 1: CORS Errors
**Problem:** "Failed to fetch" errors from web app  
**Cause:** Missing CORS headers  
**Fix:** Added `setCorsHeaders()` to all API endpoints + OPTIONS handling

### Issue 2: Parsed Result Display
**Problem:** Question not showing, confidence as NaN%  
**Cause:** API returns `{success: true, parsed: {...}}` but code expected just the parsed object  
**Fix:** `setParsedResult(result.parsed || result)`

### Issue 3: "Missing id" Error
**Problem:** Error when adding drivers  
**Cause:** Query parameter mismatch - frontend sent `forecastId=` but backend expected `id=`  
**Fix:** Changed `getForecast` to use `id` parameter (src/services/researchService.ts:143)

### Issue 4: No Custom Driver Input
**Problem:** Could only use AI-suggested drivers  
**Solution:** Added custom driver UI with:
- "+ Add Custom Driver" button (dashed border)
- Text input for custom driver name
- Add/Cancel buttons
- Full Gruvbox styling

## File Structure

```
uffp_mobile/
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx          # Landing page
│   │   ├── ForecastInputScreen.tsx # Main forecast UI (413 lines)
│   │   └── ResearchScreen.tsx      # Research agents
│   ├── services/
│   │   └── researchService.ts      # API client (188 lines)
│   ├── styles/
│   │   └── tufte.ts                # Gruvbox theme
│   └── App.tsx                     # Navigation setup
├── app.json
├── package.json
├── vercel.json
├── eas.json
└── SESSION_CONTEXT.md              # This file

uffp-backend/
├── api/
│   ├── cors.ts                     # CORS helper
│   ├── forecasts.ts                # Unified forecast endpoint
│   ├── coach/chat.ts               # AI coach endpoint
│   ├── agents/execute.ts           # Research agent execution
│   └── prompts/templates.ts        # Prompt templates
├── lib/
│   ├── types.ts                    # Type definitions (206 lines)
│   ├── database.ts                 # In-memory storage (509 lines)
│   ├── coach.ts                    # AI Coach (492 lines)
│   ├── agents.ts                   # LLM execution (321 lines)
│   └── config.ts                   # Agent configs (785 lines)
├── package.json
├── tsconfig.json                   # TypeScript config (ES2020)
└── vercel.json
```

## Git History (Recent Commits)

```
0332a24 - Fix 'Missing id' error: use correct query parameter name for getForecast
fac8a56 - Fix driver addition and add custom driver input functionality
2ef2b87 - Apply Gruvbox dark theme to entire app
579465e - Fix parsed result display: extract parsed field from API response
14ae994 - Fix API fetch error and simplify HomeScreen UI
be14b37 - Add Universal Forecasting screen with AI-powered question parsing
```

## Environment Variables (Backend)

```bash
ANTHROPIC_API_KEY=sk-ant-... # Claude Sonnet 4 API key
```

## Deployment Commands

**Mobile App:**
```bash
cd /home/ilabra/uffp_mobile
vercel --prod  # Deploys to https://uffpmobile.vercel.app
```

**Backend:**
```bash
cd /home/ilabra/uffp-backend
vercel --prod  # Deploys to https://uffp-backend.vercel.app
```

## Testing the App

**Manual Test Flow:**
1. Visit https://uffpmobile.vercel.app
2. Click "Create Forecast"
3. Enter: "Will SpaceX land on Mars by 2030?"
4. Click "Parse Question"
5. Verify: Question parsed, domain=space, suggested drivers appear
6. Click "Create Forecast"
7. Verify: Forecast created with ID
8. Click a suggested driver OR "+ Add Custom Driver"
9. Enter custom driver name (e.g., "Rocket technology advancement")
10. Click "Add"
11. Verify: Driver appears in "Drivers Added" list
12. Click "Run Simulation"
13. Verify: Probability displays (e.g., 54.2%)

**API Test:**
```bash
# Test parse
curl -X POST https://uffp-backend.vercel.app/api/forecasts?action=parse \
  -H "Content-Type: application/json" \
  -d '{"userInput":"Will it rain tomorrow?"}'

# Test create
curl -X POST https://uffp-backend.vercel.app/api/forecasts?action=create \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Will it rain tomorrow?",
    "domain": "weather",
    "timeframe": "tomorrow",
    "resolutionCriteria": "Yes if rain occurs"
  }'
```

## Known Limitations

1. **In-Memory Storage:** Forecasts are lost on backend restart (future: migrate to Vercel KV)
2. **No Authentication:** No user system yet
3. **No Persistence:** No database, everything ephemeral
4. **Simple Simulation:** Monte Carlo with basic driver weighting
5. **No Mobile Native Build:** Only web version deployed (EAS build requires credentials setup)

## Future Enhancements

From user requirements:
- [ ] Notion-style blocks for forecast editing
- [ ] Complete forecast history and evolution tracking
- [ ] Research agent cost tracking
- [ ] Brier score Tamagotchi visualization
- [ ] Leaderboard
- [ ] Portfolio management for prediction markets
- [ ] Persistent storage (Vercel KV or PostgreSQL)
- [ ] User authentication
- [ ] Native mobile builds (iOS/Android via EAS)

## Key Learnings

1. **CORS is critical** for web apps calling external APIs
2. **Query parameter naming** must match exactly between frontend/backend
3. **API response structure** - always check what the API actually returns
4. **Gruvbox colors** - #282828, #ebdbb2, #458588, #98971a, #d79921
5. **TypeScript strict mode** - requires type assertions for `response.json()`
6. **Vercel deployment** - auto-deploys from Git, supports serverless functions
7. **React Native web** - uses Expo web for browser deployment

## Debug Tips

**Check Backend Logs:**
```bash
vercel logs uffp-backend --prod
```

**Check Mobile Logs:**
```bash
vercel logs uffp_mobile --prod
```

**Test API Directly:**
```bash
curl -i https://uffp-backend.vercel.app/api/forecasts?action=parse \
  -H "Content-Type: application/json" \
  -H "Origin: https://uffpmobile.vercel.app" \
  -X POST -d '{"userInput":"test"}'
```

**Common Errors:**
- "Failed to fetch" → Check CORS headers
- "Missing id" → Check query parameter naming
- "NaN%" → Check response parsing (result.parsed vs result)
- 405 Method Not Allowed → Check OPTIONS preflight handling

## Contact & Resources

- **Repository:** https://github.com/Replicant-Partners/uffp_mobile
- **Backend Repo:** N/A (deployed from /home/ilabra/uffp-backend)
- **Documentation:** API_REFERENCE.md, BACKEND_SUMMARY.md, MOBILE_UI_ARCHITECTURE.md
- **User:** ivan-5553 (Vercel), Replicant-Partners (GitHub)

## Last Updated
January 31, 2026 - After fixing "Missing id" error and adding custom driver functionality
