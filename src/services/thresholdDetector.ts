/**
 * Threshold Detection Service
 * Analyzes evidence and suggests parameter adjustments
 */

import type { Threshold, ThresholdSuggestion, ThresholdType } from '../types/threshold';

/**
 * Analyze research result and check if any thresholds are triggered
 */
export function detectThresholds(
  driver: any,
  researchResult: any,
  thresholds: Threshold[],
): ThresholdSuggestion[] {
  const suggestions: ThresholdSuggestion[] = [];
  
  for (const threshold of thresholds) {
    if (threshold.status !== 'active') continue;
    if (threshold.driverId !== driver.id) continue;
    
    const triggered = evaluateTrigger(threshold, driver, researchResult);
    if (triggered) {
      const suggestion = createSuggestion(threshold, driver, researchResult);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }
  }
  
  return suggestions;
}

/**
 * Evaluate if a threshold trigger condition is met
 */
function evaluateTrigger(
  threshold: Threshold,
  driver: any,
  researchResult: any,
): boolean {
  const { trigger } = threshold;
  
  switch (trigger.type) {
    case 'research_value':
      return evaluateResearchValue(trigger, researchResult);
      
    case 'evidence_count':
      return evaluateEvidenceCount(trigger, driver);
      
    case 'contradiction_detected':
      return detectContradiction(driver, researchResult);
      
    case 'event_confirmed':
      return detectEventConfirmed(researchResult);
      
    default:
      return false;
  }
}

function evaluateResearchValue(trigger: any, researchResult: any): boolean {
  if (!trigger.field || !trigger.operator || trigger.value === undefined) {
    return false;
  }
  
  const value = researchResult[trigger.field];
  if (value === undefined) return false;
  
  switch (trigger.operator) {
    case '>':
      return value > trigger.value;
    case '<':
      return value < trigger.value;
    case '=':
      return value === trigger.value;
    case 'contains':
      return String(value).toLowerCase().includes(String(trigger.value).toLowerCase());
    default:
      return false;
  }
}

function evaluateEvidenceCount(trigger: any, driver: any): boolean {
  const evidenceCount = driver.evidence?.length || 0;
  if (!trigger.operator || trigger.value === undefined) return false;
  
  switch (trigger.operator) {
    case '>':
      return evidenceCount > trigger.value;
    case '<':
      return evidenceCount < trigger.value;
    case '=':
      return evidenceCount === trigger.value;
    default:
      return false;
  }
}

function detectContradiction(driver: any, researchResult: any): boolean {
  // Simple heuristic: Check if new evidence contradicts existing trend
  if (!driver.evidence || driver.evidence.length < 2) return false;
  
  const summary = researchResult.summary?.toLowerCase() || '';
  const hasNegative = summary.includes('however') || 
                      summary.includes('but') || 
                      summary.includes('contradicts') ||
                      summary.includes('despite');
                      
  return hasNegative;
}

function detectEventConfirmed(researchResult: any): boolean {
  const summary = researchResult.summary?.toLowerCase() || '';
  return summary.includes('confirmed') || 
         summary.includes('approved') || 
         summary.includes('passed') ||
         summary.includes('launched');
}

/**
 * Create parameter adjustment suggestion based on threshold
 */
