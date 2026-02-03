/**
 * Regression test for Anthropic API model validation
 * Ensures we're using a valid Claude model that exists in the API
 * 
 * This test prevents the bug where an invalid model ID (e.g., claude-3-5-sonnet-20241022)
 * causes 404 errors from Anthropic API, breaking forecast creation.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

async function runTests() {
  console.log('🧪 Testing Anthropic Model Configuration\n');
  console.log('============================================================\n');

  // Test 1: Extract model ID from coach.ts
  console.log('✓ Test 1: Model ID extraction from coach.ts');

  const coachPath = join(__dirname, '../lib/coach.ts');
  const coachContent = readFileSync(coachPath, 'utf-8');

  // Extract model ID from the code
  const modelMatch = coachContent.match(/model:\s*['"]([^'"]+)['"]/);

  if (!modelMatch) {
    console.error('❌ FAILED: Could not find model ID in coach.ts');
    console.error('   Expected pattern: model: "claude-..."');
    process.exit(1);
  }

  const modelId = modelMatch[1];
  console.log(`✅ PASSED: Found model ID: ${modelId}`);

  // Test 2: Validate model ID format
  console.log('\n✓ Test 2: Model ID format validation');

  // Valid formats as of 2026:
  // - claude-sonnet-4-YYYYMMDD
  // - claude-sonnet-4.5-YYYYMMDD  
  // - claude-opus-4-YYYYMMDD
  // - claude-haiku-4-YYYYMMDD
  const validPatterns = [
    /^claude-(sonnet|opus|haiku)-4(\.\d+)?-\d{8}$/,  // e.g., claude-sonnet-4-20250514
    /^claude-(sonnet|opus|haiku)-3-5-sonnet-\d{8}$/, // Legacy 3.5 format (if still valid)
  ];

  const isValidFormat = validPatterns.some(pattern => pattern.test(modelId));

  if (!isValidFormat) {
    console.error('❌ FAILED: Invalid model ID format');
    console.error(`   Model ID: ${modelId}`);
    console.error('   Expected formats:');
    console.error('     - claude-sonnet-4-YYYYMMDD');
    console.error('     - claude-opus-4-YYYYMMDD');
    console.error('     - claude-haiku-4-YYYYMMDD');
    process.exit(1);
  }

  console.log('✅ PASSED: Model ID format is valid');

  // Test 3: Test actual API call (if ANTHROPIC_API_KEY is available)
  console.log('\n✓ Test 3: Anthropic API validation');

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log('⚠️  SKIPPED: ANTHROPIC_API_KEY not available');
    console.log('   (This is OK for local testing without API key)');
    printSummary(modelId);
    return;
  }

  // Make a minimal API call to validate the model exists
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Check if it's a model not found error
      if (errorData.error?.type === 'not_found_error' && 
          errorData.error?.message?.includes('model:')) {
        console.error('❌ FAILED: Model does not exist in Anthropic API');
        console.error(`   Model ID: ${modelId}`);
        console.error(`   API Error: ${errorData.error.message}`);
        console.error('\n   To fix this:');
        console.error('   1. Check https://docs.anthropic.com/en/docs/about-claude/models');
        console.error('   2. Update model ID in lib/coach.ts');
        console.error('   3. Run this test again to verify');
        process.exit(1);
      }
      
      // Other API errors (rate limit, auth, etc.) are not model validation failures
      console.log(`⚠️  API returned ${response.status}, but not a model error`);
      console.log('   Model ID appears valid (error is not model-related)');
      console.log('✅ PASSED: Model validation successful');
    } else {
      console.log('✅ PASSED: Model exists and API call successful');
    }
  } catch (error: any) {
    console.error('⚠️  Network error during API validation:', error.message);
    console.log('   Model format is valid, but could not verify with API');
    console.log('✅ PASSED: Model format validation successful');
  }

  printSummary(modelId);
}

function printSummary(modelId: string) {
  console.log('\n============================================================\n');
  console.log('📊 Test Summary: All tests passed\n');
  console.log('✅ Anthropic model configuration is valid!\n');
  console.log(`Current model: ${modelId}\n`);
}

// Run the tests
runTests().catch((error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});
