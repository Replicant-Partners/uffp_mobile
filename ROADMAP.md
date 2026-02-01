# UFFP Mobile Roadmap

## Current Status (v1.0)
**Core forecasting engine functional with:**
- Question parsing and driver analysis
- Continuous (triangular/normal/lognormal) and binary drivers
- Monte Carlo simulation engine
- Research agents with evidence tracking
- Version tracking (driver-level complete)
- Tab autocomplete CLI interface
- Expandable evidence display with JSON export

---

## Phase 1: Core Features Completion (Next 2-4 weeks)

### 1.1 Forecast-Level Version Tracking
**Status:** Foundation complete, auto-increment pending
- [ ] Auto-increment forecast versions on changes
  - External view updates
  - Pre-mortem changes
  - Driver additions/removals
  - Major simulation changes
- [ ] Forecast /history command (similar to driver /history)
- [ ] Version comparison view
- [ ] Rollback capability

**Priority:** HIGH - Completes version tracking system
**Effort:** 2-3 days

### 1.2 Override Warnings in UI
**Status:** Currently console-only
- [ ] Surface AI override warnings in warning banner
- [ ] Show when user changes conflict with AI recommendations
- [ ] Explain impact of overrides

**Priority:** MEDIUM
**Effort:** 1 day

### 1.3 Fermi Estimation Context for Drivers
**Status:** Not started
- [ ] Enrich driver suggestions with Fermi decomposition hints
- [ ] Show relevant order-of-magnitude anchors
- [ ] Provide calibration examples
- [ ] Add "sanity check" bounds

**Priority:** HIGH - Improves forecasting quality
**Effort:** 3-4 days

---

## Phase 2: Coach Agent (4-6 weeks)

### 2.1 Intelligent Forecasting Assistant
- [ ] Context-aware coaching during forecast creation
  - Suggests missing drivers
  - Identifies biases (anchoring, overconfidence)
  - Recommends research agents
- [ ] Fermi estimation guidance
  - Break down complex estimates
  - Suggest decomposition strategies
  - Provide calibration exercises
- [ ] Post-forecast review
  - Analyze driver coverage
  - Check for correlation issues
  - Suggest evidence gathering
- [ ] Learning mode
  - Track user calibration over time
  - Personalized coaching based on patterns
  - Suggest training forecasts

**Priority:** HIGH - Major UX differentiator
**Effort:** 2-3 weeks
**Dependencies:** Fermi context feature

---

## Phase 3: User & Account Management (6-8 weeks)

### 3.1 Authentication & Profiles
- [ ] User registration/login (email + OAuth)
- [ ] User profiles with stats
  - Forecast count
  - Calibration score
  - Brier score history
  - Specialization tags
- [ ] Settings & preferences
  - Default distributions
  - Notification preferences
  - Coach agent personality

**Priority:** HIGH - Required for multi-user features
**Effort:** 1 week

### 3.2 Private/Public Forecasts
- [ ] Privacy levels
  - Private (only you)
  - Unlisted (link sharing)
  - Public (discoverable)
  - Organization (team-only)
- [ ] Forecast discovery feed
- [ ] Search & filtering
- [ ] Leaderboard (already started)

**Priority:** MEDIUM
**Effort:** 1 week
**Dependencies:** User accounts

### 3.3 Collaborative Forecasting
- [ ] Multi-user forecasts
  - Shared ownership
  - Driver contributions tracked
  - Evidence additions by team
- [ ] Commenting & discussion
- [ ] Aggregation methods
  - Simple averaging
  - Extremizing
  - Bayesian aggregation
- [ ] Team management
  - Invite collaborators
  - Role-based permissions
  - Activity feed

**Priority:** MEDIUM - Powerful for teams
**Effort:** 2-3 weeks
**Dependencies:** User accounts, private/public forecasts

---

## Phase 4: Agent System Extensions (8-12 weeks)

### 4.1 MCP (Model Context Protocol) Configuration
- [ ] Plugin architecture for custom agents
- [ ] MCP server integration
  - Connect to external data sources
  - Custom research workflows
  - Domain-specific tools
- [ ] Agent marketplace
  - Browse community agents
  - Install/configure agents
  - Rate & review
- [ ] Agent templates
  - Financial data agents
  - Web scraping agents
  - Academic research agents
  - Social listening agents

**Priority:** MEDIUM - Extensibility
**Effort:** 3-4 weeks
**Dependencies:** None (can start anytime)

### 4.2 Advanced Agent Features
- [ ] Scheduled agent runs
- [ ] Agent chaining (output → input)
- [ ] Conditional execution
- [ ] Agent version control
- [ ] Evidence quality scoring
- [ ] Source credibility tracking

**Priority:** LOW
**Effort:** 2 weeks
**Dependencies:** MCP configuration

---

## Phase 5: Predictive Markets Integration (12-16 weeks)

### 5.1 Market Creation
- [ ] Convert forecasts to prediction markets
- [ ] Automated market maker (LMSR/CPMM)
- [ ] Virtual currency system
- [ ] Market parameters (liquidity, fees, duration)

**Priority:** LOW - Advanced feature
**Effort:** 3-4 weeks
**Dependencies:** User accounts, public forecasts

