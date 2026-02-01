# UFFP Mobile Test Checklist

## Pre-Test Setup
- [ g] Wait for Vercel deployment to complete (~3 min after push)
- [ g] Refresh browser at https://uffpmobile.vercel.app/
- [ g] Open browser console (F12) to see debug logs

---

## Test 1: AI Driver Configuration

### Setup:
1. [ a] Type `/question Will Tesla stock price exceed $500 by end of 2025?`
2. [a ] Wait for parsing to complete
3. [ a] Should see suggested drivers list
4. however  error with integrity constraint for distribution type

### Test AI Configuration:
1. /type continuous — PASS
Why: Market growth is a percentage or a volume, not a simple yes/no. Using a continuous scale allows for the nuance Tetlock requires for high-accuracy forecasting.

2. /dist lognormal — EXCELLENT
Why: Stock prices and market sectors almost always follow a lognormal distribution. They can't go below zero, but they have "fat tails"—meaning there is a small but real chance of explosive, exponential growth (the "Moonshot" scenario).

3. /p 10 / 50 / 200 — STRETCH NEEDED
The Issue: Your range is very wide, which is good for avoiding overconfidence, but the p50 (50) compared to the p95 (200) suggests you think there's a huge upside but very little downside.

The Fix: If competition was fierce in late 2025, your "p5" (the floor) should perhaps be lower or your p50 should be more conservative to reflect the "Inside View" of the actual market data from 2025.

4. /direction increases — PASS
Why: This is a logical "Multiplier." If the market grows, Tesla's probability of hitting $500 naturally increases.

🚦 Applying Threshold Impacts (February 2026 Update)
Since your current date is February 1, 2026, you should be looking at "Tripwires" that occurred in Q4 of 2025 to adjust this driver:

The "Interest Rate" Threshold: If the Fed didn't cut rates by Dec 2025, your EV Market Growth driver should have its p50 nudged downward immediately.

The "Market Share" Threshold: If a competitor (like BYD) exceeded 25% global market share, the "Competition" part of this driver has hit a threshold.

Action: You might change the /direction to decreases or significantly lower the p95 ceiling, as the "pie" for Tesla is now smaller.

🛠 Suggested "Superforecaster" Adjustment
If you were to refine this driver right now to be more "Tetlock-smart," I would split it into two:

Driver A (The Base Rate): Global EV Sector Growth (Lognormal).

Driver B (The Threshold): Tesla's Market Share % (Triangular).



### Test Manual Override:
9. [ worked] Change type from continuous to binary (or vice versa)
10. [ fail] **Expected**: Console warning `⚠️ Changing from recommended type`
11. [worked ] Change distribution
12. [ ] **Expected**: Console warning about override
13. [ ] Try to save with invalid values (e.g., p5 > p50)
14. [ fail] **Expected**: Error message blocks save
 did no catch integrity constrain for p values on eidit but di withincorrect p values. also we need a better wy to commnicate how to set p values here are some notes:
p5: The "Oh No" Floor (5th Percentile)
What it means: You are 95% sure the actual result will be higher than this.

The Mindset: "If everything goes wrong, what is the lowest realistic number?"

Tesla Example: You set p5 to 10. You are saying there is only a tiny 5% chance the EV market grows by less than 10%.

p50: The "Coin Flip" Middle (Median)
What it means: You think there is a 50/50 chance the result is higher or lower than this.

The Mindset: "If I had to bet my own money on one specific spot, where is the center of the target?"

Tesla Example: You set p50 to 50. This is your "Base Case."

p95: The "Moonshot" Ceiling (95th Percentile)
What it means: You are 95% sure the actual result will be lower than this.

The Mindset: "If a miracle happens, what is the highest realistic number?"

Tesla Example: You set p95 to 200. You are saying there is only a 5% chance growth exceeds 200%.
---

## Test 2: Simulation with Continuous Drivers

### Setup:
15. [ ] Add 2-3 drivers (mix of continuous and binary)
16. [ ] Configure each with different distributions:
    - One triangular
    - One normal or lognormal
    - One binary

