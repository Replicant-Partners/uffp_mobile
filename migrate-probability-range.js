// Probability Range Migration: Convert 0-100 to 0-1
// Run this in browser console at uffpmobile.vercel.app

(function() {
  window.migrateProbabilityRange = function() {
    const KEY = '@uffp_forecasts';
    const BACKUP = '@uffp_forecasts_backup_probability';
    
    console.group('🔄 Migrating Probability Range (0-100 → 0-1)');
    
    // Load data
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      console.error('❌ No data found');
      console.groupEnd();
      return {success: false};
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch(e) {
      console.error('❌ Parse error:', e);
      console.groupEnd();
      return {success: false};
    }

    // Backup
    localStorage.setItem(BACKUP, raw);
    localStorage.setItem(BACKUP + '_timestamp', new Date().toISOString());
    console.log('✓ Backup created');

    let migratedDrivers = 0;
    let migratedForecasts = 0;

    data.forEach((forecast, fi) => {
      let forecastModified = false;
      
      // Migrate forecast-level probability (already 0-1, just validate)
      if (forecast.probability !== undefined && forecast.probability !== null) {
        if (forecast.probability > 1) {
          console.warn(`Forecast probability > 1: ${forecast.probability}, converting...`);
          forecast.probability = forecast.probability / 100;
          forecastModified = true;
        }
      }
      
      // Migrate driver probabilities
      if (forecast.drivers) {
        forecast.drivers.forEach((driver, di) => {
          if (driver.type === 'binary' && driver.probability !== undefined && driver.probability !== null) {
            // Check if probability is in 0-100 range (needs migration)
            if (driver.probability > 1) {
              console.log(`📦 Migrating ${forecast.question.slice(0,40)}... → ${driver.name}`);
              console.log(`   Probability: ${driver.probability}% → ${driver.probability / 100}`);
              
              driver.probability = driver.probability / 100;
              migratedDrivers++;
              forecastModified = true;
            }
          }
        });
      }
      
      if (forecastModified) {
        migratedForecasts++;
      }
    });

    if (migratedDrivers === 0) {
      console.log('✅ No migration needed - all probabilities already in 0-1 range');
      console.groupEnd();
      return {success: true, migrated: 0};
    }

    // Validate
    let valid = true;
    data.forEach(f => {
      if (f.probability !== undefined && (f.probability < 0 || f.probability > 1)) {
        console.error(`Invalid forecast probability: ${f.probability}`);
        valid = false;
      }
      if (f.drivers) {
        f.drivers.forEach(d => {
          if (d.type === 'binary' && d.probability !== undefined) {
            if (d.probability < 0 || d.probability > 1) {
              console.error(`Invalid driver probability: ${d.probability} for ${d.name}`);
              valid = false;
            }
          }
        });
      }
    });

    if (!valid) {
      console.error('❌ Validation failed after migration');
      console.groupEnd();
      return {success: false};
    }

    // Save
    localStorage.setItem(KEY, JSON.stringify(data));
    console.log(`✅ Migrated ${migratedDrivers} driver(s) across ${migratedForecasts} forecast(s)`);
    console.log('🔄 Refresh page to see changes');
    console.log(`To restore: localStorage.setItem("${KEY}", localStorage.getItem("${BACKUP}"))`);
    console.groupEnd();

    return {success: true, migrated: migratedDrivers, forecasts: migratedForecasts};
  };

  window.restoreProbabilityBackup = function() {
    const b = localStorage.getItem('@uffp_forecasts_backup_probability');
    if (!b) {
      console.error('❌ No backup found');
      return {success: false};
    }
    localStorage.setItem('@uffp_forecasts', b);
    console.log('✓ Restored! Refresh page.');
    return {success: true};
  };

  console.log('✓ Probability migration utils loaded:');
  console.log('  migrateProbabilityRange() - Convert 0-100 to 0-1');
  console.log('  restoreProbabilityBackup() - Restore from backup if needed');
})();
