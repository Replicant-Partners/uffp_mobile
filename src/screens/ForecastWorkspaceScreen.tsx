import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { researchService } from "../services/researchService";

interface Driver {
  id: string;
  name: string;
  type: "binary" | "continuous";
  probability?: number;
  p5?: number;
  p50?: number;
  p95?: number;
  distribution?: "normal" | "triangular" | "lognormal";
  direction: "increases" | "decreases";
  researchAgent?: string;
  expanded: boolean;
}

interface Command {
  key: string;
  label: string;
  description: string;
}

const COMMANDS: Command[] = [
  { key: "driver", label: "/driver", description: "Add new driver" },
  { key: "simulate", label: "/simulate", description: "Run Monte Carlo simulation" },
  { key: "coach", label: "/coach", description: "Ask AI coach for help" },
  { key: "research", label: "/research", description: "Assign research agent" },
];

const AGENTS = [
  { id: "research_analyst", name: "Research Analyst" },
  { id: "sports_analyst", name: "Sports Analyst" },
  { id: "data_analyst", name: "Data Analyst" },
  { id: "market_analyst", name: "Market Analyst" },
];

export default function ForecastWorkspaceScreen() {
  const [question, setQuestion] = useState("");
  const [inputText, setInputText] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [probability, setProbability] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
  const [filteredAgents, setFilteredAgents] = useState(typeof AGENTS);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Detect / for commands
    if (inputText.startsWith("/")) {
      const query = inputText.slice(1).toLowerCase();
      const filtered = COMMANDS.filter(
        (cmd) =>
          cmd.key.includes(query) ||
          cmd.label.includes(query) ||
          cmd.description.toLowerCase().includes(query)
      );
      setFilteredCommands(filtered);
      setShowCommandPalette(true);
      setShowAgentPicker(false);
    }
    // Detect @ for agents
    else if (inputText.startsWith("@")) {
      const query = inputText.slice(1).toLowerCase();
      const filtered = AGENTS.filter(
        (agent) =>
          agent.id.includes(query) || agent.name.toLowerCase().includes(query)
      );
      setFilteredAgents(filtered);
      setShowAgentPicker(true);
      setShowCommandPalette(false);
    } else {
      setShowCommandPalette(false);
      setShowAgentPicker(false);
    }
  }, [inputText]);

  const executeCommand = async (command: string) => {
    setInputText("");
    setShowCommandPalette(false);

    switch (command) {
      case "driver":
        // Add new driver with defaults
        const newDriver: Driver = {
          id: Date.now().toString(),
          name: "New driver",
          type: "continuous",
          distribution: "triangular",
          p5: 30,
          p50: 50,
          p95: 70,
          direction: "increases",
          expanded: true,
        };
        setDrivers([...drivers, newDriver]);
        break;

      case "simulate":
        await runSimulation();
        break;

      case "coach":
        // TODO: Implement coach interaction
        break;

      case "research":
        setShowAgentPicker(true);
        break;
    }
  };

  const assignAgent = (agentId: string, driverId?: string) => {
    setInputText("");
    setShowAgentPicker(false);

    if (driverId) {
      setDrivers(
        drivers.map((d) =>
          d.id === driverId ? { ...d, researchAgent: agentId } : d
        )
      );
    }
  };

  const runSimulation = async () => {
    if (!forecast || drivers.length === 0) return;

    setLoading(true);
    try {
      const result = await researchService.simulate(forecast.id, 10000);
      setProbability(result.forecast?.probability || result.probability);
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDriver = (driverId: string) => {
    setDrivers(
      drivers.map((d) =>
        d.id === driverId ? { ...d, expanded: !d.expanded } : d
      )
    );
  };

  const updateDriver = (driverId: string, updates: Partial<Driver>) => {
    setDrivers(drivers.map((d) => (d.id === driverId ? { ...d, ...updates } : d)));
  };

  const parseQuestion = async () => {
    if (!question.trim()) return;

    setLoading(true);
    try {
      const result = await researchService.parseQuestion(question);
      const parsed = result.parsed || result;

      // Create forecast
      const forecastResult = await researchService.createForecast({
        question: parsed.question || question,
        domain: parsed.domain,
        timeframe: parsed.timeframe,
        resolutionCriteria: `Resolves YES if: ${parsed.question || question}`,
      });

      setForecast(forecastResult.forecast);

      // Add suggested drivers
      if (parsed.suggestedDrivers && parsed.suggestedDrivers.length > 0) {
        const suggestedDrivers = parsed.suggestedDrivers.map(
          (name: string, idx: number) => ({
            id: `${Date.now()}-${idx}`,
            name,
            type: "continuous" as const,
            distribution: "triangular" as const,
            p5: 30,
            p50: 50,
            p95: 70,
            direction: "increases" as const,
            expanded: false,
          })
        );
        setDrivers(suggestedDrivers);
      }
    } catch (err) {
      console.error("Parse error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.workspace}>
        {/* Question */}
        <TextInput
          style={styles.questionInput}
          placeholder="What do you want to forecast?"
          placeholderTextColor="#928374"
          value={question}
          onChangeText={setQuestion}
          onSubmitEditing={parseQuestion}
          multiline
          editable={!loading && !forecast}
        />

        {forecast && (
          <View style={styles.metadata}>
            <Text style={styles.metadataText}>
              {forecast.domain} · {forecast.timeframe}
            </Text>
          </View>
        )}

        {/* Drivers */}
        {drivers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Drivers</Text>

            {drivers.map((driver) => (
              <TouchableOpacity
                key={driver.id}
                style={styles.driverCard}
                onPress={() => toggleDriver(driver.id)}
                activeOpacity={0.8}
              >
                <View style={styles.driverHeader}>
                  <Text style={styles.driverName}>
                    {driver.expanded ? "▾" : "▸"} {driver.name}
                  </Text>
                  {!driver.expanded && (
                    <Text style={styles.driverSummary}>
                      {driver.type === "binary"
                        ? `P(${driver.probability}%)`
                        : `P(${driver.p5}-${driver.p50}-${driver.p95})`}{" "}
                      · {driver.distribution} · {driver.direction}
                    </Text>
                  )}
                </View>

                {driver.expanded && (
                  <View style={styles.driverDetails}>
                    <TextInput
                      style={styles.driverNameInput}
                      value={driver.name}
                      onChangeText={(name) => updateDriver(driver.id, { name })}
                      placeholder="Driver name"
                      placeholderTextColor="#928374"
                    />

                    {/* Type selector */}
                    <View style={styles.row}>
                      <Text style={styles.label}>Type:</Text>
                      <View style={styles.segmentedControl}>
                        {["binary", "continuous"].map((type) => (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.segment,
                              driver.type === type && styles.segmentActive,
                            ]}
                            onPress={() =>
                              updateDriver(driver.id, {
                                type: type as "binary" | "continuous",
                              })
                            }
                          >
                            <Text
                              style={[
                                styles.segmentText,
                                driver.type === type && styles.segmentTextActive,
                              ]}
                            >
                              {type}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Distribution (for continuous) */}
                    {driver.type === "continuous" && (
                      <>
                        <View style={styles.row}>
                          <Text style={styles.label}>Distribution:</Text>
                          <View style={styles.segmentedControl}>
                            {["triangular", "normal", "lognormal"].map((dist) => (
                              <TouchableOpacity
                                key={dist}
                                style={[
                                  styles.segment,
                                  driver.distribution === dist &&
                                    styles.segmentActive,
                                ]}
                                onPress={() =>
                                  updateDriver(driver.id, { distribution: dist as any })
                                }
                              >
                                <Text
                                  style={[
                                    styles.segmentText,
                                    driver.distribution === dist &&
                                      styles.segmentTextActive,
                                  ]}
                                >
                                  {dist}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>

                        {/* P5, P50, P95 */}
                        <View style={styles.probabilityInputs}>
                          <View style={styles.probInput}>
                            <Text style={styles.probLabel}>P5</Text>
                            <TextInput
                              style={styles.probValue}
                              value={driver.p5?.toString()}
                              onChangeText={(val) =>
                                updateDriver(driver.id, { p5: Number(val) || 0 })
                              }
                              keyboardType="numeric"
                            />
                          </View>
                          <View style={styles.probInput}>
                            <Text style={styles.probLabel}>P50</Text>
                            <TextInput
                              style={styles.probValue}
                              value={driver.p50?.toString()}
                              onChangeText={(val) =>
                                updateDriver(driver.id, { p50: Number(val) || 0 })
                              }
                              keyboardType="numeric"
                            />
                          </View>
                          <View style={styles.probInput}>
                            <Text style={styles.probLabel}>P95</Text>
                            <TextInput
                              style={styles.probValue}
                              value={driver.p95?.toString()}
                              onChangeText={(val) =>
                                updateDriver(driver.id, { p95: Number(val) || 0 })
                              }
                              keyboardType="numeric"
                            />
                          </View>
                        </View>
                      </>
                    )}

                    {/* Probability (for binary) */}
                    {driver.type === "binary" && (
                      <View style={styles.row}>
                        <Text style={styles.label}>Probability:</Text>
                        <TextInput
                          style={styles.probabilityInput}
                          value={driver.probability?.toString()}
                          onChangeText={(val) =>
                            updateDriver(driver.id, {
                              probability: Number(val) || 0,
                            })
                          }
                          keyboardType="numeric"
                          placeholder="0-100"
                          placeholderTextColor="#928374"
                        />
                        <Text style={styles.label}>%</Text>
                      </View>
                    )}

                    {/* Direction */}
                    <View style={styles.row}>
                      <Text style={styles.label}>Direction:</Text>
                      <View style={styles.segmentedControl}>
                        {["increases", "decreases"].map((dir) => (
                          <TouchableOpacity
                            key={dir}
                            style={[
                              styles.segment,
                              driver.direction === dir && styles.segmentActive,
                            ]}
                            onPress={() =>
                              updateDriver(driver.id, {
                                direction: dir as "increases" | "decreases",
                              })
                            }
                          >
                            <Text
                              style={[
                                styles.segmentText,
                                driver.direction === dir && styles.segmentTextActive,
                              ]}
                            >
                              {dir}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Research agent assignment */}
                    {driver.researchAgent ? (
                      <View style={styles.agentAssigned}>
                        <Text style={styles.agentText}>
                          @{driver.researchAgent}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            updateDriver(driver.id, { researchAgent: undefined })
                          }
                        >
                          <Text style={styles.removeAgent}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={styles.noAgent}>
                        Type @ to assign research agent
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Probability Result */}
        {probability !== null && (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Probability</Text>
            <Text style={styles.resultValue}>
              {(probability * 100).toFixed(1)}%
            </Text>
            <Text style={styles.resultMeta}>
              Based on {drivers.length} drivers, 10k iterations
            </Text>
          </View>
        )}

        {/* Command Input */}
        <View style={styles.commandInputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.commandInput}
            placeholder="Type / for commands or @ for agents"
            placeholderTextColor="#928374"
            value={inputText}
            onChangeText={setInputText}
            autoCapitalize="none"
          />
        </View>

        {/* Command Palette */}
        {showCommandPalette && (
          <View style={styles.palette}>
            {filteredCommands.map((cmd) => (
              <TouchableOpacity
                key={cmd.key}
                style={styles.paletteItem}
                onPress={() => executeCommand(cmd.key)}
              >
                <Text style={styles.paletteLabel}>{cmd.label}</Text>
                <Text style={styles.paletteDesc}>{cmd.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Agent Picker */}
        {showAgentPicker && (
          <View style={styles.palette}>
            {filteredAgents.map((agent) => (
              <TouchableOpacity
                key={agent.id}
                style={styles.paletteItem}
                onPress={() => assignAgent(agent.id)}
              >
                <Text style={styles.paletteLabel}>@{agent.id}</Text>
                <Text style={styles.paletteDesc}>{agent.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fabd2f" />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#282828",
  },
  workspace: {
    padding: 20,
  },
  questionInput: {
    fontSize: 24,
    fontWeight: "400",
    color: "#ebdbb2",
    marginBottom: 12,
    minHeight: 60,
    textAlignVertical: "top",
  },
  metadata: {
    marginBottom: 24,
  },
  metadataText: {
    fontSize: 13,
    color: "#928374",
  },
  section: {
    marginBottom: 24,
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
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#504945",
  },
  driverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  driverName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#ebdbb2",
    flex: 1,
  },
  driverSummary: {
    fontSize: 12,
    color: "#928374",
  },
  driverDetails: {
    marginTop: 16,
    gap: 12,
  },
  driverNameInput: {
    fontSize: 16,
    color: "#ebdbb2",
    borderBottomWidth: 1,
    borderBottomColor: "#504945",
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  label: {
    fontSize: 13,
    color: "#d5c4a1",
    minWidth: 80,
  },
  segmentedControl: {
    flexDirection: "row",
    flex: 1,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#504945",
  },
  segment: {
    flex: 1,
    padding: 8,
    alignItems: "center",
    backgroundColor: "#282828",
  },
  segmentActive: {
    backgroundColor: "#458588",
  },
  segmentText: {
    fontSize: 12,
    color: "#928374",
  },
  segmentTextActive: {
    color: "#ebdbb2",
    fontWeight: "600",
  },
  probabilityInputs: {
    flexDirection: "row",
    gap: 12,
  },
  probInput: {
    flex: 1,
  },
  probLabel: {
    fontSize: 11,
    color: "#928374",
    marginBottom: 4,
  },
  probValue: {
    backgroundColor: "#282828",
    borderWidth: 1,
    borderColor: "#504945",
    borderRadius: 6,
    padding: 8,
    color: "#ebdbb2",
    textAlign: "center",
  },
  probabilityInput: {
    flex: 1,
    backgroundColor: "#282828",
    borderWidth: 1,
    borderColor: "#504945",
    borderRadius: 6,
    padding: 8,
    color: "#ebdbb2",
  },
  agentAssigned: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#282828",
    borderWidth: 1,
    borderColor: "#458588",
    borderRadius: 6,
    padding: 8,
  },
  agentText: {
    fontSize: 13,
    color: "#83a598",
  },
  removeAgent: {
    fontSize: 16,
    color: "#928374",
  },
  noAgent: {
    fontSize: 12,
    color: "#665c54",
    fontStyle: "italic",
  },
  resultCard: {
    backgroundColor: "#3c3836",
    borderRadius: 8,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#d79921",
  },
  resultLabel: {
    fontSize: 13,
    color: "#d5c4a1",
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#fabd2f",
  },
  resultMeta: {
    fontSize: 11,
    color: "#928374",
    marginTop: 8,
  },
  commandInputContainer: {
    marginTop: 24,
  },
  commandInput: {
    backgroundColor: "#3c3836",
    borderWidth: 1,
    borderColor: "#504945",
    borderRadius: 8,
    padding: 16,
    fontSize: 15,
    color: "#ebdbb2",
  },
  palette: {
    backgroundColor: "#3c3836",
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#504945",
    maxHeight: 200,
  },
  paletteItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#504945",
  },
  paletteLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ebdbb2",
    marginBottom: 2,
  },
  paletteDesc: {
    fontSize: 12,
    color: "#928374",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(40, 40, 40, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
});
