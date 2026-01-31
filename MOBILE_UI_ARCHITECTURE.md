# Universal Forecasting Platform - Mobile UI Architecture

## Vision
A flexible, Notion-style forecasting platform where users can create forecasts for ANY event (prediction market compatible), manage research agents, track performance via Brier score Tamagotchi, and see complete forecast evolution history.

---

## Core Features Breakdown

### 1. Universal Forecast Creation
**Any event that could be posted to a prediction market**

#### Data Model
```typescript
interface Forecast {
  id: string;
  question: string;              // "Will SpaceX land on Mars by 2030?"
  domain?: string;               // auto-detected: finance, tech, weather, etc.
  timeframe?: string;            // "by 2030", "Q4 2026", etc.
  resolution_criteria: string;   // How will this be judged?
  
  // Superforecaster methodology
  baseRate: BaseRate;
  drivers: Driver[];
  evidence: Evidence[];
  
  // Outcomes
  probability: number;           // Final probability (0-1)
  simulations?: MonteCarloResult[];
  
  // Evolution tracking
  versions: ForecastVersion[];   // Historical snapshots
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolution?: 'yes' | 'no' | 'ambiguous';
  brierScore?: number;
}

interface BaseRate {
  referenceClass: string;        // "Small cap satellite companies"
  successRate: number;           // 0.15 (15%)
  sampleSize?: number;
  evidence: Evidence[];
  capturedAt: Date;
}

interface Driver {
  id: string;
  name: string;                  // "Technical feasibility"
  type: 'binary' | 'continuous';
  
  // For binary
  probability?: number;          // 0.75
  
  // For continuous (distribution)
  p5?: number;
  p50?: number;
  p95?: number;
  distribution?: 'normal' | 'triangular' | 'lognormal';
  
  // Evidence & research
  evidence: Evidence[];
  researchResults: ResearchSnapshot[];
  
  // Evolution
  versions: DriverVersion[];
  capturedAt: Date;
}

interface Evidence {
  id: string;
  type: 'url' | 'quote' | 'data' | 'reasoning';
  content: string;
  source?: string;
  timestamp: Date;
  attachedTo: 'forecast' | 'baseRate' | 'driver';
  attachedToId: string;
}

interface ResearchSnapshot {
  id: string;
  agentId: string;
  promptId: string;
  result: ResearchResult;       // Full research result
  cost: number;                 // API cost in USD
  executedAt: Date;
  attachedToDriverId: string;
}

interface ForecastVersion {
  version: number;
  probability: number;
  drivers: Driver[];            // Snapshot of drivers at this time
  evidence: Evidence[];         // Evidence known at this time
  research: ResearchSnapshot[]; // Research done by this point
  createdAt: Date;
  reason?: string;              // "Updated based on new earnings report"
}
```

---

### 2. Notion-Style Block System
**Flexible blocks that can be chat or form**

#### Block Types
```typescript
type BlockType =
  | 'question'          // The forecast question
  | 'base_rate'         // Base rate input/display
  | 'driver'            // Individual driver block
  | 'evidence'          // Evidence attachment
  | 'research'          // Research agent trigger/result
  | 'simulation'        // Monte Carlo simulation
  | 'chat'              // Conversational AI coach
  | 'probability'       // Final probability display
  | 'resolution'        // Resolution criteria

interface Block {
  id: string;
  type: BlockType;
  forecastId: string;
  
  // Content
  content: any;                 // Type-specific content
  
  // Interaction modes
  mode: 'view' | 'edit' | 'chat';
  
  // Position
  order: number;
  parentBlockId?: string;       // For nested blocks
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Example: Driver Block
interface DriverBlock extends Block {
  type: 'driver';
  content: {
    driver: Driver;
    researchSuggestions?: string[];  // AI coach suggestions
    relatedEvidence: Evidence[];
    chatHistory?: Message[];         // If using chat mode
  };
}

// Example: Chat Block (AI Coach)
interface ChatBlock extends Block {
  type: 'chat';
  content: {
    messages: Message[];
    context: 'driver_creation' | 'evidence_review' | 'general';
    suggestions?: string[];
  };
}
```

#### Block Interactions
- **Tap to edit**: Switch to edit mode
- **Chat icon**: Switch to chat mode (AI coach)
- **Drag handle**: Reorder blocks
- **Plus button**: Add new block below
- **Menu (•••)**: Delete, duplicate, convert type

