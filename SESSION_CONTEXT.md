# UFFP Mobile - Development Session Context

**Date**: January 30, 2026
**Status**: Backend Complete ✅ | Mobile UI Next 🚀

---

## What We've Built

### ✅ Backend (Fully Operational)

**Deployed at**: https://uffp-backend.vercel.app/api

#### Core Systems
1. **Universal Forecasting System**
   - Any event, any domain (finance, tech, weather, politics, sports, general)
   - Natural language question parsing
   - Driver decomposition (binary & continuous)
   - Evidence attachment (url, quote, data, reasoning)
   - Base rate methodology
   - Monte Carlo simulation (10k iterations in ~16ms)
   - Version tracking & history
   - Forecast CRUD operations

2. **AI Coach Agent**
   - Parses questions from natural language
   - Auto-detects domain & timeframe
   - Suggests 3-5 relevant drivers
   - Recommends research agents
   - Guides users step-by-step through:
     - Base rate selection
     - Driver decomposition
     - Probability quantification
     - Final review
   - Context-aware conversational responses

3. **10 Research Agents** (Claude Sonnet 4)
   - Research Analyst - Deep research with citations
   - Sentiment Monitor - Social listening & scoring
   - Competitive Intelligence - Competitor tracking
   - Financial Analyst - Financial statement analysis
   - Market Researcher - TAM & market sizing
   - Expert Synthesizer - Expert opinion aggregation
   - Technology Validator - Technical feasibility
   - Regulatory Monitor - Policy impact analysis
   - Hiring Tracker - Growth inference from hiring
   - Growth Signals - User adoption metrics
   - Pricing Intelligence - Competitive pricing

4. **10 Research Prompt Templates**
   - Market TAM Sizing
   - Sentiment Tracking
   - Competitor Benchmarking
   - Financial Fundamentals
   - Expert Opinion Consensus
   - Technology Validation
   - Regulatory Impact Analysis
   - Hiring Trends Analysis
   - User Growth Proxy Metrics
   - Pricing Analysis

5. **Stats & Gamification Backend**
   - User statistics (total forecasts, avg Brier score)
   - Leaderboard (global & by domain)
   - Domain-specific performance tracking
   - Ready for Tamagotchi integration

#### API Endpoints (4 Serverless Functions)

```
/api/forecasts?action={action}
  - parse: Parse natural language question
  - create: Create new forecast
  - get: Get forecast by ID
  - list: List forecasts (with filters)
  - addDriver: Add driver to forecast
  - updateDriver: Update driver (creates version)
  - removeDriver: Remove driver
  - addEvidence: Attach evidence
  - setBaseRate: Set base rate
  - simulate: Run Monte Carlo simulation
  - stats: Get user stats or leaderboard

/api/agents/execute
  - Execute research agent with prompt template

/api/prompts/templates
  - List all available prompt templates

/api/coach/chat
  - Chat with AI coach (stages: base_rate, drivers, quantify, review)
```

#### Performance Metrics
- Question parsing: ~3s
- Forecast creation: <100ms
- Driver addition: <100ms
- Simulation (10k): ~16ms
- Research execution: 3-8s

#### Cost Analysis
- Per forecast: $0.10-0.30 (depending on research)
- Research agent: $0.03-0.06 each
- Question parsing: ~$0.02
- Simulation: $0.02

#### Tested End-to-End Workflow
```
Input: "Will SpaceX land on Mars by 2030?"
1. Parse → "Will SpaceX successfully land on Mars by 2030?"
   Domain: technology
   Suggested drivers: 5 relevant drivers
   Suggested research: 3 agents
   
2. Create forecast → ID: 1769816625453-ko8o62pmt

3. Add 3 drivers:
   - Technical feasibility: 75%
   - Funding secured: 80%
   - Regulatory approval: 90%

4. Simulate → Final probability: 54%
   Runtime: 16ms
   
✅ WORKING!
```

### 📄 Documentation Created

1. **API_REFERENCE.md** (821 lines)
   - Complete API documentation
   - Request/response examples
   - All data models
   - Example workflows

2. **BACKEND_SUMMARY.md**
   - Implementation overview
   - Performance & cost analysis
   - Mobile app roadmap

3. **MOBILE_UI_ARCHITECTURE.md**
   - Complete UI/UX design
   - Notion-style block system
   - Forecast history & evolution
   - Research agent management
   - Brier score Tamagotchi
   - Leaderboard design
   - All 8 core features specified

