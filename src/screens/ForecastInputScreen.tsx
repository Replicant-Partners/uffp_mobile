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

export default function ForecastInputScreen() {
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!userInput.trim()) {
      setError("Please enter a question");
      return;
    }

    setLoading(true);
    setError(null);
    setParsedResult(null);

    try {
      const result = await researchService.parseQuestion(userInput);
      setParsedResult(result.parsed || result);
    } catch (err: any) {
      setError(err.message || "Failed to parse question");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForecast = async () => {
    if (!parsedResult) return;

    setLoading(true);
    setError(null);

    try {
      const result = await researchService.createForecast({
        question: parsedResult.question,
        domain: parsedResult.domain,
        timeframe: parsedResult.timeframe,
        resolutionCriteria: `This forecast will resolve as YES if: ${parsedResult.question}`,
      });

      setForecast(result.forecast);
    } catch (err: any) {
      setError(err.message || "Failed to create forecast");
    } finally {
      setLoading(false);
    }
  };

  const handleAddDriver = async (suggestedDriver: string) => {
    if (!forecast) return;

    setLoading(true);
    setError(null);

    try {
      await researchService.addDriver(forecast.id, {
        name: suggestedDriver,
        description: `Driver suggested by AI: ${suggestedDriver}`,
        direction: "increases",
        magnitude: "medium",
      });

      // Refresh forecast
      const updatedForecast = await researchService.getForecast(forecast.id);
      setForecast(updatedForecast.forecast);
    } catch (err: any) {
      setError(err.message || "Failed to add driver");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    if (!forecast) return;

    setLoading(true);
    setError(null);

    try {
      const result = await researchService.simulate(forecast.id, 10000);
      setForecast(result.forecast);
    } catch (err: any) {
      setError(err.message || "Failed to run simulation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Universal Forecasting</Text>
        <Text style={styles.subtitle}>Ask any question about the future</Text>

        <TextInput
          style={styles.input}
          placeholder="e.g., Will SpaceX land on Mars by 2030?"
          value={userInput}
          onChangeText={setUserInput}
          multiline
          numberOfLines={3}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleParse}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Parse Question</Text>
          )}
        </TouchableOpacity>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {parsedResult && !forecast && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Parsed Result</Text>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Question:</Text>
              <Text style={styles.resultValue}>{parsedResult.question}</Text>
            </View>

            {parsedResult.domain && (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Domain:</Text>
                <Text style={styles.resultValue}>{parsedResult.domain}</Text>
              </View>
            )}

            {parsedResult.timeframe && (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Timeframe:</Text>
                <Text style={styles.resultValue}>{parsedResult.timeframe}</Text>
              </View>
            )}

            {parsedResult.suggestedDrivers &&
              parsedResult.suggestedDrivers.length > 0 && (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Suggested Drivers:</Text>
                  {parsedResult.suggestedDrivers.map(
                    (driver: string, index: number) => (
                      <Text key={index} style={styles.driverItem}>
                        • {driver}
                      </Text>
                    ),
                  )}
                </View>
              )}

            {parsedResult.confidence != null && (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Confidence:</Text>
                <Text style={styles.resultValue}>
                  {(parsedResult.confidence * 100).toFixed(0)}%
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={handleCreateForecast}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Create Forecast</Text>
            </TouchableOpacity>
          </View>
        )}

        {forecast && (
          <View style={styles.forecastContainer}>
            <Text style={styles.resultTitle}>Forecast Created</Text>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Question:</Text>
              <Text style={styles.resultValue}>{forecast.question}</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Status:</Text>
              <Text style={styles.resultValue}>{forecast.status}</Text>
            </View>

            {forecast.drivers && forecast.drivers.length > 0 && (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Drivers Added:</Text>
                {forecast.drivers.map((driver: any) => (
                  <Text key={driver.id} style={styles.driverItem}>
                    • {driver.name} ({driver.direction}, {driver.magnitude})
                  </Text>
                ))}
              </View>
            )}

            {parsedResult?.suggestedDrivers &&
              parsedResult.suggestedDrivers.length > 0 && (
                <View style={styles.suggestedDriversContainer}>
                  <Text style={styles.resultLabel}>Add Suggested Drivers:</Text>
                  {parsedResult.suggestedDrivers.map(
                    (driver: string, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.driverButton}
                        onPress={() => handleAddDriver(driver)}
                        disabled={loading}
                      >
                        <Text style={styles.driverButtonText}>+ {driver}</Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              )}

            {forecast.probability !== null &&
              forecast.probability !== undefined && (
                <View style={styles.probabilityContainer}>
                  <Text style={styles.probabilityLabel}>Probability:</Text>
                  <Text style={styles.probabilityValue}>
                    {(forecast.probability * 100).toFixed(1)}%
                  </Text>
                </View>
              )}

            <TouchableOpacity
              style={[styles.button, styles.simulateButton]}
              onPress={handleSimulate}
              disabled={loading || forecast.drivers.length === 0}
            >
              <Text style={styles.buttonText}>
                {forecast.probability !== null
                  ? "Re-run Simulation"
                  : "Run Simulation"}
              </Text>
            </TouchableOpacity>

            {forecast.drivers.length === 0 && (
              <Text style={styles.helperText}>
                Add at least one driver to run simulation
              </Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#282828", // gruvbox bg
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ebdbb2", // gruvbox fg
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#d5c4a1", // gruvbox fg2
    marginBottom: 24,
  },
  input: {
    backgroundColor: "#3c3836", // gruvbox bg1
    borderWidth: 1,
    borderColor: "#665c54", // gruvbox bg3
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
    color: "#ebdbb2", // gruvbox fg
  },
  button: {
    backgroundColor: "#458588", // gruvbox blue
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: "#504945", // gruvbox bg2
  },
  buttonText: {
    color: "#ebdbb2", // gruvbox fg
    fontSize: 16,
    fontWeight: "600",
  },
  createButton: {
    backgroundColor: "#98971a", // gruvbox green
    marginTop: 16,
  },
  simulateButton: {
    backgroundColor: "#d79921", // gruvbox yellow
    marginTop: 16,
  },
  errorContainer: {
    backgroundColor: "#cc241d", // gruvbox red
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#ebdbb2", // gruvbox fg
    fontSize: 14,
  },
  resultContainer: {
    backgroundColor: "#3c3836", // gruvbox bg1
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#665c54", // gruvbox bg3
  },
  forecastContainer: {
    backgroundColor: "#3c3836", // gruvbox bg1
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#665c54", // gruvbox bg3
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ebdbb2", // gruvbox fg
    marginBottom: 16,
  },
  resultRow: {
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#d5c4a1", // gruvbox fg2
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 16,
    color: "#ebdbb2", // gruvbox fg
  },
  driverItem: {
    fontSize: 14,
    color: "#ebdbb2", // gruvbox fg
    marginLeft: 8,
    marginTop: 4,
  },
  suggestedDriversContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  driverButton: {
    backgroundColor: "#504945", // gruvbox bg2
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#665c54", // gruvbox bg3
  },
  driverButtonText: {
    color: "#83a598", // gruvbox bright blue
    fontSize: 14,
    fontWeight: "500",
  },
  probabilityContainer: {
    backgroundColor: "#504945", // gruvbox bg2
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d79921", // gruvbox yellow
  },
  probabilityLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#d5c4a1", // gruvbox fg2
    marginBottom: 8,
  },
  probabilityValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fabd2f", // gruvbox bright yellow
  },
  helperText: {
    fontSize: 12,
    color: "#bdae93", // gruvbox fg3
    textAlign: "center",
    marginTop: 8,
  },
});
