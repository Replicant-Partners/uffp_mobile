# UFFP Mobile - Android Build & Deployment Guide

## Overview

This guide covers building the UFFP Mobile app for Android with backend integration.

## Prerequisites

1. **Node.js** 18+ installed
2. **Expo CLI**: `npm install -g @expo/cli`
3. **Android Studio** with Android SDK
4. **Physical Android device** or **Android Emulator**

## Backend Setup

1. Deploy the backend first (see `../uffp-backend/README.md`):

   ```bash
   cd ../uffp-backend
   npm install
   vercel --prod
   ```

2. Update backend URL in `src/services/researchService.ts`:
   - Change `https://uffp-backend.vercel.app` to your actual Vercel URL

## Android Development Build

### For Development (with Expo Go)

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start development server:

   ```bash
   npm start
   ```

3. Scan QR code with Expo Go app on Android device

### For Standalone APK Build

1. Install EAS CLI:

   ```bash
   npm install -g eas-cli
   ```

2. Login to your Expo account:

   ```bash
   eas login
   ```

3. Configure build (first time only):

   ```bash
   eas build:configure
   ```

4. Build APK:

   ```bash
   npm run build:android
   ```

5. Build App Bundle (for Play Store):
   ```bash
   npm run build:android:bundle
   ```

## Configuration

### Environment Variables

Create `.env` file in project root:

```bash
# Development
EXPO_PUBLIC_API_URL=http://localhost:3000

# Production
EXPO_PUBLIC_API_URL=https://your-backend-url.vercel.app
```

### Android Permissions

The app requires:

- `INTERNET` - For API calls to research backend

## Testing Backend Integration

1. Start the app on Android device/emulator
2. Navigate to "Research Agents" from home screen
3. Select an agent and prompt template
4. Fill in required variables
5. Tap "Run Now" to test API integration

## Production Deployment

### Option 1: EAS Build (Recommended)

1. Configure EAS project:

   ```bash
   eas project:info
   ```

2. Update `app.json` with your project ID

3. Build for production:
   ```bash
   eas build --platform android --production
   ```

### Option 2: Local Build with Expo Application Services

1. Install Android build dependencies:
   ```bash
   eas build --platform android --local
   ```

## Troubleshooting

### Common Issues

1. **Network Connection Failed**
   - Check internet permission in app.json
   - Verify API URL is correct
   - Test backend URL in browser

2. **Build Fails**
   - Ensure Android SDK is properly installed
   - Update Expo CLI: `npm install -g @expo/cli@latest`
   - Clear cache: `expo start -c`

3. **APK Won't Install**
   - Enable "Install from unknown sources" in Android settings
   - Build with different signing key

### Debug Mode

Enable debug mode in development:

```bash
expo start --dev-client
```

### Backend Testing

Test backend directly:

```bash
curl -X POST https://your-backend.vercel.app/api/agents/execute \
  -H "Content-Type: application/json" \
  -d '{"agentId":"research_analyst","promptId":"market_tam_sizing","variables":{"MARKET_SEGMENT":"Cloud Infrastructure","GEOGRAPHY":"United States"}}'
```

## Architecture

```
Mobile App (React Native/Expo)
    ↓ HTTP API Calls
Backend (Vercel Serverless)
    ↓ LLM API Calls
Anthropic/OpenAI APIs
    ↓ Research Results
Vercel KV Database
```

## Cost Optimization

- Use Claude Sonnet for most tasks (faster, cheaper)
- Reserve Claude Opus for complex research only
- Implement response caching in KV for repeated queries
- Set usage limits per user to control costs