### Run Simulation:
17. [ pass] Type `/simulate`
18. [ pass] **Expected**: "Running simulation..." message
19. [ pass] **Check console**: Should see `Simulation #1 complete: [probability]`
20. [ fail] **Expected**: Bar chart appears showing distribution histogram
21. [ fail] **Expected**: Chart shows 20 bins with probability density
22. [ fail] **Expected**: Y-axis shows percentages, X-axis shows 0-100%
23. [ pass] Verify probability result looks reasonable (0.0 to 1.0)

### Run Multiple Simulations:
24. [ ] Modify one driver's parameters (change p50 value)
25. [ ] Run `/simulate` again
26. [ ] **Expected**: "Simulation #2 complete" in console
27. [ ] **Expected**: Bar chart updates to latest simulation
28. [ ] **Expected**: Line chart appears showing probability history
29. [ ] **Expected**: Line chart shows 2 points, probability trend over time
30. [ ] Run `/simulate` a 3rd time
31. [ ] **Expected**: Line chart now shows 3 points

---

## Test 3: Driver Config UI Improvements

### Type-Specific Display:
32. [ ] Configure a **continuous** driver
33. [ ] **Expected**: Shows:
    - Distribution field
    - Range (p5/p50/p95)
    - Impact direction
    - Explanation: "sample from distribution and multiply outcome"
34. [ ] Configure a **binary** driver
35. [ ] **Expected**: Shows:
    - Probability field only
    - Explanation: "either happen or don't happen (forecast fails)"

### Contextual Hints:
36. [ ] While configuring continuous driver
37. [ ] **Expected**: Hints show `/dist`, `/p`, `/direction`
38. [ ] Change to binary with `/type binary`
39. [ ] **Expected**: Hints now show `/prob` instead

---

## Test 4: Agent Execution (Regression Test)

### Setup:
40. [ ] Add an agent to a driver: `@research_analyst`
41. [ ] Configure with `/query market trends`
42. [ ] Save with `/save`

