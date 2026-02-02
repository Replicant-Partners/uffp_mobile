import { nanoid } from 'nanoid';

/**
 * Generate a unique ID for database entities.
 * Uses nanoid for better randomness and URL-safety compared to timestamps.
 *
 * @param size - Length of the ID (default: 12 characters for good uniqueness/performance)
 * @returns A unique ID string
 */
export function generateId(size: number = 12): string {
  return nanoid(size);
}

/**
 * Generate a unique ID with a prefix for better debugging and readability.
 *
 * @param prefix - Prefix to add (e.g., 'drv_', 'agt_', 'res_')
 * @param size - Length of the random part (default: 12)
 * @returns A prefixed unique ID string
 */
export function generatePrefixedId(prefix: string, size: number = 12): string {
  return `${prefix}${nanoid(size)}`;
}

/**
 * Generate IDs for specific entity types with semantic prefixes
 */
export const idGenerators = {
  driver: () => generatePrefixedId('drv_'),
  forecast: () => generatePrefixedId('fct_'),
  agent: () => generatePrefixedId('agt_'),
  researchSnapshot: () => generatePrefixedId('res_'),
  evidence: () => generatePrefixedId('evd_'),
  simulation: () => generatePrefixedId('sim_'),
  version: () => generatePrefixedId('ver_'),
};
