#!/bin/bash
# Validate Backend API - Test each endpoint

BASE_URL="https://uffp-backend.vercel.app/api"
USER_ID="2e644008-f5c7-47c5-854c-3801df9879cc"

echo "🔍 UFFP Backend API Validation"
echo "================================"
echo ""

# Test 1: List forecasts
echo "1. Testing GET /forecasts?action=list"
RESPONSE=$(curl -s "${BASE_URL}/forecasts?action=list&userId=${USER_ID}")
FORECAST_COUNT=$(echo "$RESPONSE" | jq -r '.forecasts | length')
echo "   ✓ Listed $FORECAST_COUNT forecasts"
echo ""

# Test 2: Parse question
echo "2. Testing POST /parse-question"
RESPONSE=$(curl -s -X POST "${BASE_URL}/parse-question" \
  -H "Content-Type: application/json" \
  -d '{"userInput":"Will Tesla reach $300 by 2026?"}')
PARSED_Q=$(echo "$RESPONSE" | jq -r '.question // "ERROR"')
echo "   Result: $PARSED_Q"
echo ""

# Test 3: Create forecast
echo "3. Testing POST /forecasts?action=create"
RESPONSE=$(curl -s -X POST "${BASE_URL}/forecasts?action=create" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'${USER_ID}'",
    "question": "API Test: Will this work?",
    "domain": "general",
    "timeframe": "2026-12-31",
    "resolutionCriteria": "Test forecast",
    "privacy": "private",
    "tags": ["test"]
  }')
  
SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
if [ "$SUCCESS" = "true" ]; then
  FORECAST_ID=$(echo "$RESPONSE" | jq -r '.forecast.id')
  echo "   ✓ Created forecast: $FORECAST_ID"
  
  # Test 4: Add driver
  echo ""
  echo "4. Testing POST /forecasts?action=addDriver"
  RESPONSE=$(curl -s -X POST "${BASE_URL}/forecasts?action=addDriver" \
    -H "Content-Type: application/json" \
    -d '{
      "forecastId": "'${FORECAST_ID}'",
      "driver": {
        "id": "drv_test_validation",
        "name": "Test Driver",
        "type": "binary",
        "direction": "increases",
        "probability": 0.5,
        "version": {"major": 1, "minor": 0},
        "versionHistory": []
      }
    }')
  DRIVER_ID=$(echo "$RESPONSE" | jq -r '.forecast.drivers[0].id // "ERROR"')
  echo "   Result: Driver ID = $DRIVER_ID"
  
  # Test 5: Update driver
  echo ""
  echo "5. Testing POST /forecasts?action=updateDriver"
  RESPONSE=$(curl -s -X POST "${BASE_URL}/forecasts?action=updateDriver" \
    -H "Content-Type: application/json" \
    -d '{
      "forecastId": "'${FORECAST_ID}'",
      "driverId": "'${DRIVER_ID}'",
      "updates": {"probability": 0.75}
    }')
  NEW_PROB=$(echo "$RESPONSE" | jq -r '.forecast.drivers[0].probability // "ERROR"')
  echo "   Result: Updated probability = $NEW_PROB"
  
  # Test 6: Set base rate
  echo ""
  echo "6. Testing POST /forecasts?action=setBaseRate"
  RESPONSE=$(curl -s -X POST "${BASE_URL}/forecasts?action=setBaseRate" \
    -H "Content-Type: application/json" \
    -d '{
      "forecastId": "'${FORECAST_ID}'",
      "baseRate": {
        "referenceClass": "Test reference class",
        "baseRate": 0.45,
        "source": "Test source",
        "generatedBy": "user",
        "confidence": "medium"
      }
    }')
  BASE_RATE=$(echo "$RESPONSE" | jq -r '.forecast.externalView.baseRate // "ERROR"')
  echo "   Result: Base rate = $BASE_RATE"
  
  echo ""
  echo "================================"
  echo "✅ API Validation Complete"
  echo ""
  echo "Test forecast created: $FORECAST_ID"
  echo "You can view it in the app or manually delete it."
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
  echo "   ✗ Failed to create forecast: $ERROR"
  echo ""
  echo "Response: $RESPONSE"
fi
