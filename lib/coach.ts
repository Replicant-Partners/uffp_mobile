/**
 * AI Coach Agent
 * 
 * Makes forecast creation easy by:
 * - Parsing natural language questions
 * - Suggesting drivers automatically
 * - Recommending research agents
 * - Guiding users through the process
 */

interface CoachPromptContext {
  stage: 'initial' | 'base_rate' | 'drivers' | 'quantify' | 'evidence' | 'review';
  question?: string;
  domain?: string;
  baseRate?: any;
  drivers?: any[];
  conversationHistory?: { role: string; content: string }[];
}

interface CoachResponse {
  message: string;
  suggestions?: {
    type: 'driver' | 'research' | 'baseRate' | 'evidence';
    data: any;
  }[];
  nextStage?: string;
}

/**
 * Parse a forecast question from natural language
 */
export async function parseQuestion(userInput: string): Promise<{
  question: string;
  domain?: string;
  timeframe?: string;
  suggestedDrivers?: string[];
  suggestedResearch?: string[];
  confidence: number;
}> {
  const prompt = `You are a forecasting assistant. Parse this forecast request:

"${userInput}"

Extract:
1. The core question (as a clear yes/no question)
2. The domain (finance, technology, weather, politics, sports, general)
3. The timeframe (if mentioned)
4. Suggest 3-5 key drivers to decompose this forecast
5. Suggest relevant research agents to run

Respond in this exact JSON format:
{
  "question": "Will [clear yes/no question]?",
  "domain": "domain_name",
  "timeframe": "timeframe or null",
  "suggestedDrivers": ["driver1", "driver2", "driver3"],
  "suggestedResearch": ["agent_id1", "agent_id2"],
  "confidence": 0.95
}

Examples:

Input: "forecast ASTS reaching $20 by 2026"
Output: {
  "question": "Will ASTS reach $20 by end of 2026?",
  "domain": "finance",
  "timeframe": "by end of 2026",
  "suggestedDrivers": ["Technical execution", "Market demand", "Regulatory approval", "Competitive landscape"],
  "suggestedResearch": ["financial_analyst", "market_researcher", "competitive_intel"],
  "confidence": 0.9
}

Input: "will it rain in Seattle tomorrow"
Output: {
  "question": "Will it rain in Seattle tomorrow?",
  "domain": "weather",
  "timeframe": "tomorrow",
  "suggestedDrivers": ["Atmospheric pressure", "Cloud coverage", "Historical patterns"],
  "suggestedResearch": ["research_analyst"],
  "confidence": 0.85
}

Now parse: "${userInput}"`;

  try {
    const response = await callCoachAgent(prompt);
    const parsed = JSON.parse(response);
    return parsed;
  } catch (e) {
    // Fallback if AI parsing fails
    console.error('[parseQuestion] AI parsing failed, using fallback:', e);
    return {
      question: userInput.includes('?') ? userInput : userInput + '?',
      domain: 'general',
      timeframe: undefined,
      suggestedDrivers: [],
      suggestedResearch: [],
      confidence: 0.5
    };
  }
}

export async function coachBaseRate(context: {
  question: string;
  domain: string;
  conversationHistory?: { role: string; content: string }[];
}): Promise<CoachResponse> {
  const history = context.conversationHistory || [];
  const historyText = history.map(m => `${m.role}: ${m.content}`).join('\n');
  
  const prompt = `You are a Superforecaster coach helping someone find a good base rate.

Question: "${context.question}"
Domain: ${context.domain}

Conversation so far:
${historyText}

Your job:
1. Suggest a good reference class (similar past events)
2. Ask for the historical success rate
3. Provide domain-specific examples
4. Be conversational and encouraging

Examples by domain:

Finance: "For stock price targets, consider: 'small cap companies in the same sector that doubled in similar timeframes' or 'companies with similar revenue growth reaching this valuation'"

Technology: "For product launches, consider: 'similar products from this company' or 'competitor products with similar scope'"

Weather: "For precipitation forecasts, consider: 'days with similar atmospheric conditions' or 'historical rainfall in this month/location'"

Respond conversationally. Keep it short (2-3 sentences). Ask ONE clear question.`;

  const response = await callCoachAgent(prompt);
  
  return {
    message: response,
    suggestions: generateBaseRateSuggestions(context.domain),
    nextStage: 'drivers'
  };
}

/**
 * Coach helps decompose question into drivers
 */
