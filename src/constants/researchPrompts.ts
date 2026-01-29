export interface ResearchPromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'market_analysis' | 'competitor_research' | 'technical_validation' | 'sentiment_tracking' | 'financial_data' | 'expert_synthesis';
  evidenceType: 'research' | 'web_article' | 'competitor_data' | 'internal_data' | 'expert_opinion' | 'sentiment_analysis';
  promptTemplate: string;
  variables: string[]; // Variables to fill in the prompt
  schedulable: boolean; // Can this run on a schedule?
  frequency?: 'daily' | 'weekly' | 'monthly'; // Default frequency if schedulable
  outputFormat: 'summary' | 'structured_data' | 'time_series' | 'sentiment_score';
}

export const RESEARCH_PROMPT_TEMPLATES: ResearchPromptTemplate[] = [
  {
    id: 'market_tam_sizing',
    name: 'Total Addressable Market Sizing',
    description: 'Research market size, growth rate, and segmentation for TAM estimation',
    category: 'market_analysis',
    evidenceType: 'research',
    promptTemplate: `You are a market research analyst. Research the Total Addressable Market (TAM) for {MARKET_SEGMENT} in {GEOGRAPHY}.

SPECIFIC TASKS:
1. Find the current market size (in USD) from reputable sources (Gartner, IDC, Statista, McKinsey)
2. Identify historical growth rate (CAGR) over past 3-5 years
3. Project future growth rate for next 3-5 years
4. Break down by key segments or customer types
5. Identify any supply constraints or demand drivers

REQUIRED OUTPUT FORMAT:
- Current market size: $X billion
- Historical CAGR: Y%
- Projected CAGR: Z%
- Key segments with sizes
- Data sources with publication dates

Focus on recent data (2023-2026) and cite all sources.`,
    variables: ['MARKET_SEGMENT', 'GEOGRAPHY'],
    schedulable: true,
    frequency: 'monthly',
    outputFormat: 'structured_data',
  },

  {
    id: 'competitor_benchmarking',
    name: 'Competitor Metric Benchmarking',
    description: 'Track competitor KPIs (users, revenue, growth) for parameter estimation',
    category: 'competitor_research',
    evidenceType: 'competitor_data',
    promptTemplate: `You are a competitive intelligence analyst. Research {COMPETITOR_NAME}'s key business metrics.

SPECIFIC METRICS TO FIND:
1. User/customer count (if public or estimated)
2. Revenue (quarterly or annual)
3. Growth rate (QoQ or YoY)
4. ARPU or pricing information
5. Market share in {MARKET_SEGMENT}
6. Recent product launches or strategic changes

DATA SOURCES TO CHECK:
- SEC filings (10-K, 10-Q, 8-K)
- Earnings call transcripts
- Press releases
- Analyst reports (Seeking Alpha, TipRanks)
- SimilarWeb, Sensor Tower (for web/mobile traffic)

OUTPUT FORMAT:
- Metric name: Value (Source, Date)
- Calculation methodology if estimated
- Confidence level: High/Medium/Low
- Relevant quotes from sources

Prioritize official sources over estimates.`,
    variables: ['COMPETITOR_NAME', 'MARKET_SEGMENT'],
    schedulable: true,
    frequency: 'weekly',
    outputFormat: 'structured_data',
  },

  {
    id: 'technology_validation',
    name: 'Technology Feasibility Validation',
    description: 'Validate technical assumptions with research papers and expert opinions',
    category: 'technical_validation',
    evidenceType: 'research',
    promptTemplate: `You are a technology research specialist. Validate the technical feasibility of {TECHNOLOGY_CLAIM} for {USE_CASE}.

VALIDATION STEPS:
1. Find recent peer-reviewed research papers (2022-2026) on this technology
2. Identify successful commercial implementations
3. Document current state-of-the-art performance metrics
4. Assess technical maturity (TRL 1-9)
5. Identify known limitations or failure modes
6. Find expert commentary (IEEE, ACM, technical blogs)

CRITICAL ANALYSIS:
- Is this technology production-ready?
- What performance metrics are realistic vs aspirational?
- What are the key technical risks?
- Timeline to commercial viability if not yet mature

SOURCES TO PRIORITIZE:
- arXiv, IEEE Xplore, ACM Digital Library
- Nature, Science for breakthrough research
- Company engineering blogs
- Technical conference proceedings (NeurIPS, CVPR, etc.)

Provide balanced view: capabilities AND limitations.`,
    variables: ['TECHNOLOGY_CLAIM', 'USE_CASE'],
    schedulable: false,
    outputFormat: 'summary',
  },

  {
    id: 'sentiment_tracking',
    name: 'Brand/Product Sentiment Tracking',
    description: 'Monitor social media, reviews, and forums for sentiment trends',
    category: 'sentiment_tracking',
    evidenceType: 'sentiment_analysis',
    promptTemplate: `You are a social listening analyst. Track sentiment for {COMPANY_OR_PRODUCT} over the past {TIME_PERIOD}.

DATA SOURCES:
1. Twitter/X mentions and engagement
2. Reddit discussions (r/investing, r/{RELEVANT_SUBREDDIT})
3. Product Hunt, G2, Capterra reviews
4. Hacker News threads
5. YouTube comments on related videos
6. App Store / Play Store reviews

ANALYSIS FRAMEWORK:
- Overall sentiment: Positive/Neutral/Negative (with %)
- Sentiment trend: Improving/Stable/Declining
- Key themes in positive sentiment (what do people love?)
- Key themes in negative sentiment (what are complaints?)
- Volume trend: Is discussion increasing or decreasing?
- Influential voices: Any major influencers weighing in?

QUANTITATIVE METRICS:
- Sentiment score: -1.0 (very negative) to +1.0 (very positive)
- Volume: Number of mentions
- Engagement: Likes, shares, comments

Compare to previous {TIME_PERIOD} if possible.`,
    variables: ['COMPANY_OR_PRODUCT', 'TIME_PERIOD', 'RELEVANT_SUBREDDIT'],
    schedulable: true,
    frequency: 'daily',
    outputFormat: 'sentiment_score',
  },

  {
    id: 'financial_fundamentals',
    name: 'Financial Fundamentals Deep Dive',
    description: 'Extract and analyze financial metrics from official filings',
    category: 'financial_data',
    evidenceType: 'competitor_data',
    promptTemplate: `You are a financial analyst. Extract key financial metrics for {COMPANY_TICKER} from recent SEC filings.

TARGET DOCUMENTS:
- Most recent 10-K (annual report)
- Most recent 10-Q (quarterly report)
- 8-K filings for material events
- Proxy statements (DEF 14A) for executive comp

KEY METRICS TO EXTRACT:
1. Revenue (total and by segment)
2. Revenue growth rate (YoY and QoQ)
3. Gross margin, Operating margin, Net margin
4. Cash and cash equivalents
5. Debt levels and debt/equity ratio
6. Operating expenses (R&D, S&M, G&A) as % of revenue
7. Free cash flow
8. Guidance for next quarter/year if provided

DRIVER-SPECIFIC ANALYSIS:
- For revenue: Break down by product line, geography, customer type
- For expenses: Identify trends in unit economics
- For growth: Compare to analyst estimates
- Calculate key ratios: Rule of 40, CAC payback, LTV/CAC

OUTPUT FORMAT:
- Metric: Value (Period, YoY change)
- Direct quotes from filings for key statements
- Management commentary on outlook
- Red flags or concerns identified`,
    variables: ['COMPANY_TICKER'],
    schedulable: true,
    frequency: 'monthly',
    outputFormat: 'structured_data',
  },

  {
    id: 'expert_opinion_synthesis',
    name: 'Expert Opinion Synthesis',
    description: 'Synthesize expert predictions and analyst estimates',
    category: 'expert_synthesis',
    evidenceType: 'expert_opinion',
    promptTemplate: `You are a research synthesizer. Compile expert opinions on {FORECAST_TOPIC} for {COMPANY_OR_MARKET}.

SOURCES TO SURVEY:
1. Equity analyst reports (if public company)
   - Price targets and rationale
   - Revenue/earnings estimates
   - Key assumptions
2. Industry analyst reports (Gartner, Forrester, IDC)
3. Expert interviews and quotes
4. Substack/blog posts from credible domain experts
5. Podcast appearances by founders/executives
6. Conference presentations and panels

SYNTHESIS FRAMEWORK:
- Bull case: Most optimistic credible view
- Bear case: Most pessimistic credible view
- Consensus: Central tendency of expert opinion
- Range: Spread between min and max estimates
- Key variables: What drives disagreement?
- Track record: How accurate have these experts been historically?

IDENTIFY:
- Which experts have strongest domain credibility?
- What evidence do they cite for their views?
- How has consensus changed over time?
- Any recent shifts in expert sentiment?

OUTPUT: Synthesized view with attribution to specific experts.`,
    variables: ['FORECAST_TOPIC', 'COMPANY_OR_MARKET'],
    schedulable: false,
    outputFormat: 'summary',
  },

  {
    id: 'regulatory_monitoring',
    name: 'Regulatory & Policy Monitoring',
    description: 'Track regulatory changes that impact market assumptions',
    category: 'market_analysis',
    evidenceType: 'web_article',
    promptTemplate: `You are a regulatory affairs analyst. Monitor regulatory developments affecting {INDUSTRY_SECTOR} in {JURISDICTION}.

MONITORING AREAS:
1. Pending legislation and bills
2. Agency rulemaking (FDA, FCC, SEC, etc.)
3. Court cases with industry implications
4. International regulatory changes
5. Trade policies and tariffs
6. Compliance deadlines

IMPACT ASSESSMENT:
- What specific regulations are changing?
- Timeline: When do changes take effect?
- Scope: Who/what is affected?
- Business impact: Constraints or opportunities?
- Probability: How likely is this to pass/implement?

SOURCES:
- Federal Register
- Agency websites (FDA.gov, FCC.gov, etc.)
- Law firm regulatory alerts
- Industry association newsletters
- Trade publications

OUTPUT:
- Regulation title and status
- Key provisions affecting forecasts
- Expected timeline
- Impact assessment: Positive/Negative/Neutral
- Relevance to specific drivers (user growth, pricing, costs)`,
    variables: ['INDUSTRY_SECTOR', 'JURISDICTION'],
    schedulable: true,
    frequency: 'weekly',
    outputFormat: 'summary',
  },

  {
    id: 'hiring_trends',
    name: 'Company Hiring Trends Analysis',
    description: 'Infer growth plans from hiring patterns and job postings',
    category: 'competitor_research',
    evidenceType: 'competitor_data',
    promptTemplate: `You are a labor market analyst. Analyze hiring trends for {COMPANY_NAME} to infer growth trajectory.

DATA SOURCES:
1. LinkedIn job postings
2. Company careers page
3. Glassdoor
4. H1B visa applications (for tech roles)
5. LinkedIn headcount growth estimates

ANALYSIS:
1. Total job openings: Count and trend
2. Department breakdown: Engineering, Sales, Marketing, Ops
3. Seniority levels: Entry, Mid, Senior, Leadership
4. Geographic distribution: Where are they hiring?
5. Specialized roles: New capabilities being built?
6. Hiring velocity: How fast are roles filling?

INFERENCE FRAMEWORK:
- Heavy engineering hiring → Product expansion
- Heavy sales hiring → Go-to-market scaling
- Geographic expansion → New market entry
- Specialized skills → Technology shifts

QUANTIFY:
- Estimated headcount: Current and growth rate
- Compare to previous {TIME_PERIOD}
- Benchmark against competitors
- Calculate implied burn rate if possible

SOURCES:
- LinkedIn Talent Insights
- Wellfound (AngelList)
- Hacker News "Who's Hiring" threads`,
    variables: ['COMPANY_NAME', 'TIME_PERIOD'],
    schedulable: true,
    frequency: 'monthly',
    outputFormat: 'time_series',
  },

  {
    id: 'user_growth_signals',
    name: 'User Growth Signal Detection',
    description: 'Track proxy metrics for user/customer growth',
    category: 'market_analysis',
    evidenceType: 'web_article',
    promptTemplate: `You are a growth analytics specialist. Find proxy signals for {COMPANY_NAME}'s user/customer growth.

PROXY METRICS TO TRACK:
1. Web traffic (SimilarWeb, Alexa)
   - Total visits
   - Unique visitors
   - Traffic sources
   - Engagement metrics
2. Mobile app downloads and rankings
   - iOS App Store ranks
   - Google Play ranks
   - Download estimates (Sensor Tower, App Annie)
3. Social media followers
   - Twitter, LinkedIn, Instagram growth
4. Media mentions and press coverage
5. Hiring in growth-related roles
6. Partnership announcements
7. Geographic expansion signals

ANALYSIS:
- Growth rate: MoM and YoY changes
- Acceleration/deceleration trends
- Comparison to competitors
- Correlation with company announcements
- Leading indicators vs lagging indicators

DATA QUALITY:
- Note which metrics are direct vs proxies
- Confidence level in each data point
- Known limitations of data sources

OUTPUT:
- Metric: Current value (Date)
- Trend: % change over {TIME_PERIOD}
- Data source and methodology
- Inference: What this suggests about actual user growth`,
    variables: ['COMPANY_NAME', 'TIME_PERIOD'],
    schedulable: true,
    frequency: 'weekly',
    outputFormat: 'time_series',
  },

  {
    id: 'pricing_intelligence',
    name: 'Competitive Pricing Intelligence',
    description: 'Track pricing changes and packaging across competitors',
    category: 'competitor_research',
    evidenceType: 'competitor_data',
    promptTemplate: `You are a pricing intelligence analyst. Research pricing for {PRODUCT_CATEGORY} from competitors.

COMPETITORS TO ANALYZE:
{COMPETITOR_LIST}

FOR EACH COMPETITOR:
1. Pricing tiers (Free, Starter, Pro, Enterprise)
2. Price points at each tier
3. Feature differentiation by tier
4. Discounts (annual, volume, non-profit)
5. Recent pricing changes (increases or decreases)
6. Packaging strategy (user-based, usage-based, flat-fee)

ANALYSIS:
- Price range: Min to Max across competitors
- Median/average pricing by tier
- Feature-to-price ratio comparison
- Pricing model trends (shift to consumption-based?)
- Anchoring strategies
- Price positioning (premium vs value)

SOURCES:
- Company websites (pricing pages)
- Sales documentation
- Customer testimonials mentioning price
- Discussions on Reddit, HN about pricing
- Negotiated pricing from Gartner Peer Insights

ARPU ESTIMATION:
- If public company: Calculate ARPU from financials
- If private: Estimate weighted average based on tier mix
- Assumptions documented clearly

OUTPUT: Comparative pricing table with sources.`,
    variables: ['PRODUCT_CATEGORY', 'COMPETITOR_LIST'],
    schedulable: true,
    frequency: 'monthly',
    outputFormat: 'structured_data',
  },
];

