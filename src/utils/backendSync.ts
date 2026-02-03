/**
 * Backend sync utilities for gradual migration from local to backend storage
 */

import { researchService } from "../services/researchService";
import { authService } from "../services/authService";
import { Platform, AsyncStorage } from "react-native";
import { validateForecast, formatValidationResults } from "./schemaValidator";

// Get user ID - prefer authenticated user, fallback to anonymous
async function getUserId(): Promise<string> {
  // Check if user is authenticated
  const authState = authService.getState();
  if (authState.isAuthenticated && authState.user) {
    console.log(
      "[BackendSync] Using authenticated user ID:",
      authState.user.id,
    );
    return authState.user.id;
  }

  // Fallback to anonymous user for backward compatibility
  return await getAnonymousUserId();
}

// Legacy anonymous user ID system (for unauthenticated users)
let ANONYMOUS_USER_ID: string | null = null;

async function getAnonymousUserId(): Promise<string> {
  if (ANONYMOUS_USER_ID) return ANONYMOUS_USER_ID;

  const STORAGE_KEY = "@uffp_anonymous_id";

  try {
    const stored =
      Platform.OS === "web"
        ? localStorage.getItem(STORAGE_KEY)
        : await AsyncStorage.getItem(STORAGE_KEY);

    if (stored) {
      ANONYMOUS_USER_ID = stored;
      console.log("[BackendSync] Using anonymous ID:", ANONYMOUS_USER_ID);
      return ANONYMOUS_USER_ID;
    }

    // Generate new anonymous ID
    ANONYMOUS_USER_ID =
      "anonymous-user-" +
      Date.now() +
      "-" +
      Math.random().toString(36).substring(7);

    if (Platform.OS === "web") {
      localStorage.setItem(STORAGE_KEY, ANONYMOUS_USER_ID);
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, ANONYMOUS_USER_ID);
    }

    console.log("[BackendSync] Generated anonymous ID:", ANONYMOUS_USER_ID);
    return ANONYMOUS_USER_ID;
  } catch (error) {
    console.error("[BackendSync] Failed to get/set anonymous ID:", error);
    ANONYMOUS_USER_ID = "anonymous-user-" + Date.now();
    return ANONYMOUS_USER_ID;
  }
}

