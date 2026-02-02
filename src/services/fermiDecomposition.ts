/**
 * Fermi Decomposition Service
 *
 * Helps users break down complex forecasting questions into manageable pieces
 * using classic Fermi estimation techniques.
 *
 * NOTE: Will integrate with AKP (Agent Knowledge Protocol) once worldview service
 * is deployed to access shared decomposition patterns and learn from user approaches.
 */

export interface DecompositionStrategy {
  name: string;
  description: string;
  steps: string[];
  example?: string;
}

export interface DecompositionSuggestion {
  strategy: DecompositionStrategy;
  reasoning: string;
  applicableFactors: string[];
}

/**
 * Classic decomposition strategies for Fermi estimation
 */
const DECOMPOSITION_STRATEGIES: DecompositionStrategy[] = [
  {
    name: "Top-Down Market Sizing",
    description: "Start with total addressable market and work down through conversion rates",
    steps: [
      "Identify total population or market size",
      "Apply relevant filters or segments",
      "Estimate conversion/adoption rates",
      "Account for frequency or intensity"
    ],
    example: "Question: 'How many pizza deliveries in NYC?' → Total population → Households → Pizza-eating households → Orders per month"
  },
  {
    name: "Bottom-Up Unit Economics",
    description: "Build up from smallest meaningful unit to total estimate",
    steps: [
      "Identify the atomic unit (person, transaction, event)",
      "Estimate unit rate or frequency",
      "Multiply by number of units",
      "Adjust for variability or distributions"
    ],
    example: "Question: 'Revenue potential?' → Price per unit → Units per customer → Number of customers → Purchase frequency"
  },
  {
    name: "Timeline Decomposition",
    description: "Break question into time periods and aggregate",
    steps: [
      "Choose appropriate time unit (day, week, month)",
      "Estimate for single time period",
      "Identify growth or decay rate",
      "Project over total timeframe"
    ],
    example: "Question: 'Will product hit 10M users by 2027?' → Current users → Monthly growth rate → Months remaining → Projected total"
  },
  {
    name: "Comparative Anchoring",
    description: "Use similar known cases as reference points",
    steps: [
      "Identify comparable situations or precedents",
      "Adjust for key differences (scale, context, timing)",
      "Apply similarity/adjustment factors",
      "Cross-check against base rates"
    ],
    example: "Question: 'Will crypto regulation pass?' → Similar bills in past → Success rate → Adjust for current political climate"
  },
  {
    name: "Component Multiplication",
    description: "Break into independent multiplicative factors",
    steps: [
      "Identify independent factors that multiply",
      "Estimate each factor separately",
      "Multiply factors together",
      "Consider uncertainty compounding"
    ],
    example: "Question: 'Will AI achieve X?' → Probability technical barrier solved × Probability funding continues × Probability regulatory approval"
  },
  {
    name: "Scenario Weighting",
    description: "Enumerate distinct scenarios and weight by probability",
    steps: [
      "Identify 3-5 distinct outcome scenarios",
      "Estimate outcome value for each scenario",
      "Assign probability to each scenario",
      "Calculate probability-weighted average"
    ],
    example: "Question: 'Company valuation in 2026?' → Bull case (30%) + Base case (50%) + Bear case (20%)"
  },
  {
    name: "Constraint Analysis",
    description: "Identify hard limits and work backwards",
    steps: [
      "Identify physical, economic, or logical constraints",
      "Establish upper and lower bounds",
      "Estimate where in range outcome falls",
      "Check if constraints are binding"
    ],
    example: "Question: 'Can startup reach $1B revenue?' → Market size limit → Production capacity → Customer acquisition limit"
  }
];

/**
 * Analyzes a forecast question and suggests appropriate decomposition strategies
 */
