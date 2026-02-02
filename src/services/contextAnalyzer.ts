/**
 * Context Analyzer Service
 * Analyzes forecast state to provide intelligent, proactive coaching
 *
 * NOTE: This will integrate with AKP (Agent Knowledge Protocol) once worldview service is deployed.
 * For now, provides standalone pattern analysis for Fermi coaching.
 */

import { Forecast, Driver } from "../types";

export interface ContextualInsight {
  type:
    | "missing_driver"
    | "bias_warning"
    | "agent_recommendation"
    | "coverage_gap"
    | "correlation_risk";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  suggestedAction?: string;
  suggestedCommand?: string;
}

/**
 * Analyze forecast for missing critical drivers
 */
export function analyzeMissingDrivers(forecast: Forecast): ContextualInsight[] {
  const insights: ContextualInsight[] = [];
  const driverNames = forecast.drivers.map((d) => d.name.toLowerCase());

  // Common driver categories that should be considered
  const categories = {
    market: ["market size", "demand", "customer", "competition", "tam"],
    technical: [
      "technical",
      "feasibility",
      "development",
      "implementation",
      "capability",
    ],
    regulatory: ["regulatory", "legal", "compliance", "approval", "policy"],
    timing: ["timeline", "schedule", "timing", "deadline", "speed"],
    resources: ["resources", "funding", "team", "budget", "capacity"],
    external: ["economic", "political", "social", "trend", "macro"],
  };

  // Check which categories are missing
  for (const [category, keywords] of Object.entries(categories)) {
    const hasCategory = driverNames.some((name) =>
      keywords.some((keyword) => name.includes(keyword)),
    );

    if (!hasCategory) {
      insights.push({
        type: "missing_driver",
        severity: "warning",
        title: `Consider ${category} factors`,
        description: `Your forecast doesn't include ${category} drivers. These could significantly impact the outcome.`,
        suggestedAction: `Add a driver related to: ${keywords.slice(0, 3).join(", ")}`,
        suggestedCommand: `/driver`,
      });
    }
  }

  return insights;
}

/**
 * Detect cognitive biases in forecast structure
 */
export function detectBiases(forecast: Forecast): ContextualInsight[] {
  const insights: ContextualInsight[] = [];

  // Anchoring bias - if first driver is binary event
  if (forecast.drivers.length > 0 && forecast.drivers[0].type === "binary") {
    insights.push({
      type: "bias_warning",
      severity: "info",
      title: "Anchoring alert",
      description:
        "Your first driver is a binary event. Be careful not to anchor too heavily on yes/no outcomes. Consider underlying continuous factors.",
      suggestedAction:
        "Add continuous drivers that influence this binary outcome",
    });
  }

  // Overconfidence - narrow distributions
  const narrowDrivers = forecast.drivers.filter((d) => {
    if (d.type === "continuous" && d.p5 !== undefined && d.p95 !== undefined) {
      const range = d.p95 - d.p5;
      const median = d.p50 || (d.p5 + d.p95) / 2;
      return range / median < 0.3; // Less than 30% uncertainty
    }
    return false;
  });

  if (narrowDrivers.length > forecast.drivers.length * 0.6) {
    insights.push({
      type: "bias_warning",
      severity: "warning",
      title: "Overconfidence detected",
      description: `${narrowDrivers.length} of ${forecast.drivers.length} drivers have very narrow ranges. Real-world uncertainty is usually higher.`,
      suggestedAction:
        "Review your confidence intervals. Consider expanding ranges to reflect true uncertainty.",
      suggestedCommand: `/p`,
    });
  }

  // Confirmation bias - no contradicting drivers
  const increasingDrivers = forecast.drivers.filter(
    (d) => d.direction === "increases",
  ).length;
  const decreasingDrivers = forecast.drivers.filter(
    (d) => d.direction === "decreases",
  ).length;

  if (forecast.drivers.length >= 3) {
    if (increasingDrivers === 0 || decreasingDrivers === 0) {
      insights.push({
        type: "bias_warning",
        severity: "warning",
        title: "One-sided analysis",
        description:
          "All your drivers point in the same direction. Strong forecasts consider both supporting and opposing factors.",
        suggestedAction: "Add drivers that could work against your hypothesis",
        suggestedCommand: `/driver`,
      });
    }
  }

  return insights;
}

/**
 * Recommend research agents based on forecast content
 */
