/**
 * Driver Semantic Analyzer
 * Uses Claude API to analyze driver names/descriptions and suggest optimal configurations
 */

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
const API_URL = "https://api.anthropic.com/v1/messages";

interface DriverRecommendation {
  type: "continuous" | "binary";
  distribution?: "triangular" | "normal" | "lognormal";
  direction: "increases" | "decreases";
  reasoning: string;
  examples?: {
    p5?: number;
    p50?: number;
    p95?: number;
    probability?: number;
  };
}

const DRIVER_CONFIG_KNOWLEDGE = `
# Driver Configuration Guide

## Type Selection:
- **Continuous**: Use for ranges and measurements (price, time, count, percentage, rate)
- **Binary**: Use for yes/no events (approval, launch, success/failure)

## Distribution Selection for Continuous Drivers:
- **Triangular**: Best for "best case, worst case, most likely" with clear bounds
  - Use when: You have expert estimates, bounded ranges, human intuition
  - Examples: Labor costs, development time, conversion rates
  
- **Normal**: Best for averages with symmetric uncertainty
  - Use when: Natural variation around a mean, measurement errors, well-understood processes
  - Examples: Inflation rates, test scores, small variations
  
- **Lognormal**: Best for growth, money, or anything that can't be negative but could explode
  - Use when: Compounding growth, market sizes, viral spread, stock prices
  - Examples: TAM, user growth, unexpected costs, revenue

## Direction:
- **Increases**: This driver going up makes the outcome more likely
  - Examples: More customers, better conversion, regulatory approval
  
- **Decreases**: This driver going up makes the outcome less likely  
  - Examples: Higher costs, longer delays, competitor launches

## Common Patterns:
| Pattern | Type | Distribution | Direction |
|---------|------|--------------|-----------|
| "Total Addressable Market", "TAM" | Continuous | Lognormal | Increases |
| "Conversion Rate", "Success Rate" | Continuous | Normal | Increases |
| "Approval", "Launch", "Black Swan" | Binary | N/A | Varies |
| "Cost", "Expense", "Budget" | Continuous | Triangular/Lognormal | Decreases |
| "Time", "Duration", "Delay" | Continuous | Triangular | Decreases |
| "Growth", "Viral", "Adoption" | Continuous | Lognormal | Increases |
`;

export async function analyzeDriver(
  driverName: string,
  forecastQuestion?: string,
): Promise<DriverRecommendation> {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `${DRIVER_CONFIG_KNOWLEDGE}

Analyze this driver and recommend the optimal configuration:

Driver name: "${driverName}"
${forecastQuestion ? `Forecast question: "${forecastQuestion}"` : ""}

Provide a JSON response with:
{
  "type": "continuous" or "binary",
  "distribution": "triangular", "normal", or "lognormal" (only if continuous),
  "direction": "increases" or "decreases",
  "reasoning": "Brief explanation of why this configuration fits",
  "examples": {
    "p5": suggested 5th percentile (if continuous),
    "p50": suggested median (if continuous), 
    "p95": suggested 95th percentile (if continuous),
    "probability": suggested probability 0-100 (if binary)
  }
}

Think through:
1. Is this a measurable range or a yes/no event?
2. What distribution best captures the uncertainty?
3. Does this driver increase or decrease the forecast outcome?
4. What are reasonable example values?

Respond with ONLY the JSON object, no other text.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "{}";
    
    // Extract JSON from response (Claude might wrap it in markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    
    const recommendation = JSON.parse(jsonStr);
    
    return recommendation;
  } catch (error) {
    console.error("[DriverAnalyzer] Analysis failed:", error);
    
    // Fallback to simple heuristics
    return fallbackAnalysis(driverName);
  }
}

/**
 * Fallback heuristic analysis when API fails
 */
function fallbackAnalysis(driverName: string): DriverRecommendation {
  const name = driverName.toLowerCase();
  
  // Binary patterns
  if (
    name.includes("approval") ||
    name.includes("launch") ||
    name.includes("success") ||
    name.includes("failure") ||
    name.includes("event") ||
    name.includes("happens")
  ) {
    return {
      type: "binary",
      direction: name.includes("failure") || name.includes("risk") ? "decreases" : "increases",
      reasoning: "Detected yes/no event pattern",
      examples: { probability: 50 },
    };
  }
  
  // Lognormal patterns
  if (
    name.includes("tam") ||
    name.includes("market") ||
    name.includes("growth") ||
    name.includes("viral") ||
    name.includes("revenue") ||
    name.includes("user")
  ) {
    return {
      type: "continuous",
      distribution: "lognormal",
      direction: "increases",
      reasoning: "Growth/market patterns typically follow lognormal distribution",
      examples: { p5: 10, p50: 50, p95: 200 },
    };
  }
  
  // Cost patterns
  if (
    name.includes("cost") ||
    name.includes("expense") ||
    name.includes("budget")
  ) {
    return {
      type: "continuous",
      distribution: name.includes("unexpected") ? "lognormal" : "triangular",
      direction: "decreases",
      reasoning: "Costs reduce probability of positive outcomes",
      examples: { p5: 10, p50: 50, p95: 100 },
    };
  }
  
  // Time patterns
  if (
    name.includes("time") ||
    name.includes("duration") ||
    name.includes("delay")
  ) {
    return {
      type: "continuous",
      distribution: "triangular",
      direction: "decreases",
      reasoning: "Time delays typically have clear best/worst case bounds",
      examples: { p5: 30, p50: 60, p95: 120 },
    };
  }
  
  // Rate/percentage patterns  
  if (
    name.includes("rate") ||
    name.includes("percentage") ||
    name.includes("%") ||
    name.includes("conversion")
  ) {
    return {
      type: "continuous",
      distribution: "normal",
      direction: "increases",
      reasoning: "Rates and percentages typically vary normally around a mean",
      examples: { p5: 2, p50: 5, p95: 10 },
    };
  }
  
  // Default: continuous triangular
  return {
    type: "continuous",
    distribution: "triangular",
    direction: "increases",
    reasoning: "Default configuration for general continuous variables",
    examples: { p5: 20, p50: 50, p95: 80 },
  };
}
