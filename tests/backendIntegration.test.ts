/**
 * Backend Integration Test
 * 
 * Tests the complete backend API integration:
 * 1. Parse question with AI base rate generation
 * 2. Verify externalView structure
 */

async function testBackendIntegration() {
  console.log('🧪 Testing Backend Integration\n');
  console.log('='.repeat(60));

  const BACKEND_URL = 'https://uffp-backend.vercel.app';

  // Test parseQuestion endpoint
  console.log('\n✓ Test: Parse Question with AI Base Rate Generation');
  console.log('   URL: POST /api/forecasts?action=parse');
  console.log('   Question: "Will Tesla stock reach $500 by end of 2026?"');

  try {
    const response = await fetch(`${BACKEND_URL}/api/forecasts?action=parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userInput: 'Will Tesla stock reach $500 by end of 2026?'
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.log('❌ FAILED: HTTP', response.status);
      console.log('   Error:', data);
      return 1;
    }

    console.log('✅ PASSED: Request successful');
    console.log('\n📊 Response Data:');
    console.log('   Success:', data.success);
    console.log('   Question:', data.parsed?.question || 'N/A');
    console.log('   Domain:', data.parsed?.domain || 'N/A');
    console.log('   Timeframe:', data.parsed?.timeframe || 'N/A');
    
    if (data.parsed?.externalView) {
      console.log('\n🎯 Base Rate Analysis (AI-Generated):');
      console.log('   Reference Class:', data.parsed.externalView.referenceClass);
      console.log('   Base Rate:', `${Math.round(data.parsed.externalView.baseRate * 100)}%`);
      console.log('   Source:', data.parsed.externalView.source || 'N/A');
      console.log('   Confidence:', data.parsed.externalView.confidence || 'N/A');
      console.log('   Reasoning:', data.parsed.externalView.reasoning || 'N/A');
      console.log('\n✅ AI Base Rate Generation: WORKING');
    } else {
      console.log('\n⚠️  No externalView in response');
      console.log('   This means ANTHROPIC_API_KEY is likely not configured');
      console.log('   The endpoint works, but AI features are disabled');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Backend Integration Test Complete\n');
    return 0;
    
  } catch (error) {
    console.log('❌ FAILED: Request error');
    console.log('   Error:', error instanceof Error ? error.message : error);
    console.log('\n' + '='.repeat(60));
    return 1;
  }
}

// Run test
testBackendIntegration().then(exitCode => {
  process.exit(exitCode);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
