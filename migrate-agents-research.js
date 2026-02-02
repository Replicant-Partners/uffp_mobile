// Data Migration: Separate Agents from ResearchResults
// Run this in browser console at uffpmobile.vercel.app

(function() {
  window.migrateAgentsAndResearch = function() {
    const KEY = '@uffp_forecasts';
    const BACKUP = '@uffp_forecasts_backup_agents';
    
    console.group('🔄 Migrating Agents & Research Data');
    
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
    console.log('✓ Backup created at', BACKUP);

    let migratedDrivers = 0;
    let migratedForecasts = 0;

    data.forEach((forecast, fi) => {
      if (!forecast.drivers) return;
      
      let forecastModified = false;
      
      forecast.drivers.forEach((driver, di) => {
        let driverModified = false;
        
        // Case 1: Driver has "agents" array but items look like ResearchSnapshots
        // (have executedAt, summary, etc. instead of query, schedule)
        if (driver.agents && Array.isArray(driver.agents) && driver.agents.length > 0) {
          const firstItem = driver.agents[0];
          
          // Check if this looks like a ResearchSnapshot (has executedAt)
          if (firstItem.executedAt || firstItem.summary || firstItem.keyFindings) {
            console.log(`📦 Migrating ${forecast.question.slice(0,40)}... → ${driver.name}`);
            console.log(`   Moving ${driver.agents.length} research results from agents[] to researchResults[]`);
            
            // These are actually research results, not agent configs
            driver.researchResults = driver.agents;
            driver.agents = [];
            driverModified = true;
          }
          // Check if this looks like an Agent config (has query)
          else if (firstItem.query || firstItem.schedule) {
            // These are actual agent configs - ensure proper structure
            driver.agents = driver.agents.map(agent => ({
              id: agent.id || Date.now().toString() + Math.random(),
              name: agent.name,
              query: agent.query,
              schedule: agent.schedule || 'on-demand',
              threshold: agent.threshold,
              createdAt: agent.createdAt || new Date().toISOString(),
              updatedAt: agent.updatedAt || new Date().toISOString(),
            }));
            driverModified = true;
          }
        }
        
        // Case 2: Driver missing agents array - initialize it
        if (!driver.agents) {
          driver.agents = [];
          driverModified = true;
        }
        
        // Case 3: Driver missing researchResults - initialize it
        if (!driver.researchResults) {
          driver.researchResults = [];
          driverModified = true;
        }
        
        if (driverModified) {
          migratedDrivers++;
          forecastModified = true;
        }
      });
      
      if (forecastModified) {
        migratedForecasts++;
      }
    });

    if (migratedDrivers === 0) {
      console.log('✅ No migration needed - all data is correct');
      console.groupEnd();
      return {success: true, migrated: 0};
    }

    // Validate
    let valid = true;
    data.forEach(f => {
      if (!f.drivers) return;
      f.drivers.forEach(d => {
        if (!Array.isArray(d.agents)) valid = false;
        if (!Array.isArray(d.researchResults)) valid = false;
      });
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

  window.restoreAgentsBackup = function() {
    const b = localStorage.getItem('@uffp_forecasts_backup_agents');
    if (!b) {
      console.error('❌ No backup found');
      return {success: false};
    }
    localStorage.setItem('@uffp_forecasts', b);
    console.log('✓ Restored! Refresh page.');
    return {success: true};
  };

  console.log('✓ Migration utils loaded:');
  console.log('  migrateAgentsAndResearch() - Separate agents from research results');
  console.log('  restoreAgentsBackup() - Restore from backup if needed');
})();
