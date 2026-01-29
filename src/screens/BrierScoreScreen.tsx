import React from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Dimensions } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LineChart } from "react-native-chart-kit";
import { RootStackParamList } from "../App";
import { TufteColors, TufteTypography, TufteSpacing, TufteLayout } from "../styles/tufte";
import { InfoTooltip } from "../components/InfoTooltip";
import { GLOSSARY } from "../constants/glossary";

type BrierScoreScreenProps = NativeStackScreenProps<RootStackParamList, "BrierScore">;

// Synthetic data: Past forecasts with actual outcomes and Brier scores
const syntheticForecasts = [
  {
    id: 1,
    ticker: "ASTS",
    question: "Will ASTS reach $150M revenue by Q4 2024?",
    forecastProbability: 0.65,
    actualOutcome: 1, // Yes
    brierScore: 0.1225, // (0.65 - 1)^2
    date: "2024-01-15",
    resolvedDate: "2024-12-31",
  },
  {
    id: 2,
    ticker: "TSLA",
    question: "Will TSLA exceed $100B revenue in 2024?",
    forecastProbability: 0.72,
    actualOutcome: 1, // Yes
    brierScore: 0.0784, // (0.72 - 1)^2
    date: "2024-02-01",
    resolvedDate: "2025-01-15",
  },
  {
    id: 3,
    ticker: "RIVN",
    question: "Will RIVN be profitable by end of 2024?",
    forecastProbability: 0.25,
    actualOutcome: 0, // No
    brierScore: 0.0625, // (0.25 - 0)^2
    date: "2024-02-10",
    resolvedDate: "2024-12-31",
  },
  {
    id: 4,
    ticker: "PLTR",
    question: "Will PLTR reach $3B revenue in 2024?",
    forecastProbability: 0.58,
    actualOutcome: 0, // No
    brierScore: 0.3364, // (0.58 - 0)^2
    date: "2024-03-01",
    resolvedDate: "2024-12-31",
  },
  {
    id: 5,
    ticker: "NVDA",
    question: "Will NVDA exceed $60B revenue in 2024?",
    forecastProbability: 0.88,
    actualOutcome: 1, // Yes
    brierScore: 0.0144, // (0.88 - 1)^2
    date: "2024-03-15",
    resolvedDate: "2025-01-20",
  },
  {
    id: 6,
    ticker: "META",
    question: "Will META reach $140B revenue in 2024?",
    forecastProbability: 0.78,
    actualOutcome: 1, // Yes
    brierScore: 0.0484, // (0.78 - 1)^2
    date: "2024-04-01",
    resolvedDate: "2025-01-25",
  },
  {
    id: 7,
    ticker: "UBER",
    question: "Will UBER be profitable all 4 quarters of 2024?",
    forecastProbability: 0.62,
    actualOutcome: 1, // Yes
    brierScore: 0.1444, // (0.62 - 1)^2
    date: "2024-04-15",
    resolvedDate: "2024-12-31",
  },
  {
    id: 8,
    ticker: "COIN",
    question: "Will COIN exceed $5B revenue in 2024?",
    forecastProbability: 0.42,
    actualOutcome: 0, // No
    brierScore: 0.1764, // (0.42 - 0)^2
    date: "2024-05-01",
    resolvedDate: "2024-12-31",
  },
];

