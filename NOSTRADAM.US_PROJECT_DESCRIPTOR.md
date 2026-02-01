# Nostradam.us
## AI-Powered Collaborative Forecasting Platform

**Tagline:** *Make better decisions by seeing the future more clearly*

---

## Vision

Nostradam.us transforms forecasting from an academic exercise into an essential tool for decision-making. By combining rigorous probabilistic modeling with AI-powered guidance, we make structured forecasting accessible to anyone making consequential decisions under uncertainty.

---

## The Problem

**Decision-makers are flying blind:**
- Executives make strategic bets based on intuition and spreadsheets
- Investors evaluate opportunities with biased mental models
- Product teams launch features without rigorous impact modeling
- Consultants build scenarios but can't quantify uncertainty

**Existing tools fall short:**
- **Spreadsheets**: Ad-hoc, no structure, no calibration feedback
- **Academic forecasting platforms** (Metaculus, Good Judgment): High barrier to entry, designed for tournaments not decisions
- **Prediction markets** (Manifold, Kalshi): Entertainment-focused or regulated, not decision tools
- **BI/Analytics tools** (Tableau, Mode): Backward-looking, not forward-looking

**What's missing:** A tool that makes forecasting feel natural, provides AI guidance, tracks what you learned, and enables teams to forecast together.

---

## The Solution

Nostradam.us is a **forecasting platform that thinks with you**:

### Core Philosophy
1. **Decomposition over guessing**: Break complex questions into drivers (market size, conversion rate, competitive dynamics)
2. **Probabilistic over point estimates**: Model uncertainty with distributions (triangular, normal, lognormal)
3. **Evidence over intuition**: Research agents gather data, track sources, version changes
4. **Collaboration over isolation**: Teams forecast together, surface assumptions, aggregate views
5. **Learning over prediction**: Track calibration, review outcomes, improve over time

### Key Innovation: The Coach Agent
An AI forecasting assistant that:
- Suggests drivers you're missing ("Have you considered regulatory risk?")
- Catches cognitive biases ("This estimate seems anchored - try Fermi decomposition")
- Recommends research ("Run the competitive_intel agent to validate market share assumptions")
- Provides calibration feedback ("Your p95 values tend to be too conservative")
- Learns your forecasting style and adapts guidance

### Technical Approach
**Driver-Based Monte Carlo Simulation:**
- Decompose complex questions into measurable drivers
- Model each driver with appropriate distribution (triangular for bounded estimates, lognormal for growth)
- Run 10,000+ Monte Carlo simulations to generate outcome probabilities
- Version control every change with full audit trail

**AI Research Agents:**
- Modular agents (competitive_intel, market_researcher, sentiment_monitor, etc.)
- Plug into MCP (Model Context Protocol) for extensibility
- Gather evidence automatically, attach to drivers
- Schedule updates (daily/weekly/on-demand)

**Evidence System:**
- Every driver backed by research or reasoning
- Research results formatted as readable summaries (not raw JSON)
- Export full data for deep analysis
- Track source credibility and recency

---

## Product Experience

### For Solo Forecasters
**"Will ASTS reach $20/share by Dec 2026?"**

1. **Ask your question** in natural language
2. **Coach suggests structure**: External view (reference class), drivers (TAM, execution, competition)
3. **Configure each driver**:
   - "TAM for space connectivity": Lognormal, p5=$500M, p50=$2B, p95=$10B
   - "Execution probability": Binary, 65% (based on pre-mortem analysis)
4. **Run research agents**: @market_researcher gathers TAM estimates, @competitive_intel tracks Starlink
5. **See simulation results**: 42% probability, view distribution histogram
6. **Version tracking**: Make changes, see how forecast evolved over time
7. **Review later**: Compare prediction vs outcome, calibrate future forecasts

### For Teams
**Investment committee evaluating two deals:**

1. **Each member forecasts independently** (avoid groupthink)
2. **Compare forecasts side-by-side**:
   - "Sarah's TAM estimate: $1B vs John's: $5B" - Why the difference?
   - Driver overlap: Both model execution risk, but Sarah adds regulatory driver
3. **Aggregate views**: Simple average, extremizing, or Bayesian aggregation
4. **Surface assumptions**: "John assumes 40% conversion, Sarah assumes 10%"
5. **Collaborative refinement**: Add evidence, update drivers, re-run simulations
6. **Decision with confidence**: "We forecast 35% success probability (team median), proceed with $500K investment"

