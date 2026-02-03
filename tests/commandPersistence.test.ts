/**
 * Regression test for command persistence behavior
 */

import { readFileSync } from 'fs';
import { join } from 'path';

console.log('🧪 Testing Command Persistence\n');
console.log('============================================================\n');

const workspacePath = join(__dirname, '../src/screens/ForecastWorkspaceScreen.tsx');
const workspaceCode = readFileSync(workspacePath, 'utf-8');

console.log('✓ Test 1: updateDriverInForecast helper exists');
if (workspaceCode.includes('updateDriverInForecast')) {
  console.log('✅ PASSED: Persistence helper found');
} else {
  console.error('❌ FAILED: Missing persistence helper');
  process.exit(1);
}

const testCommand = (commandName: string, commandStart: string) => {
  const commandIndex = workspaceCode.indexOf(commandStart);
  if (commandIndex === -1) {
    console.error(`❌ FAILED: Could not find ${commandName} command`);
    process.exit(1);
  }
  
  // Look ahead 1500 characters to capture entire command block
  const lookAhead = workspaceCode.substring(commandIndex, commandIndex + 1500);
  
  if (lookAhead.includes('updateDriverInForecast')) {
    console.log(`✅ PASSED: ${commandName} persists changes`);
    return true;
  } else {
    console.error(`❌ FAILED: ${commandName} does not persist`);
    process.exit(1);
  }
};

console.log('\n✓ Test 2: /p command persists changes');
testCommand('/p', 'if (trimmed.startsWith("/p "))');

console.log('\n✓ Test 3: /prob command persists changes');
testCommand('/prob', 'if (trimmed.startsWith("/prob "))');

console.log('\n✓ Test 4: /dist command persists changes');
testCommand('/dist', 'if (trimmed.startsWith("/dist "))');

console.log('\n✓ Test 5: /direction command persists changes');
testCommand('/direction', 'if (trimmed.startsWith("/direction "))');

console.log('\n✓ Test 6: /driver command auto-saves');
const driverCommandIndex = workspaceCode.indexOf('if (trimmed.startsWith("/driver "))');
const driverCommandSection = workspaceCode.substring(driverCommandIndex, driverCommandIndex + 4000);
if (driverCommandSection.includes('setActiveForecast') && driverCommandSection.includes('saveForecast')) {
  console.log('✅ PASSED: /driver auto-saves');
} else {
  console.error('❌ FAILED: /driver does not auto-save');
  process.exit(1);
}

console.log('\n============================================================\n');
console.log('📊 Test Summary: 6 passed, 0 failed\n');
console.log('✅ Command persistence properly implemented!\n');