export const TEMP_USER_ID = "anonymous-user-temp"; // Legacy export

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
  // Map drivers - keep both agents and researchResults as separate fields
  const drivers = (backendForecast.drivers || []).map((driver: any) => ({
    ...driver,
    agents: driver.agents || [],
    researchResults: driver.researchResults || [],
  }));

  return {
    id: backendForecast.id,
    question: backendForecast.question,
    domain: backendForecast.domain,
    timeframe: backendForecast.timeframe,
    grounding: backendForecast.grounding,
    probability: backendForecast.probability,
    drivers,
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
    const userId = await getUserId();
    console.log(
      "[BackendSync] Loading forecasts from backend for user:",
      userId,
    );
    const result = await researchService.listForecasts({
      userId,
      status: params?.status,
      limit: params?.limit || 50,
    });

    if (result.success && result.forecasts) {
      const mapped = result.forecasts.map(mapBackendToLocal);
      console.log(
        `[BackendSync] Loaded ${mapped.length} forecasts from backend`,
      );

      // Validate loaded forecasts
      let validCount = 0;
      let errorCount = 0;
      mapped.forEach((forecast: any) => {
        const validationResult = validateForecast(forecast);
        if (!validationResult.valid) {
          console.error(
            `[BackendSync] Loaded forecast ${forecast.id} has validation errors:`,
          );
          console.error(formatValidationResults(validationResult));
          errorCount++;
        } else if (validationResult.warnings.length > 0) {
          console.warn(
            `[BackendSync] Loaded forecast ${forecast.id} has warnings:`,
          );
          console.warn(formatValidationResults(validationResult));
        }
        validCount++;
      });

      if (errorCount > 0) {
        console.warn(
          `[BackendSync] ${errorCount}/${mapped.length} forecasts have validation errors`,
        );
      }

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
  privacy?: "private" | "unlisted" | "public" | "organization";
  tags?: string[];
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
      version: { major: 1, minor: 0 },
      versionHistory: [],
    };
    return { forecast: localForecast, fromBackend: false };
  }

  try {
    const userId = await getUserId();
    console.log("[BackendSync] Creating forecast on backend...", {
      userId,
      question: data.question,
      domain: data.domain || data.parsedData?.domain || "general",
    });
    const result = await researchService.createForecast({
      userId,
      question: data.question,
      domain: data.domain || data.parsedData?.domain || "general",
      timeframe: data.timeframe || data.parsedData?.timeframe,
      resolutionCriteria: `Forecast resolves when outcome is known for: ${data.question}`,
      privacy: data.privacy || "private",
      tags: data.tags || [],
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
      version: { major: 1, minor: 0 },
      versionHistory: [],
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
): Promise<{
  success: boolean;
  forecast?: any;
  error?: string;
  validationWarnings?: string[];
}> {
  // For local-only forecasts, return success but indicate no backend sync
  // The caller (saveConfiguredDriver) will handle local persistence
  if (forecastId.startsWith("local-")) {
    console.log(
      "[BackendSync] Local-only forecast - caller will persist locally",
    );
    return { success: false, error: "local-only" };
  }

  if (currentSyncMode === "local-only") {
    console.log(
      "[BackendSync] Sync mode is local-only - caller will persist locally",
    );
    return { success: false, error: "local-only" };
  }

  try {
    console.log(`[BackendSync] Adding driver to forecast ${forecastId}...`);

    // Backend expects both agents and researchResults
    // Keep both fields - they serve different purposes:
    // - agents: configuration (what to research, when)
    // - researchResults: outputs (point-in-time research snapshots)
    const backendDriverData = {
      ...driverData,
      agents: driverData.agents || [],
      researchResults: driverData.researchResults || [],
    };

    // Validate driver data before sending to backend
    // Create a temporary forecast object for validation
    const tempForecast = {
      id: forecastId,
      question: "Validation placeholder",
      drivers: [backendDriverData],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const validationResult = validateForecast(tempForecast as any);

    if (!validationResult.valid) {
      console.error("[BackendSync] Driver validation failed:");
      console.error(formatValidationResults(validationResult));
      return {
        success: false,
        error: `Validation failed: ${validationResult.errors.map((e) => e.message).join(", ")}`,
      };
    }

    // Log warnings but don't block
    if (validationResult.warnings.length > 0) {
      console.warn("[BackendSync] Driver validation warnings:");
      console.warn(formatValidationResults(validationResult));
    }

    const result = await researchService.addDriver(
      forecastId,
      backendDriverData,
    );

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
 * Set base rate with backend sync
 */
export async function setBaseRateWithSync(
  forecastId: string,
  baseRateData: {
    referenceClass: string;
    baseRate: number;
    source?: string;
    generatedBy?: "fermi" | "user";
    confidence?: "high" | "medium" | "low";
    reasoning?: string;
  },
): Promise<{
  success: boolean;
  forecast?: any;
  error?: string;
}> {
  // Skip if local-only ID
  if (forecastId.startsWith("local-")) {
    console.log(
      "[BackendSync] Skipping base rate sync for local-only forecast",
    );
    return { success: false, error: "Cannot sync local-only forecasts" };
  }

  try {
    console.log(
      `[BackendSync] Setting base rate for forecast ${forecastId}...`,
    );
    const result = await researchService.setBaseRate(forecastId, {
      ...baseRateData,
      updatedAt: new Date().toISOString(),
    });

    if (result.success && result.forecast) {
      const forecast = mapBackendToLocal(result.forecast);
      console.log(`[BackendSync] Base rate updated successfully`);
      return { success: true, forecast };
    }

    throw new Error("Backend response invalid");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[BackendSync] Base rate update failed:", errorMsg);
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
    const userId = await getUserId();
    console.log("[BackendSync] Fetching user stats for:", userId);
    const result = await researchService.getUserStats(userId);

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
