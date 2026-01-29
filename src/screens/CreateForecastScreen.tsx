import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import { ForecastConfig, ForecastDriver, Evidence } from "../types";
import { TufteColors, TufteTypography, TufteSpacing, TufteLayout } from "../styles/tufte";
import { EvidenceManager } from "../components/EvidenceManager";
import { PromptBuilder } from "../components/PromptBuilder";
import { InfoTooltip } from "../components/InfoTooltip";
import { GLOSSARY } from "../constants/glossary";
import { ResearchPromptTemplate } from "../constants/researchPrompts";
import { AgentConfig } from "../types/agentConfig";

type CreateForecastScreenProps = NativeStackScreenProps<RootStackParamList, "CreateForecast">;

export const CreateForecastScreen: React.FC<CreateForecastScreenProps> = ({ navigation }) => {
  const [ticker, setTicker] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState("2027-12-31");
  const [drivers, setDrivers] = useState<ForecastDriver[]>([
    {
      name: "",
      description: "",
      distributionType: "triangular",
      parameters: { low: 0, mode: 0, high: 0 },
      unit: "",
      rationale: "",
      evidence: [],
      distributionRationale: "",
    },
  ]);

  const addDriver = () => {
    setDrivers([
      ...drivers,
      {
        name: "",
        description: "",
        distributionType: "triangular",
        parameters: { low: 0, mode: 0, high: 0 },
        unit: "",
        rationale: "",
        evidence: [],
        distributionRationale: "",
      },
    ]);
  };

  const addEvidence = (index: number, evidence: Evidence) => {
    const newDrivers = [...drivers];
    if (!newDrivers[index].evidence) {
      newDrivers[index].evidence = [];
    }
    newDrivers[index].evidence!.push(evidence);
    setDrivers(newDrivers);
  };

  const removeEvidence = (driverIndex: number, evidenceId: string) => {
    const newDrivers = [...drivers];
    newDrivers[driverIndex].evidence = newDrivers[driverIndex].evidence?.filter(
      (e) => e.id !== evidenceId,
    );
    setDrivers(newDrivers);
  };

  const handlePromptGenerated = (
    driverIndex: number,
    prompt: string,
    template: ResearchPromptTemplate,
    variables: Record<string, string>,
    agentConfig: AgentConfig,
  ) => {
    // In a real implementation, this would call the agent API
    // For now, create a placeholder evidence item
    Alert.alert(
      "Agent Research Queued",
      `Research prompt generated for ${agentConfig.name}. In production, this would call the agent API and auto-generate evidence.\n\nTemplate: ${template.name}\nAgent: ${agentConfig.name}`,
      [
        {
          text: "OK",
          onPress: () => {
            // Create placeholder evidence to show the flow
            const placeholderEvidence: Evidence = {
              id: Date.now().toString(),
              type: template.evidenceType,
              title: `[Agent Research] ${template.name}`,
              source: `${agentConfig.name} (${agentConfig.model})`,
              summary: `Research conducted using prompt template: ${template.name}`,
              keyFinding: `Variables: ${Object.entries(variables)
                .map(([k, v]) => `${k}=${v}`)
                .join(", ")}`,
              date: new Date().toISOString().split("T")[0],
              relevance: "high",
            };
            addEvidence(driverIndex, placeholderEvidence);
          },
        },
      ],
    );
  };

  const handleScheduleResearch = (
    driverIndex: number,
    prompt: string,
    template: ResearchPromptTemplate,
    variables: Record<string, string>,
    frequency: string,
    agentConfig: AgentConfig,
  ) => {
    Alert.alert(
      "Scheduled Research",
      `Scheduled ${frequency} research for driver "${drivers[driverIndex].name}".\n\nTemplate: ${template.name}\nFrequency: ${frequency}\nAgent: ${agentConfig.name}\n\nIn production, this would create a scheduled job that runs the agent automatically.`,
      [{ text: "OK" }],
    );
  };

  const updateDriver = (index: number, field: string, value: any) => {
    const newDrivers = [...drivers];
    if (field === "low" || field === "mode" || field === "high") {
      newDrivers[index].parameters[field] = parseFloat(value) || 0;
    } else if (field === "distributionType") {
      newDrivers[index].distributionType = value;
      // Reset parameters based on distribution type
      if (value === "normal") {
        newDrivers[index].parameters = { mean: 0, stdDev: 0 };
      } else if (value === "uniform") {
        newDrivers[index].parameters = { low: 0, high: 0 };
      } else if (value === "triangular") {
        newDrivers[index].parameters = { low: 0, mode: 0, high: 0 };
      }
    } else {
      (newDrivers[index] as any)[field] = value;
    }
    setDrivers(newDrivers);
  };

  const removeDriver = (index: number) => {
    if (drivers.length > 1) {
      setDrivers(drivers.filter((_, i) => i !== index));
    }
  };

  const handleCreateForecast = () => {
    // Validation
    if (!ticker.trim()) {
      Alert.alert("Error", "Please enter a ticker symbol");
      return;
    }
    if (!targetValue || parseFloat(targetValue) <= 0) {
      Alert.alert("Error", "Please enter a valid target value");
      return;
    }

    const hasInvalidDriver = drivers.some((d) => !d.name.trim() || !d.unit.trim());
    if (hasInvalidDriver) {
      Alert.alert("Error", "Please fill in all driver fields");
      return;
    }

    const config: ForecastConfig = {
      ticker: ticker.toUpperCase(),
      targetMetric: "revenue",
      targetValue: parseFloat(targetValue),
      targetDate: targetDate,
      drivers: drivers,
      baserate: {
        description: "User-defined forecast",
        probability: 0.5,
        source: "Manual entry",
      },
      premortem: [],
    };

    navigation.navigate("ForecastDetail", { config });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Forecast Construction</Text>
        <Text style={styles.pageSubtitle}>
          Define target and specify independent drivers using probability distributions
        </Text>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I. Target Definition</Text>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>Ticker Symbol</Text>
              <TextInput
                style={styles.input}
                value={ticker}
                onChangeText={setTicker}
                placeholder="ASTS"
                placeholderTextColor={TufteColors.textTertiary}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Revenue Target (M)</Text>
              <TextInput
                style={styles.input}
                value={targetValue}
                onChangeText={setTargetValue}
                placeholder="150"
                placeholderTextColor={TufteColors.textTertiary}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Target Date</Text>
            <TextInput
              style={styles.input}
              value={targetDate}
              onChangeText={setTargetDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={TufteColors.textTertiary}
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>II. Probabilistic Drivers</Text>
          <Text style={styles.helpText}>
            Specify 2–5 independent variables that multiply to yield revenue. Each driver requires a
            probability distribution (triangular, normal, or uniform) with parameters defining the
            range of plausible outcomes.
          </Text>

          {drivers.map((driver, index) => (
            <View key={index} style={styles.driverCard}>
              <View style={styles.driverHeader}>
                <Text style={styles.driverNumber}>Driver {index + 1}</Text>
                {drivers.length > 1 && (
                  <TouchableOpacity onPress={() => removeDriver(index)} style={styles.removeButton}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={driver.name}
                    onChangeText={(val) => updateDriver(index, "name", val)}
                    placeholder="Subscribers"
                    placeholderTextColor={TufteColors.textTertiary}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>Unit</Text>
                  <TextInput
                    style={styles.input}
                    value={driver.unit}
                    onChangeText={(val) => updateDriver(index, "unit", val)}
                    placeholder="users"
                    placeholderTextColor={TufteColors.textTertiary}
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  value={driver.description}
                  onChangeText={(val) => updateDriver(index, "description", val)}
                  placeholder="What this driver represents"
                  placeholderTextColor={TufteColors.textTertiary}
                />
              </View>

              <View style={styles.distributionHeader}>
                <Text style={styles.label}>Distribution Type</Text>
                <InfoTooltip
                  term="Choosing Distribution Types"
                  definition="Different distributions represent different types of uncertainty. Triangular: expert judgment with min/mode/max. Normal: symmetric variation around mean. Uniform: equal probability across range (rarely appropriate). Beta: bounded with flexible shapes."
                  example="Use Triangular for user growth estimates (50k/120k/250k), Normal for ARPU with historical data (mean=$45, sd=$8), Uniform only if genuinely no idea within bounds. Most business variables have a 'most likely' value, making Triangular the default choice."
                />
              </View>
              <View style={styles.distributionButtons}>
                {[
                  { type: "triangular", glossary: GLOSSARY.TRIANGULAR_DISTRIBUTION },
                  { type: "normal", glossary: GLOSSARY.NORMAL_DISTRIBUTION },
                  { type: "uniform", glossary: GLOSSARY.UNIFORM_DISTRIBUTION },
                ].map(({ type, glossary }) => (
                  <View key={type} style={styles.distributionButtonContainer}>
                    <TouchableOpacity
                      style={[
                        styles.distributionButton,
                        driver.distributionType === type && styles.distributionButtonActive,
                      ]}
                      onPress={() => updateDriver(index, "distributionType", type)}
                    >
                      <Text
                        style={[
                          styles.distributionButtonText,
                          driver.distributionType === type && styles.distributionButtonTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.distributionTooltip}>
                      <InfoTooltip
                        term={glossary.term}
                        definition={glossary.definition}
                        example={glossary.example}
                      />
                    </View>
                  </View>
                ))}
              </View>

              {driver.distributionType === "triangular" && (
                <View style={styles.parametersGrid}>
                  <View style={styles.paramField}>
                    <Text style={styles.label}>Low (P10)</Text>
                    <TextInput
                      style={styles.input}
                      value={driver.parameters.low?.toString() || ""}
                      onChangeText={(val) => updateDriver(index, "low", val)}
                      placeholder="0"
                      placeholderTextColor={TufteColors.textTertiary}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.paramField}>
                    <Text style={styles.label}>Mode (P50)</Text>
                    <TextInput
                      style={styles.input}
                      value={driver.parameters.mode?.toString() || ""}
                      onChangeText={(val) => updateDriver(index, "mode", val)}
                      placeholder="0"
                      placeholderTextColor={TufteColors.textTertiary}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.paramField}>
                    <Text style={styles.label}>High (P90)</Text>
                    <TextInput
                      style={styles.input}
                      value={driver.parameters.high?.toString() || ""}
                      onChangeText={(val) => updateDriver(index, "high", val)}
                      placeholder="0"
                      placeholderTextColor={TufteColors.textTertiary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}

              {driver.distributionType === "normal" && (
                <View style={styles.parametersGrid}>
                  <View style={styles.paramField}>
                    <Text style={styles.label}>Mean (μ)</Text>
                    <TextInput
                      style={styles.input}
                      value={driver.parameters.mean?.toString() || ""}
                      onChangeText={(val) => updateDriver(index, "mean", val)}
                      placeholder="0"
                      placeholderTextColor={TufteColors.textTertiary}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.paramField}>
                    <Text style={styles.label}>Std Dev (σ)</Text>
                    <TextInput
                      style={styles.input}
                      value={driver.parameters.stdDev?.toString() || ""}
                      onChangeText={(val) => updateDriver(index, "stdDev", val)}
                      placeholder="0"
                      placeholderTextColor={TufteColors.textTertiary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}

              {driver.distributionType === "uniform" && (
                <View style={styles.parametersGrid}>
                  <View style={styles.paramField}>
                    <Text style={styles.label}>Minimum</Text>
                    <TextInput
                      style={styles.input}
                      value={driver.parameters.low?.toString() || ""}
                      onChangeText={(val) => updateDriver(index, "low", val)}
                      placeholder="0"
                      placeholderTextColor={TufteColors.textTertiary}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.paramField}>
                    <Text style={styles.label}>Maximum</Text>
                    <TextInput
                      style={styles.input}
                      value={driver.parameters.high?.toString() || ""}
                      onChangeText={(val) => updateDriver(index, "high", val)}
                      placeholder="0"
                      placeholderTextColor={TufteColors.textTertiary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}

              {/* Rationale */}
              <View style={styles.formField}>
                <Text style={styles.label}>Parameter Rationale (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={driver.rationale}
                  onChangeText={(val) => updateDriver(index, "rationale", val)}
                  placeholder="Explain why you chose these parameter values (e.g., 'Based on competitor analysis showing 50-250k user range')"
                  placeholderTextColor={TufteColors.textTertiary}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Research Agent */}
              <PromptBuilder
                driverName={driver.name}
                driverDescription={driver.description}
                onPromptGenerated={(prompt, template, variables, agentConfig) =>
                  handlePromptGenerated(index, prompt, template, variables, agentConfig)
                }
                onScheduleResearch={(prompt, template, variables, frequency, agentConfig) =>
                  handleScheduleResearch(index, prompt, template, variables, frequency, agentConfig)
                }
              />

              {/* Evidence Manager */}
              <EvidenceManager
                evidence={driver.evidence || []}
                onAddEvidence={(evidence) => addEvidence(index, evidence)}
                onRemoveEvidence={(evidenceId) => removeEvidence(index, evidenceId)}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.addButton} onPress={addDriver}>
            <Text style={styles.addButtonText}>+ Add Driver</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.createButton} onPress={handleCreateForecast}>
          <Text style={styles.createButtonText}>Execute Simulation</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>
          * Monte Carlo simulation with 10,000 iterations will be performed using specified
          distributions. Results include P10/P50/P90 percentiles and success probability.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TufteColors.background,
  },
  scrollContent: {
    paddingHorizontal: TufteLayout.marginHorizontal,
    paddingVertical: TufteSpacing.xl,
    paddingBottom: TufteSpacing.xxl * 2,
  },
  pageTitle: {
    fontSize: TufteTypography.fontSize.xxl,
    fontWeight: "400" as const,
    color: TufteColors.text,
    marginBottom: TufteSpacing.xs,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textSecondary,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.sm,
    marginBottom: TufteSpacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: TufteColors.grid,
    marginVertical: TufteSpacing.xl,
  },
  section: {
    marginBottom: TufteSpacing.lg,
  },
  sectionTitle: {
    fontSize: TufteTypography.fontSize.base,
    fontWeight: "500" as const,
    color: TufteColors.text,
    marginBottom: TufteSpacing.md,
    letterSpacing: 0.3,
  },
  helpText: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textTertiary,
    marginBottom: TufteSpacing.lg,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.sm,
  },
  formRow: {
    flexDirection: "row",
    gap: TufteSpacing.md,
    marginBottom: TufteSpacing.md,
  },
  formField: {
    flex: 1,
    marginBottom: TufteSpacing.md,
  },
  label: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textSecondary,
    marginBottom: TufteSpacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: TufteColors.paper,
    color: TufteColors.text,
    padding: TufteSpacing.md,
    fontSize: TufteTypography.fontSize.base,
    borderWidth: 1,
    borderColor: TufteColors.border,
    fontVariant: ["tabular-nums"],
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  driverCard: {
    backgroundColor: TufteColors.paper,
    padding: TufteSpacing.lg,
    marginBottom: TufteSpacing.lg,
    borderWidth: 1,
    borderColor: TufteColors.border,
  },
  driverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: TufteSpacing.md,
    paddingBottom: TufteSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: TufteColors.grid,
  },
  driverNumber: {
    fontSize: TufteTypography.fontSize.sm,
    fontWeight: "500" as const,
    color: TufteColors.text,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  removeButton: {
    paddingHorizontal: TufteSpacing.md,
    paddingVertical: TufteSpacing.xs,
    borderWidth: 1,
    borderColor: TufteColors.text,
  },
  removeButtonText: {
    color: TufteColors.text,
    fontSize: TufteTypography.fontSize.xs,
    letterSpacing: 0.5,
  },
  distributionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: TufteSpacing.sm,
    marginBottom: TufteSpacing.sm,
  },
  distributionButtons: {
    flexDirection: "row",
    gap: TufteSpacing.sm,
    marginTop: TufteSpacing.sm,
    marginBottom: TufteSpacing.md,
  },
  distributionButtonContainer: {
    flex: 1,
  },
  distributionButton: {
    backgroundColor: TufteColors.background,
    paddingVertical: TufteSpacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: TufteColors.border,
    marginBottom: TufteSpacing.xs,
  },
  distributionTooltip: {
    alignItems: "center",
  },
  distributionButtonActive: {
    backgroundColor: TufteColors.text,
    borderColor: TufteColors.text,
  },
  distributionButtonText: {
    color: TufteColors.textSecondary,
    fontSize: TufteTypography.fontSize.xs,
    textTransform: "capitalize",
    letterSpacing: 0.5,
  },
  distributionButtonTextActive: {
    color: TufteColors.paper,
  },
  parametersGrid: {
    flexDirection: "row",
    gap: TufteSpacing.md,
    marginTop: TufteSpacing.sm,
  },
  paramField: {
    flex: 1,
  },
  addButton: {
    backgroundColor: TufteColors.background,
    padding: TufteSpacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: TufteColors.border,
  },
  addButtonText: {
    color: TufteColors.text,
    fontSize: TufteTypography.fontSize.sm,
    letterSpacing: 0.5,
  },
  createButton: {
    backgroundColor: TufteColors.text,
    padding: TufteSpacing.lg,
    alignItems: "center",
    marginBottom: TufteSpacing.lg,
  },
  createButtonText: {
    color: TufteColors.paper,
    fontSize: TufteTypography.fontSize.base,
    fontWeight: "500" as const,
    letterSpacing: 0.5,
  },
  footnote: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.xs,
    fontStyle: "italic",
  },
});
