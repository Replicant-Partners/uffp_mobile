import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ForecastCard } from "../components/ForecastCard";
import { forecastService } from "../services/forecastService";
import { RootStackParamList } from "../App";
import { ForecastConfig } from "../types";
import { TufteColors, TufteTypography, TufteSpacing, TufteLayout } from "../styles/tufte";

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Home">;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const forecasts = forecastService.getExampleForecasts();
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForecasts, setSelectedForecasts] = useState<ForecastConfig[]>([]);

  const toggleForecastSelection = (config: ForecastConfig) => {
    const isSelected = selectedForecasts.some((f) => f.ticker === config.ticker);
    if (isSelected) {
      setSelectedForecasts(selectedForecasts.filter((f) => f.ticker !== config.ticker));
    } else {
      setSelectedForecasts([...selectedForecasts, config]);
    }
  };

  const handleCompare = () => {
    if (selectedForecasts.length >= 2) {
      navigation.navigate("Compare", { configs: selectedForecasts });
      setCompareMode(false);
      setSelectedForecasts([]);
    }
  };

  const handleCancelCompare = () => {
    setCompareMode(false);
    setSelectedForecasts([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Probabilistic Forecasting</Text>
        <Text style={styles.subtitle}>
          Tetlock Superforecasting methodology — Monte Carlo simulation — Brier scoring
        </Text>
      </View>

      <View style={styles.createSection}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate("CreateForecast")}
          >
            <Text style={styles.createButtonText}>New Forecast</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.createButton, styles.compareToggle]}
            onPress={() => setCompareMode(!compareMode)}
          >
            <Text style={styles.createButtonText}>{compareMode ? "Cancel" : "Compare"}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.createHint}>
          {compareMode
            ? `Select ${selectedForecasts.length >= 2 ? selectedForecasts.length : "2 or more"} forecasts to compare`
            : "Build probabilistic predictions with explicit uncertainty quantification"}
        </Text>
      </View>

      {compareMode && selectedForecasts.length >= 2 && (
        <View style={styles.compareActionSection}>
          <TouchableOpacity style={styles.compareButton} onPress={handleCompare}>
            <Text style={styles.compareButtonText}>
              Compare {selectedForecasts.length} Forecasts
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.performanceSection}>
        <Text style={styles.sectionLabel}>Performance Tracking</Text>
        <View style={styles.performanceButtonRow}>
          <TouchableOpacity
            style={styles.performanceButton}
            onPress={() => navigation.navigate("BrierScore")}
          >
            <Text style={styles.performanceButtonLabel}>Brier Score</Text>
            <Text style={styles.performanceButtonDesc}>Accuracy analysis</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.performanceButton}
            onPress={() => navigation.navigate("Calibration")}
          >
            <Text style={styles.performanceButtonLabel}>Calibration</Text>
            <Text style={styles.performanceButtonDesc}>Leaderboard & ranking</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>Example Forecasts</Text>

      <FlatList
        data={forecasts}
        keyExtractor={(item) => item.ticker}
        renderItem={({ item }) => {
          const isSelected = selectedForecasts.some((f) => f.ticker === item.ticker);
          return (
            <TouchableOpacity
              onPress={() =>
                compareMode
                  ? toggleForecastSelection(item)
                  : navigation.navigate("ForecastDetail", { config: item })
              }
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.forecastItem,
                  compareMode && isSelected && styles.forecastItemSelected,
                ]}
              >
                {compareMode && (
                  <View style={styles.checkbox}>
                    {isSelected && <View style={styles.checkboxInner} />}
                  </View>
                )}
                <View style={styles.forecastCardWrapper}>
                  <ForecastCard
                    config={item}
                    onPress={() =>
                      compareMode
                        ? toggleForecastSelection(item)
                        : navigation.navigate("ForecastDetail", { config: item })
                    }
                  />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TufteColors.background,
  },
  header: {
    paddingHorizontal: TufteLayout.marginHorizontal,
    paddingTop: TufteSpacing.xl,
    paddingBottom: TufteSpacing.lg,
  },
  title: {
    fontSize: TufteTypography.fontSize.display,
    fontWeight: '400' as const,
    color: TufteColors.text,
    letterSpacing: -0.5,
    marginBottom: TufteSpacing.sm,
  },
  subtitle: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textSecondary,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.sm,
    maxWidth: TufteLayout.maxWidth,
  },
  createSection: {
    paddingHorizontal: TufteLayout.marginHorizontal,
    marginBottom: TufteSpacing.lg,
  },
  buttonRow: {
    flexDirection: "row",
    gap: TufteSpacing.md,
    marginBottom: TufteSpacing.sm,
  },
  createButton: {
    borderWidth: 1,
    borderColor: TufteColors.text,
    paddingVertical: TufteSpacing.md,
    paddingHorizontal: TufteSpacing.lg,
  },
  compareToggle: {
    backgroundColor: TufteColors.background,
  },
  createButtonText: {
    fontSize: TufteTypography.fontSize.base,
    color: TufteColors.text,
    fontWeight: '500' as const,
    letterSpacing: 0.3,
  },
  createHint: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.xs,
    maxWidth: 400,
  },
  compareActionSection: {
    paddingHorizontal: TufteLayout.marginHorizontal,
    marginBottom: TufteSpacing.md,
  },
  compareButton: {
    backgroundColor: TufteColors.text,
    paddingVertical: TufteSpacing.md,
    paddingHorizontal: TufteSpacing.lg,
    alignSelf: "flex-start",
  },
  compareButtonText: {
    fontSize: TufteTypography.fontSize.base,
    color: TufteColors.paper,
    fontWeight: '500' as const,
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: TufteColors.grid,
    marginHorizontal: TufteLayout.marginHorizontal,
    marginVertical: TufteSpacing.lg,
  },
  performanceSection: {
    paddingHorizontal: TufteLayout.marginHorizontal,
    marginBottom: TufteSpacing.lg,
  },
  performanceButtonRow: {
    flexDirection: "row",
    gap: TufteSpacing.md,
  },
  performanceButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: TufteColors.border,
    backgroundColor: TufteColors.paper,
    padding: TufteSpacing.lg,
  },
  performanceButtonLabel: {
    fontSize: TufteTypography.fontSize.base,
    fontWeight: '500' as const,
    color: TufteColors.text,
    marginBottom: TufteSpacing.xs,
  },
  performanceButtonDesc: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textSecondary,
  },
  sectionLabel: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: TufteLayout.marginHorizontal,
    marginBottom: TufteSpacing.md,
  },
  listContent: {
    paddingBottom: TufteSpacing.xxl,
  },
  forecastItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: TufteLayout.marginHorizontal,
    paddingVertical: TufteSpacing.xs,
  },
  forecastItemSelected: {
    backgroundColor: TufteColors.backgroundSecondary,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: TufteColors.text,
    marginRight: TufteSpacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: TufteColors.text,
  },
  forecastCardWrapper: {
    flex: 1,
  },
});