export const PROMPT_VARIABLES_GLOSSARY: Record<string, string> = {
  MARKET_SEGMENT: 'e.g., "Cloud Infrastructure", "B2B SaaS", "Direct-to-Consumer E-commerce"',
  GEOGRAPHY: 'e.g., "United States", "EMEA", "Global", "North America"',
  COMPETITOR_NAME: 'e.g., "Salesforce", "Snowflake", "Databricks"',
  COMPANY_TICKER: 'e.g., "CRM", "SNOW", "MSFT"',
  COMPANY_NAME: 'e.g., "Anthropic", "OpenAI", "Mistral"',
  COMPANY_OR_PRODUCT: 'e.g., "Claude", "ChatGPT", "Gemini"',
  TECHNOLOGY_CLAIM: 'e.g., "Real-time voice synthesis with <50ms latency", "100k context window"',
  USE_CASE: 'e.g., "Customer service automation", "Code generation"',
  TIME_PERIOD: 'e.g., "30 days", "Q4 2024", "past 6 months"',
  FORECAST_TOPIC: 'e.g., "Enterprise AI adoption rates", "SaaS revenue multiples"',
  COMPANY_OR_MARKET: 'e.g., "Microsoft AI business", "Enterprise LLM market"',
  INDUSTRY_SECTOR: 'e.g., "Cryptocurrency", "Medical Devices", "Online Gaming"',
  JURISDICTION: 'e.g., "United States", "European Union", "California"',
  PRODUCT_CATEGORY: 'e.g., "Project Management Software", "CRM platforms"',
  COMPETITOR_LIST: 'e.g., "Asana, Monday.com, ClickUp, Linear"',
  RELEVANT_SUBREDDIT: 'e.g., "startups", "SaaS", "technology"',
};
