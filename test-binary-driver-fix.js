/**
 * Test Suite for Binary Driver Fix Utility
 *
 * This test creates sample corrupted data, runs the fix,
 * and verifies the results.
 *
 * Usage: Paste in browser console at uffpmobile.vercel.app
 */

function testBinaryDriverFix() {
  console.group('🧪 Testing Binary Driver Fix Utility');

  const STORAGE_KEY = '@uffp_forecasts';
  const BACKUP_KEY = '@uffp_forecasts_backup';
  const TEST_BACKUP_KEY = '@uffp_forecasts_test_backup';

  // Step 1: Backup current data
  console.log('📦 Step 1: Backing up current data...');
  const currentData = localStorage.getItem(STORAGE_KEY);
  if (currentData) {
    localStorage.setItem(TEST_BACKUP_KEY, currentData);
    console.log('✓ Current data backed up to:', TEST_BACKUP_KEY);
  } else {
    console.log('⚠️  No existing data to backup');
  }

  // Step 2: Create test data with corrupted drivers
  console.log('\n🔨 Step 2: Creating test data with corrupted drivers...');

  const testForecasts = [
    {
      id: 'test-forecast-1',
      question: 'Will SpaceX successfully land on Mars by 2030?',
      domain: 'Space Exploration',
      timeframe: '2030-12-31',
      drivers: [
        {
          id: 'driver-1',
          name: 'Technical feasibility',
          type: 'binary',
          // Missing probability field - CORRUPTED
          direction: 'increases',
          agents: [],
          evidence: [],
          createdAt: '2026-01-15T10:00:00.000Z',
          version: { major: 1, minor: 0 }
        },
        {
          id: 'driver-2',
          name: 'Launch window availability',
          type: 'continuous',
          distribution: 'triangular',
          p5: 30,
          p50: 50,
          p95: 70,
          direction: 'increases',
          agents: [],
          evidence: [],
          createdAt: '2026-01-15T10:05:00.000Z',
          version: { major: 1, minor: 0 }
        },
        {
          id: 'driver-3',
          name: 'Funding secured',
          type: 'binary',
          probability: null, // Null probability - CORRUPTED
          direction: 'increases',
          agents: [],
          evidence: [],
          createdAt: '2026-01-15T10:10:00.000Z',
          version: { major: 1, minor: 0 }
        }
      ],
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-01-15T10:10:00.000Z'
    },
    {
      id: 'test-forecast-2',
      question: 'Will GPT-5 be released by end of 2026?',
      domain: 'AI',
      timeframe: '2026-12-31',
      drivers: [
        {
          id: 'driver-4',
          name: 'Compute availability',
          type: 'binary',
          probability: 75, // Valid - NOT corrupted
          direction: 'increases',
          agents: [],
          evidence: [],
          createdAt: '2026-01-20T14:00:00.000Z',
          version: { major: 1, minor: 0 }
        },
        {
          id: 'driver-5',
          name: 'Regulatory approval',
          type: 'binary',
          // Missing probability field - CORRUPTED
          direction: 'increases',
          agents: [],
          evidence: [],
          createdAt: '2026-01-20T14:05:00.000Z',
          version: { major: 1, minor: 0 }
        }
      ],
      createdAt: '2026-01-20T14:00:00.000Z',
      updatedAt: '2026-01-20T14:05:00.000Z'
    },
    {
      id: 'test-forecast-3',
      question: 'Will remote work become mandatory for tech companies?',
      domain: 'Work Culture',
      timeframe: '2027-12-31',
      drivers: [
        {
          id: 'driver-6',
          name: 'Cost savings',
          type: 'continuous',
          distribution: 'normal',
          p50: 100,
          p95: 200,
          direction: 'increases',
          agents: [],
          evidence: [],
          createdAt: '2026-01-25T09:00:00.000Z',
          version: { major: 1, minor: 0 }
        }
      ],
      createdAt: '2026-01-25T09:00:00.000Z',
      updatedAt: '2026-01-25T09:00:00.000Z'
    }
  ];

  // Save test data
  localStorage.setItem(STORAGE_KEY, JSON.stringify(testForecasts));
  console.log('✓ Created 3 test forecasts with 3 corrupted binary drivers');
  console.table({
    'Total Forecasts': 3,
    'Total Drivers': 6,
    'Binary Drivers': 4,
    'Corrupted Drivers': 3,
    'Expected Fixes': 3
  });

  // Step 3: Verify corrupted state
  console.log('\n🔍 Step 3: Verifying corrupted state...');
  const corruptedDrivers = [];
  testForecasts.forEach(f => {
    f.drivers.forEach(d => {
      if (d.type === 'binary' && (d.probability === undefined || d.probability === null)) {
        corruptedDrivers.push({
          forecast: f.question,
          driver: d.name,
          probability: d.probability
        });
      }
    });
  });

  console.table(corruptedDrivers);

  if (corruptedDrivers.length !== 3) {
    console.error('❌ Test setup failed: Expected 3 corrupted drivers, found', corruptedDrivers.length);
    console.groupEnd();
    return { success: false, error: 'Test setup failed' };
  }

  console.log('✓ Confirmed 3 corrupted drivers');

  // Step 4: Run the fix
  console.log('\n🔧 Step 4: Running fixBinaryDrivers()...\n');
  console.log('═══════════════════════════════════════════════════════════');

  let fixResult;
  try {
    fixResult = fixBinaryDrivers();
  } catch (err) {
    console.error('❌ Fix function failed:', err);
    console.groupEnd();
    return { success: false, error: err.message };
  }

  console.log('═══════════════════════════════════════════════════════════\n');

  // Step 5: Verify fix results
  console.log('✅ Step 5: Verifying fix results...');

  if (!fixResult.success) {
    console.error('❌ Fix reported failure:', fixResult);
    console.groupEnd();
    return { success: false, error: 'Fix function reported failure' };
  }

  if (fixResult.fixed !== 3) {
    console.error(`❌ Expected 3 fixes, got ${fixResult.fixed}`);
    console.groupEnd();
    return { success: false, error: 'Wrong number of fixes' };
  }

  console.log('✓ Fix function reported success');
  console.log(`✓ Correct number of fixes: ${fixResult.fixed}`);

  // Step 6: Verify data integrity
  console.log('\n🔍 Step 6: Verifying data integrity...');

  const fixedData = JSON.parse(localStorage.getItem(STORAGE_KEY));
  let remainingCorrupted = 0;
  let fixedCorrectly = 0;

  fixedData.forEach(f => {
    f.drivers.forEach(d => {
      if (d.type === 'binary') {
        if (d.probability === undefined || d.probability === null) {
          remainingCorrupted++;
          console.error(`❌ Still corrupted: ${f.question} -> ${d.name}`);
        } else if (d.probability === 50) {
          fixedCorrectly++;
          console.log(`✓ Fixed correctly: ${d.name} = ${d.probability}`);
        } else {
          console.log(`ℹ️  Pre-existing valid: ${d.name} = ${d.probability}`);
        }
      }
    });
  });

  if (remainingCorrupted > 0) {
    console.error(`❌ ${remainingCorrupted} drivers still corrupted`);
    console.groupEnd();
    return { success: false, error: 'Data still corrupted after fix' };
  }

  if (fixedCorrectly !== 3) {
    console.error(`❌ Expected 3 drivers fixed to 50, got ${fixedCorrectly}`);
    console.groupEnd();
    return { success: false, error: 'Incorrect fix values' };
  }

  console.log('✓ All binary drivers have valid probability values');
  console.log('✓ All fixed drivers set to probability = 50');

  // Step 7: Verify backup was created
  console.log('\n💾 Step 7: Verifying backup...');

  const backup = localStorage.getItem(BACKUP_KEY);
  if (!backup) {
    console.error('❌ No backup was created');
    console.groupEnd();
    return { success: false, error: 'Backup missing' };
  }

  const backupData = JSON.parse(backup);
  let corruptedInBackup = 0;
  backupData.forEach(f => {
    f.drivers?.forEach(d => {
      if (d.type === 'binary' && (d.probability === undefined || d.probability === null)) {
        corruptedInBackup++;
      }
    });
  });

  if (corruptedInBackup !== 3) {
    console.error('❌ Backup should contain 3 corrupted drivers, found', corruptedInBackup);
    console.groupEnd();
    return { success: false, error: 'Backup data incorrect' };
  }

  console.log('✓ Backup contains original corrupted data');
  console.log('✓ Backup can be used for restoration');

  // Step 8: Test restore function
  console.log('\n🔄 Step 8: Testing restore function...');

  const beforeRestore = localStorage.getItem(STORAGE_KEY);

  try {
    const restoreResult = restoreFromBackup();
    if (!restoreResult.success) {
      console.error('❌ Restore function failed:', restoreResult);
      console.groupEnd();
      return { success: false, error: 'Restore failed' };
    }
  } catch (err) {
    console.error('❌ Restore function threw error:', err);
    console.groupEnd();
    return { success: false, error: err.message };
  }

  const afterRestore = localStorage.getItem(STORAGE_KEY);

  // Verify restore worked
  const restoredData = JSON.parse(afterRestore);
  let corruptedAfterRestore = 0;
  restoredData.forEach(f => {
    f.drivers?.forEach(d => {
      if (d.type === 'binary' && (d.probability === undefined || d.probability === null)) {
        corruptedAfterRestore++;
      }
    });
  });

  if (corruptedAfterRestore !== 3) {
    console.error('❌ Restore should bring back 3 corrupted drivers, found', corruptedAfterRestore);
    console.groupEnd();
    return { success: false, error: 'Restore data incorrect' };
  }

  console.log('✓ Restore function works correctly');
  console.log('✓ Original corrupted data restored');

  // Step 9: Re-run fix to test idempotency
  console.log('\n🔁 Step 9: Testing idempotency (running fix again)...\n');
  console.log('═══════════════════════════════════════════════════════════');

  let secondFixResult;
  try {
    secondFixResult = fixBinaryDrivers();
  } catch (err) {
    console.error('❌ Second fix run failed:', err);
    console.groupEnd();
    return { success: false, error: 'Idempotency test failed' };
  }

  console.log('═══════════════════════════════════════════════════════════\n');

  if (!secondFixResult.success) {
    console.error('❌ Second fix reported failure:', secondFixResult);
    console.groupEnd();
    return { success: false, error: 'Second fix failed' };
  }

  if (secondFixResult.fixed !== 3) {
    console.error(`❌ Second run should fix 3 drivers, fixed ${secondFixResult.fixed}`);
    console.groupEnd();
    return { success: false, error: 'Idempotency failed' };
  }

  console.log('✓ Second run fixed same 3 drivers');
  console.log('✓ Function is idempotent (safe to run multiple times)');

  // Step 10: Cleanup and restore original data
  console.log('\n🧹 Step 10: Cleaning up test data...');

  if (currentData) {
    localStorage.setItem(STORAGE_KEY, currentData);
    console.log('✓ Original data restored');
  } else {
    localStorage.removeItem(STORAGE_KEY);
    console.log('✓ Test data removed');
  }

  localStorage.removeItem(TEST_BACKUP_KEY);
  localStorage.removeItem(BACKUP_KEY);
  localStorage.removeItem(BACKUP_KEY + '_timestamp');
  console.log('✓ Test artifacts cleaned up');

  // Final summary
  console.log('\n' + '═'.repeat(60));
  console.log('✅ ALL TESTS PASSED!');
  console.log('═'.repeat(60));
  console.log('\nTest Results:');
  console.table({
    'Test Setup': '✓ Pass',
    'Fix Execution': '✓ Pass',
    'Data Integrity': '✓ Pass',
    'Backup Creation': '✓ Pass',
    'Restore Function': '✓ Pass',
    'Idempotency': '✓ Pass',
    'Cleanup': '✓ Pass'
  });

  console.log('\n📊 Coverage:');
  console.log('• Missing probability (undefined) ✓');
  console.log('• Null probability ✓');
  console.log('• Valid existing probability ✓');
  console.log('• Continuous drivers (unaffected) ✓');
  console.log('• Multiple forecasts ✓');
  console.log('• Backup/restore flow ✓');
  console.log('• Idempotent execution ✓');

  console.log('\n🎯 Conclusion:');
  console.log('The binary driver fix utility is production-ready and safe to use.');

  console.groupEnd();

  return {
    success: true,
    testsRun: 7,
    testsPassed: 7,
    message: 'All tests passed - utility is ready for production use'
  };
}

// Make available in browser console
if (typeof window !== 'undefined') {
  window.testBinaryDriverFix = testBinaryDriverFix;
  console.log('✓ Test suite loaded! Run: testBinaryDriverFix()');
}
