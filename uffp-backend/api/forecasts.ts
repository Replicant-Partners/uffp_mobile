import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  createForecast,
  getForecast,
  listForecasts,
  addDriver,
  updateDriver,
  removeDriver,
  addEvidence,
  setBaseRate,
  saveSimulation,
  getUserStats,
  getLeaderboard,
} from "../lib/database";
import { coach } from "../lib/coach";
import { setCorsHeaders } from "./cors";

/**
 * Unified forecasts API
 * /api/forecasts?action=xxx
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  setCorsHeaders(res);

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    // Parse question
    if (action === "parse" && req.method === "POST") {
      const { userInput } = req.body;
      if (!userInput)
        return res.status(400).json({ error: "Missing userInput" });

      const parsed = await coach.parseQuestion(userInput);
      return res.status(200).json({ success: true, parsed });
    }

    // GET requests
    if (req.method === "GET") {
      if (action === "get") {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: "Missing id" });

        const forecast = await getForecast(id as string);
        if (!forecast) return res.status(404).json({ error: "Not found" });

        return res.status(200).json({ success: true, forecast });
      }

      if (action === "list") {
        const { userId, status, limit, offset } = req.query;
        const result = await listForecasts({
          userId: userId as string,
          status: status as any,
          limit: limit ? parseInt(limit as string) : undefined,
          offset: offset ? parseInt(offset as string) : undefined,
        });
        return res.status(200).json({ success: true, ...result });
      }

      if (action === "stats") {
        const { userId, leaderboard, domain, limit } = req.query;

        if (leaderboard === "true") {
          const leaders = await getLeaderboard({
            domain: domain as string,
            limit: limit ? parseInt(limit as string) : undefined,
          });
          return res.status(200).json({ success: true, leaderboard: leaders });
        } else if (userId) {
          const stats = await getUserStats(userId as string);
          return res.status(200).json({ success: true, stats });
        }
        return res
          .status(400)
          .json({ error: "Provide userId or leaderboard=true" });
      }
    }

    // POST requests
    if (req.method === "POST") {
      if (action === "create") {
        const { userId, question, domain, timeframe, resolutionCriteria } =
          req.body;
        if (!question || !resolutionCriteria) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        const forecast = await createForecast({
          userId,
          question,
          domain,
          timeframe,
          resolutionCriteria,
        });
        return res.status(201).json({ success: true, forecast });
      }

      if (action === "addDriver") {
        const { forecastId, driver } = req.body;
        if (!forecastId || !driver)
          return res.status(400).json({ error: "Missing fields" });

        const forecast = await addDriver(forecastId, driver);
        return res.status(200).json({ success: true, forecast });
      }

      if (action === "updateDriver") {
        const { forecastId, driverId, updates, changeReason } = req.body;
        if (!forecastId || !driverId || !updates)
          return res.status(400).json({ error: "Missing fields" });

        const forecast = await updateDriver(
          forecastId,
          driverId,
          updates,
          changeReason,
        );
        return res.status(200).json({ success: true, forecast });
      }

      if (action === "removeDriver") {
        const { forecastId, driverId } = req.body;
        if (!forecastId || !driverId)
          return res.status(400).json({ error: "Missing fields" });

        const forecast = await removeDriver(forecastId, driverId);
        return res.status(200).json({ success: true, forecast });
      }

      if (action === "addEvidence") {
        const { forecastId, evidence, driverId } = req.body;
        if (!forecastId || !evidence)
          return res.status(400).json({ error: "Missing fields" });

        const forecast = await addEvidence(forecastId, evidence, driverId);
        return res.status(200).json({ success: true, forecast });
      }

      if (action === "setBaseRate") {
        const { forecastId, baseRate } = req.body;
        if (!forecastId || !baseRate)
          return res.status(400).json({ error: "Missing fields" });

        const forecast = await setBaseRate(forecastId, baseRate);
        return res.status(200).json({ success: true, forecast });
      }

      if (action === "simulate") {
        const { forecastId, iterations = 10000 } = req.body;
        if (!forecastId)
          return res.status(400).json({ error: "Missing forecastId" });

        const forecast = await getForecast(forecastId);
        if (!forecast)
          return res.status(404).json({ error: "Forecast not found" });
        if (forecast.drivers.length === 0)
          return res.status(400).json({ error: "No drivers" });

        const startTime = Date.now();
        const result = runMonteCarloSimulation(forecast.drivers, iterations);
        const runtime = Date.now() - startTime;

        const simulation = {
          forecastId,
          iterations,
          driverSnapshot: forecast.drivers,
          probability: result.probability,
          distribution: result.distribution,
          cost: 0.02,
          runtime,
          executedAt: new Date(),
        };

        const updated = await saveSimulation(forecastId, simulation);
        return res
          .status(200)
          .json({ success: true, simulation, forecast: updated });
      }

      if (action === "update") {
        const { forecastId, updates } = req.body;
        if (!forecastId || !updates)
          return res.status(400).json({ error: "Missing fields" });

        const forecast = await getForecast(forecastId);
        if (!forecast)
          return res.status(404).json({ error: "Forecast not found" });

        // Update allowed fields
        const updatedForecast = {
          ...forecast,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        // Save updated forecast (reuse saveSimulation or add updateForecast to database.ts)
        // For now, we can update via the KV store directly
        const { updateForecast: dbUpdateForecast } =
          await import("../lib/database");
        const result = await dbUpdateForecast(forecastId, updatedForecast);
        return res.status(200).json({ success: true, forecast: result });
      }

      if (action === "resolve") {
        const { forecastId, actualOutcome, resolvedAt } = req.body;
        if (!forecastId || actualOutcome === undefined) {
          return res
            .status(400)
            .json({ error: "Missing forecastId or actualOutcome" });
        }

        const forecast = await getForecast(forecastId);
        if (!forecast)
          return res.status(404).json({ error: "Forecast not found" });
        if (!forecast.probability) {
          return res
            .status(400)
            .json({ error: "Forecast must be simulated before resolution" });
        }

        // Calculate Brier score
        const prediction = forecast.probability;
        const outcome = actualOutcome ? 1 : 0;
        const brierScore = Math.pow(prediction - outcome, 2);

        // Update forecast with resolution
        const { updateForecast: dbUpdateForecast } =
          await import("../lib/database");
        const resolvedForecast = await dbUpdateForecast(forecastId, {
          ...forecast,
          resolution: actualOutcome,
          resolvedAt: resolvedAt || new Date().toISOString(),
          brierScore,
          status: "resolved",
        });

        return res
          .status(200)
          .json({ success: true, forecast: resolvedForecast, brierScore });
      }
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    console.error("Forecast error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

/**
 * Sample from a triangular distribution
 */
