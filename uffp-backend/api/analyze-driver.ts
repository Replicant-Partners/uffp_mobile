/**
 * Backend proxy for driver semantic analysis
 * Avoids CORS issues by calling Claude API from server-side
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const API_URL = "https://api.anthropic.com/v1/messages";

const DRIVER_CONFIG_KNOWLEDGE = `
# Driver Configuration Guide

## Type Selection:
- **Continuous**: Use for ranges and measurements (price, time, count, percentage, rate)
- **Binary**: Use for yes/no events (approval, launch, success/failure)

## Distribution Selection for Continuous Drivers:

**DEFAULT: Use Triangular (most common ~70% of cases)**

- **Triangular** (DEFAULT): Best for "best case, worst case, most likely" with clear bounds
  - Use when: Expert estimates, bounded ranges, rates/percentages, human intuition
  - Examples: Conversion rates, costs, time estimates, market share, success rates
  - WHY COMMON: Humans naturally think in min/most-likely/max, no fat tails needed

- **Normal**: ONLY when natural variation around a mean with symmetric tails
  - Use when: Measurement errors, stable processes with known variance
  - Examples: Small measurement variations, well-understood stable processes
  - RARE: Only ~10% of forecasting drivers

- **Lognormal**: ONLY for multiplicative growth or cannot-be-negative-but-could-explode
  - Use when: Compounding growth, market sizes that could be 10x-100x, viral phenomena
  - Examples: TAM for emerging markets, viral user growth, black swan risks
  - CAUTION: Don't overuse! Only ~20% of drivers are truly lognormal

## Direction:
- **Increases**: This driver going up makes the outcome more likely
- **Decreases**: This driver going up makes the outcome less likely

## Common Patterns:
| Pattern | Type | Distribution | Direction | Notes |
|---------|------|--------------|-----------|-------|
| "Conversion Rate", "Success Rate" | Continuous | **Triangular** | Increases | Bounded 0-100% |
| "Cost", "Expense", "Budget" | Continuous | **Triangular** | Decreases | Clear min/max |
| "Time", "Duration", "Delay" | Continuous | **Triangular** | Decreases | Clear bounds |
| "Market Share", "Penetration" | Continuous | **Triangular** | Increases | Bounded 0-100% |
| "TAM for emerging tech" | Continuous | Lognormal | Increases | Could be 10x-100x |
| "Viral Growth Factor" | Continuous | Lognormal | Increases | Multiplicative |
| "Approval", "Launch" | Binary | N/A | Varies | Yes/no event |

**Remember: When in doubt, use Triangular. It's the workhorse of forecasting.**
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { driverName, forecastQuestion } = req.body;

    if (!driverName) {
      return res.status(400).json({ error: "Missing driverName" });
    }

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
      const error = await response.text();
      console.error("Claude API error:", error);
      return res.status(response.status).json({
        error: "AI analysis failed",
        details: error,
      });
    }

    const data: any = await response.json();
    const content = data.content?.[0]?.text || "{}";

    // Extract JSON from response (Claude might wrap it in markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;

    const recommendation = JSON.parse(jsonStr);

    return res.status(200).json(recommendation);
  } catch (error) {
    console.error("Driver analysis error:", error);
    return res.status(500).json({
      error: "Analysis failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
