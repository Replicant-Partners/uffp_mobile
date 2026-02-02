/**
 * CLI Driver Creation Test
 *
 * Verifies that drivers created through CLI workflows pass schema validation
 */

import { validateForecast, formatValidationResults } from '../src/utils/schemaValidator.js';
import type { Forecast, Driver } from '../lib/types.js';
import { idGenerators } from '../src/utils/idGenerator.js';

// Simulate AI recommendation response
const mockAIRecommendation = {
  type: 'binary' as const,
  direction: 'increases' as const,
  reasoning: 'Strong research momentum increases AGI probability',
  examples: {
    probability: 0.65,
  },
};

// Simulate CLI driver creation (matches ForecastWorkspaceScreen.tsx line 427)
function createDriverViaCLI(driverName: string, recommendation: typeof mockAIRecommendation): Driver {
  const newDriver: any = {
    id: idGenerators.driver(),
    name: driverName,
    type: recommendation.type,
    direction: recommendation.direction,
    agents: [] as any[],
    researchResults: [] as any[],
    evidence: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    aiRecommendation: recommendation,
    version: { major: 1, minor: 0 },
    versionHistory: [],
  };

  if (recommendation.type === 'binary') {
    newDriver.probability = recommendation.examples?.probability || 0.5;
  } else {
    newDriver.distribution = recommendation.distribution || 'triangular';
    newDriver.p5 = recommendation.examples?.p5 || 30;
    newDriver.p50 = recommendation.examples?.p50 || 50;
    newDriver.p95 = recommendation.examples?.p95 || 70;
  }

  return newDriver as Driver;
}

function runTest() {
  console.log('🧪 Testing CLI Driver Creation Against Schema\n');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  // Test 1: Binary driver created via CLI
  console.log('\n✓ Test 1: Binary driver via CLI');
  const binaryDriver = createDriverViaCLI('AI Research Funding', mockAIRecommendation);

  const testForecast: Forecast = {
    id: idGenerators.forecast(),
    userId: 'test_user',
    question: 'Will AGI be achieved by 2030?',
    evidence: [],
    simulations: [],
    currentVersion: 1,
    versions: [],
    status: 'draft',
    drivers: [binaryDriver],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result1 = validateForecast(testForecast);
  console.log(formatValidationResults(result1));

  if (result1.valid) {
    console.log('✅ PASSED: CLI-created binary driver passes validation');
    passed++;
  } else {
    console.log('❌ FAILED: CLI-created binary driver has errors');
    console.log('Missing/Invalid fields:');
    result1.errors.forEach(e => {
      console.log(`  - ${e.field}: ${e.message}`);
    });
    failed++;
  }

  // Test 2: Continuous driver created via CLI
  console.log('\n✓ Test 2: Continuous driver via CLI');
  const continuousRecommendation = {
    type: 'continuous' as const,
    direction: 'decreases' as const,
    distribution: 'triangular' as const,
    reasoning: 'Regulatory delays decrease probability',
    examples: {
      p5: 10,
      p50: 50,
      p95: 90,
    },
  };

  const continuousDriver = createDriverViaCLI('Government Regulation', continuousRecommendation);

  const testForecast2: Forecast = {
    ...testForecast,
    drivers: [continuousDriver],
  };

  const result2 = validateForecast(testForecast2);
  console.log(formatValidationResults(result2));

  if (result2.valid) {
    console.log('✅ PASSED: CLI-created continuous driver passes validation');
    passed++;
  } else {
    console.log('❌ FAILED: CLI-created continuous driver has errors');
    console.log('Missing/Invalid fields:');
    result2.errors.forEach(e => {
      console.log(`  - ${e.field}: ${e.message}`);
    });
    failed++;
  }

  // Test 3: Verify all required fields are present
  console.log('\n✓ Test 3: Check all required fields');
  const requiredFields = [
    'id', 'name', 'type', 'direction', 'agents', 'researchResults',
    'evidence', 'version', 'versionHistory', 'createdAt', 'updatedAt'
  ];

  const missingFields = requiredFields.filter(field => !(field in binaryDriver));

  if (missingFields.length === 0) {
    console.log('✅ PASSED: All required fields present');
    console.log('Fields present:', requiredFields.join(', '));
    passed++;
  } else {
    console.log('❌ FAILED: Missing required fields');
    console.log('Missing:', missingFields.join(', '));
    failed++;
  }

  // Test 4: Verify field types
  console.log('\n✓ Test 4: Check field types');
  const typeChecks = [
    { field: 'id', type: 'string', value: typeof binaryDriver.id },
    { field: 'version.major', type: 'number', value: typeof binaryDriver.version.major },
    { field: 'version.minor', type: 'number', value: typeof binaryDriver.version.minor },
    { field: 'agents', type: 'array', value: Array.isArray(binaryDriver.agents) ? 'array' : typeof binaryDriver.agents },
    { field: 'versionHistory', type: 'array', value: Array.isArray(binaryDriver.versionHistory) ? 'array' : typeof binaryDriver.versionHistory },
  ];

  const typeErrors = typeChecks.filter(check => check.value !== check.type);

  if (typeErrors.length === 0) {
    console.log('✅ PASSED: All field types correct');
    passed++;
  } else {
    console.log('❌ FAILED: Type mismatches found');
    typeErrors.forEach(err => {
      console.log(`  - ${err.field}: expected ${err.type}, got ${err.value}`);
    });
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ CLI driver creation fully reconciled with schema!');
    return 0;
  } else {
    console.log('❌ CLI driver creation needs fixes');
    return 1;
  }
}

// Run tests
if (require.main === module) {
  const exitCode = runTest();
  process.exit(exitCode);
}

export { runTest };
