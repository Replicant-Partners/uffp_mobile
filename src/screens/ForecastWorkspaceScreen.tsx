import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { researchService } from "../services/researchService";

export default function ForecastWorkspaceScreen() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const handleParse = async () => {
    if (!question.trim()) {
      setError("Please enter a question");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await researchService.parseQuestion(question);
      const parsed = result.parsed || result;
      setParsedResult(parsed);
    } catch (err: any) {
      setError(err.message || "Failed to parse question");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.workspace}>
        {/* Main Question Input */}
        <View style={styles.questionSection}>
          <TextInput
            style={styles.questionInput}
            placeholder="What do you want to forecast?"
            placeholderTextColor="#928374"
            value={question}
            onChangeText={setQuestion}
            multiline
            autoFocus
          />

          <TouchableOpacity
            style={[styles.parseButton, loading && styles.parseButtonDisabled]}
            onPress={handleParse}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#282828" />
            ) : (
              <Text style={styles.parseButtonText}>Parse Question</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Parsed Result */}
        {parsedResult && (
          <View style={styles.resultSection}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultQuestion}>{parsedResult.question}</Text>
              {parsedResult.domain && (
                <Text style={styles.metadata}>
                  {parsedResult.domain} · {parsedResult.timeframe} ·{" "}
                  {Math.round(parsedResult.confidence * 100)}% confidence
                </Text>
              )}
            </View>

            {/* Suggested Drivers */}
            {parsedResult.suggestedDrivers &&
              parsedResult.suggestedDrivers.length > 0 && (
                <View style={styles.driversSection}>
                  <Text style={styles.sectionLabel}>Suggested Drivers</Text>
                  {parsedResult.suggestedDrivers.map(
                    (driver: string, idx: number) => (
                      <View key={idx} style={styles.driverCard}>
                        <Text style={styles.driverName}>{driver}</Text>
                      </View>
                    ),
                  )}
                </View>
              )}

            {/* Next Steps Hint */}
            <View style={styles.hintCard}>
              <Text style={styles.hintText}>
                Next: Type{" "}
                <Text style={styles.hintCommand}>/driver Driver name</Text> to
                add a driver
              </Text>
            </View>
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
    paddingTop: 60, // Extra space at top
  },
  questionSection: {
    marginBottom: 32,
  },
  questionInput: {
    fontSize: 28,
    fontWeight: "400",
    color: "#ebdbb2",
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: "top",
    lineHeight: 38,
  },
  parseButton: {
    backgroundColor: "#fabd2f",
    padding: 18,
    borderRadius: 8,
    alignItems: "center",
  },
  parseButtonDisabled: {
    backgroundColor: "#504945",
  },
  parseButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#282828",
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
  resultSection: {
    marginTop: 24,
  },
  resultHeader: {
    marginBottom: 24,
  },
  resultQuestion: {
    fontSize: 24,
    fontWeight: "500",
    color: "#ebdbb2",
    marginBottom: 8,
  },
  metadata: {
    fontSize: 13,
    color: "#928374",
  },
  driversSection: {
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
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#458588",
  },
  driverName: {
    fontSize: 15,
    color: "#ebdbb2",
  },
  hintCard: {
    backgroundColor: "#3c3836",
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#b8bb26",
  },
  hintText: {
    fontSize: 13,
    color: "#d5c4a1",
  },
  hintCommand: {
    fontWeight: "600",
    color: "#fabd2f",
  },
});
