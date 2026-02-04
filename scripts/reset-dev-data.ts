/**
 * Reset Development Data
 * 
 * Wipes all forecasts and creates a known good test dataset
 * USE ONLY IN DEVELOPMENT - DO NOT RUN IN PRODUCTION
 */

import fetch from 'node-fetch';

const BACKEND_URL = process.env.BACKEND_URL || 'https://uffp-backend.vercel.app';
const USER_ID = process.env.USER_ID || '2e644008-f5c7-47c5-854c-3801df9879cc';

// Known good test forecasts
const TEST_FORECASTS = [
  {
    id: 'fct_test_001',
    question: 'Will Tesla stock reach $300 by end of 2026?',
    probability: 0.65,
    description: 'Test forecast with complete data',
    grounding: 'internal' as const,
    drivers: [
      {
        id: 'drv_test_001',
        name: 'EV Market Growth',
        type: 'continuous' as const,
        direction: 'increases' as const,
        distribution: 'triangular' as const,
        p5: 20,
        p50: 50,
        p95: 100,
        agents: [
          {
            id: 'agt_test_001',
            name: 'market_researcher',
            displayName: 'Market Researcher',
            schedule: 'on-demand' as const,
            query: 'What is the EV market growth forecast?',
            lastRun: new Date().toISOString(),
          }
        ],
        researchResults: [],
        evidence: [
          {
            id: 'evd_test_001',
            type: 'url' as const,
            content: 'IEA projects 30% annual EV market growth',
            source: 'International Energy Agency',
            confidence: 'high' as const,
            attachedTo: 'driver' as const,
            attachedToId: 'drv_test_001',
            timestamp: new Date(),
          }
        ],
        version: { major: 1, minor: 0 },
        versionHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ],
    externalView: {
      referenceClass: 'Tech stock growth in bull markets',
      baseRate: 0.45,
      source: 'Historical analysis of tech stocks 2010-2023',
      generatedBy: 'user' as const,
      confidence: 'medium' as const,
      reasoning: 'Tech stocks typically see 40-50% growth in bull markets',
      updatedAt: new Date().toISOString(),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: USER_ID,
  },
  {
    id: 'fct_test_002',
    question: 'Will remote work become the norm by 2027?',
    probability: 0.75,
    description: 'Test forecast - binary driver',
    grounding: 'external' as const,
    drivers: [
      {
        id: 'drv_test_002',
        name: 'Corporate Policy Shifts',
        type: 'binary' as const,
        direction: 'increases' as const,
        probability: 0.8,
        agents: [],
        researchResults: [],
        evidence: [
          {
            id: 'evd_test_002',
            type: 'data' as const,
            content: '65% of companies now offer hybrid work options',
            source: 'Gartner 2025 Survey',
            confidence: 'high' as const,
            attachedTo: 'driver' as const,
            attachedToId: 'drv_test_002',
            timestamp: new Date(),
          }
        ],
        version: { major: 1, minor: 0 },
        versionHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ],
    externalView: {
      referenceClass: 'Major workplace transformations',
      baseRate: 0.55,
      source: 'Historical workplace transitions',
      generatedBy: 'fermi' as const,
      confidence: 'medium' as const,
      reasoning: 'Major workplace shifts historically take 5-10 years to become standard',
      updatedAt: new Date().toISOString(),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: USER_ID,
  },
  {
    id: 'fct_test_003',
    question: 'Will AI exceed human performance in creative writing by 2028?',
    probability: 0.35,
    description: 'Test forecast - multiple drivers',
    grounding: 'internal' as const,
    drivers: [
      {
        id: 'drv_test_003a',
        name: 'AI Model Capabilities',
        type: 'continuous' as const,
        direction: 'increases' as const,
        distribution: 'lognormal' as const,
        p5: 10,
        p50: 40,
        p95: 150,
        agents: [],
        researchResults: [],
        evidence: [],
        version: { major: 1, minor: 0 },
        versionHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'drv_test_003b',
        name: 'Human Creative Standards',
        type: 'continuous' as const,
        direction: 'decreases' as const,
        distribution: 'triangular' as const,
        p5: 5,
        p50: 15,
        p95: 30,
        agents: [],
        researchResults: [],
        evidence: [],
        version: { major: 1, minor: 0 },
        versionHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: USER_ID,
  }
];

async function deleteAllForecasts() {
  console.log('\n🗑️  Deleting all forecasts...\n');
  
  try {
    // Load all forecasts
    const response = await fetch(`${BACKEND_URL}/api/forecasts?userId=${USER_ID}`);
    if (!response.ok) {
      throw new Error(`Failed to load forecasts: ${response.status}`);
    }
    
    const data = await response.json();
    const forecasts = data.forecasts || [];
    
    console.log(`Found ${forecasts.length} forecasts to delete`);
    
    // Delete each forecast
    for (const forecast of forecasts) {
      console.log(`  Deleting: ${forecast.question} (${forecast.id})`);
      
      const deleteResponse = await fetch(
        `${BACKEND_URL}/api/forecasts?action=delete&forecastId=${forecast.id}&userId=${USER_ID}`,
        { method: 'DELETE' }
      );
      
      if (!deleteResponse.ok) {
        console.warn(`  ⚠️  Failed to delete ${forecast.id}: ${deleteResponse.status}`);
      } else {
        console.log(`  ✓ Deleted`);
      }
    }
    
    console.log(`\n✅ Deleted ${forecasts.length} forecasts\n`);
  } catch (error: any) {
    console.error('❌ Error deleting forecasts:', error.message);
    throw error;
  }
}

async function createTestForecasts() {
  console.log('📝 Creating known good test dataset...\n');
  
  for (const forecast of TEST_FORECASTS) {
    console.log(`  Creating: ${forecast.question}`);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/forecasts?action=create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forecast, userId: USER_ID }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create forecast: ${response.status} - ${error}`);
      }
      
      const result = await response.json();
      console.log(`  ✓ Created: ${result.forecast.id}`);
    } catch (error: any) {
      console.error(`  ❌ Failed: ${error.message}`);
      throw error;
    }
  }
  
  console.log(`\n✅ Created ${TEST_FORECASTS.length} test forecasts\n`);
}

async function main() {
  console.log('🔄 Reset Development Data');
  console.log('='.repeat(60));
  console.log(`Backend: ${BACKEND_URL}`);
  console.log(`User ID: ${USER_ID}`);
  console.log('='.repeat(60));
  
  // Safety check
  if (!BACKEND_URL.includes('vercel.app') && !BACKEND_URL.includes('localhost')) {
    console.error('\n❌ ERROR: This script should only run against development backends!');
    console.error('Current backend:', BACKEND_URL);
    process.exit(1);
  }
  
  try {
    // Step 1: Delete all forecasts
    await deleteAllForecasts();
    
    // Step 2: Create test forecasts
    await createTestForecasts();
    
    console.log('='.repeat(60));
    console.log('✅ Development data reset complete!');
    console.log('='.repeat(60));
    console.log('\n📋 Test Dataset:');
    TEST_FORECASTS.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.question}`);
      console.log(`     - ${f.drivers.length} driver(s)`);
      console.log(`     - Base rate: ${f.externalView?.baseRate ? (f.externalView.baseRate * 100).toFixed(0) + '%' : 'none'}`);
    });
    console.log('\n✅ All test forecasts are schema-compliant and complete!');
    console.log('🚀 Reload the app to see the clean dataset.\n');
    
  } catch (error: any) {
    console.error('\n❌ Reset failed:', error.message);
    process.exit(1);
  }
}

main();