---

### 3. Forecast Collection & History
**See all forecasts and their evolution**

#### Views
1. **List View**: All forecasts with key metrics
   ```
   [RESOLVED] Will SpaceX land on Mars by 2030?
   Created: Jan 2026 | Prob: 45% → 38% | Brier: 0.12 ✅
   
   [ACTIVE] Will ASTS reach $20 by end of 2026?
   Created: Jan 2026 | Current: 35% | 3 updates
   
   [RESOLVED] Will it rain in Seattle tomorrow?
   Created: Dec 2025 | Prob: 70% | Brier: 0.09 ✅
   ```

2. **Timeline View**: Evolution of a single forecast
   ```
   Will ASTS reach $20 by end of 2026?
   
   ─── v1: 40% (Jan 15) ───
       Base rate: 15% (small cap satellite companies)
       Drivers: Technical (80%), Market (50%), Regulatory (60%)
       Research: Market TAM ($2.5B), Sentiment (0.45)
       
   ─── v2: 35% (Jan 28) ───
       Updated: Market driver 50% → 40%
       New evidence: Q4 earnings miss
       Research: Financial fundamentals (updated)
       
   ─── v3: 38% (Feb 5) ───
       Updated: Technical driver 80% → 85%
       New evidence: Successful satellite deployment
   ```

3. **Driver Evolution View**: How drivers changed
   ```
   Driver: Technical Feasibility
   
   Jan 15: 80% ─────────────────────
            Evidence: Initial deployment plan
            Research: Technology validation
            
   Jan 28: 80% ─────────────────────
            (No change)
            
   Feb 5:  85% ──────────────────────
            +Evidence: Successful test launch
            +Research: Expert consensus (updated)
   ```

4. **Research Timeline**: What you knew when
   ```
   Research for "ASTS $20" forecast
   
   [Jan 15] Market TAM Sizing
            $2.5B addressable market
            Cost: $0.05
            
   [Jan 18] Sentiment Tracking
            Score: 0.45 (neutral-positive)
            Cost: $0.03
            
   [Jan 28] Financial Fundamentals
            Q4 earnings: -15% miss
            Cost: $0.06
            
   [Feb 5] Expert Consensus
            8/10 analysts bullish
            Cost: $0.04
   ```

---

### 4. Research Agent Management
**Manage agents and their costs**

#### Agent Dashboard
```
Research Agents
─────────────────────────────────
Total spent this month: $2.45

[Market TAM Sizing]
Usage: 5 runs | Avg cost: $0.05 | Total: $0.25
Last run: 2 days ago
Scheduled: Weekly for "EV Market"

[Sentiment Monitor]  
Usage: 12 runs | Avg cost: $0.03 | Total: $0.36
Last run: 1 hour ago
Scheduled: Daily for "Tesla", "ASTS"

[Financial Analyst]
Usage: 8 runs | Avg cost: $0.06 | Total: $0.48
Last run: 5 days ago
Scheduled: None

[View All 10 Agents →]

─────────────────────────────────
Scheduled Research (3 active)

Daily @ 9:00 AM
  • Sentiment tracking: Tesla
  • User growth signals: OpenAI
  
Weekly @ Monday 9:00 AM
  • Market TAM: EV Market
  
[Add New Schedule →]

─────────────────────────────────
Cost Breakdown

This week:  $0.68  ▲ 12%
This month: $2.45  ▼ 5%
All time:   $18.30

[View Detailed Analytics →]
```

#### Individual Agent View
```
Sentiment Monitor
─────────────────────────────────
Monitor public sentiment across platforms

Recent Runs (5)
─────────────────────────────────
Feb 5, 9:00 AM - Tesla
Result: 0.52 (positive)
Cost: $0.03
Attached to: "ASTS $20" driver 2

Feb 4, 9:00 AM - Tesla  
Result: 0.48 (neutral)
Cost: $0.03
Attached to: "ASTS $20" driver 2

[View All Runs →]

─────────────────────────────────
Schedules
─────────────────────────────────
Daily @ 9:00 AM
  • Tesla (active)
  • OpenAI (active)
  
[Add New Schedule →]

─────────────────────────────────
Quick Run
─────────────────────────────────
Company/Product: [_______________]
Time Period:     [_______________]

[Run Now - ~$0.03]
```

---

