/**
 * Driver Semantic Analyzer
 * Uses backend proxy to analyze driver names and suggest optimal configurations
 */

// Use backend proxy to avoid CORS issues
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "https://uffp-backend.vercel.app";
const API_URL = `${BACKEND_URL}/api/analyze-driver`;

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

export async function analyzeDriver(
  driverName: string,
  forecastQuestion?: string,
): Promise<DriverRecommendation> {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        driverName,
        forecastQuestion,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const recommendation = await response.json();
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
