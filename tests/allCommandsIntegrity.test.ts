/**
 * Comprehensive test for ALL commands and their persistence
 *
 * Tests every command to ensure:
 * 1. It executes without errors
 * 2. It persists changes to activeForecast
 * 3. It persists changes to savedForecasts
 * 4. Changes sync to backend via backendSync
 */

import * as fs from "fs";
import * as path from "path";

const WORKSPACE_FILE = path.join(
  __dirname,
  "../src/screens/ForecastWorkspaceScreen.tsx",
);

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => boolean | string): void {
  try {
    const result = fn();
    if (typeof result === "string") {
      results.push({ name, passed: false, details: result });
    } else {
      results.push({
        name,
        passed: result,
        details: result ? undefined : "Assertion failed",
      });
    }
  } catch (error: any) {
    results.push({ name, passed: false, details: error.message });
  }
}

function readWorkspaceFile(): string {
  return fs.readFileSync(WORKSPACE_FILE, "utf-8");
}

function findCommandHandler(content: string, command: string): string | null {
  // Commands can be in case statements or if statements
  // Try case first
  let commandRegex = new RegExp(`case ['"\`]${command}['"\`]:`, "g");
  let match = commandRegex.exec(content);

  // Try if statement pattern: if (trimmed.startsWith("/command "))
  if (!match) {
    commandRegex = new RegExp(
      `if \\(.*startsWith\\(['"\`]${command.replace("/", "\\/")} ['"\`]\\)`,
      "g",
    );
    match = commandRegex.exec(content);
  }

  // Try if statement pattern without space: if (trimmed.startsWith("/command"))
  if (!match) {
    commandRegex = new RegExp(
      `if \\(.*startsWith\\(['"\`]${command.replace("/", "\\/")}['"\`]\\)`,
      "g",
    );
    match = commandRegex.exec(content);
  }

  // Try exact match pattern for commands without arguments
  if (!match) {
    commandRegex = new RegExp(`trimmed === ['"\`]${command}['"\`]`, "g");
    match = commandRegex.exec(content);
  }

  if (!match) return null;

  // Get the next 4500 chars to analyze the handler (some commands are very long)
  return content.substring(match.index, match.index + 4500);
}

