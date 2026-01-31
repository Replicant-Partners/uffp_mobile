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
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Load saved forecasts
    loadForecasts();
    // Focus input on mount
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const loadForecasts = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
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
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save forecast:", err);
    }
  };

  const loadForecast = (forecast: SavedForecast) => {
    setActiveForecast(forecast);
    setActiveQuestion(forecast.question);
    setParsedResult({
      question: forecast.question,
      domain: forecast.domain,
      timeframe: forecast.timeframe,
      suggestedDrivers: [],
    });
    setShowForecastList(false);
    setCommandInput("");
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

    // Handle driver configuration commands
    if (driverBeingConfigured) {
      // /type <continuous|binary>
      if (trimmed.startsWith("/type ")) {
        const type = trimmed.replace("/type ", "").trim();
        if (type === "continuous" || type === "binary") {
          setDriverBeingConfigured({ ...driverBeingConfigured, type });
          setCommandInput("");
        } else {
          setError("Type must be 'continuous' or 'binary'");
        }
        return;
      }

      // /dist <triangular|normal|lognormal>
      if (trimmed.startsWith("/dist ")) {
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

      // /save - save the configured driver
      if (trimmed === "/save") {
        await saveConfiguredDriver();
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
        const parsed = result.parsed || result;
        setParsedResult(parsed);

        setProcessingAction("Saving forecast...");

        // Create and save forecast
        const newForecast: SavedForecast = {
          id: Date.now().toString(),
          question: parsed.question || question,
          domain: parsed.domain,
          timeframe: parsed.timeframe,
          drivers: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setActiveForecast(newForecast);
        await saveForecast(newForecast);
      } catch (err: any) {
        setError(err.message || "Failed to parse question");
      } finally {
        setLoading(false);
        setProcessingAction("");
      }
    }
  };

  const getCommandHints = () => {
    // Special hints for driver configuration mode
    if (driverBeingConfigured) {
      const configHints = [
        { key: "type", label: "/type", desc: "Set type (continuous|binary)" },
        {
          key: "dist",
          label: "/dist",
          desc: "Set distribution (triangular|normal|lognormal)",
        },
        { key: "p", label: "/p", desc: "Set probabilities (p5 p50 p95)" },
        {
          key: "direction",
          label: "/direction",
          desc: "Set direction (increases|decreases)",
        },
        { key: "save", label: "/save", desc: "Save driver" },
        { key: "cancel", label: "/cancel", desc: "Cancel" },
      ];

      if (!commandInput || !commandInput.startsWith("/")) {
        return configHints;
      }

      const query = commandInput.toLowerCase();
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
    const hints = [
      { key: "question", label: "/question", desc: "Start a new forecast" },
      { key: "list", label: "/list", desc: "View all forecasts" },
    ];

    // Only show driver and simulate commands if there's an active forecast
    if (activeForecast) {
      hints.push(
        { key: "driver", label: "/driver", desc: "Add a driver" },
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
                  {parsedResult.confidence &&
                    ` · ${Math.round(parsedResult.confidence * 100)}% confidence`}
                </Text>
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

        {/* Driver Being Configured */}
        {driverBeingConfigured && (
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
              <Text style={styles.configHint}>
                Use /type, /dist, /p, /direction to configure, then /save
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

        {/* Hint for adding drivers */}
        {activeForecast &&
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
          (!parsedResult ||
            !parsedResult.suggestedDrivers ||
            parsedResult.suggestedDrivers.length === 0 ||
            activeForecast.drivers.length > 0) && (
            <View style={styles.hintCard}>
              <Text style={styles.hintText}>
                Type{" "}
                <Text style={styles.hintCommand}>/driver Squad strength</Text>{" "}
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
          <TextInput
            ref={inputRef}
            style={styles.commandInput}
            placeholder="Type / for commands"
            placeholderTextColor="#665c54"
            value={commandInput}
            onChangeText={setCommandInput}
            onSubmitEditing={handleCommandSubmit}
            autoCapitalize="none"
            returnKeyType="done"
            blurOnSubmit={false}
          />
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
  commandInput: {
    backgroundColor: "#3c3836",
    borderWidth: 1,
    borderColor: "#504945",
    borderRadius: 8,
    padding: 16,
    fontSize: 15,
    color: "#ebdbb2",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
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
