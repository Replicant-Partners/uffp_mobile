import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Pressable,
} from "react-native";
import {
  RESEARCH_PROMPT_TEMPLATES,
  ResearchPromptTemplate,
  PROMPT_VARIABLES_GLOSSARY,
} from "../constants/researchPrompts";
import { DEFAULT_AGENT_CONFIGS, AgentConfig } from "../types/agentConfig";
import { TufteColors, TufteTypography, TufteSpacing } from "../styles/tufte";

interface PromptBuilderProps {
  driverName: string;
  driverDescription: string;
  onPromptGenerated: (
    prompt: string,
    template: ResearchPromptTemplate,
    variables: Record<string, string>,
    agentConfig: AgentConfig,
  ) => void;
  onScheduleResearch?: (
    prompt: string,
    template: ResearchPromptTemplate,
    variables: Record<string, string>,
    frequency: string,
    agentConfig: AgentConfig,
  ) => void;
}

export const PromptBuilder: React.FC<PromptBuilderProps> = ({
  driverName,
  driverDescription,
  onPromptGenerated,
  onScheduleResearch,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ResearchPromptTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig>(
    DEFAULT_AGENT_CONFIGS.research_analyst,
  );
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");

  const categories = Array.from(new Set(RESEARCH_PROMPT_TEMPLATES.map((t) => t.category)));

  const handleTemplateSelect = (template: ResearchPromptTemplate) => {
    setSelectedTemplate(template);

    // Pre-fill some variables if possible
    const prefilledVars: Record<string, string> = {};
    if (
      template.variables.includes("COMPANY_NAME") ||
      template.variables.includes("COMPANY_TICKER")
    ) {
      prefilledVars[
        template.variables.includes("COMPANY_NAME") ? "COMPANY_NAME" : "COMPANY_TICKER"
      ] = "";
    }
    setVariables(prefilledVars);

    // Select appropriate agent
    const agentKey =
      template.category === "sentiment_tracking"
        ? "sentiment_monitor"
        : template.category === "competitor_research"
          ? "competitive_intel"
          : template.category === "financial_data"
            ? "financial_analyst"
            : template.category === "market_analysis"
              ? "market_researcher"
              : template.category === "expert_synthesis"
                ? "expert_synthesizer"
                : "research_analyst";
    setSelectedAgent(DEFAULT_AGENT_CONFIGS[agentKey]);

    if (template.schedulable && template.frequency) {
      setFrequency(template.frequency);
    }
  };

  const fillPrompt = (template: ResearchPromptTemplate, vars: Record<string, string>): string => {
    let prompt = template.promptTemplate;
    template.variables.forEach((varName) => {
      const value = vars[varName] || `[${varName}]`;
      prompt = prompt.replace(new RegExp(`{${varName}}`, "g"), value);
    });

    // Add context from driver
    prompt =
      `CONTEXT: You are researching this for a forecast driver named "${driverName}" described as: "${driverDescription}"\n\n` +
      prompt;

    return prompt;
  };

  const handleGenerate = () => {
    if (!selectedTemplate) return;

    const filledPrompt = fillPrompt(selectedTemplate, variables);

    if (scheduleEnabled && selectedTemplate.schedulable && onScheduleResearch) {
      onScheduleResearch(filledPrompt, selectedTemplate, variables, frequency, selectedAgent);
    } else {
      onPromptGenerated(filledPrompt, selectedTemplate, variables, selectedAgent);
    }

    setModalVisible(false);
    setSelectedTemplate(null);
    setVariables({});
  };

  const allVariablesFilled = selectedTemplate?.variables.every((v) => variables[v]?.trim());

  return (
    <>
      <TouchableOpacity style={styles.triggerButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.triggerButtonText}>🤖 Use Research Agent</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Research Agent</Text>
                  <Text style={styles.modalSubtitle}>for driver: {driverName}</Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
              </View>

              {!selectedTemplate ? (
                <View>
                  <Text style={styles.sectionTitle}>Select Research Template</Text>
                  {categories.map((category) => {
                    const templates = RESEARCH_PROMPT_TEMPLATES.filter(
                      (t) => t.category === category,
                    );
                    return (
                      <View key={category} style={styles.categorySection}>
                        <Text style={styles.categoryLabel}>
                          {category.replace(/_/g, " ").toUpperCase()}
                        </Text>
                        {templates.map((template) => (
                          <TouchableOpacity
                            key={template.id}
                            style={styles.templateCard}
                            onPress={() => handleTemplateSelect(template)}
                          >
                            <View style={styles.templateHeader}>
                              <Text style={styles.templateName}>{template.name}</Text>
                              {template.schedulable && (
                                <View style={styles.schedulableBadge}>
                                  <Text style={styles.schedulableBadgeText}>📅 Schedulable</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.templateDescription}>{template.description}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setSelectedTemplate(null)}
                  >
                    <Text style={styles.backButtonText}>← Back to templates</Text>
                  </TouchableOpacity>

                  <View style={styles.selectedTemplateInfo}>
                    <Text style={styles.selectedTemplateName}>{selectedTemplate.name}</Text>
                    <Text style={styles.selectedTemplateDesc}>{selectedTemplate.description}</Text>
                  </View>

                  {/* Variable Inputs */}
                  <Text style={styles.sectionTitle}>Fill in Variables</Text>
                  {selectedTemplate.variables.map((varName) => (
                    <View key={varName} style={styles.variableInput}>
                      <Text style={styles.label}>{varName.replace(/_/g, " ")}</Text>
                      <Text style={styles.variableHint}>{PROMPT_VARIABLES_GLOSSARY[varName]}</Text>
                      <TextInput
                        style={styles.input}
                        value={variables[varName] || ""}
                        onChangeText={(text) => setVariables({ ...variables, [varName]: text })}
                        placeholder={PROMPT_VARIABLES_GLOSSARY[varName]
                          ?.split("e.g., ")[1]
                          ?.replace(/"/g, "")}
                        placeholderTextColor={TufteColors.textTertiary}
                      />
                    </View>
                  ))}

                  {/* Agent Selection */}
                  <Text style={styles.sectionTitle}>Research Agent</Text>
                  <View style={styles.agentSelector}>
                    {Object.values(DEFAULT_AGENT_CONFIGS).map((agent) => (
                      <TouchableOpacity
                        key={agent.id}
                        style={[
                          styles.agentCard,
                          selectedAgent.id === agent.id && styles.agentCardActive,
                        ]}
                        onPress={() => setSelectedAgent(agent)}
                      >
                        <Text
                          style={[
                            styles.agentName,
                            selectedAgent.id === agent.id && styles.agentNameActive,
                          ]}
                        >
                          {agent.name}
                        </Text>
                        <Text
                          style={[
                            styles.agentDesc,
                            selectedAgent.id === agent.id && styles.agentDescActive,
                          ]}
                        >
                          {agent.description}
                        </Text>
                        <Text
                          style={[
                            styles.agentModel,
                            selectedAgent.id === agent.id && styles.agentModelActive,
                          ]}
                        >
                          {agent.model}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Schedule Option */}
                  {selectedTemplate.schedulable && onScheduleResearch && (
                    <View style={styles.scheduleSection}>
                      <TouchableOpacity
                        style={styles.scheduleToggle}
                        onPress={() => setScheduleEnabled(!scheduleEnabled)}
                      >
                        <View style={[styles.checkbox, scheduleEnabled && styles.checkboxActive]}>
                          {scheduleEnabled && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.scheduleLabel}>
                          Schedule this research to run automatically
                        </Text>
                      </TouchableOpacity>

                      {scheduleEnabled && (
                        <View style={styles.frequencySelector}>
                          <Text style={styles.label}>Frequency</Text>
                          <View style={styles.frequencyButtons}>
                            {(["daily", "weekly", "monthly"] as const).map((freq) => (
                              <TouchableOpacity
                                key={freq}
                                style={[
                                  styles.frequencyButton,
                                  frequency === freq && styles.frequencyButtonActive,
                                ]}
                                onPress={() => setFrequency(freq)}
                              >
                                <Text
                                  style={[
                                    styles.frequencyButtonText,
                                    frequency === freq && styles.frequencyButtonTextActive,
                                  ]}
                                >
                                  {freq.toUpperCase()}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Generated Prompt Preview */}
                  {allVariablesFilled && (
                    <View style={styles.promptPreview}>
                      <Text style={styles.promptPreviewLabel}>Prompt Preview</Text>
                      <ScrollView style={styles.promptPreviewScroll}>
                        <Text style={styles.promptPreviewText}>
                          {fillPrompt(selectedTemplate, variables)}
                        </Text>
                      </ScrollView>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <TouchableOpacity
                    style={[
                      styles.generateButton,
                      !allVariablesFilled && styles.generateButtonDisabled,
                    ]}
                    onPress={handleGenerate}
                    disabled={!allVariablesFilled}
                  >
                    <Text style={styles.generateButtonText}>
                      {scheduleEnabled
                        ? `📅 Schedule ${frequency.toUpperCase()}`
                        : "🚀 Run Research Now"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  triggerButton: {
    backgroundColor: TufteColors.dataAccent,
    paddingVertical: TufteSpacing.md,
    paddingHorizontal: TufteSpacing.lg,
    marginTop: TufteSpacing.md,
    borderWidth: 1,
    borderColor: TufteColors.dataAccent,
  },
  triggerButtonText: {
    fontSize: TufteTypography.fontSize.base,
    color: TufteColors.paper,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: TufteColors.paper,
    borderTopWidth: 3,
    borderTopColor: TufteColors.dataAccent,
    maxHeight: "95%",
    padding: TufteSpacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: TufteSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: TufteColors.border,
    paddingBottom: TufteSpacing.md,
  },
  modalTitle: {
    fontSize: TufteTypography.fontSize.xl,
    fontWeight: "600" as const,
    color: TufteColors.text,
  },
  modalSubtitle: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textSecondary,
    marginTop: TufteSpacing.xs / 2,
  },
  closeButton: {
    padding: TufteSpacing.xs,
  },
  closeButtonText: {
    fontSize: 32,
    color: TufteColors.textSecondary,
    lineHeight: 32,
  },
  sectionTitle: {
    fontSize: TufteTypography.fontSize.base,
    fontWeight: "600" as const,
    color: TufteColors.text,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: TufteSpacing.lg,
    marginBottom: TufteSpacing.md,
  },
  categorySection: {
    marginBottom: TufteSpacing.lg,
  },
  categoryLabel: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    letterSpacing: 1,
    marginBottom: TufteSpacing.sm,
  },
  templateCard: {
    backgroundColor: TufteColors.background,
    padding: TufteSpacing.md,
    marginBottom: TufteSpacing.sm,
    borderWidth: 1,
    borderColor: TufteColors.border,
  },
  templateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: TufteSpacing.xs,
  },
  templateName: {
    fontSize: TufteTypography.fontSize.base,
    fontWeight: "500" as const,
    color: TufteColors.text,
    flex: 1,
  },
  schedulableBadge: {
    backgroundColor: TufteColors.dataAccent,
    paddingHorizontal: TufteSpacing.sm,
    paddingVertical: TufteSpacing.xs / 2,
    marginLeft: TufteSpacing.sm,
  },
  schedulableBadgeText: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.paper,
  },
  templateDescription: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textSecondary,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.sm,
  },
  backButton: {
    marginBottom: TufteSpacing.md,
  },
  backButtonText: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.dataAccent,
  },
  selectedTemplateInfo: {
    backgroundColor: TufteColors.background,
    padding: TufteSpacing.md,
    marginBottom: TufteSpacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: TufteColors.dataAccent,
  },
  selectedTemplateName: {
    fontSize: TufteTypography.fontSize.lg,
    fontWeight: "600" as const,
    color: TufteColors.text,
    marginBottom: TufteSpacing.xs,
  },
  selectedTemplateDesc: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textSecondary,
  },
  variableInput: {
    marginBottom: TufteSpacing.md,
  },
  label: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: TufteSpacing.xs / 2,
  },
  variableHint: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    marginBottom: TufteSpacing.xs,
    fontStyle: "italic",
  },
  input: {
    backgroundColor: TufteColors.background,
    color: TufteColors.text,
    padding: TufteSpacing.md,
    fontSize: TufteTypography.fontSize.base,
    borderWidth: 1,
    borderColor: TufteColors.border,
  },
  agentSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: TufteSpacing.sm,
    marginBottom: TufteSpacing.lg,
  },
  agentCard: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: TufteColors.background,
    padding: TufteSpacing.md,
    borderWidth: 1,
    borderColor: TufteColors.border,
  },
  agentCardActive: {
    backgroundColor: TufteColors.dataAccent,
    borderColor: TufteColors.dataAccent,
  },
  agentName: {
    fontSize: TufteTypography.fontSize.sm,
    fontWeight: "500" as const,
    color: TufteColors.text,
    marginBottom: TufteSpacing.xs / 2,
  },
  agentNameActive: {
    color: TufteColors.paper,
  },
  agentDesc: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textSecondary,
    marginBottom: TufteSpacing.xs / 2,
  },
  agentDescActive: {
    color: TufteColors.paper,
  },
  agentModel: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    fontStyle: "italic",
  },
  agentModelActive: {
    color: TufteColors.paper,
  },
  scheduleSection: {
    backgroundColor: TufteColors.background,
    padding: TufteSpacing.md,
    marginBottom: TufteSpacing.lg,
    borderWidth: 1,
    borderColor: TufteColors.border,
  },
  scheduleToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: TufteSpacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: TufteColors.text,
    marginRight: TufteSpacing.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: TufteColors.dataAccent,
    borderColor: TufteColors.dataAccent,
  },
  checkmark: {
    color: TufteColors.paper,
    fontSize: 14,
    fontWeight: "bold",
  },
  scheduleLabel: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.text,
  },
  frequencySelector: {
    marginTop: TufteSpacing.sm,
  },
  frequencyButtons: {
    flexDirection: "row",
    gap: TufteSpacing.sm,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: TufteSpacing.md,
    borderWidth: 1,
    borderColor: TufteColors.border,
    backgroundColor: TufteColors.paper,
    alignItems: "center",
  },
  frequencyButtonActive: {
    backgroundColor: TufteColors.text,
    borderColor: TufteColors.text,
  },
  frequencyButtonText: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textSecondary,
    fontWeight: "600" as const,
  },
  frequencyButtonTextActive: {
    color: TufteColors.paper,
  },
  promptPreview: {
    backgroundColor: TufteColors.background,
    padding: TufteSpacing.md,
    marginBottom: TufteSpacing.lg,
    borderWidth: 1,
    borderColor: TufteColors.border,
  },
  promptPreviewLabel: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: TufteSpacing.sm,
  },
  promptPreviewScroll: {
    maxHeight: 150,
  },
  promptPreviewText: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.text,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.xs,
    fontFamily: "monospace",
  },
  generateButton: {
    backgroundColor: TufteColors.text,
    padding: TufteSpacing.lg,
    alignItems: "center",
    marginTop: TufteSpacing.md,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    fontSize: TufteTypography.fontSize.base,
    color: TufteColors.paper,
    fontWeight: "600" as const,
  },
});