export async function coachDriverDecomposition(context: {
  question: string;
  domain: string;
  baseRate?: any;
  userInput?: string;
  conversationHistory?: { role: string; content: string }[];
}): Promise<CoachResponse> {
  const history = context.conversationHistory || [];
  const historyText = history.map(m => `${m.role}: ${m.content}`).join('\n');
  
  const prompt = `You are a Superforecaster coach helping decompose a forecast into independent drivers.

Question: "${context.question}"
Domain: ${context.domain}
${context.baseRate ? `Base rate: ${context.baseRate.successRate}% (${context.baseRate.referenceClass})` : ''}

Conversation so far:
${historyText}

Your job:
1. Suggest 3-5 key independent drivers
2. Explain why each driver matters
3. Make sure drivers are:
   - Independent (not overlapping)
   - Measurable (can assign probabilities)
   - Comprehensive (cover main uncertainties)

Domain-specific driver examples:

Finance (stock targets):
- Technical execution (can company deliver?)
- Market demand (will customers buy?)
- Competitive landscape (what about competitors?)
- Regulatory environment (any policy risks?)

Technology (product launches):
- Technical feasibility (can it be built?)
- Market timing (is market ready?)
- User adoption (will people use it?)
- Competitive advantage (why choose this?)

Weather (precipitation):
- Atmospheric pressure patterns
- Cloud coverage and type
- Temperature and humidity
- Wind patterns

Respond with:
1. Brief explanation (2-3 sentences)
2. List of 3-5 suggested drivers with brief rationale for each

Format your response like:
"Let's break this down into independent drivers...

💡 Suggested drivers:
1. **Driver Name** - Why it matters
2. **Driver Name** - Why it matters
..."`;

  const response = await callCoachAgent(prompt);
  
  // Parse suggested drivers from response
  const drivers = extractDriversFromResponse(response, context.question);
  
  return {
    message: response,
    suggestions: drivers.map(d => ({
      type: 'driver' as const,
      data: d
    })),
    nextStage: 'quantify'
  };
}

/**
 * Coach helps quantify a specific driver
 */
export async function coachDriverQuantification(context: {
  question: string;
  domain: string;
  driver: {
    name: string;
    description?: string;
  };
  conversationHistory?: { role: string; content: string }[];
}): Promise<CoachResponse> {
  const history = context.conversationHistory || [];
  const historyText = history.map(m => `${m.role}: ${m.content}`).join('\n');
  
  const prompt = `You are a Superforecaster coach helping quantify a driver.

Question: "${context.question}"
Driver: "${context.driver.name}"

Conversation so far:
${historyText}

Your job:
1. Help user think about probability for this driver
2. Suggest relevant research they could run
3. Ask for their 90% confidence interval OR single probability

Keep it conversational and brief (2-3 sentences).

Example:
"For '${context.driver.name}', let's estimate the probability. 

📊 Available research:
• Run 'Technology Validator' to assess feasibility
• Run 'Expert Consensus' to see analyst opinions

What's your 90% confidence interval? For example:
P5: 60% | P50: 75% | P95: 90%

Or just give a single probability like: 75%"`;

  const response = await callCoachAgent(prompt);
  
  // Suggest relevant research
  const researchSuggestions = suggestResearchForDriver(
    context.driver.name,
    context.domain
  );
  
  return {
    message: response,
    suggestions: researchSuggestions.map(r => ({
      type: 'research' as const,
      data: r
    })),
    nextStage: 'evidence'
  };
}

/**
 * Coach reviews the complete forecast
 */
export async function coachReview(context: {
  question: string;
  baseRate?: any;
  drivers: any[];
  evidence: any[];
}): Promise<CoachResponse> {
  const driversText = context.drivers.map((d, i) => 
    `${i + 1}. ${d.name}: ${d.probability ? d.probability + '%' : `P5: ${d.p5}%, P50: ${d.p50}%, P95: ${d.p95}%`}`
  ).join('\n');
  
  const evidenceCount = context.evidence.length;
  
  const prompt = `You are a Superforecaster coach reviewing a complete forecast.

Question: "${context.question}"

Base rate: ${context.baseRate ? `${context.baseRate.successRate}% (${context.baseRate.referenceClass})` : 'Not set'}

Drivers:
${driversText}

Evidence pieces: ${evidenceCount}

Your job:
1. Review for completeness
2. Check if drivers are independent
3. Suggest any missing considerations
4. Encourage running simulation if ready

Keep response brief (3-4 sentences). Be encouraging!

Example:
"Great work! You have ${context.drivers.length} drivers and ${evidenceCount} pieces of evidence. The drivers look independent and well-reasoned. 

⚠️ One suggestion: Consider adding evidence for '${context.drivers[0]?.name}' to strengthen your forecast.

Ready to run the Monte Carlo simulation? This will combine your drivers into a final probability."`;

  const response = await callCoachAgent(prompt);
  
  return {
    message: response,
    suggestions: [],
    nextStage: 'simulation'
  };
}

