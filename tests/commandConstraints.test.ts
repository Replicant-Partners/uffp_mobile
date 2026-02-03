/**
 * Command Constraints Tests
 *
 * Tests that commands only run in valid states and are blocked in invalid states.
 * This prevents bugs like agents disappearing when /query runs outside agent config.
 */

import {
  validateCommandConstraints,
  getCommandConstraints,
  getCommandsRequiringState,
  COMMAND_CONSTRAINTS,
  type AppState,
} from "../src/utils/commandConstraints";

console.log("\n🧪 Running Command Constraints Tests\n");
console.log("=".repeat(60));

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`\n✓ Test: ${name}`);
    console.log(`  ✅ PASSED`);
    passed++;
  } catch (error) {
    console.log(`\n✗ Test: ${name}`);
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : error}`);
    failed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

// Test 1: /query requires agent configuration
test("/query blocked without agent configuration", () => {
  const state: AppState = {
    agentBeingConfigured: null,
    driverBeingConfigured: null,
    activeForecast: null,
  };

  const result = validateCommandConstraints("/query sentiment analysis", state);

  assert(!result.valid, "/query should be invalid without agent configuration");
  assert(result.error?.includes("only for configuring new agents"), "Error message should mention agent configuration");
});

// Test 2: /query allowed with agent configuration
test("/query allowed with agent configuration", () => {
  const state: AppState = {
    agentBeingConfigured: { name: "sentiment_monitor" },
    driverBeingConfigured: { name: "Test Driver" },
    activeForecast: null,
  };

  const result = validateCommandConstraints("/query sentiment analysis", state);

  assert(result.valid, "/query should be valid with agent configuration");
  assert(!result.error, "No error should be present");
});

// Test 3: /schedule blocked without agent configuration
test("/schedule blocked without agent configuration", () => {
  const state: AppState = {
    agentBeingConfigured: null,
    driverBeingConfigured: null,
    activeForecast: null,
  };

  const result = validateCommandConstraints("/schedule daily", state);

  assert(!result.valid, "/schedule should be invalid without agent configuration");
  assert(result.error?.includes("only for configuring new agents"), "Error message should mention agent configuration");
});

// Test 4: /schedule allowed with agent configuration
test("/schedule allowed with agent configuration", () => {
  const state: AppState = {
    agentBeingConfigured: { name: "research_analyst", query: "test" },
    driverBeingConfigured: { name: "Test Driver" },
    activeForecast: null,
  };

  const result = validateCommandConstraints("/schedule on-demand", state);

  assert(result.valid, "/schedule should be valid with agent configuration");
});

// Test 5: /save blocked without driver configuration
test("/save blocked without driver configuration", () => {
  const state: AppState = {
    agentBeingConfigured: null,
    driverBeingConfigured: null,
    activeForecast: { id: "test", question: "Test?" },
  };

  const result = validateCommandConstraints("/save", state);

  assert(!result.valid, "/save should be invalid without driver configuration");
  assert(result.error?.includes("No driver being configured"), "Error should mention driver required");
});

// Test 6: /save allowed with driver configuration
test("/save allowed with driver configuration", () => {
  const state: AppState = {
    agentBeingConfigured: { name: "sentiment_monitor", query: "test" },
    driverBeingConfigured: { name: "Test Driver", type: "binary" },
    activeForecast: { id: "test", question: "Test?" },
  };

  const result = validateCommandConstraints("/save", state);

  assert(result.valid, "/save should be valid with driver configuration");
});

// Test 7: /p (p-values) blocked without driver
test("/p blocked without driver configuration", () => {
  const state: AppState = {
    agentBeingConfigured: null,
    driverBeingConfigured: null,
    activeForecast: { id: "test", question: "Test?" },
  };

  const result = validateCommandConstraints("/p 10 50 90", state);

  assert(!result.valid, "/p should be invalid without driver configuration");
  assert(result.error?.includes("No driver being configured"), "Error should mention driver required");
});

// Test 8: /p allowed with driver configuration
test("/p allowed with driver configuration", () => {
  const state: AppState = {
    agentBeingConfigured: null,
    driverBeingConfigured: { name: "Market Size", type: "continuous" },
    activeForecast: { id: "test", question: "Test?" },
  };

  const result = validateCommandConstraints("/p 10 50 90", state);

  assert(result.valid, "/p should be valid with driver configuration");
});

// Test 9: /simulate blocked without active forecast
test("/simulate blocked without active forecast", () => {
  const state: AppState = {
    agentBeingConfigured: null,
    driverBeingConfigured: null,
    activeForecast: null,
  };

  const result = validateCommandConstraints("/simulate", state);

  assert(!result.valid, "/simulate should be invalid without active forecast");
  assert(result.error?.includes("No active forecast"), "Error should mention forecast required");
});

// Test 10: /simulate allowed with active forecast
test("/simulate allowed with active forecast", () => {
  const state: AppState = {
    agentBeingConfigured: null,
    driverBeingConfigured: null,
    activeForecast: { id: "test", question: "Test?", drivers: [] },
  };

  const result = validateCommandConstraints("/simulate", state);

  assert(result.valid, "/simulate should be valid with active forecast");
});

// Test 11: Commands without constraints are always allowed
test("Commands without constraints always allowed", () => {
  const state: AppState = {
    agentBeingConfigured: null,
    driverBeingConfigured: null,
    activeForecast: null,
  };

  const result = validateCommandConstraints("/list", state);

  assert(result.valid, "Commands without constraints should always be valid");
  assert(!result.error, "No error should be present");
});

// Test 12: Get constraints for a command
test("Get constraints for /query command", () => {
  const constraint = getCommandConstraints("/query");

  assert(constraint !== undefined, "Constraint should exist for /query");
  assert(constraint?.command === "/query", "Command should be /query");
  assert(constraint?.requiredState?.agentBeingConfigured === true, "Should require agent configuration");
});

// Test 13: Get all commands requiring agent configuration
test("Get all commands requiring agent configuration", () => {
  const commands = getCommandsRequiringState("agentBeingConfigured");

  assert(commands.length >= 3, "Should have at least 3 commands requiring agent config");
  assert(commands.some(c => c.command === "/query"), "Should include /query");
  assert(commands.some(c => c.command === "/schedule"), "Should include /schedule");
  assert(commands.some(c => c.command === "/threshold"), "Should include /threshold");
});

// Test 14: Get all commands requiring driver configuration
test("Get all commands requiring driver configuration", () => {
  const commands = getCommandsRequiringState("driverBeingConfigured");

  assert(commands.length >= 7, "Should have at least 7 commands requiring driver config");
  assert(commands.some(c => c.command === "/save"), "Should include /save");
  assert(commands.some(c => c.command === "/p"), "Should include /p");
  assert(commands.some(c => c.command === "/probability"), "Should include /probability");
  assert(commands.some(c => c.command === "/type"), "Should include /type");
  assert(commands.some(c => c.command === "/direction"), "Should include /direction");
});

// Test 15: All driver config commands blocked without driver
test("All driver config commands blocked without driver", () => {
  const state: AppState = {
    agentBeingConfigured: null,
    driverBeingConfigured: null,
    activeForecast: { id: "test", question: "Test?" },
  };

  const driverCommands = ["/p", "/probability", "/type", "/direction", "/dist", "/evidence", "/save"];

  for (const cmd of driverCommands) {
    const result = validateCommandConstraints(cmd, state);
    assert(!result.valid, `${cmd} should be blocked without driver configuration`);
  }
});

// Test 16: All agent config commands blocked without agent
test("All agent config commands blocked without agent", () => {
  const state: AppState = {
    agentBeingConfigured: null,
    driverBeingConfigured: { name: "Test" },
    activeForecast: { id: "test", question: "Test?" },
  };

  const agentCommands = ["/query", "/schedule", "/threshold"];

  for (const cmd of agentCommands) {
    const result = validateCommandConstraints(cmd + " test", state);
    assert(!result.valid, `${cmd} should be blocked without agent configuration`);
  }
});

// Test 17: Constraint prevents batch command bug
test("Batch command bug prevented by constraints", () => {
  // Simulate the bug scenario: agent saved, then /query runs in batch
  const stateAfterAgentSaved: AppState = {
    agentBeingConfigured: null, // Agent was saved, config cleared
    driverBeingConfigured: { name: "Test Driver", agents: [{ name: "sentiment_monitor" }] },
    activeForecast: { id: "test", question: "Test?" },
  };

  // This is what was causing agents to disappear
  const result = validateCommandConstraints("/query sentiment data", stateAfterAgentSaved);

  assert(!result.valid, "/query should be blocked after agent is saved");
  assert(result.error?.includes("only for configuring new agents"), "Should show clear error message");

  console.log("  🐛 Bug prevented: /query cannot run after agent is saved");
});

// Test 18: Constraint catalog completeness
test("All defined constraints are testable", () => {
  const constraintCount = COMMAND_CONSTRAINTS.length;

  assert(constraintCount >= 11, `Should have at least 11 constraints, found ${constraintCount}`);

  console.log(`  📋 Constraint catalog has ${constraintCount} constraints`);
  console.log("  Commands with constraints:");
  COMMAND_CONSTRAINTS.forEach(c => {
    console.log(`     - ${c.command}: ${c.description}`);
  });
});

// Summary
console.log("\n" + "=".repeat(60));
console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.error(`❌ ${failed} test(s) failed!\n`);
  process.exit(1);
} else {
  console.log("✅ All command constraint tests passed!\n");
  console.log("💡 These constraints prevent:");
  console.log("   - Agents disappearing when /query runs outside config");
  console.log("   - Commands running in invalid states");
  console.log("   - State corruption from batch commands");
  console.log("   - User confusion from unclear error messages\n");
  process.exit(0);
}
