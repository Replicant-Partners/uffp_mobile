/**
 * Database layer using Vercel KV (Redis)
 * Replaces in-memory Map storage for persistence
 */

import Redis from "ioredis";
import { nanoid } from "nanoid";

let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) throw new Error("REDIS_URL required");
    redisClient = new Redis(redisUrl);
  }
  return redisClient;
}
import type {
  Forecast,
  Driver,
  Evidence,
  Simulation,
} from "./types";

/**
 * Generate unique ID using nanoid
 */
function generateId(): string {
  return nanoid(12);
}

/**
 * KV key prefixes for organization
 */
const KEYS = {
  forecast: (id: string) => `forecast:${id}`,
  userForecasts: (userId: string) => `user:${userId}:forecasts`,
  allForecasts: () => `forecasts:all`,
};

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
  const redis = getRedis();
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

  // Save to KV
  await redis.set(KEYS.forecast(id), JSON.stringify(forecast));

  // Add to user's forecast list
  if (data.userId) {
    await redis.sadd(KEYS.userForecasts(data.userId), id);
  }

  // Add to all forecasts set
  await redis.sadd(KEYS.allForecasts(), id);

  return forecast;
}

/**
 * Get a forecast by ID
 */
export async function getForecast(id: string): Promise<Forecast | null> {
  const redis = getRedis();
  const data = await redis.get(KEYS.forecast(id));
  if (!data) return null;
  
  const forecast = JSON.parse(data);
  
  // Convert date strings back to Date objects
  if (forecast.createdAt) forecast.createdAt = new Date(forecast.createdAt);
  if (forecast.updatedAt) forecast.updatedAt = new Date(forecast.updatedAt);
  
  return forecast;
}

/**
 * List forecasts with filters
 */
export async function listForecasts(options?: {
  userId?: string;
  status?: "active" | "resolved" | "all";
  limit?: number;
  offset?: number;
}): Promise<{ forecasts: Forecast[]; total: number }> {
  const { userId, status = "all", limit = 50, offset = 0 } = options || {};

  const redis = getRedis();
  // Get forecast IDs
  let forecastIds: string[];
  if (userId) {
    forecastIds = await redis.smembers(KEYS.userForecasts(userId));
  } else {
    forecastIds = await redis.smembers(KEYS.allForecasts());
  }

  // Fetch forecasts
  const forecasts: Forecast[] = [];
  for (const id of forecastIds) {
    const forecast = await getForecast(id);
    if (forecast) {
      // Filter by status
      if (status === "active" && forecast.status !== "active") continue;
      if (status === "resolved" && forecast.status !== "resolved") continue;

      forecasts.push(forecast);
    }
  }

  // Sort by updatedAt desc
  forecasts.sort((a, b) => {
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTime - aTime;
  });

  // Apply pagination
  const total = forecasts.length;
  const paginated = forecasts.slice(offset, offset + limit);

  return { forecasts: paginated, total };
}

/**
 * Update a forecast
 */
export async function updateForecast(
  id: string,
  updates: Partial<Forecast>
): Promise<Forecast> {
  const redis = getRedis();
  const forecast = await getForecast(id);
  if (!forecast) {
    throw new Error("Forecast not found");
  }

  const updated = {
    ...forecast,
    ...updates,
    updatedAt: new Date(),
  };

  await redis.set(KEYS.forecast(id), JSON.stringify(updated));
  return updated;
}

/**
 * Add a driver to a forecast
 */
