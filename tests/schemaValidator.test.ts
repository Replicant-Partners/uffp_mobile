/**
 * Schema Validator Tests
 *
 * Tests to ensure schema validation catches all the issues identified in SCHEMA_ANALYSIS.md
 */

import {
  validateForecast,
  formatValidationResults,
} from "../src/utils/schemaValidator.js";
import type { Forecast, Driver, Agent } from "../lib/types.js";

// Test fixtures
const validForecast: Forecast = {
  id: "fct_V1StGXR8_Z5j",
  userId: "user_123",
  question: "Will AGI be achieved by 2030?",
  domain: "AI Safety",
  timeframe: "2030",
  resolutionCriteria: "AGI passes the coffee test",
  probability: 0.35, // 35% in 0-1 format
  evidence: [],
  simulations: [],
  currentVersion: 1,
  versions: [],
  status: "active",
  drivers: [
    {
      id: "drv_4f8K2h9X_L3p",
      name: "Research Breakthroughs",
      type: "binary",
      direction: "increases",
      probability: 0.5,
      agents: [
        {
          id: "agt_9mKl4P2w_Q8n",
          name: "research_monitor",
          query: "Latest AI research breakthroughs",
          schedule: "daily",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
      researchResults: [
        {
          id: "res_7xL3T6n9_M2k",
          agentId: "agt_9mKl4P2w_Q8n",
          promptId: "research_template",
          variables: {},
          summary: "Recent breakthrough in neural scaling",
          keyFindings: ["Scaling laws confirmed"],
          sources: ["arxiv.org/paper123"],
          confidence: "high",
          fullResponse: "{}",
          cost: 0.05,
          tokensUsed: 1000,
          executedAt: new Date("2024-01-01"),
          attachedToDriverId: "drv_4f8K2h9X_L3p",
        },
      ],
      evidence: [
        {
          id: "evd_2pN8K5w4_R9m",
          type: "url",
          content: "https://openai.com/news/gpt5",
          source: "OpenAI",
          confidence: "high",
          attachedTo: "driver",
          attachedToId: "drv_4f8K2h9X_L3p",
          timestamp: new Date("2024-01-01"),
        },
      ],
      aiRecommendation: {
        type: "binary",
        direction: "increases",
        reasoning: "AI research breakthroughs increase AGI probability",
      },
      version: { major: 1, minor: 0 },
      versionHistory: [],
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
  ],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const invalidForecast: Forecast = {
  id: "old-timestamp-1234567890", // Old ID format (warning)
  userId: "user_123",
  question: "Will AGI be achieved by 2030?",
  probability: 150, // INVALID: probability > 1
  evidence: [],
  simulations: [],
  currentVersion: 1,
  versions: [],
  status: "active",
  drivers: [
    {
      id: "1234567890", // Old ID format (warning)
      name: "Research Breakthroughs",
      type: "binary",
      direction: "increases",
      probability: undefined, // INVALID: binary driver missing probability
      agents: [
        {
          id: "old-agent-id",
          name: "research_monitor",
          query: "Latest AI research breakthroughs",
          schedule: "every-hour", // INVALID: invalid schedule
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
      researchResults: [
        {
          id: "old-research-id",
          agentId: "non-existent-agent", // INVALID: orphaned research
          promptId: "research_template",
          variables: {},
          summary: "Recent breakthrough",
          keyFindings: [],
          sources: [],
          confidence: "high",
          fullResponse: "{}",
          cost: 0,
          tokensUsed: 0,
          executedAt: new Date(),
          attachedToDriverId: "wrong-driver-id", // INVALID: wrong driver reference
        },
      ],
      evidence: [],
      version: { major: 1, minor: 0 },
      versionHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
} as any;

const missingFieldsForecast: Forecast = {
  id: "", // INVALID: empty ID
  userId: "user_123",
  question: "", // INVALID: empty question
  evidence: [],
  simulations: [],
  currentVersion: 1,
  versions: [],
  status: "draft",
  drivers: [
    {
      id: "drv_test",
      name: "", // INVALID: empty name
      type: "continuous",
      direction: "decreases",
      distribution: "triangular",
      // INVALID: missing p5, p50, p95 for triangular
      agents: [],
      researchResults: [],
      evidence: [],
      version: { major: 1, minor: 0 },
      versionHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
} as any;

// Test suite
function runTests() {
  console.log("🧪 Running Schema Validation Tests\n");
  console.log("=".repeat(60));

  let passed = 0;
  let failed = 0;

  // Test 1: Valid forecast should pass
  console.log("\n✓ Test 1: Valid forecast");
  const result1 = validateForecast(validForecast);
  console.log(formatValidationResults(result1));
  if (result1.valid && result1.errors.length === 0) {
    console.log("✅ PASSED");
    passed++;
  } else {
    console.log("❌ FAILED: Expected valid forecast to pass");
    failed++;
  }

  // Test 2: Invalid forecast should fail with specific errors
  console.log(
    "\n✓ Test 2: Invalid forecast (probability, orphaned research, etc.)",
  );
  const result2 = validateForecast(invalidForecast);
  console.log(formatValidationResults(result2));

  const expectedErrors = [
    "PROBABILITY_RANGE", // forecast probability > 1
    "BINARY_REQUIRES_PROBABILITY", // binary driver missing probability
    "VALID_SCHEDULE", // invalid schedule
    "DRIVER_REFERENCE_MISMATCH", // wrong attachedToDriverId
  ];

  const expectedWarnings = [
    "ORPHANED_RESEARCH", // research references non-existent agent
    "ID_FORMAT", // old ID formats
  ];

  const foundErrors = expectedErrors.filter((rule) =>
    result2.errors.some((e) => e.rule === rule),
  );

  const foundWarnings = expectedWarnings.filter((rule) =>
    result2.warnings.some((w) => w.rule === rule),
  );

  if (!result2.valid && foundErrors.length === expectedErrors.length) {
    console.log(
      `✅ PASSED: Found all ${expectedErrors.length} expected errors`,
    );
    passed++;
  } else {
    console.log(
      `❌ FAILED: Expected ${expectedErrors.length} errors, found ${foundErrors.length}`,
    );
    console.log(
      `Missing errors: ${expectedErrors.filter((e) => !foundErrors.includes(e)).join(", ")}`,
    );
    failed++;
  }

  // Test 3: Missing fields should fail
  console.log("\n✓ Test 3: Missing required fields");
  const result3 = validateForecast(missingFieldsForecast);
  console.log(formatValidationResults(result3));

  const requiredFieldErrors = [
    "REQUIRED_FIELD", // empty question, name, id
    "TRIANGULAR_REQUIRES_PERCENTILES", // missing p5, p50, p95
  ];

  const hasRequiredFieldErrors = requiredFieldErrors.every((rule) =>
    result3.errors.some((e) => e.rule === rule),
  );

  if (!result3.valid && hasRequiredFieldErrors) {
    console.log("✅ PASSED: Detected all missing required fields");
    passed++;
  } else {
    console.log("❌ FAILED: Did not detect all required field violations");
    failed++;
  }

  // Test 4: Probability range validation
  console.log("\n✓ Test 4: Probability range 0-1");
  const badProbForecast: Forecast = {
    ...validForecast,
    drivers: [
      {
        ...validForecast.drivers[0],
        probability: 50, // INVALID: should be 0.5, not 50
      },
    ],
  };
  const result4 = validateForecast(badProbForecast);

  if (
    !result4.valid &&
    result4.errors.some((e) => e.rule === "PROBABILITY_RANGE")
  ) {
    console.log("✅ PASSED: Detected probability not in 0-1 range");
    passed++;
  } else {
    console.log("❌ FAILED: Did not detect invalid probability range");
    failed++;
  }

  // Test 5: ID format warnings
  console.log("\n✓ Test 5: ID format validation");
  const oldIdForecast: Forecast = {
    ...validForecast,
    id: "1234567890", // Old timestamp format
  };
  const result5 = validateForecast(oldIdForecast);

  if (result5.warnings.some((w) => w.rule === "ID_FORMAT")) {
    console.log("✅ PASSED: Detected old ID format as warning");
    passed++;
  } else {
    console.log("❌ FAILED: Did not warn about old ID format");
    failed++;
  }

  // Test 6: Direction validation
  console.log("\n✓ Test 6: Direction field required");
  const missingDirectionForecast: Forecast = {
    ...validForecast,
    drivers: [
      {
        ...validForecast.drivers[0],
        direction: undefined as any, // INVALID: missing direction
      },
    ],
  };
  const result6 = validateForecast(missingDirectionForecast);

  if (
    !result6.valid &&
    result6.errors.some(
      (e) => e.rule === "REQUIRED_FIELD" && e.field === "direction",
    )
  ) {
    console.log("✅ PASSED: Detected missing direction field");
    passed++;
  } else {
    console.log("❌ FAILED: Did not detect missing direction");
    failed++;
  }

  // Test 7: Version field validation
  console.log("\n✓ Test 7: Version field validation");
  const missingVersionForecast: Forecast = {
    ...validForecast,
    drivers: [
      {
        ...validForecast.drivers[0],
        version: undefined as any, // INVALID: missing version
      },
    ],
  };
  const result7 = validateForecast(missingVersionForecast);

  if (
    !result7.valid &&
    result7.errors.some(
      (e) => e.rule === "REQUIRED_FIELD" && e.field === "version",
    )
  ) {
    console.log("✅ PASSED: Detected missing version field");
    passed++;
  } else {
    console.log("❌ FAILED: Did not detect missing version");
    failed++;
  }

  // Test 8: Invalid version format
  console.log("\n✓ Test 8: Invalid version format");
  const invalidVersionForecast: Forecast = {
    ...validForecast,
    drivers: [
      {
        ...validForecast.drivers[0],
        version: { major: 0, minor: 0 } as any, // INVALID: major must be >= 1
      },
    ],
  };
  const result8 = validateForecast(invalidVersionForecast);

  if (
    !result8.valid &&
    result8.errors.some((e) => e.rule === "INVALID_VERSION_NUMBER")
  ) {
    console.log("✅ PASSED: Detected invalid version numbers");
    passed++;
  } else {
    console.log("❌ FAILED: Did not detect invalid version numbers");
    failed++;
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log("✅ All tests passed!");
    return 0;
  } else {
    console.log("❌ Some tests failed");
    return 1;
  }
}

// Run tests if executed directly
if (require.main === module) {
  const exitCode = runTests();
  process.exit(exitCode);
}

export { runTests };
