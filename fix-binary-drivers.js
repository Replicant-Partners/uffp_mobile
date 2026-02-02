/**
 * UFFP Data Cleanup Utility - Binary Driver Probability Fix
 *
 * Problem: Some binary drivers created before the probability field fix
 * are missing the `probability` field, causing validation failures.
 *
 * Solution: This script finds all binary drivers without probability
 * and sets them to the default value of 50.
 *
 * Usage:
 * 1. Open browser console at uffpmobile.vercel.app
 * 2. Paste this entire script
 * 3. Run: fixBinaryDrivers()
 *
 * Safety Features:
 * - Creates backup before making changes
 * - Validates data structure before and after
 * - Idempotent (safe to run multiple times)
 * - Detailed logging of all changes
 */

function fixBinaryDrivers() {
  const STORAGE_KEY = '@uffp_forecasts';
  const BACKUP_KEY = '@uffp_forecasts_backup';
  const DEFAULT_PROBABILITY = 50;

  console.group('🔧 UFFP Binary Driver Fix Utility');
  console.log('Starting data cleanup...\n');

  // Step 1: Load existing data
  console.log('📥 Step 1: Loading forecasts from localStorage...');
  const rawData = localStorage.getItem(STORAGE_KEY);

  if (!rawData) {
    console.error('❌ No forecast data found in localStorage');
    console.log(`Expected key: ${STORAGE_KEY}`);
    console.groupEnd();
    return { success: false, error: 'No data found' };
  }

  let forecasts;
  try {
    forecasts = JSON.parse(rawData);
    console.log(`✓ Loaded ${forecasts.length} forecast(s)`);
  } catch (err) {
    console.error('❌ Failed to parse forecast data:', err);
    console.groupEnd();
    return { success: false, error: 'Invalid JSON data' };
  }

  // Step 2: Create backup
  console.log('\n💾 Step 2: Creating backup...');
  try {
    localStorage.setItem(BACKUP_KEY, rawData);
    const backupTimestamp = new Date().toISOString();
    localStorage.setItem(`${BACKUP_KEY}_timestamp`, backupTimestamp);
    console.log(`✓ Backup created at: ${backupTimestamp}`);
    console.log(`Backup key: ${BACKUP_KEY}`);
  } catch (err) {
    console.error('❌ Failed to create backup:', err);
    console.log('Aborting to prevent data loss');
    console.groupEnd();
    return { success: false, error: 'Backup failed' };
  }

  // Step 3: Scan for corrupted drivers
  console.log('\n🔍 Step 3: Scanning for corrupted binary drivers...');

  const corrupted = [];
  const stats = {
    totalForecasts: forecasts.length,
    totalDrivers: 0,
    binaryDrivers: 0,
    corruptedDrivers: 0,
    fixedDrivers: 0
  };

  forecasts.forEach((forecast, forecastIndex) => {
    if (!forecast.drivers || !Array.isArray(forecast.drivers)) {
      return;
    }

    forecast.drivers.forEach((driver, driverIndex) => {
      stats.totalDrivers++;

      if (driver.type === 'binary') {
        stats.binaryDrivers++;

        // Check if probability is missing or null
        if (driver.probability === undefined || driver.probability === null) {
          stats.corruptedDrivers++;
          corrupted.push({
            forecastIndex,
            forecastId: forecast.id,
            forecastQuestion: forecast.question,
            driverIndex,
            driverId: driver.id,
            driverName: driver.name,
            currentProbability: driver.probability
          });

          console.warn(`⚠️  Found corrupted driver:
    Forecast: "${forecast.question}" (${forecast.id})
    Driver: "${driver.name}" (${driver.id})
    Type: binary
    Probability: ${driver.probability} (should be 0-100)
    Location: forecasts[${forecastIndex}].drivers[${driverIndex}]`);
        }
      }
    });
  });

  console.log('\n📊 Scan Results:');
  console.table(stats);

  if (stats.corruptedDrivers === 0) {
    console.log('✅ No corrupted drivers found! All binary drivers have probability values.');
    console.groupEnd();
    return {
      success: true,
      stats,
      fixed: 0,
      message: 'No fixes needed - data is clean'
    };
  }

  // Step 4: Fix corrupted drivers
  console.log(`\n🔨 Step 4: Fixing ${stats.corruptedDrivers} corrupted driver(s)...`);

  corrupted.forEach(issue => {
    const forecast = forecasts[issue.forecastIndex];
    const driver = forecast.drivers[issue.driverIndex];

    // Set default probability
    driver.probability = DEFAULT_PROBABILITY;
    stats.fixedDrivers++;

    console.log(`✓ Fixed: ${driver.name} → probability = ${DEFAULT_PROBABILITY}`);
  });

  // Step 5: Validate fixes
  console.log('\n✅ Step 5: Validating fixes...');

  let validationPassed = true;
  forecasts.forEach((forecast, forecastIndex) => {
    if (!forecast.drivers) return;

    forecast.drivers.forEach((driver, driverIndex) => {
      if (driver.type === 'binary') {
        if (driver.probability === undefined || driver.probability === null) {
          console.error(`❌ Validation failed: Driver still missing probability
    Forecast: ${forecast.id}
    Driver: ${driver.name}`);
          validationPassed = false;
        } else if (driver.probability < 0 || driver.probability > 100) {
          console.error(`❌ Validation failed: Invalid probability value (${driver.probability})
    Forecast: ${forecast.id}
    Driver: ${driver.name}`);
          validationPassed = false;
        }
      }
    });
  });

  if (!validationPassed) {
    console.error('\n❌ Validation failed - NOT saving changes');
    console.log('Original data is still in localStorage');
    console.log(`Backup is available at: ${BACKUP_KEY}`);
    console.groupEnd();
    return { success: false, error: 'Validation failed', stats };
  }

  console.log('✓ All binary drivers now have valid probability values');

  // Step 6: Save corrected data
  console.log('\n💾 Step 6: Saving corrected data...');

  try {
    const correctedData = JSON.stringify(forecasts);
    localStorage.setItem(STORAGE_KEY, correctedData);
    console.log(`✓ Saved ${forecasts.length} forecast(s) to localStorage`);
  } catch (err) {
    console.error('❌ Failed to save corrected data:', err);
    console.log('Attempting to restore from backup...');

    try {
      localStorage.setItem(STORAGE_KEY, rawData);
      console.log('✓ Restored original data from memory');
    } catch (restoreErr) {
      console.error('❌ Failed to restore! Check backup key:', BACKUP_KEY);
    }

    console.groupEnd();
    return { success: false, error: 'Save failed', stats };
  }

  // Step 7: Summary
  console.log('\n📋 Summary:');
  console.log('═══════════════════════════════════════');
  console.log(`Total Forecasts:       ${stats.totalForecasts}`);
  console.log(`Total Drivers:         ${stats.totalDrivers}`);
  console.log(`Binary Drivers:        ${stats.binaryDrivers}`);
  console.log(`Corrupted (before):    ${stats.corruptedDrivers}`);
  console.log(`Fixed:                 ${stats.fixedDrivers}`);
  console.log(`Default Value Used:    ${DEFAULT_PROBABILITY}`);
  console.log('═══════════════════════════════════════');

  console.log('\n✅ DATA CLEANUP COMPLETE!');
  console.log('\n📦 Backup Information:');
  console.log(`   Key: ${BACKUP_KEY}`);
  console.log(`   Timestamp: ${localStorage.getItem(`${BACKUP_KEY}_timestamp`)}`);
  console.log('   To restore: localStorage.setItem("@uffp_forecasts", localStorage.getItem("@uffp_forecasts_backup"))');

  console.log('\n🔄 Next Steps:');
  console.log('   1. Refresh the page to see changes');
  console.log('   2. Verify forecasts load correctly');
  console.log('   3. If everything works, you can delete the backup:');
  console.log(`      localStorage.removeItem("${BACKUP_KEY}")`);

  console.groupEnd();

  return {
    success: true,
    stats,
    fixed: stats.fixedDrivers,
    corrupted: corrupted.map(c => ({
      forecast: c.forecastQuestion,
      driver: c.driverName,
      fixed: true
    }))
  };
}