4. **IMPLEMENTATION_PLAN.md** (Already existed)
   - Original implementation plan
   - Research agents config

5. **ELIZA_ALIGNMENT_PLAN.md** (Already existed)
   - Alignment with ElizaOS system
   - Feature parity documentation

---

## Mobile App Status

### ✅ What Exists
- React Native + Expo setup
- Basic navigation (Tab bar)
- HomeScreen (placeholder)
- ResearchScreen (prototype - needs updating)
- ResearchService (API layer - needs updating)

### ❌ What Needs Building

#### Phase 1: Basic Forecast Creation (NEXT)
- [ ] Create ForecastInputScreen
  - Text input for question
  - Parse question button
  - Display parsed results
  - Show suggested drivers
  - Accept/customize buttons
  
- [ ] Create DriverSetupScreen
  - List of drivers (from suggestions or custom)
  - Probability input for each
  - Option to run research
  - Next/back navigation

- [ ] Create SimulationScreen
  - Review all drivers
  - Run simulation button
  - Display results (probability, distribution)
  - Save forecast

- [ ] Update ResearchService
  - Update API base URL
  - Add forecast endpoints
  - Add coach endpoints

#### Phase 2: Coach Integration
- [ ] Chat-style interface
- [ ] Coach suggestions as action buttons
- [ ] Context-aware help

#### Phase 3: Research Integration
- [ ] Agent browser
- [ ] Execute from driver screen
- [ ] View results
- [ ] Attach as evidence

#### Phase 4: History & Evolution
- [ ] Forecast list
- [ ] Timeline view
- [ ] Driver evolution
- [ ] Version comparison

#### Phase 5: Gamification
- [ ] Tamagotchi dashboard
- [ ] Achievements
- [ ] Leaderboard
- [ ] Brier score visualization

---

## Current File Structure

### Backend (`uffp-backend/`)
```
api/
  forecasts.ts         - Unified forecast endpoint
  agents/
    execute.ts         - Research execution
  prompts/
    templates.ts       - Prompt library
  coach/
    chat.ts           - AI coach
lib/
  types.ts            - TypeScript interfaces
  config.ts           - Agent configs (10 agents, 10 prompts)
  agents.ts           - LLM execution logic
  coach.ts            - Coach agent logic
  database.ts         - In-memory storage (509 lines)
```

### Mobile (`uffp_mobile/`)
```
src/
  App.tsx                      - Main navigation
  screens/
    HomeScreen.tsx             - Placeholder
    ResearchScreen.tsx         - Prototype (needs update)
  services/
    researchService.ts         - API layer (needs update)
    
Documentation:
  API_REFERENCE.md             - Complete API docs
  BACKEND_SUMMARY.md           - Backend overview
  MOBILE_UI_ARCHITECTURE.md    - UI/UX design
  IMPLEMENTATION_PLAN.md       - Original plan
  ELIZA_ALIGNMENT_PLAN.md      - Feature parity
  SESSION_CONTEXT.md           - This file
```

---

## Key Design Decisions

### AI Coach Makes It Easy
The coach does the heavy lifting:
1. User types anything: "Will Tesla hit $500?"
2. Coach parses → structured question, domain, drivers
3. User accepts or customizes
4. Coach guides probability estimation
5. Suggests research agents
6. Reviews for completeness

**Goal**: Users should be able to create high-quality forecasts in 2-3 minutes.

### Notion-Style Blocks (Future)
- Flexible blocks (question, driver, evidence, research, chat)
- Each block has modes: view, edit, chat
- Drag to reorder
- Inline editing
- Chat with any block

### Universal Forecasting
- Any event that could be a prediction market
- Finance: "Will ASTS reach $20?"
- Weather: "Will it rain tomorrow?"
- Politics: "Will treaty be signed?"
- Technology: "Will SpaceX launch succeed?"
- General: Any yes/no question

### History & Evolution Tracking
- Every driver update creates version
- Evidence attached to specific moments
- Research results timestamped
- Can see "what you knew when"

### Gamification
- Brier score Tamagotchi (visual character)
- Health based on forecast accuracy
- Achievements & streaks
- Global & domain leaderboards

---

## Environment Variables

### Backend (Vercel)
```
ANTHROPIC_API_KEY=sk-ant-xxx  ✅ Set
```

### Mobile
```
API_BASE_URL=https://uffp-backend.vercel.app/api
```

---

## Git Status

**Current Branch**: master
**Last Commit**: f6268d5 - "Add complete backend implementation documentation"