### 5. AI Coach & Sounding Board
**Agent to help create drivers**

#### Coach Interactions
```typescript
interface CoachMessage {
  role: 'user' | 'coach';
  content: string;
  suggestions?: {
    type: 'driver' | 'research' | 'evidence';
    data: any;
  }[];
  timestamp: Date;
}

// Example conversation
Coach: "You're forecasting SpaceX Mars landing by 2030. 
        Let's decompose this. What are the key drivers?"
        
User: "Technical capability and funding"

Coach: "Good start! Technical capability is broad. 
        Can we break it down further?"
        
        💡 Suggested drivers:
        • Rocket reliability (Starship success rate)
        • Life support systems readiness
        • Landing technology validation
        
        [Use These] [Keep Brainstorming]

User: [Taps "Use These"]

Coach: "Great! I've added 3 technical drivers. 
        Now let's quantify them. For 'Rocket reliability',
        what's your 90% confidence interval?"
        
        📊 Research available:
        • SpaceX launch history
        • Expert opinions on Starship
        
        [Run Research] [Enter Manually]
```

#### Coach Triggers
- **New forecast**: "Let's break this down..."
- **Adding driver**: "How confident are you? Let me suggest research..."
- **Low confidence**: "I notice low confidence. Want to run research?"
- **Conflicting evidence**: "I see conflicting evidence. Let's discuss..."
- **Before simulation**: "Ready to simulate? Let me review your drivers..."

---

### 6. Brier Score Tamagotchi
**Gamified performance tracking**

#### Tamagotchi States
```typescript
interface TamagotchiForecast {
  // Visual representation
  mood: 'excellent' | 'good' | 'okay' | 'poor' | 'critical';
  health: number;        // 0-100 (based on Brier score)
  level: number;         // Increases with forecasts
  
  // Stats
  totalForecasts: number;
  resolvedForecasts: number;
  averageBrierScore: number;
  
  // Recent performance
  lastWeekBrier: number;
  lastMonthBrier: number;
  trend: 'improving' | 'stable' | 'declining';
  
  // Achievements
  achievements: Achievement[];
  streak: number;        // Days with forecast activity
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt?: Date;
  progress?: number;     // 0-1 for partial achievements
}

// Examples
achievements = [
  {
    id: 'first_forecast',
    name: 'First Steps',
    description: 'Create your first forecast',
    unlockedAt: '2026-01-15'
  },
  {
    id: 'brier_master',
    name: 'Brier Master',
    description: 'Achieve Brier score < 0.10',
    progress: 0.75  // 0.12 current, need 0.10
  },
  {
    id: 'research_ninja',
    name: 'Research Ninja',
    description: 'Run 50 research agents',
    progress: 0.24  // 12/50
  },
  {
    id: 'super_forecaster',
    name: 'Superforecaster',
    description: 'Maintain Brier < 0.15 for 20 forecasts',
    progress: 0.4   // 8/20
  }
]
```

#### Visual Design
```
┌─────────────────────────┐
│     YOUR FORECASTER     │
│                         │
│         (◕‿◕)          │  [Excellent mood]
│        /│ │\           │  Health: 92/100
│         / \             │  Level: 5
│                         │
│  ▓▓▓▓▓▓▓▓▓░ 92%        │
│                         │
│  Brier Score: 0.08 ✨  │
│  Trend: ↗ Improving     │
│                         │
│  Streak: 🔥 12 days     │
└─────────────────────────┘

Recent Achievements
─────────────────────────
🏆 Brier Master (unlocked!)
   Achieved Brier < 0.10

⏳ Superforecaster (8/20)
   80% progress

[View All Achievements →]
```

#### Mood Based on Brier
- **0.00-0.10**: Excellent 😄 (Superforecaster level!)
- **0.11-0.20**: Good 😊 (Above average)
- **0.21-0.30**: Okay 😐 (Average)
- **0.31-0.40**: Poor 😟 (Need improvement)
- **0.41+**: Critical 😢 (Needs attention)

---

### 7. Leaderboard
**Compare with other forecasters**

