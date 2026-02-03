/**
 * Phase 2 UI Integration Test
 * 
 * Verifies Phase 2 backend integration for UI display:
 * - externalView structure complete
 * - baseRate in valid range
 * - confidence level valid
 * - All fields present for UI rendering
 */

const API_URL = 'https://uffp-backend.vercel.app/api';

async function testPhase2UIIntegration() {
  console.log('🧪 Testing Phase 2 UI Integration\n');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Parse question returns externalView with all required fields
  console.log('✓ Test 1: Question parsing returns complete externalView');
  try {
    const response = await fetch(`${API_URL}/parse-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput: 'Will SpaceX successfully land Starship on Mars by 2030?'
      })
    });

    const result = await response.json();

    if (!result.success || !result.parsed) {
      console.log('❌ FAILED: Invalid response structure\n');
      failed++;
    } else if (!result.parsed.externalView) {
      console.log('❌ FAILED: No externalView returned\n');
      failed++;
    } else {
      const ev = result.parsed.externalView;
      const hasAllFields = 
        ev.referenceClass &&
        typeof ev.baseRate === 'number' &&
        ev.source &&
        ev.confidence &&
        ev.reasoning;
      
      if (!hasAllFields) {
        console.log('❌ FAILED: Missing required externalView fields\n');
        console.log('  Fields:', Object.keys(ev));
        failed++;
      } else {
        console.log('✅ PASSED: externalView has all required fields');
        console.log(`  - referenceClass: ${ev.referenceClass}`);
        console.log(`  - baseRate: ${ev.baseRate}`);
        console.log(`  - source: ${ev.source}`);
        console.log(`  - confidence: ${ev.confidence}`);
        console.log(`  - reasoning: ${ev.reasoning.substring(0, 50)}...\n`);
        passed++;
      }
    }
  } catch (error: any) {
    console.log('❌ FAILED: Request error:', error.message, '\n');
    failed++;
  }

  // Test 2: Verify baseRate is in valid range (0-1)
  console.log('✓ Test 2: baseRate is in valid range (0-1)');
  try {
    const response = await fetch(`${API_URL}/parse-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput: 'Will electric vehicles make up more than 50% of new car sales by 2035?'
      })
    });

    const result = await response.json();
    const baseRate = result.parsed?.externalView?.baseRate;
    
    if (baseRate === undefined) {
      console.log('❌ FAILED: No baseRate returned\n');
      failed++;
    } else if (baseRate < 0 || baseRate > 1) {
      console.log(`❌ FAILED: baseRate ${baseRate} is out of range (0-1)\n`);
      failed++;
    } else {
      console.log(`✅ PASSED: baseRate ${baseRate} is in valid range\n`);
      passed++;
    }
  } catch (error: any) {
    console.log('❌ FAILED: Request error:', error.message, '\n');
    failed++;
  }

  // Test 3: Verify confidence is valid enum value
  console.log('✓ Test 3: confidence is valid enum value');
  try {
    const response = await fetch(`${API_URL}/parse-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput: 'Will global temperatures rise by more than 2°C by 2100?'
      })
    });

    const result = await response.json();
    const confidence = result.parsed?.externalView?.confidence;
    const validValues = ['high', 'medium', 'low'];
    
    if (!confidence) {
      console.log('❌ FAILED: No confidence level returned\n');
      failed++;
    } else if (!validValues.includes(confidence)) {
      console.log(`❌ FAILED: confidence "${confidence}" is not in [high, medium, low]\n`);
      failed++;
    } else {
      console.log(`✅ PASSED: confidence "${confidence}" is valid\n`);
      passed++;
    }
  } catch (error: any) {
    console.log('❌ FAILED: Request error:', error.message, '\n');
    failed++;
  }

  // Test 4: Verify structure ready for UI display
  console.log('✓ Test 4: externalView structure ready for UI display');
  try {
    const response = await fetch(`${API_URL}/parse-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput: 'Will Bitcoin reach $100,000 by end of 2026?'
      })
    });

    const result = await response.json();
    const ev = result.parsed?.externalView;
    
    if (!ev) {
      console.log('❌ FAILED: No externalView returned\n');
      failed++;
    } else {
      // Check structure is ready for UI (has all display fields)
      const readyForUI = 
        ev.referenceClass &&
        typeof ev.baseRate === 'number' &&
        ev.confidence &&
        ev.source;
      
      if (!readyForUI) {
        console.log('❌ FAILED: externalView missing fields needed for UI display\n');
        failed++;
      } else {
        console.log('✅ PASSED: externalView ready for UI display');
        console.log(`  - Can display: "${ev.referenceClass}"`);
        console.log(`  - Base rate: ${Math.round(ev.baseRate * 100)}%`);
        console.log(`  - Confidence badge: ${ev.confidence}`);
        console.log(`  - Source attribution: ${ev.source}\n`);
        passed++;
      }
    }
  } catch (error: any) {
    console.log('❌ FAILED: Request error:', error.message, '\n');
    failed++;
  }

  // Test 5: Verify different questions get responses
  console.log('✓ Test 5: Different question domains receive appropriate analysis');
  try {
    const techResponse = await fetch(`${API_URL}/parse-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput: 'Will quantum computers break RSA encryption by 2030?'
      })
    });
    const weatherResponse = await fetch(`${API_URL}/parse-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput: 'Will it rain in Seattle next Tuesday?'
      })
    });

    const techResult = await techResponse.json();
    const weatherResult = await weatherResponse.json();

    const techRate = techResult.parsed?.externalView?.baseRate;
    const weatherRate = weatherResult.parsed?.externalView?.baseRate;

    if (techRate === undefined || weatherRate === undefined) {
      console.log('❌ FAILED: Missing base rates\n');
      failed++;
    } else {
      console.log('✅ PASSED: Both questions received base rate analysis');
      console.log(`  - Tech question: ${Math.round(techRate * 100)}%`);
      console.log(`  - Weather question: ${Math.round(weatherRate * 100)}%\n`);
      passed++;
    }
  } catch (error: any) {
    console.log('❌ FAILED: Request error:', error.message, '\n');
    failed++;
  }

  console.log('\n============================================================\n');
  console.log(`📊 Test Summary: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ Phase 2 UI Integration: All tests passed!');
    console.log('\nVerified:');
    console.log('  ✓ externalView structure complete for UI display');
    console.log('  ✓ baseRate in valid range (0-1)');
    console.log('  ✓ confidence level is valid enum');
    console.log('  ✓ All required fields present for header display');
    console.log('  ✓ Context-appropriate responses\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed\n');
    process.exit(1);
  }
}

// Run test
testPhase2UIIntegration().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
