import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { SimulationResult } from "../types";
import { TufteColors, TufteTypography, TufteSpacing, TufteChartConfig } from "../styles/tufte";

interface ForecastChartProps {
  result: SimulationResult;
  ticker: string;
}

const screenWidth = Dimensions.get("window").width;

export const ForecastChart: React.FC<ForecastChartProps> = ({ result, ticker }) => {
  const toMillions = (value: number) => value / 1_000_000;

  const chartData = {
    labels: ["P10", "P50", "P90"],
    datasets: [
      {
        data: [toMillions(result.p10), toMillions(result.p50), toMillions(result.p90)],
      },
    ],
  };

  const chartConfig = {
    ...TufteChartConfig,
    barPercentage: 0.5,
    fillShadowGradientOpacity: 0,
  };

  return (
    <View style={styles.container}>
      {/* Title as marginal note */}
      <Text style={styles.label}>Revenue Forecast · {ticker}</Text>

      {/* Data table above chart (Tufte: show numbers directly) */}
      <View style={styles.dataTable}>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>P10 (Bear)</Text>
          <Text style={styles.dataValue}>${toMillions(result.p10).toFixed(1)}M</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>P50 (Base)</Text>
          <Text style={styles.dataValue}>${toMillions(result.p50).toFixed(1)}M</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>P90 (Bull)</Text>
          <Text style={styles.dataValue}>${toMillions(result.p90).toFixed(1)}M</Text>
        </View>
      </View>

      {/* Minimal bar chart (data-ink only) */}
      <BarChart
        data={chartData}
        width={screenWidth - TufteSpacing.lg * 2}
        height={160}
        yAxisLabel="$"
        yAxisSuffix="M"
        chartConfig={chartConfig}
        style={styles.chart}
        showValuesOnTopOfBars={false}
        fromZero
        withInnerLines={false}
        withHorizontalLabels={true}
        withVerticalLabels={true}
        segments={3}
      />

      {/* Statistical summary (tabular) */}
      <View style={styles.statsTable}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>μ (mean)</Text>
          <Text style={styles.statValue}>${toMillions(result.mean).toFixed(1)}M</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>σ (std dev)</Text>
          <Text style={styles.statValue}>${toMillions(result.stdDev).toFixed(1)}M</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Range</Text>
          <Text style={styles.statValue}>
            {(((result.p90 - result.p10) / result.p50) * 100).toFixed(0)}% variance
          </Text>
        </View>
      </View>

      {/* Footnote */}
      <Text style={styles.footnote}>10,000 iterations · Independent drivers multiplied</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: TufteColors.paper,
    padding: TufteSpacing.lg,
    marginVertical: TufteSpacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: TufteColors.border,
  },
  label: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: TufteSpacing.md,
  },
  dataTable: {
    marginBottom: TufteSpacing.md,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: TufteSpacing.xs,
    borderBottomWidth: 0.5,
    borderBottomColor: TufteColors.grid,
  },
  dataLabel: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textSecondary,
  },
  dataValue: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.text,
    fontWeight: '600' as const,
    fontVariant: ["tabular-nums"],
  },
  chart: {
    marginVertical: TufteSpacing.md,
    marginLeft: -TufteSpacing.md,
  },
  statsTable: {
    marginTop: TufteSpacing.md,
    paddingTop: TufteSpacing.md,
    borderTopWidth: 1,
    borderTopColor: TufteColors.border,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: TufteSpacing.xs,
  },
  statLabel: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    fontStyle: "italic",
  },
  statValue: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.text,
    fontVariant: ["tabular-nums"],
  },
  footnote: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    marginTop: TufteSpacing.sm,
    fontStyle: "italic",
  },
});
