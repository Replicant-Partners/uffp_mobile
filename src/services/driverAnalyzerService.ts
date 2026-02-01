/**
 * Driver Semantic Analyzer
 * Uses backend proxy to analyze driver names and suggest optimal configurations
 */

// Use backend proxy to avoid CORS issues
const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || "https://uffp-backend.vercel.app";
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
 * Philosophy: Triangular is the default for ~70% of drivers
 */
function fallbackAnalysis(driverName: string): DriverRecommendation {
  const name = driverName.toLowerCase();

  // Binary patterns (yes/no events)
  if (
    name.includes("approval") ||
    name.includes("launch") ||
    name.includes("failure") ||
    name.includes("event") ||
    name.includes("happens")
  ) {
    return {
      type: "binary",
      direction:
        name.includes("failure") || name.includes("risk")
          ? "decreases"
          : "increases",
      reasoning: "Yes/no event - binary outcome",
      examples: { probability: 50 },
    };
  }

  // Lognormal patterns (RARE - only explosive growth or emerging markets)
  if (
    (name.includes("tam") &&
      (name.includes("emerging") || name.includes("new"))) ||
    name.includes("viral") ||
    (name.includes("growth") && name.includes("factor"))
  ) {
    return {
      type: "continuous",
      distribution: "lognormal",
      direction: "increases",
      reasoning: "Explosive growth potential - lognormal for fat tails",
      examples: { p5: 10, p50: 50, p95: 200 },
    };
  }

  // Everything else defaults to TRIANGULAR
  // Determine direction based on context
  const decreasesOutcome =
    name.includes("cost") ||
    name.includes("expense") ||
    name.includes("delay") ||
    name.includes("time") ||
    name.includes("risk") ||
    name.includes("competitor");

  return {
    type: "continuous",
    distribution: "triangular",
    direction: decreasesOutcome ? "decreases" : "increases",
    reasoning:
      "Standard bounded range - triangular is most natural for expert estimates",
    examples: { p5: 20, p50: 50, p95: 80 },
  };
}
