import React from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Dimensions } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BarChart, LineChart } from "react-native-chart-kit";
import { RootStackParamList } from "../App";
import { TufteColors, TufteTypography, TufteSpacing, TufteLayout } from "../styles/tufte";
import { InfoTooltip } from "../components/InfoTooltip";
import { GLOSSARY } from "../constants/glossary";

type CalibrationScreenProps = NativeStackScreenProps<RootStackParamList, "Calibration">;

// Synthetic calibration data: What % of 70% predictions actually happened?
const calibrationData = [
  { confidenceLevel: 10, actualFrequency: 8, count: 5 },
  { confidenceLevel: 20, actualFrequency: 18, count: 8 },
  { confidenceLevel: 30, actualFrequency: 32, count: 12 },
  { confidenceLevel: 40, actualFrequency: 38, count: 15 },
  { confidenceLevel: 50, actualFrequency: 51, count: 22 },
  { confidenceLevel: 60, actualFrequency: 59, count: 18 },
  { confidenceLevel: 70, actualFrequency: 68, count: 25 },
  { confidenceLevel: 80, actualFrequency: 77, count: 20 },
  { confidenceLevel: 90, actualFrequency: 88, count: 14 },
];

// Synthetic leaderboard data
const leaderboard = [
  {
    rank: 1,
    forecaster: "Sarah Chen",
    brierScore: 0.087,
    totalForecasts: 156,
    accuracy: 78.2,
    calibrationIndex: 0.94,
  },
  {
    rank: 2,
    forecaster: "Marcus Rodriguez",
    brierScore: 0.102,
    totalForecasts: 142,
    accuracy: 74.6,
    calibrationIndex: 0.91,
  },
  {
    rank: 3,
    forecaster: "You",
    brierScore: 0.125,
    totalForecasts: 87,
    accuracy: 71.3,
    calibrationIndex: 0.88,
  },
  {
    rank: 4,
    forecaster: "Jennifer Park",
    brierScore: 0.138,
    totalForecasts: 98,
    accuracy: 68.4,
    calibrationIndex: 0.85,
  },
  {
    rank: 5,
    forecaster: "David Kim",
    brierScore: 0.156,
    totalForecasts: 73,
    accuracy: 65.8,
    calibrationIndex: 0.82,
  },
  {
    rank: 6,
    forecaster: "Alex Thompson",
    brierScore: 0.178,
    totalForecasts: 61,
    accuracy: 62.3,
    calibrationIndex: 0.78,
  },
  {
    rank: 7,
    forecaster: "Lisa Zhang",
    brierScore: 0.192,
    totalForecasts: 54,
    accuracy: 59.2,
    calibrationIndex: 0.74,
  },
];