### For Organizations
**Portfolio view across all forecasts:**

1. **Track calibration**: Are your forecasts well-calibrated over time?
2. **Identify patterns**: Which domains/team members are most accurate?
3. **Correlations**: Which forecasts are linked? (If A fails, B likely fails too)
4. **Decision log**: Review past forecasts, learn from outcomes
5. **Institutional memory**: Don't lose reasoning when team members leave

---

## Target Users

### Phase 1: Early Adopters
**Profile:** Quantitatively-minded decision-makers who already think probabilistically

1. **Venture Capitalists & Angel Investors**
   - **Pain**: Evaluating 100+ deals/year, need structured diligence
   - **Use Case**: "Compare Series A opportunities in same sector"
   - **Value**: Better portfolio construction, defensible pass/invest decisions

2. **Product Managers & Founders**
   - **Pain**: Launch decisions based on gut feel, post-mortems reveal bad assumptions
   - **Use Case**: "Should we build feature X? Model adoption drivers"
   - **Value**: Data-driven roadmap prioritization, stakeholder alignment

3. **Strategy Consultants**
   - **Pain**: Building scenarios in PowerPoint/Excel, no uncertainty quantification
   - **Use Case**: "Client market entry decision - model 3 scenarios"
   - **Value**: Rigorous deliverables, faster scenario modeling, IP creation

### Phase 2: Mainstream (Post-Coach Agent)
4. **Executives & Business Leaders**
   - Lower learning curve with AI guidance
   - Strategic decisions (M&A, market entry, pricing)

5. **Analysts & Researchers**
   - Market research, competitive intelligence
   - Sector reports with quantified uncertainty

### Phase 3: Mass Market (Post-Collaboration)
6. **Teams & Organizations**
   - Any group making consequential decisions together
   - Sales forecasting, hiring plans, budget allocation

---

## Business Model

### Freemium SaaS

