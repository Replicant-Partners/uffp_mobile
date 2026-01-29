import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BarChart } from "react-native-chart-kit";
import { forecastService } from "../services/forecastService";
import { SimulationResult, ForecastConfig } from "../types";
import { RootStackParamList } from "../App";
import { TufteColors, TufteTypography, TufteSpacing, TufteLayout } from "../styles/tufte";
import { InfoTooltip } from "../components/InfoTooltip";
import { GLOSSARY } from "../constants/glossary";

type CompareScreenProps = NativeStackScreenProps<RootStackParamList, "Compare">;

export const CompareScreen: React.FC<CompareScreenProps> = ({ route }) => {
  const { configs } = route.params;
  const [results, setResults] = useState<{ config: ForecastConfig; result: SimulationResult }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runComparisons();
  }, []);

  const runComparisons = async () => {
    setLoading(true);
    const comparisons = await Promise.all(
      configs.map(async (config) => {
        const simResult = await forecastService.runSimulation(config.drivers);
        const aboveTarget = simResult.histogram
          .filter((h) => h.value >= config.targetValue * 1_000_000)
          .reduce((sum, h) => sum + h.count, 0);
        simResult.probabilityAboveTarget = aboveTarget / 10000;
        return { config, result: simResult };
      }),
    );
    setResults(comparisons);
    setLoading(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={TufteColors.text} />
          <Text style={styles.loadingText}>Running comparative simulations</Text>
        </View>
      </SafeAreaView>
    );
  }

  const toMillions = (value: number) => value / 1_000_000;
  const screenWidth = Dimensions.get("window").width;

  const chartColors = [
    TufteColors.chart1,
    TufteColors.chart2,
    TufteColors.chart3,
    TufteColors.chart4,
    TufteColors.chart5,
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Comparative Forecast Analysis</Text>
          <Text style={styles.subtitle}>
            {configs.length} companies · Monte Carlo simulation · 10,000 iterations each
          </Text>
        </View>

        {/* Summary Table */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionLabel}>Summary Statistics</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.tickerColumn]}>Ticker</Text>
              <Text style={[styles.tableHeaderCell, styles.numberColumn]}>P10</Text>
              <Text style={[styles.tableHeaderCell, styles.numberColumn]}>P50</Text>
              <Text style={[styles.tableHeaderCell, styles.numberColumn]}>P90</Text>
              <Text style={[styles.tableHeaderCell, styles.numberColumn]}>Success%</Text>
            </View>
            <View style={styles.tooltipRow}>
              <View style={styles.tickerColumn} />
              <View style={[styles.numberColumn, styles.tooltipCell]}>
                <InfoTooltip
                  term={GLOSSARY.P10_P50_P90.term}
                  definition={GLOSSARY.P10_P50_P90.definition}
                  example={GLOSSARY.P10_P50_P90.example}
                />
              </View>
              <View style={[styles.numberColumn]} />
              <View style={[styles.numberColumn]} />
              <View style={[styles.numberColumn, styles.tooltipCell]}>
                <InfoTooltip
                  term={GLOSSARY.SUCCESS_PROBABILITY.term}
                  definition={GLOSSARY.SUCCESS_PROBABILITY.definition}
                  example={GLOSSARY.SUCCESS_PROBABILITY.example}
                />
              </View>
            </View>
            {results.map(({ config, result }, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tickerColumn, styles.tickerCell]}>
                  {config.ticker}
                </Text>
                <Text style={[styles.tableCell, styles.numberColumn]}>
                  ${toMillions(result.p10).toFixed(1)}M
                </Text>
                <Text style={[styles.tableCell, styles.numberColumn]}>
                  ${toMillions(result.p50).toFixed(1)}M
                </Text>
                <Text style={[styles.tableCell, styles.numberColumn]}>
                  ${toMillions(result.p90).toFixed(1)}M
                </Text>
                <Text style={[styles.tableCell, styles.numberColumn]}>
                  {(result.probabilityAboveTarget * 100).toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Comparative Charts */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionLabel}>Visual Comparison — P50 Revenue</Text>
          <View style={styles.chartContainer}>
            <BarChart
              data={{
                labels: results.map((r) => r.config.ticker),
                datasets: [
                  {
                    data: results.map((r) => toMillions(r.result.p50)),
                    colors: results.map((_, i) => () => chartColors[i % chartColors.length]),
                  },
                ],
              }}
              width={screenWidth - TufteLayout.marginHorizontal * 2}
              height={220}
              yAxisLabel="$"
              yAxisSuffix="M"
              chartConfig={{
                backgroundColor: TufteColors.paper,
                backgroundGradientFrom: TufteColors.paper,
                backgroundGradientTo: TufteColors.paper,
                color: (opacity = 1) => TufteColors.dataLine,
                labelColor: (opacity = 1) => TufteColors.text,
                barPercentage: 0.6,
                decimalPlaces: 0,
                propsForBackgroundLines: {
                  stroke: TufteColors.grid,
                  strokeWidth: 0.5,
                },
                propsForLabels: {
                  fontSize: 11,
                  fill: TufteColors.text,
                },
              }}
              withInnerLines={true}
              withHorizontalLabels={true}
              fromZero={true}
              showValuesOnTopOfBars={true}
              style={styles.chart}
            />
          </View>
          <Text style={styles.chartCaption}>
            Figure 1. Median revenue projections (P50) by company. Bars represent expected outcome
            at 50th percentile.
          </Text>
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.sectionLabel}>Success Probability Comparison</Text>
          <View style={styles.chartContainer}>
            <BarChart
              data={{
                labels: results.map((r) => r.config.ticker),
                datasets: [
                  {
                    data: results.map((r) => r.result.probabilityAboveTarget * 100),
                    colors: results.map((_, i) => () => chartColors[i % chartColors.length]),
                  },
                ],
              }}
              width={screenWidth - TufteLayout.marginHorizontal * 2}
              height={220}
              yAxisLabel=""
              yAxisSuffix="%"
              chartConfig={{
                backgroundColor: TufteColors.paper,
                backgroundGradientFrom: TufteColors.paper,
                backgroundGradientTo: TufteColors.paper,
                color: (opacity = 1) => TufteColors.dataAccent,
                labelColor: (opacity = 1) => TufteColors.text,
                barPercentage: 0.6,
                decimalPlaces: 0,
                propsForBackgroundLines: {
                  stroke: TufteColors.grid,
                  strokeWidth: 0.5,
                },
                propsForLabels: {
                  fontSize: 11,
                  fill: TufteColors.text,
                },
              }}
              withInnerLines={true}
              withHorizontalLabels={true}
              fromZero={true}
              showValuesOnTopOfBars={true}
              style={styles.chart}
            />
          </View>
          <Text style={styles.chartCaption}>
            Figure 2. Probability of exceeding stated revenue targets. Higher values indicate
            greater confidence in achieving targets.
          </Text>
        </View>

        {/* Comparative Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Comparative Metrics</Text>

          {results.map(({ config, result }, index) => {
            const variance = ((result.p90 - result.p10) / result.p50) * 100;
            return (
              <View key={index} style={styles.companySection}>
                <Text style={styles.companyTicker}>{config.ticker}</Text>

                <View style={styles.metricTable}>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Mean (μ)</Text>
                    <Text style={styles.metricValue}>${toMillions(result.mean).toFixed(1)}M</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Std Dev (σ)</Text>
                    <Text style={styles.metricValue}>${toMillions(result.stdDev).toFixed(1)}M</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Variance</Text>
                    <Text style={styles.metricValue}>{variance.toFixed(0)}%</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Base Rate</Text>
                    <Text style={styles.metricValue}>
                      {(config.baserate.probability * 100).toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Drivers</Text>
                    <Text style={styles.metricValue}>{config.drivers.length}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Relative Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Relative Analysis</Text>

          {results.length === 2 && (
            <>
              <Text style={styles.analysisText}>
                P50 Ratio: {(results[0].result.p50 / results[1].result.p50).toFixed(2)}×
              </Text>
              <Text style={styles.analysisText}>
                {results[0].config.ticker} P50 is{" "}
                {results[0].result.p50 > results[1].result.p50
                  ? `${((results[0].result.p50 / results[1].result.p50 - 1) * 100).toFixed(0)}% higher`
                  : `${((1 - results[0].result.p50 / results[1].result.p50) * 100).toFixed(0)}% lower`}{" "}
                than {results[1].config.ticker}
              </Text>

              <View style={styles.varianceComparison}>
                <Text style={styles.comparisonHeader}>Uncertainty Comparison</Text>
                {results.map(({ config, result }) => {
                  const variance = ((result.p90 - result.p10) / result.p50) * 100;
                  return (
                    <View key={config.ticker} style={styles.comparisonRow}>
                      <Text style={styles.comparisonTicker}>{config.ticker}</Text>
                      <Text style={styles.comparisonValue}>{variance.toFixed(0)}% variance</Text>
                      <Text style={styles.comparisonNote}>
                        {variance < 50
                          ? "Low uncertainty"
                          : variance < 100
                            ? "Moderate uncertainty"
                            : "High uncertainty"}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.probabilityComparison}>
                <Text style={styles.comparisonHeader}>Success Probability</Text>
                {results.map(({ config, result }) => (
                  <View key={config.ticker} style={styles.comparisonRow}>
                    <Text style={styles.comparisonTicker}>{config.ticker}</Text>
                    <Text style={styles.comparisonValue}>
                      {(result.probabilityAboveTarget * 100).toFixed(1)}%
                    </Text>
                    <Text style={styles.comparisonNote}>Target: ${config.targetValue}M</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {results.length > 2 && (
            <View style={styles.rankingTable}>
              <Text style={styles.comparisonHeader}>Ranking by P50</Text>
              {results
                .sort((a, b) => b.result.p50 - a.result.p50)
                .map(({ config, result }, index) => (
                  <View key={config.ticker} style={styles.rankingRow}>
                    <Text style={styles.rankNumber}>{index + 1}.</Text>
                    <Text style={styles.rankTicker}>{config.ticker}</Text>
                    <Text style={styles.rankValue}>${toMillions(result.p50).toFixed(1)}M</Text>
                  </View>
                ))}
            </View>
          )}
        </View>

        {/* Methodology Note */}
        <View style={styles.methodologySection}>
          <Text style={styles.methodologyTitle}>Methodology</Text>
          <Text style={styles.methodologyText}>
            Independent Monte Carlo simulations run for each company. Results are comparable because
            identical methodology applied: 10,000 iterations, independent driver sampling,
            percentile calculation. Variance indicates uncertainty range. Higher variance suggests
            wider range of possible outcomes. Success probability calculated as proportion of
            iterations exceeding stated target.
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
    paddingBottom: TufteSpacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textSecondary,
    marginTop: TufteSpacing.sm,
  },
  header: {
    padding: TufteLayout.marginHorizontal,
    paddingTop: TufteSpacing.lg,
    paddingBottom: TufteSpacing.md,
    borderBottomWidth: 2,
    borderBottomColor: TufteColors.text,
  },
  title: {
    fontSize: TufteTypography.fontSize.xxl,
    fontWeight: "700" as const,
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
    paddingVertical: TufteSpacing.lg,
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
  table: {
    borderWidth: 1,
    borderColor: TufteColors.border,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: TufteColors.background,
    borderBottomWidth: 1,
    borderBottomColor: TufteColors.text,
  },
  tooltipRow: {
    flexDirection: "row",
    backgroundColor: TufteColors.background,
    borderBottomWidth: 1,
    borderBottomColor: TufteColors.border,
    paddingVertical: TufteSpacing.xs,
    paddingHorizontal: TufteSpacing.xs,
  },
  tooltipCell: {
    alignItems: "center",
    justifyContent: "center",
  },
  tableHeaderCell: {
    fontSize: TufteTypography.fontSize.xs,
    fontWeight: "600" as const,
    color: TufteColors.text,
    paddingVertical: TufteSpacing.sm,
    paddingHorizontal: TufteSpacing.xs,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: TufteColors.grid,
  },
  tableCell: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.text,
    paddingVertical: TufteSpacing.sm,
    paddingHorizontal: TufteSpacing.xs,
    fontVariant: ["tabular-nums"],
  },
  tickerColumn: {
    flex: 1.5,
  },
  numberColumn: {
    flex: 1,
    textAlign: "right",
  },
  tickerCell: {
    fontWeight: "600" as const,
  },
  section: {
    padding: TufteLayout.marginHorizontal,
    paddingVertical: TufteSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: TufteColors.grid,
  },
  chartSection: {
    paddingVertical: TufteSpacing.lg,
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
  companySection: {
    marginBottom: TufteSpacing.lg,
  },
  companyTicker: {
    fontSize: TufteTypography.fontSize.lg,
    fontWeight: "700" as const,
    color: TufteColors.text,
    marginBottom: TufteSpacing.sm,
  },
  metricTable: {
    borderLeftWidth: 2,
    borderLeftColor: TufteColors.border,
    paddingLeft: TufteSpacing.md,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: TufteSpacing.xs,
    borderBottomWidth: 0.5,
    borderBottomColor: TufteColors.grid,
  },
  metricLabel: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textSecondary,
  },
  metricValue: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.text,
    fontWeight: "500" as const,
    fontVariant: ["tabular-nums"],
  },
  analysisText: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.text,
    marginBottom: TufteSpacing.sm,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.sm,
  },
  varianceComparison: {
    marginTop: TufteSpacing.md,
    marginBottom: TufteSpacing.md,
  },
  probabilityComparison: {
    marginTop: TufteSpacing.md,
  },
  comparisonHeader: {
    fontSize: TufteTypography.fontSize.sm,
    fontWeight: "600" as const,
    color: TufteColors.text,
    marginBottom: TufteSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: TufteColors.text,
    paddingBottom: TufteSpacing.xs,
  },
  comparisonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingVertical: TufteSpacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: TufteColors.grid,
  },
  comparisonTicker: {
    fontSize: TufteTypography.fontSize.sm,
    fontWeight: "600" as const,
    color: TufteColors.text,
    flex: 1,
  },
  comparisonValue: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.text,
    fontWeight: "500" as const,
    fontVariant: ["tabular-nums"],
    marginHorizontal: TufteSpacing.md,
  },
  comparisonNote: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    fontStyle: "italic",
    flex: 1.5,
    textAlign: "right",
  },
  rankingTable: {
    marginTop: TufteSpacing.md,
  },
  rankingRow: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingVertical: TufteSpacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: TufteColors.grid,
  },
  rankNumber: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textTertiary,
    width: 30,
  },
  rankTicker: {
    fontSize: TufteTypography.fontSize.sm,
    fontWeight: "600" as const,
    color: TufteColors.text,
    flex: 1,
  },
  rankValue: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.text,
    fontVariant: ["tabular-nums"],
  },
  methodologySection: {
    padding: TufteLayout.marginHorizontal,
    paddingVertical: TufteSpacing.lg,
    backgroundColor: TufteColors.paper,
  },
  methodologyTitle: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: TufteSpacing.sm,
  },
  methodologyText: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textSecondary,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.xs,
  },
});