export function suggestDecompositions(question: string): DecompositionSuggestion[] {
  const suggestions: DecompositionSuggestion[] = [];
  const lowerQuestion = question.toLowerCase();

  // Market sizing questions
  if (lowerQuestion.match(/how many|what percentage|market size|total|users|customers/)) {
    suggestions.push({
      strategy: DECOMPOSITION_STRATEGIES[0], // Top-Down Market Sizing
      reasoning: "This appears to be a market sizing or population estimate question",
      applicableFactors: ["total addressable market", "conversion rates", "market segments"]
    });

    suggestions.push({
      strategy: DECOMPOSITION_STRATEGIES[1], // Bottom-Up Unit Economics
      reasoning: "Can build up from individual unit economics",
      applicableFactors: ["unit economics", "frequency", "customer base"]
    });
  }

  // Timeline/growth questions
  if (lowerQuestion.match(/by \d{4}|will.*reach|growth|when will|in \d+ (year|month)/)) {
    suggestions.push({
      strategy: DECOMPOSITION_STRATEGIES[2], // Timeline Decomposition
      reasoning: "Question involves growth or change over time",
      applicableFactors: ["current baseline", "growth rate", "timeframe"]
    });
  }

  // Binary event questions (will X happen?)
  if (lowerQuestion.match(/will.*\?|whether|if.*will/)) {
    suggestions.push({
      strategy: DECOMPOSITION_STRATEGIES[4], // Component Multiplication
      reasoning: "Binary event can be decomposed into independent probability factors",
      applicableFactors: ["independent success factors", "probability of each factor"]
    });

    suggestions.push({
      strategy: DECOMPOSITION_STRATEGIES[3], // Comparative Anchoring
      reasoning: "Can use base rates from similar historical events",
      applicableFactors: ["historical precedents", "base rates", "adjustment factors"]
    });
  }

  // Valuation/price questions
  if (lowerQuestion.match(/price|valuation|worth|revenue|cost|\$|value/)) {
    suggestions.push({
      strategy: DECOMPOSITION_STRATEGIES[5], // Scenario Weighting
      reasoning: "Financial outcomes often best estimated through scenario analysis",
      applicableFactors: ["bull case", "base case", "bear case", "probabilities"]
    });

    suggestions.push({
      strategy: DECOMPOSITION_STRATEGIES[1], // Bottom-Up Unit Economics
      reasoning: "Can build up from unit economics and volume",
      applicableFactors: ["price per unit", "volume", "costs"]
    });
  }

  // Feasibility/possibility questions
  if (lowerQuestion.match(/can|possible|feasible|achieve|capability/)) {
    suggestions.push({
      strategy: DECOMPOSITION_STRATEGIES[6], // Constraint Analysis
      reasoning: "Feasibility questions benefit from identifying hard constraints",
      applicableFactors: ["resource constraints", "physical limits", "capacity bounds"]
    });
  }

  // Competitive/precedent questions
  if (lowerQuestion.match(/compared to|similar to|like|precedent|historical/)) {
    suggestions.push({
      strategy: DECOMPOSITION_STRATEGIES[3], // Comparative Anchoring
      reasoning: "Question references comparisons or precedents",
      applicableFactors: ["comparable cases", "adjustment factors", "key differences"]
    });
  }

  // Default: offer scenario weighting as generally applicable
  if (suggestions.length === 0) {
    suggestions.push({
      strategy: DECOMPOSITION_STRATEGIES[5], // Scenario Weighting
      reasoning: "Scenario analysis is a robust general approach for uncertain outcomes",
      applicableFactors: ["distinct scenarios", "probabilities", "outcome values"]
    });
  }

  // Limit to top 3 suggestions
  return suggestions.slice(0, 3);
}

/**
 * Generates a decomposition template for a given strategy
 */
export function generateDecompositionTemplate(strategy: DecompositionStrategy): string {
  let template = `## ${strategy.name}\n\n`;
  template += `${strategy.description}\n\n`;

  if (strategy.example) {
    template += `**Example:** ${strategy.example}\n\n`;
  }

  template += `**Steps to follow:**\n\n`;
  strategy.steps.forEach((step, i) => {
    template += `${i + 1}. ${step}\n`;
  });

  template += `\n**Create drivers for each step above to build your estimate systematically.**`;

  return template;
}

/**
 * Checks if a forecast would benefit from decomposition
 */
export function shouldSuggestDecomposition(forecast: any): {
  suggest: boolean;
  reason?: string;
} {
  // Few or no drivers - might need decomposition help
  if (!forecast.drivers || forecast.drivers.length < 2) {
    return {
      suggest: true,
      reason: "Consider breaking this down into multiple independent factors"
    };
  }

  // Complex question but shallow driver structure
  const questionWords = forecast.question.split(" ").length;
  if (questionWords > 15 && forecast.drivers.length < 3) {
    return {
      suggest: true,
      reason: "Complex question may benefit from systematic decomposition"
    };
  }

  // All drivers are high-level (no evidence/research)
  const driversWithEvidence = forecast.drivers.filter(
    (d: any) => d.evidence && d.evidence.length > 0
  );
  if (forecast.drivers.length >= 2 && driversWithEvidence.length === 0) {
    return {
      suggest: true,
      reason: "Try decomposing drivers into more specific, researchable factors"
    };
  }

  return { suggest: false };
}

/**
 * Provides calibration exercises based on question type
 */
export function suggestCalibrationExercise(question: string): string | null {
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.match(/\d{4}|by (january|february|march|april|may|june|july|august|september|october|november|december)/i)) {
    return "**Calibration tip:** Before setting your timeline estimate, recall: How accurate have your timeline predictions been historically? Most people are overconfident about near-term progress.";
  }

  if (lowerQuestion.match(/will.*\?/)) {
    return "**Calibration tip:** For binary events, consider: Of the last 10 times you gave something a 70% probability, did 7 of them happen? Try tracking your calibration.";
  }

  if (lowerQuestion.match(/how many|percentage|market/)) {
    return "**Calibration tip:** For quantities, think in orders of magnitude first. Is this closer to 10, 100, 1000, or 10,000? Then narrow your range.";
  }

  return null;
}
