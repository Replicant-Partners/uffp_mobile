# UFFP Mobile App - Troubleshooting Guide

## Common Issues and Solutions

### Issue: "Web support dependencies missing"

**Error:**
```
CommandError: It looks like you're trying to use web support but don't have the required
dependencies installed.

Install react-dom@19.1.0, react-native-web@^0.21.0
```

**Solution:**
```bash
cd /home/ilabra/uffp/mobile-app
npx expo install react-dom react-native-web
```

Then run:
```bash
npm run web
```

---

### Issue: "Package version mismatch"

**Warning:**
```
The following packages should be updated for best compatibility:
  react-native-screens@4.20.0 - expected version: ~4.16.0
  react-native-svg@15.15.1 - expected version: 15.12.1
```

**Solution:**
This is just a warning. The app will work fine. To fix:
```bash
npx expo install --fix
```

Or manually:
```bash
npm install react-native-screens@~4.16.0 react-native-svg@15.12.1
```

---

### Issue: "Metro bundler won't start"

**Solution 1 - Clear cache:**
```bash
npm start -- --clear
```

**Solution 2 - Reset Metro:**
```bash
rm -rf node_modules/.cache
npm start
```

**Solution 3 - Full reset:**
```bash
rm -rf node_modules
npm install
npm start
```

---

### Issue: "Cannot connect to Metro bundler"

**Check if port 8081 is in use:**
```bash
lsof -i :8081
```

**Kill existing process:**
```bash
kill -9 $(lsof -t -i:8081)
```

**Start again:**
```bash
npm start
```

---

### Issue: "Charts not rendering"

**Symptoms:**
- Blank space where charts should be
- Console errors about SVG

**Solution 1 - Install dependencies:**
```bash
npm install react-native-svg
```

**Solution 2 - Clear cache:**
```bash
npm start -- --reset-cache
```

**Solution 3 - Try web first:**
```bash
npm run web
```
Web version is most reliable for testing charts.

---

### Issue: "TypeScript errors"

**Check for errors:**
```bash
npx tsc --noEmit
```

**Common fixes:**
```bash
# Update TypeScript
npm install typescript@latest --save-dev

# Regenerate types
rm -rf node_modules
npm install
```

---

### Issue: "Module not found"

**Error:**
```
Error: Unable to resolve module @react-navigation/native
```

**Solution:**
```bash
# Check if installed
npm list @react-navigation/native

# If missing, install
npm install @react-navigation/native @react-navigation/native-stack

# Also install peer dependencies
npx expo install react-native-screens react-native-safe-area-context
```

---

### Issue: "App crashes on startup"

**Check logs:**
```bash
# Start with verbose logging
npm start -- --verbose

# Or check specific platform
npm run web # Usually most stable
npm run ios # macOS only
npm run android
```

**Common causes:**
1. Missing dependencies
2. Invalid import paths
3. Syntax errors in added code

**Solution:**
```bash
# Reset to clean state
git status
git checkout -- .  # Discard changes
npm install
npm start
```

---

### Issue: "Simulator won't start (iOS)"

**Requirements:**
- macOS only
- Xcode installed
- Xcode Command Line Tools installed

**Check Xcode:**
```bash
xcode-select -p
```

**Install Command Line Tools:**
```bash
xcode-select --install
```

**Open simulator manually:**
```bash
open -a Simulator
```

Then run:
```bash
npm run ios
```

---

### Issue: "Android emulator not detected"

**Check Android SDK:**
```bash
echo $ANDROID_HOME
```

**Set environment variable (if missing):**
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

**Start emulator manually:**
```bash
# List available emulators
emulator -list-avds

# Start specific emulator
emulator -avd Pixel_5_API_30
```

Then run:
```bash
npm run android
```

---

### Issue: "Expo Go app won't connect"

**Check network:**
- Phone and computer must be on same WiFi
- Disable VPN on both devices
- Check firewall isn't blocking port 8081

**Use tunnel mode:**
```bash
npm start -- --tunnel
```

**Or use LAN mode:**
```bash
npm start -- --lan
```

**Alternative - Use web:**
```bash
npm run web
```
Then access from phone browser.

---

### Issue: "Slow performance / lag"

**Reduce simulation iterations:**

