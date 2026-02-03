/**
 * End-to-End Test: AI Base Rate Auto-Population
 */

const API_URL = 'https://uffp-backend.vercel.app/api';

async function testE2EBaseRate() {
  console.log('🧪 Testing E2E: AI Base Rate Auto-Population\n');
  console.log('============================================================\n');

  // Test 1: Parse question and get base rate
  console.log('✓ Test 1: Parse question with AI base rate generation');
  try {
    const response = await fetch(`${API_URL}/parse-question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userInput: 'Will AMD stock reach $200 by end of 2025?'
      })
    });

    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));

    // Verify structure
    if (!result.success) {
      console.log('❌ FAILED: Expected success: true\n');
      return false;
    }

    if (!result.parsed) {
      console.log('❌ FAILED: Missing parsed object\n');
      return false;
    }

    if (!result.parsed.question) {
      console.log('❌ FAILED: Missing question\n');
      return false;
    }

    // Check if externalView is present
    if (!result.parsed.externalView) {
      console.log('❌ FAILED: Missing externalView - base rate not generated\n');
      return false;
    }

    const { externalView } = result.parsed;

    // Verify externalView structure
    const requiredFields = ['referenceClass', 'baseRate', 'source', 'confidence', 'reasoning'];
    for (const field of requiredFields) {
      if (!(field in externalView)) {
        console.log(`❌ FAILED: Missing required field: ${field}\n`);
        return false;
      }
    }

    // Verify baseRate is in valid range
    if (externalView.baseRate < 0 || externalView.baseRate > 1) {
      console.log(`❌ FAILED: baseRate out of range: ${externalView.baseRate}\n`);
      return false;
    }

    // Verify confidence level
    if (!['high', 'medium', 'low'].includes(externalView.confidence)) {
      console.log(`❌ FAILED: Invalid confidence level: ${externalView.confidence}\n`);
      return false;
    }

    console.log('✅ PASSED: Base rate generated successfully');
    console.log(`  - Reference Class: ${externalView.referenceClass}`);
    console.log(`  - Base Rate: ${Math.round(externalView.baseRate * 100)}%`);
    console.log(`  - Confidence: ${externalView.confidence}`);
    console.log(`  - Source: ${externalView.source}`);
    console.log(`  - Reasoning: ${externalView.reasoning}\n`);

    return true;

  } catch (error: any) {
    console.log('❌ FAILED: Request error:', error.message);
    if (error.stack) {
      console.log('Stack:', error.stack);
    }
    return false;
  }
}

// Run test
testE2EBaseRate().then(success => {
  console.log('\n============================================================\n');
  if (success) {
    console.log('✅ E2E test passed! AI base rate auto-population working correctly.\n');
    process.exit(0);
  } else {
    console.log('❌ E2E test failed!\n');
    process.exit(1);
  }
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
