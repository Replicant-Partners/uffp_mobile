import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { HomeScreen } from "./screens/HomeScreen";
import { ForecastDetailScreen } from "./screens/ForecastDetailScreen";
import { CreateForecastScreen } from "./screens/CreateForecastScreen";
import { CompareScreen } from "./screens/CompareScreen";
import { BrierScoreScreen } from "./screens/BrierScoreScreen";
import { CalibrationScreen } from "./screens/CalibrationScreen";
import ResearchScreen from "./screens/ResearchScreen";
import ForecastInputScreen from "./screens/ForecastInputScreen";
import ForecastWorkspaceScreen from "./screens/ForecastWorkspaceScreen";
import AuthScreen from "./screens/AuthScreen";
import { ForecastConfig } from "./types";
import { TufteColors } from "./styles/tufte";
import { authService, AuthState } from "./services/authService";

export type RootStackParamList = {
  Home: undefined;
  ForecastDetail: { config: ForecastConfig };
  CreateForecast: undefined;
  Compare: { configs: ForecastConfig[] };
  BrierScore: undefined;
  Calibration: undefined;
  Research: undefined;
  ForecastInput: undefined;
  ForecastWorkspace: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [authState, setAuthState] = useState<AuthState>(authService.getState());
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe((newState) => {
      setAuthState(newState);
    });

    // Give auth service time to load from storage
    setTimeout(() => {
      setIsInitializing(false);
    }, 500);

    return unsubscribe;
  }, []);

  // Show loading screen while initializing
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fabd2f" />
      </View>
    );
  }

  // Show auth screen if not authenticated
  if (!authState.isAuthenticated) {
    return (
      <AuthScreen
        onAuthSuccess={() => {
          // Auth state will update automatically via subscription
        }}
      />
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: TufteColors.paper,
          },
          headerTintColor: TufteColors.text,
          headerTitleStyle: {
            fontWeight: "400",
            fontSize: 18,
            color: TufteColors.text,
          },
          headerShadowVisible: true,
        }}
        initialRouteName="ForecastWorkspace"
      >
        <Stack.Screen
          name="ForecastWorkspace"
          component={ForecastWorkspaceScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CreateForecast"
          component={CreateForecastScreen}
          options={{ title: "Create Forecast" }}
        />
        <Stack.Screen
          name="ForecastDetail"
          component={ForecastDetailScreen}
          options={{ title: "Forecast Analysis" }}
        />
        <Stack.Screen
          name="Compare"
          component={CompareScreen}
          options={{ title: "Comparative Analysis" }}
        />
        <Stack.Screen
          name="BrierScore"
          component={BrierScoreScreen}
          options={{ title: "Brier Score Analysis" }}
        />
        <Stack.Screen
          name="Calibration"
          component={CalibrationScreen}
          options={{ title: "Calibration & Leaderboard" }}
        />
        <Stack.Screen
          name="Research"
          component={ResearchScreen}
          options={{ title: "Research Agents" }}
        />
        <Stack.Screen
          name="ForecastInput"
          component={ForecastInputScreen}
          options={{ title: "Universal Forecasting" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#1d2021",
    justifyContent: "center",
    alignItems: "center",
  },
});