export const CalibrationScreen: React.FC<CalibrationScreenProps> = () => {
  const screenWidth = Dimensions.get("window").width;

  // Calculate calibration curve deviation (perfect calibration = 0)
  const calibrationDeviation =
    calibrationData.reduce((sum, d) => {
      return sum + Math.abs(d.confidenceLevel - d.actualFrequency);
    }, 0) / calibrationData.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Calibration & Leaderboard</Text>
            <InfoTooltip
              term={GLOSSARY.CALIBRATION.term}
              definition={GLOSSARY.CALIBRATION.definition}
              example={GLOSSARY.CALIBRATION.example}
            />
          </View>
          <Text style={styles.subtitle}>
            Forecaster performance rankings · Calibration quality · Tetlock superforecasting
            methodology
          </Text>
        </View>

        {/* Your Performance */}
        <View style={styles.performanceSection}>
          <Text style={styles.sectionLabel}>Your Performance</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>#3</Text>
              <Text style={styles.statLabel}>Rank</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>0.125</Text>
              <Text style={styles.statLabel}>Brier Score</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>0.88</Text>
              <InfoTooltip
                term={GLOSSARY.CALIBRATION_INDEX.term}
                definition={GLOSSARY.CALIBRATION_INDEX.definition}
                example={GLOSSARY.CALIBRATION_INDEX.example}
              />
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>87</Text>
              <Text style={styles.statLabel}>Forecasts</Text>
            </View>
          </View>

          <View style={styles.insight}>
            <Text style={styles.insightText}>
              You are in the top 43% of forecasters. Your calibration index of 0.88 indicates good
              probabilistic reasoning. Continue tracking resolved predictions to improve accuracy.
            </Text>
          </View>
        </View>

        {/* Calibration Curve */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionLabel}>Calibration Curve</Text>
          <View style={styles.chartContainer}>
            <LineChart
              data={{
                labels: calibrationData.map((d) => `${d.confidenceLevel}%`),
                datasets: [
                  {
                    data: calibrationData.map((d) => d.actualFrequency),
                    color: (opacity = 1) => TufteColors.dataAccent,
                    strokeWidth: 2,
                  },
                  {
                    data: calibrationData.map((d) => d.confidenceLevel),
                    color: (opacity = 1) => TufteColors.textTertiary,
                    strokeWidth: 1,
                    withDots: false,
                  },
                ],
                legend: ["Actual Frequency", "Perfect Calibration"],
              }}
              width={screenWidth - TufteLayout.marginHorizontal * 2 - TufteSpacing.md * 2}
              height={220}
              chartConfig={{
                backgroundColor: TufteColors.paper,
                backgroundGradientFrom: TufteColors.paper,
                backgroundGradientTo: TufteColors.paper,
                color: (opacity = 1) => TufteColors.dataAccent,
                labelColor: (opacity = 1) => TufteColors.text,
                decimalPlaces: 0,
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
            Figure 1. Calibration curve comparing predicted probabilities to actual outcomes. Closer
            alignment to diagonal indicates better calibration. Deviation:{" "}
            {calibrationDeviation.toFixed(1)}%.
          </Text>

          <View style={styles.calibrationTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Confidence</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Actual</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>Count</Text>
            </View>
            {calibrationData.map((d, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1 }]}>{d.confidenceLevel}%</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: "center" }]}>
                  {d.actualFrequency}%
                </Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{d.count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Leaderboard */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Forecaster Leaderboard</Text>
          <Text style={styles.helpText}>
            Ranked by Brier score (lower is better). Minimum 50 resolved forecasts for inclusion.
          </Text>

          <View style={styles.leaderboardTable}>
            <View style={styles.leaderboardHeader}>
              <Text style={[styles.tableHeaderCell, { width: 40 }]}>Rank</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Forecaster</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>Brier</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>Cal.</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>N</Text>
            </View>

            {leaderboard.map((entry) => (
              <View
                key={entry.rank}
                style={[styles.leaderboardRow, entry.forecaster === "You" && styles.yourRankRow]}
              >
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{entry.rank}</Text>
                </View>
                <View style={{ flex: 2 }}>
                  <Text
                    style={[styles.forecasterName, entry.forecaster === "You" && styles.yourName]}
                  >
                    {entry.forecaster}
                  </Text>
                  <Text style={styles.accuracyText}>{entry.accuracy.toFixed(1)}% accuracy</Text>
                </View>
                <Text style={[styles.metricValue, { flex: 1, textAlign: "right" }]}>
                  {entry.brierScore.toFixed(3)}
                </Text>
                <Text style={[styles.metricValue, { flex: 1, textAlign: "right" }]}>
                  {entry.calibrationIndex.toFixed(2)}
                </Text>
                <Text style={[styles.metricValue, { flex: 1, textAlign: "right" }]}>
                  {entry.totalForecasts}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Improvement Recommendations */}
        <View style={styles.recommendationsSection}>
          <Text style={styles.sectionLabel}>Recommended Actions</Text>

          <View style={styles.recommendation}>
            <Text style={styles.recommendationNumber}>1.</Text>
            <View style={styles.recommendationContent}>
              <Text style={styles.recommendationTitle}>Increase forecast volume</Text>
              <Text style={styles.recommendationText}>
                Top forecasters average 120+ predictions. More data improves calibration
                measurement.
              </Text>
            </View>
          </View>

          <View style={styles.recommendation}>
            <Text style={styles.recommendationNumber}>2.</Text>
            <View style={styles.recommendationContent}>
              <Text style={styles.recommendationTitle}>Review overconfident predictions</Text>
              <Text style={styles.recommendationText}>
                Your 80-90% confidence predictions are slightly overconfident. Consider widening
                uncertainty ranges in this region.
              </Text>
            </View>
          </View>

          <View style={styles.recommendation}>
            <Text style={styles.recommendationNumber}>3.</Text>
            <View style={styles.recommendationContent}>
              <Text style={styles.recommendationTitle}>Track base rates systematically</Text>
              <Text style={styles.recommendationText}>
                Explicitly document outside view and reference class for each forecast. Sarah Chen
                attributes her #1 ranking to rigorous base rate analysis.
              </Text>
            </View>
          </View>
        </View>

        {/* Methodology */}
        <View style={styles.methodologySection}>
          <Text style={styles.methodologyTitle}>Calibration Methodology</Text>
          <Text style={styles.methodologyText}>
            Calibration measures whether your confidence levels match reality. If you say "70%
            confident" on 100 questions, approximately 70 should be correct. The calibration index
            (0-1) summarizes this alignment across all confidence levels. Values above 0.85 indicate
            good calibration. The leaderboard ranks forecasters by average Brier score, which
            combines both calibration and resolution (ability to assign extreme probabilities to
            certain outcomes). This follows the methodology developed by Philip Tetlock in the Good
            Judgment Project.
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
  performanceSection: {
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
    gap: TufteSpacing.sm,
    marginBottom: TufteSpacing.lg,
  },
  statCard: {
    flex: 1,
    padding: TufteSpacing.md,
    borderWidth: 1,
    borderColor: TufteColors.border,
    backgroundColor: TufteColors.background,
    alignItems: "center",
  },
  statValue: {
    fontSize: TufteTypography.fontSize.xl,
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
    textAlign: "center",
  },
  insight: {
    borderLeftWidth: 3,
    borderLeftColor: TufteColors.dataAccent,
    paddingLeft: TufteSpacing.md,
    backgroundColor: TufteColors.background,
    padding: TufteSpacing.md,
  },
  insightText: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.text,
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
    marginBottom: TufteSpacing.lg,
  },
  calibrationTable: {
    marginHorizontal: TufteLayout.marginHorizontal,
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
    paddingVertical: TufteSpacing.sm,
    paddingHorizontal: TufteSpacing.sm,
  },
  tableCell: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.text,
    fontVariant: ["tabular-nums"],
  },
  section: {
    padding: TufteLayout.marginHorizontal,
    paddingVertical: TufteSpacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: TufteColors.grid,
  },
  helpText: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textTertiary,
    marginBottom: TufteSpacing.lg,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.sm,
  },
  leaderboardTable: {
    borderWidth: 1,
    borderColor: TufteColors.border,
  },
  leaderboardHeader: {
    flexDirection: "row",
    backgroundColor: TufteColors.background,
    borderBottomWidth: 1,
    borderBottomColor: TufteColors.dataAccent,
    paddingVertical: TufteSpacing.sm,
    paddingHorizontal: TufteSpacing.sm,
    alignItems: "center",
  },
  leaderboardRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: TufteColors.grid,
    paddingVertical: TufteSpacing.md,
    paddingHorizontal: TufteSpacing.sm,
    alignItems: "center",
  },
  yourRankRow: {
    backgroundColor: TufteColors.backgroundSecondary,
    borderLeftWidth: 3,
    borderLeftColor: TufteColors.dataAccent,
  },
  rankBadge: {
    width: 40,
    alignItems: "center",
  },
  rankText: {
    fontSize: TufteTypography.fontSize.base,
    fontWeight: '700' as const,
    color: TufteColors.dataAccent,
  },
  forecasterName: {
    fontSize: TufteTypography.fontSize.base,
    color: TufteColors.text,
    marginBottom: 2,
  },
  yourName: {
    fontWeight: '700' as const,
    color: TufteColors.dataAccent,
  },
  accuracyText: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
  },
  metricValue: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.text,
    fontVariant: ["tabular-nums"],
  },
  recommendationsSection: {
    padding: TufteLayout.marginHorizontal,
    paddingVertical: TufteSpacing.xl,
    backgroundColor: TufteColors.paper,
    borderBottomWidth: 1,
    borderBottomColor: TufteColors.border,
  },
  recommendation: {
    flexDirection: "row",
    marginBottom: TufteSpacing.lg,
  },
  recommendationNumber: {
    fontSize: TufteTypography.fontSize.base,
    fontWeight: '700' as const,
    color: TufteColors.dataAccent,
    width: 30,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: TufteTypography.fontSize.base,
    fontWeight: '600' as const,
    color: TufteColors.text,
    marginBottom: TufteSpacing.xs,
  },
  recommendationText: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textSecondary,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.sm,
  },
  methodologySection: {
    padding: TufteLayout.marginHorizontal,
    paddingVertical: TufteSpacing.xl,
  },
  methodologyTitle: {
    fontSize: TufteTypography.fontSize.sm,
    fontWeight: '600' as const,
    color: TufteColors.text,
    marginBottom: TufteSpacing.sm,
  },
  methodologyText: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textSecondary,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.sm,
  },
});
