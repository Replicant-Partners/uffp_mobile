# Quick Start Guide - UFFP Mobile App

## Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
cd /home/ilabra/uffp/mobile-app
npm install
```

### Step 2: Start the App

```bash
npm start
```

This opens the Expo development server.

### Step 3: Choose Your Platform

**Option A: Web (Fastest)**
- Press `w` in the terminal
- Or visit `http://localhost:8081` in your browser

**Option B: iOS Simulator (macOS only)**
- Press `i` in the terminal
- Requires Xcode installed

**Option C: Android Emulator**
- Press `a` in the terminal
- Requires Android Studio installed

**Option D: Physical Device**
1. Install "Expo Go" app from App/Play Store
2. Scan the QR code shown in terminal
3. App loads on your device

## What You'll See

### Home Screen
Two example forecasts:
- **ASTS** - Satellite communication company
- **RKLB** - Launch service provider

Tap any forecast to see full analysis.

### Forecast Detail Screen
- **Success Probability** - Large card showing % chance of hitting target
- **Bar Chart** - P10/P50/P90 confidence intervals
- **Distribution Curve** - Probability distribution visualization
- **Drivers** - Each forecast driver with parameters
- **Base Rate** - Historical success rates
- **Pre-Mortem** - Failure scenarios

## Features You Can Try

1. **View Different Forecasts** - Compare ASTS vs RKLB
2. **Analyze Drivers** - See how different distributions work
3. **Check Probabilities** - Understand confidence intervals
4. **Read Pre-Mortem** - Learn about failure modes

## Understanding the Charts

### Bar Chart (Top)
- **P10 (Red zone)** - Bear case, 10% chance of being below this
- **P50 (Yellow zone)** - Base case, most likely outcome
- **P90 (Green zone)** - Bull case, 90% chance of being below this

### Distribution Curve (Bottom)
- **Peak** - Most probable outcome
- **Spread** - Uncertainty range (wider = more uncertain)
- **Area** - Total probability = 100%

## Monte Carlo Simulation

Each time you open a forecast:
1. App runs 10,000 simulations
2. Samples from each driver's distribution
3. Calculates revenue for each iteration
4. Shows P10/P50/P90 results

Takes ~1-2 seconds on modern devices.

## Customizing

Want to add your own forecast? Edit:
```
src/services/forecastService.ts
```

Look for `getExampleForecasts()` function.

## Troubleshooting

**App won't start?**
```bash
npm start -- --clear
```

**Charts not showing?**
- Make sure you're connected to internet (first run)
- Restart Metro bundler
- Try web version first (`npm run web`)

**"Module not found"?**
```bash
rm -rf node_modules
npm install
```

## Next Steps

1. ✅ Run the app and explore forecasts
2. Read `README.md` for full documentation
3. Check `/docs/AGENT_PREVIEW_GUIDE.md` for UFFP platform info
4. Try adding your own forecast
5. Deploy to your phone with Expo Go

## Quick Commands

```bash
# Start development server
npm start

# Run on web
npm run web

# Run on iOS (macOS only)
npm run ios

# Run on Android
npm run android

# Clear cache
npm start -- --clear
```

## Getting Help

- Full README: `mobile-app/README.md`
- UFFP Docs: `/docs` directory
- Expo Docs: https://docs.expo.dev/
- Issues: https://github.com/Replicant-Partners/uffp/issues

---

Enjoy forecasting! 📊📈🎯
