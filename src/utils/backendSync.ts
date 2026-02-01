/**
 * Backend sync utilities for gradual migration from local to backend storage
 */

import { researchService } from "../services/researchService";
import { Platform } from "react-native";

export const TEMP_USER_ID = "anonymous-user-" + Date.now();

/**
 * Sync mode: controls how data is persisted
 * - 'local-only': Use AsyncStorage/localStorage only (current behavior)
 * - 'backend-primary': Use backend, fall back to local on error
 * - 'backend-only': Use backend only, fail if backend unavailable
 */
export type SyncMode = "local-only" | "backend-primary" | "backend-only";

// Start with backend-primary for gradual rollout
let currentSyncMode: SyncMode = "backend-primary";

export function setSyncMode(mode: SyncMode) {
  currentSyncMode = mode;
  console.log(`[BackendSync] Mode set to: ${mode}`);
}

export function getSyncMode(): SyncMode {
  return currentSyncMode;
}

/**
 * Map local SavedForecast to backend format
 */
export function mapLocalToBackend(localForecast: any): any {
  return {
    userId: localForecast.userId || TEMP_USER_ID,
    question: localForecast.question,
    domain: localForecast.domain,
    timeframe: localForecast.timeframe,
    resolutionCriteria:
      localForecast.resolutionCriteria ||
      `Forecast resolves when outcome is known for: ${localForecast.question}`,
    probability: localForecast.probability,
    resolved: localForecast.resolved,
    actualOutcome: localForecast.actualOutcome,
  };
}

/**
 * Map backend forecast to local SavedForecast format
 */
export function mapBackendToLocal(backendForecast: any): any {
  return {
    id: backendForecast.id,
    question: backendForecast.question,
    domain: backendForecast.domain,
    timeframe: backendForecast.timeframe,
    grounding: backendForecast.grounding,
    probability: backendForecast.probability,
    drivers: backendForecast.drivers || [],
    simulations: backendForecast.simulations || [], // IMPORTANT: Map simulations array for charts
    createdAt: backendForecast.createdAt,
    updatedAt: backendForecast.updatedAt,
    resolved: backendForecast.resolved || false,
    actualOutcome: backendForecast.actualOutcome,
    resolvedAt: backendForecast.resolvedAt,
    brierScore: backendForecast.brierScore,
    userId: backendForecast.userId,
  };
}

/**
 * Load forecasts with backend sync
 */
export async function loadForecastsWithSync(params?: {
  status?: "draft" | "active" | "resolved";
  limit?: number;
}): Promise<{ forecasts: any[]; fromBackend: boolean; error?: string }> {
  if (currentSyncMode === "local-only") {
    return { forecasts: [], fromBackend: false };
  }

  try {
    console.log("[BackendSync] Loading forecasts from backend...");
    const result = await researchService.listForecasts({
      userId: TEMP_USER_ID,
      status: params?.status,
      limit: params?.limit || 50,
    });

    if (result.success && result.forecasts) {
      const mapped = result.forecasts.map(mapBackendToLocal);
      console.log(
        `[BackendSync] Loaded ${mapped.length} forecasts from backend`,
      );
      return { forecasts: mapped, fromBackend: true };
    }

    throw new Error("Backend response missing forecasts");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[BackendSync] Failed to load from backend:", errorMsg);

    if (currentSyncMode === "backend-only") {
      throw error;
    }

    // Fall back to local storage
    return { forecasts: [], fromBackend: false, error: errorMsg };
  }
}

/**
 * Create forecast with backend sync
 */
export async function createForecastWithSync(data: {
  question: string;
  domain?: string;
  timeframe?: string;
  parsedData?: any;
}): Promise<{ forecast: any; fromBackend: boolean; error?: string }> {
  if (currentSyncMode === "local-only") {
    // Return local-only forecast
    const localForecast = {
      id: `local-${Date.now()}`,
      question: data.question,
      domain: data.domain || "general",
      timeframe: data.timeframe,
      drivers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolved: false,
    };
    return { forecast: localForecast, fromBackend: false };
  }

  try {
    console.log("[BackendSync] Creating forecast on backend...", {
      userId: TEMP_USER_ID,
      question: data.question,
      domain: data.domain || data.parsedData?.domain || "general",
    });
    const result = await researchService.createForecast({
      userId: TEMP_USER_ID,
      question: data.question,
      domain: data.domain || data.parsedData?.domain || "general",
      timeframe: data.timeframe || data.parsedData?.timeframe,
      resolutionCriteria: `Forecast resolves when outcome is known for: ${data.question}`,
    });

    console.log("[BackendSync] Backend create response:", result);

    if (result.success && result.forecast) {
      const mapped = mapBackendToLocal(result.forecast);
      console.log(`[BackendSync] Created forecast ${mapped.id} on backend`);
      return { forecast: mapped, fromBackend: true };
    }

    throw new Error("Backend response missing forecast");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(
      "[BackendSync] Failed to create on backend:",
      errorMsg,
      error,
    );

    if (currentSyncMode === "backend-only") {
      throw error;
    }

    // Fall back to local-only forecast
    const localForecast = {
      id: `local-${Date.now()}`,
      question: data.question,
      domain: data.domain || "general",
      timeframe: data.timeframe,
      drivers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolved: false,
    };
    return { forecast: localForecast, fromBackend: false, error: errorMsg };
  }
}

