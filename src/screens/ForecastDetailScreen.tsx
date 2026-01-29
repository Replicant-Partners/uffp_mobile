import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ForecastChart } from "../components/ForecastChart";
import { DistributionChart } from "../components/DistributionChart";
import { forecastService } from "../services/forecastService";
import { SimulationResult } from "../types";
import { RootStackParamList } from "../App";
import { TufteColors, TufteTypography, TufteSpacing, TufteLayout } from "../styles/tufte";
import { InfoTooltip } from "../components/InfoTooltip";
import { GLOSSARY } from "../constants/glossary";

type ForecastDetailScreenProps = NativeStackScreenProps<RootStackParamList, "ForecastDetail">;

export const ForecastDetailScreen: React.FC<ForecastDetailScreenProps> = ({ route }) => {
  const { config } = route.params;
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runSimulation();
  }, []);

  const runSimulation = async () => {
    setLoading(true);
    const simResult = await forecastService.runSimulation(config.drivers);

    const aboveTarget = simResult.histogram
      .filter((h) => h.value >= config.targetValue * 1_000_000)
      .reduce((sum, h) => sum + h.count, 0);

    simResult.probabilityAboveTarget = aboveTarget / 10000;

    setResult(simResult);
    setLoading(false);
  };

  if (loading || !result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={TufteColors.text} />
          <Text style={styles.loadingText}>Running simulation</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header: Ticker and Target */}
        <View style={styles.header}>
          <Text style={styles.ticker}>{config.ticker}</Text>
          <Text style={styles.targetText}>
            Target: ${config.targetValue}M by {new Date(config.targetDate).getFullYear()}
          </Text>
        </View>

        {/* Primary Result: Probability */}
        <View style={styles.probabilitySection}>
          <View style={styles.probabilityRow}>
            <InfoTooltip
              term={GLOSSARY.SUCCESS_PROBABILITY.term}
              definition={GLOSSARY.SUCCESS_PROBABILITY.definition}
              example={GLOSSARY.SUCCESS_PROBABILITY.example}
            />
            <Text style={styles.probabilityValue}>
              {(result.probabilityAboveTarget * 100).toFixed(1)}%
            </Text>
          </View>
          <Text style={styles.probabilityNote}>
            Likelihood of reaching ${config.targetValue}M target · 10,000 iterations
          </Text>
        </View>

        {/* Charts */}
        <ForecastChart result={result} ticker={config.ticker} />
        <DistributionChart result={result} ticker={config.ticker} />

        {/* Driver Table */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Forecast Drivers</Text>
            <InfoTooltip
              term={GLOSSARY.FERMI_DECOMPOSITION.term}
              definition={GLOSSARY.FERMI_DECOMPOSITION.definition}
              example={GLOSSARY.FERMI_DECOMPOSITION.example}
            />
          </View>
          <Text style={styles.sectionNote}>
            Independent variables sampled from specified distributions
          </Text>

          {config.drivers.map((driver, index) => (
            <View key={index} style={styles.driverItem}>
              <View style={styles.driverHeader}>
                <Text style={styles.driverNumber}>{index + 1}.</Text>
                <Text style={styles.driverName}>{driver.name}</Text>
              </View>

              <View style={styles.driverTable}>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Type</Text>
                  <Text style={styles.tableValue}>{driver.distributionType}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Parameters</Text>
                  <Text style={styles.tableValue}>
                    {Object.entries(driver.parameters)
                      .map(([k, v]) => `${k}=${v}`)
                      .join(", ")}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Unit</Text>
                  <Text style={styles.tableValue}>{driver.unit}</Text>
                </View>
                {driver.rationale && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Rationale</Text>
                    <Text style={styles.tableValue}>{driver.rationale}</Text>
                  </View>
                )}
              </View>

              {/* Evidence */}
              {driver.evidence && driver.evidence.length > 0 && (
                <View style={styles.evidenceSection}>
                  <Text style={styles.evidenceHeader}>
                    Supporting Evidence ({driver.evidence.length})
                  </Text>
                  {driver.evidence.map((evidence) => (
                    <View key={evidence.id} style={styles.evidenceCard}>
                      <View style={styles.evidenceCardHeader}>
                        <View
                          style={[
                            styles.relevanceBadge,
                            {
                              backgroundColor:
                                evidence.relevance === "high"
                                  ? TufteColors.dataAccent
                                  : evidence.relevance === "medium"
                                    ? TufteColors.warning
                                    : TufteColors.textTertiary,
                            },
                          ]}
                        />
                        <Text style={styles.evidenceType}>
                          {evidence.type.replace("_", " ").toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.evidenceTitle}>{evidence.title}</Text>
                      <Text style={styles.evidenceSource}>
                        {evidence.source} · {evidence.date}
                      </Text>
                      <View style={styles.evidenceKeyFinding}>
                        <Text style={styles.evidenceKeyFindingLabel}>Key Finding</Text>
                        <Text style={styles.evidenceKeyFindingText}>{evidence.keyFinding}</Text>
                      </View>
                      {evidence.url && (
                        <Text style={styles.evidenceUrl} numberOfLines={1}>
                          {evidence.url}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Base Rate */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Outside View · Base Rate</Text>
          <Text style={styles.baseRateText}>{config.baserate.description}</Text>
          <View style={styles.baseRateStats}>
            <Text style={styles.baseRateValue}>
              {(config.baserate.probability * 100).toFixed(0)}%
            </Text>
            <Text style={styles.baseRateSource}>Source: {config.baserate.source}</Text>
          </View>
        </View>

        {/* Pre-Mortem */}
        {config.premortem.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Pre-Mortem Analysis</Text>
            <Text style={styles.sectionNote}>Failure modes identified ex ante</Text>

            {config.premortem.map((pm, index) => (
              <View key={index} style={styles.premortemItem}>
                <Text style={styles.premortemScenario}>{pm.scenario}</Text>
                <Text style={styles.premortemFailure}>{pm.failureMode}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Methodology Note */}
        <View style={styles.methodologySection}>
          <Text style={styles.methodologyTitle}>Methodology</Text>
          <Text style={styles.methodologyText}>
            Tetlock Superforecasting: (1) Outside view establishes base rate. (2) Fermi
            decomposition identifies {config.drivers.length} independent drivers. (3) Monte Carlo
            simulation samples 10,000 times from specified distributions. (4) Results reported as
            percentiles (P10, P50, P90) representing 10th, 50th, and 90th percentile outcomes.
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
  ticker: {
    fontSize: TufteTypography.fontSize.display,
    fontWeight: '700' as const,
    color: TufteColors.text,
    letterSpacing: -1,
  },
  targetText: {
    fontSize: TufteTypography.fontSize.base,
    color: TufteColors.textSecondary,
    marginTop: TufteSpacing.xs,
  },
  probabilitySection: {
    padding: TufteLayout.marginHorizontal,
    paddingVertical: TufteSpacing.lg,
    backgroundColor: TufteColors.paper,
    borderBottomWidth: 1,
    borderBottomColor: TufteColors.border,
  },
  probabilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: TufteSpacing.xs,
  },
  probabilityLabel: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textSecondary,
  },
  probabilityValue: {
    fontSize: 48,
    fontWeight: '400' as const,
    color: TufteColors.text,
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },
  probabilityNote: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.xs,
  },
  section: {
    padding: TufteLayout.marginHorizontal,
    paddingVertical: TufteSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: TufteColors.grid,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: TufteSpacing.sm,
    marginBottom: TufteSpacing.xs,
  },
  sectionLabel: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionNote: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textSecondary,
    marginBottom: TufteSpacing.md,
    fontStyle: "italic",
  },
  driverItem: {
    marginBottom: TufteSpacing.lg,
  },
  driverHeader: {
    flexDirection: "row",
    marginBottom: TufteSpacing.sm,
  },
  driverNumber: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textTertiary,
    marginRight: TufteSpacing.xs,
  },
  driverName: {
    fontSize: TufteTypography.fontSize.base,
    color: TufteColors.text,
    fontWeight: '500' as const,
  },
  driverTable: {
    marginLeft: TufteSpacing.md,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: TufteSpacing.xs,
    borderBottomWidth: 0.5,
    borderBottomColor: TufteColors.grid,
  },
  tableLabel: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    width: 80,
  },
  tableValue: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.text,
    flex: 1,
  },
  baseRateText: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.text,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.sm,
    marginBottom: TufteSpacing.md,
  },
  baseRateStats: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: TufteSpacing.md,
  },
  baseRateValue: {
    fontSize: TufteTypography.fontSize.xxl,
    fontWeight: '700' as const,
    color: TufteColors.text,
  },
  baseRateSource: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textSecondary,
    fontStyle: "italic",
  },
  premortemItem: {
    marginBottom: TufteSpacing.md,
    paddingLeft: TufteSpacing.md,
    borderLeftWidth: 2,
    borderLeftColor: TufteColors.dataAccent,
  },
  premortemScenario: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.dataAccent,
    fontWeight: '600' as const,
    marginBottom: TufteSpacing.xs,
  },
  premortemFailure: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.text,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.sm,
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
  evidenceSection: {
    marginTop: TufteSpacing.md,
    borderTopWidth: 1,
    borderTopColor: TufteColors.grid,
    paddingTop: TufteSpacing.md,
  },
  evidenceHeader: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: TufteSpacing.sm,
  },
  evidenceCard: {
    backgroundColor: TufteColors.background,
    padding: TufteSpacing.md,
    marginBottom: TufteSpacing.sm,
    borderWidth: 1,
    borderColor: TufteColors.border,
  },
  evidenceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: TufteSpacing.xs,
    marginBottom: TufteSpacing.xs,
  },
  relevanceBadge: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  evidenceType: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    letterSpacing: 0.5,
  },
  evidenceTitle: {
    fontSize: TufteTypography.fontSize.sm,
    fontWeight: '500' as const,
    color: TufteColors.text,
    marginBottom: TufteSpacing.xs / 2,
  },
  evidenceSource: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textSecondary,
    marginBottom: TufteSpacing.xs,
  },
  evidenceKeyFinding: {
    borderLeftWidth: 2,
    borderLeftColor: TufteColors.dataAccent,
    paddingLeft: TufteSpacing.sm,
    marginBottom: TufteSpacing.xs,
  },
  evidenceKeyFindingLabel: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  evidenceKeyFindingText: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.text,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.xs,
  },
  evidenceUrl: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.dataAccent,
    fontStyle: "italic",
  },
});
