# UFFP Data Cleanup Guide

## Problem Statement

Some binary drivers were created before the probability field validation fix was deployed. These drivers have:
- `type: "binary"` ✓
- `probability: undefined` or `null` ❌

This causes validation failures when trying to save or edit these drivers, as the validation function checks:

```javascript
if (driver.type === "binary") {
  if (driver.probability === undefined || driver.probability === null) {
    errors.push("Binary drivers require a probability value. Use /p <value> to set it.");
  }
}
```

## Solution

We've created a data cleanup utility that automatically fixes these corrupted drivers by setting their `probability` to the default value of `50`.

---

## 🚀 Quick Start (Browser Console)

### Option 1: Compact Version (Recommended)

1. Go to **uffpmobile.vercel.app**
2. Open browser console (F12 or Cmd+Option+J)
3. Copy and paste the entire contents of `fix-binary-drivers-compact.js`
4. Run the fix:
   ```javascript
   fixBinaryDrivers()
   ```
5. Refresh the page

### Option 2: Full Version (Detailed Logging)

1. Go to **uffpmobile.vercel.app**
2. Open browser console (F12 or Cmd+Option+J)
3. Copy and paste the entire contents of `fix-binary-drivers.js`
4. Run the fix:
   ```javascript
   fixBinaryDrivers()
   ```
5. Review the detailed output
6. Refresh the page

---

## 📊 What the Script Does

### Step-by-Step Process

1. **Load Data**
   - Reads forecasts from `localStorage.getItem('@uffp_forecasts')`
   - Validates JSON parsing

2. **Create Backup**
   - Saves original data to `@uffp_forecasts_backup`
   - Stores timestamp for reference
   - Aborts if backup fails (safety first!)

3. **Scan for Issues**
   - Iterates through all forecasts
   - Identifies binary drivers with missing/null probability
   - Logs each corrupted driver found

4. **Fix Corrupted Drivers**
   - Sets `probability = 50` for each corrupted driver
   - Logs each fix applied

5. **Validate Fixes**
   - Ensures all binary drivers now have valid probability values
   - Checks that probability is between 0-100
   - Aborts save if validation fails

6. **Save Corrected Data**
   - Writes corrected forecasts back to localStorage
   - Includes rollback on save failure

7. **Report Results**
   - Shows summary statistics
   - Provides backup restoration instructions
   - Lists next steps

---

## 🛡️ Safety Features

### Idempotent Design
- Safe to run multiple times
- Won't corrupt data that's already fixed
- If no issues found, exits gracefully

### Automatic Backup
- Creates backup before any changes
- Includes timestamp for tracking
- Easy one-line restore command

### Validation Gates
- Validates input before processing
- Validates output before saving
- Rolls back on any validation failure

### Detailed Logging
- Console groups for organized output
- Color-coded messages (✓ ❌ ⚠️)
- Full audit trail of changes

---

## 📋 Expected Output

### No Issues Found

```
🔧 UFFP Binary Driver Fix Utility
  📥 Step 1: Loading forecasts from localStorage...
  ✓ Loaded 5 forecast(s)

  💾 Step 2: Creating backup...
  ✓ Backup created at: 2026-02-02T10:30:00.000Z
  Backup key: @uffp_forecasts_backup

  🔍 Step 3: Scanning for corrupted binary drivers...

  📊 Scan Results:
  ┌─────────────────────┬────────┐
  │ (index)             │ Values │
  ├─────────────────────┼────────┤
  │ totalForecasts      │ 5      │
  │ totalDrivers        │ 15     │
  │ binaryDrivers       │ 8      │
  │ corruptedDrivers    │ 0      │
  │ fixedDrivers        │ 0      │
  └─────────────────────┴────────┘

  ✅ No corrupted drivers found! All binary drivers have probability values.
```

### Issues Found and Fixed

```
🔧 UFFP Binary Driver Fix Utility
  📥 Step 1: Loading forecasts from localStorage...
  ✓ Loaded 3 forecast(s)

  💾 Step 2: Creating backup...
  ✓ Backup created at: 2026-02-02T10:30:00.000Z
  Backup key: @uffp_forecasts_backup

  🔍 Step 3: Scanning for corrupted binary drivers...

  ⚠️  Found corrupted driver:
      Forecast: "Will OpenAI release GPT-5 by end of 2026?" (abc123)
      Driver: "Technical feasibility" (driver-456)
      Type: binary
      Probability: undefined (should be 0-100)
      Location: forecasts[0].drivers[1]

  📊 Scan Results:
  ┌─────────────────────┬────────┐
  │ (index)             │ Values │
  ├─────────────────────┼────────┤
  │ totalForecasts      │ 3      │
  │ totalDrivers        │ 9      │
  │ binaryDrivers       │ 5      │
  │ corruptedDrivers    │ 2      │
  │ fixedDrivers        │ 0      │
  └─────────────────────┴────────┘

  🔨 Step 4: Fixing 2 corrupted driver(s)...
  ✓ Fixed: Technical feasibility → probability = 50
  ✓ Fixed: Market demand → probability = 50

  ✅ Step 5: Validating fixes...
  ✓ All binary drivers now have valid probability values

  💾 Step 6: Saving corrected data...
  ✓ Saved 3 forecast(s) to localStorage

  📋 Summary:
  ═══════════════════════════════════════
  Total Forecasts:       3
  Total Drivers:         9
  Binary Drivers:        5
  Corrupted (before):    2
  Fixed:                 2
  Default Value Used:    50
  ═══════════════════════════════════════

  ✅ DATA CLEANUP COMPLETE!

  📦 Backup Information:
     Key: @uffp_forecasts_backup
     Timestamp: 2026-02-02T10:30:00.000Z
     To restore: localStorage.setItem("@uffp_forecasts", localStorage.getItem("@uffp_forecasts_backup"))

  🔄 Next Steps:
     1. Refresh the page to see changes
     2. Verify forecasts load correctly
     3. If everything works, you can delete the backup:
        localStorage.removeItem("@uffp_forecasts_backup")
```

