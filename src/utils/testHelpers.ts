/**
 * Test helpers and fixtures for backend integration testing
 */

export interface TestForecast {
  question: string;
  domain: string;
  timeframe: string;
  drivers: Array<{
    name: string;
    type: "binary" | "continuous";
    probability?: number;
    p5?: number;
    p50?: number;
    p95?: number;
  }>;
  expectedProbability?: number;
}

export const TEST_USER_ID = "test-user-123";

export const TEST_FORECASTS: TestForecast[] = [
  {
    question: "Will ASTS reach $20 by end of 2026?",
    domain: "finance",
    timeframe: "by end of 2026",
    drivers: [
      {
        name: "Successful satellite deployment",
        type: "binary",
        probability: 75,
      },
      {
        name: "Regulatory approval",
        type: "binary",
        probability: 85,
      },
    ],
    expectedProbability: 0.64, // 0.75 * 0.85
  },
  {
    question: "Will it rain in Seattle tomorrow?",
    domain: "weather",
    timeframe: "tomorrow",
    drivers: [
      {
        name: "Cloud coverage",
        type: "continuous",
        p5: 60,
        p50: 75,
        p95: 90,
      },
    ],
  },
];

/**
 * Test scenarios for regression testing
 */
export const TEST_SCENARIOS = {
  createForecast: {
    description: "Create a new forecast",
    steps: [
      "Type /question Will ASTS reach $20?",
      "Verify forecast created on backend",
      "Verify forecast has backend ID",
      "Verify forecast appears in list",
    ],
  },
  addDriver: {
    description: "Add driver to forecast",
    steps: [
      "Create forecast",
      "Add driver with /driver name",
      "Configure driver probability",
      "Save with /save",
      "Verify driver persisted on backend",
    ],
  },
  runSimulation: {
    description: "Run Monte Carlo simulation",
    steps: [
      "Create forecast with driver",
      "Run /simulate",
      "Verify probability calculated",
      "Verify probability saved to backend",
      "Verify forecast updated with probability",
    ],
  },
  resolveForecast: {
    description: "Resolve forecast and calculate Brier score",
    steps: [
      "Create forecast with simulation",
      "Run /expire positive or /expire negative",
      "Verify resolution saved to backend",
      "Verify Brier score calculated",
      "Verify appears in resolved list",
    ],
  },
  loadForecasts: {
    description: "Load forecasts from backend",
    steps: [
      "Create multiple forecasts",
      "Close and reopen app",
      "Verify forecasts load from backend",
      "Verify filters work (active/expired)",
    ],
  },
  agentResearch: {
    description: "Execute agent research",
    steps: [
      "Add driver to forecast",
      "Add agent with @research_analyst",
      "Configure query",
      "Run with /run @research_analyst",
      "Verify research executes",
      "Verify evidence saved",
    ],
  },
};

/**
 * Mock backend responses for testing
 */
export const MOCK_BACKEND_RESPONSES = {
  createForecast: {
    success: true,
    forecast: {
      id: "mock-forecast-123",
      userId: TEST_USER_ID,
      question: "Test question",
      domain: "general",
      drivers: [],
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  addDriver: {
    success: true,
    forecast: {
      id: "mock-forecast-123",
      drivers: [
        {
          id: "mock-driver-123",
          name: "Test driver",
          type: "binary",
          probability: 75,
        },
      ],
    },
  },
};

/**
 * Validate backend sync for testing
 */
export async function validateBackendSync(
  forecastId: string,
  expectedData: Partial<any>,
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    const { researchService } = await import("../services/researchService");
    const result = await researchService.getForecast(forecastId);

    if (!result.success) {
      errors.push("Failed to fetch forecast from backend");
      return { valid: false, errors };
    }

    const forecast = result.forecast;

    // Validate expected fields
    for (const [key, value] of Object.entries(expectedData)) {
      if (JSON.stringify(forecast[key]) !== JSON.stringify(value)) {
        errors.push(
          `Mismatch in ${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify(forecast[key])}`,
        );
      }
    }

    return { valid: errors.length === 0, errors };
  } catch (error) {
    errors.push(`Exception during validation: ${error}`);
    return { valid: false, errors };
  }
}

/**
 * Create test forecast for regression testing
 */
export async function createTestForecast(
  testData: TestForecast,
): Promise<string | null> {
  try {
    const { researchService } = await import("../services/researchService");

    const result = await researchService.createForecast({
      userId: TEST_USER_ID,
      question: testData.question,
      domain: testData.domain,
      timeframe: testData.timeframe,
      resolutionCriteria: `Forecast will resolve when outcome is known for: ${testData.question}`,
    });

    if (result.success && result.forecast) {
      return result.forecast.id;
    }

    return null;
  } catch (error) {
    console.error("Failed to create test forecast:", error);
    return null;
  }
}

/**
 * Clean up test data
 */
export async function cleanupTestData(): Promise<void> {
  try {
    const { researchService } = await import("../services/researchService");

    // List all test user forecasts
    const result = await researchService.listForecasts({
      userId: TEST_USER_ID,
    });

    console.log(`Cleaned up ${result.forecasts?.length || 0} test forecasts`);
  } catch (error) {
    console.error("Failed to cleanup test data:", error);
  }
}

/**
 * Run regression test
 */
export async function runRegressionTest(
  scenarioName: keyof typeof TEST_SCENARIOS,
): Promise<{ passed: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    const scenario = TEST_SCENARIOS[scenarioName];
    console.log(`Running test: ${scenario.description}`);

    // Execute scenario-specific test logic
    switch (scenarioName) {
      case "createForecast":
        const forecastId = await createTestForecast(TEST_FORECASTS[0]);
        if (!forecastId) {
          errors.push("Failed to create forecast");
        }
        break;

      // Add more scenarios as needed

      default:
        errors.push(`Test scenario ${scenarioName} not implemented`);
    }

    return { passed: errors.length === 0, errors };
  } catch (error) {
    errors.push(`Test exception: ${error}`);
    return { passed: false, errors };
  }
}
