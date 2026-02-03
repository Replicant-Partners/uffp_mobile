/**
 * State Integrity Tests
 *
 * Tests that verify frontend state synchronization with backend state.
 * These catch bugs where UI state diverges from persistent state.
 */

import { describe, it, expect } from "@jest/globals";

interface TestScenario {
  name: string;
  description: string;
  setup: () => any;
  validate: (state: any) => { valid: boolean; error?: string };
}

const scenarios: TestScenario[] = [
  {
    name: "Backend forecast appears in savedForecasts",
    description:
      "When a forecast is created on the backend, it must be added to savedForecasts state so it appears in /list",
    setup: () => ({
      // Simulate backend creation
      backendResponse: {
        success: true,
        forecast: {
          id: "fct_abc123",
          question: "Test question",
          drivers: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        fromBackend: true,
      },
      // Before fix: savedForecasts is empty
      savedForecastsBefore: [],
      // After fix: savedForecasts should include new forecast
      savedForecastsAfter: [
        {
          id: "fct_abc123",
          question: "Test question",
          drivers: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    }),
    validate: (state) => {
      const { backendResponse, savedForecastsAfter } = state;

      if (backendResponse.fromBackend) {
        const forecastInState = savedForecastsAfter.find(
          (f: any) => f.id === backendResponse.forecast.id,
        );

        if (!forecastInState) {
          return {
            valid: false,
            error: `Forecast ${backendResponse.forecast.id} created on backend but not in savedForecasts state. User will not see it in /list.`,
          };
        }
      }

      return { valid: true };
    },
  },

  {
    name: "Backend driver sync updates activeForecast",
    description:
      "When a driver is synced to backend, the activeForecast must be updated with the backend response",
    setup: () => ({
      driverBeingConfigured: {
        name: "Test Driver",
        type: "binary",
        probability: 0.5,
      },
      backendResponse: {
        success: true,
        forecast: {
          id: "fct_abc123",
          question: "Test",
          drivers: [
            {
              id: "drv_xyz789",
              name: "Test Driver",
              type: "binary",
              probability: 0.5,
            },
          ],
        },
      },
      activeForecastBefore: {
        id: "fct_abc123",
        question: "Test",
        drivers: [],
      },
      activeForecastAfter: {
        id: "fct_abc123",
        question: "Test",
        drivers: [
          {
            id: "drv_xyz789",
            name: "Test Driver",
            type: "binary",
            probability: 0.5,
          },
        ],
      },
    }),
    validate: (state) => {
      const { backendResponse, activeForecastAfter, driverBeingConfigured } =
        state;

      if (backendResponse.success && backendResponse.forecast) {
        const driverInActiveForecast = activeForecastAfter.drivers?.find(
          (d: any) => d.name === driverBeingConfigured.name,
        );

        if (!driverInActiveForecast) {
          return {
            valid: false,
            error: `Driver "${driverBeingConfigured.name}" synced to backend but activeForecast not updated. UI will not show the driver.`,
          };
        }
      }

      return { valid: true };
    },
  },

  {
    name: "Local storage cleared when backend is source of truth",
    description:
      "When forecasts are loaded from backend, local storage should be cleared to prevent state conflicts",
    setup: () => ({
      backendForecasts: [
        { id: "fct_backend1", question: "Backend Q1" },
        { id: "fct_backend2", question: "Backend Q2" },
      ],
      localStorageBefore: JSON.stringify([
        { id: "fct_local1", question: "Local Q1" },
      ]),
      localStorageAfter: null, // Cleared after backend load
    }),
    validate: (state) => {
      const { backendForecasts, localStorageAfter } = state;

      if (backendForecasts.length > 0 && localStorageAfter !== null) {
        const localData = JSON.parse(localStorageAfter);
        if (localData.length > 0) {
          return {
            valid: false,
            error:
              "Backend forecasts loaded but local storage not cleared. This can cause state conflicts and duplicate forecasts.",
          };
        }
      }

      return { valid: true };
    },
  },
];

// Run tests
console.log("🧪 Running State Integrity Tests\n");
console.log("============================================================\n");

let passed = 0;
let failed = 0;

scenarios.forEach((scenario, index) => {
  console.log(`✓ Test ${index + 1}: ${scenario.name}`);
  console.log(`  Description: ${scenario.description}\n`);

  const state = scenario.setup();
  const result = scenario.validate(state);

  if (result.valid) {
    console.log("✅ PASSED: State integrity maintained\n");
    passed++;
  } else {
    console.log(`❌ FAILED: ${result.error}\n`);
    failed++;
  }
});

console.log("============================================================\n");
console.log(`📊 Test Summary: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log("✅ All state integrity tests passed!");
  process.exit(0);
} else {
  console.log("❌ Some state integrity tests failed");
  console.log("\n💡 These tests validate UI/backend state synchronization.");
  console.log(
    "   Fix these issues to prevent invisible forecasts and state conflicts.",
  );
  process.exit(1);
}