**Free Tier:**
- Unlimited public forecasts
- Basic research agents (3 types)
- Solo forecasting only
- Community features (view others' public forecasts)
- Export JSON

**Pro ($20/month):**
- Unlimited private forecasts
- Advanced research agents (10+ types)
- Custom MCP agent integrations
- Full version history (90 days)
- Priority support
- Export to CSV/Markdown

**Team ($49/user/month):**
- Everything in Pro
- Collaborative forecasting (5+ users)
- Forecast comparison & aggregation
- Portfolio dashboard
- Admin controls (permissions, SSO)
- Version history (unlimited)
- White-label reports

**Enterprise (Custom pricing):**
- Everything in Team
- On-premise deployment option
- Custom agent development
- SLA guarantees
- Dedicated customer success
- API access for integrations
- Advanced security & compliance

### Additional Revenue Streams

**Agent Marketplace (Future):**
- Community-built research agents
- 80/20 revenue split (creator/platform)
- Example: "Crypto market sentiment agent" by specialist

**Data & Insights (Future):**
- Aggregated forecast data (anonymized)
- Sector reports ("What are VCs forecasting for AI startups?")
- Sell to hedge funds, research firms, consultants

**Professional Services (Future):**
- Forecasting training & workshops
- Custom agent development for enterprises
- Strategic consulting using platform

---

## Competitive Positioning

### vs. Prediction Markets (Manifold, Kalshi, Polymarket)
- **Their strength**: Crowdsourced wisdom, entertainment value
- **Their weakness**: Designed for gambling/trading, not decision-making
- **Our edge**: Structured decomposition, evidence tracking, private/team use

### vs. Forecasting Platforms (Metaculus, Good Judgment)
- **Their strength**: Track record, academic rigor, community
- **Their weakness**: Tournament-focused, high barrier to entry, no team features
- **Our edge**: AI guidance (coach agent), collaborative, decision-oriented

### vs. BI/Analytics Tools (Tableau, Mode, Looker)
- **Their strength**: Established in enterprises, backward-looking analysis
- **Their weakness**: Not designed for forward-looking forecasts, no uncertainty modeling
- **Our edge**: Forward-looking, probabilistic, forecasting-native

### vs. Spreadsheets (Excel, Google Sheets)
- **Their strength**: Universal, flexible, familiar
- **Their weakness**: Ad-hoc, no structure, no calibration, no collaboration
- **Our edge**: Structured methodology, AI guidance, evidence tracking, version control

### vs. Consultancies (McKinsey, Bain, BCG)
- **Their strength**: Credibility, strategic frameworks, client relationships
- **Their weakness**: Expensive ($500K+ projects), slow, not software
- **Our edge**: Self-service, real-time, 100x cheaper, learn over time

**Positioning Statement:**
*"Nostradam.us is the decision intelligence platform that combines the rigor of Good Judgment, the accessibility of ChatGPT, and the collaboration of Figma - purpose-built for teams making high-stakes decisions under uncertainty."*

---

## Technology Stack

**Frontend:**
- React Native (Expo) - Cross-platform web/mobile
- TypeScript for type safety
- CLI-style interface (command-driven UX)
- Real-time collaboration (WebSockets, future)

**Backend:**
- Vercel serverless functions (Node.js)
- PostgreSQL (Supabase) for data persistence
- Claude API (Anthropic) for AI coach & agent orchestration
- MCP (Model Context Protocol) for agent extensibility

**AI/ML:**
- Monte Carlo simulation engine (custom, TypeScript)
- Driver analysis (Claude Sonnet 4)
- Research agents (Claude + web scraping + APIs)
- Calibration tracking (custom algorithms)

**Infrastructure:**
- Vercel (hosting & edge functions)
- GitHub (version control & CI/CD)
- Supabase (database, auth, real-time)
- Cloudflare (CDN, DDoS protection)

---

## Roadmap Summary

**v1.0 (Current):** Solo forecasting with research agents
**v1.1 (1 month):** Version tracking, forecast comparison, Fermi context
**v1.5 (3 months):** Coach agent (AI guidance system)
**v2.0 (6 months):** User accounts, collaboration, private/public forecasts
**v2.5 (9 months):** MCP agent marketplace, portfolio dashboard
**v3.0 (12 months):** CLI client, forecast-as-code, prediction markets (optional)

---

## Go-to-Market Strategy

### Phase 1: Community Building (Months 1-3)
**Goal:** 100 active users, 500+ public forecasts

1. **Content Marketing:**
   - Blog: "How to forecast [your domain] with Fermi estimation"
   - Twitter: Daily forecasting tips, examples, results
   - YouTube: "Forecast walkthrough" tutorials

2. **Influencer Seeding:**
   - Target: VCs with public Twitter presence (Packy McCormick, Patrick OShaughnessy)
   - Offer: Early access, custom agents for their domains
   - Ask: Tweet results, provide feedback

3. **Community Forecasting:**
   - Weekly question: "Will [topical event] happen?"
   - Leaderboard: Best calibrated forecasters
   - Showcase: Feature best forecasts on homepage

### Phase 2: Vertical Penetration (Months 4-9)
**Goal:** 50 paying teams (1 vertical), $25K MRR

1. **Pick One Vertical:** Venture Capital
   - **Why**: Quantitative, make frequent decisions, have budgets
   - **Offer**: "Compare your deal flow forecasts in one place"
   - **Pricing**: $49/user/month (5-user team = $245/month)

2. **Vertical GTM:**
   - **Partnerships**: YC, a16z batch programs
   - **Events**: Speak at VC conferences (VC Summit, SaaStr)
   - **Case Studies**: "How [Firm] uses Nostradam.us for diligence"
   - **Network Effects**: VCs share forecasts with founders → founders adopt

3. **Sales Motion:**
   - Self-serve signup (free tier)
   - Usage triggers (10+ forecasts → team invite prompt)
   - Founder-led sales (outreach to power users)
   - PLG → Sales hybrid

### Phase 3: Expansion (Months 10-18)
**Goal:** 500 teams (3 verticals), $250K MRR

1. **Add Verticals:**
   - **Product Teams**: "Roadmap forecasting for PMs"
   - **Consultants**: "Client scenario modeling"

2. **Enterprise Motion:**
   - Outbound to F500 strategy teams
   - Annual contracts ($50K-250K)
   - Dedicated customer success

3. **Platform Effects:**
   - Agent marketplace launches
   - Community-built content (templates, agents)
   - Network effects from collaboration

---

## Fundraising Strategy

### Bootstrap → Angel → Series A

**Bootstrap Phase (Current - Month 6):**
- Self-funded or very small friends/family ($50K)
- Goal: Prove solo value, ship coach agent
- Milestone: 100 active users, strong retention

**Angel Round (Month 6-9, $500K @ $3M pre):**
- **Target investors**: Operators who understand forecasting
  - Sarah Guo (Conviction), Elad Gil (solo), Patrick OShaughnessy (OSV)
  - Angels from Metaculus, Good Judgment, or quant hedge funds
- **Use of funds**:
  - $200K: Eng/design contractor (6 months)
  - $150K: Go-to-market (content, events, ads)
  - $100K: Infrastructure & AI costs
  - $50K: Buffer
- **Milestone**: 50 paying teams, $25K MRR, clear PMF signal

**Series A (Month 18, $3M @ $12M pre):**
- **Target investors**: B2B SaaS specialists
  - Unusual Ventures, Point Nine, Bessemer (micro-fund)
- **Use of funds**:
  - $1.5M: Team (5-7 people: eng, product, sales, marketing)
  - $1M: Go-to-market (scale what works)
  - $500K: Infrastructure & runway
- **Milestone**: $250K MRR, 500 teams, expanding to 2nd/3rd vertical

---

## Team & Roles (18-Month Vision)

### Founding Team (Current)
- **Founder/CEO**: Vision, product, early eng, fundraising
- **(Need) Co-Founder/CTO**: Platform architecture, AI systems, eng leadership

### Month 6 (Post-Angel)
- **Senior Engineer**: Full-stack, owns collaboration features
- **Product Designer**: UX/UI, coach agent interaction design
- **Part-time Marketer**: Content, community, social

### Month 12 (Pre-Series A)
- **Head of Growth**: GTM strategy, partnerships, vertical expansion
- **Customer Success**: Onboarding, training, retention
- **Additional Engineer**: Agents/integrations specialist

### Month 18 (Post-Series A)
- **VP Engineering**: Team lead, architecture, hiring
- **VP Sales**: Enterprise motion, contracts, expansion
- **Data Scientist**: Calibration algorithms, ML features
- **Additional roles**: QA, DevOps, CSM

---

## Key Risks & Mitigations

### Risk 1: User Acquisition
**Problem:** Forecasting is not intuitive, steep learning curve
**Mitigation:**
- Coach agent lowers barrier (AI teaches you)
- Start with quantitative early adopters (VCs, PMs)
- Content marketing establishes authority
- Free tier removes friction

### Risk 2: Retention
**Problem:** Users try it once, don't return
**Mitigation:**
- Version tracking creates "return to review" loop
- Collaboration makes it sticky (team dependency)
- Scheduled agents create notification hooks
- Portfolio view requires regular check-ins

### Risk 3: Monetization
**Problem:** Free tier is "good enough," users don't convert
**Mitigation:**
- Private forecasts are essential for sensitive decisions (clear value)
- Collaboration requires paid plan (team adoption → lock-in)
- Agent marketplace creates FOMO (power users want custom agents)
- Data limits on free tier (e.g., 10 forecasts/month)

### Risk 4: AI Costs
**Problem:** Claude API costs eat margins
**Mitigation:**
- Cache common prompts (driver analysis)
- Hybrid: GPT-4o for research, Claude for coach (cost optimization)
- Agent runs are async (batch processing)
- Enterprise pricing includes compute buffer

### Risk 5: Competition
**Problem:** Metaculus or Manifold add team features
**Mitigation:**
- Coach agent is differentiated (they're community-focused)
- Version tracking + evidence system = switching cost
- MCP extensibility = ecosystem moat
- Enterprise features (SSO, on-prem) = barrier to entry

### Risk 6: Regulatory (if Markets)
**Problem:** Prediction markets face regulatory scrutiny
**Mitigation:**
- Markets are Phase 5 (optional)
- Core value is forecasting tool, not trading platform
- Can succeed without markets (focus on B2B SaaS)

---

## Success Metrics

### Product Metrics
- **Retention**: 40%+ weekly active users (solo forecasters)
- **Engagement**: 3+ forecasts/user/month
- **Quality**: Brier score improves over time (users get better)
- **Collaboration**: 60%+ of teams have 3+ active members

### Business Metrics
- **Conversion**: 10%+ free → paid conversion (strong signal)
- **ARR**: $250K by Month 18 (Series A threshold)
- **Churn**: <5% monthly (teams stick once adopted)
- **NPS**: >50 (users love it or don't use it - bimodal OK for early stage)

### North Star Metric
**"Forecasts that influenced a real decision"**
- Survey users: Did this forecast change your decision?
- Track: 40%+ of active users say "yes"
- This is the ultimate product-market fit signal

---

## Why Now?

### Technological Enablers
1. **LLMs (Claude, GPT-4)**: Make AI coaching feasible (wasn't possible 2 years ago)
2. **MCP Protocol**: Standardized way to build agent ecosystems (2024 innovation)
3. **Real-time collab tech**: Mature (Figma, Notion proved the UX)

### Market Conditions
1. **AI hype → AI utility**: Businesses want AI tools that work, not chatbots
2. **Remote work**: Teams need async decision tools (can't huddle in conference room)
3. **Economic uncertainty**: Forecasting becomes critical in volatile markets

### Cultural Shift
1. **Probabilistic thinking**: Going mainstream (Nate Silver, Tetlock, EA community)
2. **Data-driven decisions**: Expected, not optional
3. **Transparency**: Teams want to show their work (not just gut calls)

---

## Why This Will Win

### The Bet
**Forecasting is a skill, not just a tool.**

Most platforms treat forecasting as:
- A game (prediction markets)
- A dataset (analytics tools)
- A one-time exercise (consultants)

Nostradam.us treats forecasting as:
- **A practice you get better at** (calibration feedback)
- **A collaborative activity** (teams forecast together)
- **A living document** (version control, updates)
- **An AI-assisted skill** (coach makes you better)

If we're right that **structured forecasting becomes a core business skill** (like financial modeling or data analysis), then Nostradam.us becomes the platform where that skill is learned and practiced.

### The Moat
1. **Data network effects**: More forecasts → better calibration → better coaching
2. **Switching costs**: Version history, evidence, integrations (lock-in)
3. **Ecosystem**: MCP agents, templates, community content
4. **Brand**: "The forecasting platform" (category creation)

### The Vision (5 Years Out)
> "Every consequential decision at every company starts with a Nostradam.us forecast.
> 
> VCs forecast deals. PMs forecast launches. Execs forecast strategies.
> 
> Forecasting becomes as fundamental as spreadsheets.
> 
> And when decisions are made, everyone knows the odds."

---

## Contact & Next Steps

**Project Status:** Alpha (v1.0 functional, seeking early users)

**Looking For:**
- Early adopters (VCs, PMs, consultants) to test & provide feedback
- Technical co-founder (CTO) with interest in forecasting/decision science
- Angel investors familiar with forecasting or B2B SaaS

**Resources:**
- Demo: [uffpmobile.vercel.app](https://uffpmobile.vercel.app)
- Roadmap: See `ROADMAP.md` in repo
- Version tracking doc: See `VERSION_TRACKING_WORKFLOW.md`

**Get Involved:**
- Email: [founder email]
- Twitter: [@nostradam_us](https://twitter.com/nostradam_us) (placeholder)
- GitHub: [Replicant-Partners/uffp_mobile](https://github.com/Replicant-Partners/uffp_mobile)

---

*Last Updated: February 2026*
*Version: 1.0 (Project Descriptor)*

---

## Appendix: Sample Forecast

**Question:** "Will ASTS (AST SpaceMobile) reach $20/share by December 31, 2026?"

**External View:** Small-cap space technology stocks reaching price targets within 2 years (base rate: ~35%)

**Drivers:**
1. **TAM for space connectivity** (Continuous, Lognormal)
   - p5: $500M, p50: $2B, p95: $10B
   - Direction: Increases
   - Evidence: @market_researcher TAM analysis (3 sources)

2. **Execution probability** (Binary, 65%)
   - Direction: Increases
   - Evidence: @competitive_intel tracks milestones vs Starlink

3. **Regulatory approval** (Binary, 75%)
   - Direction: Increases
   - Evidence: Manual - "FCC already granted experimental licenses"

4. **Funding risk** (Continuous, Triangular)
   - p5: $100M, p50: $300M, p95: $800M (capital needs)
   - Direction: Decreases (higher funding need = lower probability)
   - Evidence: @financial_analyst cash burn analysis

**Simulation Result:** 42% probability (10,000 iterations)

**Version History:**
- v1.0: Initial forecast (38%)
- v1.1: Updated TAM based on Starlink data (40%)
- v2.0: Added regulatory driver (42%) ← Current

**Decision:** "42% is above our 40% threshold → Proceed with $50K investment. Review in Q2 2026."

---

**This is Nostradam.us.**
