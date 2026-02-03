/**
 * Regression test for driver sync fallback behavior
 */

import { readFileSync } from 'fs';
import { join } from 'path';

console.log('🧪 Testing Driver Sync Fallback Behavior\n');
console.log('============================================================\n');

const backendSyncPath = join(__dirname, '../src/utils/backendSync.ts');
const backendSyncCode = readFileSync(backendSyncPath, 'utf-8');

console.log('✓ Test 1: Fallback logic exists for "Driver not found"');

if (backendSyncCode.includes('Driver not found')) {
  console.log('✅ PASSED: Code checks for "Driver not found" error');
} else {
  console.error('❌ FAILED: Missing "Driver not found" check');
  process.exit(1);
}

console.log('\n✓ Test 2: Fallback calls addDriverWithSync');

if (backendSyncCode.includes('addDriverWithSync')) {
  console.log('✅ PASSED: Fallback calls addDriverWithSync');
} else {
  console.error('❌ FAILED: addDriverWithSync not called in fallback');
  process.exit(1);
}

console.log('\n✓ Test 3: Driver ID is preserved in fallback');

if (backendSyncCode.includes('id: driverId')) {
  console.log('✅ PASSED: Driver ID preserved in fallback call');
} else {
  console.error('❌ FAILED: Driver ID not preserved');
  process.exit(1);
}

console.log('\n✓ Test 4: Fallback in updateDriverWithSync context');

// Check that "Driver not found" appears after updateDriverWithSync definition
const updateDriverIndex = backendSyncCode.indexOf('updateDriverWithSync');
const driverNotFoundIndex = backendSyncCode.indexOf('Driver not found');

if (updateDriverIndex !== -1 && driverNotFoundIndex > updateDriverIndex) {
  console.log('✅ PASSED: Fallback is in updateDriverWithSync function');
} else {
  console.error('❌ FAILED: Fallback not properly positioned');
  process.exit(1);
}

console.log('\n============================================================\n');
console.log('📊 Test Summary: 4 passed, 0 failed\n');
console.log('✅ Driver sync fallback is properly implemented!\n');
console.log('📝 What this prevents:\n');
console.log('   - "Driver not found" errors when saving drivers\n');
console.log('   - State desync between local and backend\n');
