// UFFP Binary Driver Fix - Compact Version for Browser Console
// Paste this entire block and run: fixBinaryDrivers()

(function() {
  window.fixBinaryDrivers = function() {
    const KEY = '@uffp_forecasts', BACKUP = '@uffp_forecasts_backup', DEFAULT = 50;
    console.group('🔧 Fixing Binary Drivers');

    // Load data
    const raw = localStorage.getItem(KEY);
    if (!raw) return console.error('❌ No data found'), console.groupEnd(), {success: false};

    let data;
    try { data = JSON.parse(raw); }
    catch(e) { return console.error('❌ Parse error:', e), console.groupEnd(), {success: false}; }

    // Backup
    localStorage.setItem(BACKUP, raw);
    localStorage.setItem(BACKUP + '_timestamp', new Date().toISOString());
    console.log('✓ Backup created');

    // Scan & fix
    let fixed = 0, total = 0;
    data.forEach((f, fi) => {
      if (!f.drivers) return;
      f.drivers.forEach((d, di) => {
        if (d.type === 'binary') {
          total++;
          if (d.probability === undefined || d.probability === null) {
            console.log(`Fixing: ${f.question.slice(0, 50)}... → ${d.name}`);
            d.probability = DEFAULT;
            fixed++;
          }
        }
      });
    });

    if (fixed === 0) {
      console.log('✅ No fixes needed');
      console.groupEnd();
      return {success: true, fixed: 0, total};
    }

    // Validate
    let valid = true;
    data.forEach(f => {
      if (!f.drivers) return;
      f.drivers.forEach(d => {
        if (d.type === 'binary' && (d.probability === undefined || d.probability === null)) {
          valid = false;
        }
      });
    });

    if (!valid) {
      console.error('❌ Validation failed');
      console.groupEnd();
      return {success: false};
    }

    // Save
    localStorage.setItem(KEY, JSON.stringify(data));
    console.log(`✅ Fixed ${fixed}/${total} binary drivers`);
    console.log('🔄 Refresh page to see changes');
    console.log('To restore: localStorage.setItem("@uffp_forecasts", localStorage.getItem("@uffp_forecasts_backup"))');
    console.groupEnd();

    return {success: true, fixed, total};
  };

  window.restoreFromBackup = function() {
    const b = localStorage.getItem('@uffp_forecasts_backup');
    if (!b) return console.error('❌ No backup'), {success: false};
    localStorage.setItem('@uffp_forecasts', b);
    console.log('✓ Restored! Refresh page.');
    return {success: true};
  };

  console.log('✓ Utils loaded: fixBinaryDrivers(), restoreFromBackup()');
})();
