import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  researchService,
  ResearchResult,
  ScheduledResearch,
} from "../services/researchService";

const ResearchScreen: React.FC = () => {
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledResearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState("research_analyst");
  const [selectedPrompt, setSelectedPrompt] = useState("market_tam_sizing");
  const [variables, setVariables] = useState<Record<string, string>>({});

  const agents = [
    { id: "research_analyst", name: "Research Analyst" },
    { id: "sentiment_monitor", name: "Sentiment Monitor" },
    { id: "competitive_intel", name: "Competitive Intelligence" },
  ];

  const prompts = [
    {
      id: "market_tam_sizing",
      name: "Market Sizing",
      variables: ["MARKET_SEGMENT", "GEOGRAPHY"],
    },
    {
      id: "sentiment_tracking",
      name: "Sentiment Tracking",
      variables: ["COMPANY_OR_PRODUCT", "TIME_PERIOD"],
    },
    {
      id: "competitor_benchmarking",
      name: "Competitor Analysis",
      variables: ["COMPETITOR_NAME", "MARKET_SEGMENT"],
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [resultsData, scheduledData] = await Promise.all([
        researchService.getResearchResults(20),
        researchService.getScheduledResearch(),
      ]);

      setResults(resultsData.results);
      setScheduled(scheduledData.scheduled);
    } catch (error) {
      Alert.alert("Error", "Failed to load research data");
    } finally {
      setLoading(false);
    }
  };

  const executeResearch = async () => {
    try {
      const requiredVars =
        prompts.find((p) => p.id === selectedPrompt)?.variables || [];
      const missingVars = requiredVars.filter(
        (v) => !variables[v] || variables[v].trim() === "",
      );

      if (missingVars.length > 0) {
        Alert.alert("Error", `Missing variables: ${missingVars.join(", ")}`);
        return;
      }

      setLoading(true);
      const result = await researchService.executeResearch({
        agentId: selectedAgent,
        promptId: selectedPrompt,
        variables,
      });

      Alert.alert("Success", "Research completed successfully");
      setResults([result.result, ...results]);
      setVariables({});
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Research failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const scheduleResearch = async () => {
    try {
      const requiredVars =
        prompts.find((p) => p.id === selectedPrompt)?.variables || [];
      const missingVars = requiredVars.filter(
        (v) => !variables[v] || variables[v].trim() === "",
      );

      if (missingVars.length > 0) {
        Alert.alert("Error", `Missing variables: ${missingVars.join(", ")}`);
        return;
      }

      setLoading(true);
      await researchService.scheduleResearch(
        selectedAgent,
        selectedPrompt,
        "weekly",
        variables,
      );

      Alert.alert("Success", "Research scheduled successfully");
      loadData();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Scheduling failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedPromptConfig = prompts.find((p) => p.id === selectedPrompt);

  if (loading && results.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading research data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Research Agents</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Execute Research</Text>

        <Text style={styles.label}>Agent:</Text>
        {agents.map((agent) => (
          <TouchableOpacity
            key={agent.id}
            style={[
              styles.option,
              selectedAgent === agent.id && styles.selectedOption,
            ]}
            onPress={() => setSelectedAgent(agent.id)}
          >
            <Text style={styles.optionText}>{agent.name}</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>Prompt:</Text>
        {prompts.map((prompt) => (
          <TouchableOpacity
            key={prompt.id}
            style={[
              styles.option,
              selectedPrompt === prompt.id && styles.selectedOption,
            ]}
            onPress={() => setSelectedPrompt(prompt.id)}
          >
            <Text style={styles.optionText}>{prompt.name}</Text>
          </TouchableOpacity>
        ))}

        {selectedPromptConfig?.variables.map((variable) => (
          <View key={variable} style={styles.inputGroup}>
            <Text style={styles.label}>{variable}:</Text>
            <TextInput
              style={styles.input}
              value={variables[variable] || ""}
              onChangeText={(text) =>
                setVariables({ ...variables, [variable]: text })
              }
              placeholder={`Enter ${variable}`}
            />
          </View>
        ))}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={executeResearch}>
            <Text style={styles.buttonText}>Run Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.scheduleButton]}
            onPress={scheduleResearch}
          >
            <Text style={styles.buttonText}>Schedule Weekly</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Results</Text>
        {results.map((result) => (
          <View key={result.id} style={styles.resultCard}>
            <Text style={styles.resultTitle}>
              {prompts.find((p) => p.id === result.promptId)?.name ||
                result.promptId}
            </Text>
            <Text style={styles.resultDate}>
              {new Date(result.timestamp).toLocaleDateString()}
            </Text>
            <Text style={styles.resultSummary}>{result.summary}</Text>
            <Text style={styles.confidence}>
              Confidence: {result.confidence}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scheduled Research</Text>
        {scheduled.map((item) => (
          <View key={item.id} style={styles.scheduleCard}>
            <Text style={styles.scheduleTitle}>
              {prompts.find((p) => p.id === item.promptId)?.name ||
                item.promptId}
            </Text>
            <Text style={styles.scheduleFrequency}>
              Frequency: {item.frequency}
            </Text>
            <Text style={styles.scheduleNext}>
              Next run: {new Date(item.nextRun).toLocaleDateString()}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#000",
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#000",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#000",
  },
  option: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedOption: {
    backgroundColor: "#f0f0f0",
    borderColor: "#000",
  },
  optionText: {
    fontSize: 14,
    color: "#000",
  },
  inputGroup: {
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#000",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    flex: 1,
    backgroundColor: "#000",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  scheduleButton: {
    backgroundColor: "#333",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resultCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  resultDate: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  resultSummary: {
    fontSize: 14,
    color: "#333",
    marginTop: 8,
    lineHeight: 20,
  },
  confidence: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#666",
    marginTop: 8,
  },
  scheduleCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 10,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  scheduleFrequency: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  scheduleNext: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
});

export default ResearchScreen;
