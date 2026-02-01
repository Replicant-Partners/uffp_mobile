/**
 * UFFP Pattern Observer
 *
 * Detects patterns in user interactions and generates suggestions
 * for new entities and relationships.
 *
 * Simplified from worldview plugin - focuses on UFFP-specific patterns.
 */

import { OntologyGraph } from "./graph";
import {
  Entity,
  EntityType,
  RelationType,
  Cardinality,
  Suggestion,
  PatternObservation,
} from "./types";

interface EntityPair {
  source: string;
  target: string;
  count: number;
  contexts: string[];
}

export class PatternObserver {
  private graph: OntologyGraph;
  private observations: PatternObservation[] = [];
  private minObservations = 2; // Lower threshold for forecasting context
  private maxObservations = 100; // Keep observation history manageable

  constructor(graph: OntologyGraph) {
    this.graph = graph;
  }

  /**
   * Observe a user action and learn from it
   */
  observe(action: {
    type: "view" | "create" | "modify" | "query" | "invoke";
    entity?: string;
    entityType?: EntityType;
    target?: string;
    targetType?: EntityType;
    context: string;
  }): void {
    const observation: PatternObservation = {
      source: action.entity || "USER",
      target: action.target || action.context,
      context: `${action.type}: ${action.context}`,
      timestamp: new Date(),
    };

    this.observations.push(observation);

    // Keep observation history bounded
    if (this.observations.length > this.maxObservations) {
      this.observations.shift();
    }
  }

  /**
   * Analyze recent observations and generate suggestions
   */
  analyze(): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Detect co-occurrence patterns
    const entityPairs = this.extractEntityPairs();

    for (const pair of entityPairs) {
      if (pair.count >= this.minObservations) {
        const existing = this.graph.hasRelationship(pair.source, pair.target);

        if (!existing) {
          const cardinality = this.inferCardinality(pair);
          const confidence = this.calculateConfidence(
            pair.count,
            this.observations.length
          );

          suggestions.push({
            type: "new_relationship",
            confidence,
            reasoning: `Observed ${pair.count} times in: ${pair.contexts.join(", ")}`,
            data: {
              source: pair.source,
              target: pair.target,
              relationship: this.inferRelationType(pair),
              cardinality,
            },
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extract entity co-occurrence pairs from observations
   */
  private extractEntityPairs(): EntityPair[] {
    const pairMap = new Map<string, EntityPair>();

    for (const obs of this.observations) {
      const key = `${obs.source}:${obs.target}`;

      if (!pairMap.has(key)) {
        pairMap.set(key, {
          source: obs.source,
          target: obs.target,
          count: 0,
          contexts: [],
        });
      }

      const pair = pairMap.get(key)!;
      pair.count++;
      if (!pair.contexts.includes(obs.context)) {
        pair.contexts.push(obs.context);
      }
    }

    return Array.from(pairMap.values());
  }

  /**
   * Infer relationship type based on context patterns
   */
  private inferRelationType(pair: EntityPair): RelationType {
    const contexts = pair.contexts.join(" ").toLowerCase();

    // Pattern matching for common relationship types
    if (contexts.includes("configure") || contexts.includes("modify")) {
      return RelationType.CONFIGURES;
    }
    if (contexts.includes("create")) {
      return RelationType.CREATED_BY;
    }
    if (contexts.includes("view") || contexts.includes("query")) {
      return RelationType.VIEWS;
    }
    if (contexts.includes("research") || contexts.includes("evidence")) {
      return RelationType.SUPPORTS;
    }
    if (contexts.includes("simulation") || contexts.includes("run")) {
      return RelationType.PRODUCES;
    }
    if (contexts.includes("driver") && contexts.includes("forecast")) {
      return RelationType.PART_OF;
    }

    // Default to generic relationship
    return RelationType.AFFECTS;
  }

  /**
   * Infer cardinality from observation patterns
   */
  private inferCardinality(pair: EntityPair): Cardinality {
    const contexts = pair.contexts.join(" ").toLowerCase();

    // Forecast has many drivers (one-to-many)
    if (contexts.includes("forecast") && contexts.includes("driver")) {
      return Cardinality.OneToMany;
    }

    // Driver has one distribution (one-to-one)
    if (contexts.includes("driver") && contexts.includes("distribution")) {
      return Cardinality.OneToOne;
    }

    // Evidence supports driver (many-to-one)
    if (contexts.includes("evidence") && contexts.includes("driver")) {
      return Cardinality.ManyToOne;
    }

    // Default to many-to-many for general associations
    return Cardinality.ManyToMany;
  }

  /**
   * Calculate confidence score for a suggestion
   */
  private calculateConfidence(observations: number, total: number): number {
    // Confidence increases with observations but has diminishing returns
    const frequencyScore = Math.min(1.0, observations / 5);
    const proportionScore = Math.min(1.0, (observations / total) * 2);

    // Weighted average favoring frequency
    return frequencyScore * 0.7 + proportionScore * 0.3;
  }

  /**
   * Get recent observation history
   */
  getRecentObservations(count: number = 10): PatternObservation[] {
    return this.observations.slice(-count);
  }

  /**
   * Clear observation history
   */
  clearObservations(): void {
    this.observations = [];
  }
}