### Run Agent:
43. [ ] Type `/run @research_analyst`
44. [ ] **Expected**: Command stays as `/run @research_analyst` (doesn't disappear)
45. [ ] Press Enter
46. [ ] **Expected**: Agent executes (or fails with useful error)
47. [ ] **Check**: Agent query doesn't reset to "not set"

### Agent Autocomplete:
48. [ ] Type `/run @res`
49. [ ] **Expected**: Autocomplete shows agents starting with "res"
50. [ ] Click on agent from list
51. [ ] **Expected**: Input becomes `/run @research_analyst`
52. [ ] **Verify**: `/run` prefix is preserved

---

## Test 5: Validation & Constraints

### Triangular Validation:
53. [ ] Create continuous driver with triangular distribution
54. [ ] Set p5=50, p50=40, p95=70 (invalid: p5 > p50)
55. [ ] Try to `/save`
56. [ ] **Expected**: Error "Values must satisfy: p5 < p50 < p95"
57. [ ] Fix to p5=30, p50=50, p95=70
58. [ ] **Expected**: Saves successfully

### Normal/Lognormal Validation:
59. [ ] Change distribution to normal
60. [ ] Set p50=60, p95=40 (invalid: p50 > p95)
61. [ ] Try to `/save`
62. [ ] **Expected**: Error "p50 must be less than p95"

### Binary Validation:
63. [ ] Create binary driver
64. [ ] Try to save without setting probability
65. [ ] **Expected**: Error "Binary drivers require probability value"
66. [ ] Set probability=150 (invalid: out of range)
67. [ ] **Expected**: Error "Probability must be between 0 and 100"

---

## Test 6: Backend Integration

### Forecast Creation:
68. [ ] Create new forecast
69. [ ] **Check console**: "Created forecast [ID] on backend"
70. [ ] **Verify**: Forecast ID has format like `1769899999-abc123` (not just timestamp)

### Driver Persistence:
71. [ ] Add and save a driver
72. [ ] **Check console**: "Driver added to backend"
73. [ ] Refresh the page
74. [ ] Load the forecast with `/list` and select it
75. [ ] **Expected**: Driver is still there

### Simulation Persistence:
76. [ ] Run simulation
77. [ ] Check that chart appears
78. [ ] Refresh page
79. [ ] Load forecast again
80. [ ] **Expected**: Charts still show (history preserved)

---

## Known Issues to Verify

### Issue uffp_mobile-84a: Local-only forecasts
81. [ ] Try to simulate an OLD forecast (created before backend sync)
82. [ ] **Expected**: Error "Forecast not found" or 404
83. [ ] **Verify**: New forecasts work fine

### Issue uffp_mobile-g6v: Agent mention firing multiple times
84. [ ] Type `@agent` multiple times quickly
85. [ ] **Watch**: Does it trigger agent config mode multiple times?
86. [ ] **Document**: Any weird behavior

---

## Performance Checks

87. [ ] **Driver analysis speed**: Should complete in <3 seconds
88. [ ] **Simulation speed**: 10,000 iterations should be <1 second
89. [ ] **Chart rendering**: Should appear immediately after simulation
90. [ ] **Console errors**: No red errors (warnings OK)

---

## Success Criteria

✅ **Must Pass:**
- AI driver configuration works
- Simulation produces charts
- Continuous drivers affect simulation
- Validation blocks invalid configs
- Agent autocomplete preserves `/run`

⚠️ **Should Pass:**
- Multiple simulation history shows line chart
- Backend persistence works
- No console errors

❌ **Known Failures (OK):**
- Old local-only forecasts can't simulate
- Agent mention might fire multiple times

---

## Report Template

```
## Test Results - [Date/Time]

### Working ✅
- 

### Broken ❌
- 

### Partial/Weird ⚠️
- 

### Console Errors
```
[[paste any errors here](backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Loading forecasts from backend...
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Loaded 0 forecasts from backend
index-2f4249e04657be454c79e822b9aff3fe.js:633 Loaded 24 forecasts from local storage
index-2f4249e04657be454c79e822b9aff3fe.js:633 Calling parseQuestion with: will the Thunder win the nba championship this season?
index-2f4249e04657be454c79e822b9aff3fe.js:633 Parsed object: Object
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Creating forecast on backend... Object
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Backend create response: Object
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Created forecast 1769904216201-jzirwilp3 on backend
index-2f4249e04657be454c79e822b9aff3fe.js:633 Created forecast 1769904216201-jzirwilp3 on backend
(index):1 Access to fetch at 'https://api.anthropic.com/v1/messages' from origin 'https://uffpmobile.vercel.app' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
api.anthropic.com/v1/messages:1  Failed to load resource: net::ERR_FAILED
driverAnalyzerService-9f57d8e9bcfac8d53c57f27fad7ac595.js:1 [DriverAnalyzer] Analysis failed: TypeError: Failed to fetch
    at e.analyzeDriver (driverAnalyzerService-9f57d8e9bcfac8d53c57f27fad7ac595.js:1:145)
    at K (index-2f4249e04657be454c79e822b9aff3fe.js:633:2176)
e.analyzeDriver @ driverAnalyzerService-9f57d8e9bcfac8d53c57f27fad7ac595.js:1
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Adding driver to forecast 1769904216201-jzirwilp3...
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Driver added successfully
index-2f4249e04657be454c79e822b9aff3fe.js:633 Driver added to backend
(index):1 Access to fetch at 'https://api.anthropic.com/v1/messages' from origin 'https://uffpmobile.vercel.app' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
api.anthropic.com/v1/messages:1  Failed to load resource: net::ERR_FAILED
driverAnalyzerService-9f57d8e9bcfac8d53c57f27fad7ac595.js:1 [DriverAnalyzer] Analysis failed: TypeError: Failed to fetch
    at e.analyzeDriver (driverAnalyzerService-9f57d8e9bcfac8d53c57f27fad7ac595.js:1:145)
    at K (index-2f4249e04657be454c79e822b9aff3fe.js:633:2176)
e.analyzeDriver @ driverAnalyzerService-9f57d8e9bcfac8d53c57f27fad7ac595.js:1
index-2f4249e04657be454c79e822b9aff3fe.js:633 Calling parseQuestion with: Will Tesla stock price exceed $500 by end of 2025?
index-2f4249e04657be454c79e822b9aff3fe.js:633 Parsed object: Object
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Creating forecast on backend... Object
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Backend create response: Object
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Created forecast 1769904408183-63wi96pxe on backend
index-2f4249e04657be454c79e822b9aff3fe.js:633 Created forecast 1769904408183-63wi96pxe on backend
(index):1 Access to fetch at 'https://api.anthropic.com/v1/messages' from origin 'https://uffpmobile.vercel.app' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
api.anthropic.com/v1/messages:1  Failed to load resource: net::ERR_FAILED
driverAnalyzerService-9f57d8e9bcfac8d53c57f27fad7ac595.js:1 [DriverAnalyzer] Analysis failed: TypeError: Failed to fetch
    at e.analyzeDriver (driverAnalyzerService-9f57d8e9bcfac8d53c57f27fad7ac595.js:1:145)
    at K (index-2f4249e04657be454c79e822b9aff3fe.js:633:2176)
e.analyzeDriver @ driverAnalyzerService-9f57d8e9bcfac8d53c57f27fad7ac595.js:1
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Adding driver to forecast 1769904408183-63wi96pxe...
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Driver added successfully
index-2f4249e04657be454c79e822b9aff3fe.js:633 Driver added to backend
(index):1 Access to fetch at 'https://api.anthropic.com/v1/messages' from origin 'https://uffpmobile.vercel.app' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
api.anthropic.com/v1/messages:1  Failed to load resource: net::ERR_FAILED
driverAnalyzerService-9f57d8e9bcfac8d53c57f27fad7ac595.js:1 [DriverAnalyzer] Analysis failed: TypeError: Failed to fetch
    at e.analyzeDriver (driverAnalyzerService-9f57d8e9bcfac8d53c57f27fad7ac595.js:1:145)
    at K (index-2f4249e04657be454c79e822b9aff3fe.js:633:2176)
e.analyzeDriver @ driverAnalyzerService-9f57d8e9bcfac8d53c57f27fad7ac595.js:1
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Adding driver to forecast 1769904408183-63wi96pxe...
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Driver added successfully
index-2f4249e04657be454c79e822b9aff3fe.js:633 Driver added to backend
(index):1 Access to fetch at 'https://api.anthropic.com/v1/messages' from origin 'https://uffpmobile.vercel.app' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
api.anthropic.com/v1/messages:1  Failed to load resource: net::ERR_FAILED
driverAnalyzerService-9f57d8e9bcfac8d53c57f27fad7ac595.js:1 [DriverAnalyzer] Analysis failed: TypeError: Failed to fetch
    at e.analyzeDriver (driverAnalyzerService-9f57d8e9bcfac8d53c57f27fad7ac595.js:1:145)
    at K (index-2f4249e04657be454c79e822b9aff3fe.js:633:2176)
e.analyzeDriver @ driverAnalyzerService-9f57d8e9bcfac8d53c57f27fad7ac595.js:1
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Adding driver to forecast 1769904408183-63wi96pxe...
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Driver added successfully
index-2f4249e04657be454c79e822b9aff3fe.js:633 Driver added to backend
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Running simulation for forecast 1769904408183-63wi96pxe...
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Simulation complete: 0.95
index-2f4249e04657be454c79e822b9aff3fe.js:633 Simulation #1 complete: 0.95
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Running simulation for forecast 1769904408183-63wi96pxe...
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Simulation complete: 0.95
index-2f4249e04657be454c79e822b9aff3fe.js:633 Simulation #1 complete: 0.95
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Running simulation for forecast 1769904408183-63wi96pxe...
backendSync-3ab9a937198c0a26ae7fc9a02c3f9178.js:1 [BackendSync] Simulation complete: 0.95
index-2f4249e04657be454c79e822b9aff3fe.js:633 Simulation #1 complete: 0.95
)]
```

### Screenshots
[attach if helpful]
```

---

## Quick Test (5 min version)

If short on time, just test these critical items:
- [ ] Create new forecast
- [ ] Add driver, see AI configuration
- [ ] Run `/simulate`, see bar chart
- [ ] Run `/simulate` again, see line chart
- [ ] Verify continuous driver simulation works