/**
 * Add driver with backend sync
 */
export async function addDriverWithSync(
  forecastId: string,
  driverData: any,
): Promise<{ success: boolean; forecast?: any; error?: string }> {
  // Skip if local-only ID
  if (forecastId.startsWith("local-")) {
    console.log("[BackendSync] Skipping driver add for local-only forecast");
    return { success: true };
  }

  if (currentSyncMode === "local-only") {
    return { success: true };
  }

  try {
    console.log(`[BackendSync] Adding driver to forecast ${forecastId}...`);
    const result = await researchService.addDriver(forecastId, driverData);

    if (result.success && result.forecast) {
      const mapped = mapBackendToLocal(result.forecast);
      console.log("[BackendSync] Driver added successfully");
      return { success: true, forecast: mapped };
    }

    throw new Error("Backend response missing forecast");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[BackendSync] Failed to add driver:", errorMsg);

    if (currentSyncMode === "backend-only") {
      throw error;
    }

    return { success: false, error: errorMsg };
  }
}

/**
 * Run simulation with backend sync
 */
export async function runSimulationWithSync(
  forecastId: string,
  iterations: number = 10000,
): Promise<{
  success: boolean;
  probability?: number;
  forecast?: any;
  simulationData?: any;
  error?: string;
}> {
  // Skip if local-only ID
  if (forecastId.startsWith("local-")) {
    console.log("[BackendSync] Skipping simulation for local-only forecast");
    return { success: false, error: "Cannot simulate local-only forecasts" };
  }

  try {
    console.log(
      `[BackendSync] Running simulation for forecast ${forecastId}...`,
    );
    const result = await researchService.simulate(forecastId, iterations);

    if (result.success && result.simulation) {
      const probability = result.simulation.probability;
      const forecast = result.forecast
        ? mapBackendToLocal(result.forecast)
        : undefined;

      console.log(`[BackendSync] Simulation complete: ${probability}`);
      return { success: true, probability, forecast };
    }

    throw new Error("Backend response missing simulation");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[BackendSync] Simulation failed:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Resolve forecast with backend sync
 */
export async function resolveForecastWithSync(
  forecastId: string,
  actualOutcome: boolean,
): Promise<{
  success: boolean;
  brierScore?: number;
  forecast?: any;
  error?: string;
}> {
  // Skip if local-only ID
  if (forecastId.startsWith("local-")) {
    console.log("[BackendSync] Skipping resolution for local-only forecast");
    return { success: false, error: "Cannot resolve local-only forecasts" };
  }

  try {
    console.log(`[BackendSync] Resolving forecast ${forecastId}...`);
    const result = await researchService.resolveForecast(
      forecastId,
      actualOutcome,
    );

    if (result.success) {
      const forecast = result.forecast
        ? mapBackendToLocal(result.forecast)
        : undefined;
      console.log(
        `[BackendSync] Resolved with Brier score: ${result.brierScore}`,
      );
      return {
        success: true,
        brierScore: result.brierScore,
        forecast,
      };
    }

    throw new Error("Backend response invalid");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[BackendSync] Resolution failed:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Get user stats from backend
 */
export async function getUserStatsFromBackend(): Promise<{
  success: boolean;
  stats?: any;
  error?: string;
}> {
  if (currentSyncMode === "local-only") {
    return { success: false, error: "Local-only mode" };
  }

  try {
    console.log("[BackendSync] Fetching user stats...");
    const result = await researchService.getUserStats(TEMP_USER_ID);

    if (result.success && result.stats) {
      console.log("[BackendSync] User stats retrieved");
      return { success: true, stats: result.stats };
    }

    throw new Error("Backend response missing stats");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[BackendSync] Failed to get stats:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Get leaderboard from backend
 */
export async function getLeaderboardFromBackend(params?: {
  domain?: string;
  limit?: number;
}): Promise<{ success: boolean; leaderboard?: any[]; error?: string }> {
  if (currentSyncMode === "local-only") {
    return { success: false, error: "Local-only mode" };
  }

  try {
    console.log("[BackendSync] Fetching leaderboard...");
    const result = await researchService.getLeaderboard(params);

    if (result.success && result.leaderboard) {
      console.log(
        `[BackendSync] Leaderboard retrieved (${result.leaderboard.length} entries)`,
      );
      return { success: true, leaderboard: result.leaderboard };
    }

    throw new Error("Backend response missing leaderboard");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[BackendSync] Failed to get leaderboard:", errorMsg);
    return { success: false, error: errorMsg };
  }
}
