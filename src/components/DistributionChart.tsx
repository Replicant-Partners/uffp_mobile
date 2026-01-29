import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { SimulationResult } from "../types";
import { TufteColors, TufteTypography, TufteSpacing, TufteChartConfig } from "../styles/tufte";

interface DistributionChartProps {
  result: SimulationResult;
  ticker: string;
}

const screenWidth = Dimensions.get("window").width;

export const DistributionChart: React.FC<DistributionChartProps> = ({ result, ticker }) => {
  // Sample histogram for sparkline-style display
  const sampledHistogram = result.histogram.filter((_, i) => i % 3 === 0);

  const chartData = {
    labels: [],
    datasets: [
      {
        data: sampledHistogram.map((h) => h.count),
        color: (opacity = 1) => TufteColors.dataLine,
        strokeWidth: 1.5,
      },
    ],
    legend: [],
  };

  const chartConfig = {
    ...TufteChartConfig,
    backgroundGradientFrom: TufteColors.paper,
    backgroundGradientTo: TufteColors.paper,
    fillShadowGradientOpacity: 0.05,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Distribution of Outcomes</Text>

      {/* Explanation in marginal note style */}
      <Text style={styles.description}>
        Frequency distribution showing likelihood of each revenue level. Peak represents modal (most
        probable) outcome at P50.
      </Text>

      {/* Sparkline-style chart (minimal decoration) */}
      <LineChart
        data={chartData}
        width={screenWidth - TufteSpacing.lg * 2}
        height={120}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withDots={false}
        withInnerLines={false}
        withOuterLines={true}
        withVerticalLabels={false}
        withHorizontalLabels={false}
        withShadow={false}
      />

      {/* Quantitative summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Peak at</Text>
          <Text style={styles.summaryValue}>${(result.p50 / 1_000_000).toFixed(1)}M (P50)</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Spread</Text>
          <Text style={styles.summaryValue}>
            ${(result.p10 / 1_000_000).toFixed(1)}M – ${(result.p90 / 1_000_000).toFixed(1)}M
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Coverage</Text>
          <Text style={styles.summaryValue}>80% of outcomes within this range</Text>
        </View>
      </View>
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
    marginBottom: TufteSpacing.sm,
  },
  description: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textSecondary,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.xs,
    marginBottom: TufteSpacing.md,
    maxWidth: 400,
  },
  chart: {
    marginVertical: TufteSpacing.sm,
    marginLeft: -TufteSpacing.md,
  },
  summary: {
    marginTop: TufteSpacing.md,
    paddingTop: TufteSpacing.md,
    borderTopWidth: 1,
    borderTopColor: TufteColors.border,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: TufteSpacing.xs,
  },
  summaryLabel: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
  },
  summaryValue: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.text,
    fontWeight: '500' as const,
    fontVariant: ["tabular-nums"],
  },
});