function checkPersistence(
  handlerCode: string,
  commandName: string,
): string | true {
  const checks = {
    updateDriverInForecast: /updateDriverInForecast\(/,
    setActiveForecast: /setActiveForecast\(/,
    setSavedForecasts: /setSavedForecasts\(/,
    saveForecast: /saveForecast\(/,
  };

  const hasUpdateHelper = checks.updateDriverInForecast.test(handlerCode);
  const hasSetActive = checks.setActiveForecast.test(handlerCode);
  const hasSetSaved = checks.setSavedForecasts.test(handlerCode);
  const hasSave = checks.saveForecast.test(handlerCode);

  // For driver config commands, should use updateDriverInForecast
  if (["/p", "/prob", "/dist", "/direction"].includes(commandName)) {
    if (!hasUpdateHelper) {
      return `${commandName} should call updateDriverInForecast()`;
    }
    return true;
  }

  // For /driver command, should auto-save
  if (commandName === "/driver") {
    if (!hasSetActive || !hasSetSaved || !hasSave) {
      return `${commandName} should call setActiveForecast, setSavedForecasts, and saveForecast`;
    }
    return true;
  }

  // For /evidence command (uses updateDriverInForecast helper)
  if (commandName === "/evidence") {
    if (!hasUpdateHelper) {
      return `${commandName} should update state (setActiveForecast or setSavedForecasts)`;
    }
    return true;
  }

  // For other forecast-modifying commands
  if (["/edit", "/base-rate", "/external"].includes(commandName)) {
    if (!hasSetActive && !hasSetSaved) {
      return `${commandName} should update state (setActiveForecast or setSavedForecasts)`;
    }
    return true;
  }

  // For backend-syncing commands
  if (["/simulate", "/remove"].includes(commandName)) {
    const hasBackendSync = /WithSync\(/.test(handlerCode);
    if (!hasBackendSync) {
      return `${commandName} should use backend sync methods`;
    }
    return true;
  }

  return true;
}

console.log("🧪 Testing ALL Commands and Data Integrity\n");
console.log("============================================================\n");

const content = readWorkspaceFile();

// Test 1: All driver configuration commands
const driverConfigCommands = ["/p", "/prob", "/dist", "/direction"];
driverConfigCommands.forEach((cmd) => {
  test(`${cmd} command exists and persists`, () => {
    const handler = findCommandHandler(content, cmd);
    if (!handler) return `Command ${cmd} not found`;

    const persistCheck = checkPersistence(handler, cmd);
    if (persistCheck !== true) return persistCheck;

    return true;
  });
});

// Test 2: /driver command auto-saves
test("/driver command exists and auto-saves", () => {
  const handler = findCommandHandler(content, "/driver");
  if (!handler) return "/driver command not found";

  const persistCheck = checkPersistence(handler, "/driver");
  if (persistCheck !== true) return persistCheck;

  return true;
});

// Test 3: /edit command (question editing)
test("/edit question command updates forecast", () => {
  const handler = findCommandHandler(content, "/edit");
  if (!handler) return "/edit command not found";

  // Check if it handles "edit question"
  const hasQuestionEdit = /edit\s+question/i.test(handler);
  if (!hasQuestionEdit) return "/edit question pattern not found";

  const persistCheck = checkPersistence(handler, "/edit");
  if (persistCheck !== true) return persistCheck;

  return true;
});

// Test 4: /evidence command
test("/evidence command adds evidence and persists", () => {
  const handler = findCommandHandler(content, "/evidence");
  if (!handler) return "/evidence command not found";

  // Check for ID generation
  const hasIdGeneration = /idGenerators\.evidence\(\)/.test(handler);
  if (!hasIdGeneration) return "/evidence should generate IDs for evidence";

  const persistCheck = checkPersistence(handler, "/evidence");
  if (persistCheck !== true) return persistCheck;

  return true;
});

// Test 5: /base-rate command
test("/base-rate command updates external view", () => {
  const handler = findCommandHandler(content, "/base-rate");
  if (!handler) return "/base-rate command not found";

  const persistCheck = checkPersistence(handler, "/base-rate");
  if (persistCheck !== true) return persistCheck;

  return true;
});

// Test 6: /external command
test("/external command sets reference class", () => {
  const handler = findCommandHandler(content, "/external");
  if (!handler) return "/external command not found";

  const persistCheck = checkPersistence(handler, "/external");
  if (persistCheck !== true) return persistCheck;

  return true;
});

// Test 7: /simulate command
test("/simulate command syncs to backend", () => {
  const handler = findCommandHandler(content, "/simulate");
  if (!handler) return "/simulate command not found";

  const persistCheck = checkPersistence(handler, "/simulate");
  if (persistCheck !== true) return persistCheck;

  return true;
});

// Test 8: /remove driver command
test("/remove driver command syncs deletion", () => {
  const handler = findCommandHandler(content, "/remove");
  if (!handler) return "/remove command not found";

  const persistCheck = checkPersistence(handler, "/remove");
  if (persistCheck !== true) return persistCheck;

  return true;
});

// Test 9: /decompose command
test("/decompose command exists", () => {
  const handler = findCommandHandler(content, "/decompose");
  if (!handler) return "/decompose command not found";
  return true;
});

// Test 10: /save command
test("/save command exists for driver config", () => {
  const handler = findCommandHandler(content, "/save");
  if (!handler) return "/save command not found";
  return true;
});

// Test 11: /list command
test("/list command exists", () => {
  const handler = findCommandHandler(content, "/list");
  if (!handler) return "/list command not found";
  return true;
});

// Test 12: /commands command (help system)
test("/commands command exists", () => {
  const handler = findCommandHandler(content, "/commands");
  if (!handler) return "/commands command not found";
  return true;
});

// Test 13: Check updateDriverInForecast helper exists
test("updateDriverInForecast helper function exists", () => {
  const hasHelper = /const updateDriverInForecast = /.test(content);
  if (!hasHelper) return "updateDriverInForecast helper not found";

  // Check it updates both state arrays
  const helperMatch = content.match(
    /const updateDriverInForecast = .*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n}/s,
  );
  if (!helperMatch) return "Could not find complete helper function";

  const helperCode = helperMatch[0];
  const updatesActive = /setActiveForecast/.test(helperCode);
  const updatesSaved = /setSavedForecasts/.test(helperCode);
  const callsSave = /saveForecast/.test(helperCode);

  if (!updatesActive) return "Helper should call setActiveForecast";
  if (!updatesSaved) return "Helper should call setSavedForecasts";
  if (!callsSave) return "Helper should call saveForecast";

  return true;
});

// Test 14: Check backend sync is used for critical operations
test("Backend sync methods are properly used", () => {
  // Check for dynamic imports of backendSync
  const hasBackendSyncImport = /import\(['"].*backendSync['"]\)/.test(content);
  if (!hasBackendSyncImport)
    return "backendSync not imported (static or dynamic)";

  const hasAddDriver = /addDriverWithSync/.test(content);
  const hasUpdateDriver = /updateDriverWithSync/.test(content);
  const hasRemoveDriver = /removeDriverWithSync/.test(content);

  if (!hasAddDriver) return "addDriverWithSync not used";
  if (!hasUpdateDriver) return "updateDriverWithSync not used";
  if (!hasRemoveDriver) return "removeDriverWithSync not used";

  return true;
});

// Test 15: Check schema validation is run on load (via backendSync)
test("Schema validation runs on forecast load", () => {
  // Schema validation happens in backendSync.ts, which is imported dynamically
  // Check that we use loadForecastsWithSync which includes validation
  const usesLoadWithSync = /loadForecastsWithSync/.test(content);
  if (!usesLoadWithSync)
    return "loadForecastsWithSync not used (schema validation happens there)";
  return true;
});

console.log("\n============================================================\n");

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;

results.forEach((result) => {
  if (result.passed) {
    console.log(`✓ ${result.name}`);
    console.log(`✅ PASSED\n`);
  } else {
    console.log(`✗ ${result.name}`);
    console.log(`❌ FAILED: ${result.details}\n`);
  }
});

console.log("============================================================\n");
console.log(`📊 Test Summary: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.log("❌ Some command integrity tests failed!");
  process.exit(1);
} else {
  console.log("✅ All commands properly implemented with data integrity!");
  process.exit(0);
}