function sampleTriangular(min: number, mode: number, max: number): number {
  const u = Math.random();
  const f = (mode - min) / (max - min);

  if (u < f) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  } else {
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }
}

/**
 * Sample from a normal distribution using Box-Muller transform
 */
function sampleNormal(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * stdDev;
}

/**
 * Sample from a lognormal distribution
 */
function sampleLogNormal(median: number, stdDev: number): number {
  const mu = Math.log(median);
  const sigma = stdDev;
  const normal = sampleNormal(mu, sigma);
  return Math.exp(normal);
}

function runMonteCarloSimulation(drivers: any[], iterations: number) {
  const outcomes: number[] = [];

  for (let i = 0; i < iterations; i++) {
    let outcome = 1;

    for (const driver of drivers) {
      if (driver.type === "binary" && driver.probability !== undefined) {
        // Binary driver: happens or doesn't happen
        if (Math.random() > driver.probability / 100) {
          outcome = 0;
          break;
        }
      } else if (driver.type === "continuous") {
        // Continuous driver: sample from distribution and apply direction
        let sample: number;

        if (
          driver.distribution === "triangular" &&
          driver.p5 !== undefined &&
          driver.p50 !== undefined &&
          driver.p95 !== undefined
        ) {
          // Triangular distribution using p5, p50, p95
          sample = sampleTriangular(driver.p5, driver.p50, driver.p95);
        } else if (
          driver.distribution === "normal" &&
          driver.p50 !== undefined &&
          driver.p95 !== undefined
        ) {
          // Normal distribution: use p50 as mean, derive stdDev from p95
          const mean = driver.p50;
          const stdDev = (driver.p95 - driver.p50) / 1.645; // p95 is ~1.645 std devs above mean
          sample = sampleNormal(mean, stdDev);
        } else if (
          driver.distribution === "lognormal" &&
          driver.p50 !== undefined &&
          driver.p95 !== undefined
        ) {
          // Lognormal distribution
          const median = driver.p50;
          const p95 = driver.p95;
          const sigma = (Math.log(p95) - Math.log(median)) / 1.645;
          sample = sampleLogNormal(median, sigma);
        } else {
          // Fallback: use p50 as deterministic value
          sample = driver.p50 || 50;
        }

        // Normalize sample to 0-1 range (assuming p values are 0-100)
        const normalizedSample = Math.max(0, Math.min(1, sample / 100));

        // Apply direction: increases = multiply outcome, decreases = multiply by (1 - sample)
        if (driver.direction === "increases") {
          outcome *= normalizedSample;
        } else if (driver.direction === "decreases") {
          outcome *= 1 - normalizedSample;
        }
      }
    }

    outcomes.push(outcome);
  }

  outcomes.sort((a, b) => a - b);

  // Calculate probability as the median of outcomes (since each outcome is already a probability)
  const medianOutcome = outcomes[Math.floor(iterations * 0.5)];
  const probability = Math.round(medianOutcome * 100) / 100; // Convert to 0-1 range

  // Create histogram for visualization (20 bins)
  const bins = 20;
  const histogram: number[] = new Array(bins).fill(0);
  const binSize = 1 / bins;

  for (const outcome of outcomes) {
    const binIndex = Math.min(Math.floor(outcome / binSize), bins - 1);
    histogram[binIndex]++;
  }

  // Normalize histogram to percentages
  const histogramPercent = histogram.map((count) => (count / iterations) * 100);

  return {
    probability,
    distribution: {
      p10: outcomes[Math.floor(iterations * 0.1)],
      p25: outcomes[Math.floor(iterations * 0.25)],
      p50: outcomes[Math.floor(iterations * 0.5)],
      p75: outcomes[Math.floor(iterations * 0.75)],
      p90: outcomes[Math.floor(iterations * 0.9)],
      histogram: histogramPercent,
      bins,
    },
  };
}
