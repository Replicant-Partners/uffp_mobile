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
    // Show hints when: typing /, typing @, or in driver config with empty field
    if (
      commandInput.startsWith("/") ||
      commandInput.startsWith("@") ||
      (driverBeingConfigured && commandInput === "")
    ) {
      setShowCommandHints(true);
    } else {
      setShowCommandHints(false);
    }
  }, [commandInput, driverBeingConfigured]);

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
        }
        setAgentBeingConfigured(null);
        setCommandInput("");
        setError("");
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
          setError("");
        } else {
          setError("Direction must be 'increases' or 'decreases'");
        }
        return;
      }

      // Handle @agent mentions - enter agent config mode
      if (trimmed.startsWith("@") && !trimmed.includes("/")) {
        const agentName = trimmed.substring(1).trim();
        console.log("Agent mention detected:", agentName);
        if (agentName) {
          console.log("Setting agent being configured:", agentName);
          setAgentBeingConfigured({ name: agentName });
          setCommandInput("");
          setError(""); // Clear any errors
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
        console.log("Calling parseQuestion with:", question);
        const result = await researchService.parseQuestion(question);
        console.log("Parse result:", result);
        console.log("Result type:", typeof result);
        console.log("Result keys:", Object.keys(result));

        const parsed = result.parsed || result;
        console.log("Parsed object:", parsed);
        console.log("Suggested drivers:", parsed.suggestedDrivers);

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
      "/s": "/simulate",
      "/si": "/simulate",
      "/sim": "/simulate",
      "/simu": "/simulate",
      "/simul": "/simulate",
      "/simula": "/simulate",
      "/simulat": "/simulate",
    };
    if (regularSuggestions[query]) return regularSuggestions[query];

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
        { key: "save", label: "/save", desc: "Save driver" },
        { key: "cancel", label: "/cancel", desc: "Cancel" },
      );

      // Priority: Show agent directory if starting with @ OR when input is completely empty
      if (commandInput.startsWith("@") || commandInput === "") {
        const agentDescriptions: Record<string, string> = {
          research_analyst: "Deep research with citations, quantitative focus",
          sentiment_monitor: "Social listening and sentiment scoring",
          competitive_intel: "Competitor tracking and benchmarking",
          financial_analyst: "Financial statement analysis and modeling",
          market_researcher: "Market sizing and industry analysis",
          expert_synthesizer: "Synthesize expert opinions and predictions",
        };
        const allAgents = Object.keys(agentDescriptions).map((name) => ({
          key: name,
          label: "@" + name,
          desc: agentDescriptions[name],
        }));

        // Filter by partial match if typing @something
        if (commandInput.startsWith("@") && commandInput.length > 1) {
          const partial = commandInput.substring(1).toLowerCase();
          return allAgents.filter((a) => a.key.startsWith(partial));
        }

        // Show all agents when typing @ alone or when field is empty
        return allAgents;
      }

      // Show driver config hints if not showing agents and not starting with /
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
                Use /type, /dist, /p, /direction to configure. Type @ to add
                research agent. Then /save
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
            <Text style={styles.versionText}>
              v2.1 - Agent Chips & Autocomplete
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
              placeholder="Type / for commands or @ for agents"
              placeholderTextColor="#665c54"
              value={commandInput}
              onChangeText={(text) => {
                setCommandInput(text);
                // Clear error when typing
                if (error) setError("");
              }}
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
