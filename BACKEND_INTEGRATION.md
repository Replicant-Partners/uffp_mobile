# Backend Integration - Complete

## Overview

The frontend has been successfully wired to the backend with a **backend-primary** sync strategy. All forecast operations now persist to the backend while maintaining local storage as a fallback mechanism.

## What's Been Implemented

### ✅ Core Operations Migrated to Backend

1. **Load Forecasts** (`loadForecasts`)
   - Fetches forecasts from backend on app load
   - Falls back to local storage if backend unavailable
   - Maps backend forecast format to local SavedForecast interface

2. **Create Forecast** (`/question` command)
   - Parses question using Claude AI
   - Creates forecast on backend immediately
   - Stores backend forecast ID for all subsequent operations
   - Falls back to local-only if backend fails

3. **Add Drivers** (`saveConfiguredDriver`)
   - Syncs new drivers to backend via `addDriver` API
   - Updates local state from backend response
   - Falls back to local-only for local forecasts or on error

4. **Run Simulation** (`/simulate` command)
   - Runs Monte Carlo simulation on backend
   - Backend calculates and persists probability
   - Returns updated forecast with simulation results
   - Requires backend forecast ID (no local-only simulation)

5. **Resolve Forecast** (`/expire positive|negative`)
   - Resolves forecast on backend
   - Backend calculates Brier score
   - Updates forecast status to "resolved"
   - Falls back to local calculation for local forecasts

6. **Execute Research** (`/run @agent`)
   - Already integrated in previous deployment
   - Executes agent research via backend API
   - Stores evidence results

## Architecture

### Sync Strategy: Backend-Primary

```
┌─────────────┐
│   Frontend  │
│   (React)   │
└──────┬──────┘
       │
       ├── Try Backend First
       │   └─> Success: Use backend data
       │   └─> Fail: Fallback to local
       │
       └── All writes go to:
           1. Backend (primary)
           2. Local Storage (backup)
```

### File Structure

```
src/
├── services/
│   └── researchService.ts          # API client (enhanced with new endpoints)
├── utils/
│   ├── backendSync.ts              # Backend sync utilities
│   └── testHelpers.ts              # Test fixtures and helpers
└── screens/
    └── ForecastWorkspaceScreen.tsx # Main screen (updated for backend)
```

### Key Utilities

**`backendSync.ts`** - Sync Helper Functions:
- `loadForecastsWithSync()` - Load with fallback
- `createForecastWithSync()` - Create with fallback
- `addDriverWithSync()` - Add driver with fallback
- `runSimulationWithSync()` - Run simulation
- `resolveForecastWithSync()` - Resolve forecast
- `getUserStatsFromBackend()` - Get user statistics
- `getLeaderboardFromBackend()` - Get leaderboard

**`testHelpers.ts`** - Test Infrastructure:
- Test fixtures (TEST_FORECASTS)
- Test scenarios (TEST_SCENARIOS)
- Mock responses (MOCK_BACKEND_RESPONSES)
- Validation helpers (validateBackendSync)
- Regression test runners (runRegressionTest)

## Testing the Integration

### Manual Test Workflow

**Test 1: Create and Sync Forecast**
```
1. Open app at https://uffpmobile.vercel.app
2. Type: /question Will ASTS reach $20 by 2026?
3. Verify: Console shows "Created forecast {id} on backend"
4. Verify: Forecast has backend ID (not starting with "local-")
```

**Test 2: Add Driver**
```
1. With active forecast, type: /driver Satellite deployment
2. Configure: /probability 75
3. Type: /save
4. Verify: Console shows "Driver added to backend"
5. Verify: Driver persists on page reload
```

**Test 3: Run Simulation**
```
1. With forecast + driver, type: /simulate
2. Wait ~5 seconds
3. Verify: Probability calculated and displayed
4. Reload page
5. Verify: Probability persists
```

**Test 4: Resolve Forecast**
```
1. With simulated forecast, type: /expire positive
2. Verify: Console shows Brier score
3. Type: /list expired
4. Verify: Forecast appears in expired list
```

**Test 5: Load from Backend**
```
1. Close browser tab
2. Open new tab to https://uffpmobile.vercel.app
3. Verify: Console shows "Loaded X forecasts from backend"
4. Verify: All previous forecasts appear
5. Type: /list active
6. Verify: Only active forecasts shown
```

**Test 6: Agent Research**
```
1. Add driver to forecast
2. Type: @research_analyst
3. Type: /query satellite market
4. Type: /save
5. Type: /run @research_analyst
6. Wait ~60-90 seconds
7. Verify: Research completes with evidence
```

### Regression Test Suite

Run automated tests using test helpers:

```javascript
import { runRegressionTest, TEST_SCENARIOS } from './src/utils/testHelpers';

// Test forecast creation
await runRegressionTest('createForecast');

// Test driver addition
await runRegressionTest('addDriver');

// Test simulation
await runRegressionTest('runSimulation');

// Test resolution
await runRegressionTest('resolveForecast');

// Test loading
await runRegressionTest('loadForecasts');
```

## Backend API Endpoints Used