### 5.2 Trading Interface
- [ ] Order book display
- [ ] Buy/sell interface
- [ ] Portfolio tracking
- [ ] Trade history
- [ ] Market charts (price over time)

**Priority:** LOW
**Effort:** 2 weeks
**Dependencies:** Market creation

### 5.3 Market Resolution
- [ ] Evidence-based resolution
- [ ] Dispute mechanism
- [ ] Payout distribution
- [ ] Performance metrics

**Priority:** LOW
**Effort:** 1 week
**Dependencies:** Trading interface

---

## Phase 6: Portfolio Management (16-20 weeks)

### 6.1 Forecast Portfolio View
- [ ] Dashboard of all forecasts
- [ ] Aggregate metrics
  - Overall calibration
  - Brier score trends
  - Domain breakdown
- [ ] Forecast relationships
  - Correlated forecasts
  - Dependency graphs
  - Scenario planning
- [ ] Portfolio optimization
  - Diversification suggestions
  - Gap analysis
  - Resolution timeline

**Priority:** LOW - Power user feature
**Effort:** 2-3 weeks
**Dependencies:** User accounts

### 6.2 Prediction Market Portfolio
- [ ] Holdings dashboard
- [ ] P&L tracking
- [ ] Risk metrics
- [ ] Rebalancing tools
- [ ] Tax reporting (if real money)

**Priority:** LOW
**Effort:** 2 weeks
**Dependencies:** Predictive markets

---

## Phase 7: CLI Client (20-24 weeks)

### 7.1 Command-Line Interface
- [ ] Standalone CLI tool (Node.js/Python)
- [ ] Full forecast CRUD operations
- [ ] Agent execution from CLI
- [ ] Batch operations
- [ ] Scripting support
- [ ] ASCII charts/visualizations
- [ ] Export formats (JSON, CSV, MD)

**Priority:** LOW - Developer tool
**Effort:** 2-3 weeks
**Dependencies:** API stabilization

### 7.2 Advanced CLI Features
- [ ] Pipeline integration (CI/CD)
- [ ] Forecast templates/scaffolding
- [ ] Bulk import/export
- [ ] Git integration
  - Forecast versioning
  - Diff/merge forecasts
  - Forecast as code
- [ ] Watch mode (auto-refresh)

**Priority:** LOW
**Effort:** 1-2 weeks
**Dependencies:** Basic CLI

---

## Technical Debt & Infrastructure

### Ongoing
- [ ] Performance optimization
  - Mobile rendering (Android focus deferred)
  - Simulation caching
  - API response times
- [ ] Security audit
  - Input validation
  - XSS prevention
  - API rate limiting
- [ ] Testing
  - Unit tests for simulation engine
  - Integration tests for backend
  - E2E tests for critical flows
- [ ] Documentation
  - API docs
  - User guide
  - Developer docs
  - Video tutorials
- [ ] Dependency updates
  - Fix 19 security vulnerabilities
  - Update React Native
  - Update Expo SDK

---

## Metrics & Success Criteria

### Phase 1 Success Metrics
- Version tracking used in 80%+ of forecast edits
- Override warnings reduce AI conflicts by 50%
- Fermi hints improve driver estimate quality

### Phase 2 Success Metrics (Coach Agent)
- 70%+ of users engage with coach suggestions
- Calibration improves 20%+ with coach guidance
- User satisfaction score >4.5/5

### Phase 3 Success Metrics (User/Collab)
- 100+ registered users in first month
- 30% of forecasts are collaborative
- Public forecast discovery drives 40% of new forecasts

### Phase 5 Success Metrics (Markets)
- 50+ active markets
- $10K+ in virtual trading volume
- Market prices converge with outcomes 70%+ accuracy

---

## Architecture Notes

### Backend Requirements
- User authentication service
- Real-time collaboration (WebSockets)
- Market maker engine
- MCP plugin system
- CLI API layer

### Database Schema Evolution
- User tables
- Forecast permissions
- Market tables (orders, trades, positions)
- Agent plugins registry
- Collaboration history

### API Evolution
- RESTful → GraphQL (Phase 3)
- WebSocket events (Phase 3)
- MCP protocol (Phase 4)
- CLI API (Phase 7)

---

## Release Schedule (Tentative)

- **v1.1** (2 weeks) - Phase 1 complete
- **v1.5** (6 weeks) - Coach agent beta
- **v2.0** (12 weeks) - User accounts + collaboration
- **v2.5** (20 weeks) - MCP agents + markets
- **v3.0** (28 weeks) - Portfolio + CLI

---

## Not on Roadmap (Deferred/Out of Scope)

- Mobile native apps (iOS/Android) - Web-first strategy
- Real money markets - Legal complexity
- AI model training - Use existing APIs
- Custom simulation engines - Triangular/normal/lognormal sufficient
- Blockchain integration - No clear value add
- Social features (likes, follows) - Focus on forecasting quality

---

## Notes

- Roadmap is flexible based on user feedback
- Priorities may shift based on traction
- Coach agent could move earlier if high demand
- CLI could be promotional tool (launch sooner)
- Markets might require regulatory review
- Portfolio features target power users (10% of base)

---

**Last Updated:** 2026-02-01
**Current Focus:** Phase 1 - Core Features Completion
**Next Milestone:** v1.1 release with complete version tracking
