# Agent-First Forecasting System Guide

## Overview

This forecasting system uses **AI research agents** as the primary method for building evidence-based forecasts. Instead of manually gathering research, you select prompt templates that dispatch specialized agents to gather evidence for your forecast drivers.

---

## Core Workflow

### 1. Create a Forecast
- Navigate to "Create Forecast" from the home screen
- Enter basic forecast information (name, ticker, target date)

### 2. Define Drivers
Drivers are the key variables that determine your forecast outcome. For each driver:
- **Name**: What variable are you modeling? (e.g., "Monthly Active Users", "Revenue per User")
- **Description**: Context about what this driver represents
- **Distribution Type**: How uncertain is this variable?
  - **Triangular**: Most common - when you know likely range with a most-likely middle value
  - **Normal**: When data clusters symmetrically around a mean (historical patterns)
  - **Uniform**: Rare - only when all values in range are equally likely
  - **Beta**: Advanced - for bounded variables with complex distributions

### 3. Use Research Agents (Primary Method)

Click **"🤖 Use Research Agent"** to open the prompt builder.

#### Step 1: Select a Template
Browse 10 pre-built research templates organized by category:

**Market Analysis**
- Total Addressable Market Sizing
- User Growth Signal Detection

**Competitor Research**
- Competitor Metric Benchmarking
- Competitive Pricing Intelligence

**Technical Validation**
- Technology Feasibility Assessment

**Sentiment Tracking**
- Brand/Product Sentiment Analysis

**Financial Data**
- Financial Fundamentals Deep Dive

**Expert Synthesis**
- Expert Opinion Synthesis
- Regulatory & Policy Monitoring

**Operational Signals**
- Company Hiring Trends Analysis

#### Step 2: Fill Variables
Each template has variables you need to provide:
- **COMPANY_NAME / COMPANY_TICKER**: Target company
- **PRODUCT_NAME**: Specific product/service
- **TIME_PERIOD**: Analysis timeframe
- **COMPETITORS**: List of competitors to analyze
- **TARGET_MARKET**: Geographic or demographic focus

The system provides hints and examples for each variable.

#### Step 3: Select Agent
Choose the best agent for your research task:

| Agent | Best For | Model | Temperature |
|-------|----------|-------|-------------|
| **Research Analyst** | Deep research with citations | Claude Opus | 0.3 |
| **Sentiment Monitor** | Social listening, brand perception | Claude Sonnet | 0.5 |
| **Competitive Intel** | Competitor tracking, market positioning | Claude Sonnet | 0.2 |
| **Financial Analyst** | Financial statement analysis, metrics | Claude Opus | 0.1 |
| **Market Researcher** | TAM sizing, market trends | Claude Sonnet | 0.3 |
| **Expert Synthesizer** | Synthesizing expert opinions | Claude Opus | 0.4 |

#### Step 4: Schedule (Optional)
For ongoing research needs, schedule the prompt to run automatically:
- **Daily**: Fast-moving metrics (social sentiment, stock price)
- **Weekly**: Regular updates (competitor analysis, hiring trends)
- **Monthly**: Slower-moving signals (regulatory changes, market size)

#### Step 5: Run Research
Click **"🚀 Run Research Now"** or **"📅 Schedule"** to dispatch the agent.

The agent will:
1. Execute the structured prompt
2. Gather relevant data from its knowledge base
3. Return findings formatted as Evidence

---

## Manual Evidence Entry (Fallback Method)

Click **"+ Add Evidence"** for manual research entry.

### Evidence Types
- **Research Paper**: Academic studies, white papers
- **Web Article**: News articles, blog posts, industry reports
- **Competitor Data**: Public filings, press releases, product announcements
- **Internal Data**: Your own analytics, experiments, customer data
- **Expert Opinion**: Advisor input, consultant reports, interviews
- **Sentiment Analysis**: Manual social media or review analysis

### Required Fields
- **Title**: Name of the evidence source
- **Source**: Where it came from (publication, URL, person)
- **Key Finding**: The specific insight relevant to your driver
- **Relevance**: High/Medium/Low - how directly this impacts your parameters

---

## Using Evidence to Set Parameters

Once you have evidence (from agents or manual entry):

1. **Review all evidence** for the driver
2. **Look for convergence** - do multiple sources suggest similar ranges?
3. **Set distribution parameters** based on evidence:
   - **Low**: Pessimistic scenario supported by evidence
   - **Mode/Mean**: Most likely outcome
   - **High**: Optimistic scenario supported by evidence

### Example
**Driver**: Monthly Active User Growth Rate

**Evidence gathered by agent**:
- Market Research Agent: "SaaS companies in this space typically see 5-15% MoM growth in year 2"
- Competitive Intel Agent: "Direct competitor X reported 8% MoM growth last quarter"
- Sentiment Monitor: "Brand sentiment trending positive, +12% increase in mentions"

**Parameters** (Triangular distribution):
- Low: 5% (conservative estimate from market research)
- Mode: 9% (slightly above competitor based on positive sentiment)
- High: 15% (upper bound from market research)

**Distribution Rationale**: "Using triangular distribution because we have clear market bounds (5-15%) with competitor data suggesting 8-9% is most likely. Positive sentiment supports optimistic lean."

---

## Distribution Selection Guide

### When to Use Triangular ✅ (Most Common)
- You know a realistic minimum and maximum
- You have a "most likely" value in between
- **Examples**: Market share estimates, pricing decisions, adoption rates

### When to Use Normal
- You have historical data showing symmetric variation
- Natural processes with random variation
- **Examples**: Manufacturing tolerances, customer lifetime value (with history)

### When to Use Uniform ⚠️ (Rare)
- You truly have NO information suggesting one value is more likely than another
- **Warning**: This is almost never appropriate - even weak evidence usually suggests some values are more likely

### When to Use Beta (Advanced)
- Complex bounded distributions with skew
- You need precise control over distribution shape
- **Examples**: Success probabilities, completion percentages

---

## Best Practices

### 1. Agent-First Workflow
- Start with agent research templates
- Use multiple agents for different perspectives
- Let agents do the heavy lifting of data gathering

### 2. Evidence Quality
- Prefer recent evidence (check dates)
- Seek multiple independent sources
- Mark relevance honestly (not all evidence is high-quality)

### 3. Scheduled Research
- Set up weekly updates for key drivers
- Review scheduled research results regularly
- Update parameters when new evidence changes outlook

### 4. Distribution Rationale
- Always document WHY you chose a distribution type
- Reference specific evidence in your rationale
- Explain any adjustments you made to agent-suggested ranges

### 5. Comparative Analysis
- Create multiple forecasts with different assumptions
- Use the Compare screen to see sensitivity
- Document which drivers create the most variance

---

## Understanding Results

### Forecast Detail View
- **P10/P50/P90**: 10th, 50th, 90th percentile outcomes
- **Mean**: Average across all Monte Carlo simulations
- **Probability Above Target**: Chance of exceeding your goal
- **Evidence**: All research supporting your driver parameters

### Compare View
- Side-by-side comparison of multiple forecasts
- Visual charts showing distribution differences
- Statistical comparison of outcomes

### Calibration Tracking
- Track your forecast accuracy over time
- Brier Score: Measures probability accuracy (lower is better)
- Calibration curves: Are your 70% predictions right 70% of the time?

---

## Next Steps

1. **Create your first forecast** with agent research
2. **Schedule recurring research** for dynamic drivers
3. **Compare scenarios** with different assumptions
4. **Track calibration** as forecasts resolve

The system is designed to make rigorous, evidence-based forecasting accessible through AI-assisted research workflows.