// Helper functions

async function callCoachAgent(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0.7,
        system: `You are an expert Superforecaster coach. You help users create high-quality probability forecasts using the Tetlock methodology. You are:
- Encouraging and positive
- Clear and concise
- Methodical and structured
- Focused on evidence and base rates
- Good at breaking down complex questions

Keep responses brief (2-4 sentences usually). Ask ONE clear question at a time.`,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[callCoachAgent] API error ${response.status}:`, errorText);
      throw new Error(`Coach API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json() as any;
    
    // Validate response structure
    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      console.error('[callCoachAgent] Unexpected API response structure:', JSON.stringify(data).substring(0, 500));
      throw new Error('Unexpected API response structure');
    }
    
    return data.content[0].text;
  } catch (error: any) {
    console.error('[callCoachAgent] Error:', error.message);
    throw error;
  }
}

function generateBaseRateSuggestions(domain: string): any[] {
  const suggestions: Record<string, any[]> = {
    finance: [
      {
        type: 'baseRate',
        data: {
          referenceClass: 'Small cap stocks doubling in 1 year',
          estimatedRate: 0.08
        }
      },
      {
        type: 'baseRate',
        data: {
          referenceClass: 'Tech stocks reaching analyst targets',
          estimatedRate: 0.35
        }
      }
    ],
    technology: [
      {
        type: 'baseRate',
        data: {
          referenceClass: 'New product launches succeeding',
          estimatedRate: 0.40
        }
      }
    ],
    weather: [
      {
        type: 'baseRate',
        data: {
          referenceClass: 'Rainy days this month historically',
          estimatedRate: 0.30
        }
      }
    ],
    general: []
  };
  
  return suggestions[domain] || suggestions.general;
}

function extractDriversFromResponse(response: string, question: string): any[] {
  // Simple extraction - look for numbered lists
  const lines = response.split('\n');
  const drivers: any[] = [];
  
  for (const line of lines) {
    // Match patterns like "1. **Driver Name** - description"
    const match = line.match(/^\d+\.\s+\*\*([^*]+)\*\*\s*-\s*(.+)/);
    if (match) {
      drivers.push({
        name: match[1].trim(),
        description: match[2].trim(),
        type: 'binary'
      });
    }
  }
  
  // If no matches, return some defaults based on question
  if (drivers.length === 0) {
    return [
      { name: 'Primary factor', type: 'binary' },
      { name: 'Secondary factor', type: 'binary' },
      { name: 'External factor', type: 'binary' }
    ];
  }
  
  return drivers;
}

function suggestResearchForDriver(driverName: string, domain: string): any[] {
  const lower = driverName.toLowerCase();
  const suggestions: any[] = [];
  
  // Match research agents to driver keywords
  if (lower.includes('market') || lower.includes('demand') || lower.includes('size')) {
    suggestions.push({ agentId: 'market_researcher', promptId: 'market_tam_sizing' });
  }
  
  if (lower.includes('sentiment') || lower.includes('opinion') || lower.includes('perception')) {
    suggestions.push({ agentId: 'sentiment_monitor', promptId: 'sentiment_tracking' });
  }
  
  if (lower.includes('competitor') || lower.includes('competition')) {
    suggestions.push({ agentId: 'competitive_intel', promptId: 'competitor_benchmarking' });
  }
  
  if (lower.includes('technical') || lower.includes('technology') || lower.includes('feasibility')) {
    suggestions.push({ agentId: 'technology_validator', promptId: 'technology_validation' });
  }
  
  if (lower.includes('regulatory') || lower.includes('policy') || lower.includes('legal')) {
    suggestions.push({ agentId: 'regulatory_monitor', promptId: 'regulatory_impact' });
  }
  
  if (lower.includes('financial') || lower.includes('revenue') || lower.includes('profit')) {
    suggestions.push({ agentId: 'financial_analyst', promptId: 'financial_fundamentals' });
  }
  
  // Default fallback
  if (suggestions.length === 0) {
    suggestions.push({ agentId: 'research_analyst', promptId: 'market_tam_sizing' });
  }
  
  return suggestions;
}

export const coach = {
  parseQuestion,
  coachBaseRate,
  coachDriverDecomposition,
  coachDriverQuantification,
  coachReview
};