Edit `src/services/forecastService.ts`:
```typescript
// Change from 10000 to 1000
await runSimulation(drivers, 1000);
```

**Enable production mode:**
```bash
npm run web -- --production
```

**Optimize for device:**
- Use web version for best performance
- iOS simulator is faster than Android emulator
- Physical devices are fastest

---

### Issue: "Build errors with EAS"

**Install EAS CLI:**
```bash
npm install -g eas-cli
```

**Login:**
```bash
eas login
```

**Configure project:**
```bash
eas build:configure
```

**Create build:**
```bash
# Development build
eas build --platform ios --profile development

# Production build
eas build --platform ios --profile production
```

---

### Issue: "Navigation not working"

**Error:**
```
Cannot find module '@react-navigation/native'
```

**Solution:**
```bash
npm install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
```

**Check App.tsx:**
Make sure NavigationContainer is properly set up.

---

### Issue: "Fonts not loading"

**If you added custom fonts:**

1. Install expo-font:
```bash
npx expo install expo-font
```

2. Load fonts before rendering:
```typescript
import * as Font from 'expo-font';
import { useEffect, useState } from 'react';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        'CustomFont': require('./assets/fonts/CustomFont.ttf'),
      });
      setFontsLoaded(true);
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) return null;
  
  // Render app
}
```

---

### Issue: "Web version works, but mobile doesn't"

**Common causes:**
1. Platform-specific API usage
2. Different rendering engines
3. Missing mobile dependencies

**Debug mobile-specific issues:**
```bash
# iOS
npm run ios -- --verbose

# Android  
npm run android -- --verbose
```

**Use React Native Debugger:**
- Shake device to open dev menu
- Enable "Debug JS Remotely"
- Check Chrome DevTools console

---

### Issue: "Cannot read property 'map' of undefined"

**Cause:**
Data not loaded before rendering.

**Solution:**
Add loading state:
```typescript
const [data, setData] = useState<ForecastConfig[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadData = async () => {
    const forecasts = forecastService.getExampleForecasts();
    setData(forecasts);
    setLoading(false);
  };
  loadData();
}, []);

if (loading) return <ActivityIndicator />;
```

---

## Getting Help

### Check these first:
1. Node version: `node --version` (need >= 18.0.0)
2. NPM version: `npm --version` (need >= 8.0.0)
3. Expo CLI: `npx expo --version`

### Clear everything and restart:
```bash
# Nuclear option - resets everything
rm -rf node_modules
rm -rf .expo
rm package-lock.json
npm install
npm start -- --clear
```

### Platform-specific help:

**Web issues:**
- Try different browser (Chrome recommended)
- Check console for errors (F12)
- Disable browser extensions
- Clear browser cache

**iOS issues:**
- Update Xcode to latest
- Clean build: `cd ios && pod install && cd ..`
- Reset simulator: Device → Erase All Content and Settings

**Android issues:**
- Update Android Studio
- Sync Gradle files
- Invalidate caches and restart
- Check SDK Manager for missing tools

### Still stuck?

1. **Check GitHub issues:** https://github.com/Replicant-Partners/uffp/issues
2. **Expo forums:** https://forums.expo.dev/
3. **React Native Discord:** https://discord.gg/react-native
4. **Stack Overflow:** Tag questions with `react-native` and `expo`

### Report a bug:

Include:
- Operating system (macOS, Linux, Windows)
- Node version: `node --version`
- NPM version: `npm --version`
- Platform (web, iOS, Android)
- Full error message
- Steps to reproduce
- What you've already tried

---

## Prevention Tips

### Before starting development:
```bash
# Check versions
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 8.0.0

# Fresh install
cd /home/ilabra/uffp/mobile-app
rm -rf node_modules
npm install

# Verify dependencies
npm list --depth=0
```

### Best practices:
- Always use `npx expo install` for Expo-managed packages
- Use `npm install` for other packages
- Test on web first (fastest feedback loop)
- Commit working changes frequently
- Keep dependencies updated: `npx expo install --check`

### Regular maintenance:
```bash
# Check for updates
npx expo install --check

# Update Expo SDK
npx expo upgrade

# Audit security
npm audit
npm audit fix
```

---

**Most issues are solved by: `rm -rf node_modules && npm install && npm start -- --clear`** 🔧