function createSuggestion(
  threshold: Threshold,
  driver: any,
  researchResult: any,
): ThresholdSuggestion | null {
  const current = {
    type: driver.type,
    p5: driver.p5,
    p50: driver.p50,
    p95: driver.p95,
    probability: driver.probability,
  };
  
  let suggested: any = {};
  
  switch (threshold.adjustment.type) {
    case 'nudge_p50':
      suggested = calculateNudge(driver, researchResult);
      break;
      
    case 'widen_range':
      suggested = calculateWidenRange(driver);
      break;
      
    case 'narrow_range':
      suggested = calculateNarrowRange(driver);
      break;
      
    case 'flip_probability':
      suggested = calculateFlipProbability(driver);
      break;
      
    default:
      return null;
  }
  
  return {
    thresholdId: threshold.id,
    driverId: driver.id,
    driverName: driver.name,
    type: threshold.type,
    reasoning: threshold.adjustment.reasoning,
    current,
    suggested,
    evidence: {
      type: 'research',
      summary: researchResult.summary || 'Research result',
      source: researchResult.source || 'Unknown',
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Calculate nudge adjustment (5-10% shift in p50)
 */
function calculateNudge(driver: any, researchResult: any): any {
  if (driver.type === 'binary') {
    // For binary, nudge probability by 10-20%
    const current = driver.probability || 50;
    const positive = detectPositiveSentiment(researchResult);
    const delta = positive ? 15 : -15;
    return {
      probability: Math.max(0, Math.min(100, current + delta)),
    };
  } else {
    // For continuous, nudge p50 by 10%
    const current = driver.p50 || 50;
    const positive = detectPositiveSentiment(researchResult);
    const delta = current * (positive ? 0.1 : -0.1);
    return {
      p50: Math.round(current + delta),
    };
  }
}

/**
 * Calculate range widening (increase uncertainty)
 */
function calculateWidenRange(driver: any): any {
  const range = driver.p95 - driver.p5;
  const widen = range * 0.2; // Widen by 20%
  
  return {
    p5: Math.max(0, Math.round(driver.p5 - widen / 2)),
    p50: driver.p50, // Keep median same
    p95: Math.round(driver.p95 + widen / 2),
  };
}

/**
 * Calculate range narrowing (decrease uncertainty)
 */
function calculateNarrowRange(driver: any): any {
  const range = driver.p95 - driver.p5;
  const narrow = range * 0.15; // Narrow by 15%
  
  return {
    p5: Math.round(driver.p5 + narrow / 2),
    p50: driver.p50, // Keep median same
    p95: Math.max(driver.p50 + 1, Math.round(driver.p95 - narrow / 2)),
  };
}

/**
 * Calculate probability flip (for binary events that happened)
 */
function calculateFlipProbability(driver: any): any {
  return {
    probability: 95, // Near certain if event confirmed
  };
}

/**
 * Detect positive vs negative sentiment in research
 */
function detectPositiveSentiment(researchResult: any): boolean {
  const summary = researchResult.summary?.toLowerCase() || '';
  const positive = ['increase', 'growth', 'improved', 'better', 'higher', 'exceeds'];
  const negative = ['decrease', 'decline', 'worse', 'lower', 'below'];
  
  const posCount = positive.filter(word => summary.includes(word)).length;
  const negCount = negative.filter(word => summary.includes(word)).length;
  
  return posCount > negCount;
}

/**
 * Auto-generate default thresholds for a driver
 */
export function generateDefaultThresholds(driver: any): Threshold[] {
  const thresholds: Threshold[] = [];
  const baseId = `threshold-${driver.id}`;
  
  if (driver.type === 'continuous') {
    // Incremental positive
    thresholds.push({
      id: `${baseId}-inc-pos`,
      driverId: driver.id,
      type: 'incremental',
      description: 'Evidence suggests higher values',
      trigger: {
        type: 'research_value',
        operator: '>',
        field: 'metric_value',
        value: driver.p50,
      },
      adjustment: {
        type: 'nudge_p50',
        reasoning: 'Research indicates values trending higher than forecast',
      },
      status: 'active',
    });
    
    // Contradiction detected
    thresholds.push({
      id: `${baseId}-contradiction`,
      driverId: driver.id,
      type: 'uncertainty',
      description: 'Contradictory evidence detected',
      trigger: {
        type: 'contradiction_detected',
      },
      adjustment: {
        type: 'widen_range',
        reasoning: 'Conflicting information suggests we should be less certain',
      },
      status: 'active',
    });
  } else if (driver.type === 'binary') {
    // Event confirmed
    thresholds.push({
      id: `${baseId}-confirmed`,
      driverId: driver.id,
      type: 'binary_flip',
      description: 'Event occurrence confirmed',
      trigger: {
        type: 'event_confirmed',
      },
      adjustment: {
        type: 'flip_probability',
        reasoning: 'Event confirmed by reliable source',
      },
      status: 'active',
    });
  }
  
  return thresholds;
}
