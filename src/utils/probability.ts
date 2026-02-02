/**
 * Probability Utilities
 * 
 * Internal representation: 0-1 (e.g., 0.5 = 50%)
 * User input/display: 0-100 (e.g., 50 = 50%)
 */

/**
 * Convert user input (0-100) to internal format (0-1)
 */
export function percentToProb(percent: number): number {
  if (percent < 0 || percent > 100) {
    throw new Error(`Invalid percentage: ${percent}. Must be 0-100`);
  }
  return percent / 100;
}

/**
 * Convert internal format (0-1) to display format (0-100)
 */
export function probToPercent(prob: number): number {
  if (prob < 0 || prob > 1) {
    throw new Error(`Invalid probability: ${prob}. Must be 0-1`);
  }
  return Math.round(prob * 100);
}

/**
 * Format probability for display as percentage string
 */
export function formatProbability(prob: number | undefined): string {
  if (prob === undefined || prob === null) {
    return 'not set';
  }
  return `${probToPercent(prob)}%`;
}

/**
 * Validate probability is in 0-1 range
 */
export function isValidProbability(prob: number): boolean {
  return typeof prob === 'number' && prob >= 0 && prob <= 1 && !isNaN(prob);
}