export function recommendAgents(forecast: Forecast): ContextualInsight[] {
  const insights: ContextualInsight[] = [];
  const question = forecast.question.toLowerCase();
  const domain = forecast.domain?.toLowerCase() || "";

  // Map question patterns to agent recommendations
  const agentRecommendations = [
    {
      patterns: ["market", "revenue", "sales", "customers", "tam", "adoption"],
      agent: "market_researcher",
      reason: "Track market size, trends, and customer behavior",
    },
    {
      patterns: ["company", "startup", "competitor", "business", "valuation"],
      agent: "competitive_intel",
      reason: "Monitor competitors and market positioning",
    },
    {
      patterns: ["sentiment", "public opinion", "perception", "social"],
      agent: "sentiment_monitor",
      reason: "Track public sentiment and social signals",
    },
    {
      patterns: ["financial", "profit", "earnings", "stock", "ipo"],
      agent: "financial_analyst",
      reason: "Analyze financial metrics and performance",
    },
    {
      patterns: ["regulation", "legal", "policy", "law", "government"],
      agent: "regulatory_monitor",
      reason: "Track regulatory changes and compliance",
    },
    {
      patterns: ["technology", "technical", "product", "development", "launch"],
      agent: "technology_validator",
      reason: "Validate technical feasibility and progress",
    },
    {
      patterns: ["hiring", "team", "headcount", "talent", "recruitment"],
      agent: "hiring_tracker",
      reason: "Monitor hiring trends and team growth",
    },
    {
      patterns: ["growth", "expansion", "scale", "users", "traction"],
      agent: "growth_signals",
      reason: "Track growth metrics and signals",
    },
    {
      patterns: ["price", "pricing", "cost"],
      agent: "pricing_intel",
      reason: "Monitor pricing strategies and changes",
    },
  ];

  // Check which agents are already attached
  const attachedAgents = new Set(
    forecast.drivers.flatMap((d) => d.agents?.map((a) => a.name) || []),
  );

  // Recommend agents based on patterns
  for (const rec of agentRecommendations) {
    const matches = rec.patterns.some(
      (pattern) => question.includes(pattern) || domain.includes(pattern),
    );

    if (matches && !attachedAgents.has(rec.agent)) {
      insights.push({
        type: "agent_recommendation",
        severity: "info",
        title: `Consider @${rec.agent}`,
        description: rec.reason,
        suggestedAction: `Attach this agent to a relevant driver`,
        suggestedCommand: `@${rec.agent}`,
      });
    }
  }

  // Always recommend research_analyst if no agents attached
  if (attachedAgents.size === 0 && forecast.drivers.length > 0) {
    insights.push({
      type: "agent_recommendation",
      severity: "warning",
      title: "No research agents attached",
      description:
        "Research agents can continuously gather evidence and update your forecast. Start with @research_analyst for comprehensive analysis.",
      suggestedCommand: `@research_analyst`,
    });
  }

  return insights;
}

/**
 * Analyze driver coverage and gaps
 */
export function analyzeDriverCoverage(forecast: Forecast): ContextualInsight[] {
  const insights: ContextualInsight[] = [];

  // Too few drivers
  if (forecast.drivers.length < 2) {
    insights.push({
      type: "coverage_gap",
      severity: "warning",
      title: "Limited driver coverage",
      description:
        "Complex forecasts benefit from multiple drivers. Consider breaking down your question into 3-5 key factors.",
      suggestedCommand: `/driver`,
    });
  }

  // Too many drivers
  if (forecast.drivers.length > 8) {
    insights.push({
      type: "coverage_gap",
      severity: "info",
      title: "Many drivers",
      description: `You have ${forecast.drivers.length} drivers. Consider if some could be combined or if the most critical factors are clear.`,
      suggestedAction: "Focus on the 5-7 most impactful drivers",
    });
  }

  // Drivers without evidence
  const driversWithoutEvidence = forecast.drivers.filter(
    (d) => !d.evidence || d.evidence.length === 0,
  );

  if (driversWithoutEvidence.length > 0) {
    insights.push({
      type: "coverage_gap",
      severity: "info",
      title: `${driversWithoutEvidence.length} driver(s) lack evidence`,
      description:
        "Attach research agents or add evidence to strengthen these drivers.",
      suggestedAction: `Consider agents for: ${driversWithoutEvidence.map((d) => d.name).join(", ")}`,
    });
  }

  return insights;
}

/**
 * Check for correlation risks between drivers
 */
export function checkCorrelations(forecast: Forecast): ContextualInsight[] {
  const insights: ContextualInsight[] = [];

  // Look for potentially correlated drivers by name similarity
  const drivers = forecast.drivers;
  for (let i = 0; i < drivers.length; i++) {
    for (let j = i + 1; j < drivers.length; j++) {
      const name1 = drivers[i].name.toLowerCase();
      const name2 = drivers[j].name.toLowerCase();

      // Check for shared keywords (simple correlation heuristic)
      const words1 = name1.split(/\s+/);
      const words2 = name2.split(/\s+/);
      const sharedWords = words1.filter(
        (w) => words2.includes(w) && w.length > 3,
      );

      if (sharedWords.length >= 2) {
        insights.push({
          type: "correlation_risk",
          severity: "warning",
          title: "Potential correlation",
          description: `"${drivers[i].name}" and "${drivers[j].name}" may be correlated. This could lead to double-counting.`,
          suggestedAction:
            "Consider if these drivers are truly independent or if one causes the other",
        });
      }
    }
  }

  return insights;
}

/**
 * Get all contextual insights for a forecast
 */
export function analyzeContext(forecast: Forecast): ContextualInsight[] {
  if (!forecast || !forecast.question) {
    return [];
  }

  const insights: ContextualInsight[] = [
    ...analyzeMissingDrivers(forecast),
    ...detectBiases(forecast),
    ...recommendAgents(forecast),
    ...analyzeDriverCoverage(forecast),
    ...checkCorrelations(forecast),
  ];

  // Sort by severity: critical > warning > info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  insights.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  return insights;
}
