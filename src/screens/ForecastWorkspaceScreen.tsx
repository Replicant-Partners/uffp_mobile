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
} from "react-native";
import { researchService } from "../services/researchService";

interface SavedForecast {
  id: string;
  question: string;
  domain?: string;
  timeframe?: string;
  grounding?: "external" | "premortem" | "analysis";
  probability?: number;
  drivers: any[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "@uffp_forecasts";

export default function ForecastWorkspaceScreen() {
  const [commandInput, setCommandInput] = useState("");
  const [activeQuestion, setActiveQuestion] = useState("");
  const [activeForecast, setActiveForecast] = useState<SavedForecast | null>(
    null,
  );
  const [savedForecasts, setSavedForecasts] = useState<SavedForecast[]>([]);
  const [showForecastList, setShowForecastList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [showCommandHints, setShowCommandHints] = useState(true);
  const [processingAction, setProcessingAction] = useState<string>("");
  const [driverBeingConfigured, setDriverBeingConfigured] = useState<
    any | null
  >(null);
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
      // Use localStorage for web, AsyncStorage for native
      const stored =
        Platform.OS === "web"
          ? localStorage.getItem(STORAGE_KEY)
          : await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const forecasts = JSON.parse(stored);
        setSavedForecasts(forecasts);
      }
    } catch (err) {
      console.error("Failed to load forecasts:", err);
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

    // Re-parse the question to get suggested drivers
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
  };

  useEffect(() => {
    // Show/hide command hints based on input
    if (commandInput.startsWith("/")) {
      setShowCommandHints(true);
    } else {
      setShowCommandHints(false);
    }
  }, [commandInput]);

  const startDriverConfiguration = (index: number) => {
    if (!activeForecast || !parsedResult || !parsedResult.suggestedDrivers) {
      return;
    }

    const suggestedDriver = parsedResult.suggestedDrivers[index];
    if (!suggestedDriver) return;

    // Create a new driver in configuration mode
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
  };

  const saveConfiguredDriver = async () => {
    if (!driverBeingConfigured || !activeForecast) return;

    setProcessingAction("Saving driver...");

    // Check if we're editing an existing driver
    const existingIndex = activeForecast.drivers.findIndex(
      (d: any) => d.id === driverBeingConfigured.id,
    );

    let updatedDrivers;
    if (existingIndex >= 0) {
      // Update existing driver
      updatedDrivers = [...activeForecast.drivers];
      updatedDrivers[existingIndex] = driverBeingConfigured;
    } else {
      // Add new driver
      updatedDrivers = [...activeForecast.drivers, driverBeingConfigured];
    }

    const updatedForecast = {
      ...activeForecast,
      drivers: updatedDrivers,
      updatedAt: new Date().toISOString(),
    };

    setActiveForecast(updatedForecast);
    await saveForecast(updatedForecast);
    setDriverBeingConfigured(null);
    setError("");
    setProcessingAction("");
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
        return;
      }

      // /schedule <daily|weekly|on-demand>
      if (trimmed.startsWith("/schedule ")) {
        const schedule = trimmed.replace("/schedule ", "").trim();
        if (["daily", "weekly", "on-demand"].includes(schedule)) {
          setAgentBeingConfigured({ ...agentBeingConfigured, schedule });
          setCommandInput("");
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
        } else {
          setError("Threshold must be a number between 0 and 100");
        }
        return;
      }

      // /save - save agent to driver
      if (trimmed === "/save") {
        if (driverBeingConfigured) {
          const currentAgents = driverBeingConfigured.agents || [];
          const agentConfig = {
            name: agentBeingConfigured.name,
            query: agentBeingConfigured.query,
            schedule: agentBeingConfigured.schedule || "on-demand",
            threshold: agentBeingConfigured.threshold || 10,
          };
          setDriverBeingConfigured({
            ...driverBeingConfigured,
            agents: [...currentAgents, agentConfig],
          });
        }
        setAgentBeingConfigured(null);
        setCommandInput("");
        return;
      }

      // /cancel - cancel agent config
      if (trimmed === "/cancel") {
        setAgentBeingConfigured(null);
        setCommandInput("");
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
            setDriverBeingConfigured({
              ...driverBeingConfigured,
              p5,
              p50,
              p95,
            });
            setCommandInput("");
          } else {
            setError("Values must be numbers");
          }
        } else {
          setError("Format: /p <p5> <p50> <p95>");
        }
        return;
      }

      // /direction <increases|decreases>
      if (trimmed.startsWith("/direction ")) {
        const direction = trimmed.replace("/direction ", "").trim();
        if (direction === "increases" || direction === "decreases") {
          setDriverBeingConfigured({ ...driverBeingConfigured, direction });
          setCommandInput("");
        } else {
          setError("Direction must be 'increases' or 'decreases'");
        }
        return;
      }

      // Handle @agent mentions - enter agent config mode
      if (trimmed.startsWith("@") && !trimmed.includes("/")) {
        const agentName = trimmed.substring(1).trim();
        if (agentName) {
          setAgentBeingConfigured({ name: agentName });
          setCommandInput("");
        }
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

    // Handle /list command
    if (trimmed === "/list") {
      setShowForecastList(!showForecastList);
      setCommandInput("");
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
      if (["external", "premortem", "analysis"].includes(grounding)) {
        const updatedForecast = {
          ...activeForecast,
          grounding: grounding as "external" | "premortem" | "analysis",
          updatedAt: new Date().toISOString(),
        };
        setActiveForecast(updatedForecast);
        await saveForecast(updatedForecast);
        setCommandInput("");
        setError("");
      } else {
        setError("Grounding must be 'external', 'premortem', or 'analysis'");
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

      setCommandInput("");
      setLoading(true);
      setProcessingAction("Creating forecast on backend...");

      try {
        // First create the forecast on the backend
        const forecastData = {
          question: activeForecast.question,
          domain: activeForecast.domain || parsedResult?.domain || "general",
          timeframe:
            activeForecast.timeframe || parsedResult?.timeframe || "unknown",
          resolutionCriteria: `Forecast resolves when: ${activeForecast.question}. Based on ${activeForecast.drivers.length} driver(s).`,
        };

        console.log("Creating forecast with data:", forecastData);
        const createResponse =
          await researchService.createForecast(forecastData);
        console.log("Create response:", createResponse);

        const backendForecastId =
          createResponse.forecast?.id || createResponse.id;
        console.log("Backend forecast ID:", backendForecastId);

        if (!backendForecastId) {
          throw new Error("No forecast ID returned from backend");
        }

        // Add drivers to backend forecast
        setProcessingAction("Adding drivers...");
        for (const driver of activeForecast.drivers) {
          const driverData = {
            name: driver.name,
            description: driver.name,
            direction: driver.direction,
            magnitude: "medium" as const,
          };
          console.log(
            "Adding driver to forecast",
            backendForecastId,
            ":",
            driverData,
          );
          try {
            await researchService.addDriver(backendForecastId, driverData);
          } catch (driverErr: any) {
            console.error("Driver add error:", driverErr);
            // Continue with next driver even if one fails
          }
        }

        // Run simulation
        setProcessingAction("Running Monte Carlo simulation...");
        const simulationResult = await researchService.simulate(
          backendForecastId,
          10000,
        );

        const updatedForecast = {
          ...activeForecast,
          probability: simulationResult.probability,
          updatedAt: new Date().toISOString(),
        };

        setActiveForecast(updatedForecast);
        await saveForecast(updatedForecast);
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

      // Start configuration for custom driver
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
      setCommandInput("");
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
        const result = await researchService.parseQuestion(question);
        console.log("Parse result:", result);
        const parsed = result.parsed || result;

        // Ensure suggestedDrivers exists
        if (!parsed.suggestedDrivers) {
          console.warn("No suggestedDrivers in parse result");
        }

        setParsedResult(parsed);

        setProcessingAction("Saving forecast...");

        // Create and save forecast
        const newForecast: SavedForecast = {
          id: Date.now().toString(),
          question: parsed.question || question,
          domain: parsed.domain,
          timeframe: parsed.timeframe,
          grounding: parsed.grounding || "analysis",
          drivers: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setActiveForecast(newForecast);
        await saveForecast(newForecast);
      } catch (err: any) {
        console.error("Parse error:", err);
        setError(err.message || "Failed to parse question");
      } finally {
        setLoading(false);
        setProcessingAction("");
      }
    }
  };

  const getSuggestion = () => {
    const query = commandInput.toLowerCase().trim();

    // Agent configuration mode suggestions
    if (agentBeingConfigured) {
      if (query === "/query") return "/query ";
      if (query === "/schedule") return "/schedule on-demand";
      if (query === "/schedule d") return "/schedule daily";
      if (query === "/schedule w") return "/schedule weekly";
      if (query === "/schedule o") return "/schedule on-demand";
      if (query === "/threshold") return "/threshold 10";
    }

    // Configuration mode suggestions
    if (driverBeingConfigured) {
      if (query === "/type") return "/type continuous";
      if (query === "/type c") return "/type continuous";
      if (query === "/type b") return "/type binary";

      if (query === "/dist") return "/dist triangular";
      if (query === "/dist t") return "/dist triangular";
      if (query === "/dist n") return "/dist normal";
      if (query === "/dist l") return "/dist lognormal";

      if (query === "/direction") return "/direction increases";
      if (query === "/direction i") return "/direction increases";
      if (query === "/direction d") return "/direction decreases";

      if (query === "/p") return "/p 20 50 80";
      if (query === "/prob") return "/prob 50";

      if (query === "@") return "@web-research";
    }

    // Regular mode suggestions
    if (query === "/grounding") return "/grounding external";
    if (query === "/grounding e") return "/grounding external";
    if (query === "/grounding p") return "/grounding premortem";
    if (query === "/grounding a") return "/grounding analysis";

    if (query === "/question") return "/question ";
    if (query === "/driver") return "/driver ";

    return "";
  };

  const getCommandHints = () => {
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
        { key: "agent", label: "@agent", desc: "Add research agent" },
        { key: "save", label: "/save", desc: "Save driver" },
        { key: "cancel", label: "/cancel", desc: "Cancel" },
      );

      if (!commandInput || !commandInput.startsWith("/")) {
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
          desc: "External data grounding",
        },
        {
          key: "premortem",
          label: "/grounding premortem",
          desc: "Premortem analysis",
        },
        {
          key: "analysis",
          label: "/grounding analysis",
          desc: "Analytical reasoning",
        },
      ].filter((h) => h.label.includes(query));
    }

    const hints = [
      { key: "question", label: "/question", desc: "Start a new forecast" },
      { key: "list", label: "/list", desc: "View all forecasts" },
    ];

    // Only show driver and simulate commands if there's an active forecast
    if (activeForecast) {
      hints.push(
        { key: "driver", label: "/driver", desc: "Add a driver" },
        { key: "grounding", label: "/grounding", desc: "Set grounding type" },
        { key: "simulate", label: "/simulate", desc: "Run simulation" },
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
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Active Question Display */}
        {activeQuestion && (
          <View style={styles.questionDisplay}>
            <Text style={styles.questionText}>{activeQuestion}</Text>
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
                {activeForecast?.probability != null && (
                  <Text style={styles.probabilityResult}>
                    Forecast: {Math.round(activeForecast.probability * 100)}%
                  </Text>
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
            <View style={styles.configCard}>
              <Text style={styles.driverName}>
                {driverBeingConfigured.name}
              </Text>
              <Text style={styles.driverDetails}>
                Type: {driverBeingConfigured.type} ·
                {driverBeingConfigured.type === "continuous" &&
                  ` Dist: ${driverBeingConfigured.distribution} · P(${driverBeingConfigured.p5}-${driverBeingConfigured.p50}-${driverBeingConfigured.p95})`}
                {driverBeingConfigured.type === "binary" &&
                  ` P(${driverBeingConfigured.probability || 50}%)`}{" "}
                · {driverBeingConfigured.direction}
              </Text>
              {driverBeingConfigured.agents &&
                driverBeingConfigured.agents.length > 0 && (
                  <Text style={styles.agentsList}>
                    Agents:{" "}
                    {driverBeingConfigured.agents
                      .map((a: any) => `@${a.name || a}`)
                      .join(", ")}
                  </Text>
                )}
              <Text style={styles.configHint}>
                Use /type, /dist, /p, /direction, @agent to configure, then
                /save
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

        {/* Forecast List */}
        {showForecastList && (
          <View style={styles.forecastList}>
            <Text style={styles.listTitle}>Your Forecasts</Text>
            {savedForecasts.length === 0 ? (
              <Text style={styles.emptyListText}>
                No forecasts yet. Type /question to create one.
              </Text>
            ) : (
              savedForecasts.map((forecast) => (
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
                  <Text style={styles.forecastDate}>
                    {new Date(forecast.updatedAt).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Empty State */}
        {!activeQuestion && !loading && !showForecastList && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Universal Forecasting</Text>
            <Text style={styles.emptySubtitle}>
              Type <Text style={styles.emptyCommand}>/question</Text> to start
              or <Text style={styles.emptyCommand}>/list</Text> to see forecasts
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Command Input - Fixed at bottom */}
      <View style={styles.commandSection}>
        {/* Command Hints */}
        {showCommandHints && getCommandHints().length > 0 && (
          <View style={styles.hintsPanel}>
            {getCommandHints().map((hint) => (
              <TouchableOpacity
                key={hint.key}
                style={styles.hintItem}
                onPress={() => {
                  if (hint.key === "question") {
                    setCommandInput("/question ");
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
              placeholder="Type / for commands"
              placeholderTextColor="#665c54"
              value={commandInput}
              onChangeText={setCommandInput}
              onSubmitEditing={() => {
                // Accept suggestion on enter if it exists
                const suggestion = getSuggestion();
                if (suggestion && commandInput !== suggestion) {
                  setCommandInput(suggestion);
                } else {
                  handleCommandSubmit();
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
  agentsList: {
    fontSize: 12,
    color: "#b8bb26",
    marginTop: 6,
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
  commandSection: {
    backgroundColor: "#282828",
    borderTopWidth: 1,
    borderTopColor: "#3c3836",
  },
  hintsPanel: {
    backgroundColor: "#3c3836",
    borderTopWidth: 1,
    borderTopColor: "#504945",
  },
  hintItem: {
    padding: 12,
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
  listTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#ebdbb2",
    marginBottom: 16,
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
});
