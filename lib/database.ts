/**
 * Database layer for forecasts
 *
 * For now using in-memory storage.
 * Later will migrate to Vercel KV or PostgreSQL
 */

import type {
  Forecast,
  Driver,
  Evidence,
  ResearchSnapshot,
  Simulation,
  ForecastVersion,
  DriverVersion,
} from "./types";

// In-memory storage (will be replaced with KV)
const forecasts = new Map<string, Forecast>();
const researchResults = new Map<string, any>();

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new forecast
 */
export async function createForecast(data: {
  userId?: string;
  question: string;
  domain?: string;
  timeframe?: string;
  resolutionCriteria: string;
}): Promise<Forecast> {
  const id = generateId();

  const forecast: Forecast = {
    id,
    userId: data.userId,
    question: data.question,
    domain: data.domain,
    timeframe: data.timeframe,
    resolutionCriteria: data.resolutionCriteria,
    drivers: [],
    evidence: [],
    simulations: [],
    currentVersion: 1,
    versions: [],
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  forecasts.set(id, forecast);

  return forecast;
}

/**
 * Get forecast by ID
 */
export async function getForecast(id: string): Promise<Forecast | null> {
  return forecasts.get(id) || null;
}

/**
 * List all forecasts (optionally filtered by userId)
 */
export async function listForecasts(filters?: {
  userId?: string;
  status?: "draft" | "active" | "resolved";
  limit?: number;
  offset?: number;
}): Promise<{ forecasts: Forecast[]; total: number }> {
  let allForecasts = Array.from(forecasts.values());

  // Filter by userId
  if (filters?.userId) {
    allForecasts = allForecasts.filter((f) => f.userId === filters.userId);
  }

  // Filter by status
  if (filters?.status) {
    allForecasts = allForecasts.filter((f) => f.status === filters.status);
  }

  // Sort by updatedAt desc
  allForecasts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const total = allForecasts.length;

  // Pagination
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;
  const paginated = allForecasts.slice(offset, offset + limit);

  return {
    forecasts: paginated,
    total,
  };
}

/**
 * Update forecast
 */
export async function updateForecast(
  id: string,
  updates: Partial<Forecast>,
): Promise<Forecast> {
  const forecast = forecasts.get(id);
  if (!forecast) {
    throw new Error("Forecast not found");
  }

  const updated = {
    ...forecast,
    ...updates,
    updatedAt: new Date(),
  };

  forecasts.set(id, updated);

  return updated;
}

/**
 * Delete forecast
 */
export async function deleteForecast(id: string): Promise<void> {
  forecasts.delete(id);
}

/**
 * Add driver to forecast
 */
export async function addDriver(
  forecastId: string,
  driver: Omit<
    Driver,
    "id" | "createdAt" | "updatedAt" | "currentVersion" | "versions"
  >,
): Promise<Forecast> {
  const forecast = forecasts.get(forecastId);
  if (!forecast) {
    throw new Error("Forecast not found");
  }

  const newDriver: Driver = {
    ...driver,
    id: generateId(),
    agents: driver.agents || [],
    evidence: driver.evidence || [],
    researchResults: driver.researchResults || [],
    currentVersion: 1,
    versions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  forecast.drivers.push(newDriver);
  forecast.updatedAt = new Date();

  forecasts.set(forecastId, forecast);

  return forecast;
}

/**
 * Update driver
 */
export async function updateDriver(
  forecastId: string,
  driverId: string,
  updates: Partial<Driver>,
  changeReason?: string,
): Promise<Forecast> {
  const forecast = forecasts.get(forecastId);
  if (!forecast) {
    throw new Error("Forecast not found");
  }

  const driverIndex = forecast.drivers.findIndex((d) => d.id === driverId);
  if (driverIndex === -1) {
    throw new Error("Driver not found");
  }

  const driver = forecast.drivers[driverIndex];

  // Create version snapshot before updating
  const version: DriverVersion = {
    version: driver.currentVersion,
    probability: driver.probability,
    p5: driver.p5,
    p50: driver.p50,
    p95: driver.p95,
    evidence: [...driver.evidence],
    research: [...driver.researchResults],
    changeReason,
    createdAt: new Date(),
  };

  driver.versions.push(version);

  // Apply updates
  forecast.drivers[driverIndex] = {
    ...driver,
    ...updates,
    currentVersion: driver.currentVersion + 1,
    updatedAt: new Date(),
  };

  forecast.updatedAt = new Date();
  forecasts.set(forecastId, forecast);

  return forecast;
}

/**
 * Remove driver
 */
export async function removeDriver(
  forecastId: string,
  driverId: string,
): Promise<Forecast> {
  const forecast = forecasts.get(forecastId);
  if (!forecast) {
    throw new Error("Forecast not found");
  }

  forecast.drivers = forecast.drivers.filter((d) => d.id !== driverId);
  forecast.updatedAt = new Date();

  forecasts.set(forecastId, forecast);

  return forecast;
}

/**
 * Add evidence to forecast or driver
 */
export async function addEvidence(
  forecastId: string,
  evidence: Omit<Evidence, "id" | "timestamp">,
  driverId?: string,
): Promise<Forecast> {
  const forecast = forecasts.get(forecastId);
  if (!forecast) {
    throw new Error("Forecast not found");
  }

  const newEvidence: Evidence = {
    ...evidence,
    id: generateId(),
    timestamp: new Date(),
  };

  if (driverId) {
    // Add to specific driver
    const driver = forecast.drivers.find((d) => d.id === driverId);
    if (!driver) {
      throw new Error("Driver not found");
    }
    driver.evidence.push(newEvidence);
  } else if (evidence.attachedTo === "forecast") {
    // Add to forecast
    forecast.evidence.push(newEvidence);
  } else if (evidence.attachedTo === "baseRate" && forecast.baseRate) {
    // Add to base rate
    forecast.baseRate.evidence.push(newEvidence);
  }

  forecast.updatedAt = new Date();
  forecasts.set(forecastId, forecast);

  return forecast;
}

/**
 * Set base rate for forecast
 */
export async function setBaseRate(
  forecastId: string,
  baseRate: Omit<import("./types").BaseRate, "capturedAt" | "evidence">,
): Promise<Forecast> {
  const forecast = forecasts.get(forecastId);
  if (!forecast) {
    throw new Error("Forecast not found");
  }

  forecast.baseRate = {
    ...baseRate,
    evidence: [],
    capturedAt: new Date(),
  };

  forecast.updatedAt = new Date();
  forecasts.set(forecastId, forecast);

  return forecast;
}

/**
 * Save research result
 */
export async function saveResearchResult(result: any): Promise<void> {
  researchResults.set(result.id, result);
}

/**
 * Attach research to driver
 */
export async function attachResearch(
  forecastId: string,
  driverId: string,
  researchSnapshot: ResearchSnapshot,
): Promise<Forecast> {
  const forecast = forecasts.get(forecastId);
  if (!forecast) {
    throw new Error("Forecast not found");
  }

  const driver = forecast.drivers.find((d) => d.id === driverId);
  if (!driver) {
    throw new Error("Driver not found");
  }

  driver.researchResults.push(researchSnapshot);
  forecast.updatedAt = new Date();

  forecasts.set(forecastId, forecast);

  return forecast;
}

/**
 * Save simulation result
 */
export async function saveSimulation(
  forecastId: string,
  simulation: Omit<Simulation, "id">,
): Promise<Forecast> {
  const forecast = forecasts.get(forecastId);
  if (!forecast) {
    throw new Error("Forecast not found");
  }

  const newSimulation: Simulation = {
    ...simulation,
    id: generateId(),
  };

  forecast.simulations.push(newSimulation);
  forecast.probability = simulation.probability;
  forecast.updatedAt = new Date();

  forecasts.set(forecastId, forecast);

  return forecast;
}

/**
 * Create forecast version snapshot
 */
export async function createForecastVersion(
  forecastId: string,
  changeReason?: string,
  changedBy?: "user" | "coach" | "research",
): Promise<Forecast> {
  const forecast = forecasts.get(forecastId);
  if (!forecast) {
    throw new Error("Forecast not found");
  }

  const version: ForecastVersion = {
    version: forecast.currentVersion,
    probability: forecast.probability,
    baseRate: forecast.baseRate,
    drivers: forecast.drivers.map((d) => ({ ...d })),
    evidence: forecast.evidence.map((e) => ({ ...e })),
    research: forecast.drivers.flatMap((d) => d.researchResults),
    changeReason,
    changedBy,
    createdAt: new Date(),
  };

  forecast.versions.push(version);
  forecast.currentVersion += 1;
  forecast.updatedAt = new Date();

  forecasts.set(forecastId, forecast);

  return forecast;
}

/**
 * Resolve forecast
 */
export async function resolveForecast(
  forecastId: string,
  resolution: "yes" | "no" | "ambiguous",
  actualProbability?: number,
): Promise<Forecast> {
  const forecast = forecasts.get(forecastId);
  if (!forecast) {
    throw new Error("Forecast not found");
  }

  forecast.status = "resolved";
  forecast.resolution = resolution;
  forecast.resolvedAt = new Date();

  // Calculate Brier score if we have a probability
  if (forecast.probability !== undefined) {
    const actual = resolution === "yes" ? 1 : resolution === "no" ? 0 : 0.5;
    const predicted = forecast.probability;
    forecast.brierScore = Math.pow(predicted - actual, 2);
  }

  forecast.updatedAt = new Date();
  forecasts.set(forecastId, forecast);

  return forecast;
}

/**
 * Get user statistics
 */
export async function getUserStats(userId: string): Promise<{
  totalForecasts: number;
  resolvedForecasts: number;
  averageBrierScore: number;
  byDomain: Record<string, { count: number; avgBrier: number }>;
}> {
  const userForecasts = Array.from(forecasts.values()).filter(
    (f) => f.userId === userId,
  );

  const resolved = userForecasts.filter((f) => f.status === "resolved");
  const withBrier = resolved.filter((f) => f.brierScore !== undefined);

  const avgBrier =
    withBrier.length > 0
      ? withBrier.reduce((sum, f) => sum + (f.brierScore || 0), 0) /
        withBrier.length
      : 0;

  // By domain
  const byDomain: Record<string, { count: number; avgBrier: number }> = {};

  for (const forecast of resolved) {
    const domain = forecast.domain || "general";
    if (!byDomain[domain]) {
      byDomain[domain] = { count: 0, avgBrier: 0 };
    }
    byDomain[domain].count++;
    if (forecast.brierScore !== undefined) {
      byDomain[domain].avgBrier += forecast.brierScore;
    }
  }

  // Average the Brier scores
  for (const domain in byDomain) {
    if (byDomain[domain].count > 0) {
      byDomain[domain].avgBrier /= byDomain[domain].count;
    }
  }

  return {
    totalForecasts: userForecasts.length,
    resolvedForecasts: resolved.length,
    averageBrierScore: avgBrier,
    byDomain,
  };
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(options?: {
  domain?: string;
  limit?: number;
}): Promise<
  Array<{
    userId: string;
    brierScore: number;
    forecastCount: number;
  }>
> {
  const userScores = new Map<string, { total: number; count: number }>();

  for (const forecast of forecasts.values()) {
    if (
      !forecast.userId ||
      forecast.status !== "resolved" ||
      !forecast.brierScore
    ) {
      continue;
    }

    // Filter by domain if specified
    if (options?.domain && forecast.domain !== options.domain) {
      continue;
    }

    if (!userScores.has(forecast.userId)) {
      userScores.set(forecast.userId, { total: 0, count: 0 });
    }

    const score = userScores.get(forecast.userId)!;
    score.total += forecast.brierScore;
    score.count++;
  }

  const leaderboard = Array.from(userScores.entries()).map(
    ([userId, score]) => ({
      userId,
      brierScore: score.total / score.count,
      forecastCount: score.count,
    }),
  );

  // Sort by Brier score (lower is better)
  leaderboard.sort((a, b) => a.brierScore - b.brierScore);

  const limit = options?.limit || 100;
  return leaderboard.slice(0, limit);
}