// Export for browser console
if (typeof window !== 'undefined') {
  window.fixBinaryDrivers = fixBinaryDrivers;
  console.log('✓ Utility loaded! Run: fixBinaryDrivers()');
}

// Also provide restore function
function restoreFromBackup() {
  const STORAGE_KEY = '@uffp_forecasts';
  const BACKUP_KEY = '@uffp_forecasts_backup';

  console.group('🔄 UFFP Data Restore Utility');

  const backup = localStorage.getItem(BACKUP_KEY);
  if (!backup) {
    console.error('❌ No backup found');
    console.groupEnd();
    return { success: false, error: 'No backup available' };
  }

  try {
    localStorage.setItem(STORAGE_KEY, backup);
    const timestamp = localStorage.getItem(`${BACKUP_KEY}_timestamp`);
    console.log(`✓ Restored data from backup created at: ${timestamp}`);
    console.log('🔄 Refresh the page to see changes');
    console.groupEnd();
    return { success: true };
  } catch (err) {
    console.error('❌ Failed to restore:', err);
    console.groupEnd();
    return { success: false, error: err.message };
  }
}

if (typeof window !== 'undefined') {
  window.restoreFromBackup = restoreFromBackup;
  console.log('✓ Restore utility loaded! Run: restoreFromBackup()');
}