---

## 🔄 Restoring from Backup

If something goes wrong, you can easily restore the original data:

### Method 1: Use Restore Function

```javascript
restoreFromBackup()
```

### Method 2: Manual Restore

```javascript
localStorage.setItem('@uffp_forecasts', localStorage.getItem('@uffp_forecasts_backup'))
```

Then refresh the page.

---

## 🧪 Testing the Fix

After running the cleanup:

1. **Refresh the page**
2. **Open a forecast** with previously corrupted drivers
3. **Try to edit** the binary driver
4. **Verify** the probability field now shows `50`
5. **Save the driver** - should work without validation errors

---

## 🔍 Manual Inspection

### Check for Corrupted Drivers (Before Fix)

```javascript
const forecasts = JSON.parse(localStorage.getItem('@uffp_forecasts'));
forecasts.forEach(f => {
  f.drivers?.forEach(d => {
    if (d.type === 'binary' && (d.probability === undefined || d.probability === null)) {
      console.log(`Corrupted: ${f.question} -> ${d.name}`);
    }
  });
});
```

### View Backup Timestamp

```javascript
console.log(localStorage.getItem('@uffp_forecasts_backup_timestamp'));
```

### Compare Sizes

```javascript
const current = localStorage.getItem('@uffp_forecasts');
const backup = localStorage.getItem('@uffp_forecasts_backup');
console.log('Current:', current.length, 'bytes');
console.log('Backup:', backup.length, 'bytes');
```

---

## 📊 Return Value

The function returns an object with details:

```javascript
{
  success: true,
  stats: {
    totalForecasts: 5,
    totalDrivers: 15,
    binaryDrivers: 8,
    corruptedDrivers: 2,
    fixedDrivers: 2
  },
  fixed: 2,
  corrupted: [
    { forecast: "Will...", driver: "Technical feasibility", fixed: true },
    { forecast: "Will...", driver: "Market demand", fixed: true }
  ]
}
```

---

## 🐛 Troubleshooting

### "No data found"
- Make sure you're on uffpmobile.vercel.app
- Check if forecasts exist: `localStorage.getItem('@uffp_forecasts')`
- Try loading a forecast first

### "Parse error"
- localStorage data may be corrupted
- Check browser console for details
- Contact developer if issue persists

### "Validation failed"
- Script detected issues but couldn't fix them
- Original data is preserved
- Check console logs for specific errors

### "Save failed"
- localStorage may be full
- Check storage quota: `navigator.storage.estimate()`
- Original data is restored automatically

---

## 💡 Why Probability = 50?

The default value of `50` represents:
- **50% probability** for binary events
- **Maximum uncertainty** (no information)
- **Safe neutral baseline** for calibration

Users can adjust this value after the fix by:
1. Opening the forecast
2. Editing the driver
3. Using `/p <value>` to set a custom probability

---

## 🔐 Data Privacy

- All operations happen **locally in the browser**
- No data is sent to any server
- Backup stays in **localStorage**
- You can delete the backup anytime

---

## 📁 File Locations

- **Full version**: `/home/ilabra/uffp_mobile/fix-binary-drivers.js`
- **Compact version**: `/home/ilabra/uffp_mobile/fix-binary-drivers-compact.js`
- **This guide**: `/home/ilabra/uffp_mobile/DATA_CLEANUP_GUIDE.md`

---

## 🎯 Production Deployment

To deploy this fix for users:

### Option 1: One-Time Announcement
1. Post the compact script in Discord/Slack
2. Instruct users to paste in console
3. Provide support for any issues

### Option 2: Automatic Migration
1. Add migration code to app startup
2. Run on first load after deployment
3. Show toast notification when complete

### Option 3: Admin Tool
1. Add `/fix-data` command to app
2. Show UI with fix button
3. Display results in app UI

---

## 📝 Future Prevention

To prevent this issue from happening again:

1. **Database Schema Validation**
   - Add NOT NULL constraint to probability field
   - Set default value in schema

2. **Type Safety**
   - Use TypeScript strict mode
   - Add runtime validation with Zod/Yup

3. **Migration Scripts**
   - Run migrations before deployment
   - Include rollback procedures

4. **Monitoring**
   - Add error tracking for validation failures
   - Alert on corrupted data detection

---

## ✅ Checklist

Before running the fix:
- [ ] You're on uffpmobile.vercel.app
- [ ] Browser console is open
- [ ] You've copied the entire script

After running the fix:
- [ ] Review the console output
- [ ] Check that fixes were applied
- [ ] Refresh the page
- [ ] Test affected forecasts
- [ ] Delete backup if everything works

---

## 🆘 Support

If you encounter any issues:

1. **Check console logs** for error messages
2. **Restore from backup** if needed
3. **Contact the development team** with:
   - Console output
   - Browser and OS version
   - Steps to reproduce

---

**Last Updated**: 2026-02-02  
**Script Version**: 1.0.0  
**Tested On**: Chrome 120+, Firefox 121+, Safari 17+