#### Leaderboard View
```
Global Leaderboard
─────────────────────────────────
This Month

1. 🥇 SuperForecaster42
   Brier: 0.06 | 45 forecasts

2. 🥈 PredictionNinja
   Brier: 0.08 | 38 forecasts
   
3. 🥉 DataDriven99
   Brier: 0.09 | 52 forecasts
   
...

24. 📊 You
    Brier: 0.12 | 15 forecasts
    ▲ 5 (from last week)

[View Full Leaderboard →]

─────────────────────────────────
Domain Leaderboards

Finance: #12 (Brier: 0.10)
Technology: #8 (Brier: 0.11)
Weather: #45 (Brier: 0.15)

[View Domain Rankings →]

─────────────────────────────────
Friends (3)

1. Alice - Brier: 0.11
2. Bob - Brier: 0.14
3. You - Brier: 0.12

[Invite Friends →]
```

---

### 8. Simulation Management
**Track Monte Carlo outcomes and costs**

#### Simulation History
```
Simulations for "ASTS $20"
─────────────────────────────────
Feb 5, 2026 - Latest
Result: 38% probability
Iterations: 10,000
Runtime: 2.3s
Cost: $0.02

Outcome Distribution:
  P10: $12.50
  P50: $18.75
  P90: $24.30
  
Drivers used (v3):
  • Technical: 85%
  • Market: 40%
  • Regulatory: 60%

[View Details] [Run Again]

─────────────────────────────────
Jan 28, 2026
Result: 35% probability
Cost: $0.02
[View Details]

─────────────────────────────────
Jan 15, 2026
Result: 40% probability
Cost: $0.02
[View Details]

─────────────────────────────────
Total simulation cost: $0.06
```

---

## UI/UX Implementation Strategy

### Navigation Architecture
```
Tab Bar (Bottom)
─────────────────────────────────
[Forecasts] [Research] [Me]
    🎯         🔬        👤

Forecasts Tab:
  → Forecast List
  → Forecast Detail (Notion blocks)
  → Forecast Timeline

Research Tab:
  → Agent Dashboard  
  → Agent Detail
  → Schedule Management

Me Tab:
  → Tamagotchi Dashboard
  → Leaderboard
  → Settings
```

### Key Screens

1. **Forecast Detail** (Notion-style)
   - Dynamic block system
   - Inline editing
   - Chat mode toggle
   - Drag-to-reorder

2. **Timeline View**
   - Vertical timeline
   - Version comparison
   - Evidence/research attached to moments

3. **Agent Dashboard**
   - Card-based layout
   - Usage stats
   - Quick actions

4. **Tamagotchi**
   - Animated character
   - Achievement showcase
   - Progress rings

5. **Leaderboard**
   - Ranked list
   - Filter by domain
   - Friend comparison

---

## Technology Stack Recommendations

### Frontend (React Native)
- **State Management**: Zustand or Redux Toolkit
- **Block System**: Custom component library
- **Chat UI**: React Native Gifted Chat (adapted)
- **Charts**: Victory Native or React Native Chart Kit
- **Animations**: Reanimated 2
- **Gestures**: React Native Gesture Handler

### Backend Additions Needed
- **Forecast CRUD**: Create, read, update, delete forecasts
- **Version Control**: Track forecast evolution
- **Simulation Service**: Monte Carlo execution
- **Brier Calculation**: Automated scoring
- **Leaderboard**: Aggregation and ranking
- **Cost Tracking**: Usage and billing

---

## MVP Prioritization

### Phase 1: Core Forecasting ✅ (Backend done)
- [x] Research agents
- [x] Prompt templates
- [x] LLM integration

### Phase 2A: Basic Forecast Creation (Next)
- [ ] Universal forecast data model
- [ ] Simple form-based creation
- [ ] Driver input
- [ ] Evidence attachment
- [ ] Basic forecast list

### Phase 2B: Notion Blocks
- [ ] Block system architecture
- [ ] Driver blocks
- [ ] Evidence blocks
- [ ] Editable/draggable

### Phase 2C: AI Coach
- [ ] Chat interface
- [ ] Context-aware suggestions
- [ ] Research triggers

### Phase 3: History & Evolution
- [ ] Version tracking
- [ ] Timeline view
- [ ] Driver evolution
- [ ] Research snapshots

### Phase 4: Gamification
- [ ] Brier calculation
- [ ] Tamagotchi system
- [ ] Achievements
- [ ] Leaderboard

### Phase 5: Advanced
- [ ] Simulation management
- [ ] Cost tracking dashboard
- [ ] Portfolio management
- [ ] Prediction market integration

---

Is this comprehensive enough to start? Which phase should we tackle first?
