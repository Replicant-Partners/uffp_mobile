import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  AsyncStorage,
  Dimensions,
} from "react-native";
import { BarChart, LineChart } from "react-native-chart-kit";
import { researchService } from "../services/researchService";

interface SimulationData {
  id: string;
  forecastId: string;
  iterations: number;
  driverSnapshot: any[];
  probability: number;
  distribution: {
    histogram: number[];
    bins: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  cost: number;
  runtime: number;
  executedAt: string;
  reasonForRun?: string;
}

interface DriverVersion {
  versionId: string;
  majorVersion: number;
  minorVersion: number;
  timestamp: string;
  changeType: "major" | "minor";
  changeDescription: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
    percentChange?: number;
  }[];
  snapshot: any; // Full driver state at this version
}

interface ForecastVersion {
  versionId: string;
  majorVersion: number;
  minorVersion: number;
  timestamp: string;
  changeType: "major" | "minor";
  changeDescription: string;
  snapshot: SavedForecast; // Full forecast state at this version
  triggeredSimulation?: boolean;
}

interface SavedForecast {
  id: string;
  question: string;
  domain?: string;
  timeframe?: string;
  grounding?: "external" | "premortem" | "inside view / analysis";
  externalView?: {
    referenceClass: string; // AI-suggested, user can change via /external
    baseRate?: number; // Historical probability from reference class
    source?: string; // Where the base rate came from
  };
  premortem?: {
    status: "pending" | "completed";
    failureScenarios?: string[]; // Identified failure modes
  };
  probability?: number;
  drivers: any[];
  createdAt: string;
  updatedAt: string;
  resolved?: boolean;
  actualOutcome?: boolean; // true = happened, false = didn't happen
  resolvedAt?: string;
  brierScore?: number;
  simulations?: SimulationData[]; // Array of simulation history
  version?: {
    major: number;
    minor: number;
  };
  versionHistory?: ForecastVersion[];
}

const STORAGE_KEY = "@uffp_forecasts";
const VERSION = "3.1.0"; // Update this to force cache bust

