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

// Add custom scrollbar CSS for web
if (Platform.OS === "web" && typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    .fermi-chat-scroll::-webkit-scrollbar {
      width: 8px;
    }
    .fermi-chat-scroll::-webkit-scrollbar-track {
      background: #282828;
    }
    .fermi-chat-scroll::-webkit-scrollbar-thumb {
      background: #665c54;
      border-radius: 4px;
    }
    .fermi-chat-scroll::-webkit-scrollbar-thumb:hover {
      background: #7c6f64;
    }
  `;
  if (!document.head.querySelector("style[data-fermi-scrollbar]")) {
    style.setAttribute("data-fermi-scrollbar", "true");
    document.head.appendChild(style);
  }
}
import { BarChart, LineChart } from "react-native-chart-kit";
import Markdown from "react-native-markdown-display";
import { researchService } from "../services/researchService";
import { LinkPreviewCard } from "../components/LinkPreviewCard";
import {
  executeCommand,
  type CommandContext,
  type CommandSuggestion,
} from "../services/fermiCommands";
import { idGenerators } from "../utils/idGenerator";

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
    generatedBy?: "fermi" | "user"; // Track provenance
    confidence?: "high" | "medium" | "low"; // Confidence level
    reasoning?: string; // AI's reasoning (2-3 sentences)
    updatedAt?: string; // When last updated
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
  fermiConversation?: {
    timestamp: string;
    role: "user" | "fermi";
    message: string;
  }[];
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
  const [forecastPrivacy, setForecastPrivacy] = useState<
    "private" | "unlisted" | "public" | "organization"
  >("private");
  const [forecastTags, setForecastTags] = useState<string[]>([]);
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
  const [isOnline, setIsOnline] = useState(true); // Track backend connectivity
  const [expandedEvidence, setExpandedEvidence] = useState<Set<string>>(
    new Set(),
  );
  const [tabCycleIndex, setTabCycleIndex] = useState(0);
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
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    action: string;
    data?: any;
    message: string;
  } | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    timestamp: number;
  } | null>(null);
  const [fermiChatExpanded, setFermiChatExpanded] = useState(true); // Always start expanded
  const [fermiChatCollapsed, setFermiChatCollapsed] = useState(false);
  const [fermiChatInput, setFermiChatInput] = useState("");
  const [fermiThinking, setFermiThinking] = useState(false);
  const [globalFermiConversation, setGlobalFermiConversation] = useState<
    Array<{ timestamp: string; role: string; message: string }>
  >([]);
  const inputRef = useRef<TextInput>(null);
  const chatScrollRef = useRef<ScrollView>(null);

  // Toast notification helper
  const showToast = (message: string) => {
    setToast({ message, timestamp: Date.now() });
    setTimeout(() => setToast(null), 3000);
  };

  // Check if screen is wide enough for side-by-side layout
  const screenWidth = Dimensions.get("window").width;
  const isWideScreen = screenWidth >= 768;

  useEffect(() => {
    // Load saved forecasts
    loadForecasts();
    // Focus input on mount
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Migrate old evidence format to new format
  const migrateEvidenceFormat = (forecasts: any[]) => {
    return forecasts.map((forecast) => {
      if (!forecast.drivers) return forecast;

      const updatedDrivers = forecast.drivers.map((driver: any) => {
        if (!driver.evidence || !Array.isArray(driver.evidence)) return driver;

        const migratedEvidence = driver.evidence.map((ev: any) => {
          if (!ev.fullResult) return ev;

          console.log(
            "[Migration] Checking evidence for",
            driver.name,
            "fullResult keys:",
            Object.keys(ev.fullResult),
          );

          // Check if fullResult has the old wrapper structure with nested .result
          if (ev.fullResult.result && !ev.fullResult.response) {
            console.log(
              "[Migration] Unwrapping nested .result for",
              driver.name,
            );
            return {
              ...ev,
              fullResult: ev.fullResult.result,
              summary: ev.fullResult.result?.summary || ev.summary,
            };
          }

          // Check if fullResult is missing .response but has other ResearchResult fields
          // This means it's actually the wrapper object { result: ResearchResult } stored flat
          if (
            !ev.fullResult.response &&
            ev.fullResult.summary &&
            ev.fullResult.agentId
          ) {
            console.log(
              "[Migration] Already unwrapped but missing response, keeping as-is",
            );
            return ev;
          }

          // If it has .response, it's the correct format
          if (ev.fullResult.response) {
            console.log("[Migration] Correct format detected for", driver.name);
            return ev;
          }

          console.log(
            "[Migration] Unknown format for",
            driver.name,
            "- not migrating",
          );
          return ev;
        });

        return { ...driver, evidence: migratedEvidence };
      });

      return { ...forecast, drivers: updatedDrivers };
    });
  };

  const loadForecasts = async () => {
    try {
      // Try loading from backend first
      const { loadForecastsWithSync } = await import("../utils/backendSync");
      const result = await loadForecastsWithSync();

      if (result.fromBackend) {
        console.log(`Loaded ${result.forecasts.length} forecasts from backend`);
        const migrated = migrateEvidenceFormat(result.forecasts);
        setSavedForecasts(migrated);

        // Clear local storage since backend is source of truth
        if (Platform.OS === "web") {
          localStorage.removeItem(STORAGE_KEY);
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
        console.log("Cleared local storage - using backend as source of truth");
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
        const migrated = migrateEvidenceFormat(forecasts);
        setSavedForecasts(migrated);

        // Save migrated data back
        if (Platform.OS === "web") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        } else {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        }
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
    console.log("[LoadForecast] Loading forecast:", forecast.id);
    console.log(
      "[LoadForecast] Drivers in forecast:",
      forecast.drivers?.length || 0,
    );
    console.log("[LoadForecast] Driver details:", forecast.drivers);

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
    // Show hints when: typing /, typing @, in driver config, or in agent config
    if (
      commandInput.startsWith("/") ||
      commandInput.includes("@") ||
      (driverBeingConfigured && commandInput === "") ||
      (agentBeingConfigured && commandInput === "")
    ) {
      setShowCommandHints(true);
    } else {
      setShowCommandHints(false);
    }
  }, [commandInput, driverBeingConfigured, agentBeingConfigured]);

  // Check backend connectivity on mount and periodically
  useEffect(() => {
    const checkConnectivity = async () => {
      try {
        const response = await fetch(
          "https://uffp-backend.vercel.app/api/forecasts?action=ping",
          {
            method: "OPTIONS",
            signal: AbortSignal.timeout(5000),
          },
        );
        const online = response.ok;
        if (isOnline !== online) {
          setIsOnline(online);
          if (!online) {
            setError(
              "⚠️ Backend offline - editing disabled. CRDT sync coming soon!",
            );
          }
        }
      } catch (err) {
        if (isOnline) {
          setIsOnline(false);
          setError(
            "⚠️ Backend offline - editing disabled. CRDT sync coming soon!",
          );
        }
      }
    };

    // Check immediately
    checkConnectivity();

    // Check every 30 seconds
    const interval = setInterval(checkConnectivity, 30000);

    return () => clearInterval(interval);
  }, [isOnline]);

  // Detect current context for command system
  const getCurrentContext = (): CommandContext => {
    if (agentBeingConfigured) return "agent_config";
    if (driverBeingConfigured) return "driver_config";
    if (activeForecast) {
      if (activeForecast.probability !== undefined) return "simulation_results";
      if (activeForecast.drivers && activeForecast.drivers.length > 0)
        return "forecast_active";
      return "forecast_active";
    }
    return "forecast_list";
  };

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
        id: idGenerators.driver(),
        name: suggestedDriver,
        type: recommendation.type,
        direction: recommendation.direction,
        agents: [] as any[],
        researchResults: [] as any[],
        evidence: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        aiRecommendation: recommendation, // Store for reference
        version: { major: 1, minor: 0 },
        versionHistory: [],
      };

      if (recommendation.type === "binary") {
        newDriver.probability = recommendation.examples?.probability || 0.5;
      } else {
        newDriver.distribution = recommendation.distribution || "triangular";
        newDriver.p5 = recommendation.examples?.p5 || 30;
        newDriver.p50 = recommendation.examples?.p50 || 50;
        newDriver.p95 = recommendation.examples?.p95 || 70;
      }

      setDriverBeingConfigured(newDriver);
      setCommandInput("");

      // Show AI recommendation + Fermi hint
      const { getFermiHints } = await import("../services/fermiHints");
      const fermiHint = getFermiHints(suggestedDriver);

      let message = `✓ AI configured as ${recommendation.type} ${recommendation.distribution || ""}. ${recommendation.reasoning}`;

      if (fermiHint) {
        message += `\n\n🦊 Fermi Tip: Type /fermi for decomposition hints and calibration anchors`;
      }

      setError(message);
    } catch (err) {
      console.error("[Driver Config] Analysis failed:", err);
      setError(
        "❌ Backend unavailable - couldn't analyze driver. Please check your connection and try again.",
      );
    } finally {
      setProcessingAction("");
    }
  };

  // Add message to fermi conversation
  const addFermiMessage = async (
    userQuery: string,
    fermiResponse: string,
    suggestions?: CommandSuggestion[],
  ) => {
    // If no active forecast, use global conversation
    if (!activeForecast) {
      const newMessages = [
        ...globalFermiConversation,
        {
          timestamp: new Date().toISOString(),
          role: "user",
          message: userQuery,
        },
        {
          timestamp: new Date().toISOString(),
          role: "fermi",
          message:
            suggestions && suggestions.length > 0
              ? fermiResponse +
                "\n\n__SUGGESTIONS__:" +
                JSON.stringify(suggestions)
              : fermiResponse,
        },
      ];

      setGlobalFermiConversation(newMessages);
      setFermiThinking(false);

      // Auto-scroll to bottom
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);

      return;
    }

    const conversation = activeForecast.fermiConversation || [];

    // Add user message
    conversation.push({
      timestamp: new Date().toISOString(),
      role: "user",
      message: userQuery,
    });

    // Add fermi response (with suggestions embedded if present)
    let responseMessage = fermiResponse;
    if (suggestions && suggestions.length > 0) {
      responseMessage += "\n\n__SUGGESTIONS__:" + JSON.stringify(suggestions);
    }

    conversation.push({
      timestamp: new Date().toISOString(),
      role: "fermi",
      message: responseMessage,
    });

    const updatedForecast = {
      ...activeForecast,
      fermiConversation: conversation,
    };

    setActiveForecast(updatedForecast);
    // Update savedForecasts so conversation appears in /list
    setSavedForecasts((prev) =>
      prev.map((f) => (f.id === activeForecast.id ? updatedForecast : f)),
    );
    // Only save to local if it's a local-only forecast
    if (activeForecast.id && activeForecast.id.startsWith("local-")) {
      await saveForecast(updatedForecast);
    }

    // Clear thinking state
    setFermiThinking(false);

    // Auto-scroll to bottom after message is added
    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleFermiCoaching = async (userQuery?: string) => {
    try {
      const { generateFermiGuidance } = await import("../services/fermiHints");
      const { getOntologyService } = await import("../services/ontology");

      // Open chat pane
      setFermiChatExpanded(true);

      // Show thinking indicator
      setFermiThinking(true);

      const queryText = userQuery || "help";

      // If user provides actual text (not just @fermi), use AI backend
      if (
        userQuery &&
        userQuery.length > 0 &&
        !userQuery.startsWith("@fermi")
      ) {
        try {
          // Build context for AI
          // Map UI state to backend coach stages: base_rate, drivers, quantify, review
          let coachStage = "review";
          if (driverBeingConfigured) {
            coachStage = "quantify"; // Configuring individual driver
          } else if (agentBeingConfigured) {
            coachStage = "quantify"; // Configuring agent within driver
          } else if (activeForecast?.probability !== undefined) {
            coachStage = "review"; // Have final probability, reviewing results
          } else if (activeForecast) {
            coachStage = "drivers"; // Have question, working on drivers
          }

          const context: any = {
            forecastId: activeForecast?.id,
            stage: coachStage,
          };

          // Helper to format driver for coach (convert probabilities to %)
          const formatDriverForCoach = (driver: any) => {
            const formatted = { ...driver };
            if (driver.type === "binary" && driver.probability != null) {
              formatted.probabilityPercent = Math.round(
                driver.probability * 100,
              );
              formatted.probabilityDisplay = `${formatted.probabilityPercent}%`;
            }
            return formatted;
          };

          // Add forecast details if available
          if (activeForecast) {
            context.question = activeForecast.question;
            context.domain = activeForecast.domain || "general"; // Backend requires domain for drivers stage
            context.timeframe = activeForecast.timeframe;
            // Format drivers with percentage display
            context.drivers = activeForecast.drivers?.map(formatDriverForCoach);
            if (activeForecast.probability != null) {
              context.probabilityPercent = Math.round(
                activeForecast.probability * 100,
              );
              context.probabilityDisplay = `${context.probabilityPercent}%`;
            }
            context.conversationHistory =
              activeForecast.fermiConversation || [];
          }

          // Add driver context if configuring
          if (driverBeingConfigured) {
            context.currentDriver = formatDriverForCoach(driverBeingConfigured);
          }

          // Add agent context if configuring
          if (agentBeingConfigured) {
            context.currentAgent = agentBeingConfigured;
          }

          // Add available commands based on context
          const { getAvailableCommands } =
            await import("../services/fermiCommands");
          const commandContext = getCurrentContext();
          const availableCommands = getAvailableCommands(commandContext);
          context.availableCommands = availableCommands.map((cmd) => ({
            name: cmd.name,
            syntax: cmd.syntax,
            description: cmd.description,
            category: cmd.category,
            examples: cmd.examples,
          }));

          // Add available agents
          context.availableAgents = [
            {
              name: "research_analyst",
              description: "Deep research with citations, quantitative focus",
            },
            {
              name: "sentiment_monitor",
              description: "Social listening and sentiment scoring",
            },
            {
              name: "competitive_intel",
              description: "Competitor tracking and benchmarking",
            },
            {
              name: "financial_analyst",
              description: "Financial statement analysis and modeling",
            },
            {
              name: "market_researcher",
              description: "Market sizing and industry analysis",
            },
            {
              name: "expert_synthesizer",
              description: "Synthesize expert opinions and predictions",
            },
            {
              name: "regulatory_monitor",
              description: "Track regulatory and policy changes",
            },
            {
              name: "growth_signals",
              description: "Monitor user adoption and growth metrics",
            },
            {
              name: "hiring_tracker",
              description: "Track hiring trends and team growth",
            },
            {
              name: "pricing_intel",
              description: "Monitor pricing and cost trends",
            },
            {
              name: "technology_validator",
              description:
                "Validate technology feasibility and launch readiness",
            },
          ];

          // Add domain ontology for forecasting understanding
          context.domainConcepts = {
            distributions: ["triangular", "normal", "lognormal"],
            driverTypes: ["continuous", "binary"],
            directions: ["increases", "decreases"],
            methodology:
              "Fermi estimation + Monte Carlo simulation + research agents for calibrated probabilistic forecasts",
          };

          // Add important context constraints
          context.systemConstraints = {
            agentUsage:
              "Research agents (except @fermi) can only be attached to drivers during driver configuration. @fermi can be invoked anytime for coaching.",
            workflow:
              "forecast → drivers → agents attached to drivers → simulation",
          };

          // Add contextual insights (proactive coaching)
          if (activeForecast) {
            const { analyzeContext } =
              await import("../services/contextAnalyzer");
            const insights = analyzeContext(activeForecast);
            if (insights.length > 0) {
              context.contextualInsights = insights;
              context.coachingNote = `IMPORTANT: Share ${insights.length} proactive insight(s) with the user to improve their forecast quality.`;
            }

            // Check if decomposition would help
            const { shouldSuggestDecomposition, suggestCalibrationExercise } =
              await import("../services/fermiDecomposition");
            const decompCheck = shouldSuggestDecomposition(activeForecast);
            if (decompCheck.suggest) {
              context.decompositionSuggestion = {
                reason: decompCheck.reason,
                command:
                  "Type /decompose to see strategies for breaking this down",
              };
            }

            // Add calibration tip if relevant
            const calibrationTip = suggestCalibrationExercise(
              activeForecast.question,
            );
            if (calibrationTip) {
              context.calibrationTip = calibrationTip;
            }
          }

          // Call AI backend
          const response = await researchService.chatWithCoach(
            userQuery,
            context,
          );

          // Parse suggestions from response if provided
          const suggestions: CommandSuggestion[] =
            response.response?.suggestions || response.suggestions || [];

          await addFermiMessage(
            queryText,
            response.response?.message ||
              response.message ||
              JSON.stringify(response),
            suggestions,
          );
          return;
        } catch (error) {
          console.error("[Fermi AI] Failed to get AI response:", error);
          await addFermiMessage(
            userQuery || "@fermi",
            "❌ **Backend unavailable**\n\nCouldn't connect to the AI coach. Please check your connection and try again.",
          );
          return;
        } finally {
          setFermiThinking(false);
        }
      }

      // If user just typed @fermi with no question, show error
      await addFermiMessage(
        "@fermi",
        "❌ **Please ask a question**\n\n@fermi needs a question or context to help you. Try asking something like:\n• 'How do I set p values?'\n• 'What distribution should I use?'\n• 'Help me with this driver'",
      );
    } catch (err) {
      console.error("[Fermi] Error in handleFermiCoaching:", err);
      setFermiThinking(false);
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await addFermiMessage(
        userQuery || "help",
        `🦊 Oops! Something went wrong: ${errorMsg}\n\nTry asking again or type /commands for commands.`,
      );
    }
  };

  const validateDriverConfig = (
    driver: any,
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (driver.type === "binary") {
      if (driver.probability === undefined || driver.probability === null) {
        errors.push(
          "Binary drivers require a probability value. Use /prob <value> to set it.",
        );
      }
      if (
        driver.probability !== undefined &&
        driver.probability !== null &&
        (driver.probability < 0 || driver.probability > 1)
      ) {
        errors.push("Probability must be between 0 and 1 (internal format)");
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
        const oldPercent = Math.round((originalDriver.probability || 0) * 100);
        const newPercent = Math.round((newDriver.probability || 0) * 100);
        const diff = newPercent - oldPercent;
        changes.push(
          `Probability: ${oldPercent}% → ${newPercent}% (${diff > 0 ? "+" : ""}${diff}%)`,
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

  const runAgentDuringConfiguration = async () => {
    if (!agentBeingConfigured || !driverBeingConfigured || !activeForecast)
      return;

    // Validate agent has required fields
    if (!agentBeingConfigured.query) {
      setError(
        "Agent must have a research query before running. Use /query to set it.",
      );
      return;
    }

    setLoading(true);
    setProcessingAction(`Running @${agentBeingConfigured.name} research...`);

    try {
      // Execute research
      const result = await researchService.executeResearch({
        agentId: agentBeingConfigured.name,
        promptId: "market_tam_sizing",
        variables: {
          MARKET_SEGMENT: agentBeingConfigured.query,
          GEOGRAPHY: "United States",
        },
      });

      // Store result as evidence on the driver being configured
      const newEvidence = {
        id: idGenerators.evidence(),
        type: "research",
        source: agentBeingConfigured.name,
        summary: result.result?.summary || "Research completed successfully",
        timestamp: new Date().toISOString(),
        fullResult: result.result,
      };

      // Update driver being configured with evidence
      setDriverBeingConfigured((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          evidence: [...(prev.evidence || []), newEvidence],
        };
      });

      await addFermiMessage(
        `/run @${agentBeingConfigured.name}`,
        `✓ Research complete!\n\n**Summary:** ${result.result?.summary || "See evidence below"}\n\n**Key Findings:**\n${result.result?.keyFindings?.map((f: string) => `• ${f}`).join("\n") || "No findings"}\n\nEvidence has been added to driver "${driverBeingConfigured.name}". Use /save to save the driver with this evidence.`,
      );
    } catch (err) {
      setError(
        `Research failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      await addFermiMessage(
        `/run @${agentBeingConfigured.name}`,
        `❌ Research failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);
      setProcessingAction("");
    }
  };

  const saveConfiguredAgent = async () => {
    if (!agentBeingConfigured || !driverBeingConfigured) return;

    // Validate agent has required fields
    if (!agentBeingConfigured.query) {
      setError("Agent must have a research query. Use /query to set it.");
      return;
    }

    // Check if we're editing an existing agent or creating new
    const existingAgentIndex = driverBeingConfigured.agents?.findIndex(
      (a: any) =>
        a.name.toLowerCase() === agentBeingConfigured.name.toLowerCase(),
    );

    let updatedAgents;
    let actionMessage;

    if (existingAgentIndex !== undefined && existingAgentIndex >= 0) {
      // Update existing agent
      updatedAgents = [...(driverBeingConfigured.agents || [])];
      updatedAgents[existingAgentIndex] = {
        ...updatedAgents[existingAgentIndex],
        query: agentBeingConfigured.query,
        schedule: agentBeingConfigured.schedule || "on-demand",
        threshold: agentBeingConfigured.threshold,
        updatedAt: new Date().toISOString(),
      };
      actionMessage = `✓ Agent @${agentBeingConfigured.name} updated`;
    } else {
      // Create new agent
      const newAgent = {
        id: idGenerators.agent(),
        name: agentBeingConfigured.name,
        query: agentBeingConfigured.query,
        schedule: agentBeingConfigured.schedule || "on-demand",
        threshold: agentBeingConfigured.threshold,
        createdAt: new Date().toISOString(),
      };
      updatedAgents = [...(driverBeingConfigured.agents || []), newAgent];
      actionMessage = `✓ Agent @${newAgent.name} added to driver "${driverBeingConfigured.name}"`;
    }

    // Update driver with new/updated agent
    const updatedDriver = {
      ...driverBeingConfigured,
      agents: updatedAgents,
    };

    setDriverBeingConfigured(updatedDriver);
    setAgentBeingConfigured(null);

    // Show toast and success message
    showToast(actionMessage);
    setError(actionMessage);
  };

  const saveConfiguredDriver = async (force: boolean = false) => {
    console.log("[SaveDriver] === START ===");
    console.log("[SaveDriver] force:", force);
    console.log(
      "[SaveDriver] driverBeingConfigured:",
      !!driverBeingConfigured,
      driverBeingConfigured?.name,
    );
    console.log(
      "[SaveDriver] activeForecast:",
      !!activeForecast,
      activeForecast?.id,
    );

    if (!driverBeingConfigured || !activeForecast) {
      console.log(
        "[SaveDriver] ABORT: Missing driverBeingConfigured or activeForecast",
      );
      return;
    }

    // Validate configuration
    console.log(
      "[SaveDriver] Validating driver:",
      JSON.stringify({
        name: driverBeingConfigured.name,
        type: driverBeingConfigured.type,
        probability: driverBeingConfigured.probability,
        hasAgents: !!driverBeingConfigured.agents,
        agentCount: driverBeingConfigured.agents?.length || 0,
      }),
    );

    const validation = validateDriverConfig(driverBeingConfigured);
    console.log("[SaveDriver] Validation result:", validation);

    if (!validation.valid) {
      console.error(
        "[SaveDriver] Validation failed:",
        validation.errors,
        "Driver object:",
        driverBeingConfigured,
      );
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

    // Detect minor changes (any other parameter changes)
    const minorChanges: string[] = [];
    if (originalDriver) {
      if (driverBeingConfigured.p5 !== originalDriver.p5) {
        minorChanges.push(
          `p5: ${originalDriver.p5} → ${driverBeingConfigured.p5}`,
        );
      }
      if (driverBeingConfigured.p50 !== originalDriver.p50) {
        minorChanges.push(
          `p50: ${originalDriver.p50} → ${driverBeingConfigured.p50}`,
        );
      }
      if (driverBeingConfigured.p95 !== originalDriver.p95) {
        minorChanges.push(
          `p95: ${originalDriver.p95} → ${driverBeingConfigured.p95}`,
        );
      }
      if (driverBeingConfigured.probability !== originalDriver.probability) {
        minorChanges.push(
          `probability: ${originalDriver.probability} → ${driverBeingConfigured.probability}`,
        );
      }
      if (driverBeingConfigured.reasoning !== originalDriver.reasoning) {
        minorChanges.push(`reasoning updated`);
      }
    }

    // Create version if there are changes
    let updatedDriver = { ...driverBeingConfigured };
    if (isNewDriver) {
      // Initial version for new driver
      const initialChanges = [
        `Initial configuration: ${driverBeingConfigured.type} driver`,
      ];
      if (driverBeingConfigured.type === "binary") {
        initialChanges.push(
          `probability: ${Math.round((driverBeingConfigured.probability || 0) * 100)}%`,
        );
      } else {
        initialChanges.push(
          `${driverBeingConfigured.distribution}: p5=${driverBeingConfigured.p5}, p50=${driverBeingConfigured.p50}, p95=${driverBeingConfigured.p95}`,
        );
      }

      const version = createDriverVersion(
        driverBeingConfigured,
        initialChanges,
        "major",
      );

      updatedDriver.version = { major: 1, minor: 0 };
      updatedDriver.versionHistory = [version];
    } else if (majorChanges.length > 0) {
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
    } else if (minorChanges.length > 0) {
      // Minor version for non-breaking changes
      const version = createDriverVersion(
        driverBeingConfigured,
        minorChanges,
        "minor",
      );
      const currentVersion = driverBeingConfigured.version || {
        major: 1,
        minor: 0,
      };
      updatedDriver.version = {
        major: currentVersion.major,
        minor: currentVersion.minor + 1,
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
      // Try backend sync for backend forecasts (both new and existing drivers)
      let backendSyncSucceeded = false;
      const shouldSyncToBackend =
        activeForecast.id && !activeForecast.id.startsWith("local-");

      console.log("[SaveDriver] Backend sync check:", {
        isNewDriver,
        forecastId: activeForecast.id,
        isLocalForecast: activeForecast.id?.startsWith("local-"),
        willAttemptBackendSync: shouldSyncToBackend,
      });

      if (shouldSyncToBackend) {
        console.log(
          `[SaveDriver] Attempting backend sync for ${isNewDriver ? "new" : "existing"} driver:`,
          updatedDriver.name,
        );
        try {
          if (isNewDriver) {
            // ADD new driver
            // Ensure driver has an ID before sending to backend
            if (!updatedDriver.id) {
              updatedDriver.id = idGenerators.driver();
              console.log(
                "[SaveDriver] Generated ID for new driver:",
                updatedDriver.id,
              );
            }

            const { addDriverWithSync } = await import("../utils/backendSync");
            const result = await addDriverWithSync(activeForecast.id, {
              id: updatedDriver.id,
              name: updatedDriver.name,
              type: updatedDriver.type,
              probability: updatedDriver.probability,
              p5: updatedDriver.p5,
              p50: updatedDriver.p50,
              p95: updatedDriver.p95,
              distribution: updatedDriver.distribution,
              direction: updatedDriver.direction,
              reasoning: updatedDriver.reasoning,
              evidence: updatedDriver.evidence,
              agents: updatedDriver.agents,
              version: updatedDriver.version,
              versionHistory: updatedDriver.versionHistory,
            });

            if (result.success && result.forecast) {
              // Backend succeeded - use backend data
              setActiveForecast(result.forecast);

              // Update savedForecasts so driver appears in /list
              setSavedForecasts((prev) =>
                prev.map((f) =>
                  f.id === result.forecast.id ? result.forecast : f,
                ),
              );

              backendSyncSucceeded = true;
              console.log("Driver added to backend successfully");
            }
          } else {
            // UPDATE existing driver
            const { updateDriverWithSync } =
              await import("../utils/backendSync");
            const result = await updateDriverWithSync(
              activeForecast.id,
              updatedDriver.id,
              {
                name: updatedDriver.name,
                type: updatedDriver.type,
                probability: updatedDriver.probability,
                p5: updatedDriver.p5,
                p50: updatedDriver.p50,
                p95: updatedDriver.p95,
                distribution: updatedDriver.distribution,
                direction: updatedDriver.direction,
                reasoning: updatedDriver.reasoning,
                evidence: updatedDriver.evidence,
                agents: updatedDriver.agents,
                version: updatedDriver.version,
                versionHistory: updatedDriver.versionHistory,
              },
            );

            if (result.success && result.forecast) {
              // Backend succeeded - use backend data
              setActiveForecast(result.forecast);

              // Update savedForecasts so updates appear in /list
              setSavedForecasts((prev) =>
                prev.map((f) =>
                  f.id === result.forecast.id ? result.forecast : f,
                ),
              );

              backendSyncSucceeded = true;
              console.log("Driver updated on backend successfully");
            }
          }
        } catch (err) {
          console.log("Backend sync failed, will save locally:", err);
        }
      }

      // Always save locally if: local-only forecast, editing, or backend failed
      if (!backendSyncSucceeded) {
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
        console.log("Driver saved locally");
      }

      // Observe this action for ontology learning
      try {
        const { getOntologyService } = await import("../services/ontology");
        const ontology = getOntologyService();
        ontology.observe({
          type: isNewDriver ? "create" : "modify",
          entity: "USER",
          entityType: "USER" as any,
          target: "DRIVER",
          targetType: "DRIVER" as any,
          context: `${isNewDriver ? "created" : "modified"} driver: ${updatedDriver.name} (${updatedDriver.type})`,
        });
      } catch (obsErr) {
        console.log("[Ontology] Observation skipped:", obsErr);
      }

      setDriverBeingConfigured(null);

      // Show toast notification
      showToast(`✓ Driver saved: ${updatedDriver.name}`);

      // Show next-step suggestions
      const driverCount = activeForecast.drivers.length;
      const nextSteps = [];

      if (driverCount < 3) {
        nextSteps.push({
          key: "driver",
          label: "/driver ",
          desc: "Add another driver",
        });
      }

      if (driverCount >= 2) {
        nextSteps.push({
          key: "simulate",
          label: "/simulate",
          desc: "Run simulation",
        });
      }

      nextSteps.push({
        key: "review",
        label: "/review",
        desc: "Review forecast quality",
      });

      const agentCount = updatedDriver.agents?.length || 0;
      const agentInfo =
        agentCount > 0
          ? ` (with ${agentCount} agent${agentCount === 1 ? "" : "s"})`
          : "";

      await addFermiMessage(
        "/save",
        `✓ Driver saved: ${updatedDriver.name}${agentInfo}\n\nForecast now has ${driverCount} driver(s).${driverCount >= 2 ? "\n\nReady to simulate!" : "\n\nConsider adding 1-2 more drivers for better calibration."}`,
        nextSteps,
      );

      setError("");
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
    // Check for unsaved changes before allowing navigation commands
    const navigationCommands = [
      "/question",
      "/list",
      "/driver",
      "/simulate",
      "/review",
      "/decompose",
      "/expire",
    ];
    const isNavigationCommand = navigationCommands.some((cmd) =>
      trimmed.startsWith(cmd),
    );

    if (
      (driverBeingConfigured || agentBeingConfigured) &&
      isNavigationCommand
    ) {
      const configType = agentBeingConfigured ? "agent" : "driver";
      const configName = agentBeingConfigured
        ? agentBeingConfigured.name
        : driverBeingConfigured?.name;

      setError(
        `⚠️ You have unsaved ${configType} configuration: "${configName}"\n\nType /save to commit changes, or /cancel to discard.`,
      );
      setCommandInput("");
      return;
    }

    // GLOBAL COMMANDS - work in any context

    // /commands - always available, context-aware command reference
    if (trimmed === "/commands" || trimmed === "/-h") {
      const { getAvailableCommands, COMMANDS } =
        await import("../services/fermiCommands");
      const commandContext = getCurrentContext();
      const availableCommands = getAvailableCommands(commandContext);
      const availableCommandNames = new Set(
        availableCommands.map((cmd) => cmd.name),
      );

      // Get ALL commands and mark availability
      const allCommands = Object.values(COMMANDS);

      // Group by category
      const byCategory: Record<string, typeof allCommands> = {};
      allCommands.forEach((cmd) => {
        if (!byCategory[cmd.category]) byCategory[cmd.category] = [];
        byCategory[cmd.category].push(cmd);
      });

      // Build rich help text
      let helpText = `📚 All Commands (context: ${commandContext})\n\n`;
      helpText += `🦊 @fermi — Ask me anything about forecasting!\n`;
      helpText += `   Example: "@fermi help me set p values for this driver"\n\n`;

      const categoryEmoji: Record<string, string> = {
        forecast: "🎯",
        driver: "📊",
        agent: "🤖",
        help: "❓",
        system: "⚙️",
      };

      for (const [category, cmds] of Object.entries(byCategory)) {
        const emoji = categoryEmoji[category] || "•";
        helpText += `${emoji} ${category.toUpperCase()}\n`;
        cmds.forEach((cmd) => {
          const isAvailable = availableCommandNames.has(cmd.name);
          const prefix = isAvailable ? "  " : "  ◦ "; // Ghosted with bullet
          const contextNote = !isAvailable ? " (not available here)" : "";
          helpText += `${prefix}${cmd.syntax}${contextNote}\n`;
          helpText += `${prefix}→ ${cmd.description}\n\n`;
        });
      }

      helpText += `💡 Tip: ◦ Commands marked with ◦ are not available in current context\n`;
      helpText += `💡 Tip: Type command + space to see autocomplete\n`;

      // Create clickable suggestions for AVAILABLE commands only
      const commandSuggestions: CommandSuggestion[] = availableCommands
        .slice(0, 6)
        .map((cmd) => ({
          key: cmd.name,
          label:
            cmd.syntax.split(" ")[0] + (cmd.syntax.includes("<") ? " " : ""),
          description: cmd.description,
        }));

      await addFermiMessage(trimmed, helpText, commandSuggestions);
      setCommandInput("");
      return;
    }

    // /agent-list - list all available research agents
    if (trimmed === "/agent-list") {
      const agentList = [
        {
          name: "research_analyst",
          description: "Deep research with citations, quantitative focus",
          icon: "📊",
        },
        {
          name: "sentiment_monitor",
          description: "Social listening and sentiment scoring",
          icon: "💭",
        },
        {
          name: "competitive_intel",
          description: "Competitor tracking and benchmarking",
          icon: "🔍",
        },
        {
          name: "financial_analyst",
          description: "Financial statement analysis and modeling",
          icon: "💰",
        },
        {
          name: "market_researcher",
          description: "Market sizing and industry analysis",
          icon: "📈",
        },
        {
          name: "expert_synthesizer",
          description: "Synthesize expert opinions and predictions",
          icon: "🎓",
        },
        {
          name: "regulatory_monitor",
          description: "Track regulatory and policy changes",
          icon: "⚖️",
        },
        {
          name: "growth_signals",
          description: "Monitor user adoption and growth metrics",
          icon: "📱",
        },
        {
          name: "hiring_tracker",
          description: "Track hiring trends and team growth",
          icon: "👥",
        },
        {
          name: "pricing_intel",
          description: "Monitor pricing and cost trends",
          icon: "💵",
        },
        {
          name: "technology_validator",
          description: "Validate technology feasibility and launch readiness",
          icon: "🔧",
        },
      ];

      let agentsText = `🤖 Available Research Agents (${agentList.length})\n\n`;
      agentsText += `All agents use Claude Sonnet 4.5\n\n`;

      agentList.forEach((agent) => {
        agentsText += `${agent.icon} @${agent.name}\n`;
        agentsText += `   ${agent.description}\n\n`;
      });

      agentsText += `💡 Usage:\n`;
      agentsText += `• Type @agent_name to attach to current driver\n`;
      agentsText += `• Ask @fermi which agent to use for your forecast\n`;

      // Create clickable chips for all agents
      const agentSuggestions: CommandSuggestion[] = agentList.map((agent) => ({
        key: agent.name,
        label: `@${agent.name}`,
        description: agent.description,
      }));

      await addFermiMessage("/agent-list", agentsText, agentSuggestions);
      setCommandInput("");
      return;
    }

    // /confirm - confirm a pending action
    if (trimmed === "/confirm") {
      if (!pendingConfirmation) {
        await addFermiMessage("/confirm", "No action pending confirmation");
        setCommandInput("");
        return;
      }

      const { action, data } = pendingConfirmation;

      if (action === "cancel") {
        // Confirmed: discard config
        if (data.configType === "agent") {
          setAgentBeingConfigured(null);
          await addFermiMessage("/confirm", "✓ Agent configuration discarded");
        } else {
          setDriverBeingConfigured(null);
          await addFermiMessage("/confirm", "✓ Driver configuration discarded");
        }
      } else if (action === "expire") {
        // Confirmed: resolve forecast
        const { outcome } = data;

        setLoading(true);
        setProcessingAction("Resolving forecast...");

        try {
          const { resolveForecastWithSync } =
            await import("../utils/backendSync");
          const result = await resolveForecastWithSync(
            activeForecast!.id,
            outcome === "positive",
          );

          if (result.success) {
            setActiveForecast(result.forecast);
            await addFermiMessage(
              "/confirm",
              `✓ Forecast resolved as ${outcome.toUpperCase()}\n\nBrier Score: ${result.brierScore?.toFixed(3) || "N/A"}\n\n${result.brierScore < 0.1 ? "🎯 Excellent calibration!" : result.brierScore < 0.2 ? "✓ Good forecasting" : "📊 Room to improve - review what you got wrong"}`,
            );
          }
        } catch (err) {
          setError("Failed to resolve forecast. Please try again.");
        } finally {
          setLoading(false);
          setProcessingAction("");
        }
      }

      setPendingConfirmation(null);
      setCommandInput("");
      return;
    }

    // /cancel - exit any config mode with confirmation
    if (trimmed === "/cancel") {
      if (pendingConfirmation?.action === "cancel") {
        // Already asked, canceling the confirmation itself
        setPendingConfirmation(null);
        await addFermiMessage("/cancel", "✓ Cancelled confirmation");
        setCommandInput("");
        return;
      }

      if (agentBeingConfigured || driverBeingConfigured) {
        const configType = agentBeingConfigured ? "agent" : "driver";
        const configName = agentBeingConfigured
          ? agentBeingConfigured.name
          : driverBeingConfigured?.name;

        setPendingConfirmation({
          action: "cancel",
          data: { configType },
          message: `Discard ${configType} configuration for "${configName}"?`,
        });

        await addFermiMessage(
          "/cancel",
          `⚠️ Discard ${configType} configuration for "${configName}"?\n\nType /confirm to discard changes, or /cancel again to keep editing.`,
          [
            { key: "confirm", label: "/confirm", desc: "Discard changes" },
            { key: "cancel", label: "/cancel", desc: "Keep editing" },
          ],
        );
      } else {
        await addFermiMessage("/cancel", "Nothing to cancel");
      }
      setCommandInput("");
      return;
    }

    // Handle agent configuration commands
    if (agentBeingConfigured) {
      // /query <search query>
      if (trimmed.startsWith("/query ")) {
        const query = trimmed.replace("/query ", "").trim();
        if (!query) {
          await addFermiMessage(
            "/query",
            "Please provide a research query.\n\nExample: /query What is the market size for EVs in 2025?",
          );
          return;
        }
        setAgentBeingConfigured({ ...agentBeingConfigured, query });
        setCommandInput("");
        setError("");

        await addFermiMessage(
          `/query ${query}`,
          `✓ Query set: "${query}"\n\nHow often should this agent update?\n\nNext: /schedule daily, /schedule weekly, or /schedule on-demand`,
          [
            {
              key: "daily",
              label: "/schedule daily",
              description: "Update daily",
            },
            {
              key: "weekly",
              label: "/schedule weekly",
              description: "Update weekly",
            },
            {
              key: "on-demand",
              label: "/schedule on-demand",
              description: "Manual updates",
            },
            { key: "save", label: "/save", description: "Save agent" },
          ],
        );
        return;
      }

      // /schedule <daily|weekly|on-demand>
      if (trimmed.startsWith("/schedule ")) {
        const schedule = trimmed.replace("/schedule ", "").trim();
        if (["daily", "weekly", "on-demand"].includes(schedule)) {
          setAgentBeingConfigured({ ...agentBeingConfigured, schedule });
          setCommandInput("");
          setError("");

          await addFermiMessage(
            `/schedule ${schedule}`,
            `✓ Schedule set to ${schedule}\n\nAgent configuration complete! Save it now.\n\nNext: /save to add agent to driver`,
            [
              {
                key: "save",
                label: "/save",
                description: "Save agent to driver",
              },
              { key: "cancel", label: "/cancel", description: "Cancel" },
            ],
          );
        } else {
          await addFermiMessage(
            `/schedule ${schedule}`,
            "❌ Schedule must be 'daily', 'weekly', or 'on-demand'",
            [
              {
                key: "daily",
                label: "/schedule daily",
                description: "Update daily",
              },
              {
                key: "weekly",
                label: "/schedule weekly",
                description: "Update weekly",
              },
              {
                key: "on-demand",
                label: "/schedule on-demand",
                description: "Manual",
              },
            ],
          );
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
          await addFermiMessage(
            "/save",
            "❌ No driver being configured. Start driver config first with /driver <name>",
          );
          return;
        }

        if (!agentBeingConfigured.query) {
          await addFermiMessage(
            "/save",
            "❌ Agent needs a query! Use /query <search query> first.",
            [
              {
                key: "query",
                label: "/query ",
                description: "Set research query",
              },
            ],
          );
          return;
        }

        const currentAgents = driverBeingConfigured.agents || [];
        const agentConfig = {
          id: idGenerators.agent(),
          name: agentBeingConfigured.name,
          query: agentBeingConfigured.query,
          schedule: agentBeingConfigured.schedule || "on-demand",
          threshold: agentBeingConfigured.threshold,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Check for duplicates
        const isDuplicate = currentAgents.some(
          (a: any) => (a.name || a) === agentConfig.name,
        );
        if (isDuplicate) {
          await addFermiMessage(
            "/save",
            `❌ Agent @${agentConfig.name} already added to this driver`,
          );
          return;
        }

        setDriverBeingConfigured({
          ...driverBeingConfigured,
          agents: [...currentAgents, agentConfig],
        });

        // Clear agent config and show success
        setAgentBeingConfigured(null);
        setCommandInput("");

        await addFermiMessage(
          "/save",
          `✓ Agent @${agentConfig.name} attached to driver config\n\n⚠️ Not persisted yet - driver must be saved!\n\nNext steps:\n• Add more agents: @<agent_name>\n• Configure driver: /p, /dist, /direction\n• Save driver to persist: /save`,
          [
            {
              key: "save-driver",
              label: "/save",
              description: "Save driver + agents",
            },
            { key: "another", label: "@", description: "Add another agent" },
          ],
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
                    id: idGenerators.evidence(),
                    type: "research",
                    source: agent.name || agent,
                    summary:
                      result.result?.summary ||
                      "Research completed successfully",
                    timestamp: new Date().toISOString(),
                    fullResult: result.result, // Store the actual ResearchResult
                  },
                ],
              });
            } else if (activeForecast && targetDriver) {
              // Update saved driver in active forecast
              const updatedDrivers = activeForecast.drivers.map((d: any) => {
                if (d.id === targetDriver.id) {
                  const newEvidence = {
                    id: idGenerators.evidence(),
                    type: "research",
                    source: agent.name || agent,
                    summary:
                      result.result?.summary ||
                      "Research completed successfully",
                    timestamp: new Date().toISOString(),
                    fullResult: result.result, // Store the actual ResearchResult
                  };

                  // Create version for evidence addition (minor change)
                  const version = createDriverVersion(
                    d,
                    [`Added research evidence from ${agent.name}`],
                    "minor",
                  );

                  const currentVersion = d.version || { major: 1, minor: 0 };
                  const updatedDriver = {
                    ...d,
                    evidence: [...(d.evidence || []), newEvidence],
                    version: {
                      major: currentVersion.major,
                      minor: currentVersion.minor + 1,
                    },
                    versionHistory: [...(d.versionHistory || []), version],
                  };

                  return updatedDriver;
                }
                return d;
              });

              const updatedForecast = {
                ...activeForecast,
                drivers: updatedDrivers,
                updatedAt: new Date().toISOString(),
              };

              setActiveForecast(updatedForecast);
              // Update savedForecasts so evidence appears in /list
              setSavedForecasts((prev) =>
                prev.map((f) =>
                  f.id === activeForecast.id ? updatedForecast : f,
                ),
              );
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

      // Note: /cancel is handled by global handler above which shows confirmation
    }

    // Handle @agent mentions outside of driver config context
    if (
      trimmed.startsWith("@") &&
      !trimmed.includes("/") &&
      !driverBeingConfigured &&
      !agentBeingConfigured
    ) {
      let agentName = trimmed.substring(1).trim();
      const spaceIndex = agentName.indexOf(" ");
      const parenIndex = agentName.indexOf("(");
      if (spaceIndex > 0 || parenIndex > 0) {
        const cutIndex = Math.min(
          spaceIndex > 0 ? spaceIndex : Infinity,
          parenIndex > 0 ? parenIndex : Infinity,
        );
        agentName = agentName.substring(0, cutIndex).trim();
      }

      // Special handling for @fermi - always allowed
      if (agentName === "fermi") {
        await handleFermiCoaching();
        setCommandInput("");
        return;
      }

      // Other agents require driver context
      await addFermiMessage(
        `@${agentName}`,
        `⚠️ Agents can only be attached to drivers\n\nTo use @${agentName}:\n1. Start a forecast: /question <your question>\n2. Add a driver: /driver <driver name>\n3. While configuring the driver, type @${agentName}\n\nOr ask @fermi for help!`,
        [
          {
            key: "question",
            label: "/question ",
            description: "Start a forecast",
          },
          {
            key: "commands",
            label: "/commands",
            description: "Show all commands",
          },
          {
            key: "agent-list",
            label: "/agent-list",
            description: "See all agents",
          },
        ],
      );
      setCommandInput("");
      return;
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
            updated.probability = 0.5;
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
        const probPercent = parseInt(trimmed.replace("/prob ", "").trim(), 10);
        if (!isNaN(probPercent) && probPercent >= 0 && probPercent <= 100) {
          setDriverBeingConfigured({
            ...driverBeingConfigured,
            probability: probPercent / 100, // Convert 0-100 to 0-1
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

      // Handle @agent mentions - enter agent config mode (only when configuring a driver)
      // Support both @agent and @agent /query <text>
      if (trimmed.startsWith("@")) {
        let agentName = trimmed.substring(1).trim();
        let queryText = null;

        // Check if there's a /query command inline
        if (agentName.includes("/query ")) {
          const parts = agentName.split("/query ");
          agentName = parts[0].trim();
          queryText = parts[1]?.trim();
        }

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
        console.log(
          "Agent mention detected in driver config:",
          agentName,
          queryText ? `with query: ${queryText}` : "",
        );

        // Special handling for @fermi coach agent
        if (agentName === "fermi") {
          console.log("[Fermi] Opening @fermi coach chat pane");
          await handleFermiCoaching();
          setCommandInput("");
          return;
        }

        if (agentName) {
          console.log("Setting agent being configured:", agentName);

          // Check if agent already exists on this driver - if so, edit it
          const existingAgent = driverBeingConfigured.agents?.find(
            (a: any) => a.name.toLowerCase() === agentName.toLowerCase(),
          );

          if (existingAgent) {
            // Edit mode - load existing agent
            const updatedAgent = queryText
              ? { ...existingAgent, query: queryText }
              : { ...existingAgent };

            setAgentBeingConfigured(updatedAgent);
            setCommandInput("");
            setError("");

            const message = queryText
              ? `📝 Editing @${agentName} - Query updated\n\nNew query: ${queryText}\nSchedule: ${existingAgent.schedule || "on-demand"}\n\nModify with /query, /schedule, or /threshold.\nType /save when done or /cancel to discard changes.`
              : `📝 Editing @${agentName}\n\nCurrent query: ${existingAgent.query}\nSchedule: ${existingAgent.schedule || "on-demand"}\n\nModify with /query, /schedule, or /threshold.\nType /save when done or /cancel to discard changes.`;

            await addFermiMessage(
              `@${agentName}${queryText ? ` /query ${queryText}` : ""}`,
              message,
              [
                {
                  key: "query",
                  label: "/query ",
                  description: "Update research query",
                },
                {
                  key: "schedule",
                  label: "/schedule ",
                  description: "Update schedule",
                },
                { key: "save", label: "/save", description: "Save changes" },
                { key: "cancel", label: "/cancel", description: "Cancel" },
              ],
            );
          } else {
            // Create new agent
            const newAgent = queryText
              ? { name: agentName, query: queryText }
              : { name: agentName };

            setAgentBeingConfigured(newAgent);
            setCommandInput("");
            setError("");

            const message = queryText
              ? `✓ Agent @${agentName} configured with query\n\nQuery: ${queryText}\n\nYou can now:\n• /save to attach agent\n• /schedule to set update frequency\n• /threshold to set trigger conditions`
              : `📋 Configuring @${agentName}\n\nWhat should this agent research?\n\nNext: Type /query <your research question>`;

            await addFermiMessage(
              `@${agentName}${queryText ? ` /query ${queryText}` : ""}`,
              message,
              queryText
                ? [
                    {
                      key: "schedule",
                      label: "/schedule ",
                      description: "Set update frequency",
                    },
                    { key: "save", label: "/save", description: "Save agent" },
                    { key: "cancel", label: "/cancel", description: "Cancel" },
                  ]
                : [
                    {
                      key: "query",
                      label: "/query ",
                      description: "Set research query",
                    },
                    { key: "cancel", label: "/cancel", description: "Cancel" },
                  ],
            );
          }
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

        if (!isOnline) {
          setError(
            "❌ Cannot add evidence while offline.\n\n" +
              "Adding evidence requires backend connectivity for link preview fetching. " +
              "Local-only mode with CRDT synchronization will be available in a future update.",
          );
          setCommandInput("");
          return;
        }

        // Extract URLs and fetch preview for first URL
        const { extractUrls } = await import("../utils/urlUtils");
        const { fetchLinkPreview } =
          await import("../services/linkPreviewService");

        const urls = extractUrls(evidenceText);
        let linkPreview = undefined;

        if (urls.length > 0) {
          try {
            setError("Fetching link preview...");
            linkPreview = await fetchLinkPreview(urls[0]);
          } catch (err) {
            console.error("Failed to fetch link preview:", err);
            // Continue without preview if fetch fails
          }
        }

        setDriverBeingConfigured({
          ...driverBeingConfigured,
          evidence: [
            ...(driverBeingConfigured.evidence || []),
            {
              id: idGenerators.evidence(),
              type: urls.length > 0 ? "url" : "manual",
              source: "user",
              summary: evidenceText,
              timestamp: new Date().toISOString(),
              linkPreview,
            },
          ],
        });
        setCommandInput("");

        const previewMsg = linkPreview
          ? `\n📎 Preview: ${linkPreview.title}`
          : "";
        setError(
          `✓ Evidence added: "${evidenceText.substring(0, 50)}${evidenceText.length > 50 ? "..." : ""}"${previewMsg}`,
        );
        return;
      }

      // /history - view version history for this driver
      if (trimmed === "/history") {
        const versionHistory = driverBeingConfigured.versionHistory || [];
        const currentVersion = driverBeingConfigured.version || {
          major: 1,
          minor: 0,
        };

        if (versionHistory.length === 0) {
          setError(
            `${driverBeingConfigured.name} v${currentVersion.major}.${currentVersion.minor} — No version history yet`,
          );
        } else {
          // Format version history as a readable message
          let historyMsg = `\n📜 Version History for ${driverBeingConfigured.name}\n`;
          historyMsg += `Current: v${currentVersion.major}.${currentVersion.minor}\n\n`;

          // Show versions in reverse chronological order (newest first)
          const sortedVersions = [...versionHistory].sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          );

          sortedVersions.forEach((version: any, idx: number) => {
            const date = new Date(version.timestamp).toLocaleDateString();
            const time = new Date(version.timestamp).toLocaleTimeString();
            historyMsg += `v${version.majorVersion}.${version.minorVersion} (${version.changeType}) — ${date} ${time}\n`;
            historyMsg += `  ${version.changeDescription}\n`;
            if (version.changes && version.changes.length > 0) {
              version.changes.forEach((change: any) => {
                const percentStr = change.percentChange
                  ? ` (${change.percentChange > 0 ? "+" : ""}${change.percentChange}%)`
                  : "";
                historyMsg += `  • ${change.field}: ${change.oldValue} → ${change.newValue}${percentStr}\n`;
              });
            }
            if (idx < sortedVersions.length - 1) {
              historyMsg += "\n";
            }
          });

          setError(historyMsg);
        }
        setCommandInput("");
        return;
      }

      // @fermi is handled in the agent mention section below
      // Keep /fermi as alias for backwards compatibility
      if (trimmed === "/fermi") {
        handleFermiCoaching();
        setCommandInput("");
        return;
      }

      // /run @agent [/query <text>] - Quick agent execution
      if (trimmed.startsWith("/run @")) {
        if (!isOnline) {
          setError(
            "❌ Cannot run agents while offline.\n\n" +
              "Agent execution requires backend connectivity. " +
              "Local-only mode with CRDT synchronization will be available in a future update.",
          );
          setCommandInput("");
          return;
        }

        const fullCommand = trimmed.replace("/run @", "").trim();

        // Parse: agent_name /query some text
        let agentName = fullCommand;
        let query = null;

        if (fullCommand.includes("/query ")) {
          const parts = fullCommand.split("/query ");
          agentName = parts[0].trim();
          query = parts[1]?.trim();
        }

        if (!agentName) {
          setError("Usage: /run @agent_name [/query <text>]");
          setCommandInput("");
          return;
        }

        setLoading(true);
        setProcessingAction(`Running @${agentName}...`);

        try {
          // If query provided, create/update agent with query
          let agentToRun = driverBeingConfigured.agents?.find(
            (a: any) => a.name === agentName,
          );

          if (query) {
            // Create or update agent with the query
            const newAgent = {
              id: agentToRun?.id || idGenerators.agent(),
              name: agentName,
              query: query,
              schedule: agentToRun?.schedule || "on-demand",
              threshold: agentToRun?.threshold,
              createdAt: agentToRun?.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            // Update driver with agent
            const existingIndex = driverBeingConfigured.agents?.findIndex(
              (a: any) => a.name === agentName,
            );

            let updatedAgents;
            if (existingIndex >= 0) {
              updatedAgents = [...driverBeingConfigured.agents];
              updatedAgents[existingIndex] = newAgent;
            } else {
              updatedAgents = [
                ...(driverBeingConfigured.agents || []),
                newAgent,
              ];
            }

            setDriverBeingConfigured({
              ...driverBeingConfigured,
              agents: updatedAgents,
            });

            agentToRun = newAgent;
            showToast(`✓ Agent @${agentName} configured`);
          } else if (!agentToRun || !agentToRun.query) {
            setError(
              `Agent @${agentName} needs a query. Use: /run @${agentName} /query <text>`,
            );
            setLoading(false);
            setProcessingAction("");
            setCommandInput("");
            return;
          }

          // Execute research
          const result = await researchService.executeResearch({
            agentId: agentName,
            promptId: "market_tam_sizing",
            variables: {
              MARKET_SEGMENT: agentToRun.query,
              GEOGRAPHY: "United States",
            },
          });

          // Create ResearchSnapshot and add to researchResults
          const researchSnapshot = {
            id: idGenerators.researchSnapshot(),
            agentId: agentName,
            promptId: "market_tam_sizing",
            variables: {
              MARKET_SEGMENT: agentToRun.query,
              GEOGRAPHY: "United States",
            },
            summary: result.result?.summary || "Research completed",
            keyFindings: result.result?.keyFindings || [],
            sources: result.result?.sources || [],
            confidence: result.result?.confidence || "medium",
            fullResponse: JSON.stringify(result.result),
            cost: result.cost || 0,
            tokensUsed: result.tokensUsed || 0,
            executedAt: new Date(),
            attachedToDriverId: driverBeingConfigured.id,
          };

          setDriverBeingConfigured({
            ...driverBeingConfigured,
            researchResults: [
              ...(driverBeingConfigured.researchResults || []),
              researchSnapshot,
            ],
          });

          await addFermiMessage(
            `/run @${agentName}`,
            `✓ Research complete!\n\n**Summary:** ${result.result?.summary || "See evidence below"}\n\n**Key Findings:**\n${result.result?.keyFindings?.map((f: string) => `• ${f}`).join("\n") || "No findings"}\n\nEvidence added to driver. Type /save to commit changes.`,
          );

          showToast(`✓ @${agentName} research complete`);
        } catch (err) {
          console.error("[Run Agent] Failed:", err);
          setError(
            `Research failed: ${err instanceof Error ? err.message : "Unknown error"}`,
          );
          await addFermiMessage(
            `/run @${agentName}`,
            `❌ Research failed: ${err instanceof Error ? err.message : "Unknown error"}`,
          );
        } finally {
          setLoading(false);
          setProcessingAction("");
        }

        setCommandInput("");
        return;
      }

      // /save - save the configured driver
      if (trimmed === "/save") {
        console.log("[/save] Command received");
        console.log("[/save] isOnline:", isOnline);
        console.log(
          "[/save] driverBeingConfigured:",
          driverBeingConfigured?.name,
        );
        console.log("[/save] activeForecast:", activeForecast?.id);

        if (!isOnline) {
          console.log("[/save] Blocked: Offline");
          setError(
            "❌ Cannot save while offline.\n\n" +
              "Saving changes requires backend connectivity. " +
              "Local-only mode with CRDT synchronization will be available in a future update.",
          );
          setCommandInput("");
          return;
        }

        console.log("[/save] Calling saveConfiguredDriver...");
        await saveConfiguredDriver();
        console.log("[/save] saveConfiguredDriver completed");
        setCommandInput("");
        return;
      }

      // Note: /cancel is handled by global handler above which shows confirmation
    }

    // Handle /privacy command - set forecast privacy level
    if (trimmed.startsWith("/privacy")) {
      const privacyArg = trimmed.replace("/privacy", "").trim().toLowerCase();

      if (!privacyArg) {
        // Show current privacy setting
        const privacyLabels = {
          private: "🔒 Private (only you)",
          unlisted: "🔗 Unlisted (link sharing)",
          public: "🌍 Public (discoverable)",
          organization: "🏢 Organization (team-only)",
        };

        await addFermiMessage(
          "/privacy",
          `Current privacy: ${privacyLabels[forecastPrivacy]}\n\nAvailable options:\n• private - Only you can see\n• unlisted - Anyone with link can see\n• public - Appears in discovery feed\n• organization - Team members can see\n\nUsage: /privacy <level>`,
          [
            {
              key: "private",
              label: "/privacy private",
              description: "Only you",
            },
            {
              key: "unlisted",
              label: "/privacy unlisted",
              description: "Link sharing",
            },
            {
              key: "public",
              label: "/privacy public",
              description: "Discoverable",
            },
          ],
        );
        setCommandInput("");
        return;
      }

      if (
        ["private", "unlisted", "public", "organization"].includes(privacyArg)
      ) {
        setForecastPrivacy(
          privacyArg as "private" | "unlisted" | "public" | "organization",
        );
        const labels = {
          private: "🔒 Private - only you can see",
          unlisted: "🔗 Unlisted - link sharing enabled",
          public: "🌍 Public - will appear in discovery",
          organization: "🏢 Organization - team members can see",
        };
        await addFermiMessage(
          `/privacy ${privacyArg}`,
          `Privacy set to: ${labels[privacyArg as keyof typeof labels]}\n\nThis will apply to your next forecast.`,
        );
        setCommandInput("");
        return;
      }

      setError(
        "Invalid privacy level. Use: private, unlisted, public, or organization",
      );
      setCommandInput("");
      return;
    }

    // Handle /tags command - set forecast tags
    if (trimmed.startsWith("/tags")) {
      const tagsArg = trimmed.replace("/tags", "").trim();

      if (!tagsArg) {
        await addFermiMessage(
          "/tags",
          forecastTags.length > 0
            ? `Current tags: ${forecastTags.join(", ")}\n\nTo update: /tags tag1, tag2, tag3\nTo clear: /tags clear`
            : `No tags set.\n\nAdd tags to help others discover your forecast:\n/tags technology, AI, 2025\n\nTags are useful for public forecasts.`,
          [],
        );
        setCommandInput("");
        return;
      }

      if (tagsArg === "clear") {
        setForecastTags([]);
        await addFermiMessage("/tags clear", "Tags cleared.");
        setCommandInput("");
        return;
      }

      const tags = tagsArg
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      setForecastTags(tags);
      await addFermiMessage(
        `/tags ${tagsArg}`,
        `Tags set: ${tags.join(", ")}\n\nThese will apply to your next forecast.`,
      );
      setCommandInput("");
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

      // Prepare external view data
      const externalViewData = {
        referenceClass,
        baseRate: activeForecast.externalView?.baseRate || 0.5, // Default if not set
        source: activeForecast.externalView?.source,
        generatedBy:
          activeForecast.externalView?.generatedBy || ("user" as const),
        confidence: activeForecast.externalView?.confidence,
        reasoning: activeForecast.externalView?.reasoning,
      };

      // Sync to backend first
      setLoading(true);
      setProcessingAction("Saving reference class...");

      try {
        const { setBaseRateWithSync } = await import("../utils/backendSync");
        const result = await setBaseRateWithSync(
          activeForecast.id,
          externalViewData,
        );

        if (result.success && result.forecast) {
          // Backend succeeded - use backend data
          setActiveForecast(result.forecast);
          setSavedForecasts((prev) =>
            prev.map((f) => (f.id === activeForecast.id ? result.forecast : f)),
          );
          console.log("Reference class synced to backend successfully");
        } else {
          // Backend failed - update locally only
          console.log(
            "Reference class backend sync failed, saving locally:",
            result.error,
          );
          const updatedForecast = {
            ...activeForecast,
            externalView: {
              ...externalViewData,
              updatedAt: new Date().toISOString(),
            },
            grounding: "external" as const,
            updatedAt: new Date().toISOString(),
          };
          setActiveForecast(updatedForecast);
          setSavedForecasts((prev) =>
            prev.map((f) => (f.id === activeForecast.id ? updatedForecast : f)),
          );
          await saveForecast(updatedForecast);
        }
      } catch (err) {
        console.error("Reference class sync error:", err);
        // Fallback to local save
        const updatedForecast = {
          ...activeForecast,
          externalView: {
            ...externalViewData,
            updatedAt: new Date().toISOString(),
          },
          grounding: "external" as const,
          updatedAt: new Date().toISOString(),
        };
        setActiveForecast(updatedForecast);
        setSavedForecasts((prev) =>
          prev.map((f) => (f.id === activeForecast.id ? updatedForecast : f)),
        );
        await saveForecast(updatedForecast);
      } finally {
        setLoading(false);
        setProcessingAction("");
      }

      setCommandInput("");
      setError("");
      return;
    }

    // Handle /base-rate command - set base rate percentage for external view
    if (trimmed.startsWith("/base-rate ")) {
      if (!activeForecast) {
        setError("No active forecast. Type /question first.");
        setCommandInput("");
        return;
      }

      const rateStr = trimmed.replace("/base-rate ", "").trim();
      const rate = parseFloat(rateStr);

      if (isNaN(rate) || rate < 0 || rate > 100) {
        setError(
          "Please provide a valid percentage (0-100), e.g., /base-rate 35",
        );
        return;
      }

      const previousGeneratedBy = activeForecast.externalView?.generatedBy;
      const previousRate = activeForecast.externalView?.baseRate
        ? Math.round(activeForecast.externalView.baseRate * 100)
        : null;

      // Prepare base rate data
      const baseRateData = {
        referenceClass:
          activeForecast.externalView?.referenceClass ||
          "User-defined reference class",
        baseRate: rate / 100, // Convert percentage to 0-1 range
        source: activeForecast.externalView?.source || "User research",
        generatedBy: "user" as const,
        confidence: activeForecast.externalView?.confidence || "medium",
        reasoning: activeForecast.externalView?.reasoning,
      };

      // Sync to backend first
      setLoading(true);
      setProcessingAction("Saving base rate...");

      try {
        const { setBaseRateWithSync } = await import("../utils/backendSync");
        const result = await setBaseRateWithSync(
          activeForecast.id,
          baseRateData,
        );

        if (result.success && result.forecast) {
          // Backend succeeded - use backend data
          setActiveForecast(result.forecast);
          setSavedForecasts((prev) =>
            prev.map((f) => (f.id === activeForecast.id ? result.forecast : f)),
          );
          console.log("Base rate synced to backend successfully");
        } else {
          // Backend failed - update locally only
          console.log(
            "Base rate backend sync failed, saving locally:",
            result.error,
          );
          const updatedForecast = {
            ...activeForecast,
            externalView: {
              ...baseRateData,
              updatedAt: new Date().toISOString(),
            },
            grounding: "external" as const,
            updatedAt: new Date().toISOString(),
          };
          setActiveForecast(updatedForecast);
          setSavedForecasts((prev) =>
            prev.map((f) => (f.id === activeForecast.id ? updatedForecast : f)),
          );
          await saveForecast(updatedForecast);
        }
      } catch (err) {
        console.error("Base rate sync error:", err);
        // Fallback to local save
        const updatedForecast = {
          ...activeForecast,
          externalView: {
            ...baseRateData,
            updatedAt: new Date().toISOString(),
          },
          grounding: "external" as const,
          updatedAt: new Date().toISOString(),
        };
        setActiveForecast(updatedForecast);
        setSavedForecasts((prev) =>
          prev.map((f) => (f.id === activeForecast.id ? updatedForecast : f)),
        );
        await saveForecast(updatedForecast);
      } finally {
        setLoading(false);
        setProcessingAction("");
      }

      setCommandInput("");

      // Send Fermi message with different content based on whether this is override or new
      if (previousGeneratedBy === "fermi" && previousRate !== null) {
        await addFermiMessage(
          "/base-rate",
          `✓ **Base rate updated to ${rate}%**\n\n` +
            `You've overridden the AI-generated base rate (${previousRate}%) with your own research.\n\n` +
            `💡 **Document your reasoning:** To help with future analysis and collaboration, ` +
            `consider adding evidence explaining why you chose this base rate:\n\n` +
            `\`/evidence [explain your research and reasoning]\``,
          [
            {
              key: "evidence",
              label: "/evidence ",
              desc: "Document your reasoning",
            },
            { key: "driver", label: "/driver ", desc: "Add a driver" },
          ],
        );
      } else {
        await addFermiMessage(
          "/base-rate",
          `✓ **Base rate set to ${rate}%**\n\n` +
            `${previousRate !== null ? `Updated from ${previousRate}%.` : "Base rate added."}\n\n` +
            `💡 **Document your reasoning:** Adding evidence will help explain ` +
            `this base rate to others and for future reference:\n\n` +
            `\`/evidence [explain why you chose this base rate]\``,
          [
            {
              key: "evidence",
              label: "/evidence ",
              desc: "Document your reasoning",
            },
            { key: "driver", label: "/driver ", desc: "Add a driver" },
          ],
        );
      }
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
      // Update savedForecasts so premortem status appears in /list
      setSavedForecasts((prev) =>
        prev.map((f) => (f.id === activeForecast.id ? updatedForecast : f)),
      );
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
        !["external", "premortem", "inside view / analysis"].includes(grounding)
      ) {
        setError(
          "Grounding must be 'external', 'premortem', or 'inside view / analysis'",
        );
        return;
      }

      // Sync to backend first
      setLoading(true);
      setProcessingAction("Updating grounding...");

      try {
        const { updateForecastWithSync } = await import("../utils/backendSync");
        const result = await updateForecastWithSync(activeForecast.id, {
          grounding: grounding as
            | "external"
            | "premortem"
            | "inside view / analysis",
        });

        if (result.success && result.forecast) {
          // Backend succeeded - use backend data
          setActiveForecast(result.forecast);
          setSavedForecasts((prev) =>
            prev.map((f) => (f.id === activeForecast.id ? result.forecast : f)),
          );
          console.log("Grounding synced to backend successfully");
        } else {
          // Backend failed - update locally only
          console.log(
            "Grounding backend sync failed, saving locally:",
            result.error,
          );
          const updatedForecast = {
            ...activeForecast,
            grounding: grounding as
              | "external"
              | "premortem"
              | "inside view / analysis",
            updatedAt: new Date().toISOString(),
          };
          setActiveForecast(updatedForecast);
          setSavedForecasts((prev) =>
            prev.map((f) => (f.id === activeForecast.id ? updatedForecast : f)),
          );
          await saveForecast(updatedForecast);
        }
      } catch (err) {
        console.error("Grounding sync error:", err);
        // Fallback to local save
        const updatedForecast = {
          ...activeForecast,
          grounding: grounding as
            | "external"
            | "premortem"
            | "inside view / analysis",
          updatedAt: new Date().toISOString(),
        };
        setActiveForecast(updatedForecast);
        setSavedForecasts((prev) =>
          prev.map((f) => (f.id === activeForecast.id ? updatedForecast : f)),
        );
        await saveForecast(updatedForecast);
      } finally {
        setLoading(false);
        setProcessingAction("");
      }

      setCommandInput("");
      setError("");
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

      // Sync to backend first
      setLoading(true);
      setProcessingAction("Saving probability...");

      try {
        const { updateForecastWithSync } = await import("../utils/backendSync");
        const result = await updateForecastWithSync(activeForecast.id, {
          probability,
        });

        if (result.success && result.forecast) {
          // Backend succeeded - use backend data
          setActiveForecast(result.forecast);
          setSavedForecasts((prev) =>
            prev.map((f) => (f.id === activeForecast.id ? result.forecast : f)),
          );
          console.log("Probability synced to backend successfully");
        } else {
          // Backend failed - update locally only
          console.log(
            "Probability backend sync failed, saving locally:",
            result.error,
          );
          const updatedForecast = {
            ...activeForecast,
            probability,
            updatedAt: new Date().toISOString(),
          };
          setActiveForecast(updatedForecast);
          setSavedForecasts((prev) =>
            prev.map((f) => (f.id === activeForecast.id ? updatedForecast : f)),
          );
          await saveForecast(updatedForecast);
        }
      } catch (err) {
        console.error("Probability sync error:", err);
        // Fallback to local save
        const updatedForecast = {
          ...activeForecast,
          probability,
          updatedAt: new Date().toISOString(),
        };
        setActiveForecast(updatedForecast);
        setSavedForecasts((prev) =>
          prev.map((f) => (f.id === activeForecast.id ? updatedForecast : f)),
        );
        await saveForecast(updatedForecast);
      } finally {
        setLoading(false);
        setProcessingAction("");
      }

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

      // Ask for confirmation before resolving
      setPendingConfirmation({
        action: "expire",
        data: { outcome },
        message: `Resolve forecast as ${outcome}?`,
      });

      const outcomeEmoji = outcome === "positive" ? "✓" : "✗";
      const forecastProb = activeForecast.probability;
      const expectedBrier = Math.pow(
        forecastProb / 100 - (outcome === "positive" ? 1 : 0),
        2,
      );

      await addFermiMessage(
        `/expire ${outcome}`,
        `⚠️ Resolve forecast as **${outcome.toUpperCase()}**?\n\nYour forecast: ${forecastProb}%\nOutcome: ${outcomeEmoji} ${outcome}\nExpected Brier Score: ${expectedBrier.toFixed(3)}\n\n**This action is permanent.** Type /confirm to proceed or /cancel to abort.`,
        [
          { key: "confirm", label: "/confirm", desc: "Resolve forecast" },
          { key: "cancel", label: "/cancel", desc: "Cancel" },
        ],
      );

      setCommandInput("");
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
            // No need to save locally - backend is source of truth
          } else {
            // Fallback: update probability only (shouldn't happen with backend-primary)
            const updatedForecast = {
              ...activeForecast,
              probability: result.probability,
              updatedAt: new Date().toISOString(),
            };
            setActiveForecast(updatedForecast);
            // Update savedForecasts so probability appears in /list
            setSavedForecasts((prev) =>
              prev.map((f) =>
                f.id === activeForecast.id ? updatedForecast : f,
              ),
            );
            await saveForecast(updatedForecast);
          }

          const simulationCount = result.forecast?.simulations?.length || 1;
          console.log(
            `Simulation #${simulationCount} complete: ${result.probability}`,
          );
        } else {
          // Handle forecast not found - backend was reset
          if (
            result.error?.includes("not found") ||
            result.error?.includes("404")
          ) {
            throw new Error(
              "Forecast not found on backend. The server may have restarted. Please create a new forecast.",
            );
          }
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

    // Handle /review command - comprehensive forecast analysis
    if (trimmed === "/review") {
      if (!activeForecast) {
        setError("No active forecast to review. Type /question first.");
        setCommandInput("");
        return;
      }

      setCommandInput("");
      setFermiChatExpanded(true);
      setFermiThinking(true);

      // Warn if base rate confidence is low
      if (activeForecast.externalView?.confidence === "low") {
        await addFermiMessage(
          "/review",
          `⚠️ **Base Rate Confidence Warning**\n\n` +
            `Your base rate (${Math.round(activeForecast.externalView.baseRate! * 100)}%) ` +
            `has low confidence. Consider:\n` +
            `• Researching similar cases with /evidence\n` +
            `• Refining the reference class with /external\n` +
            `• Using /base-rate to override with better data\n\n` +
            `Proceeding with review...`,
        );
      }

      try {
        // Build baseRate object if available
        const baseRate =
          activeForecast.externalView?.baseRate !== undefined
            ? {
                referenceClass:
                  activeForecast.externalView.referenceClass || "General",
                successRate: activeForecast.externalView.baseRate * 100, // Convert 0-1 to percentage
                source: activeForecast.externalView.source,
              }
            : undefined;

        const response = await researchService.reviewForecast(
          activeForecast.id || "temp",
          {
            question: activeForecast.question,
            drivers: activeForecast.drivers,
            probability: activeForecast.probability,
            baseRate,
          },
        );

        const suggestions: CommandSuggestion[] =
          response.suggestions?.map((s: any) => ({
            label: s.command || s.label,
            desc: s.description || s.desc,
          })) || [];

        await addFermiMessage(
          "/review",
          response.message || response.review,
          suggestions,
        );
        return;
      } catch (apiError) {
        console.error("[Review] API call failed:", apiError);
        await addFermiMessage(
          "/review",
          "❌ **Backend unavailable**\n\nCouldn't connect to the AI coach. Please check your connection and try again.",
        );
      } finally {
        setFermiThinking(false);
      }
      return;
    }

    // Handle /decompose command - suggest strategies for breaking down the question
    if (trimmed === "/decompose") {
      if (!activeForecast) {
        setError("No active forecast to decompose. Type /question first.");
        setCommandInput("");
        return;
      }

      setCommandInput("");
      setFermiChatExpanded(true);
      setFermiThinking(true);

      try {
        const response = await researchService.decomposeForecast(
          activeForecast.question,
          {
            forecastId: activeForecast.id,
            existingDrivers: activeForecast.drivers,
          },
        );
        // Convert backend suggestions to frontend format
        const suggestions =
          response.suggestions?.map((s: any) => ({
            command: `/driver ${s.data.name}`,
            description: s.data.description,
            clickable: true,
            driverData: s.data,
          })) || [];

        await addFermiMessage(
          "/decompose",
          response.message || response.decomposition,
          suggestions,
        );
        return;
      } catch (apiError) {
        console.error("[Decompose] API call failed:", apiError);
        await addFermiMessage(
          "/decompose",
          "❌ **Backend unavailable**\n\nCouldn't connect to the AI coach. Please check your connection and try again.",
        );
      } finally {
        setFermiThinking(false);
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

      // Check if backend is online
      if (!isOnline) {
        setError(
          "❌ Cannot edit drivers while offline.\n\n" +
            "Driver creation and editing requires backend connectivity. " +
            "Local-only mode with CRDT synchronization will be available in a future update.",
        );
        setCommandInput("");
        return;
      }

      const driverName = trimmed.replace("/driver ", "").trim();
      if (!driverName) {
        setError("Please provide a driver name");
        return;
      }

      setCommandInput("");

      // Check if driver already exists - if so, enter edit mode
      const existingDriver = activeForecast.drivers?.find(
        (d: any) => d.name.toLowerCase() === driverName.toLowerCase(),
      );

      if (existingDriver) {
        // Edit mode - load existing driver into config
        setDriverBeingConfigured({ ...existingDriver });
        setError(
          `📝 Editing driver: ${existingDriver.name}\n\nModify with /p, /dist, /direction, or add agents with @agent_name.\nType /save when done or /cancel to discard changes.`,
        );
        return;
      }

      // Create new driver with AI analysis
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
          id: idGenerators.driver(),
          name: driverName,
          type: recommendation.type,
          direction: recommendation.direction,
          agents: [] as any[],
          researchResults: [] as any[],
          evidence: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          aiRecommendation: recommendation,
          version: { major: 1, minor: 0 },
          versionHistory: [],
        };

        if (recommendation.type === "binary") {
          newDriver.probability = recommendation.examples?.probability || 0.5;
        } else {
          newDriver.distribution = recommendation.distribution || "triangular";
          newDriver.p5 = recommendation.examples?.p5 || 30;
          newDriver.p50 = recommendation.examples?.p50 || 50;
          newDriver.p95 = recommendation.examples?.p95 || 70;
        }

        // Auto-save driver immediately (same as chip behavior)
        const updatedForecast = {
          ...activeForecast,
          drivers: [...(activeForecast.drivers || []), newDriver],
          updatedAt: new Date().toISOString(),
        };

        setActiveForecast(updatedForecast);
        setSavedForecasts((prev) =>
          prev.map((f) => (f.id === activeForecast.id ? updatedForecast : f)),
        );
        await saveForecast(updatedForecast);

        // Enter config mode for optional refinement
        setDriverBeingConfigured(newDriver);
        showToast(`✓ Driver added: ${newDriver.name}`);
        setError(
          `✓ Driver saved with AI defaults!\n\n${recommendation.reasoning}\n\nNext steps (optional):\n• Attach research agent: @research_analyst\n• Adjust values: /p 20 50 80\n• Add evidence: /evidence\n\nType /save when done or /cancel to exit.`,
        );
      } catch (err) {
        console.error("[Custom Driver] Analysis failed:", err);
        setError(
          "❌ Backend unavailable - couldn't analyze driver. Please check your connection and try again.",
        );
      } finally {
        setLoading(false);
        setProcessingAction("");
      }
      return;
    }

    // Handle /remove command - remove driver or agent
    if (trimmed.startsWith("/remove ")) {
      if (!activeForecast) {
        setError("No active forecast. Type /question first.");
        setCommandInput("");
        return;
      }

      const removeTarget = trimmed.replace("/remove ", "").trim();

      if (removeTarget.startsWith("driver ")) {
        const driverName = removeTarget.replace("driver ", "").trim();
        const driverIndex = activeForecast.drivers?.findIndex(
          (d: any) => d.name.toLowerCase() === driverName.toLowerCase(),
        );

        if (driverIndex === -1 || driverIndex === undefined) {
          setError(`Driver "${driverName}" not found.`);
          setCommandInput("");
          return;
        }

        // Get driver to remove (for cascade delete logging)
        const removedDriver = activeForecast.drivers[driverIndex];

        // Log cascade delete info
        const agentsCount = removedDriver.agents?.length || 0;
        const researchCount = removedDriver.researchResults?.length || 0;
        const evidenceCount = removedDriver.evidence?.length || 0;

        console.log(
          `[RemoveDriver] Cascade deleting driver "${removedDriver.name}":`,
        );
        console.log(`  - ${agentsCount} agent(s)`);
        console.log(`  - ${researchCount} research result(s)`);
        console.log(`  - ${evidenceCount} evidence item(s)`);

        // Try backend sync first
        setLoading(true);
        setProcessingAction("Removing driver...");

        try {
          const { removeDriverWithSync } = await import("../utils/backendSync");
          const result = await removeDriverWithSync(
            activeForecast.id,
            removedDriver.id,
          );

          if (result.success && result.forecast) {
            // Backend succeeded - use backend data
            setActiveForecast(result.forecast);
            setSavedForecasts((prev) =>
              prev.map((f) =>
                f.id === activeForecast.id ? result.forecast : f,
              ),
            );
            console.log("Driver removed from backend successfully");
          } else {
            // Backend failed - remove locally
            console.log(
              "Backend removal failed, removing locally:",
              result.error,
            );
            const updatedDrivers = [...(activeForecast.drivers || [])];
            updatedDrivers.splice(driverIndex, 1);

            const updatedForecast = {
              ...activeForecast,
              drivers: updatedDrivers,
              updatedAt: new Date().toISOString(),
            };

            setActiveForecast(updatedForecast);
            setSavedForecasts((prev) =>
              prev.map((f) =>
                f.id === activeForecast.id ? updatedForecast : f,
              ),
            );
            await saveForecast(updatedForecast);
          }
        } catch (err) {
          console.error("Driver removal error:", err);
          // Fallback to local removal
          const updatedDrivers = [...(activeForecast.drivers || [])];
          updatedDrivers.splice(driverIndex, 1);

          const updatedForecast = {
            ...activeForecast,
            drivers: updatedDrivers,
            updatedAt: new Date().toISOString(),
          };

          setActiveForecast(updatedForecast);
          setSavedForecasts((prev) =>
            prev.map((f) => (f.id === activeForecast.id ? updatedForecast : f)),
          );
          await saveForecast(updatedForecast);
        } finally {
          setLoading(false);
          setProcessingAction("");
        }

        setCommandInput("");

        // Show detailed cascade delete message
        const cascadeInfo = [];
        if (agentsCount > 0) cascadeInfo.push(`${agentsCount} agent(s)`);
        if (researchCount > 0)
          cascadeInfo.push(`${researchCount} research result(s)`);
        if (evidenceCount > 0)
          cascadeInfo.push(`${evidenceCount} evidence item(s)`);

        const cascadeMsg =
          cascadeInfo.length > 0
            ? `\n\nCascade deleted: ${cascadeInfo.join(", ")}`
            : "";

        showToast(`✓ Removed driver: ${removedDriver.name}`);
        setError(`✓ Removed driver: ${removedDriver.name}${cascadeMsg}`);
        return;
      } else if (removeTarget.startsWith("agent ")) {
        const agentName = removeTarget.replace("agent ", "").trim();

        if (!driverBeingConfigured) {
          setError(
            "No driver being configured. Enter driver config mode first with /driver <name>",
          );
          setCommandInput("");
          return;
        }

        const agentIndex = driverBeingConfigured.agents?.findIndex(
          (a: any) => a.name.toLowerCase() === agentName.toLowerCase(),
        );

        if (agentIndex === -1 || agentIndex === undefined) {
          setError(`Agent "${agentName}" not found on this driver.`);
          setCommandInput("");
          return;
        }

        // Remove agent from driver
        const updatedAgents = [...(driverBeingConfigured.agents || [])];
        const removedAgent = updatedAgents.splice(agentIndex, 1)[0];

        setDriverBeingConfigured({
          ...driverBeingConfigured,
          agents: updatedAgents,
        });

        setCommandInput("");
        showToast(`✓ Removed agent: ${removedAgent.name}`);
        setError(`✓ Removed agent: ${removedAgent.name}`);
        return;
      } else {
        setError("Usage: /remove driver <name> or /remove agent <name>");
        setCommandInput("");
        return;
      }
    }

    // Handle /edit alone - show usage
    if (trimmed === "/edit" || trimmed === "/edit ") {
      setError(
        "Usage: /edit question <new question text>\n\nExample: /edit question Will AI surpass human intelligence by 2030?",
      );
      setCommandInput("");
      return;
    }

    // Handle /edit question command
    if (trimmed.startsWith("/edit question ")) {
      if (!activeForecast) {
        setError("No active forecast. Create one first with /question");
        setCommandInput("");
        return;
      }

      const newQuestion = trimmed.replace("/edit question ", "").trim();
      if (!newQuestion) {
        setError("Usage: /edit question <new question text>");
        setCommandInput("");
        return;
      }

      // Sync to backend first
      setLoading(true);
      setProcessingAction("Updating question...");

      try {
        const { updateForecastWithSync } = await import("../utils/backendSync");
        const result = await updateForecastWithSync(activeForecast.id, {
          question: newQuestion,
        });

        if (result.success && result.forecast) {
          // Backend succeeded - use backend data
          setActiveForecast(result.forecast);
          setSavedForecasts((prev) =>
            prev.map((f) => (f.id === activeForecast.id ? result.forecast : f)),
          );
          console.log("Question synced to backend successfully");
        } else {
          // Backend failed - update locally only
          console.log(
            "Question backend sync failed, saving locally:",
            result.error,
          );
          const updatedForecast = {
            ...activeForecast,
            question: newQuestion,
            updatedAt: new Date().toISOString(),
          };
          setActiveForecast(updatedForecast);
          setSavedForecasts((prev) =>
            prev.map((f) => (f.id === activeForecast.id ? updatedForecast : f)),
          );
          await saveForecast(updatedForecast);
        }
      } catch (err) {
        console.error("Question sync error:", err);
        // Fallback to local save
        const updatedForecast = {
          ...activeForecast,
          question: newQuestion,
          updatedAt: new Date().toISOString(),
        };
        setActiveForecast(updatedForecast);
        setSavedForecasts((prev) =>
          prev.map((f) => (f.id === activeForecast.id ? updatedForecast : f)),
        );
        await saveForecast(updatedForecast);
      } finally {
        setLoading(false);
        setProcessingAction("");
      }

      setCommandInput("");
      showToast(`✓ Question updated`);
      setError(`✓ Question updated to: "${newQuestion}"`);

      await addFermiMessage(
        trimmed,
        `✓ Question updated to:\n\n"${newQuestion}"\n\nYour existing drivers and evidence remain unchanged.`,
      );
      return;
    }

    // Handle /question command
    if (trimmed.startsWith("/question ")) {
      const question = trimmed.replace("/question ", "").trim();
      if (!question) return;

      // Check if backend is online
      if (!isOnline) {
        setError(
          "❌ Cannot create forecasts while offline.\n\n" +
            "UFFP requires backend connectivity for forecast creation and editing. " +
            "Local-only mode with CRDT synchronization will be available in a future update.\n\n" +
            "Please check your internet connection and try again.",
        );
        setCommandInput("");
        return;
      }

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
          privacy: forecastPrivacy,
          tags: forecastTags,
        });

        if (createResult.forecast) {
          const newForecast: SavedForecast = {
            ...createResult.forecast,
            grounding: parsed.externalView
              ? "external"
              : "inside view / analysis",
            externalView: parsed.externalView
              ? {
                  referenceClass: parsed.externalView.referenceClass,
                  baseRate: parsed.externalView.baseRate,
                  source: parsed.externalView.source,
                  generatedBy: "fermi", // Track that AI generated this
                  confidence: parsed.externalView.confidence,
                  reasoning: parsed.externalView.reasoning,
                  updatedAt: new Date().toISOString(),
                }
              : undefined,
            version: createResult.forecast.version || { major: 1, minor: 0 },
            versionHistory: createResult.forecast.versionHistory || [],
          };

          setActiveForecast(newForecast);

          // Show base rate information if available
          if (
            newForecast.externalView &&
            newForecast.externalView.baseRate !== undefined
          ) {
            const baseRatePercent = Math.round(
              newForecast.externalView.baseRate * 100,
            );

            // Send Fermi message about base rate
            await addFermiMessage(
              "/question",
              `✓ **Forecast created!**\n\n` +
                `📊 **Base Rate Analysis**\n\n` +
                `I've analyzed similar historical cases and found:\n\n` +
                `**Reference Class:** ${newForecast.externalView.referenceClass}\n\n` +
                `**Historical Success Rate:** ${baseRatePercent}%\n\n` +
                `**Confidence:** ${newForecast.externalView.confidence || "medium"}\n\n` +
                `**Reasoning:** ${newForecast.externalView.reasoning || ""}\n\n` +
                `💡 This gives us a starting point based on ${newForecast.externalView.source || "historical analysis"}. ` +
                `As you add drivers and evidence, we'll refine this estimate.\n\n` +
                `**Next steps:**\n` +
                `• Use \`/driver\` to add your first driver\n` +
                `• Use \`/base-rate\` if you want to override with your own research`,
              [
                {
                  key: "driver",
                  label: "/driver ",
                  desc: "Add your first driver",
                },
                {
                  key: "base-rate",
                  label: "/base-rate ",
                  desc: "Override base rate",
                },
              ],
            );
          } else {
            // No base rate available - send basic Fermi message
            await addFermiMessage(
              "/question",
              `✓ **Forecast created!**\n\n` +
                `Your forecast "${newForecast.question}" is ready.\n\n` +
                `**Next steps:**\n` +
                `• Use \`/driver\` to decompose this into key drivers\n` +
                `• Use \`/base-rate\` to add an external view base rate`,
              [
                {
                  key: "driver",
                  label: "/driver ",
                  desc: "Add your first driver",
                },
                {
                  key: "base-rate",
                  label: "/base-rate ",
                  desc: "Add base rate",
                },
              ],
            );
          }

          // Only save to local storage if backend failed
          if (!createResult.fromBackend) {
            await saveForecast(newForecast);
            console.log("Created forecast locally (backend unavailable)");
          } else {
            console.log(`Created forecast ${newForecast.id} on backend`);
            // Add to savedForecasts state so it appears in /list
            setSavedForecasts((prev) => [...prev, newForecast]);
          }
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
      "/e": "/edit question ",
      "/ed": "/edit question ",
      "/edi": "/edit question ",
      "/edit": "/edit question ",
      "/edit ": "/edit question ",
      "/edit q": "/edit question ",
      "/edit qu": "/edit question ",
      "/edit que": "/edit question ",
      "/edit ques": "/edit question ",
      "/edit quest": "/edit question ",
      "/edit questi": "/edit question ",
      "/edit questio": "/edit question ",
      "/edit question": "/edit question ",
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
        fermi: "🦊 Your forecasting coach - helps with everything!",
        research_analyst: "Deep research with citations, quantitative focus",
        sentiment_monitor: "Social listening and sentiment scoring",
        competitive_intel: "Competitor tracking and benchmarking",
        financial_analyst: "Financial statement analysis and modeling",
        market_researcher: "Market sizing and industry analysis",
        expert_synthesizer: "Synthesize expert opinions and predictions",
        regulatory_monitor: "Track regulatory and policy changes",
        growth_signals: "Monitor user adoption and growth metrics",
        hiring_tracker: "Track hiring trends and team growth",
        pricing_intel: "Monitor pricing and cost trends",
        technology_validator:
          "Validate technology feasibility and launch readiness",
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
        {
          key: "query",
          label: "/query",
          desc: agentBeingConfigured.query
            ? `✓ Query set: ${agentBeingConfigured.query.length > 25 ? agentBeingConfigured.query.substring(0, 25) + "..." : agentBeingConfigured.query}`
            : "⚠️ REQUIRED - Set research query",
        },
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
        {
          key: "save",
          label: "/save",
          desc: agentBeingConfigured.query
            ? "✓ Ready to save agent to driver"
            : "⚠️ Set query first!",
        },
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
        { key: "history", label: "/history", desc: "View version history" },
        {
          key: "fermi",
          label: "@fermi",
          desc: "🦊 Ask your forecasting coach",
        },
        { key: "run", label: "/run @agent", desc: "Execute agent research" },
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
        { key: "commands", label: "/commands", desc: "Show all commands" },
        {
          key: "agent-list",
          label: "/agent-list",
          desc: "List all research agents",
        },
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
        { key: "simulate", label: "/simulate", desc: "Run simulation" },
        { key: "review", label: "/review", desc: "Analyze forecast quality" },
        {
          key: "decompose",
          label: "/decompose",
          desc: "Break down the question",
        },
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

  // Get command hints for Fermi CLI (uses fermiChatInput instead of commandInput)
  const getFermiCommandHints = () => {
    const input = fermiChatInput;

    // GLOBAL: Show agent autocomplete whenever @ is typed
    if (input.includes("@")) {
      const agentDescriptions: Record<string, string> = {
        fermi: "🦊 Your forecasting coach - helps with everything!",
        research_analyst: "Deep research with citations, quantitative focus",
        sentiment_monitor: "Social listening and sentiment scoring",
        competitive_intel: "Competitor tracking and benchmarking",
        financial_analyst: "Financial statement analysis and modeling",
        market_researcher: "Market sizing and industry analysis",
        expert_synthesizer: "Synthesize expert opinions and predictions",
        regulatory_monitor: "Track regulatory and policy changes",
        growth_signals: "Monitor user adoption and growth metrics",
        hiring_tracker: "Track hiring trends and team growth",
        pricing_intel: "Monitor pricing and cost trends",
        technology_validator:
          "Validate technology feasibility and launch readiness",
      };

      const atIndex = input.lastIndexOf("@");
      const afterAt = input.substring(atIndex + 1).toLowerCase();

      const allAgents = Object.keys(agentDescriptions).map((name) => ({
        key: name,
        label: "@" + name,
        desc: agentDescriptions[name],
      }));

      if (afterAt.length > 0) {
        return allAgents.filter((a) => a.key.startsWith(afterAt));
      }

      return allAgents;
    }

    // Show context-specific hints for agent configuration
    if (agentBeingConfigured) {
      const agentHints = [
        { key: "query", label: "/query", desc: "Set research query" },
        {
          key: "schedule",
          label: "/schedule",
          desc: "Set schedule (daily|weekly|on-demand)",
        },
        { key: "save", label: "/save", desc: "Save agent to driver" },
        { key: "cancel", label: "/cancel", desc: "Cancel" },
      ];

      if (!input.startsWith("/")) {
        return agentHints;
      }

      const query = input.toLowerCase();

      if (query.startsWith("/schedule ")) {
        return [
          { key: "daily", label: "/schedule daily", desc: "Update daily" },
          { key: "weekly", label: "/schedule weekly", desc: "Update weekly" },
          {
            key: "on-demand",
            label: "/schedule on-demand",
            desc: "Manual updates",
          },
        ].filter((h) => h.label.includes(query));
      }

      return agentHints.filter(
        (h) => h.label.includes(query) || h.desc.toLowerCase().includes(query),
      );
    }

    // Show context-specific hints for driver configuration
    if (driverBeingConfigured) {
      const configHints = [
        { key: "p", label: "/p", desc: "Set probabilities (p5 p50 p95)" },
        {
          key: "dist",
          label: "/dist",
          desc: "Set distribution (triangular|normal|lognormal)",
        },
        {
          key: "direction",
          label: "/direction",
          desc: "Set direction (increases|decreases)",
        },
        { key: "type", label: "/type", desc: "Set type (continuous|binary)" },
        { key: "evidence", label: "/evidence", desc: "Add manual evidence" },
        {
          key: "run",
          label: "/run",
          desc: "Execute agent (@agent [/query text])",
        },
        { key: "edit", label: "/edit", desc: "Edit driver configuration" },
        { key: "save", label: "/save", desc: "Save driver" },
        { key: "cancel", label: "/cancel", desc: "Cancel" },
      ];

      if (!input.startsWith("/")) {
        return configHints;
      }

      const query = input.toLowerCase();

      // Autocomplete for specific command values
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

      return configHints.filter(
        (h) => h.label.includes(query) || h.desc.toLowerCase().includes(query),
      );
    }

    // General command hints
    if (!input.startsWith("/")) {
      // Don't show autocomplete for freeform text messages
      // Only show hints if input is empty or we're prompting them to use commands
      return [];
    }

    const query = input.toLowerCase();

    const hints = [
      { key: "question", label: "/question", desc: "Start a new forecast" },
      { key: "commands", label: "/commands", desc: "Show all commands" },
      {
        key: "list",
        label: "/list",
        desc: "View forecasts (active/expired/all)",
      },
      { key: "leaderboard", label: "/leaderboard", desc: "Global rankings" },
      {
        key: "agent-list",
        label: "/agent-list",
        desc: "List all research agents",
      },
    ];

    // Add forecast-specific commands when there's an active forecast
    if (activeForecast) {
      hints.push(
        { key: "driver", label: "/driver", desc: "Add or edit a driver" },
        { key: "simulate", label: "/simulate", desc: "Run simulation" },
        { key: "review", label: "/review", desc: "Analyze forecast quality" },
        {
          key: "decompose",
          label: "/decompose",
          desc: "Break down the question",
        },
        {
          key: "base-rate",
          label: "/base-rate",
          desc: "Set base rate percentage (0-100)",
        },
        { key: "remove", label: "/remove", desc: "Remove driver or agent" },
      );

      // Autocomplete existing driver names for /driver and /remove
      if (query.startsWith("/driver ") || query.startsWith("/remove driver ")) {
        const prefix = query.startsWith("/driver ")
          ? "/driver "
          : "/remove driver ";
        const partial = query.replace(prefix, "").toLowerCase();

        if (activeForecast.drivers && activeForecast.drivers.length > 0) {
          const driverHints = activeForecast.drivers.map((d: any) => ({
            key: d.name,
            label: `${prefix}${d.name}`,
            desc: `Edit: ${d.name} (${d.type})`,
          }));

          if (partial.length > 0) {
            return driverHints.filter((h: any) =>
              h.key.toLowerCase().includes(partial),
            );
          }

          return driverHints;
        }
      }

      // Autocomplete for /remove agent
      if (query.startsWith("/remove agent ") && driverBeingConfigured) {
        const partial = query.replace("/remove agent ", "").toLowerCase();

        if (
          driverBeingConfigured.agents &&
          driverBeingConfigured.agents.length > 0
        ) {
          const agentHints = driverBeingConfigured.agents.map((a: any) => ({
            key: a.name,
            label: `/remove agent ${a.name}`,
            desc: `Remove: @${a.name}`,
          }));

          if (partial.length > 0) {
            return agentHints.filter((h: any) =>
              h.key.toLowerCase().includes(partial),
            );
          }

          return agentHints;
        }
      }
    }

    // Show /confirm if pending confirmation
    if (pendingConfirmation) {
      hints.push({
        key: "confirm",
        label: "/confirm",
        desc: `Confirm: ${pendingConfirmation.message}`,
      });
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
        style={[
          styles.scrollView,
          fermiChatExpanded && isWideScreen && styles.scrollViewWithChat,
        ]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Active Question Display */}
        {activeQuestion && (
          <View style={styles.questionDisplay}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionText}>{activeQuestion}</Text>
              {activeForecast?.version && (
                <View style={styles.forecastVersionBadge}>
                  <Text style={styles.forecastVersionText}>
                    v{activeForecast.version.major}.
                    {activeForecast.version.minor}
                  </Text>
                </View>
              )}
            </View>

            {/* External View - Always at top to ground the problem class */}
            {activeForecast?.externalView && (
              <View style={styles.externalViewCard}>
                <Text style={styles.externalViewLabel}>
                  📊 External View{" "}
                  {activeForecast.externalView.generatedBy === "fermi"
                    ? "(🦊 AI-Generated)"
                    : "(✏️ User-Provided)"}
                </Text>
                <Text style={styles.externalViewText}>
                  {activeForecast.externalView.referenceClass}
                </Text>
                {activeForecast.externalView.baseRate !== undefined && (
                  <View style={styles.baseRateDisplay}>
                    <Text style={styles.baseRateValue}>
                      {Math.round(activeForecast.externalView.baseRate * 100)}%
                    </Text>
                    <Text style={styles.baseRateLabel}>
                      Historical Base Rate
                    </Text>
                    {activeForecast.externalView.confidence && (
                      <Text style={styles.baseRateConfidence}>
                        Confidence: {activeForecast.externalView.confidence}
                      </Text>
                    )}
                    {activeForecast.externalView.source && (
                      <Text style={styles.baseRateSource}>
                        Source: {activeForecast.externalView.source}
                      </Text>
                    )}
                  </View>
                )}
                {activeForecast.externalView.reasoning && (
                  <Text style={styles.baseRateReasoning}>
                    {activeForecast.externalView.reasoning}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.overrideButton}
                  onPress={() => {
                    const currentRate = activeForecast.externalView.baseRate
                      ? Math.round(activeForecast.externalView.baseRate * 100)
                      : 50;
                    setCommandInput(`/base-rate ${currentRate} `);
                    inputRef.current?.focus();
                  }}
                >
                  <Text style={styles.overrideButtonText}>
                    Override Base Rate
                  </Text>
                </TouchableOpacity>
              </View>
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

        {/* Offline Mode Indicator */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              🔌 OFFLINE MODE - Editing Disabled
            </Text>
            <Text style={styles.offlineBannerSubtext}>
              Reconnect to create and edit forecasts. CRDT sync coming soon.
            </Text>
          </View>
        )}

        {/* Agent Being Configured */}
        {agentBeingConfigured && (
          <View style={styles.configSection}>
            <Text style={styles.sectionLabel}>Configuring Agent</Text>
            {driverBeingConfigured && (
              <View style={styles.driverContextCard}>
                <Text style={styles.driverContextLabel}>For Driver:</Text>
                <Text style={styles.driverContextName}>
                  {driverBeingConfigured.name}
                </Text>
                {driverBeingConfigured.aiRecommendation?.reasoning && (
                  <Text style={styles.driverContextDesc}>
                    {driverBeingConfigured.aiRecommendation.reasoning}
                  </Text>
                )}
              </View>
            )}
            <View style={styles.agentConfigCard}>
              <Text style={styles.agentName}>@{agentBeingConfigured.name}</Text>
              <Text style={styles.agentDetails}>
                Query:{" "}
                {agentBeingConfigured.query
                  ? agentBeingConfigured.query.length > 50
                    ? agentBeingConfigured.query.substring(0, 50) + "..."
                    : agentBeingConfigured.query
                  : "not set"}{" "}
                · Schedule: {agentBeingConfigured.schedule || "on-demand"} ·
                Threshold: {agentBeingConfigured.threshold || 10}%
              </Text>
              <Text style={styles.configHint}>
                {!agentBeingConfigured.query
                  ? "⚠️ Set query first: /query <your research question>"
                  : "Use /schedule, /threshold to configure, then /save"}
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
                        {driverBeingConfigured.probability != null
                          ? `${Math.round(driverBeingConfigured.probability * 100)}%`
                          : "not set - use /prob <value>"}
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

              {/* Evidence Display in Driver Config */}
              {driverBeingConfigured.evidence &&
                driverBeingConfigured.evidence.length > 0 && (
                  <View style={styles.evidenceSection}>
                    <Text style={styles.evidenceLabel}>
                      📚 Evidence ({driverBeingConfigured.evidence.length}):
                    </Text>
                    {driverBeingConfigured.evidence.map(
                      (ev: any, idx: number) => {
                        const evidenceKey = `config-${idx}`;
                        const isExpanded = expandedEvidence.has(evidenceKey);

                        return (
                          <TouchableOpacity
                            key={idx}
                            style={styles.evidenceItem}
                            onPress={(e) => {
                              e.stopPropagation();
                              const newExpanded = new Set(expandedEvidence);
                              if (isExpanded) {
                                newExpanded.delete(evidenceKey);
                              } else {
                                newExpanded.add(evidenceKey);
                              }
                              setExpandedEvidence(newExpanded);
                            }}
                          >
                            <View style={styles.evidenceHeader}>
                              <Text style={styles.evidenceSource}>
                                @{ev.source} ·{" "}
                                {new Date(ev.timestamp).toLocaleDateString()}
                              </Text>
                              <Text style={styles.expandIndicator}>
                                {isExpanded ? "▼" : "▶"}
                              </Text>
                            </View>
                            <Text
                              style={styles.evidenceSummary}
                              numberOfLines={isExpanded ? undefined : 2}
                            >
                              {ev.summary}
                            </Text>
                            {ev.linkPreview && (
                              <LinkPreviewCard preview={ev.linkPreview} />
                            )}
                          </TouchableOpacity>
                        );
                      },
                    )}
                  </View>
                )}

              <Text style={styles.configHint}>
                {driverBeingConfigured.type === "continuous"
                  ? "Commands: /type (continuous|binary) · /dist (triangular|normal|lognormal) · /p <p5> <p50> <p95> · /direction (increases|decreases)"
                  : "Commands: /type (continuous|binary) · /prob <0-100>"}
                {"\n"}Type @ to add research agent · /evidence to add evidence ·
                /save to finish
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
                  <View style={styles.driverHeader}>
                    <Text style={styles.driverName}>{driver.name}</Text>
                    {driver.version && (
                      <View style={styles.versionBadge}>
                        <Text style={styles.versionText}>
                          v{driver.version.major}.{driver.version.minor}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.driverDetails}>
                    {driver.type === "continuous"
                      ? `P(${driver.p5}-${driver.p50}-${driver.p95}) · ${driver.distribution}`
                      : `P(${driver.probability != null ? Math.round(driver.probability * 100) + "%" : "not set"})`}{" "}
                    · {driver.direction}
                  </Text>
                  {driver.agents && driver.agents.length > 0 && (
                    <View style={styles.agentsSection}>
                      <Text style={styles.evidenceLabel}>
                        🤖 Agents ({driver.agents.length}):
                      </Text>
                      {driver.agents.map((agent: any, idx: number) => (
                        <View key={idx} style={styles.agentItem}>
                          <Text style={styles.agentName}>@{agent.name}</Text>
                          <Text style={styles.agentQuery} numberOfLines={2}>
                            {agent.query}
                          </Text>
                          <Text style={styles.agentSchedule}>
                            Schedule: {agent.schedule}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {driver.researchResults &&
                    driver.researchResults.length > 0 && (
                      <View style={styles.evidenceSection}>
                        <Text style={styles.evidenceLabel}>
                          🔬 Research Results ({driver.researchResults.length}):
                        </Text>
                        {driver.researchResults.map(
                          (result: any, idx: number) => {
                            const resultKey = `${driver.id}-research-${idx}`;
                            const isExpanded = expandedEvidence.has(resultKey);

                            return (
                              <TouchableOpacity
                                key={idx}
                                style={styles.evidenceItem}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  const newExpanded = new Set(expandedEvidence);
                                  if (isExpanded) {
                                    newExpanded.delete(resultKey);
                                  } else {
                                    newExpanded.add(resultKey);
                                  }
                                  setExpandedEvidence(newExpanded);
                                }}
                              >
                                <View style={styles.evidenceHeader}>
                                  <Text style={styles.evidenceSource}>
                                    @{result.agentId} ·{" "}
                                    {new Date(
                                      result.executedAt,
                                    ).toLocaleDateString()}
                                  </Text>
                                  <Text style={styles.expandIndicator}>
                                    {isExpanded ? "▼" : "▶"}
                                  </Text>
                                </View>
                                <Text
                                  style={styles.evidenceSummary}
                                  numberOfLines={isExpanded ? undefined : 2}
                                >
                                  {result.summary}
                                </Text>
                                {isExpanded && (
                                  <View style={styles.fullResultSection}>
                                    <Text style={styles.evidenceLabel}>
                                      Key Findings:
                                    </Text>
                                    {result.keyFindings?.map(
                                      (finding: string, i: number) => (
                                        <Text key={i} style={styles.keyFinding}>
                                          • {finding}
                                        </Text>
                                      ),
                                    )}
                                    <Text style={styles.evidenceLabel}>
                                      Confidence: {result.confidence}
                                    </Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          },
                        )}
                      </View>
                    )}
                  {driver.evidence && driver.evidence.length > 0 && (
                    <View style={styles.evidenceSection}>
                      <Text style={styles.evidenceLabel}>
                        📚 Evidence ({driver.evidence.length}):
                      </Text>
                      {driver.evidence.map((ev: any, idx: number) => {
                        const evidenceKey = `${driver.id}-${idx}`;
                        const isExpanded = expandedEvidence.has(evidenceKey);

                        return (
                          <TouchableOpacity
                            key={idx}
                            style={styles.evidenceItem}
                            onPress={(e) => {
                              e.stopPropagation();
                              const newExpanded = new Set(expandedEvidence);
                              if (isExpanded) {
                                newExpanded.delete(evidenceKey);
                              } else {
                                newExpanded.add(evidenceKey);
                              }
                              setExpandedEvidence(newExpanded);
                            }}
                          >
                            <View style={styles.evidenceHeader}>
                              <Text style={styles.evidenceSource}>
                                @{ev.source} ·{" "}
                                {new Date(ev.timestamp).toLocaleDateString()}
                              </Text>
                              <Text style={styles.expandIndicator}>
                                {isExpanded ? "▼" : "▶"}
                              </Text>
                            </View>
                            <Text
                              style={styles.evidenceSummary}
                              numberOfLines={isExpanded ? undefined : 2}
                            >
                              {ev.summary}
                            </Text>
                            {ev.linkPreview && (
                              <LinkPreviewCard preview={ev.linkPreview} />
                            )}
                            {isExpanded && ev.fullResult && (
                              <View style={styles.fullResultSection}>
                                <View style={styles.resultHeader}>
                                  <Text style={styles.fullResultLabel}>
                                    Full Research:
                                  </Text>
                                  <TouchableOpacity
                                    style={styles.exportButton}
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      // Copy to clipboard or show export dialog
                                      const jsonStr = JSON.stringify(
                                        ev.fullResult,
                                        null,
                                        2,
                                      );
                                      setError(
                                        `JSON copied to console. Check browser console for full data.`,
                                      );
                                      console.log("[Evidence Export]", jsonStr);
                                    }}
                                  >
                                    <Text style={styles.exportButtonText}>
                                      Export JSON
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                                {(() => {
                                  // Extract markdown content from fullResult
                                  const data = ev.fullResult;
                                  let markdownContent = "";

                                  if (typeof data === "string") {
                                    markdownContent = data;
                                  } else if (
                                    data.response &&
                                    typeof data.response === "string"
                                  ) {
                                    markdownContent = data.response;
                                  } else if (
                                    data.result &&
                                    data.result.response &&
                                    typeof data.result.response === "string"
                                  ) {
                                    markdownContent = data.result.response;
                                  } else {
                                    // Fallback to formatted text for non-markdown content

                                    let formatted = "";

                                    // Legacy handling for other structures
                                    const result =
                                      data.result || data.response || data;

                                    // Agent info
                                    if (data.agentId) {
                                      formatted += `Agent: ${data.agentId}\n`;
                                      if (data.promptId)
                                        formatted += `Prompt: ${data.promptId}\n`;
                                      formatted += "\n";
                                    }

                                    // Research response (main content)
                                    if (typeof result === "string") {
                                      return result;
                                    } else if (result) {
                                      // Try various field names for summary
                                      if (result.summary) {
                                        formatted += `Summary:\n${result.summary}\n\n`;
                                      }

                                      if (result.findings) {
                                        formatted += `Findings:\n`;
                                        if (Array.isArray(result.findings)) {
                                          result.findings.forEach(
                                            (f: any, i: number) => {
                                              formatted += `${i + 1}. ${typeof f === "string" ? f : JSON.stringify(f)}\n`;
                                            },
                                          );
                                        } else {
                                          formatted += `${result.findings}\n`;
                                        }
                                        formatted += "\n";
                                      }

                                      if (result.sources) {
                                        formatted += `Sources:\n`;
                                        if (Array.isArray(result.sources)) {
                                          result.sources.forEach((s: any) => {
                                            formatted += `• ${typeof s === "string" ? s : s.title || s.url || JSON.stringify(s)}\n`;
                                          });
                                        } else {
                                          formatted += `${result.sources}\n`;
                                        }
                                        formatted += "\n";
                                      }

                                      if (result.confidence !== undefined) {
                                        formatted += `Confidence: ${result.confidence}\n`;
                                      }
                                    }

                                    // Variables used in query
                                    if (data.variables) {
                                      formatted += `Query Variables:\n`;
                                      Object.entries(data.variables).forEach(
                                        ([key, value]) => {
                                          formatted += `• ${key}: ${value}\n`;
                                        },
                                      );
                                      formatted += "\n";
                                    }

                                    // Timestamp
                                    if (data.timestamp) {
                                      formatted += `Timestamp: ${new Date(data.timestamp).toLocaleString()}\n`;
                                    }

                                    // Fallback to JSON if nothing formatted
                                    markdownContent =
                                      formatted ||
                                      JSON.stringify(data, null, 2);
                                  }

                                  // Render with Markdown component
                                  return (
                                    <Markdown
                                      style={{
                                        body: {
                                          color: "#ebdbb2",
                                          fontSize: 14,
                                          lineHeight: 20,
                                        },
                                        heading1: {
                                          color: "#fabd2f",
                                          fontSize: 20,
                                          fontWeight: "bold",
                                          marginTop: 16,
                                          marginBottom: 8,
                                        },
                                        heading2: {
                                          color: "#fabd2f",
                                          fontSize: 18,
                                          fontWeight: "bold",
                                          marginTop: 12,
                                          marginBottom: 6,
                                        },
                                        heading3: {
                                          color: "#fabd2f",
                                          fontSize: 16,
                                          fontWeight: "bold",
                                          marginTop: 10,
                                          marginBottom: 4,
                                        },
                                        strong: {
                                          color: "#fabd2f",
                                          fontWeight: "bold",
                                        },
                                        em: {
                                          color: "#b8bb26",
                                          fontStyle: "italic",
                                        },
                                        bullet_list: {
                                          marginTop: 4,
                                          marginBottom: 4,
                                        },
                                        ordered_list: {
                                          marginTop: 4,
                                          marginBottom: 4,
                                        },
                                        list_item: {
                                          color: "#ebdbb2",
                                          marginBottom: 2,
                                        },
                                        code_inline: {
                                          color: "#b8bb26",
                                          backgroundColor: "#3c3836",
                                          paddingHorizontal: 4,
                                          paddingVertical: 2,
                                          borderRadius: 3,
                                        },
                                        code_block: {
                                          color: "#b8bb26",
                                          backgroundColor: "#3c3836",
                                          padding: 8,
                                          borderRadius: 4,
                                          marginTop: 8,
                                          marginBottom: 8,
                                        },
                                        fence: {
                                          color: "#b8bb26",
                                          backgroundColor: "#3c3836",
                                          padding: 8,
                                          borderRadius: 4,
                                          marginTop: 8,
                                          marginBottom: 8,
                                        },
                                        link: {
                                          color: "#83a598",
                                          textDecorationLine: "underline",
                                        },
                                      }}
                                    >
                                      {markdownContent}
                                    </Markdown>
                                  );
                                })()}
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
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

      {/* @fermi CLI - always visible, no collapse */}
      <View
        style={[
          styles.fermiChatPane,
          !isWideScreen && styles.fermiChatPaneMobile,
        ]}
      >
        {/* Chat Header */}
        <View style={styles.fermiChatHeader}>
          <Text style={styles.fermiChatTitle}>🦊 fermi@uffp ~ $</Text>
        </View>

        {/* Chat History */}
        <ScrollView
          ref={chatScrollRef}
          style={styles.fermiChatHistory}
          contentContainerStyle={styles.fermiChatHistoryContent}
          // @ts-ignore - web-only prop
          className={Platform.OS === "web" ? "fermi-chat-scroll" : undefined}
          onContentSizeChange={() =>
            chatScrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {(() => {
            // Use global conversation if no forecast, otherwise use forecast conversation
            const conversation =
              activeForecast?.fermiConversation || globalFermiConversation;

            if (!conversation || conversation.length === 0) {
              return null;
            }

            return conversation.map((msg, idx) => {
              // Parse suggestions if present
              let messageText = msg.message;
              let suggestions: CommandSuggestion[] = [];

              // Ensure message is a string before processing
              if (typeof messageText !== "string") {
                messageText = String(messageText || "");
              }

              if (
                msg.role === "fermi" &&
                messageText.includes("__SUGGESTIONS__:")
              ) {
                const parts = messageText.split("__SUGGESTIONS__:");
                messageText = parts[0].trim();
                try {
                  suggestions = JSON.parse(parts[1]);
                } catch (e) {
                  console.error("Failed to parse suggestions:", e);
                }
              }

              return (
                <View
                  key={idx}
                  style={[
                    styles.fermiMessage,
                    msg.role === "user"
                      ? styles.fermiMessageUser
                      : styles.fermiMessageFermi,
                  ]}
                >
                  <Text style={styles.fermiMessageRole}>
                    {msg.role === "user" ? "$ " : "🦊 "}
                  </Text>
                  <Text style={styles.fermiMessageText}>{messageText}</Text>

                  {/* Render clickable command shortcuts */}
                  {suggestions.length > 0 && (
                    <View style={styles.suggestionChipsContainer}>
                      {suggestions.map((suggestion, sidx) => {
                        const commandText =
                          (suggestion as any).label ||
                          (suggestion as any).command ||
                          "";

                        return (
                          <TouchableOpacity
                            key={sidx}
                            style={styles.suggestionChip}
                            onPress={async () => {
                              // Check if this suggestion has driver data (from /decompose)
                              const driverData = (suggestion as any).driverData;

                              if (driverData && activeForecast) {
                                // Check if driver already exists
                                const existingDriver =
                                  activeForecast.drivers?.find(
                                    (d: any) =>
                                      d.name.toLowerCase() ===
                                      driverData.name.toLowerCase(),
                                  );

                                if (existingDriver) {
                                  // Driver already exists - enter edit mode instead
                                  setDriverBeingConfigured({
                                    ...existingDriver,
                                  });
                                  setError(
                                    `📝 Driver "${existingDriver.name}" already exists!\n\nEntering edit mode. Modify with /p, /dist, /direction, or add agents.\nType /save when done or /cancel to discard changes.`,
                                  );
                                  return;
                                }

                                // Auto-save driver from decompose suggestion
                                setProcessingAction("Adding driver...");

                                try {
                                  const driverType =
                                    driverData.type || "continuous";
                                  const newDriver: any = {
                                    id: idGenerators.driver(),
                                    name: driverData.name,
                                    type: driverType,
                                    agents: [] as any[],
                                    evidence: [],
                                    createdAt: new Date().toISOString(),
                                    version: { major: 1, minor: 0 },
                                    versionHistory: [],
                                  };

                                  // Add type-specific fields
                                  if (driverType === "binary") {
                                    newDriver.probability =
                                      driverData.probability || 0.5;
                                  } else {
                                    newDriver.distribution =
                                      driverData.distribution || "triangular";
                                    newDriver.p5 = driverData.p5 || 30;
                                    newDriver.p50 = driverData.p50 || 50;
                                    newDriver.p95 = driverData.p95 || 70;
                                    newDriver.direction =
                                      driverData.direction || "increases";
                                  }

                                  // Add driver to forecast
                                  const updatedForecast = {
                                    ...activeForecast,
                                    drivers: [
                                      ...(activeForecast.drivers || []),
                                      newDriver,
                                    ],
                                    updatedAt: new Date().toISOString(),
                                  };

                                  setActiveForecast(updatedForecast);
                                  // Update savedForecasts so driver appears in /list
                                  setSavedForecasts((prev) =>
                                    prev.map((f) =>
                                      f.id === activeForecast.id
                                        ? updatedForecast
                                        : f,
                                    ),
                                  );
                                  await saveForecast(updatedForecast);

                                  // Enter config mode immediately
                                  // Auto-fix: ensure binary drivers have probability set
                                  if (
                                    newDriver.type === "binary" &&
                                    newDriver.probability == null
                                  ) {
                                    newDriver.probability = 0.5;
                                  }
                                  setDriverBeingConfigured(newDriver);
                                  setCommandInput("");

                                  // Show success toast
                                  showToast(
                                    `✓ Driver added: ${newDriver.name}`,
                                  );

                                  // Show config guidance
                                  setError(
                                    `✓ Driver saved with AI defaults!\n\nNext steps (optional):\n• Attach research agent: @research_analyst\n• Adjust values: /p 20 50 80\n• Add evidence: /evidence\n\nType /save when done or /cancel to exit.`,
                                  );
                                } catch (err) {
                                  console.error(
                                    "[Auto-save driver] Failed:",
                                    err,
                                  );
                                  setError(
                                    "Failed to save driver. Please try again.",
                                  );
                                } finally {
                                  setProcessingAction("");
                                }
                              } else {
                                // Normal chip behavior
                                setFermiChatInput(commandText);
                                // Always use processSingleCommand for commands and @agent mentions
                                if (
                                  commandText.startsWith("/") ||
                                  commandText.startsWith("@")
                                ) {
                                  await processSingleCommand(commandText);
                                } else {
                                  await handleFermiCoaching(commandText);
                                }
                              }
                            }}
                          >
                            <Text style={styles.suggestionChipText}>
                              {commandText}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  <Text style={styles.fermiMessageTime}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              );
            });
          })()}

          {/* Welcome message when no conversation */}
          {!activeForecast?.fermiConversation?.length &&
            !globalFermiConversation.length && (
              <View style={styles.fermiWelcome}>
                <Text style={styles.fermiWelcomeText}>🦊 fermi@uffp ~ $</Text>
                <Text style={styles.fermiWelcomeSubtext}>
                  Type /question to start a forecast{"\n"}
                  Type /commands to see all commands{"\n"}
                  Type @fermi for AI coaching
                </Text>
              </View>
            )}

          {/* Thinking Indicator */}
          {fermiThinking && (
            <View style={styles.fermiThinkingContainer}>
              <ActivityIndicator size="small" color="#fabd2f" />
              <Text style={styles.fermiThinkingText}>Fermi is thinking...</Text>
            </View>
          )}
        </ScrollView>

        {/* Terminal-style Autocomplete - Show above input when typing */}
        {fermiChatInput.length > 0 && getFermiCommandHints().length > 0 && (
          <View style={styles.fermiAutocompleteList}>
            {getFermiCommandHints()
              .slice(0, 8)
              .map((hint, idx) => (
                <TouchableOpacity
                  key={hint.key}
                  style={styles.fermiAutocompleteItem}
                  onPress={async () => {
                    // Auto-execute commands that don't need arguments
                    const noArgCommands = [
                      "review",
                      "decompose",
                      "save",
                      "cancel",
                      "commands",
                      "help",
                      "list",
                      "simulate",
                    ];

                    if (noArgCommands.includes(hint.key)) {
                      // Execute immediately
                      setFermiChatInput("");
                      if (hint.label.startsWith("/")) {
                        await processSingleCommand(hint.label);
                      } else {
                        await handleFermiCoaching(hint.label);
                      }
                    } else if (hint.label.startsWith("@")) {
                      // For @ mentions, replace and let user continue typing
                      if (fermiChatInput.includes("@")) {
                        const atIndex = fermiChatInput.lastIndexOf("@");
                        setFermiChatInput(
                          fermiChatInput.substring(0, atIndex) +
                            hint.label +
                            " ",
                        );
                      } else {
                        setFermiChatInput(hint.label + " ");
                      }
                    } else {
                      // For commands needing args, just autocomplete
                      setFermiChatInput(hint.label + " ");
                    }
                  }}
                >
                  <Text style={styles.fermiAutocompleteNumber}>{idx + 1}</Text>
                  <Text style={styles.fermiAutocompleteLabel}>
                    {hint.label}
                  </Text>
                  {hint.desc && (
                    <Text style={styles.fermiAutocompleteDesc}>
                      {hint.desc}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* Chat Input */}
        <View style={styles.fermiChatInputContainer}>
          <TextInput
            style={styles.fermiChatInput}
            placeholder="Type /commands for reference or @fermi for help..."
            placeholderTextColor="#665c54"
            value={fermiChatInput}
            onChangeText={setFermiChatInput}
            editable={!fermiThinking}
            multiline={true}
            numberOfLines={3}
            textAlignVertical="top"
            onSubmitEditing={async () => {
              if (fermiChatInput.trim()) {
                console.log("[Fermi Chat] Sending message:", fermiChatInput);
                const userMsg = fermiChatInput.trim();
                setFermiChatInput("");

                // Commands and @ mentions go through main handler, other text goes to coaching
                if (userMsg.startsWith("/") || userMsg.startsWith("@")) {
                  await processSingleCommand(userMsg);
                } else {
                  await handleFermiCoaching(userMsg);
                }
              }
            }}
            onKeyPress={async (e) => {
              // Handle Enter key explicitly for web
              if (e.nativeEvent.key === "Enter" && !e.nativeEvent.shiftKey) {
                e.preventDefault();
                if (fermiChatInput.trim()) {
                  console.log(
                    "[Fermi Chat] Enter pressed, sending:",
                    fermiChatInput,
                  );
                  const userMsg = fermiChatInput.trim();
                  setFermiChatInput("");

                  // Commands and @ mentions go through main handler, other text goes to coaching
                  if (userMsg.startsWith("/") || userMsg.startsWith("@")) {
                    await processSingleCommand(userMsg);
                  } else {
                    await handleFermiCoaching(userMsg);
                  }
                }
              }
            }}
            autoCapitalize="none"
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.fermiSendButton,
              fermiThinking && styles.fermiSendButtonDisabled,
            ]}
            onPress={async () => {
              if (fermiChatInput.trim() && !fermiThinking) {
                console.log(
                  "[Fermi Chat] Send button pressed:",
                  fermiChatInput,
                );
                const userMsg = fermiChatInput.trim();
                setFermiChatInput("");

                // Commands and @ mentions go through main handler, other text goes to coaching
                if (userMsg.startsWith("/") || userMsg.startsWith("@")) {
                  await processSingleCommand(userMsg);
                } else {
                  await handleFermiCoaching(userMsg);
                }
              }
            }}
            disabled={fermiThinking}
          >
            <Text style={styles.fermiSendButtonText}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Toast Notification */}
      {toast && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
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
  scrollViewWithChat: {
    marginLeft: "35%",
    minWidth: 400,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Space for command input
  },
  questionDisplay: {
    marginBottom: 24,
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  questionText: {
    fontSize: 28,
    fontWeight: "400",
    color: "#ebdbb2",
    lineHeight: 38,
    flex: 1,
    marginRight: 12,
  },
  forecastVersionBadge: {
    backgroundColor: "#3c3836",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#504945",
    marginTop: 4,
  },
  forecastVersionText: {
    fontSize: 12,
    color: "#fabd2f",
    fontWeight: "700",
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
  baseRateDisplay: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#282828",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#504945",
  },
  baseRateValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#b8bb26",
    textAlign: "center",
  },
  baseRateLabel: {
    fontSize: 12,
    color: "#a89984",
    textAlign: "center",
    marginTop: 4,
  },
  baseRateConfidence: {
    fontSize: 11,
    color: "#83a598",
    textAlign: "center",
    marginTop: 8,
  },
  baseRateSource: {
    fontSize: 11,
    color: "#a89984",
    textAlign: "center",
    marginTop: 4,
    fontStyle: "italic",
  },
  baseRateReasoning: {
    fontSize: 13,
    color: "#d5c4a1",
    lineHeight: 20,
    marginTop: 12,
  },
  overrideButton: {
    marginTop: 12,
    backgroundColor: "#3c3836",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#504945",
    alignItems: "center",
  },
  overrideButtonText: {
    fontSize: 12,
    color: "#83a598",
    fontWeight: "600",
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
  offlineBanner: {
    backgroundColor: "#d65d0e",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#fe8019",
  },
  offlineBannerText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ebdbb2",
    marginBottom: 4,
  },
  offlineBannerSubtext: {
    fontSize: 13,
    color: "#d5c4a1",
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
  agentQuery: {
    fontSize: 12,
    color: "#d5c4a1",
    marginBottom: 3,
    fontStyle: "italic",
  },
  agentSchedule: {
    fontSize: 11,
    color: "#bdae93",
  },
  driverContextCard: {
    backgroundColor: "#32302f",
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#83a598",
  },
  driverContextLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#928374",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  driverContextName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#83a598",
    marginBottom: 4,
  },
  driverContextDesc: {
    fontSize: 11,
    color: "#a89984",
    fontStyle: "italic",
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
  driverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  versionBadge: {
    backgroundColor: "#504945",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  versionText: {
    fontSize: 10,
    color: "#928374",
    fontWeight: "600",
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
    backgroundColor: "#32302f",
    padding: 10,
    borderRadius: 6,
  },
  evidenceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  evidenceSource: {
    fontSize: 10,
    color: "#928374",
  },
  expandIndicator: {
    fontSize: 10,
    color: "#fabd2f",
  },
  evidenceSummary: {
    fontSize: 12,
    color: "#ebdbb2",
    lineHeight: 16,
  },
  fullResultSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#504945",
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  fullResultLabel: {
    fontSize: 11,
    color: "#83a598",
    fontWeight: "600",
  },
  exportButton: {
    backgroundColor: "#458588",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  exportButtonText: {
    fontSize: 10,
    color: "#ebdbb2",
    fontWeight: "600",
  },
  fullResultText: {
    fontSize: 12,
    color: "#d5c4a1",
    lineHeight: 18,
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
  commandSectionWithChat: {
    marginLeft: "35%",
    minWidth: 400,
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
    maxHeight: 300,
  },
  hintItem: {
    padding: 8, // Reduced from 12
    borderBottomWidth: 1,
    borderBottomColor: "#504945",
  },
  hintItemTabSelected: {
    backgroundColor: "#504945",
    borderLeftWidth: 3,
    borderLeftColor: "#fabd2f",
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
  // @fermi Chat Pane Styles
  fermiChatPane: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "35%",
    minWidth: 350,
    maxWidth: 500,
    backgroundColor: "#1d2021",
    borderRightWidth: 2,
    borderRightColor: "#fabd2f",
    flexDirection: "column",
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
    ...(Platform.OS === "web" && {
      height: "100vh",
    }),
  },
  fermiChatPaneMobile: {
    position: "relative",
    left: "auto",
    right: "auto",
    top: "auto",
    bottom: "auto",
    width: "100%",
    height: "auto",
    minWidth: "auto",
    maxWidth: "none",
    borderRightWidth: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 2,
    borderBottomColor: "#3c3836",
    shadowOffset: { width: 0, height: 2 },
    flex: 1,
  },
  fermiChatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#282828",
    borderBottomWidth: 1,
    borderBottomColor: "#3c3836",
  },
  fermiChatTitle: {
    color: "#ebdbb2",
    fontSize: 14,
    fontWeight: "normal",
    fontFamily:
      Platform.OS === "ios"
        ? "Menlo"
        : Platform.OS === "android"
          ? "monospace"
          : "Courier New, monospace",
  },
  fermiMinimizeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fermiMinimizeText: {
    color: "#928374",
    fontSize: 14,
  },
  fermiChatHistory: {
    flex: 1,
    padding: Platform.OS === "web" ? 8 : 6,
    maxHeight: "70%",
  },
  fermiChatHistoryContent: {
    paddingBottom: 4,
  },
  fermiMessage: {
    marginBottom: Platform.OS === "web" ? 12 : 8,
    padding: Platform.OS === "web" ? 10 : 8,
    borderRadius: 6,
  },
  fermiMessageUser: {
    backgroundColor: "#3c3836",
    alignSelf: "flex-end",
    maxWidth: "80%",
  },
  fermiMessageFermi: {
    backgroundColor: "#282828",
    borderLeftWidth: 3,
    borderLeftColor: "#fabd2f",
    alignSelf: "flex-start",
    maxWidth: "80%",
  },
  fermiMessageRole: {
    color: "#fabd2f",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
  },
  fermiMessageText: {
    color: "#ebdbb2",
    fontSize: Platform.OS === "web" ? 13 : 12,
    lineHeight: Platform.OS === "web" ? 18 : 16,
    fontFamily:
      Platform.OS === "ios"
        ? "Menlo"
        : Platform.OS === "android"
          ? "monospace"
          : "Courier New, monospace",
  },
  fermiMessageTime: {
    color: "#665c54",
    fontSize: 10,
    marginTop: 4,
  },
  fermiWelcome: {
    padding: 16,
    alignItems: "flex-start",
  },
  fermiWelcomeText: {
    color: "#b8bb26",
    fontSize: 14,
    fontWeight: "normal",
    marginBottom: 12,
    fontFamily:
      Platform.OS === "ios"
        ? "Menlo"
        : Platform.OS === "android"
          ? "monospace"
          : "Courier New, monospace",
  },
  fermiWelcomeSubtext: {
    color: "#928374",
    fontSize: 13,
    lineHeight: 20,
    fontFamily:
      Platform.OS === "ios"
        ? "Menlo"
        : Platform.OS === "android"
          ? "monospace"
          : "Courier New, monospace",
  },
  fermiAutocompleteList: {
    backgroundColor: "#1d2021",
    borderTopWidth: 1,
    borderTopColor: "#3c3836",
    maxHeight: 200,
  },
  fermiAutocompleteItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#3c3836",
  },
  fermiAutocompleteNumber: {
    color: "#928374",
    fontSize: 10,
    fontFamily:
      Platform.OS === "ios"
        ? "Menlo"
        : Platform.OS === "android"
          ? "monospace"
          : "Courier New, monospace",
    width: 20,
  },
  fermiAutocompleteLabel: {
    color: "#fabd2f",
    fontSize: 11,
    fontFamily:
      Platform.OS === "ios"
        ? "Menlo"
        : Platform.OS === "android"
          ? "monospace"
          : "Courier New, monospace",
    minWidth: 120,
  },
  fermiAutocompleteDesc: {
    color: "#928374",
    fontSize: 10,
    fontFamily:
      Platform.OS === "ios"
        ? "Menlo"
        : Platform.OS === "android"
          ? "monospace"
          : "Courier New, monospace",
    flex: 1,
  },
  fermiChatInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#665c54",
    padding: 12,
    paddingBottom: 12,
    backgroundColor: "#1d2021",
    minHeight: 80,
  },
  fermiChatInput: {
    flex: 1,
    backgroundColor: "#3c3836",
    color: "#ebdbb2",
    padding: Platform.OS === "web" ? 12 : 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#665c54",
    fontSize: Platform.OS === "web" ? 14 : 13,
    maxHeight: Platform.OS === "web" ? 120 : 100,
    marginRight: 6,
    minHeight: Platform.OS === "web" ? 60 : 44,
    fontFamily:
      Platform.OS === "ios"
        ? "Menlo"
        : Platform.OS === "android"
          ? "monospace"
          : "Courier New, monospace",
  },
  fermiSendButton: {
    backgroundColor: "#504945",
    paddingHorizontal: Platform.OS === "web" ? 18 : 12,
    paddingVertical: Platform.OS === "web" ? 18 : 12,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    minHeight: Platform.OS === "web" ? 60 : 44,
    minWidth: Platform.OS === "web" ? 60 : 44,
  },
  fermiSendButtonDisabled: {
    backgroundColor: "#665c54",
    opacity: 0.5,
  },
  fermiSendButtonText: {
    color: "#282828",
    fontSize: 22,
    fontWeight: "bold",
    lineHeight: 22,
  },
  fermiThinkingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#282828",
    borderRadius: 8,
    marginTop: 12,
    marginHorizontal: 12,
  },
  fermiThinkingText: {
    color: "#fabd2f",
    fontSize: 14,
    fontStyle: "italic",
  },
  suggestionChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  suggestionChip: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#665c54",
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  suggestionChipText: {
    color: "#fabd2f",
    fontSize: 10,
    fontFamily:
      Platform.OS === "ios"
        ? "Menlo"
        : Platform.OS === "android"
          ? "monospace"
          : "Courier New, monospace",
  },
  fermiCollapsedTab: {
    position: "absolute",
    left: 0,
    top: "50%",
    marginTop: -20,
    backgroundColor: "#3c3836",
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#665c54",
    elevation: 2,
    zIndex: 999,
    minWidth: 24,
    height: 40,
  },
  fermiCollapsedTabMobile: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 80,
    marginTop: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 0,
    shadowOffset: { width: 0, height: -2 },
    minWidth: 0,
    height: "auto",
  },
  fermiCollapsedText: {
    color: "#d5c4a1",
    fontSize: 12,
    fontWeight: "normal",
  },
  fermiCollapsedTextMobile: {
    transform: [],
    fontSize: 16,
    textAlign: "center",
  },
  toastContainer: {
    position: "absolute",
    bottom: 100,
    left: "50%",
    transform: [{ translateX: -150 }],
    backgroundColor: "#427b58",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 300,
    maxWidth: 500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999,
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
});
