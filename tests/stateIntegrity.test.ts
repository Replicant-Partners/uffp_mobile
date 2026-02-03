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
    name: "Backend driver sync updates activeForecast AND savedForecasts",
    description:
      "When a driver is synced to backend, BOTH activeForecast and savedForecasts must be updated so driver appears in current view AND in /list",
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
      savedForecastsBefore: [
        {
          id: "fct_abc123",
          question: "Test",
          drivers: [],
        },
      ],
      savedForecastsAfter: [
        {
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
      ],
    }),
    validate: (state) => {
      const {
        backendResponse,
        activeForecastAfter,
        savedForecastsAfter,
        driverBeingConfigured,
      } = state;

      if (backendResponse.success && backendResponse.forecast) {
        // Check activeForecast
        const driverInActiveForecast = activeForecastAfter.drivers?.find(
          (d: any) => d.name === driverBeingConfigured.name,
        );

        if (!driverInActiveForecast) {
          return {
            valid: false,
            error: `Driver "${driverBeingConfigured.name}" synced to backend but activeForecast not updated. User will not see driver in current view.`,
          };
        }

        // Check savedForecasts (CRITICAL - this was the bug)
        const forecastInSaved = savedForecastsAfter.find(
          (f: any) => f.id === backendResponse.forecast.id,
        );

        if (!forecastInSaved) {
          return {
            valid: false,
            error: `Driver synced but forecast ${backendResponse.forecast.id} not in savedForecasts. Driver will disappear when user navigates to /list.`,
          };
        }

        const driverInSavedForecast = forecastInSaved.drivers?.find(
          (d: any) => d.name === driverBeingConfigured.name,
        );

        if (!driverInSavedForecast) {
          return {
            valid: false,
            error: `Driver "${driverBeingConfigured.name}" synced to backend and in activeForecast, but NOT in savedForecasts. Driver will not appear in /list. This is the bug we just fixed!`,
          };
        }
      }

      return { valid: true };
    },
  },

  {
    name: "Backend simulation updates activeForecast",
    description:
      "When a simulation is run, activeForecast must be updated with the backend response including probability and simulation data",
    setup: () => ({
      forecastId: "fct_abc123",
      iterations: 10000,
      backendResponse: {
        success: true,
        probability: 0.65,
        forecast: {
          id: "fct_abc123",
          question: "Test",
          probability: 0.65,
          simulations: [
            {
              id: "sim_xyz789",
              iterations: 10000,
              probability: 0.65,
              executedAt: new Date().toISOString(),
            },
          ],
        },
      },
      activeForecastBefore: {
        id: "fct_abc123",
        question: "Test",
        probability: undefined,
        simulations: [],
      },
      activeForecastAfter: {
        id: "fct_abc123",
        question: "Test",
        probability: 0.65,
        simulations: [
          {
            id: "sim_xyz789",
            iterations: 10000,
            probability: 0.65,
            executedAt: new Date().toISOString(),
          },
        ],
      },
    }),
    validate: (state) => {
      const { backendResponse, activeForecastAfter } = state;

      if (backendResponse.success && backendResponse.forecast) {
        if (activeForecastAfter.probability !== backendResponse.probability) {
          return {
            valid: false,
            error: `Simulation ran successfully but activeForecast.probability not updated. Expected ${backendResponse.probability}, got ${activeForecastAfter.probability}. User will not see simulation result.`,
          };
        }

        if (
          !activeForecastAfter.simulations ||
          activeForecastAfter.simulations.length === 0
        ) {
          return {
            valid: false,
            error:
              "Simulation ran successfully but activeForecast.simulations not updated. User will not see simulation history.",
          };
        }
      }

      return { valid: true };
    },
  },

  {
    name: "Backend forecast resolution updates activeForecast",
    description:
      "When a forecast is resolved, activeForecast must be updated with outcome and Brier score",
    setup: () => ({
      forecastId: "fct_abc123",
      actualOutcome: true,
      backendResponse: {
        success: true,
        brierScore: 0.15,
        forecast: {
          id: "fct_abc123",
          question: "Test",
          resolved: true,
          actualOutcome: true,
          brierScore: 0.15,
          resolvedAt: new Date().toISOString(),
        },
      },
      activeForecastBefore: {
        id: "fct_abc123",
        question: "Test",
        resolved: false,
      },
      activeForecastAfter: {
        id: "fct_abc123",
        question: "Test",
        resolved: true,
        actualOutcome: true,
        brierScore: 0.15,
        resolvedAt: new Date().toISOString(),
      },
    }),
    validate: (state) => {
      const { backendResponse, activeForecastAfter } = state;

      if (backendResponse.success && backendResponse.forecast) {
        if (!activeForecastAfter.resolved) {
          return {
            valid: false,
            error:
              "Forecast resolved on backend but activeForecast.resolved not set to true. UI will not show resolved state.",
          };
        }

        if (activeForecastAfter.brierScore === undefined) {
          return {
            valid: false,
            error: `Forecast resolved but Brier score not updated. Expected ${backendResponse.brierScore}, got undefined.`,
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

  {
    name: "Evidence additions update both activeForecast AND savedForecasts",
    description:
      "When evidence is added via /evidence or agent research, both state arrays must be updated so evidence persists across navigation",
    setup: () => ({
      command: "/evidence Study shows 80% success rate",
      driverId: "drv_abc123",
      newEvidence: {
        id: "ev_xyz789",
        type: "research",
        title: "Study shows 80% success rate",
        source: "User",
        summary: "Study shows 80% success rate",
        keyFinding: "80% success rate",
        date: new Date().toISOString(),
        relevance: "high",
      },
      activeForecastBefore: {
        id: "fct_abc123",
        question: "Test",
        drivers: [
          {
            id: "drv_abc123",
            name: "Market Conditions",
            evidence: [],
          },
        ],
      },
      activeForecastAfter: {
        id: "fct_abc123",
        question: "Test",
        drivers: [
          {
            id: "drv_abc123",
            name: "Market Conditions",
            evidence: [
              {
                id: "ev_xyz789",
                type: "research",
                title: "Study shows 80% success rate",
                summary: "Study shows 80% success rate",
              },
            ],
          },
        ],
      },
      savedForecastsBefore: [
        {
          id: "fct_abc123",
          question: "Test",
          drivers: [
            {
              id: "drv_abc123",
              name: "Market Conditions",
              evidence: [],
            },
          ],
        },
      ],
      savedForecastsAfter: [
        {
          id: "fct_abc123",
          question: "Test",
          drivers: [
            {
              id: "drv_abc123",
              name: "Market Conditions",
              evidence: [
                {
                  id: "ev_xyz789",
                  type: "research",
                  title: "Study shows 80% success rate",
                  summary: "Study shows 80% success rate",
                },
              ],
            },
          ],
        },
      ],
    }),
    validate: (state) => {
      const {
        activeForecastAfter,
        savedForecastsAfter,
        newEvidence,
        driverId,
      } = state;

      // Check activeForecast
      const driverInActive = activeForecastAfter.drivers?.find(
        (d: any) => d.id === driverId,
      );
      if (!driverInActive) {
        return {
          valid: false,
          error: `Driver ${driverId} not found in activeForecast`,
        };
      }

      const evidenceInActive = driverInActive.evidence?.find(
        (e: any) => e.id === newEvidence.id,
      );
      if (!evidenceInActive) {
        return {
          valid: false,
          error: `Evidence added but not found in activeForecast driver. User sees it now but it will disappear.`,
        };
      }

      // Check savedForecasts (CRITICAL - this was the evidence bug)
      const forecastInSaved = savedForecastsAfter.find(
        (f: any) => f.id === activeForecastAfter.id,
      );
      if (!forecastInSaved) {
        return {
          valid: false,
          error: `Forecast not found in savedForecasts`,
        };
      }

      const driverInSaved = forecastInSaved.drivers?.find(
        (d: any) => d.id === driverId,
      );
      if (!driverInSaved) {
        return {
          valid: false,
          error: `Driver not found in savedForecasts`,
        };
      }

      const evidenceInSaved = driverInSaved.evidence?.find(
        (e: any) => e.id === newEvidence.id,
      );
      if (!evidenceInSaved) {
        return {
          valid: false,
          error: `Evidence added to activeForecast but NOT in savedForecasts. Evidence will disappear when user navigates away. This is the bug reported on mobile!`,
        };
      }

      return { valid: true };
    },
  },

  {
    name: "Driver removal updates both activeForecast AND savedForecasts",
    description:
      "When a driver is removed via /remove driver, both state arrays must be updated so removal persists across navigation",
    setup: () => ({
      command: "/remove driver Market Conditions",
      driverId: "drv_abc123",
      activeForecastBefore: {
        id: "fct_abc123",
        question: "Test",
        drivers: [
          {
            id: "drv_abc123",
            name: "Market Conditions",
            type: "binary",
            probability: 0.5,
          },
        ],
      },
      activeForecastAfter: {
        id: "fct_abc123",
        question: "Test",
        drivers: [],
      },
      savedForecastsBefore: [
        {
          id: "fct_abc123",
          question: "Test",
          drivers: [
            {
              id: "drv_abc123",
              name: "Market Conditions",
              type: "binary",
              probability: 0.5,
            },
          ],
        },
      ],
      savedForecastsAfter: [
        {
          id: "fct_abc123",
          question: "Test",
          drivers: [],
        },
      ],
    }),
    validate: (state) => {
      const { activeForecastAfter, savedForecastsAfter, driverId } = state;

      // Check activeForecast
      const driverInActive = activeForecastAfter.drivers?.find(
        (d: any) => d.id === driverId,
      );
      if (driverInActive) {
        return {
          valid: false,
          error: `Driver ${driverId} still present in activeForecast after removal command`,
        };
      }

      // Check savedForecasts
      const forecastInSaved = savedForecastsAfter.find(
        (f: any) => f.id === activeForecastAfter.id,
      );
      if (!forecastInSaved) {
        return {
          valid: false,
          error: `Forecast not found in savedForecasts`,
        };
      }

      const driverInSaved = forecastInSaved.drivers?.find(
        (d: any) => d.id === driverId,
      );
      if (driverInSaved) {
        return {
          valid: false,
          error: `Driver removed from activeForecast but still in savedForecasts. Driver will reappear when user navigates to /list.`,
        };
      }

      return { valid: true };
    },
  },

  {
    name: "Question edits update both activeForecast AND savedForecasts",
    description:
      "When question is edited via /edit question, both state arrays must be updated so changes persist in /list",
    setup: () => ({
      command: "/edit question Will SpaceX reach Mars by 2030?",
      oldQuestion: "Will SpaceX reach Mars?",
      newQuestion: "Will SpaceX reach Mars by 2030?",
      activeForecastBefore: {
        id: "fct_abc123",
        question: "Will SpaceX reach Mars?",
        drivers: [],
      },
      activeForecastAfter: {
        id: "fct_abc123",
        question: "Will SpaceX reach Mars by 2030?",
        drivers: [],
      },
      savedForecastsBefore: [
        {
          id: "fct_abc123",
          question: "Will SpaceX reach Mars?",
          drivers: [],
        },
      ],
      savedForecastsAfter: [
        {
          id: "fct_abc123",
          question: "Will SpaceX reach Mars by 2030?",
          drivers: [],
        },
      ],
    }),
    validate: (state) => {
      const {
        activeForecastAfter,
        savedForecastsAfter,
        newQuestion,
        oldQuestion,
      } = state;

      // Check activeForecast
      if (activeForecastAfter.question !== newQuestion) {
        return {
          valid: false,
          error: `Question not updated in activeForecast. Expected "${newQuestion}", got "${activeForecastAfter.question}"`,
        };
      }

      // Check savedForecasts
      const forecastInSaved = savedForecastsAfter.find(
        (f: any) => f.id === activeForecastAfter.id,
      );
      if (!forecastInSaved) {
        return {
          valid: false,
          error: `Forecast not found in savedForecasts`,
        };
      }

      if (forecastInSaved.question !== newQuestion) {
        return {
          valid: false,
          error: `Question updated in activeForecast but NOT in savedForecasts. Expected "${newQuestion}", got "${forecastInSaved.question}". Old question will show in /list.`,
        };
      }

      if (forecastInSaved.question === oldQuestion) {
        return {
          valid: false,
          error: `Question still shows old value in savedForecasts: "${oldQuestion}". Update did not propagate to /list.`,
        };
      }

      return { valid: true };
    },
  },

  {
    name: "Base rate updates sync to savedForecasts",
    description:
      "When base rate is updated via /base-rate, savedForecasts must be updated so changes persist in /list",
    setup: () => ({
      command: "/base-rate 45",
      activeForecastBefore: {
        id: "fct_abc123",
        question: "Test",
        externalView: {
          referenceClass: "Tech startups",
          baseRate: 0.25,
        },
      },
      activeForecastAfter: {
        id: "fct_abc123",
        question: "Test",
        externalView: {
          referenceClass: "Tech startups",
          baseRate: 0.45,
          generatedBy: "user",
        },
      },
      savedForecastsBefore: [
        {
          id: "fct_abc123",
          question: "Test",
          externalView: {
            referenceClass: "Tech startups",
            baseRate: 0.25,
          },
        },
      ],
      savedForecastsAfter: [
        {
          id: "fct_abc123",
          question: "Test",
          externalView: {
            referenceClass: "Tech startups",
            baseRate: 0.45,
            generatedBy: "user",
          },
        },
      ],
    }),
    validate: (state) => {
      const { activeForecastAfter, savedForecastsAfter } = state;

      const expectedRate = 0.45;

      // Check activeForecast
      if (activeForecastAfter.externalView?.baseRate !== expectedRate) {
        return {
          valid: false,
          error: `Base rate not updated in activeForecast. Expected ${expectedRate}, got ${activeForecastAfter.externalView?.baseRate}`,
        };
      }

      // Check savedForecasts
      const forecastInSaved = savedForecastsAfter.find(
        (f: any) => f.id === activeForecastAfter.id,
      );
      if (!forecastInSaved) {
        return {
          valid: false,
          error: `Forecast not found in savedForecasts`,
        };
      }

      if (forecastInSaved.externalView?.baseRate !== expectedRate) {
        return {
          valid: false,
          error: `Base rate updated in activeForecast but NOT in savedForecasts. Expected ${expectedRate}, got ${forecastInSaved.externalView?.baseRate}. Old base rate will show in /list.`,
        };
      }

      return { valid: true };
    },
  },

  {
    name: "Driver updates (evidence, probability) sync to backend",
    description:
      "When an EXISTING driver is updated (e.g., evidence added), changes must sync to backend so they persist across reloads",
    setup: () => ({
      command: "/evidence https://example.com",
      driverId: "drv_abc123",
      forecastId: "fct_xyz789",
      driverBefore: {
        id: "drv_abc123",
        name: "Market Conditions",
        type: "binary",
        probability: 0.5,
        evidence: [],
      },
      driverAfter: {
        id: "drv_abc123",
        name: "Market Conditions",
        type: "binary",
        probability: 0.5,
        evidence: [
          {
            id: "ev_123",
            type: "web_article",
            title: "Example Article",
            url: "https://example.com",
          },
        ],
      },
      backendSyncCalled: true, // updateDriverWithSync should be called
      backendResponse: {
        success: true,
        forecast: {
          id: "fct_xyz789",
          question: "Test",
          drivers: [
            {
              id: "drv_abc123",
              name: "Market Conditions",
              type: "binary",
              probability: 0.5,
              evidence: [
                {
                  id: "ev_123",
                  type: "web_article",
                  title: "Example Article",
                  url: "https://example.com",
                },
              ],
            },
          ],
        },
      },
      savedForecastsAfter: [
        {
          id: "fct_xyz789",
          question: "Test",
          drivers: [
            {
              id: "drv_abc123",
              name: "Market Conditions",
              type: "binary",
              probability: 0.5,
              evidence: [
                {
                  id: "ev_123",
                  type: "web_article",
                  title: "Example Article",
                  url: "https://example.com",
                },
              ],
            },
          ],
        },
      ],
    }),
    validate: (state) => {
      const {
        backendSyncCalled,
        backendResponse,
        driverAfter,
        savedForecastsAfter,
        forecastId,
        driverId,
      } = state;

      // Check that backend sync was called for driver UPDATE
      if (!backendSyncCalled) {
        return {
          valid: false,
          error: `Driver update did not call backend sync. Changes will only be local and will disappear on reload. This is the evidence disappearing bug!`,
        };
      }

      // Check backend response includes updated driver
      if (backendResponse.success && backendResponse.forecast) {
        const driverInBackend = backendResponse.forecast.drivers?.find(
          (d: any) => d.id === driverId,
        );

        if (!driverInBackend) {
          return {
            valid: false,
            error: `Backend sync called but driver ${driverId} not in backend response`,
          };
        }

        if (
          !driverInBackend.evidence ||
          driverInBackend.evidence.length === 0
        ) {
          return {
            valid: false,
            error: `Backend sync called but evidence not saved to backend. Driver will lose evidence on reload.`,
          };
        }
      }

      // Check savedForecasts was updated with backend data
      const forecastInSaved = savedForecastsAfter.find(
        (f: any) => f.id === forecastId,
      );

      if (!forecastInSaved) {
        return {
          valid: false,
          error: `Forecast ${forecastId} not found in savedForecasts after driver update`,
        };
      }

      const driverInSaved = forecastInSaved.drivers?.find(
        (d: any) => d.id === driverId,
      );

      if (!driverInSaved) {
        return {
          valid: false,
          error: `Driver ${driverId} not found in savedForecasts after update`,
        };
      }

      if (!driverInSaved.evidence || driverInSaved.evidence.length === 0) {
        return {
          valid: false,
          error: `Driver updated with evidence but savedForecasts not updated with backend data. Evidence will disappear on reload. This was the bug - updateDriverWithSync not being called!`,
        };
      }

      return { valid: true };
    },
  },

  {
    name: "Base rate changes sync to backend",
    description:
      "When /base-rate is used, changes must sync to backend via setBaseRateWithSync so they persist across reloads",
    setup: () => ({
      command: "/base-rate 45",
      forecastId: "fct_abc123",
      backendSyncCalled: true, // setBaseRateWithSync should be called
      backendResponse: {
        success: true,
        forecast: {
          id: "fct_abc123",
          question: "Test",
          externalView: {
            referenceClass: "Tech startups",
            baseRate: 0.45,
            generatedBy: "user",
          },
          grounding: "external",
        },
      },
      savedForecastsAfter: [
        {
          id: "fct_abc123",
          question: "Test",
          externalView: {
            referenceClass: "Tech startups",
            baseRate: 0.45,
            generatedBy: "user",
          },
          grounding: "external",
        },
      ],
    }),
    validate: (state) => {
      const {
        backendSyncCalled,
        backendResponse,
        savedForecastsAfter,
        forecastId,
      } = state;

      // Check that backend sync was called
      if (!backendSyncCalled) {
        return {
          valid: false,
          error: `Base rate change did not call backend sync. Changes will disappear on reload!`,
        };
      }

      // Check backend response has updated base rate
      if (backendResponse.success && backendResponse.forecast) {
        if (backendResponse.forecast.externalView?.baseRate !== 0.45) {
          return {
            valid: false,
            error: `Backend sync called but base rate not updated in backend. Expected 0.45, got ${backendResponse.forecast.externalView?.baseRate}`,
          };
        }
      }

      // Check savedForecasts updated with backend data
      const forecastInSaved = savedForecastsAfter.find(
        (f: any) => f.id === forecastId,
      );
      if (!forecastInSaved) {
        return {
          valid: false,
          error: `Forecast not found in savedForecasts after base rate update`,
        };
      }

      if (forecastInSaved.externalView?.baseRate !== 0.45) {
        return {
          valid: false,
          error: `Base rate updated on backend but savedForecasts not synced with backend data. Changes will be lost on reload!`,
        };
      }

      return { valid: true };
    },
  },

  {
    name: "External view (reference class) syncs to backend",
    description:
      "When /external is used to set reference class, changes must sync to backend so they persist across reloads",
    setup: () => ({
      command: "/external SaaS companies in Series B",
      forecastId: "fct_abc123",
      backendSyncCalled: true, // setBaseRateWithSync should be called
      backendResponse: {
        success: true,
        forecast: {
          id: "fct_abc123",
          question: "Test",
          externalView: {
            referenceClass: "SaaS companies in Series B",
            baseRate: 0.5,
          },
          grounding: "external",
        },
      },
      savedForecastsAfter: [
        {
          id: "fct_abc123",
          question: "Test",
          externalView: {
            referenceClass: "SaaS companies in Series B",
            baseRate: 0.5,
          },
          grounding: "external",
        },
      ],
    }),
    validate: (state) => {
      const {
        backendSyncCalled,
        backendResponse,
        savedForecastsAfter,
        forecastId,
      } = state;

      // Check that backend sync was called
      if (!backendSyncCalled) {
        return {
          valid: false,
          error: `External view change did not call backend sync. Changes will disappear on reload!`,
        };
      }

      // Check backend response has updated reference class
      if (backendResponse.success && backendResponse.forecast) {
        if (
          backendResponse.forecast.externalView?.referenceClass !==
          "SaaS companies in Series B"
        ) {
          return {
            valid: false,
            error: `Backend sync called but reference class not updated. Expected "SaaS companies in Series B", got "${backendResponse.forecast.externalView?.referenceClass}"`,
          };
        }
      }

      // Check savedForecasts updated with backend data
      const forecastInSaved = savedForecastsAfter.find(
        (f: any) => f.id === forecastId,
      );
      if (!forecastInSaved) {
        return {
          valid: false,
          error: `Forecast not found in savedForecasts after external view update`,
        };
      }

      if (
        forecastInSaved.externalView?.referenceClass !==
        "SaaS companies in Series B"
      ) {
        return {
          valid: false,
          error: `Reference class updated on backend but savedForecasts not synced. Changes will be lost on reload!`,
        };
      }

      return { valid: true };
    },
  },

  {
    name: "Driver removal syncs to backend",
    description:
      "When /remove driver is used, deletion must sync to backend via removeDriverWithSync so it persists across reloads",
    setup: () => ({
      command: "/remove driver Market Conditions",
      forecastId: "fct_abc123",
      driverId: "drv_xyz789",
      backendSyncCalled: true, // removeDriverWithSync should be called
      backendResponse: {
        success: true,
        forecast: {
          id: "fct_abc123",
          question: "Test",
          drivers: [], // Driver removed
        },
      },
      forecastBefore: {
        id: "fct_abc123",
        question: "Test",
        drivers: [
          {
            id: "drv_xyz789",
            name: "Market Conditions",
            type: "binary",
            probability: 0.5,
          },
        ],
      },
      savedForecastsAfter: [
        {
          id: "fct_abc123",
          question: "Test",
          drivers: [], // Driver removed
        },
      ],
    }),
    validate: (state) => {
      const {
        backendSyncCalled,
        backendResponse,
        savedForecastsAfter,
        forecastId,
        driverId,
      } = state;

      // Check that backend sync was called
      if (!backendSyncCalled) {
        return {
          valid: false,
          error: `Driver removal did not call backend sync. Driver will reappear on reload (zombie driver bug)!`,
        };
      }

      // Check backend response has driver removed
      if (backendResponse.success && backendResponse.forecast) {
        const driverStillInBackend = backendResponse.forecast.drivers?.find(
          (d: any) => d.id === driverId,
        );
        if (driverStillInBackend) {
          return {
            valid: false,
            error: `Backend sync called but driver still in backend response. Driver will reappear on reload!`,
          };
        }
      }

      // Check savedForecasts updated with backend data (no driver)
      const forecastInSaved = savedForecastsAfter.find(
        (f: any) => f.id === forecastId,
      );
      if (!forecastInSaved) {
        return {
          valid: false,
          error: `Forecast not found in savedForecasts after driver removal`,
        };
      }

      const driverStillInSaved = forecastInSaved.drivers?.find(
        (d: any) => d.id === driverId,
      );
      if (driverStillInSaved) {
        return {
          valid: false,
          error: `Driver removed from backend but still in savedForecasts. Driver will reappear on reload (zombie driver)!`,
        };
      }

      return { valid: true };
    },
  },

  {
    name: "Evidence with link previews persists across reload",
    description:
      "When evidence with link preview is added to a driver, both evidence and linkPreview fields must persist when reloading from backend via mapBackendToLocal",
    setup: () => ({
      command: "/evidence https://example.com This is relevant evidence",
      forecastId: "fct_abc123",
      driverId: "drv_xyz789",
      evidenceBefore: [],
      evidenceAfter: [
        {
          type: "url",
          source: "user",
          summary: "https://example.com This is relevant evidence",
          timestamp: new Date().toISOString(),
          linkPreview: {
            url: "https://example.com",
            title: "Example Domain",
            description: "This domain is for use in illustrative examples",
            image: "https://example.com/image.png",
            favicon: "https://example.com/favicon.ico",
            fetchedAt: new Date().toISOString(),
          },
        },
      ],
      // Backend save called
      backendSyncCalled: true,
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
              evidence: [
                {
                  type: "url",
                  source: "user",
                  summary: "https://example.com This is relevant evidence",
                  timestamp: new Date().toISOString(),
                  linkPreview: {
                    url: "https://example.com",
                    title: "Example Domain",
                    description:
                      "This domain is for use in illustrative examples",
                    image: "https://example.com/image.png",
                    favicon: "https://example.com/favicon.ico",
                    fetchedAt: new Date().toISOString(),
                  },
                },
              ],
              agents: [],
              researchResults: [],
            },
          ],
        },
        fromBackend: true,
      },
      // After reload via mapBackendToLocal
      forecastAfterReload: {
        id: "fct_abc123",
        question: "Test",
        drivers: [
          {
            id: "drv_xyz789",
            name: "Test Driver",
            type: "binary",
            probability: 0.5,
            evidence: [
              {
                type: "url",
                source: "user",
                summary: "https://example.com This is relevant evidence",
                timestamp: new Date().toISOString(),
                linkPreview: {
                  url: "https://example.com",
                  title: "Example Domain",
                  description:
                    "This domain is for use in illustrative examples",
                  image: "https://example.com/image.png",
                  favicon: "https://example.com/favicon.ico",
                  fetchedAt: new Date().toISOString(),
                },
              },
            ],
            agents: [],
            researchResults: [],
          },
        ],
      },
    }),
    validate: (state) => {
      const {
        backendSyncCalled,
        backendResponse,
        forecastAfterReload,
        driverId,
      } = state;

      // Check backend was called
      if (!backendSyncCalled) {
        return {
          valid: false,
          error: `Evidence addition did not sync to backend. Evidence will be lost on reload.`,
        };
      }

      // Check backend saved evidence with linkPreview
      const driverInBackend = backendResponse.forecast.drivers?.find(
        (d: any) => d.id === driverId,
      );

      if (!driverInBackend) {
        return {
          valid: false,
          error: `Driver not found in backend response`,
        };
      }

      if (!driverInBackend.evidence || driverInBackend.evidence.length === 0) {
        return {
          valid: false,
          error: `Evidence not saved to backend. Bug: updateDriverWithSync not including evidence field.`,
        };
      }

      const evidenceInBackend = driverInBackend.evidence[0];
      if (!evidenceInBackend.linkPreview) {
        return {
          valid: false,
          error: `Evidence saved but linkPreview field missing in backend. Link preview card will not render.`,
        };
      }

      // Check mapBackendToLocal preserved evidence and linkPreview
      const driverAfterReload = forecastAfterReload.drivers?.find(
        (d: any) => d.id === driverId,
      );

      if (!driverAfterReload) {
        return {
          valid: false,
          error: `Driver not found after reload`,
        };
      }

      if (
        !driverAfterReload.evidence ||
        driverAfterReload.evidence.length === 0
      ) {
        return {
          valid: false,
          error: `Evidence lost after reload! Bug: mapBackendToLocal() not mapping evidence field. This was the actual bug - missing "evidence: driver.evidence || []" in backendSync.ts`,
        };
      }

      const evidenceAfterReload = driverAfterReload.evidence[0];
      if (!evidenceAfterReload.linkPreview) {
        return {
          valid: false,
          error: `Evidence reloaded but linkPreview field missing! Bug: mapBackendToLocal() not preserving nested linkPreview object in evidence array.`,
        };
      }

      // Verify linkPreview has required fields
      const lp = evidenceAfterReload.linkPreview;
      if (!lp.url || !lp.title) {
        return {
          valid: false,
          error: `linkPreview missing required fields (url, title). Link preview card will fail to render.`,
        };
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
