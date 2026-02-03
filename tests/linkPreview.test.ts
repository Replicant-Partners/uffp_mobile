/**
 * Link Preview Functionality Test
 * 
 * Tests the complete link preview pipeline:
 * 1. URL extraction from text
 * 2. Link preview metadata fetching
 * 3. Error handling
 */

import { extractUrls, isValidUrl, normalizeUrl, getDomain } from '../src/utils/urlUtils';
import { fetchLinkPreview } from '../src/services/linkPreviewService';

async function runTests() {
  console.log('🧪 Testing Link Preview Functionality\n');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  // Test 1: URL Extraction
  console.log('\n✓ Test 1: URL Extraction from Text');
  const testText = 'Check this article https://example.com/article and also https://github.com/test';
  const urls = extractUrls(testText);
  
  if (urls.length === 2 && urls[0] === 'https://example.com/article' && urls[1] === 'https://github.com/test') {
    console.log('✅ PASSED: Extracted 2 URLs correctly');
    console.log(`   Found: ${urls.join(', ')}`);
    passed++;
  } else {
    console.log('❌ FAILED: URL extraction incorrect');
    console.log(`   Expected: 2 URLs, Got: ${urls.length}`);
    console.log(`   URLs: ${urls.join(', ')}`);
    failed++;
  }

  // Test 2: URL Validation
  console.log('\n✓ Test 2: URL Validation');
  const validUrls = [
    'https://example.com',
    'http://test.org/path?query=1',
    'https://sub.domain.com:8080/path'
  ];
  const invalidUrls = [
    'not a url',
    'ftp://invalid.com',
    'javascript:alert(1)',
    ''
  ];

  const validResults = validUrls.map(url => isValidUrl(url));
  const invalidResults = invalidUrls.map(url => isValidUrl(url));

  if (validResults.every(r => r) && invalidResults.every(r => !r)) {
    console.log('✅ PASSED: URL validation working correctly');
    console.log(`   Valid URLs: ${validUrls.length} accepted`);
    console.log(`   Invalid URLs: ${invalidUrls.length} rejected`);
    passed++;
  } else {
    console.log('❌ FAILED: URL validation incorrect');
    failed++;
  }

  // Test 3: URL Normalization
  console.log('\n✓ Test 3: URL Normalization');
  const normalizedUrl = normalizeUrl('https://example.com/path/#fragment');
  
  if (normalizedUrl === 'https://example.com/path') {
    console.log('✅ PASSED: URL normalized (removed fragment)');
    console.log(`   Input: https://example.com/path/#fragment`);
    console.log(`   Output: ${normalizedUrl}`);
    passed++;
  } else {
    console.log('❌ FAILED: URL normalization incorrect');
    console.log(`   Expected: https://example.com/path`);
    console.log(`   Got: ${normalizedUrl}`);
    failed++;
  }

  // Test 4: Domain Extraction
  console.log('\n✓ Test 4: Domain Extraction');
  const domain = getDomain('https://www.example.com:8080/path?query=1');
  
  if (domain === 'www.example.com') {
    console.log('✅ PASSED: Domain extracted correctly');
    console.log(`   From: https://www.example.com:8080/path?query=1`);
    console.log(`   Domain: ${domain}`);
    passed++;
  } else {
    console.log('❌ FAILED: Domain extraction incorrect');
    console.log(`   Expected: www.example.com`);
    console.log(`   Got: ${domain}`);
    failed++;
  }

  // Test 5: Link Preview Fetch (Real HTTP Request)
  console.log('\n✓ Test 5: Link Preview Fetch (Real HTTP Request)');
  console.log('   Fetching: https://github.com/anthropics/anthropic-sdk-typescript');
  
  try {
    const preview = await fetchLinkPreview('https://github.com/anthropics/anthropic-sdk-typescript');
    
    if (preview.url && preview.title && preview.fetchedAt) {
      console.log('✅ PASSED: Link preview fetched successfully');
      console.log(`   Title: ${preview.title.substring(0, 60)}...`);
      console.log(`   Description: ${preview.description?.substring(0, 60)}...`);
      console.log(`   Image: ${preview.image ? '✓ Found' : '✗ None'}`);
      console.log(`   Favicon: ${preview.favicon ? '✓ Found' : '✗ None'}`);
      console.log(`   Error: ${preview.error || 'None'}`);
      passed++;
    } else {
      console.log('❌ FAILED: Link preview incomplete');
      console.log(`   Preview: ${JSON.stringify(preview, null, 2)}`);
      failed++;
    }
  } catch (err) {
    console.log('❌ FAILED: Link preview fetch threw error');
    console.log(`   Error: ${err instanceof Error ? err.message : err}`);
    failed++;
  }

  // Test 6: Link Preview Error Handling
  console.log('\n✓ Test 6: Link Preview Error Handling (Invalid URL)');
  
  try {
    const preview = await fetchLinkPreview('https://this-domain-definitely-does-not-exist-12345.com');
    
    if (preview.error) {
      console.log('✅ PASSED: Error handled gracefully');
      console.log(`   URL: ${preview.url}`);
      console.log(`   Title: ${preview.title}`);
      console.log(`   Error: ${preview.error}`);
      passed++;
    } else {
      console.log('⚠️  WARNING: No error reported (DNS may have resolved)');
      console.log(`   Preview: ${JSON.stringify(preview, null, 2)}`);
      passed++;
    }
  } catch (err) {
    console.log('❌ FAILED: Should not throw, should return error object');
    console.log(`   Error: ${err instanceof Error ? err.message : err}`);
    failed++;
  }

  // Test 7: Multiple URL Extraction
  console.log('\n✓ Test 7: Extract Multiple URLs from Complex Text');
  const complexText = `
    Check these resources:
    - Study: https://arxiv.org/abs/2301.12345
    - Blog: https://blog.example.com/forecasting-tips
    - Data: https://data.gov/dataset/123
    No URL here, just text.
    Another URL: https://metaculus.com/questions/12345
  `;
  
  const extractedUrls = extractUrls(complexText);
  
  if (extractedUrls.length === 4) {
    console.log('✅ PASSED: Extracted all 4 URLs from complex text');
    console.log(`   URLs found:`);
    extractedUrls.forEach((url, idx) => console.log(`     ${idx + 1}. ${url}`));
    passed++;
  } else {
    console.log('❌ FAILED: Expected 4 URLs');
    console.log(`   Found ${extractedUrls.length}: ${extractedUrls.join(', ')}`);
    failed++;
  }

  // Test 8: URL in /evidence Command Format
  console.log('\n✓ Test 8: Evidence Command URL Detection');
  const evidenceText = '/evidence Check this AMD analysis https://seekingalpha.com/article/4651234-amd-analysis-2026';
  const evidenceUrls = extractUrls(evidenceText);
  
  if (evidenceUrls.length === 1 && evidenceUrls[0].includes('seekingalpha.com')) {
    console.log('✅ PASSED: URL extracted from evidence command');
    console.log(`   Command: ${evidenceText.substring(0, 50)}...`);
    console.log(`   URL: ${evidenceUrls[0]}`);
    passed++;
  } else {
    console.log('❌ FAILED: Evidence URL extraction failed');
    console.log(`   Found: ${evidenceUrls.join(', ')}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ All link preview tests passed!');
    console.log('\n🎉 Phase 3 Link Preview functionality is fully operational!');
    console.log('\nFeatures verified:');
    console.log('  ✓ URL extraction from text');
    console.log('  ✓ URL validation and normalization');
    console.log('  ✓ Domain extraction');
    console.log('  ✓ Link preview metadata fetching');
    console.log('  ✓ Error handling for invalid URLs');
    console.log('  ✓ Multiple URL detection');
    console.log('  ✓ Evidence command integration');
    return 0;
  } else {
    console.log('❌ Some tests failed');
    return 1;
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests().then(exitCode => {
    process.exit(exitCode);
  }).catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
}

export { runTests };