export const BrierScoreScreen: React.FC<BrierScoreScreenProps> = () => {
  const screenWidth = Dimensions.get("window").width;

  // Calculate average Brier score
  const avgBrierScore =
    syntheticForecasts.reduce((sum, f) => sum + f.brierScore, 0) / syntheticForecasts.length;

  // Calculate cumulative Brier score over time
  const cumulativeScores = syntheticForecasts.map((_, index) => {
    const subset = syntheticForecasts.slice(0, index + 1);
    return subset.reduce((sum, f) => sum + f.brierScore, 0) / subset.length;
  });

  // Separate correct and incorrect predictions
  const correctPredictions = syntheticForecasts.filter(
    (f) =>
      (f.forecastProbability >= 0.5 && f.actualOutcome === 1) ||
      (f.forecastProbability < 0.5 && f.actualOutcome === 0),
  );

  const accuracy = (correctPredictions.length / syntheticForecasts.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Brier Score Analysis</Text>
            <InfoTooltip
              term={GLOSSARY.BRIER_SCORE.term}
              definition={GLOSSARY.BRIER_SCORE.definition}
              example={GLOSSARY.BRIER_SCORE.example}
            />
          </View>
          <Text style={styles.subtitle}>
            Probabilistic forecast accuracy · Lower scores indicate better calibration · Range: 0.0
            (perfect) to 1.0 (worst)
          </Text>
        </View>

        {/* Summary Statistics */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionLabel}>Performance Summary</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{avgBrierScore.toFixed(3)}</Text>
              <InfoTooltip
                term={GLOSSARY.BRIER_SCORE.term}
                definition={GLOSSARY.BRIER_SCORE.definition}
                example={GLOSSARY.BRIER_SCORE.example}
              />
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{syntheticForecasts.length}</Text>
              <Text style={styles.statLabel}>Total Forecasts</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{accuracy.toFixed(0)}%</Text>
              <Text style={styles.statLabel}>Binary Accuracy</Text>
            </View>
          </View>

          <View style={styles.interpretationBox}>
            <Text style={styles.interpretationTitle}>Interpretation</Text>
            <Text style={styles.interpretationText}>
              {avgBrierScore < 0.1 &&
                "Excellent calibration. Your probabilistic predictions are highly accurate."}
              {avgBrierScore >= 0.1 &&
                avgBrierScore < 0.15 &&
                "Good calibration. Your forecasts demonstrate solid probabilistic reasoning."}
              {avgBrierScore >= 0.15 &&
                avgBrierScore < 0.25 &&
                "Moderate calibration. Room for improvement in uncertainty quantification."}
              {avgBrierScore >= 0.25 &&
                "Poor calibration. Consider revising your forecasting methodology."}
            </Text>
          </View>
        </View>

        {/* Brier Score Trend */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionLabel}>Calibration Trend Over Time</Text>
          <View style={styles.chartContainer}>
            <LineChart
              data={{
                labels: syntheticForecasts.map((_, i) => `F${i + 1}`),
                datasets: [
                  {
                    data: cumulativeScores,
                    color: (opacity = 1) => TufteColors.dataAccent,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={screenWidth - TufteLayout.marginHorizontal * 2 - TufteSpacing.md * 2}
              height={200}
              chartConfig={{
                backgroundColor: TufteColors.paper,
                backgroundGradientFrom: TufteColors.paper,
                backgroundGradientTo: TufteColors.paper,
                color: (opacity = 1) => TufteColors.dataAccent,
                labelColor: (opacity = 1) => TufteColors.text,
                decimalPlaces: 3,
                propsForBackgroundLines: {
                  stroke: TufteColors.grid,
                  strokeWidth: 0.5,
                },
                propsForLabels: {
                  fontSize: 9,
                  fill: TufteColors.text,
                },
                propsForDots: {
                  r: "3",
                  strokeWidth: "1",
                  stroke: TufteColors.dataAccent,
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>
          <Text style={styles.chartCaption}>
            Figure 1. Rolling average Brier score across {syntheticForecasts.length} resolved
            forecasts. Lower values indicate improving calibration.
          </Text>
        </View>

        {/* Detailed Forecast History */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Forecast History</Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Question</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.7, textAlign: "center" }]}>
                Prob.
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.7, textAlign: "center" }]}>
                Actual
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.7, textAlign: "right" }]}>Brier</Text>
            </View>

            {syntheticForecasts.map((forecast) => (
              <View key={forecast.id} style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.questionText}>{forecast.question}</Text>
                  <Text style={styles.metaText}>
                    {forecast.ticker} · Forecast: {forecast.date}
                  </Text>
                </View>
                <Text style={[styles.tableCell, { flex: 0.7, textAlign: "center" }]}>
                  {(forecast.forecastProbability * 100).toFixed(0)}%
                </Text>
                <Text style={[styles.tableCell, { flex: 0.7, textAlign: "center" }]}>
                  {forecast.actualOutcome === 1 ? "Yes" : "No"}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { flex: 0.7, textAlign: "right" },
                    forecast.brierScore < 0.1 && styles.goodScore,
                    forecast.brierScore >= 0.25 && styles.poorScore,
                  ]}
                >
                  {forecast.brierScore.toFixed(3)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Methodology */}
        <View style={styles.methodologySection}>
          <Text style={styles.methodologyTitle}>Brier Score Formula</Text>
          <Text style={styles.formulaText}>
            Brier Score = (forecast_probability - actual_outcome)²
          </Text>
          <Text style={styles.methodologyText}>
            The Brier score measures the accuracy of probabilistic predictions. For each forecast,
            we calculate the squared difference between the predicted probability and the actual
            binary outcome (0 or 1). A score of 0.0 represents perfect prediction, while 1.0
            represents maximum error. The average Brier score across multiple forecasts provides a
            measure of overall calibration quality. Scores below 0.15 are considered good,
            indicating well-calibrated probabilistic reasoning.
          </Text>
        </View>
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
    paddingBottom: TufteSpacing.xxl * 2,
  },
  header: {
    padding: TufteLayout.marginHorizontal,
    paddingTop: TufteSpacing.lg,
    paddingBottom: TufteSpacing.md,
    borderBottomWidth: 2,
    borderBottomColor: TufteColors.dataAccent,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: TufteSpacing.md,
    marginBottom: TufteSpacing.xs,
  },
  title: {
    fontSize: TufteTypography.fontSize.xxl,
    fontWeight: '700' as const,
    color: TufteColors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textSecondary,
    marginTop: TufteSpacing.xs,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.xs,
  },
  summarySection: {
    padding: TufteLayout.marginHorizontal,
    paddingVertical: TufteSpacing.xl,
    backgroundColor: TufteColors.paper,
    borderBottomWidth: 1,
    borderBottomColor: TufteColors.border,
  },
  sectionLabel: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: TufteSpacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    gap: TufteSpacing.md,
    marginBottom: TufteSpacing.lg,
  },
  statCard: {
    flex: 1,
    padding: TufteSpacing.md,
    borderWidth: 1,
    borderColor: TufteColors.border,
    backgroundColor: TufteColors.background,
  },
  statValue: {
    fontSize: TufteTypography.fontSize.xxl,
    fontWeight: '700' as const,
    color: TufteColors.dataAccent,
    marginBottom: TufteSpacing.xs,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  interpretationBox: {
    borderLeftWidth: 3,
    borderLeftColor: TufteColors.dataAccent,
    paddingLeft: TufteSpacing.md,
    marginTop: TufteSpacing.md,
  },
  interpretationTitle: {
    fontSize: TufteTypography.fontSize.sm,
    fontWeight: '600' as const,
    color: TufteColors.text,
    marginBottom: TufteSpacing.xs,
  },
  interpretationText: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textSecondary,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.sm,
  },
  chartSection: {
    paddingVertical: TufteSpacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: TufteColors.grid,
  },
  chartContainer: {
    backgroundColor: TufteColors.paper,
    marginHorizontal: TufteLayout.marginHorizontal,
    padding: TufteSpacing.md,
    borderWidth: 1,
    borderColor: TufteColors.border,
  },
  chart: {
    marginVertical: TufteSpacing.sm,
  },
  chartCaption: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    fontStyle: "italic",
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.xs,
    marginTop: TufteSpacing.sm,
    marginHorizontal: TufteLayout.marginHorizontal,
  },
  section: {
    padding: TufteLayout.marginHorizontal,
    paddingVertical: TufteSpacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: TufteColors.grid,
  },
  table: {
    borderWidth: 1,
    borderColor: TufteColors.border,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: TufteColors.background,
    borderBottomWidth: 1,
    borderBottomColor: TufteColors.dataAccent,
    paddingVertical: TufteSpacing.sm,
    paddingHorizontal: TufteSpacing.sm,
  },
  tableHeaderCell: {
    fontSize: TufteTypography.fontSize.xs,
    fontWeight: '600' as const,
    color: TufteColors.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: TufteColors.grid,
    paddingVertical: TufteSpacing.md,
    paddingHorizontal: TufteSpacing.sm,
    alignItems: "center",
  },
  tableCell: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.text,
    fontVariant: ["tabular-nums"],
  },
  questionText: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.text,
    marginBottom: TufteSpacing.xs / 2,
  },
  metaText: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
  },
  goodScore: {
    color: TufteColors.success,
    fontWeight: '600' as const,
  },
  poorScore: {
    color: TufteColors.error,
    fontWeight: '600' as const,
  },
  methodologySection: {
    padding: TufteLayout.marginHorizontal,
    paddingVertical: TufteSpacing.xl,
    backgroundColor: TufteColors.paper,
  },
  methodologyTitle: {
    fontSize: TufteTypography.fontSize.sm,
    fontWeight: '600' as const,
    color: TufteColors.text,
    marginBottom: TufteSpacing.sm,
  },
  formulaText: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.dataAccent,
    fontFamily: "monospace",
    marginBottom: TufteSpacing.md,
    paddingVertical: TufteSpacing.sm,
    paddingHorizontal: TufteSpacing.md,
    backgroundColor: TufteColors.background,
    borderLeftWidth: 2,
    borderLeftColor: TufteColors.dataAccent,
  },
  methodologyText: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textSecondary,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.sm,
  },
});
