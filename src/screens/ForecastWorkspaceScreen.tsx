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
import {
  executeCommand,
  type CommandContext,
  type CommandSuggestion,
} from "../services/fermiCommands";

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
  const [fermiChatExpanded, setFermiChatExpanded] = useState(true); // Always start expanded
  const [fermiChatCollapsed, setFermiChatCollapsed] = useState(false);
  const [fermiChatInput, setFermiChatInput] = useState("");
  const [fermiThinking, setFermiThinking] = useState(false);
  const [globalFermiConversation, setGlobalFermiConversation] = useState<
    Array<{ timestamp: string; role: string; message: string }>
  >([]);
  const inputRef = useRef<TextInput>(null);
  const chatScrollRef = useRef<ScrollView>(null);

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

      if (result.fromBackend && result.forecasts.length > 0) {
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
        id: Date.now().toString(),
        name: suggestedDriver,
        type: recommendation.type,
        direction: recommendation.direction,
        agents: [] as any[],
        createdAt: new Date().toISOString(),
        aiRecommendation: recommendation, // Store for reference
        version: { major: 1, minor: 0 },
        versionHistory: [],
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

      // Show AI recommendation + Fermi hint
      const { getFermiHints } = await import("../services/fermiHints");
      const fermiHint = getFermiHints(suggestedDriver);

      let message = `✓ AI configured as ${recommendation.type} ${recommendation.distribution || ""}. ${recommendation.reasoning}`;

      if (fermiHint) {
        message += `\n\n🦊 Fermi Tip: Type /fermi for decomposition hints and calibration anchors`;
      }

      setError(message);
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
        version: { major: 1, minor: 0 },
        versionHistory: [],
      };

      setDriverBeingConfigured(newDriver);
      setCommandInput("");
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
          const context: any = {
            forecastId: activeForecast?.id,
            stage: driverBeingConfigured
              ? "driver_config"
              : agentBeingConfigured
                ? "agent_config"
                : activeForecast?.probability !== undefined
                  ? "simulation_results"
                  : activeForecast
                    ? "active_forecast"
                    : "no_forecast",
          };

          // Add forecast details if available
          if (activeForecast) {
            context.question = activeForecast.question;
            context.drivers = activeForecast.drivers;
            context.probability = activeForecast.probability;
            context.conversationHistory =
              activeForecast.fermiConversation || [];
          }

          // Add driver context if configuring
          if (driverBeingConfigured) {
            context.currentDriver = driverBeingConfigured;
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
          const suggestions: CommandSuggestion[] = response.suggestions || [];

          await addFermiMessage(
            queryText,
            response.message || response.response,
            suggestions,
          );
          return;
        } catch (error) {
          console.error("[Fermi AI] Failed to get AI response:", error);
          // Fall through to static guidance
        }
      }

      // Get ontology service for fallback
      const ontology = getOntologyService();

      // Observe this interaction for pattern learning
      try {
        ontology.observe({
          type: "invoke",
          entity: "USER",
          target: "FERMI",
          context: userQuery || "general_help",
        });
      } catch (obsErr) {
        console.log("[Fermi] Ontology observe skipped:", obsErr);
      }

      // queryText already defined at top of function

      // Check if this is a command (starts with /)
      if (queryText.startsWith("/")) {
        const context = getCurrentContext();
        const state = {
          activeForecast,
          driverBeingConfigured,
          agentBeingConfigured,
          drivers: activeForecast?.drivers || [],
        };

        const result = await executeCommand(queryText, context, state);

        // Handle state updates from command
        if (result.updateState) {
          if (result.updateState.question) {
            setActiveQuestion(result.updateState.question);
            // Auto-execute /question command
            await processSingleCommand(
              `/question ${result.updateState.question}`,
            );
          }
          if (result.updateState.configureDriver) {
            await processSingleCommand(
              `/driver ${result.updateState.configureDriver}`,
            );
          }
          if (result.updateState.runSimulation) {
            await processSingleCommand("/simulate");
          }
          if (result.updateState.showList !== undefined) {
            setShowForecastList(result.updateState.showList);
          }
          if (result.updateState.save) {
            // Check if we're saving an agent or a driver
            if (agentBeingConfigured) {
              await saveConfiguredAgent();
            } else {
              await saveConfiguredDriver();
            }
          }
          if (result.updateState.cancel) {
            if (agentBeingConfigured) setAgentBeingConfigured(null);
            if (driverBeingConfigured) setDriverBeingConfigured(null);
          }
          if (result.updateState.p5 !== undefined) {
            setDriverBeingConfigured((prev) =>
              prev ? { ...prev, p5: result.updateState.p5 } : null,
            );
          }
          if (result.updateState.p50 !== undefined) {
            setDriverBeingConfigured((prev) =>
              prev ? { ...prev, p50: result.updateState.p50 } : null,
            );
          }
          if (result.updateState.p95 !== undefined) {
            setDriverBeingConfigured((prev) =>
              prev ? { ...prev, p95: result.updateState.p95 } : null,
            );
          }
          if (result.updateState.distribution) {
            setDriverBeingConfigured((prev) =>
              prev
                ? { ...prev, distribution: result.updateState.distribution }
                : null,
            );
          }
          if (result.updateState.direction) {
            setDriverBeingConfigured((prev) =>
              prev
                ? { ...prev, direction: result.updateState.direction }
                : null,
            );
          }

          // Handle agent configuration
          if (result.updateState.configureAgent) {
            setAgentBeingConfigured({
              name: result.updateState.configureAgent,
            });
          }
          if (result.updateState.query) {
            setAgentBeingConfigured((prev) =>
              prev ? { ...prev, query: result.updateState.query } : null,
            );
          }
          if (result.updateState.schedule) {
            setAgentBeingConfigured((prev) =>
              prev ? { ...prev, schedule: result.updateState.schedule } : null,
            );
          }
          if (result.updateState.runAgent) {
            // Execute agent research immediately
            if (agentBeingConfigured && driverBeingConfigured) {
              await runAgentDuringConfiguration();
            }
          }
        }

        // Add to fermi conversation with suggestions
        await addFermiMessage(queryText, result.message, result.suggestions);
        return;
      }

      // Determine context and provide appropriate coaching
      let guidance = "";
      const suggestions: CommandSuggestion[] = [];

      // If in agent config mode, provide agent-specific help
      if (agentBeingConfigured) {
        guidance = `🦊 @fermi — Agent Configuration Help\n\n`;
        guidance += `📋 Configuring: @${agentBeingConfigured.name}\n\n`;

        if (!agentBeingConfigured.query) {
          guidance += `❗ Missing: Research query (required)\n`;
          guidance += `Use: /query <your research question>\n\n`;
          guidance += `Example: /query What is the market size for electric vehicles in 2025?\n`;
        } else {
          guidance += `✓ Query set: ${agentBeingConfigured.query}\n\n`;
        }

        if (!agentBeingConfigured.schedule) {
          guidance += `Schedule: /schedule daily|weekly|on-demand\n`;
        } else {
          guidance += `✓ Schedule: ${agentBeingConfigured.schedule}\n`;
        }

        guidance += `\n💡 Commands:\n`;
        guidance += `• /query <question> - Set what to research\n`;
        guidance += `• /schedule <frequency> - Set update frequency\n`;
        guidance += `• /save - Save agent to driver\n`;
        guidance += `• /cancel - Cancel agent config\n`;

        await addFermiMessage(userQuery || "@fermi", guidance);
        return;
      }

      // Check if user is asking about a specific concept
      if (userQuery && userQuery.length > 0) {
        const conceptMatch = ontology.explainConcept(userQuery);
        if (conceptMatch) {
          guidance = `🦊 @fermi — Concept Explanation\n\n`;
          guidance += `📖 ${userQuery}:\n\n`;
          guidance += conceptMatch;
          guidance += `\n\n💬 Ask me about other concepts or type /commands for commands!`;
          await addFermiMessage(queryText, guidance);
          return;
        }

        // Search for related concepts
        const searchResults = ontology.searchConcepts(userQuery);
        if (searchResults.length > 0 && searchResults.length <= 3) {
          guidance = `🦊 @fermi — Found ${searchResults.length} related concept(s)\n\n`;
          for (const result of searchResults) {
            guidance += `📖 ${result.concept}:\n${result.explanation}\n\n`;
          }
          await addFermiMessage(queryText, guidance);
          return;
        }
      }

      if (driverBeingConfigured) {
        // Context: Configuring a driver
        guidance = generateFermiGuidance(
          driverBeingConfigured.name,
          driverBeingConfigured.type,
          driverBeingConfigured,
        );

        // Add context-specific suggestions
        suggestions.push(
          { key: "p", label: "/p ", description: "Set p5/p50/p95 values" },
          { key: "dist", label: "/dist ", description: "Set distribution" },
          {
            key: "direction",
            label: "/direction ",
            description: "Set direction",
          },
          { key: "save", label: "/save", description: "Save driver" },
        );
      } else if (activeForecast && activeForecast.probability !== undefined) {
        // Context: Looking at forecast results
        guidance = `🦊 @fermi — Simulation Results Coach\n\n`;
        guidance += `📊 Your Forecast: ${activeForecast.probability}%\n\n`;
        guidance += `🎯 What This Means:\n`;
        guidance += `• This is the probability the outcome happens\n`;
        guidance += `• Based on ${activeForecast.drivers?.length || 0} drivers with uncertainty ranges\n`;
        guidance += `• Monte Carlo simulation: ${activeForecast.iterations || 10000} scenarios tested\n\n`;

        if (activeForecast.probability < 10) {
          guidance += `📉 Very Unlikely (<10%): Consider if you're missing positive drivers or being too pessimistic\n`;
        } else if (activeForecast.probability < 30) {
          guidance += `📉 Unlikely (10-30%): Possible but factors lean against it\n`;
        } else if (activeForecast.probability < 70) {
          guidance += `⚖️ Uncertain (30-70%): Could go either way - good epistemic humility!\n`;
        } else if (activeForecast.probability < 90) {
          guidance += `📈 Likely (70-90%): Factors lean toward this outcome\n`;
        } else {
          guidance += `📈 Very Likely (>90%): Consider if you're overconfident or missing negative drivers\n`;
        }

        guidance += `\n🦊 Next Steps:\n`;
        guidance += `• Review your drivers - any missing?\n`;
        guidance += `• Check uncertainty ranges - are they realistic?\n`;
        guidance += `• Consider running research agents for more evidence\n`;
        guidance += `• Track this forecast and update as new info comes in\n`;

        if (activeForecast.brierScore !== undefined) {
          guidance += `\n🎯 Your Brier Score: ${activeForecast.brierScore.toFixed(3)}\n`;
          guidance += `• 0.00 = perfect (predicted exactly right)\n`;
          guidance += `• 0.25 = coin flip (no better than guessing)\n`;
          guidance += `• Lower is better!\n`;
          if (activeForecast.brierScore < 0.1) {
            guidance += `• Excellent! You're well-calibrated\n`;
          } else if (activeForecast.brierScore < 0.2) {
            guidance += `• Good! Better than average forecaster\n`;
          } else {
            guidance += `• Room to improve - review what you got wrong\n`;
          }
        }

        // Add suggestions for results view
        suggestions.push(
          {
            key: "driver",
            label: "/driver ",
            description: "Add another driver",
          },
          { key: "list", label: "/list", description: "View all forecasts" },
        );
      } else if (activeForecast) {
        // Context: Have a forecast but no results yet
        guidance = `🦊 @fermi — Getting Started\n\n`;
        guidance += `📋 Your Question: ${activeForecast.question}\n\n`;
        guidance += `🎯 Next Steps:\n`;
        if (!activeForecast.drivers || activeForecast.drivers.length === 0) {
          guidance += `1. Add drivers - what factors influence this outcome?\n`;
          guidance += `2. Configure each driver with realistic ranges\n`;
          guidance += `3. Set direction (increases/decreases likelihood)\n`;
          guidance += `4. Run simulation to see probability\n\n`;
          guidance += `🦊 Tip: Start with 2-4 key drivers. You can always add more!\n`;

          suggestions.push({
            key: "driver",
            label: "/driver ",
            description: "Add first driver",
          });
        } else {
          guidance += `1. You have ${activeForecast.drivers.length} driver(s) - need more?\n`;
          guidance += `2. Review driver configurations - are ranges realistic?\n`;
          guidance += `3. Consider adding research agents for evidence\n`;
          guidance += `4. Ready to simulate? Type /simulate\n`;

          suggestions.push(
            {
              key: "simulate",
              label: "/simulate",
              description: "Run simulation",
            },
            {
              key: "driver",
              label: "/driver ",
              description: "Add another driver",
            },
          );
        }
      } else {
        // Context: No active forecast
        guidance = `🦊 @fermi — Universal Coach\n\n`;
        guidance += `👋 I'm Fermi, your forecasting coach!\n\n`;
        guidance += `I can help you:\n`;
        guidance += `• Understand driver types and distributions\n`;
        guidance += `• Set realistic p5/p50/p95 values\n`;
        guidance += `• Interpret simulation results\n`;
        guidance += `• Improve your calibration with Brier scores\n`;
        guidance += `• Suggest query+agent combinations for research\n\n`;
        guidance += `🚀 Get Started:\n`;
        guidance += `• Type /question to start a new forecast\n`;
        guidance += `• Type /list to see your forecasts\n`;
        guidance += `• Mention me (@fermi) anytime for help!\n`;

        suggestions.push(
          {
            key: "question",
            label: "/question ",
            description: "Start new forecast",
          },
          { key: "list", label: "/list", description: "View forecasts" },
          {
            key: "commands",
            label: "/commands",
            description: "Show all commands",
          },
        );
      }

      // Add to conversation with suggestions
      await addFermiMessage(queryText, guidance, suggestions);
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

    // Create agent object
    const newAgent = {
      id: Date.now().toString(),
      name: agentBeingConfigured.name,
      query: agentBeingConfigured.query,
      schedule: agentBeingConfigured.schedule || "on-demand",
      threshold: agentBeingConfigured.threshold,
      createdAt: new Date().toISOString(),
    };

    // Add agent to the current driver
    const updatedDriver = {
      ...driverBeingConfigured,
      agents: [...(driverBeingConfigured.agents || []), newAgent],
    };

    setDriverBeingConfigured(updatedDriver);
    setAgentBeingConfigured(null);

    // Show success message
    setError(
      `✓ Agent @${newAgent.name} added to driver "${updatedDriver.name}"`,
    );
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
          `probability: ${driverBeingConfigured.probability}%`,
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
      if (
        isNewDriver &&
        activeForecast.id &&
        !activeForecast.id.startsWith("local-")
      ) {
        // Add new driver to backend
        const { addDriverWithSync } = await import("../utils/backendSync");
        const result = await addDriverWithSync(activeForecast.id, {
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
          // Update from backend response - no need to save locally
          setActiveForecast(result.forecast);
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
    // GLOBAL COMMANDS - work in any context

    // /commands - always available, context-aware command reference
    if (trimmed === "/commands" || trimmed === "/-h") {
      const { getAvailableCommands } =
        await import("../services/fermiCommands");
      const commandContext = getCurrentContext();
      const availableCommands = getAvailableCommands(commandContext);

      // Group by category
      const byCategory: Record<string, typeof availableCommands> = {};
      availableCommands.forEach((cmd) => {
        if (!byCategory[cmd.category]) byCategory[cmd.category] = [];
        byCategory[cmd.category].push(cmd);
      });

      // Build rich help text
      let helpText = `📚 Available Commands (${commandContext})\n\n`;
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
          helpText += `  ${cmd.syntax}\n  → ${cmd.description}\n\n`;
        });
      }

      helpText += `💡 Tip: Type command + space to see autocomplete\n`;

      // Create clickable suggestions for most common commands
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

      // Create clickable chips for popular agents
      const agentSuggestions: CommandSuggestion[] = agentList
        .slice(0, 6)
        .map((agent) => ({
          key: agent.name,
          label: `@${agent.name}`,
          description: agent.description,
        }));

      await addFermiMessage("/agent-list", agentsText, agentSuggestions);
      setCommandInput("");
      return;
    }

    // /cancel - exit any config mode
    if (trimmed === "/cancel") {
      if (agentBeingConfigured) {
        setAgentBeingConfigured(null);
        await addFermiMessage("/cancel", "✓ Agent configuration cancelled");
      } else if (driverBeingConfigured) {
        setDriverBeingConfigured(null);
        await addFermiMessage("/cancel", "✓ Driver configuration cancelled");
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
          `✓ Agent @${agentConfig.name} added to driver "${driverBeingConfigured.name}"!\n\nYou can:\n• Add more agents with @<agent_name>\n• Save the driver with /save\n• Configure driver parameters`,
          [
            { key: "save-driver", label: "/save", description: "Save driver" },
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

      // Handle @agent mentions - enter agent config mode (only when configuring a driver)
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
        console.log("Agent mention detected in driver config:", agentName);

        // Special handling for @fermi coach agent
        if (agentName === "fermi") {
          console.log("[Fermi] Opening @fermi coach chat pane");
          await handleFermiCoaching();
          setCommandInput("");
          return;
        }

        if (agentName) {
          console.log("Setting agent being configured:", agentName);
          setAgentBeingConfigured({ name: agentName });
          setCommandInput("");
          setError(""); // Clear any errors

          // Provide feedback in CLI
          await addFermiMessage(
            `@${agentName}`,
            `📋 Configuring @${agentName}\n\nWhat should this agent research?\n\nNext: Type /query <your research question>`,
            [
              {
                key: "query",
                label: "/query ",
                description: "Set research query",
              },
              { key: "cancel", label: "/cancel", description: "Cancel" },
            ],
          );
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
            // No need to save locally - backend is source of truth
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

      try {
        // Try agentic API call first
        try {
          const response = await researchService.reviewForecast(
            activeForecast.id || "temp",
            {
              question: activeForecast.question,
              drivers: activeForecast.drivers,
              probability: activeForecast.probability,
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
          console.warn(
            "[Review] API call failed, falling back to local analysis:",
            apiError,
          );
          // Fall through to local fallback
        }

        // Local fallback: Use contextAnalyzer
        const { analyzeContext } = await import("../services/contextAnalyzer");
        const insights = analyzeContext(activeForecast);

        let reviewMessage = `📊 **Forecast Review: ${activeForecast.question}**\n\n`;

        // Summary stats
        reviewMessage += `**Current State:**\n`;
        reviewMessage += `• ${activeForecast.drivers.length} driver(s)\n`;
        const driversWithAgents = activeForecast.drivers.filter(
          (d) => d.agents && d.agents.length > 0,
        ).length;
        reviewMessage += `• ${driversWithAgents} driver(s) with research agents\n`;
        if (activeForecast.probability !== undefined) {
          reviewMessage += `• Current estimate: ${Math.round(activeForecast.probability)}%\n`;
        }
        reviewMessage += `\n`;

        // Show insights by severity
        if (insights.length === 0) {
          reviewMessage += `✅ **Great work!** Your forecast looks well-structured with good coverage and no obvious issues.\n\n`;
          reviewMessage += `Consider running /simulate to get a probability estimate if you haven't already.`;
        } else {
          const critical = insights.filter((i) => i.severity === "critical");
          const warnings = insights.filter((i) => i.severity === "warning");
          const infos = insights.filter((i) => i.severity === "info");

          if (critical.length > 0) {
            reviewMessage += `🔴 **Critical Issues (${critical.length}):**\n`;
            critical.forEach((i) => {
              reviewMessage += `\n**${i.title}**\n${i.description}\n`;
              if (i.suggestedAction)
                reviewMessage += `→ ${i.suggestedAction}\n`;
            });
            reviewMessage += `\n`;
          }

          if (warnings.length > 0) {
            reviewMessage += `⚠️  **Warnings (${warnings.length}):**\n`;
            warnings.forEach((i) => {
              reviewMessage += `\n**${i.title}**\n${i.description}\n`;
              if (i.suggestedAction)
                reviewMessage += `→ ${i.suggestedAction}\n`;
            });
            reviewMessage += `\n`;
          }

          if (infos.length > 0) {
            reviewMessage += `ℹ️  **Suggestions (${infos.length}):**\n`;
            infos.forEach((i) => {
              reviewMessage += `\n**${i.title}**\n${i.description}\n`;
              if (i.suggestedAction)
                reviewMessage += `→ ${i.suggestedAction}\n`;
            });
          }
        }

        // Generate command suggestions from insights
        const suggestions: CommandSuggestion[] = insights
          .filter((i) => i.suggestedCommand)
          .map((i) => ({
            label: i.suggestedCommand!,
            desc: i.title,
          }));

        await addFermiMessage("/review", reviewMessage, suggestions);
      } catch (error) {
        console.error("[Review] Failed:", error);
        await addFermiMessage(
          "/review",
          "❌ Failed to generate review. Please try again.",
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
        // Try agentic API call first
        try {
          const response = await researchService.decomposeForecast(
            activeForecast.question,
            {
              forecastId: activeForecast.id,
              existingDrivers: activeForecast.drivers,
            },
          );

          await addFermiMessage(
            "/decompose",
            response.message || response.decomposition,
          );
          return;
        } catch (apiError) {
          console.warn(
            "[Decompose] API call failed, falling back to local strategies:",
            apiError,
          );
          // Fall through to local fallback
        }

        // Local fallback: Use fermiDecomposition
        const { suggestDecompositions, generateDecompositionTemplate } =
          await import("../services/fermiDecomposition");

        const suggestions = suggestDecompositions(activeForecast.question);

        let decompMessage = `🎯 **Decomposition Strategies for:**\n_"${activeForecast.question}"_\n\n`;
        decompMessage += `Here are ${suggestions.length} recommended approaches to break down this forecast:\n\n`;

        suggestions.forEach((suggestion, i) => {
          decompMessage += `### ${i + 1}. ${suggestion.strategy.name}\n\n`;
          decompMessage += `${suggestion.reasoning}\n\n`;
          decompMessage += `**Key factors to consider:** ${suggestion.applicableFactors.join(", ")}\n\n`;
          decompMessage += `**Approach:**\n`;
          suggestion.strategy.steps.forEach((step, j) => {
            decompMessage += `${j + 1}. ${step}\n`;
          });

          if (suggestion.strategy.example) {
            decompMessage += `\n_Example: ${suggestion.strategy.example}_\n`;
          }

          decompMessage += `\n`;
        });

        decompMessage += `---\n\n`;
        decompMessage += `💡 **Next steps:**\n`;
        decompMessage += `• Pick a strategy that fits your question\n`;
        decompMessage += `• Use /driver to create drivers for each step\n`;
        decompMessage += `• Ask me for help refining any step\n`;

        await addFermiMessage("/decompose", decompMessage);
      } catch (error) {
        console.error("[Decompose] Failed:", error);
        await addFermiMessage(
          "/decompose",
          "❌ Failed to generate decomposition suggestions. Please try again.",
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
          privacy: forecastPrivacy,
          tags: forecastTags,
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
            version: createResult.forecast.version || { major: 1, minor: 0 },
            versionHistory: createResult.forecast.versionHistory || [],
          };

          setActiveForecast(newForecast);

          // Only save to local storage if backend failed
          if (!createResult.fromBackend) {
            await saveForecast(newForecast);
            console.log("Created forecast locally (backend unavailable)");
          } else {
            console.log(`Created forecast ${newForecast.id} on backend`);
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
        { key: "decompose", label: "/decompose", desc: "Break down the question" },
      );
    }

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
      return [
        { key: "question", label: "/question", desc: "Start a new forecast" },
        { key: "commands", label: "/commands", desc: "Show all commands" },
        { key: "list", label: "/list", desc: "View forecasts" },
      ];
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
    ];

    // Only show driver and simulate commands if there's an active forecast
    if (activeForecast) {
      hints.push(
        { key: "driver", label: "/driver", desc: "Add a driver" },
        { key: "simulate", label: "/simulate", desc: "Run simulation" },
        { key: "review", label: "/review", desc: "Analyze forecast quality" },
        { key: "decompose", label: "/decompose", desc: "Break down the question" },
      );
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
                      : `P(${driver.probability}%)`}{" "}
                    · {driver.direction}
                  </Text>
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

              if (
                msg.role === "fermi" &&
                msg.message.includes("__SUGGESTIONS__:")
              ) {
                const parts = msg.message.split("__SUGGESTIONS__:");
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
                              setFermiChatInput(commandText);
                              if (commandText.startsWith("/")) {
                                await processSingleCommand(commandText);
                              } else {
                                await handleFermiCoaching(commandText);
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
});
