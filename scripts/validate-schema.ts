#!/usr/bin/env ts-node
/**
 * Schema Validation CLI Tool
 *
 * Usage:
 *   npm run validate-schema                    # Run test suite
 *   npm run validate-schema <forecast.json>    # Validate specific file
 *   npm run validate-schema --all              # Validate all saved forecasts
 */

import * as fs from 'fs';
import * as path from 'path';
import { validateForecast, formatValidationResults } from '../src/utils/schemaValidator';
import type { Forecast } from '../lib/types';

function validateFile(filePath: string): boolean {
  try {
    console.log(`\n📄 Validating: ${filePath}`);
    console.log('─'.repeat(60));

    const content = fs.readFileSync(filePath, 'utf-8');
    const forecast: Forecast = JSON.parse(content);

    const result = validateForecast(forecast);
    console.log(formatValidationResults(result));

    return result.valid;
  } catch (error) {
    console.error(`❌ Error reading/parsing file: ${error}`);
    return false;
  }
}

function findForecastFiles(): string[] {
  const files: string[] = [];

  // Check common locations for forecast data
  const searchPaths = [
    './data',
    './forecasts',
    './storage',
    './',
  ];

  for (const searchPath of searchPaths) {
    if (fs.existsSync(searchPath)) {
      const dirFiles = fs.readdirSync(searchPath);
      const jsonFiles = dirFiles
        .filter(f => f.endsWith('.json') && f.includes('forecast'))
        .map(f => path.join(searchPath, f));
      files.push(...jsonFiles);
    }
  }

  return files;
}

function main() {
  const args = process.argv.slice(2);

  console.log('🔍 Schema Validation Tool');
  console.log('='.repeat(60));

  if (args.length === 0) {
    // Run test suite
    console.log('\n📦 Running test suite...');
    const { runTests } = require('../tests/schemaValidator.test');
    const exitCode = runTests();
    process.exit(exitCode);
  } else if (args[0] === '--all') {
    // Validate all forecast files
    console.log('\n🔎 Searching for forecast files...');
    const files = findForecastFiles();

    if (files.length === 0) {
      console.log('No forecast files found.');
      process.exit(0);
    }

    console.log(`Found ${files.length} file(s)\n`);

    let allValid = true;
    for (const file of files) {
      const valid = validateFile(file);
      if (!valid) {
        allValid = false;
      }
    }

    console.log('\n' + '='.repeat(60));
    if (allValid) {
      console.log('✅ All files passed validation');
      process.exit(0);
    } else {
      console.log('❌ Some files failed validation');
      process.exit(1);
    }
  } else {
    // Validate specific file
    const filePath = args[0];

    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    const valid = validateFile(filePath);
    process.exit(valid ? 0 : 1);
  }
}

main();
