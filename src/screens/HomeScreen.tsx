import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import {
  TufteColors,
  TufteTypography,
  TufteSpacing,
  TufteLayout,
} from "../styles/tufte";

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Home">;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Universal Forecasting Platform</Text>
        <Text style={styles.subtitle}>
          AI-powered probabilistic forecasting for any event
        </Text>
      </View>

      <View style={styles.mainSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("ForecastInput")}
        >
          <Text style={styles.primaryButtonTitle}>Create Forecast</Text>
          <Text style={styles.primaryButtonDesc}>
            Ask any question about the future
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Research Tools</Text>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Research")}
        >
          <Text style={styles.secondaryButtonLabel}>Research Agents</Text>
          <Text style={styles.secondaryButtonDesc}>
            AI-powered research & evidence gathering
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: TufteSpacing.xl,
  },
  title: {
    fontSize: TufteTypography.fontSize.display,
    fontWeight: "400" as const,
    color: TufteColors.text,
    letterSpacing: -0.5,
    marginBottom: TufteSpacing.sm,
  },
  subtitle: {
    fontSize: TufteTypography.fontSize.base,
    color: TufteColors.textSecondary,
    lineHeight:
      TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.base,
  },
  mainSection: {
    paddingHorizontal: TufteLayout.marginHorizontal,
    marginBottom: TufteSpacing.xl,
  },
  primaryButton: {
    backgroundColor: TufteColors.text,
    padding: TufteSpacing.xl,
    borderRadius: 8,
  },
  primaryButtonTitle: {
    fontSize: 24,
    fontWeight: "600" as const,
    color: TufteColors.paper,
    marginBottom: TufteSpacing.xs,
  },
  primaryButtonDesc: {
    fontSize: TufteTypography.fontSize.base,
    color: TufteColors.backgroundSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: TufteColors.grid,
    marginHorizontal: TufteLayout.marginHorizontal,
    marginVertical: TufteSpacing.lg,
  },
  section: {
    paddingHorizontal: TufteLayout.marginHorizontal,
  },
  sectionLabel: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: TufteSpacing.md,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: TufteColors.border,
    backgroundColor: TufteColors.paper,
    padding: TufteSpacing.lg,
    borderRadius: 8,
  },
  secondaryButtonLabel: {
    fontSize: TufteTypography.fontSize.base,
    fontWeight: "500" as const,
    color: TufteColors.text,
    marginBottom: TufteSpacing.xs,
  },
  secondaryButtonDesc: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textSecondary,
  },
});