**Recent Commits**:
- f6268d5 - Backend documentation
- f9d3340 - Update backend API URL
- 77a2ef0 - Add EAS build config, Vercel deployment, Research screen features
- 90d60f6 - Initial commit

**Remote**: https://github.com/Replicant-Partners/uffp_mobile.git

---

## Deployment Status

### Backend
- **Platform**: Vercel
- **URL**: https://uffp-backend.vercel.app
- **Status**: ✅ Live & Working
- **Functions**: 4 serverless functions
- **Last Deploy**: Jan 30, 2026

### Mobile Web
- **Platform**: Vercel
- **URL**: https://uffpmobile.vercel.app
- **Status**: ✅ Live (old version)
- **Note**: Needs redeploy after mobile UI updates

### Android (EAS)
- **Status**: ❌ Not built yet
- **Reason**: Waiting for mobile UI completion
- **Config**: eas.json configured, keystore set up

---

## Next Immediate Steps

1. **Update ResearchService** (`src/services/researchService.ts`)
   - Add forecast parsing endpoint
   - Add forecast CRUD methods
   - Add coach chat method
   - Update base URL (already correct)

2. **Create ForecastInputScreen** (`src/screens/ForecastInputScreen.tsx`)
   - Simple text input
   - "Parse Question" button
   - Display parsed results
   - Show suggested drivers
   - Accept/customize flow

3. **Create Simple Navigation**
   - Add ForecastInput to tab navigator
   - Or make it the home screen

4. **Test End-to-End**
   - Type question
   - See parsed results
   - Accept drivers
   - See final screen

---

## Technical Stack

### Backend
- **Runtime**: Node.js 18 on Vercel
- **Language**: TypeScript
- **LLM**: Claude Sonnet 4 (Anthropic)
- **Storage**: In-memory (migrate to Vercel KV later)
- **Framework**: Vercel Serverless Functions

### Mobile
- **Framework**: React Native + Expo
- **Language**: TypeScript
- **Navigation**: React Navigation
- **State**: Built-in hooks (Zustand/Redux later if needed)
- **Charts**: React Native Chart Kit
- **Build**: EAS Build

---

## Important Notes

1. **Storage is In-Memory**: Data resets on backend deploy. Perfect for dev, migrate to KV for prod.

2. **Coach is Key**: The AI coach is what makes this platform easy to use. It's the differentiator.

3. **Start Simple**: Build basic forecast creation first, then add complexity.

4. **Mobile-First**: Design for touch, optimize for one-handed use.

5. **Cost Monitoring**: Track LLM costs, ~$0.10-0.30 per forecast is affordable.

6. **Version Tracking Works**: Every update creates history automatically.

7. **Research is Optional**: Users can forecast without research, or run 10+ agents.

---

## Quick Reference Commands

### Backend Testing
```bash
# Parse question
curl -X POST https://uffp-backend.vercel.app/api/forecasts?action=parse \
  -H "Content-Type: application/json" \
  -d '{"userInput":"Will SpaceX land on Mars by 2030?"}'

# Create forecast
curl -X POST https://uffp-backend.vercel.app/api/forecasts?action=create \
  -H "Content-Type: application/json" \
  -d '{"question":"Will SpaceX land on Mars?","resolutionCriteria":"Official confirmation"}'
```

### Mobile Development
```bash
cd /home/ilabra/uffp_mobile
npm start           # Start Expo
npm run android     # Run on Android
npm run web         # Run in browser
```

### Deployment
```bash
# Backend
cd /home/ilabra/uffp-backend
vercel --prod

# Mobile web
cd /home/ilabra/uffp_mobile
vercel --prod

# Android build
npx eas build --platform android --profile preview
```

---

## Success Criteria

### MVP Complete When:
- [ ] User can type any question
- [ ] AI parses and suggests drivers
- [ ] User can accept or customize
- [ ] User can set probabilities
- [ ] Simulation runs and shows result
- [ ] Forecast is saved
- [ ] User can view their forecasts

### V1 Complete When:
- [ ] Coach guides through all steps
- [ ] Research agents can be executed
- [ ] Evidence can be attached
- [ ] History shows forecast evolution
- [ ] Brier score displayed
- [ ] Leaderboard works

---

**Ready to build the first screen!** 🚀

All context captured. If session interrupts, refer to:
- This file for context
- API_REFERENCE.md for API details
- MOBILE_UI_ARCHITECTURE.md for UI design
- BACKEND_SUMMARY.md for backend capabilities
