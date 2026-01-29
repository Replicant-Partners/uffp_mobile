import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "./screens/HomeScreen";
import { ForecastDetailScreen } from "./screens/ForecastDetailScreen";
import { CreateForecastScreen } from "./screens/CreateForecastScreen";
import { CompareScreen } from "./screens/CompareScreen";
import { BrierScoreScreen } from "./screens/BrierScoreScreen";
import { CalibrationScreen } from "./screens/CalibrationScreen";
import { ForecastConfig } from "./types";
import { TufteColors } from "./styles/tufte";

export type RootStackParamList = {
  Home: undefined;
  ForecastDetail: { config: ForecastConfig };
  CreateForecast: undefined;
  Compare: { configs: ForecastConfig[] };
  BrierScore: undefined;
  Calibration: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
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
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