export async function addDriver(
  forecastId: string,
  driver: Omit<Driver, "id" | "createdAt" | "updatedAt">
): Promise<{ forecast: Forecast; driver: Driver }> {
  const redis = getRedis();
  const forecast = await getForecast(forecastId);
  if (!forecast) {
    throw new Error("Forecast not found");
  }

  // Ensure all evidence items have IDs
  const evidenceWithIds = (driver.evidence || []).map((ev: any) => ({
    ...ev,
    id: ev.id || generateId(),
  }));

  const newDriver: Driver = {
    ...driver,
    id: generateId(),
    agents: driver.agents || [],
    evidence: evidenceWithIds,
    researchResults: driver.researchResults || [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  forecast.drivers.push(newDriver);
  forecast.updatedAt = new Date();

  await redis.set(KEYS.forecast(forecastId), JSON.stringify(forecast));

  return { forecast, driver: newDriver };
}

/**
 * Update a driver
 */
export async function updateDriver(
  forecastId: string,
  driverId: string,
  updates: Partial<Driver>
): Promise<Forecast> {
  const redis = getRedis();
  const forecast = await getForecast(forecastId);
  if (!forecast) {
    throw new Error("Forecast not found");
  }

  const driverIndex = forecast.drivers.findIndex((d) => d.id === driverId);
  if (driverIndex === -1) {
    throw new Error("Driver not found");
  }

  forecast.drivers[driverIndex] = {
    ...forecast.drivers[driverIndex],
    ...updates,
    updatedAt: new Date(),
  };
  forecast.updatedAt = new Date();

  await redis.set(KEYS.forecast(forecastId), JSON.stringify(forecast));

  return forecast;
}

/**
 * Remove a driver
 */
export async function removeDriver(
  forecastId: string,
  driverId: string
): Promise<Forecast> {
  const redis = getRedis();
  const forecast = await getForecast(forecastId);
  if (!forecast) {
    throw new Error("Forecast not found");
  }

  forecast.drivers = forecast.drivers.filter((d) => d.id !== driverId);
  forecast.updatedAt = new Date();

  await redis.set(KEYS.forecast(forecastId), JSON.stringify(forecast));

  return forecast;
}

/**
 * Save simulation results
 */
export async function saveSimulation(
  forecastId: string,
  simulation: Omit<Simulation, "id">
): Promise<Forecast> {
  const redis = getRedis();
  const forecast = await getForecast(forecastId);
  if (!forecast) {
    throw new Error("Forecast not found");
  }

  const newSimulation: Simulation = {
    ...simulation,
    id: generateId(),
  };

  forecast.simulations = forecast.simulations || [];
  forecast.simulations.push(newSimulation);
  forecast.probability = simulation.probability;
  forecast.updatedAt = new Date();

  await redis.set(KEYS.forecast(forecastId), JSON.stringify(forecast));

  return forecast;
}

/**
 * Set base rate for a forecast
 */
export async function setBaseRate(
  forecastId: string,
  baseRate: any
): Promise<Forecast> {
  const redis = getRedis();
  const forecast = await getForecast(forecastId);
  if (!forecast) {
    throw new Error("Forecast not found");
  }

  forecast.baseRate = baseRate;
  forecast.updatedAt = new Date();

  await redis.set(KEYS.forecast(forecastId), JSON.stringify(forecast));

  return forecast;
}

/**
 * Add evidence to a forecast
 */
export async function addEvidence(
  forecastId: string,
  evidence: Omit<Evidence, "id" | "timestamp">
): Promise<Forecast> {
  const redis = getRedis();
  const forecast = await getForecast(forecastId);
  if (!forecast) {
    throw new Error("Forecast not found");
  }

  const newEvidence: Evidence = {
    ...evidence,
    id: generateId(),
    timestamp: new Date().toISOString() as any,
  };

  forecast.evidence = forecast.evidence || [];
  forecast.evidence.push(newEvidence);
  forecast.updatedAt = new Date();

  await redis.set(KEYS.forecast(forecastId), JSON.stringify(forecast));

  return forecast;
}

/**
 * Get user stats (placeholder - can be enhanced)
 */
export async function getUserStats(userId: string): Promise<any> {
  const redis = getRedis();
  const { forecasts } = await listForecasts({ userId });

  const resolved = forecasts.filter((f) => f.status === "resolved");
  const totalBrierScore = resolved.reduce(
    (sum, f) => sum + (f.brierScore || 0),
    0
  );

  return {
    totalForecasts: forecasts.length,
    resolvedForecasts: resolved.length,
    averageBrierScore: resolved.length > 0 ? totalBrierScore / resolved.length : null,
  };
}

/**
 * Get leaderboard (placeholder)
 */
export async function getLeaderboard(options?: {
  domain?: string;
  limit?: number;
}): Promise<any[]> {
  const redis = getRedis();
  // For now return empty - can be enhanced later
  return [];
}
