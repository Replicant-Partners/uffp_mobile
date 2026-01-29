import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ForecastConfig } from "../types";
import { TufteColors, TufteTypography, TufteSpacing, TufteLayout } from "../styles/tufte";

interface ForecastCardProps {
  config: ForecastConfig;
  onPress: () => void;
}

export const ForecastCard: React.FC<ForecastCardProps> = ({ config, onPress }) => {
  const formatDate = (date: string) => {
    return new Date(date).getFullYear().toString();
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Header - Ticker and Target */}
      <View style={styles.headerRow}>
        <Text style={styles.ticker}>{config.ticker}</Text>
        <Text style={styles.targetValue}>${config.targetValue}M</Text>
      </View>

      {/* Metadata table */}
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <Text style={styles.tableLabel}>Target</Text>
          <Text style={styles.tableValue}>
            {config.targetMetric} ≥ ${config.targetValue}M by {formatDate(config.targetDate)}
          </Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={styles.tableLabel}>Drivers</Text>
          <Text style={styles.tableValue}>{config.drivers.map((d) => d.name).join(" · ")}</Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={styles.tableLabel}>Base Rate</Text>
          <Text style={styles.tableValue}>
            {(config.baserate.probability * 100).toFixed(0)}% historical success
          </Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={styles.tableLabel}>Method</Text>
          <Text style={styles.tableValue}>
            Monte Carlo · {config.drivers.length} independent drivers
          </Text>
        </View>
      </View>

      {/* Minimal action hint */}
      <Text style={styles.actionHint}>Tap to view simulation →</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: TufteColors.paper,
    marginHorizontal: TufteLayout.marginHorizontal,
    marginBottom: TufteSpacing.md,
    padding: TufteSpacing.lg,
    borderWidth: 1,
    borderColor: TufteColors.border,
    ...TufteLayout.shadow,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: TufteSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: TufteColors.text,
    paddingBottom: TufteSpacing.sm,
  },
  ticker: {
    fontSize: TufteTypography.fontSize.xxl,
    fontWeight: '700' as const,
    color: TufteColors.text,
    letterSpacing: -0.5,
  },
  targetValue: {
    fontSize: TufteTypography.fontSize.xl,
    fontWeight: '400' as const,
    color: TufteColors.text,
  },
  table: {
    marginBottom: TufteSpacing.md,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: TufteSpacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: TufteColors.grid,
  },
  tableLabel: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    width: 80,
    paddingTop: 2,
  },
  tableValue: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.text,
    flex: 1,
    lineHeight: TufteTypography.lineHeight.normal * TufteTypography.fontSize.sm,
  },
  actionHint: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textSecondary,
    textAlign: "right",
    fontStyle: "italic",
  },
});