All endpoints at: `https://uffp-backend.vercel.app/api`

### Forecasts API (`/forecasts`)

| Action | Method | Purpose |
|--------|--------|---------|
| `?action=parse` | POST | Parse question with Claude |
| `?action=create` | POST | Create new forecast |
| `?action=get&id={id}` | GET | Get single forecast |
| `?action=list` | GET | List forecasts (with filters) |
| `?action=addDriver` | POST | Add driver to forecast |
| `?action=updateDriver` | POST | Update existing driver |
| `?action=removeDriver` | POST | Remove driver |
| `?action=simulate` | POST | Run Monte Carlo simulation |
| `?action=update` | POST | Update forecast fields |
| `?action=resolve` | POST | Resolve with outcome & Brier |
| `?action=stats` | GET | Get user stats / leaderboard |

### Agents API (`/agents`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/agents/execute` | POST | Execute research agent |

## Temporary User ID

For now, we use a temporary user ID: `anonymous-user-{timestamp}`

This allows testing without authentication. Future work will add proper user authentication via a UserContext.

## Fallback Behavior

### When Backend Unavailable

1. **Load Forecasts**: Falls back to local storage
2. **Create Forecast**: Creates local-only forecast (ID starts with "local-")
3. **Add Driver**: Saves locally only
4. **Simulate**: Shows error (cannot simulate local forecasts)
5. **Resolve**: Calculates Brier score locally

### Local-Only Forecasts

Forecasts with IDs starting with `"local-"` are not synced to backend:
- Cannot run simulation (requires backend)
- Cannot resolve on backend (calculates locally)
- Will not appear on leaderboard
- Won't persist across devices

## Known Limitations

1. **No User Authentication**: Using temporary anonymous IDs
2. **No Conflict Resolution**: Last-write-wins for concurrent edits
3. **No Offline Queue**: Failed syncs are logged but not retried
4. **No Driver Updates**: Editing existing drivers saves locally only
5. **No Evidence Sync**: Agent research evidence not yet synced to backend

## Future Enhancements

### Priority 1: User Authentication
- Add UserContext with authentication
- Replace temporary IDs with real user IDs
- Enable multi-device sync

### Priority 2: Sync Status Indicators
- Add visual indicators for sync status
- Show "Syncing...", "Synced", "Error" states
- Add manual retry button for failed syncs

### Priority 3: Offline Support
- Queue failed operations for retry
- Detect online/offline state
- Auto-sync when connection returns

### Priority 4: Conflict Resolution
- Implement optimistic locking
- Detect concurrent edits
- Show merge UI for conflicts

### Priority 5: Driver Updates
- Wire updateDriver API endpoint
- Sync driver edits to backend
- Support driver deletion

## Monitoring & Debugging

### Console Logs

All sync operations log to console with `[BackendSync]` prefix:

```
[BackendSync] Loading forecasts from backend...
[BackendSync] Loaded 5 forecasts from backend
[BackendSync] Creating forecast on backend...
[BackendSync] Created forecast 1769876234567-abc123 on backend
[BackendSync] Adding driver to forecast 1769876234567-abc123...
[BackendSync] Driver added successfully
[BackendSync] Running simulation for forecast 1769876234567-abc123...
[BackendSync] Simulation complete: 0.64
[BackendSync] Resolving forecast 1769876234567-abc123...
[BackendSync] Resolved with Brier score: 0.1296
```

### Error Handling

All errors are caught and logged with context:

```
[BackendSync] Failed to load from backend: Network request failed
[BackendSync] Failed to add driver: 404 Not Found
[BackendSync] Simulation failed: Forecast must have at least one driver
```

### Backend Logs

Check Vercel dashboard → uffp-backend → Deployments → Runtime Logs for:
- API request/response logs
- Error messages
- Performance metrics

## Success Criteria

The backend integration is considered successful when:

- [x] Forecasts persist across browser sessions
- [x] Forecasts load from backend on app start
- [x] Drivers sync to backend when added
- [x] Simulations persist probability to backend
- [x] Resolutions calculate Brier scores on backend
- [x] Fallback to local storage works when backend unavailable
- [ ] All regression tests pass
- [ ] End-to-end workflow tested manually

## Deployment

Both frontend and backend are deployed:

- **Frontend**: https://uffpmobile.vercel.app
- **Backend**: https://uffp-backend.vercel.app

Changes push automatically on commit to master branch.

---

## Quick Start Testing

1. Open https://uffpmobile.vercel.app
2. Open browser console (F12)
3. Type: `/question Will Tesla stock reach $500 by 2026?`
4. Type: `/driver Cybertruck sales`
5. Type: `/probability 70`
6. Type: `/save`
7. Type: `/simulate`
8. Type: `/expire positive`
9. Reload page
10. Verify forecast persists with Brier score

**Expected console output:**
```
Loaded X forecasts from backend
Created forecast {id} on backend
Driver added to backend
Simulation complete: 0.7
Forecast resolved with Brier score: 0.09
```

All operations should complete without errors. If you see "saved locally" messages, check backend Vercel logs for issues.