export default function ForecastWorkspaceScreen() {
  const [commandInput, setCommandInput] = useState("");
  const [activeQuestion, setActiveQuestion] = useState("");
  const [activeForecast, setActiveForecast] = useState<SavedForecast | null>(
    null,
  );
  const [savedForecasts, setSavedForecasts] = useState<SavedForecast[]>([]);
  const [showForecastList, setShowForecastList] = useState(false);
  const [forecastFilter, setForecastFilter] = useState<
    "all" | "active" | "expired"
  >("all");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [showCommandHints, setShowCommandHints] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);
  const [processingAction, setProcessingAction] = useState<string>("");
  const [driverBeingConfigured, setDriverBeingConfigured] = useState<
    any | null
  >(null);
  const [majorChangesWarning, setMajorChangesWarning] = useState<{
    changes: string[];
    originalDriver?: any;
  } | null>(null);
  const [agentBeingConfigured, setAgentBeingConfigured] = useState<{
    name: string;
    query?: string;
    schedule?: string;
    threshold?: number;
  } | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Load saved forecasts
    loadForecasts();
    // Focus input on mount
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const loadForecasts = async () => {
    try {
      // Try loading from backend first
      const { loadForecastsWithSync } = await import("../utils/backendSync");
      const result = await loadForecastsWithSync();

      if (result.fromBackend && result.forecasts.length > 0) {
        console.log(`Loaded ${result.forecasts.length} forecasts from backend`);
        setSavedForecasts(result.forecasts);
        return;
      }

      // Fall back to local storage if backend fails or returns empty
      const stored =
        Platform.OS === "web"
          ? localStorage.getItem(STORAGE_KEY)
          : await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const forecasts = JSON.parse(stored);
        console.log(`Loaded ${forecasts.length} forecasts from local storage`);
        setSavedForecasts(forecasts);
      } else {
        setSavedForecasts([]);
      }
    } catch (err) {
      console.error("Failed to load forecasts:", err);
      setSavedForecasts([]);
    }
  };

  const saveForecast = async (forecast: SavedForecast) => {
    try {
      const updated = savedForecasts.filter((f) => f.id !== forecast.id);
      updated.unshift(forecast); // Add to beginning
      setSavedForecasts(updated);

      // Use localStorage for web, AsyncStorage for native
      if (Platform.OS === "web") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (err) {
      console.error("Failed to save forecast:", err);
    }
  };

  const loadForecast = async (forecast: SavedForecast) => {
    setActiveForecast(forecast);
    setActiveQuestion(forecast.question);
    setShowForecastList(false);
    setCommandInput("");

    // Don't re-parse if forecast already has drivers - just show minimal parsedResult
    // This prevents duplicate driver suggestions
    if (forecast.drivers && forecast.drivers.length > 0) {
      setParsedResult({
        question: forecast.question,
        domain: forecast.domain,
        timeframe: forecast.timeframe,
        suggestedDrivers: [], // Empty - user already has drivers
      });
    } else {
      // Re-parse only for forecasts without drivers
      setLoading(true);
      setProcessingAction("Loading forecast...");
      try {
        const result = await researchService.parseQuestion(forecast.question);
        const parsed = result.parsed || result;
        setParsedResult(parsed);
      } catch (err) {
        console.error("Failed to re-parse question:", err);
        // Set minimal parsedResult even if parsing fails
        setParsedResult({
          question: forecast.question,
          domain: forecast.domain,
          timeframe: forecast.timeframe,
          suggestedDrivers: [],
        });
      } finally {
        setLoading(false);
        setProcessingAction("");
      }
    }
  };

  useEffect(() => {
    // Show/hide command hints based on input
    // Show hints when: typing /, typing @, or in driver config with empty field
    if (
      commandInput.startsWith("/") ||
      commandInput.includes("@") ||
      (driverBeingConfigured && commandInput === "")
    ) {
      setShowCommandHints(true);
    } else {
      setShowCommandHints(false);
    }
  }, [commandInput, driverBeingConfigured]);

  const startDriverConfiguration = async (index: number) => {
    if (!activeForecast || !parsedResult || !parsedResult.suggestedDrivers) {
      return;
    }

    const suggestedDriver = parsedResult.suggestedDrivers[index];
    if (!suggestedDriver) return;

    setProcessingAction("Analyzing driver...");

    try {
      // Analyze driver semantically to get recommended configuration
      const { analyzeDriver } =
        await import("../services/driverAnalyzerService");
      const recommendation = await analyzeDriver(
        suggestedDriver,
        activeForecast.question,
      );

      // Create driver with AI-recommended configuration
      const newDriver: any = {
        id: Date.now().toString(),
        name: suggestedDriver,
        type: recommendation.type,
        direction: recommendation.direction,
        agents: [] as any[],
        createdAt: new Date().toISOString(),
        aiRecommendation: recommendation, // Store for reference
      };

      if (recommendation.type === "binary") {
        newDriver.probability = recommendation.examples?.probability || 50;
      } else {
        newDriver.distribution = recommendation.distribution || "triangular";
        newDriver.p5 = recommendation.examples?.p5 || 30;
        newDriver.p50 = recommendation.examples?.p50 || 50;
        newDriver.p95 = recommendation.examples?.p95 || 70;
      }

      setDriverBeingConfigured(newDriver);
      setCommandInput("");
      setError(
        `✓ AI configured as ${recommendation.type} ${recommendation.distribution || ""}. ${recommendation.reasoning}`,
      );
    } catch (err) {
      console.error("[Driver Config] Analysis failed, using defaults:", err);

      // Fallback to default configuration
      const newDriver = {
        id: Date.now().toString(),
        name: suggestedDriver,
        type: "continuous",
        distribution: "triangular",
        p5: 30,
        p50: 50,
        p95: 70,
        direction: "increases",
        agents: [] as any[],
        createdAt: new Date().toISOString(),
      };

      setDriverBeingConfigured(newDriver);
      setCommandInput("");
    } finally {
      setProcessingAction("");
    }
  };

  const validateDriverConfig = (
    driver: any,
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (driver.type === "binary") {
      if (driver.probability === undefined || driver.probability === null) {
        errors.push("Binary drivers require a probability value");
      }
      if (driver.probability < 0 || driver.probability > 100) {
        errors.push("Probability must be between 0 and 100");
      }
    } else if (driver.type === "continuous") {
      if (!driver.distribution) {
        errors.push("Continuous drivers require a distribution");
      }

      if (driver.distribution === "triangular") {
        if (
          driver.p5 === undefined ||
          driver.p50 === undefined ||
          driver.p95 === undefined
        ) {
          errors.push(
            "Triangular distribution requires p5, p50, and p95 values",
          );
        }
        if (
          driver.p5 !== undefined &&
          driver.p50 !== undefined &&
          driver.p95 !== undefined
        ) {
          if (driver.p5 >= driver.p50 || driver.p50 >= driver.p95) {
            errors.push("Values must satisfy: p5 < p50 < p95");
          }
        }
      } else if (
        driver.distribution === "normal" ||
        driver.distribution === "lognormal"
      ) {
        if (driver.p50 === undefined || driver.p95 === undefined) {
          errors.push(
            `${driver.distribution} distribution requires p50 and p95 values`,
          );
        }
        if (
          driver.p50 !== undefined &&
          driver.p95 !== undefined &&
          driver.p50 >= driver.p95
        ) {
          errors.push("p50 must be less than p95");
        }
      }
    }

    return { valid: errors.length === 0, errors };
  };

  const checkConfigOverride = (driver: any): string | null => {
    if (!driver.aiRecommendation) return null;

    const rec = driver.aiRecommendation;
    const warnings: string[] = [];

    if (driver.type !== rec.type) {
      warnings.push(`⚠️ Changing from recommended type: ${rec.type}`);
    }
    if (
      driver.type === "continuous" &&
      driver.distribution !== rec.distribution
    ) {
      warnings.push(
        `⚠️ Changing from recommended distribution: ${rec.distribution}`,
      );
    }
    if (driver.direction !== rec.direction) {
      warnings.push(`⚠️ Changing from recommended direction: ${rec.direction}`);
    }

    return warnings.length > 0 ? warnings.join(" ") : null;
  };

  const createDriverVersion = (
    driver: any,
    changes: string[],
    changeType: "major" | "minor",
  ): DriverVersion => {
    const currentVersion = driver.version || { major: 1, minor: 0 };
    const newVersion =
      changeType === "major"
        ? { major: currentVersion.major + 1, minor: 0 }
        : { major: currentVersion.major, minor: currentVersion.minor + 1 };

    return {
      versionId: `${driver.id}-v${newVersion.major}.${newVersion.minor}`,
      majorVersion: newVersion.major,
      minorVersion: newVersion.minor,
      timestamp: new Date().toISOString(),
      changeType,
      changeDescription: changes.join(", "),
      changes: changes.map((c) => ({
        field: c.split(":")[0].trim(),
        oldValue: null,
        newValue: null,
      })),
      snapshot: { ...driver },
    };
  };

  const detectMajorChanges = (
    newDriver: any,
    originalDriver?: any,
  ): string[] => {
    if (!originalDriver) return []; // New driver, no comparison needed

    const changes: string[] = [];

    // P-value changes (any change is major)
    if (
      newDriver.type === "continuous" &&
      originalDriver.type === "continuous"
    ) {
      if (newDriver.p5 !== originalDriver.p5) {
        const percentChange = Math.round(
          ((newDriver.p5 - originalDriver.p5) / originalDriver.p5) * 100,
        );
        changes.push(
          `p5: ${originalDriver.p5} → ${newDriver.p5} (${percentChange > 0 ? "+" : ""}${percentChange}%)`,
        );
      }
      if (newDriver.p50 !== originalDriver.p50) {
        const percentChange = Math.round(
          ((newDriver.p50 - originalDriver.p50) / originalDriver.p50) * 100,
        );
        changes.push(
          `p50: ${originalDriver.p50} → ${newDriver.p50} (${percentChange > 0 ? "+" : ""}${percentChange}%)`,
        );
      }
      if (newDriver.p95 !== originalDriver.p95) {
        const percentChange = Math.round(
          ((newDriver.p95 - originalDriver.p95) / originalDriver.p95) * 100,
        );
        changes.push(
          `p95: ${originalDriver.p95} → ${newDriver.p95} (${percentChange > 0 ? "+" : ""}${percentChange}%)`,
        );
      }
      if (newDriver.distribution !== originalDriver.distribution) {
        changes.push(
          `Distribution: ${originalDriver.distribution} → ${newDriver.distribution}`,
        );
      }
    }

    // Binary probability changes
    if (newDriver.type === "binary" && originalDriver.type === "binary") {
      if (newDriver.probability !== originalDriver.probability) {
        const diff = newDriver.probability - originalDriver.probability;
        changes.push(
          `Probability: ${originalDriver.probability}% → ${newDriver.probability}% (${diff > 0 ? "+" : ""}${diff}%)`,
        );
      }
    }

    // Type change
    if (newDriver.type !== originalDriver.type) {
      changes.push(`Type: ${originalDriver.type} → ${newDriver.type}`);
    }

    // Direction change
    if (newDriver.direction !== originalDriver.direction) {
      changes.push(
        `Direction: ${originalDriver.direction} → ${newDriver.direction}`,
      );
    }

    return changes;
  };

  const saveConfiguredDriver = async (force: boolean = false) => {
    if (!driverBeingConfigured || !activeForecast) return;

    // Validate configuration
    const validation = validateDriverConfig(driverBeingConfigured);
    if (!validation.valid) {
      setError(`Cannot save: ${validation.errors.join(", ")}`);
      return;
    }

    // Check if we're editing an existing driver
    const existingIndex = activeForecast.drivers.findIndex(
      (d: any) => d.id === driverBeingConfigured.id,
    );

    const isNewDriver = existingIndex < 0;
    const originalDriver = isNewDriver
      ? null
      : activeForecast.drivers[existingIndex];

    // Detect major changes
    const majorChanges = detectMajorChanges(
      driverBeingConfigured,
      originalDriver,
    );

    // If major changes detected and not forcing, show warning
    if (majorChanges.length > 0 && !force) {
      setMajorChangesWarning({
        changes: majorChanges,
        originalDriver,
      });
      return; // Don't save yet, wait for user confirmation
    }

    // Create version if there are changes
    let updatedDriver = { ...driverBeingConfigured };
    if (majorChanges.length > 0) {
      // Major version
      const version = createDriverVersion(
        driverBeingConfigured,
        majorChanges,
        "major",
      );
      const currentVersion = driverBeingConfigured.version || {
        major: 1,
        minor: 0,
      };
      updatedDriver.version = {
        major: currentVersion.major + 1,
        minor: 0,
      };
      updatedDriver.versionHistory = [
        ...(driverBeingConfigured.versionHistory || []),
        version,
      ];
    }

    // Check for overrides (soft warning)
    const overrideWarning = checkConfigOverride(updatedDriver);
    if (overrideWarning) {
      console.log("[Driver Config]", overrideWarning);
    }

    setProcessingAction("Saving driver...");
    setMajorChangesWarning(null); // Clear warning
    setDriverBeingConfigured(updatedDriver); // Update with version info

    try {
      if (
        isNewDriver &&
        activeForecast.id &&
        !activeForecast.id.startsWith("local-")
      ) {
        // Add new driver to backend
        const { addDriverWithSync } = await import("../utils/backendSync");
        const result = await addDriverWithSync(activeForecast.id, {
          name: driverBeingConfigured.name,
          type: driverBeingConfigured.type,
          probability: driverBeingConfigured.probability,
          p5: driverBeingConfigured.p5,
          p50: driverBeingConfigured.p50,
          p95: driverBeingConfigured.p95,
          distribution: driverBeingConfigured.distribution,
          direction: driverBeingConfigured.direction,
          reasoning: driverBeingConfigured.reasoning,
        });

        if (result.success && result.forecast) {
          // Update from backend response
          setActiveForecast(result.forecast);
          await saveForecast(result.forecast);
          console.log("Driver added to backend");
        } else {
          // Fall back to local update
          throw new Error(result.error || "Failed to add driver to backend");
        }
      } else {
        // Local-only forecast or editing existing driver - update locally
        let updatedDrivers;
        if (existingIndex >= 0) {
          updatedDrivers = [...activeForecast.drivers];
          updatedDrivers[existingIndex] = updatedDriver;
        } else {
          updatedDrivers = [...activeForecast.drivers, updatedDriver];
        }

        const updatedForecast = {
          ...activeForecast,
          drivers: updatedDrivers,
          updatedAt: new Date().toISOString(),
        };

        setActiveForecast(updatedForecast);
        await saveForecast(updatedForecast);
      }

      setDriverBeingConfigured(null);
      setError("");
    } catch (err: any) {
      console.error("Failed to save driver:", err);
      // Fall back to local save
      let updatedDrivers;
      const existingIndex = activeForecast.drivers.findIndex(
        (d: any) => d.id === driverBeingConfigured.id,
      );

      if (existingIndex >= 0) {
        updatedDrivers = [...activeForecast.drivers];
        updatedDrivers[existingIndex] = updatedDriver;
      } else {
        updatedDrivers = [...activeForecast.drivers, updatedDriver];
      }

      const updatedForecast = {
        ...activeForecast,
        drivers: updatedDrivers,
        updatedAt: new Date().toISOString(),
      };

      setActiveForecast(updatedForecast);
      await saveForecast(updatedForecast);
      setDriverBeingConfigured(null);
      setError("Driver saved locally (backend sync failed)");
    } finally {
      setProcessingAction("");
    }
  };

  const cancelDriverConfiguration = () => {
    setDriverBeingConfigured(null);
  };

  const editDriver = (driver: any) => {
    setDriverBeingConfigured(driver);
  };

  const handleCommandSubmit = async () => {
    const trimmed = commandInput.trim();

    // Split by forward slash to handle multi-commands
    const commands = trimmed
      .split("/")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    // If multiple commands, process them sequentially
    if (commands.length > 1) {
      for (const cmd of commands) {
        await processSingleCommand("/" + cmd);
      }
      setCommandInput("");
      return;
    }

    // Single command - process normally
    await processSingleCommand(trimmed);
  };

  const processSingleCommand = async (trimmed: string) => {
    // Handle agent configuration commands
    if (agentBeingConfigured) {
      // /query <search query>
      if (trimmed.startsWith("/query ")) {
        const query = trimmed.replace("/query ", "").trim();
        setAgentBeingConfigured({ ...agentBeingConfigured, query });
        setCommandInput("");
        setError("");
        return;
      }

      // /schedule <daily|weekly|on-demand>
      if (trimmed.startsWith("/schedule ")) {
        const schedule = trimmed.replace("/schedule ", "").trim();
        if (["daily", "weekly", "on-demand"].includes(schedule)) {
          setAgentBeingConfigured({ ...agentBeingConfigured, schedule });
          setCommandInput("");
          setError("");
        } else {
          setError("Schedule must be 'daily', 'weekly', or 'on-demand'");
        }
        return;
      }

      // /threshold <number>
      if (trimmed.startsWith("/threshold ")) {
        const threshold = parseInt(
          trimmed.replace("/threshold ", "").trim(),
          10,
        );
        if (!isNaN(threshold) && threshold >= 0 && threshold <= 100) {
          setAgentBeingConfigured({ ...agentBeingConfigured, threshold });
          setCommandInput("");
          setError("");
        } else {
          setError("Threshold must be a number between 0 and 100");
        }
        return;
      }

      // /save - save agent to driver and optionally execute
      if (trimmed === "/save") {
        if (!driverBeingConfigured) {
          setError("No driver being configured. Start driver config first.");
          return;
        }

        if (!agentBeingConfigured.query) {
          setError("Agent needs a query! Use /query <search query> first.");
          return;
        }

        const currentAgents = driverBeingConfigured.agents || [];
        const agentConfig = {
          name: agentBeingConfigured.name,
          query: agentBeingConfigured.query,
          schedule: agentBeingConfigured.schedule || "on-demand",
          threshold: agentBeingConfigured.threshold || 10,
        };

        // Check for duplicates
        const isDuplicate = currentAgents.some(
          (a: any) => (a.name || a) === agentConfig.name,
        );
        if (isDuplicate) {
          setError(`Agent @${agentConfig.name} already added to this driver`);
          return;
        }

        setDriverBeingConfigured({
          ...driverBeingConfigured,
          agents: [...currentAgents, agentConfig],
        });

        // Clear agent config and show success
        setAgentBeingConfigured(null);
        setCommandInput("");
        setError(
          `✓ Agent @${agentConfig.name} added! You can add more agents with @ or /save the driver.`,
        );
        return;
      }

      // /run - execute agent research
      if (trimmed.startsWith("/run @")) {
        let agentName = trimmed.replace("/run @", "").trim();
        // Extract just the agent ID (before any space or parenthesis)
        const spaceIndex = agentName.indexOf(" ");
        const parenIndex = agentName.indexOf("(");
        if (spaceIndex > 0 || parenIndex > 0) {
          const cutIndex = Math.min(
            spaceIndex > 0 ? spaceIndex : Infinity,
            parenIndex > 0 ? parenIndex : Infinity,
          );
          agentName = agentName.substring(0, cutIndex).trim();
        }
        console.log("[Agent Config Mode] Attempting to run agent:", agentName);

        // First, check if this is the agent currently being configured
        let agent = null;
        let targetDriver = null;

        if (agentBeingConfigured && agentBeingConfigured.name === agentName) {
          // Use the agent being configured (it may have been removed from driver.agents temporarily)
          console.log(
            "[Agent Config Mode] Using agentBeingConfigured:",
            agentBeingConfigured,
          );
          agent = agentBeingConfigured;
          targetDriver = driverBeingConfigured;
        } else if (driverBeingConfigured) {
          // Search in driver's agents array
          console.log(
            "[Agent Config Mode] Searching in driverBeingConfigured.agents:",
            driverBeingConfigured.agents,
          );
          agent = driverBeingConfigured.agents?.find((a: any) => {
            const name = a.name || a;
            console.log(
              "[Agent Config Mode] Comparing:",
              name,
              "with:",
              agentName,
            );
            return name === agentName || a === agentName;
          });
          targetDriver = driverBeingConfigured;
          console.log(
            "[Agent Config Mode] Found in driverBeingConfigured:",
            agent,
          );
        }

        // If not found and not configuring, search all drivers in active forecast
        if (!agent && activeForecast && activeForecast.drivers) {
          console.log(
            "[Agent Config Mode] Not found in driver, searching active forecast drivers:",
            activeForecast.drivers.length,
          );
          for (const driver of activeForecast.drivers) {
            if (driver.agents && driver.agents.length > 0) {
              const foundAgent = driver.agents.find((a: any) => {
                const name = a.name || a;
                return name === agentName || a === agentName;
              });
              if (foundAgent) {
                console.log(
                  "[Agent Config Mode] Found in saved driver:",
                  driver.name,
                );
                agent = foundAgent;
                targetDriver = driver;
                break;
              }
            }
          }
        }

        console.log(
          "[Agent Config Mode] Final result - agent:",
          agent,
          "query:",
          agent?.query,
        );

        if (agent && agent.query) {
          setLoading(true);
          setProcessingAction(`Running ${agentName} research...`);
          try {
            // Execute research
            const result = await researchService.executeResearch({
              agentId: agent.name || agent,
              promptId: "market_tam_sizing", // Default prompt, could be made configurable
              variables: {
                MARKET_SEGMENT: agent.query,
                GEOGRAPHY: "United States",
              },
            });

            // Add result as evidence to the target driver
            if (
              driverBeingConfigured &&
              targetDriver === driverBeingConfigured
            ) {
              // Update driver being configured
              setDriverBeingConfigured({
                ...driverBeingConfigured,
                evidence: [
                  ...(driverBeingConfigured.evidence || []),
                  {
                    type: "research",
                    source: agent.name || agent,
                    summary: result.summary || result.result?.summary,
                    timestamp: new Date().toISOString(),
                    fullResult: result,
                  },
                ],
              });
            } else if (activeForecast && targetDriver) {
              // Update saved driver in active forecast
              const updatedDrivers = activeForecast.drivers.map((d: any) => {
                if (d.id === targetDriver.id) {
                  return {
                    ...d,
                    evidence: [
                      ...(d.evidence || []),
                      {
                        type: "research",
                        source: agent.name || agent,
                        summary: result.summary || result.result?.summary,
                        timestamp: new Date().toISOString(),
                        fullResult: result,
                      },
                    ],
                  };
                }
                return d;
              });

              const updatedForecast = {
                ...activeForecast,
                drivers: updatedDrivers,
                updatedAt: new Date().toISOString(),
              };

              setActiveForecast(updatedForecast);
              await saveForecast(updatedForecast);
            }

            setError(
              `Research complete! ${result.summary || "See evidence below"}`,
            );
          } catch (err) {
            setError(
              `Research failed: ${err instanceof Error ? err.message : "Unknown error"}`,
            );
          } finally {
            setLoading(false);
            setProcessingAction("");
          }
        } else {
          setError(
            `Agent @${agentName} not found or missing query. Make sure you added the agent to a driver and configured its query.`,
          );
        }
        setCommandInput("");
        return;
      }

      // /cancel - cancel agent config
      if (trimmed === "/cancel") {
        setAgentBeingConfigured(null);
        setCommandInput("");
        setError("");
        return;
      }
    }

    // Handle driver configuration commands
    if (driverBeingConfigured) {
      // /type <continuous|binary>
      if (trimmed.startsWith("/type ")) {
        const type = trimmed.replace("/type ", "").trim();
        if (type === "continuous" || type === "binary") {
          const updated = { ...driverBeingConfigured, type };
          // If switching to binary, set default probability
          if (type === "binary" && !updated.probability) {
            updated.probability = 50;
          }
          setDriverBeingConfigured(updated);
          setCommandInput("");
          setError("");
        } else {
          setError("Type must be 'continuous' or 'binary'");
        }
        return;
      }

      // /prob <number> (for binary drivers)
      if (trimmed.startsWith("/prob ")) {
        if (driverBeingConfigured.type !== "binary") {
          setError("Use /prob only for binary drivers. Use /p for continuous.");
          return;
        }
        const prob = parseInt(trimmed.replace("/prob ", "").trim(), 10);
        if (!isNaN(prob) && prob >= 0 && prob <= 100) {
          setDriverBeingConfigured({
            ...driverBeingConfigured,
            probability: prob,
          });
          setCommandInput("");
          setError("");
        } else {
          setError("Probability must be a number between 0 and 100");
        }
        return;
      }

      // /dist <triangular|normal|lognormal>
      if (trimmed.startsWith("/dist ")) {
        if (driverBeingConfigured.type !== "continuous") {
          setError("Use /dist only for continuous drivers.");
          return;
        }
        const distribution = trimmed.replace("/dist ", "").trim();
        if (["triangular", "normal", "lognormal"].includes(distribution)) {
          setDriverBeingConfigured({ ...driverBeingConfigured, distribution });
          setCommandInput("");
          setError("");
        } else {
          setError(
            "Distribution must be 'triangular', 'normal', or 'lognormal'",
          );
        }
        return;
      }

      // /p <p5> <p50> <p95>
      if (trimmed.startsWith("/p ")) {
        if (driverBeingConfigured.type !== "continuous") {
          setError("Use /p only for continuous drivers. Use /prob for binary.");
          return;
        }
        const values = trimmed.replace("/p ", "").trim().split(/\s+/);
        if (values.length === 3) {
          const [p5, p50, p95] = values.map(Number);
          if (!isNaN(p5) && !isNaN(p50) && !isNaN(p95)) {
            // Validate constraints immediately
            if (p5 >= p50) {
              setError(
                `p5 (${p5}) must be less than p50 (${p50}). Remember: p5 is your "Oh No Floor" - the pessimistic case.`,
              );
              return;
            }
            if (p50 >= p95) {
              setError(
                `p50 (${p50}) must be less than p95 (${p95}). Remember: p95 is your "Moonshot Ceiling" - the optimistic case.`,
              );
              return;
            }
            if (p5 < 0 || p95 < 0 || p50 < 0) {
              setError("Values cannot be negative");
              return;
            }

            setDriverBeingConfigured({
              ...driverBeingConfigured,
              p5,
              p50,
              p95,
            });
            setCommandInput("");
            setError("");
          } else {
            setError("Values must be numbers");
          }
        } else {
          setError("Format: /p <p5> <p50> <p95> — Example: /p 10 50 200");
        }
        return;
      }

      // /direction <increases|decreases>
      if (trimmed.startsWith("/direction ")) {
        const direction = trimmed.replace("/direction ", "").trim();
        if (direction === "increases" || direction === "decreases") {
          setDriverBeingConfigured({ ...driverBeingConfigured, direction });
          setCommandInput("");
          setError("");
        } else {
          setError("Direction must be 'increases' or 'decreases'");
        }
        return;
      }

      // Handle @agent mentions - enter agent config mode
      if (trimmed.startsWith("@") && !trimmed.includes("/")) {
        let agentName = trimmed.substring(1).trim();
        // Extract just the agent ID (before any space or parenthesis)
        // e.g., "competitive_intel (competitor tracking)" -> "competitive_intel"
        const spaceIndex = agentName.indexOf(" ");
        const parenIndex = agentName.indexOf("(");
        if (spaceIndex > 0 || parenIndex > 0) {
          const cutIndex = Math.min(
            spaceIndex > 0 ? spaceIndex : Infinity,
            parenIndex > 0 ? parenIndex : Infinity,
          );
          agentName = agentName.substring(0, cutIndex).trim();
        }
        console.log("Agent mention detected:", agentName);
        if (agentName) {
          console.log("Setting agent being configured:", agentName);
          setAgentBeingConfigured({ name: agentName });
          setCommandInput("");
          setError(""); // Clear any errors
        }
        return;
      }

      // /evidence - add manual evidence to driver
      if (trimmed.startsWith("/evidence ")) {
        const evidenceText = trimmed.replace("/evidence ", "").trim();
        if (!evidenceText) {
          setError("Please provide evidence text");
          return;
        }

        setDriverBeingConfigured({
          ...driverBeingConfigured,
          evidence: [
            ...(driverBeingConfigured.evidence || []),
            {
              type: "manual",
              source: "user",
              summary: evidenceText,
              timestamp: new Date().toISOString(),
            },
          ],
        });
        setCommandInput("");
        setError(
          `✓ Evidence added: "${evidenceText.substring(0, 50)}${evidenceText.length > 50 ? "..." : ""}"`,
        );
        return;
      }

      // /save - save the configured driver
      if (trimmed === "/save") {
        await saveConfiguredDriver();
        setCommandInput("");
        return;
      }

      // /cancel - cancel driver configuration
      if (trimmed === "/cancel") {
        cancelDriverConfiguration();
        setCommandInput("");
        return;
      }
    }

    // Handle /run @agent command in regular mode (outside agent/driver configuration)
    if (
      trimmed.startsWith("/run @") &&
      !agentBeingConfigured &&
      !driverBeingConfigured
    ) {
      let agentName = trimmed.replace("/run @", "").trim();
      // Extract just the agent ID (before any space or parenthesis)
      const spaceIndex = agentName.indexOf(" ");
      const parenIndex = agentName.indexOf("(");
      if (spaceIndex > 0 || parenIndex > 0) {
        const cutIndex = Math.min(
          spaceIndex > 0 ? spaceIndex : Infinity,
          parenIndex > 0 ? parenIndex : Infinity,
        );
        agentName = agentName.substring(0, cutIndex).trim();
      }
      console.log("[Agent Execution] Attempting to run agent:", agentName);

      if (!activeForecast) {
        setError("No active forecast. Create a forecast first.");
        setCommandInput("");
        return;
      }

      // Search all drivers in active forecast for the agent
      let agent = null;
      let targetDriver = null;

      console.log(
        "[Agent Execution] Searching through",
        activeForecast.drivers?.length || 0,
        "drivers",
      );

      if (activeForecast.drivers) {
        for (const driver of activeForecast.drivers) {
          console.log(
            "[Agent Execution] Checking driver:",
            driver.name,
            "with agents:",
            driver.agents,
          );
          if (driver.agents && driver.agents.length > 0) {
            const foundAgent = driver.agents.find((a: any) => {
              const name = a.name || a;
              console.log(
                "[Agent Execution] Comparing agent name:",
                name,
                "with:",
                agentName,
              );
              return name === agentName;
            });
            if (foundAgent) {
              console.log("[Agent Execution] Found agent:", foundAgent);
              agent = foundAgent;
              targetDriver = driver;
              break;
            }
          }
        }
      }

      console.log(
        "[Agent Execution] Final result - agent:",
        agent,
        "targetDriver:",
        targetDriver?.name,
      );

      if (agent && agent.query) {
        setLoading(true);
        setProcessingAction(`Running ${agentName} research...`);
        setCommandInput("");
        try {
          // Execute research
          const result = await researchService.executeResearch({
            agentId: agent.name || agent,
            promptId: "market_tam_sizing",
            variables: {
              MARKET_SEGMENT: agent.query,
              GEOGRAPHY: "United States",
            },
          });

          // Update saved driver in active forecast
          const updatedDrivers = activeForecast.drivers.map((d: any) => {
            if (d.id === targetDriver.id) {
              return {
                ...d,
                evidence: [
                  ...(d.evidence || []),
                  {
                    type: "research",
                    source: agent.name || agent,
                    summary: result.summary || result.result?.summary,
                    timestamp: new Date().toISOString(),
                    fullResult: result,
                  },
                ],
              };
            }
            return d;
          });

          const updatedForecast = {
            ...activeForecast,
            drivers: updatedDrivers,
            updatedAt: new Date().toISOString(),
          };

          setActiveForecast(updatedForecast);
          await saveForecast(updatedForecast);

          setError(
            `Research complete! ${result.summary || "See evidence below"}`,
          );
        } catch (err) {
          setError(
            `Research failed: ${err instanceof Error ? err.message : "Unknown error"}`,
          );
        } finally {
          setLoading(false);
          setProcessingAction("");
        }
      } else {
        setError(
          `Agent @${agentName} not found or missing query. Make sure you added the agent to a driver and configured its query.`,
        );
        setCommandInput("");
      }
      return;
    }

    // Handle /list command - with optional filter
    if (trimmed.startsWith("/list")) {
      const filterArg = trimmed.replace("/list", "").trim().toLowerCase();
      if (
        filterArg === "" ||
        filterArg === "all" ||
        filterArg === "active" ||
        filterArg === "expired"
      ) {
        const filter = (filterArg === "" ? "all" : filterArg) as
          | "all"
          | "active"
          | "expired";
        setForecastFilter(filter);
        setShowForecastList(!showForecastList || forecastFilter !== filter);
        setShowLeaderboard(false);

        // Clear active state when opening list
        if (!showForecastList || forecastFilter !== filter) {
          setActiveForecast(null);
          setActiveQuestion("");
          setParsedResult(null);
          setDriverBeingConfigured(null);
          setAgentBeingConfigured(null);
          setError("");
        }
      } else {
        setError("Use /list, /list active, /list expired, or /list all");
      }
      setCommandInput("");
      return;
    }

    // Handle /leaderboard command - multi-user rankings
    if (trimmed === "/leaderboard") {
      setShowLeaderboard(!showLeaderboard);
      setShowForecastList(false);
      setCommandInput("");
      return;
    }

    // Handle /external command - set reference class for external view
    if (trimmed.startsWith("/external ")) {
      if (!activeForecast) {
        setError("No active forecast. Type /question first.");
        setCommandInput("");
        return;
      }

      const referenceClass = trimmed.replace("/external ", "").trim();
      if (!referenceClass) {
        setError(
          "Please provide a reference class (e.g., /external SaaS startups in Series A)",
        );
        return;
      }

      const updatedForecast = {
        ...activeForecast,
        externalView: {
          referenceClass,
          baseRate: activeForecast.externalView?.baseRate,
          source: activeForecast.externalView?.source,
        },
        grounding: "external" as const,
        updatedAt: new Date().toISOString(),
      };
      setActiveForecast(updatedForecast);
      await saveForecast(updatedForecast);
      setCommandInput("");
      setError("");
      return;
    }

    // Handle /premortem command - mark premortem as pending
    if (trimmed === "/premortem") {
      if (!activeForecast) {
        setError("No active forecast. Type /question first.");
        setCommandInput("");
        return;
      }

      const updatedForecast = {
        ...activeForecast,
        premortem: {
          status: "pending" as const,
          failureScenarios: activeForecast.premortem?.failureScenarios,
        },
        grounding: "premortem" as const,
        updatedAt: new Date().toISOString(),
      };
      setActiveForecast(updatedForecast);
      await saveForecast(updatedForecast);
      setCommandInput("");
      setError("Premortem mode enabled (full workflow coming soon)");
      return;
    }

    // Handle /grounding command (only if forecast is active)
    if (trimmed.startsWith("/grounding ")) {
      if (!activeForecast) {
        setError("No active forecast. Type /question first.");
        setCommandInput("");
        return;
      }

      const grounding = trimmed.replace("/grounding ", "").trim();
      if (
        ["external", "premortem", "inside view / analysis"].includes(grounding)
      ) {
        const updatedForecast = {
          ...activeForecast,
          grounding: grounding as
            | "external"
            | "premortem"
            | "inside view / analysis",
          updatedAt: new Date().toISOString(),
        };
        setActiveForecast(updatedForecast);
        await saveForecast(updatedForecast);
        setCommandInput("");
        setError("");
      } else {
        setError(
          "Grounding must be 'external', 'premortem', or 'inside view / analysis'",
        );
      }
      return;
    }

    // Handle /setprob command (for testing - manually set probability)
    if (trimmed.startsWith("/setprob ")) {
      if (!activeForecast) {
        setError("No active forecast. Type /question first.");
        setCommandInput("");
        return;
      }

      const probStr = trimmed.replace("/setprob ", "").trim();
      const prob = parseFloat(probStr);

      if (isNaN(prob) || prob < 0 || prob > 100) {
        setError("Probability must be a number between 0 and 100");
        return;
      }

      const probability = prob / 100; // Convert to 0-1 range

      const updatedForecast = {
        ...activeForecast,
        probability,
        updatedAt: new Date().toISOString(),
      };

      setActiveForecast(updatedForecast);
      await saveForecast(updatedForecast);
      setCommandInput("");
      setError("");
      return;
    }

    // Handle /expire command (only if forecast is active and has probability)
    if (trimmed.startsWith("/expire ")) {
      if (!activeForecast) {
        setError("No active forecast. Type /question first.");
        setCommandInput("");
        return;
      }

      if (!activeForecast.probability) {
        setError("Run /simulate first to get a probability forecast");
        setCommandInput("");
        return;
      }

      const outcome = trimmed.replace("/expire ", "").trim().toLowerCase();
      if (outcome !== "positive" && outcome !== "negative") {
        setError("Use /expire positive or /expire negative");
        return;
      }

      const actualOutcome = outcome === "positive";
      setCommandInput("");
      setLoading(true);
      setProcessingAction("Resolving forecast...");

      try {
        // Check if forecast has backend ID
        if (activeForecast.id && !activeForecast.id.startsWith("local-")) {
          // Resolve on backend
          const { resolveForecastWithSync } =
            await import("../utils/backendSync");
          const result = await resolveForecastWithSync(
            activeForecast.id,
            actualOutcome,
          );

          if (result.success && result.forecast) {
            setActiveForecast(result.forecast);
            await saveForecast(result.forecast);
            console.log(
              `Forecast resolved with Brier score: ${result.brierScore}`,
            );
          } else {
            throw new Error(result.error || "Resolution failed");
          }
        } else {
          // Local-only forecast - calculate and save locally
          const forecastProb = activeForecast.probability;
          const brierScore = Math.pow(
            forecastProb - (actualOutcome ? 1 : 0),
            2,
          );

          const resolvedForecast = {
            ...activeForecast,
            resolved: true,
            actualOutcome,
            resolvedAt: new Date().toISOString(),
            brierScore,
            updatedAt: new Date().toISOString(),
          };

          setActiveForecast(resolvedForecast);
          await saveForecast(resolvedForecast);
        }

        setError("");
      } catch (err: any) {
        setError(err.message || "Failed to resolve forecast");
      } finally {
        setLoading(false);
        setProcessingAction("");
      }
      return;
    }

    // Handle /simulate command (only if forecast is active)
    if (trimmed === "/simulate") {
      if (!activeForecast) {
        setError("No active forecast. Type /question first.");
        setCommandInput("");
        return;
      }

      if (activeForecast.drivers.length === 0) {
        setError("Add at least one driver before simulating");
        setCommandInput("");
        return;
      }

      // Check if forecast has backend ID
      if (!activeForecast.id || activeForecast.id.startsWith("local-")) {
        setError(
          "Forecast must be created on backend first. Cannot simulate local-only forecasts.",
        );
        setCommandInput("");
        return;
      }

      setCommandInput("");
      setLoading(true);
      setProcessingAction("Running simulation...");

      try {
        // Use backend sync helper
        const { runSimulationWithSync } = await import("../utils/backendSync");
        const result = await runSimulationWithSync(activeForecast.id, 10000);

        if (result.success && result.probability !== undefined) {
          // Backend returns forecast with simulations array already updated
          if (result.forecast) {
            setActiveForecast(result.forecast);
            await saveForecast(result.forecast);
          } else {
            // Fallback: update probability only (shouldn't happen with backend-primary)
            const updatedForecast = {
              ...activeForecast,
              probability: result.probability,
              updatedAt: new Date().toISOString(),
            };
            setActiveForecast(updatedForecast);
            await saveForecast(updatedForecast);
          }

          const simulationCount = result.forecast?.simulations?.length || 1;
          console.log(
            `Simulation #${simulationCount} complete: ${result.probability}`,
          );
        } else {
          throw new Error(result.error || "Simulation failed");
        }
      } catch (err: any) {
        setError(err.message || "Simulation failed");
      } finally {
        setLoading(false);
        setProcessingAction("");
      }
      return;
    }

    // Handle numbered driver selection (e.g., "1", "2", "3")
    if (/^\d+$/.test(trimmed)) {
      const index = parseInt(trimmed, 10) - 1; // Convert to 0-indexed
      startDriverConfiguration(index);
      return;
    }

    // Handle /driver command (only if forecast is active)
    if (trimmed.startsWith("/driver ")) {
      if (!activeForecast) {
        setError("No active forecast. Type /question first.");
        setCommandInput("");
        return;
      }

      const driverName = trimmed.replace("/driver ", "").trim();
      if (!driverName) {
        setError("Please provide a driver name");
        return;
      }

      setCommandInput("");
      setLoading(true);
      setProcessingAction("Analyzing custom driver...");

      try {
        // Analyze custom driver with AI
        const { analyzeDriver } =
          await import("../services/driverAnalyzerService");
        const recommendation = await analyzeDriver(
          driverName,
          activeForecast.question,
        );

        // Create driver with AI-recommended configuration
        const newDriver: any = {
          id: Date.now().toString(),
          name: driverName,
          type: recommendation.type,
          direction: recommendation.direction,
          agents: [] as any[],
          createdAt: new Date().toISOString(),
          aiRecommendation: recommendation,
        };

        if (recommendation.type === "binary") {
          newDriver.probability = recommendation.examples?.probability || 50;
        } else {
          newDriver.distribution = recommendation.distribution || "triangular";
          newDriver.p5 = recommendation.examples?.p5 || 30;
          newDriver.p50 = recommendation.examples?.p50 || 50;
          newDriver.p95 = recommendation.examples?.p95 || 70;
        }

        setDriverBeingConfigured(newDriver);
        setError(
          `✓ AI configured as ${recommendation.type} ${recommendation.distribution || ""}. ${recommendation.reasoning}`,
        );
      } catch (err) {
        console.error("[Custom Driver] Analysis failed, using defaults:", err);

        // Fallback to default configuration
        const newDriver = {
          id: Date.now().toString(),
          name: driverName,
          type: "continuous",
          distribution: "triangular",
          p5: 30,
          p50: 50,
          p95: 70,
          direction: "increases",
          agents: [] as any[],
          createdAt: new Date().toISOString(),
        };

        setDriverBeingConfigured(newDriver);
      } finally {
        setLoading(false);
        setProcessingAction("");
      }
      return;
    }

    // Handle /question command
    if (trimmed.startsWith("/question ")) {
      const question = trimmed.replace("/question ", "").trim();
      if (!question) return;

      setActiveQuestion(question);
      setCommandInput("");
      setLoading(true);
      setProcessingAction("Parsing question...");
      setError("");
      setShowForecastList(false);

      try {
        // Parse question first
        console.log("Calling parseQuestion with:", question);
        const parseResult = await researchService.parseQuestion(question);
        const parsed = parseResult.parsed || parseResult;
        console.log("Parsed object:", parsed);

        setParsedResult(parsed);

        // Create forecast on backend
        setProcessingAction("Creating forecast...");
        const { createForecastWithSync } = await import("../utils/backendSync");
        const createResult = await createForecastWithSync({
          question: parsed.question || question,
          domain: parsed.domain,
          timeframe: parsed.timeframe,
          parsedData: parsed,
        });

        if (createResult.forecast) {
          const newForecast: SavedForecast = {
            ...createResult.forecast,
            grounding: parsed.referenceClass
              ? "external"
              : "inside view / analysis",
            externalView: parsed.referenceClass
              ? {
                  referenceClass: parsed.referenceClass,
                }
              : undefined,
          };

          setActiveForecast(newForecast);

          // Also save to local storage as backup
          await saveForecast(newForecast);

          console.log(
            createResult.fromBackend
              ? `Created forecast ${newForecast.id} on backend`
              : "Created forecast locally (backend unavailable)",
          );
        } else {
          throw new Error("Failed to create forecast");
        }
      } catch (err: any) {
        console.error("Forecast creation error:", err);
        setError(err.message || "Failed to create forecast. Please try again.");
      } finally {
        setLoading(false);
        setProcessingAction("");
      }
    }
  };

  const getSuggestion = () => {
    const query = commandInput.toLowerCase().trim();
    if (!query) return "";

    // Agent configuration mode suggestions
    if (agentBeingConfigured) {
      const agentSuggestions: Record<string, string> = {
        "/q": "/query ",
        "/qu": "/query ",
        "/que": "/query ",
        "/quer": "/query ",
        "/query": "/query ",
        "/s": "/save",
        "/sa": "/save",
        "/sav": "/save",
        "/sc": "/schedule on-demand",
        "/sch": "/schedule on-demand",
        "/sche": "/schedule on-demand",
        "/sched": "/schedule on-demand",
        "/schedu": "/schedule on-demand",
        "/schedul": "/schedule on-demand",
        "/schedule": "/schedule on-demand",
        "/schedule ": "/schedule on-demand",
        "/schedule d": "/schedule daily",
        "/schedule da": "/schedule daily",
        "/schedule dai": "/schedule daily",
        "/schedule dail": "/schedule daily",
        "/schedule w": "/schedule weekly",
        "/schedule we": "/schedule weekly",
        "/schedule wee": "/schedule weekly",
        "/schedule week": "/schedule weekly",
        "/schedule weekl": "/schedule weekly",
        "/schedule o": "/schedule on-demand",
        "/schedule on": "/schedule on-demand",
        "/schedule on-": "/schedule on-demand",
        "/schedule on-d": "/schedule on-demand",
        "/schedule on-de": "/schedule on-demand",
        "/schedule on-dem": "/schedule on-demand",
        "/schedule on-dema": "/schedule on-demand",
        "/schedule on-deman": "/schedule on-demand",
        "/t": "/threshold 10",
        "/th": "/threshold 10",
        "/thr": "/threshold 10",
        "/thre": "/threshold 10",
        "/thres": "/threshold 10",
        "/thresh": "/threshold 10",
        "/thresho": "/threshold 10",
        "/threshol": "/threshold 10",
        "/threshold": "/threshold 10",
      };
      if (agentSuggestions[query]) return agentSuggestions[query];
    }

    // Driver configuration mode suggestions
    if (driverBeingConfigured) {
      const driverSuggestions: Record<string, string> = {
        "/t": "/type continuous",
        "/ty": "/type continuous",
        "/typ": "/type continuous",
        "/type": "/type continuous",
        "/type ": "/type continuous",
        "/type c": "/type continuous",
        "/type co": "/type continuous",
        "/type con": "/type continuous",
        "/type cont": "/type continuous",
        "/type conti": "/type continuous",
        "/type contin": "/type continuous",
        "/type continu": "/type continuous",
        "/type continuo": "/type continuous",
        "/type continuou": "/type continuous",
        "/type b": "/type binary",
        "/type bi": "/type binary",
        "/type bin": "/type binary",
        "/type bina": "/type binary",
        "/type binar": "/type binary",
        "/d": "/dist triangular",
        "/di": "/dist triangular",
        "/dis": "/dist triangular",
        "/dist": "/dist triangular",
        "/dist ": "/dist triangular",
        "/dist t": "/dist triangular",
        "/dist tr": "/dist triangular",
        "/dist tri": "/dist triangular",
        "/dist tria": "/dist triangular",
        "/dist trian": "/dist triangular",
        "/dist triang": "/dist triangular",
        "/dist triangu": "/dist triangular",
        "/dist triangul": "/dist triangular",
        "/dist triangula": "/dist triangular",
        "/dist n": "/dist normal",
        "/dist no": "/dist normal",
        "/dist nor": "/dist normal",
        "/dist norm": "/dist normal",
        "/dist norma": "/dist normal",
        "/dist l": "/dist lognormal",
        "/dist lo": "/dist lognormal",
        "/dist log": "/dist lognormal",
        "/dist logn": "/dist lognormal",
        "/dist logno": "/dist lognormal",
        "/dist lognor": "/dist lognormal",
        "/dist lognorm": "/dist lognormal",
        "/dist lognorma": "/dist lognormal",
        "/dire": "/direction increases",
        "/direc": "/direction increases",
        "/direct": "/direction increases",
        "/directi": "/direction increases",
        "/directio": "/direction increases",
        "/direction": "/direction increases",
        "/direction ": "/direction increases",
        "/direction i": "/direction increases",
        "/direction in": "/direction increases",
        "/direction inc": "/direction increases",
        "/direction incr": "/direction increases",
        "/direction incre": "/direction increases",
        "/direction increa": "/direction increases",
        "/direction increas": "/direction increases",
        "/direction increase": "/direction increases",
        "/direction d": "/direction decreases",
        "/direction de": "/direction decreases",
        "/direction dec": "/direction decreases",
        "/direction decr": "/direction decreases",
        "/direction decre": "/direction decreases",
        "/direction decrea": "/direction decreases",
        "/direction decreas": "/direction decreases",
        "/direction decrease": "/direction decreases",
        "/p": "/p 20 50 80",
        "/pr": "/prob 50",
        "/pro": "/prob 50",
        "/prob": "/prob 50",
      };
      if (driverSuggestions[query]) return driverSuggestions[query];

      // Agent name autocomplete with descriptions
      const agentInfo: Record<string, string> = {
        research_analyst:
          "research_analyst (deep research, citations, quantitative)",
        sentiment_monitor:
          "sentiment_monitor (social listening, sentiment scoring)",
        competitive_intel:
          "competitive_intel (competitor tracking, benchmarking)",
        financial_analyst: "financial_analyst (financial statements, modeling)",
        market_researcher: "market_researcher (market sizing, TAM/SAM/SOM)",
        expert_synthesizer: "expert_synthesizer (synthesize expert opinions)",
      };
      if (query.startsWith("@")) {
        const partial = query.substring(1).toLowerCase();
        const match = Object.keys(agentInfo).find((name) =>
          name.startsWith(partial),
        );
        if (match) return "@" + agentInfo[match];
      }
    }

    // Regular mode suggestions
    const regularSuggestions: Record<string, string> = {
      "/q": "/question ",
      "/qu": "/question ",
      "/que": "/question ",
      "/ques": "/question ",
      "/quest": "/question ",
      "/questi": "/question ",
      "/questio": "/question ",
      "/question": "/question ",
      "/d": "/driver ",
      "/dr": "/driver ",
      "/dri": "/driver ",
      "/driv": "/driver ",
      "/drive": "/driver ",
      "/driver": "/driver ",
      "/l": "/list",
      "/li": "/list",
      "/lis": "/list",
      "/g": "/grounding external",
      "/gr": "/grounding external",
      "/gro": "/grounding external",
      "/grou": "/grounding external",
      "/groun": "/grounding external",
      "/ground": "/grounding external",
      "/groundi": "/grounding external",
      "/groundin": "/grounding external",
      "/grounding": "/grounding external",
      "/grounding ": "/grounding external",
      "/grounding e": "/grounding external",
      "/grounding ex": "/grounding external",
      "/grounding ext": "/grounding external",
      "/grounding exte": "/grounding external",
      "/grounding exter": "/grounding external",
      "/grounding extern": "/grounding external",
      "/grounding externa": "/grounding external",
      "/grounding p": "/grounding premortem",
      "/grounding pr": "/grounding premortem",
      "/grounding pre": "/grounding premortem",
      "/grounding prem": "/grounding premortem",
      "/grounding premo": "/grounding premortem",
      "/grounding premor": "/grounding premortem",
      "/grounding premort": "/grounding premortem",
      "/grounding premorte": "/grounding premortem",
      "/grounding a": "/grounding analysis",
      "/grounding an": "/grounding analysis",
      "/grounding ana": "/grounding analysis",
      "/grounding anal": "/grounding analysis",
      "/grounding analy": "/grounding analysis",
      "/grounding analys": "/grounding analysis",
      "/grounding analysi": "/grounding analysis",
      "/s": "/setprob 50",
      "/se": "/setprob 50",
      "/set": "/setprob 50",
      "/setp": "/setprob 50",
      "/setpr": "/setprob 50",
      "/setpro": "/setprob 50",
      "/setprob": "/setprob 50",
      "/si": "/simulate",
      "/sim": "/simulate",
      "/simu": "/simulate",
      "/simul": "/simulate",
      "/simula": "/simulate",
      "/simulat": "/simulate",
      "/r": "/resolve yes",
      "/re": "/resolve yes",
      "/res": "/resolve yes",
      "/reso": "/resolve yes",
      "/resol": "/resolve yes",
      "/resolv": "/resolve yes",
      "/resolve": "/resolve yes",
      "/resolve ": "/resolve yes",
      "/resolve y": "/resolve yes",
      "/resolve ye": "/resolve yes",
      "/resolve n": "/resolve no",
    };
    if (regularSuggestions[query]) return regularSuggestions[query];

    return "";
  };

  const getCommandHints = () => {
    // GLOBAL: Show agent autocomplete whenever @ is typed in ANY context
    if (commandInput.includes("@")) {
      const agentDescriptions: Record<string, string> = {
        research_analyst: "Deep research with citations, quantitative focus",
        sentiment_monitor: "Social listening and sentiment scoring",
        competitive_intel: "Competitor tracking and benchmarking",
        financial_analyst: "Financial statement analysis and modeling",
        market_researcher: "Market sizing and industry analysis",
        expert_synthesizer: "Synthesize expert opinions and predictions",
      };

      // Extract the part after @ for filtering
      const atIndex = commandInput.lastIndexOf("@");
      const afterAt = commandInput.substring(atIndex + 1).toLowerCase();

      const allAgents = Object.keys(agentDescriptions).map((name) => ({
        key: name,
        label: "@" + name,
        desc: agentDescriptions[name],
      }));

      // Filter by partial match if typing @something
      if (afterAt.length > 0) {
        return allAgents.filter((a) => a.key.startsWith(afterAt));
      }

      // Show all agents when typing @ alone
      return allAgents;
    }

    // Agent configuration mode hints
    if (agentBeingConfigured) {
      const agentHints = [
        { key: "query", label: "/query", desc: "Set research query" },
        {
          key: "schedule",
          label: "/schedule",
          desc: "Set schedule (daily|weekly|on-demand)",
        },
        {
          key: "threshold",
          label: "/threshold",
          desc: "Set update threshold (0-100)",
        },
        { key: "save", label: "/save", desc: "Save agent to driver" },
        { key: "run", label: "/run @agent", desc: "Execute agent research" },
        { key: "cancel", label: "/cancel", desc: "Cancel agent config" },
      ];

      if (!commandInput || !commandInput.startsWith("/")) {
        return agentHints;
      }

      const query = commandInput.toLowerCase();

      // Autocomplete for schedule values
      if (query.startsWith("/schedule ")) {
        return [
          { key: "daily", label: "/schedule daily", desc: "Update daily" },
          { key: "weekly", label: "/schedule weekly", desc: "Update weekly" },
          {
            key: "on-demand",
            label: "/schedule on-demand",
            desc: "Update on-demand",
          },
        ].filter((h) => h.label.includes(query));
      }

      return agentHints.filter(
        (h) => h.label.includes(query) || h.desc.toLowerCase().includes(query),
      );
    }

    // Special hints for driver configuration mode
    if (driverBeingConfigured) {
      const configHints = [
        { key: "type", label: "/type", desc: "Set type (continuous|binary)" },
      ];

      // Show different commands based on driver type
      if (driverBeingConfigured.type === "continuous") {
        configHints.push(
          {
            key: "dist",
            label: "/dist",
            desc: "Set distribution (triangular|normal|lognormal)",
          },
          { key: "p", label: "/p", desc: "Set probabilities (p5 p50 p95)" },
        );
      } else if (driverBeingConfigured.type === "binary") {
        configHints.push({
          key: "prob",
          label: "/prob",
          desc: "Set probability (0-100)",
        });
      }

      configHints.push(
        {
          key: "direction",
          label: "/direction",
          desc: "Set direction (increases|decreases)",
        },
        { key: "evidence", label: "/evidence", desc: "Add manual evidence" },
        { key: "save", label: "/save", desc: "Save driver" },
        { key: "cancel", label: "/cancel", desc: "Cancel" },
      );

      // Show driver config hints if not starting with / (agent autocomplete is now global)
      if (!commandInput.startsWith("/")) {
        return configHints;
      }

      const query = commandInput.toLowerCase();

      // Autocomplete for specific command values
      if (query.startsWith("/type ")) {
        return [
          {
            key: "continuous",
            label: "/type continuous",
            desc: "Continuous driver",
          },
          { key: "binary", label: "/type binary", desc: "Binary driver" },
        ].filter((h) => h.label.includes(query));
      }

      if (query.startsWith("/dist ")) {
        return [
          {
            key: "triangular",
            label: "/dist triangular",
            desc: "Triangular distribution",
          },
          { key: "normal", label: "/dist normal", desc: "Normal distribution" },
          {
            key: "lognormal",
            label: "/dist lognormal",
            desc: "Log-normal distribution",
          },
        ].filter((h) => h.label.includes(query));
      }

      if (query.startsWith("/direction ")) {
        return [
          {
            key: "increases",
            label: "/direction increases",
            desc: "Increases probability",
          },
          {
            key: "decreases",
            label: "/direction decreases",
            desc: "Decreases probability",
          },
        ].filter((h) => h.label.includes(query));
      }

      return configHints.filter(
        (h) => h.label.includes(query) || h.desc.toLowerCase().includes(query),
      );
    }

    // Agent autocomplete is now handled globally at the top of getCommandHints()

    if (!commandInput || !commandInput.startsWith("/")) {
      return [
        { key: "question", label: "/question", desc: "Start a new forecast" },
        { key: "help", label: "/help", desc: "Show all commands" },
      ];
    }

    const query = commandInput.toLowerCase();

    // Autocomplete for /grounding values
    if (query.startsWith("/grounding ")) {
      return [
        {
          key: "external",
          label: "/grounding external",
          desc: "External view (base rate)",
        },
        {
          key: "premortem",
          label: "/grounding premortem",
          desc: "Pre-mortem analysis",
        },
        {
          key: "inside",
          label: "/grounding inside view / analysis",
          desc: "Inside view / analysis",
        },
      ].filter((h) => h.label.includes(query));
    }

    const hints = [
      { key: "question", label: "/question", desc: "Start a new forecast" },
      {
        key: "list",
        label: "/list",
        desc: "View forecasts (active/expired/all)",
      },
      { key: "leaderboard", label: "/leaderboard", desc: "Global rankings" },
    ];

    // Only show driver and simulate commands if there's an active forecast
    if (activeForecast) {
      hints.push(
        { key: "driver", label: "/driver", desc: "Add a driver" },
        {
          key: "external",
          label: "/external",
          desc: "Set reference class (external view)",
        },
        {
          key: "premortem",
          label: "/premortem",
          desc: "Enable pre-mortem mode",
        },
        { key: "grounding", label: "/grounding", desc: "Set grounding type" },
        { key: "setprob", label: "/setprob", desc: "Set probability (0-100)" },
        { key: "simulate", label: "/simulate", desc: "Run simulation" },
      );

      // Show expire command if forecast has a probability and isn't resolved yet
      if (activeForecast.probability && !activeForecast.resolved) {
        hints.push({
          key: "expire",
          label: "/expire",
          desc: "Mark expiration (positive/negative)",
        });
      }
    }

    // Autocomplete for /expire values
    if (query.startsWith("/expire ")) {
      return [
        {
          key: "positive",
          label: "/expire positive",
          desc: "Positive outcome",
        },
        {
          key: "negative",
          label: "/expire negative",
          desc: "Negative outcome",
        },
      ].filter((h) => h.label.includes(query));
    }

    return hints.filter(
      (h) => h.label.includes(query) || h.desc.toLowerCase().includes(query),
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Active Question Display */}
        {activeQuestion && (
          <View style={styles.questionDisplay}>
            <Text style={styles.questionText}>{activeQuestion}</Text>

            {/* External View - Always at top to ground the problem class */}
            {activeForecast?.externalView && (
              <TouchableOpacity
                style={styles.externalViewCard}
                onPress={() => {
                  // Click to edit reference class
                  setCommandInput(
                    `/external ${activeForecast.externalView.referenceClass}`,
                  );
                  inputRef.current?.focus();
                }}
              >
                <Text style={styles.externalViewLabel}>
                  📊 External View (Reference Class):
                </Text>
                <Text style={styles.externalViewText}>
                  {activeForecast.externalView.referenceClass}
                </Text>
                {activeForecast.externalView.baseRate !== undefined && (
                  <Text style={styles.baseRateText}>
                    Base Rate:{" "}
                    {Math.round(activeForecast.externalView.baseRate * 100)}%
                    {activeForecast.externalView.source &&
                      ` (${activeForecast.externalView.source})`}
                  </Text>
                )}
                <Text style={styles.externalViewHint}>Click to edit</Text>
              </TouchableOpacity>
            )}

            {parsedResult && (
              <View>
                <Text style={styles.metadata}>
                  {parsedResult.domain}
                  {parsedResult.timeframe &&
                    ` · Resolves ${parsedResult.timeframe}`}
                  {activeForecast?.grounding &&
                    ` · ${activeForecast.grounding}`}
                  {parsedResult.confidence &&
                    ` · ${Math.round(parsedResult.confidence * 100)}% confidence`}
                </Text>
                {activeForecast?.premortem && (
                  <View style={styles.premortemCard}>
                    <Text style={styles.premortemLabel}>
                      🔍 Pre-mortem: {activeForecast.premortem.status}
                    </Text>
                  </View>
                )}
                {activeForecast?.probability != null && (
                  <Text style={styles.probabilityResult}>
                    Forecast: {Math.round(activeForecast.probability * 100)}%
                  </Text>
                )}
                {activeForecast?.simulations &&
                  activeForecast.simulations.length > 0 &&
                  (() => {
                    const latestSimulation =
                      activeForecast.simulations[
                        activeForecast.simulations.length - 1
                      ];
                    return latestSimulation.distribution?.histogram ? (
                      <View style={styles.chartContainer}>
                        <Text style={styles.chartTitle}>
                          Latest Simulation (
                          {latestSimulation.iterations.toLocaleString()}{" "}
                          iterations)
                          {activeForecast.simulations.length > 1 && (
                            <Text style={styles.simulationCount}>
                              {" "}
                              · Run #{activeForecast.simulations.length}
                            </Text>
                          )}
                        </Text>
                        <BarChart
                          data={{
                            labels: [
                              "0%",
                              "",
                              "",
                              "",
                              "",
                              "25%",
                              "",
                              "",
                              "",
                              "",
                              "50%",
                              "",
                              "",
                              "",
                              "",
                              "75%",
                              "",
                              "",
                              "",
                              "100%",
                            ],
                            datasets: [
                              {
                                data: latestSimulation.distribution.histogram,
                              },
                            ],
                          }}
                          width={Dimensions.get("window").width - 40}
                          height={140}
                          yAxisLabel=""
                          yAxisSuffix="%"
                          chartConfig={{
                            backgroundColor: "#3c3836",
                            backgroundGradientFrom: "#3c3836",
                            backgroundGradientTo: "#3c3836",
                            decimalPlaces: 1,
                            color: (opacity = 1) =>
                              `rgba(250, 189, 47, ${opacity})`,
                            labelColor: (opacity = 1) =>
                              `rgba(146, 131, 116, ${opacity})`,
                            style: {
                              borderRadius: 8,
                            },
                            propsForBackgroundLines: {
                              strokeDasharray: "",
                              stroke: "#504945",
                              strokeWidth: 1,
                            },
                            propsForLabels: {
                              fontSize: 9,
                            },
                          }}
                          style={styles.chart}
                          fromZero
                          showBarTops={false}
                          withInnerLines={true}
                          withHorizontalLabels={true}
                          withVerticalLabels={true}
                          segments={4}
                        />
                        <Text style={styles.chartCaption}>
                          Histogram:{" "}
                          {latestSimulation.iterations.toLocaleString()}{" "}
                          simulated outcomes. Median outcome:{" "}
                          {Math.round(latestSimulation.probability * 100)}%
                        </Text>
                        {latestSimulation.reasonForRun && (
                          <Text style={styles.simulationReason}>
                            Reason: {latestSimulation.reasonForRun}
                          </Text>
                        )}

                        {/* Simulation History Chart */}
                        {activeForecast.simulations.length > 1 && (
                          <View style={styles.historyChartContainer}>
                            <Text style={styles.historyChartTitle}>
                              Probability History (
                              {activeForecast.simulations.length} simulations)
                            </Text>
                            <LineChart
                              data={{
                                labels: activeForecast.simulations.map(
                                  (_, idx) =>
                                    idx === 0 ||
                                    idx ===
                                      activeForecast.simulations.length - 1 ||
                                    idx %
                                      Math.max(
                                        1,
                                        Math.floor(
                                          activeForecast.simulations.length / 5,
                                        ),
                                      ) ===
                                      0
                                      ? `#${idx + 1}`
                                      : "",
                                ),
                                datasets: [
                                  {
                                    data: activeForecast.simulations.map(
                                      (s) => s.probability * 100,
                                    ),
                                    color: (opacity = 1) =>
                                      `rgba(184, 187, 38, ${opacity})`,
                                    strokeWidth: 2,
                                  },
                                ],
                              }}
                              width={Dimensions.get("window").width - 64}
                              height={120}
                              yAxisSuffix="%"
                              chartConfig={{
                                backgroundColor: "#3c3836",
                                backgroundGradientFrom: "#3c3836",
                                backgroundGradientTo: "#3c3836",
                                decimalPlaces: 0,
                                color: (opacity = 1) =>
                                  `rgba(184, 187, 38, ${opacity})`,
                                labelColor: (opacity = 1) =>
                                  `rgba(146, 131, 116, ${opacity})`,
                                style: {
                                  borderRadius: 8,
                                },
                                propsForBackgroundLines: {
                                  strokeDasharray: "",
                                  stroke: "#504945",
                                  strokeWidth: 1,
                                },
                                propsForLabels: {
                                  fontSize: 10,
                                },
                                propsForDots: {
                                  r: "3",
                                  strokeWidth: "1",
                                  stroke: "#b8bb26",
                                },
                              }}
                              bezier
                              style={{
                                marginVertical: 8,
                                borderRadius: 8,
                              }}
                              withInnerLines={true}
                              withOuterLines={true}
                              withVerticalLines={false}
                              withHorizontalLines={true}
                              withVerticalLabels={true}
                              withHorizontalLabels={true}
                              segments={4}
                            />
                            <Text style={styles.chartCaption}>
                              Shows how probability changed as drivers and
                              evidence evolved
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : null;
                  })()}
                {activeForecast?.resolved && (
                  <View style={styles.resolutionBox}>
                    <Text style={styles.resolutionText}>
                      ✓ Resolved: {activeForecast.actualOutcome ? "YES" : "NO"}
                    </Text>
                    <Text style={styles.brierScore}>
                      Brier Score: {activeForecast.brierScore?.toFixed(3)}
                      {activeForecast.brierScore! < 0.1 && " (Excellent)"}
                      {activeForecast.brierScore! >= 0.1 &&
                        activeForecast.brierScore! < 0.25 &&
                        " (Good)"}
                      {activeForecast.brierScore! >= 0.25 &&
                        " (Needs improvement)"}
                    </Text>
                  </View>
                )}
                {activeForecast && (
                  <Text style={styles.lastUpdated}>
                    Last updated{" "}
                    {new Date(activeForecast.updatedAt).toLocaleString()}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#fabd2f" />
            <Text style={styles.loadingText}>
              {processingAction || "Processing..."}
            </Text>
          </View>
        )}

        {/* Processing indicator (for quick actions) */}
        {!loading && processingAction && (
          <View style={styles.processingIndicator}>
            <ActivityIndicator size="small" color="#fabd2f" />
            <Text style={styles.processingText}>{processingAction}</Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Agent Being Configured */}
        {agentBeingConfigured && (
          <View style={styles.configSection}>
            <Text style={styles.sectionLabel}>Configuring Agent</Text>
            <View style={styles.agentConfigCard}>
              <Text style={styles.agentName}>@{agentBeingConfigured.name}</Text>
              <Text style={styles.agentDetails}>
                Query: {agentBeingConfigured.query || "not set"} · Schedule:{" "}
                {agentBeingConfigured.schedule || "on-demand"} · Threshold:{" "}
                {agentBeingConfigured.threshold || 10}%
              </Text>
              <Text style={styles.configHint}>
                Use /query, /schedule, /threshold to configure, then /save
              </Text>
            </View>
          </View>
        )}

        {/* Driver Being Configured */}
        {driverBeingConfigured && !agentBeingConfigured && (
          <View style={styles.configSection}>
            <Text style={styles.sectionLabel}>Configuring Driver</Text>

            {/* Major Changes Warning Banner */}
            {majorChangesWarning && majorChangesWarning.changes.length > 0 && (
              <View style={styles.majorChangesWarning}>
                <Text style={styles.warningTitle}>
                  ⚠️ Major Revision Pending
                </Text>
                <Text style={styles.warningSubtitle}>
                  Changes will trigger new simulation:
                </Text>
                {majorChangesWarning.changes.map((change, idx) => (
                  <Text key={idx} style={styles.warningChange}>
                    • {change}
                  </Text>
                ))}
                <View style={styles.warningActions}>
                  <TouchableOpacity
                    style={styles.warningButtonSecondary}
                    onPress={() => setMajorChangesWarning(null)}
                  >
                    <Text style={styles.warningButtonSecondaryText}>
                      Continue Editing
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.warningButtonPrimary}
                    onPress={() => saveConfiguredDriver(true)}
                  >
                    <Text style={styles.warningButtonPrimaryText}>
                      Save Changes
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.configCard}>
              <Text style={styles.driverName}>
                {driverBeingConfigured.name}
              </Text>
              <View style={styles.driverDetailsContainer}>
                {driverBeingConfigured.aiRecommendation && (
                  <View style={styles.aiRecommendationBadge}>
                    <Text style={styles.aiRecommendationText}>
                      🤖 AI: {driverBeingConfigured.aiRecommendation.reasoning}
                    </Text>
                  </View>
                )}
                <Text style={styles.driverTypeLabel}>
                  Type:{" "}
                  <Text style={styles.driverTypeValue}>
                    {driverBeingConfigured.type}
                  </Text>
                </Text>
                {driverBeingConfigured.type === "continuous" ? (
                  <>
                    <Text style={styles.driverFieldLabel}>
                      Distribution:{" "}
                      <Text style={styles.driverFieldValue}>
                        {driverBeingConfigured.distribution}
                      </Text>
                    </Text>
                    <Text style={styles.driverFieldLabel}>
                      Range (p5/p50/p95):{" "}
                      <Text style={styles.driverFieldValue}>
                        {driverBeingConfigured.p5} / {driverBeingConfigured.p50}{" "}
                        / {driverBeingConfigured.p95}
                      </Text>
                    </Text>
                    <View style={styles.pValueGuidance}>
                      <Text style={styles.pValueLabel}>
                        p5 (Low):{" "}
                        <Text style={styles.pValueHint}>
                          Only 5% of the "hill" is left of this. Conservative
                          floor.
                        </Text>
                      </Text>
                      <Text style={styles.pValueLabel}>
                        p50 (Median):{" "}
                        <Text style={styles.pValueHint}>
                          Half the "hill" on either side. Peak or center.
                        </Text>
                      </Text>
                      <Text style={styles.pValueLabel}>
                        p95 (High):{" "}
                        <Text style={styles.pValueHint}>
                          95% of the "hill" is left of this. Realistic ceiling.
                        </Text>
                      </Text>
                    </View>
                    <Text style={styles.driverFieldLabel}>
                      Impact:{" "}
                      <Text style={styles.driverFieldValue}>
                        {driverBeingConfigured.direction} probability
                      </Text>
                    </Text>
                    <Text style={styles.driverFieldExplanation}>
                      Continuous drivers sample from the distribution (p5=5th
                      percentile, p50=median, p95=95th percentile) and multiply
                      the outcome
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.driverFieldLabel}>
                      Probability:{" "}
                      <Text style={styles.driverFieldValue}>
                        {driverBeingConfigured.probability || 50}%
                      </Text>
                    </Text>
                    <Text style={styles.driverFieldExplanation}>
                      Binary drivers either happen (with this probability) or
                      don't happen (forecast fails)
                    </Text>
                  </>
                )}
              </View>
              {driverBeingConfigured.agents &&
                driverBeingConfigured.agents.length > 0 && (
                  <View style={styles.agentsContainer}>
                    <Text style={styles.agentsLabel}>Agents:</Text>
                    <View style={styles.agentsChips}>
                      {driverBeingConfigured.agents.map(
                        (a: any, idx: number) => (
                          <View key={idx} style={styles.agentChipContainer}>
                            <TouchableOpacity
                              style={styles.agentChip}
                              onPress={() => {
                                // Click agent name to edit
                                setAgentBeingConfigured({
                                  name: a.name || a,
                                  query: a.query,
                                  schedule: a.schedule,
                                  threshold: a.threshold,
                                });
                                // Remove from list temporarily while editing
                                const updated =
                                  driverBeingConfigured.agents.filter(
                                    (_: any, i: number) => i !== idx,
                                  );
                                setDriverBeingConfigured({
                                  ...driverBeingConfigured,
                                  agents: updated,
                                });
                              }}
                            >
                              <Text style={styles.agentChipText}>
                                @{a.name || a}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.agentChipRemoveBtn}
                              onPress={() => {
                                // Click × to remove permanently
                                const updated =
                                  driverBeingConfigured.agents.filter(
                                    (_: any, i: number) => i !== idx,
                                  );
                                setDriverBeingConfigured({
                                  ...driverBeingConfigured,
                                  agents: updated,
                                });
                              }}
                            >
                              <Text style={styles.agentChipRemove}>×</Text>
                            </TouchableOpacity>
                          </View>
                        ),
                      )}
                    </View>
                  </View>
                )}
              <Text style={styles.configHint}>
                {driverBeingConfigured.type === "continuous"
                  ? "Commands: /type (continuous|binary) · /dist (triangular|normal|lognormal) · /p <p5> <p50> <p95> · /direction (increases|decreases)"
                  : "Commands: /type (continuous|binary) · /prob <0-100>"}
                {"\n"}Type @ to add research agent · /save to finish
              </Text>
            </View>
          </View>
        )}

        {/* Active Forecast Drivers */}
        {activeForecast &&
          activeForecast.drivers.length > 0 &&
          !driverBeingConfigured && (
            <View style={styles.driversSection}>
              <Text style={styles.sectionLabel}>
                Drivers ({activeForecast.drivers.length})
              </Text>
              {activeForecast.drivers.map((driver: any) => (
                <TouchableOpacity
                  key={driver.id}
                  style={styles.driverCard}
                  onPress={() => editDriver(driver)}
                >
                  <Text style={styles.driverName}>{driver.name}</Text>
                  <Text style={styles.driverDetails}>
                    {driver.type === "continuous"
                      ? `P(${driver.p5}-${driver.p50}-${driver.p95}) · ${driver.distribution}`
                      : `P(${driver.probability}%)`}{" "}
                    · {driver.direction}
                  </Text>
                  {driver.evidence && driver.evidence.length > 0 && (
                    <View style={styles.evidenceSection}>
                      <Text style={styles.evidenceLabel}>
                        📚 Evidence ({driver.evidence.length}):
                      </Text>
                      {driver.evidence.map((ev: any, idx: number) => (
                        <View key={idx} style={styles.evidenceItem}>
                          <Text style={styles.evidenceSource}>
                            @{ev.source} ·{" "}
                            {new Date(ev.timestamp).toLocaleDateString()}
                          </Text>
                          <Text style={styles.evidenceSummary}>
                            {ev.summary}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

        {/* Suggested Drivers */}
        {parsedResult &&
          parsedResult.suggestedDrivers &&
          parsedResult.suggestedDrivers.length > 0 &&
          activeForecast &&
          !driverBeingConfigured && (
            <View style={styles.driversSection}>
              <Text style={styles.sectionLabel}>Suggested Drivers</Text>
              {parsedResult.suggestedDrivers.map(
                (driver: string, idx: number) => {
                  // Check if this driver is already added
                  const alreadyAdded = activeForecast.drivers.some(
                    (d: any) => d.name.toLowerCase() === driver.toLowerCase(),
                  );
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.suggestedDriverCard,
                        alreadyAdded && styles.suggestedDriverCardAdded,
                      ]}
                      onPress={() => startDriverConfiguration(idx)}
                      disabled={alreadyAdded}
                    >
                      <Text style={styles.driverNumber}>{idx + 1}</Text>
                      <Text
                        style={[
                          styles.driverName,
                          alreadyAdded && styles.driverNameAdded,
                        ]}
                      >
                        {driver} {alreadyAdded && "✓"}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>
          )}

        {/* Hint for adding drivers - only when NOT configuring */}
        {activeForecast &&
          !driverBeingConfigured &&
          parsedResult &&
          parsedResult.suggestedDrivers &&
          parsedResult.suggestedDrivers.length > 0 &&
          activeForecast.drivers.length === 0 && (
            <View style={styles.hintCard}>
              <Text style={styles.hintText}>
                Type <Text style={styles.hintCommand}>1</Text>,{" "}
                <Text style={styles.hintCommand}>2</Text>, etc. to add a
                suggested driver, or{" "}
                <Text style={styles.hintCommand}>/driver Your driver</Text> for
                custom
              </Text>
            </View>
          )}
        {activeForecast &&
          !driverBeingConfigured &&
          (!parsedResult ||
            !parsedResult.suggestedDrivers ||
            parsedResult.suggestedDrivers.length === 0 ||
            activeForecast.drivers.length > 0) && (
            <View style={styles.hintCard}>
              <Text style={styles.hintText}>
                Type <Text style={styles.hintCommand}>/driver Your driver</Text>{" "}
                to add a driver
              </Text>
            </View>
          )}

        {/* Multi-User Leaderboard */}
        {showLeaderboard &&
          (() => {
            const resolved = savedForecasts.filter((f) => f.resolved);
            const userAvgBrier =
              resolved.length > 0
                ? resolved.reduce((sum, f) => sum + (f.brierScore || 0), 0) /
                  resolved.length
                : 0.5;

            // Fake leaderboard data
            const leaderboardData = [
              {
                rank: 1,
                name: "ForecastMaster",
                avgBrier: 0.082,
                forecasts: 47,
                badge: "★★★",
              },
              {
                rank: 2,
                name: "DataDriven",
                avgBrier: 0.095,
                forecasts: 23,
                badge: "★★★",
              },
              {
                rank: 3,
                name: "You",
                avgBrier: userAvgBrier,
                forecasts: resolved.length,
                badge:
                  userAvgBrier < 0.1 ? "★★★" : userAvgBrier < 0.25 ? "★★" : "★",
                isUser: true,
              },
              {
                rank: 4,
                name: "TrendSpotter",
                avgBrier: 0.156,
                forecasts: 31,
                badge: "★★",
              },
              {
                rank: 5,
                name: "Predictor99",
                avgBrier: 0.178,
                forecasts: 19,
                badge: "★★",
              },
              {
                rank: 6,
                name: "BayesianBob",
                avgBrier: 0.213,
                forecasts: 12,
                badge: "★★",
              },
              {
                rank: 7,
                name: "Newbie2026",
                avgBrier: 0.287,
                forecasts: 8,
                badge: "★",
              },
            ]
              .sort((a, b) => a.avgBrier - b.avgBrier)
              .map((user, idx) => ({ ...user, rank: idx + 1 }));

            return (
              <View style={styles.forecastList}>
                <View style={styles.listHeader}>
                  <Text style={styles.listTitle}>🏆 Global Leaderboard</Text>
                </View>

                {leaderboardData.map((user) => (
                  <View
                    key={user.name}
                    style={[
                      styles.leaderboardItem,
                      user.isUser && styles.leaderboardItemUser,
                    ]}
                  >
                    <Text style={styles.leaderboardRank}>#{user.rank}</Text>
                    <Text style={styles.leaderboardBadge}>{user.badge}</Text>
                    <View style={styles.leaderboardInfo}>
                      <Text
                        style={[
                          styles.leaderboardName,
                          user.isUser && styles.leaderboardNameUser,
                        ]}
                      >
                        {user.name}
                      </Text>
                      <Text style={styles.leaderboardStats}>
                        Avg Brier: {user.avgBrier.toFixed(3)} • {user.forecasts}{" "}
                        forecasts
                      </Text>
                    </View>
                  </View>
                ))}

                <Text style={styles.leaderboardFooter}>
                  Resolve more forecasts to climb the ranks!
                </Text>
              </View>
            );
          })()}

        {/* Forecast List - Filtered */}
        {showForecastList &&
          (() => {
            const filteredForecasts = savedForecasts.filter((f) => {
              if (forecastFilter === "active") return !f.resolved;
              if (forecastFilter === "expired") return f.resolved;
              return true; // all
            });

            const listTitle =
              forecastFilter === "active"
                ? "Active Forecasts"
                : forecastFilter === "expired"
                  ? "Expired Forecasts"
                  : "All Forecasts";

            return (
              <View style={styles.forecastList}>
                <View style={styles.listHeader}>
                  <Text style={styles.listTitle}>{listTitle}</Text>
                  {forecastFilter === "expired" &&
                    filteredForecasts.length > 0 && (
                      <Text style={styles.resolvedCount}>
                        {filteredForecasts.length} expired
                      </Text>
                    )}
                </View>

                {/* Performance Summary */}
                {(() => {
                  const resolved = savedForecasts.filter((f) => f.resolved);
                  if (resolved.length === 0) return null;

                  const avgBrier =
                    resolved.reduce((sum, f) => sum + (f.brierScore || 0), 0) /
                    resolved.length;
                  const excellent = resolved.filter(
                    (f) => f.brierScore! < 0.1,
                  ).length;
                  const good = resolved.filter(
                    (f) => f.brierScore! >= 0.1 && f.brierScore! < 0.25,
                  ).length;
                  const poor = resolved.filter(
                    (f) => f.brierScore! >= 0.25,
                  ).length;

                  let emoji = "🎯";
                  let grade = "Excellent";
                  let color = "#b8bb26";

                  if (avgBrier >= 0.25) {
                    emoji = "📊";
                    grade = "Learning";
                    color = "#fb4934";
                  } else if (avgBrier >= 0.1) {
                    emoji = "⭐";
                    grade = "Good";
                    color = "#fabd2f";
                  }

                  return (
                    <View style={styles.performanceSummary}>
                      <Text style={[styles.performanceEmoji, { color }]}>
                        {emoji}
                      </Text>
                      <View style={styles.performanceStats}>
                        <Text style={[styles.performanceGrade, { color }]}>
                          {grade} Forecaster
                        </Text>
                        <Text style={styles.performanceDetail}>
                          Avg Brier: {avgBrier.toFixed(3)} • {excellent}{" "}
                          excellent • {good} good • {poor} need work
                        </Text>
                      </View>
                    </View>
                  );
                })()}
                {filteredForecasts.length === 0 ? (
                  <Text style={styles.emptyListText}>
                    {forecastFilter === "active" &&
                      "No active forecasts. Type /question to create one."}
                    {forecastFilter === "expired" &&
                      "No expired forecasts yet. Use /expire to mark outcomes."}
                    {forecastFilter === "all" &&
                      "No forecasts yet. Type /question to create one."}
                  </Text>
                ) : (
                  [...filteredForecasts]
                    .filter((f) =>
                      forecastFilter === "expired" ? f.resolved : true,
                    )
                    .sort((a, b) => {
                      if (
                        forecastFilter === "expired" &&
                        a.resolved &&
                        b.resolved
                      ) {
                        return (a.brierScore || 1) - (b.brierScore || 1);
                      }
                      return (
                        new Date(b.updatedAt).getTime() -
                        new Date(a.updatedAt).getTime()
                      );
                    })
                    .map((forecast) => (
                      <TouchableOpacity
                        key={forecast.id}
                        style={styles.forecastItem}
                        onPress={() => loadForecast(forecast)}
                      >
                        <View style={styles.forecastHeader}>
                          <Text style={styles.forecastQuestion}>
                            {forecast.question}
                          </Text>
                          {forecast.drivers && forecast.drivers.length > 0 && (
                            <View style={styles.driverBadge}>
                              <Text style={styles.driverBadgeText}>
                                {forecast.drivers.length}
                              </Text>
                            </View>
                          )}
                        </View>
                        {forecast.domain && (
                          <Text style={styles.forecastMeta}>
                            {forecast.domain}
                            {forecast.timeframe && ` · ${forecast.timeframe}`}
                            {forecast.probability != null &&
                              ` · ${(forecast.probability * 100).toFixed(0)}%`}
                          </Text>
                        )}
                        <View style={styles.forecastResolution}>
                          <Text
                            style={[
                              styles.resolutionBadge,
                              forecast.actualOutcome
                                ? styles.resolvedYes
                                : styles.resolvedNo,
                            ]}
                          >
                            {forecast.actualOutcome ? "YES" : "NO"}
                          </Text>
                          <Text
                            style={[
                              styles.brierBadge,
                              forecast.brierScore! < 0.1 &&
                                styles.brierExcellent,
                              forecast.brierScore! >= 0.1 &&
                                forecast.brierScore! < 0.25 &&
                                styles.brierGood,
                              forecast.brierScore! >= 0.25 && styles.brierPoor,
                            ]}
                          >
                            Brier: {forecast.brierScore?.toFixed(3)}
                          </Text>
                        </View>
                        <Text style={styles.forecastDate}>
                          {new Date(forecast.updatedAt).toLocaleDateString()}
                        </Text>
                      </TouchableOpacity>
                    ))
                )}
              </View>
            );
          })()}

        {/* Empty State */}
        {!activeQuestion &&
          !loading &&
          !showForecastList &&
          !showLeaderboard &&
          (() => {
            const resolved = savedForecasts.filter((f) => f.resolved);
            let statusIndicator = "◆";
            let statusMessage = "Ready to forecast";
            let statusColor = "#ebdbb2";

            if (resolved.length > 0) {
              const avgBrier =
                resolved.reduce((sum, f) => sum + (f.brierScore || 0), 0) /
                resolved.length;

              if (avgBrier < 0.1) {
                statusIndicator = "◆◆◆";
                statusMessage = "Elite Performance";
                statusColor = "#b8bb26";
              } else if (avgBrier < 0.15) {
                statusIndicator = "◆◆◆";
                statusMessage = "Strong Calibration";
                statusColor = "#b8bb26";
              } else if (avgBrier < 0.2) {
                statusIndicator = "◆◆";
                statusMessage = "Good Progress";
                statusColor = "#fabd2f";
              } else if (avgBrier < 0.25) {
                statusIndicator = "◆◆";
                statusMessage = "Developing Skill";
                statusColor = "#fabd2f";
              } else if (avgBrier < 0.3) {
                statusIndicator = "◆";
                statusMessage = "Building Foundation";
                statusColor = "#fb4934";
              } else {
                statusIndicator = "◆";
                statusMessage = "Early Stage";
                statusColor = "#fb4934";
              }
            }

            return (
              <View style={styles.emptyState}>
                <Text style={[styles.statusIndicator, { color: statusColor }]}>
                  {statusIndicator}
                </Text>
                <Text style={[styles.statusMessage, { color: statusColor }]}>
                  {statusMessage}
                </Text>
                <Text style={styles.emptyTitle}>Universal Forecasting</Text>
                <Text style={styles.emptySubtitle}>
                  Type <Text style={styles.emptyCommand}>/question</Text> to
                  start or <Text style={styles.emptyCommand}>/list</Text> to see
                  forecasts
                </Text>
                <Text style={styles.versionText}>v{VERSION}</Text>
              </View>
            );
          })()}
      </ScrollView>

      {/* Command Input - Fixed at bottom */}
      <View style={styles.commandSection}>
        {/* Version indicator */}
        <View style={styles.versionIndicator}>
          <Text style={styles.versionIndicatorText}>v{VERSION}</Text>
        </View>
        {/* Command Hints - Only show when input is focused */}
        {inputFocused && showCommandHints && getCommandHints().length > 0 && (
          <View style={styles.hintsPanel}>
            {getCommandHints().map((hint) => (
              <TouchableOpacity
                key={hint.key}
                style={styles.hintItem}
                onPress={() => {
                  if (hint.key === "question") {
                    setCommandInput("/question ");
                  } else if (hint.label.startsWith("@")) {
                    // For agent autocomplete, check if we're in /run context
                    if (commandInput.includes("/run")) {
                      setCommandInput("/run " + hint.label + " ");
                    } else {
                      setCommandInput(hint.label + " ");
                    }
                  } else {
                    setCommandInput(hint.label + " ");
                  }
                  inputRef.current?.focus();
                }}
              >
                <Text style={styles.hintLabel}>{hint.label}</Text>
                <Text style={styles.hintDesc}>{hint.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Command Input Field */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            {/* Ghost suggestion text */}
            {getSuggestion() && (
              <Text style={styles.suggestionText}>{getSuggestion()}</Text>
            )}
            <TextInput
              ref={inputRef}
              style={styles.commandInput}
              placeholder="Type / for commands or @ for agents"
              placeholderTextColor="#665c54"
              value={commandInput}
              onChangeText={(text) => {
                setCommandInput(text);
                // Clear error when typing
                if (error) setError("");
              }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onSubmitEditing={() => {
                // Accept suggestion on enter if it exists
                const suggestion = getSuggestion();
                if (suggestion && commandInput !== suggestion) {
                  setCommandInput(suggestion);
                } else {
                  handleCommandSubmit();
                }
              }}
              onKeyPress={(e) => {
                // Tab key to accept suggestion
                if (e.nativeEvent.key === "Tab") {
                  e.preventDefault();
                  const suggestion = getSuggestion();
                  if (suggestion) {
                    setCommandInput(suggestion);
                  }
                }
              }}
              autoCapitalize="none"
              returnKeyType="done"
              blurOnSubmit={false}
            />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#282828",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Space for command input
  },
  questionDisplay: {
    marginBottom: 24,
  },
  questionText: {
    fontSize: 28,
    fontWeight: "400",
    color: "#ebdbb2",
    lineHeight: 38,
    marginBottom: 8,
  },
  metadata: {
    fontSize: 13,
    color: "#928374",
    marginBottom: 4,
  },
  externalViewCard: {
    backgroundColor: "#3c3836",
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#83a598",
  },
  externalViewLabel: {
    fontSize: 12,
    color: "#83a598",
    fontWeight: "600",
    marginBottom: 6,
  },
  externalViewText: {
    fontSize: 14,
    color: "#ebdbb2",
    fontWeight: "500",
    marginBottom: 4,
  },
  externalViewHint: {
    fontSize: 10,
    color: "#928374",
    fontStyle: "italic",
    marginTop: 6,
  },
  baseRateText: {
    fontSize: 12,
    color: "#b8bb26",
    marginTop: 4,
  },
  premortemCard: {
    backgroundColor: "#3c3836",
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#fabd2f",
  },
  premortemLabel: {
    fontSize: 12,
    color: "#fabd2f",
    fontWeight: "600",
  },
  lastUpdated: {
    fontSize: 11,
    color: "#665c54",
    fontStyle: "italic",
  },
  probabilityResult: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fabd2f",
    marginTop: 8,
    marginBottom: 4,
  },
  chartContainer: {
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: "#3c3836",
    padding: 12,
    borderRadius: 8,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ebdbb2",
    marginBottom: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  chartCaption: {
    fontSize: 11,
    color: "#928374",
    marginTop: 8,
    textAlign: "center",
    fontStyle: "italic",
  },
  simulationCount: {
    fontSize: 11,
    color: "#928374",
    fontWeight: "normal",
  },
  simulationReason: {
    fontSize: 11,
    color: "#928374",
    marginTop: 4,
    fontStyle: "italic",
  },
  historyChartContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#504945",
  },
  historyChartTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#d79921",
    marginBottom: 8,
  },
  resolutionBox: {
    backgroundColor: "#3c3836",
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#b8bb26",
  },
  resolutionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#b8bb26",
    marginBottom: 4,
  },
  brierScore: {
    fontSize: 13,
    color: "#ebdbb2",
  },
  loadingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#3c3836",
    borderRadius: 8,
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 14,
    color: "#d5c4a1",
  },
  processingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#3c3836",
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  processingText: {
    fontSize: 12,
    color: "#928374",
  },
  errorCard: {
    backgroundColor: "#cc241d",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    color: "#ebdbb2",
  },
  driversSection: {
    marginTop: 24,
  },
  configSection: {
    marginTop: 24,
  },
  majorChangesWarning: {
    backgroundColor: "#3c3836",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#fabd2f",
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fabd2f",
    marginBottom: 8,
  },
  warningSubtitle: {
    fontSize: 13,
    color: "#ebdbb2",
    marginBottom: 8,
  },
  warningChange: {
    fontSize: 12,
    color: "#d79921",
    marginBottom: 4,
    paddingLeft: 8,
  },
  warningActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  warningButtonSecondary: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#665c54",
    backgroundColor: "transparent",
    alignItems: "center",
  },
  warningButtonSecondaryText: {
    fontSize: 12,
    color: "#ebdbb2",
    fontWeight: "500",
  },
  warningButtonPrimary: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    backgroundColor: "#d79921",
    alignItems: "center",
  },
  warningButtonPrimaryText: {
    fontSize: 12,
    color: "#282828",
    fontWeight: "600",
  },
  configCard: {
    backgroundColor: "#3c3836",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#d79921",
  },
  configHint: {
    fontSize: 11,
    color: "#928374",
    marginTop: 8,
    fontStyle: "italic",
  },
  agentsContainer: {
    marginTop: 8,
  },
  agentsLabel: {
    fontSize: 11,
    color: "#928374",
    marginBottom: 4,
  },
  agentsChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  agentChipContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3c3836",
    borderWidth: 1,
    borderColor: "#b8bb26",
    borderRadius: 12,
  },
  agentChip: {
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 4,
  },
  agentChipText: {
    fontSize: 11,
    color: "#b8bb26",
    fontWeight: "500",
  },
  agentChipRemoveBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  agentChipRemove: {
    fontSize: 16,
    color: "#fb4934",
    fontWeight: "700",
    lineHeight: 16,
  },
  agentConfigCard: {
    backgroundColor: "#3c3836",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#b8bb26",
  },
  agentName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#b8bb26",
    marginBottom: 4,
  },
  agentDetails: {
    fontSize: 12,
    color: "#928374",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#928374",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  driverCard: {
    backgroundColor: "#3c3836",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#458588",
  },
  evidenceSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#504945",
  },
  evidenceLabel: {
    fontSize: 11,
    color: "#83a598",
    fontWeight: "600",
    marginBottom: 6,
  },
  evidenceItem: {
    marginBottom: 8,
  },
  evidenceSource: {
    fontSize: 10,
    color: "#928374",
    marginBottom: 2,
  },
  evidenceSummary: {
    fontSize: 12,
    color: "#ebdbb2",
    lineHeight: 16,
  },
  suggestedDriverCard: {
    backgroundColor: "#3c3836",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#fabd2f",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  suggestedDriverCardAdded: {
    backgroundColor: "#32302f",
    borderLeftColor: "#665c54",
    opacity: 0.6,
  },
  driverNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fabd2f",
    minWidth: 24,
  },
  driverName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#ebdbb2",
    marginBottom: 4,
    flex: 1,
  },
  driverNameAdded: {
    color: "#928374",
  },
  driverDetails: {
    fontSize: 12,
    color: "#928374",
  },
  driverDetailsContainer: {
    marginTop: 8,
    gap: 4,
  },
  aiRecommendationBadge: {
    backgroundColor: "#3c3836",
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#b8bb26",
    marginBottom: 8,
  },
  aiRecommendationText: {
    fontSize: 11,
    color: "#b8bb26",
    fontStyle: "italic",
  },
  driverTypeLabel: {
    fontSize: 13,
    color: "#ebdbb2",
    marginBottom: 4,
  },
  driverTypeValue: {
    fontWeight: "600",
    color: "#fabd2f",
  },
  driverFieldLabel: {
    fontSize: 12,
    color: "#d5c4a1",
    marginTop: 2,
  },
  driverFieldValue: {
    fontWeight: "500",
    color: "#b8bb26",
  },
  driverFieldExplanation: {
    fontSize: 11,
    color: "#928374",
    fontStyle: "italic",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#504945",
  },
  pValueGuidance: {
    backgroundColor: "#32302f",
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#b8bb26",
  },
  pValueLabel: {
    fontSize: 12,
    color: "#ebdbb2",
    marginBottom: 4,
    fontWeight: "500",
  },
  pValueHint: {
    fontSize: 11,
    color: "#928374",
    fontWeight: "normal",
    fontStyle: "italic",
  },
  hintCard: {
    backgroundColor: "#3c3836",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#b8bb26",
  },
  hintText: {
    fontSize: 13,
    color: "#928374",
  },
  hintCommand: {
    fontWeight: "600",
    color: "#fabd2f",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  statusIndicator: {
    fontSize: 48,
    fontWeight: "300",
    letterSpacing: 8,
    marginBottom: 16,
  },
  statusMessage: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 32,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  emptyTitle: {
    fontSize: 32,
    fontWeight: "300",
    color: "#ebdbb2",
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#928374",
  },
  emptyCommand: {
    fontWeight: "600",
    color: "#fabd2f",
  },
  versionText: {
    fontSize: 11,
    color: "#665c54",
    marginTop: 12,
    fontStyle: "italic",
  },
  commandSection: {
    backgroundColor: "#282828",
    borderTopWidth: 1,
    borderTopColor: "#3c3836",
  },
  versionIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#3c3836",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1000,
  },
  versionIndicatorText: {
    fontSize: 10,
    color: "#928374",
    fontWeight: "600",
  },
  hintsPanel: {
    backgroundColor: "#3c3836",
    borderTopWidth: 1,
    borderTopColor: "#504945",
  },
  hintItem: {
    padding: 8, // Reduced from 12
    borderBottomWidth: 1,
    borderBottomColor: "#504945",
  },
  hintLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fabd2f",
    marginBottom: 2,
  },
  hintDesc: {
    fontSize: 12,
    color: "#928374",
  },
  inputContainer: {
    padding: 16,
  },
  inputWrapper: {
    position: "relative",
    backgroundColor: "#3c3836",
    borderRadius: 8,
  },
  suggestionText: {
    position: "absolute",
    left: 16,
    top: 16,
    fontSize: 15,
    color: "#504945",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    zIndex: 0,
    pointerEvents: "none",
  },
  commandInput: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#504945",
    borderRadius: 8,
    padding: 16,
    fontSize: 15,
    color: "#ebdbb2",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    position: "relative",
    zIndex: 1,
  },
  forecastList: {
    marginTop: 24,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#ebdbb2",
  },
  resolvedCount: {
    fontSize: 12,
    color: "#b8bb26",
    fontWeight: "600",
  },
  performanceSummary: {
    backgroundColor: "#3c3836",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#fabd2f",
  },
  performanceEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  performanceStats: {
    flex: 1,
  },
  performanceGrade: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  performanceDetail: {
    fontSize: 12,
    color: "#928374",
  },
  leaderboardItem: {
    backgroundColor: "#3c3836",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  leaderboardItemUser: {
    borderWidth: 2,
    borderColor: "#fabd2f",
    backgroundColor: "#504945",
  },
  leaderboardRank: {
    fontSize: 18,
    fontWeight: "700",
    color: "#928374",
    width: 40,
  },
  leaderboardBadge: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fabd2f",
    marginRight: 12,
    width: 50,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ebdbb2",
    marginBottom: 4,
  },
  leaderboardNameUser: {
    color: "#fabd2f",
  },
  leaderboardStats: {
    fontSize: 12,
    color: "#928374",
  },
  leaderboardFooter: {
    fontSize: 13,
    color: "#928374",
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
  },
  emptyListText: {
    fontSize: 14,
    color: "#928374",
    fontStyle: "italic",
  },
  forecastItem: {
    backgroundColor: "#3c3836",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#458588",
  },
  forecastHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  forecastQuestion: {
    fontSize: 16,
    fontWeight: "500",
    color: "#ebdbb2",
    flex: 1,
    marginRight: 8,
  },
  driverBadge: {
    backgroundColor: "#458588",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  driverBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ebdbb2",
  },
  forecastMeta: {
    fontSize: 12,
    color: "#928374",
    marginBottom: 4,
  },
  forecastDate: {
    fontSize: 11,
    color: "#665c54",
  },
  forecastResolution: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  resolutionBadge: {
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resolvedYes: {
    backgroundColor: "#b8bb26",
    color: "#282828",
  },
  resolvedNo: {
    backgroundColor: "#fb4934",
    color: "#282828",
  },
  brierBadge: {
    fontSize: 10,
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#3c3836",
  },
  brierExcellent: {
    color: "#b8bb26",
  },
  brierGood: {
    color: "#fabd2f",
  },
  brierPoor: {
    color: "#fb4934",
  },
});
