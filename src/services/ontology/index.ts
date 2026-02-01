/**
 * UFFP Ontology Service
 *
 * Main interface for the ontology system.
 * Provides context-aware understanding for @fermi agent.
 */

import { OntologyGraph } from "./graph";
import { PatternObserver } from "./observer";
import { SEED_ENTITIES, SEED_RELATIONSHIPS, CONCEPT_EXPLANATIONS } from "./seed";
import {
  Entity,
  EntityType,
  RelationType,
  OntologyContext,
  Suggestion,
} from "./types";

export class OntologyService {
  private graph: OntologyGraph;
  private observer: PatternObserver;
  private initialized: boolean = false;

  constructor() {
    this.graph = new OntologyGraph();
    this.observer = new PatternObserver(this.graph);
  }

  /**
   * Initialize with seed ontology
   */
  initialize(): void {
    if (this.initialized) return;

    console.log("[Ontology] Loading seed entities and relationships...");

    // Load seed entities
    for (const entity of SEED_ENTITIES) {
      this.graph.addEntity(entity);
    }

    // Load seed relationships
    for (const relationship of SEED_RELATIONSHIPS) {
      this.graph.addRelationship(relationship);
    }

    this.initialized = true;

    const stats = this.graph.getStats();
    console.log("[Ontology] Initialized with:", stats);
  }

  /**
   * Observe a user action for pattern learning
   */
  observe(action: {
    type: "view" | "create" | "modify" | "query" | "invoke";
    entity?: string;
    entityType?: EntityType;
    target?: string;
    targetType?: EntityType;
    context: string;
  }): void {
    this.observer.observe(action);
  }

  /**
   * Get context-aware information for @fermi
   */
  getContext(params: {
    currentView: "forecast_list" | "workspace" | "simulation" | "evidence";
    activeForecastId?: string;
    activeDriverId?: string;
    recentActions?: string[];
  }): OntologyContext {
    const context: OntologyContext = {
      currentView: params.currentView,
      activeEntities: [],
      relevantRelationships: [],
      recentActions: params.recentActions || [],
      suggestedActions: [],
    };

    // Build context based on current view
    switch (params.currentView) {
      case "forecast_list":
        context.activeEntities = this.graph.getEntitiesByType(EntityType.FORECAST);
        context.suggestedActions = [
          "Create a new forecast",
          "Review existing forecasts",
          "Check forecast metrics",
        ];
        break;

      case "workspace":
        if (params.activeForecastId) {
          const forecast = this.graph.getEntity(params.activeForecastId);
          if (forecast) {
            context.activeEntities.push(forecast);

            // Get related drivers
            const drivers = this.graph.getRelatedEntities(
              params.activeForecastId,
              RelationType.HAS
            );
            context.activeEntities.push(...drivers);

            context.relevantRelationships = this.graph.getRelationships(
              params.activeForecastId
            );
          }
        }

        context.suggestedActions = [
          "Add a new driver",
          "Configure existing drivers",
          "Run research on drivers",
          "Execute simulation",
        ];
        break;

      case "simulation":
        context.activeEntities = this.graph.getEntitiesByType(EntityType.SIMULATION);
        context.suggestedActions = [
          "Interpret simulation results",
          "Adjust driver parameters",
          "Export simulation data",
        ];
        break;

      case "evidence":
        context.activeEntities = this.graph.getEntitiesByType(EntityType.EVIDENCE);
        context.suggestedActions = [
          "Review research findings",
          "Apply evidence to drivers",
          "Run additional research",
        ];
        break;
    }

    return context;
  }

  /**
   * Get explanation for a concept
   */
  explainConcept(concept: string): string | undefined {
    const normalized = concept.toLowerCase().trim();
    return CONCEPT_EXPLANATIONS[normalized];
  }

  /**
   * Get all concept explanations matching a query
   */
  searchConcepts(query: string): Array<{ concept: string; explanation: string }> {
    const normalized = query.toLowerCase();
    const results: Array<{ concept: string; explanation: string }> = [];

    for (const [concept, explanation] of Object.entries(CONCEPT_EXPLANATIONS)) {
      if (
        concept.includes(normalized) ||
        explanation.toLowerCase().includes(normalized)
      ) {
        results.push({ concept, explanation });
      }
    }

    return results;
  }

  /**
   * Get suggestions based on observed patterns
   */
  getSuggestions(): Suggestion[] {
    return this.observer.analyze();
  }

  /**
   * Apply a suggestion to the graph
   */
  applySuggestion(suggestion: Suggestion): void {
    if (suggestion.type === "new_entity" && suggestion.data.entity) {
      this.graph.addEntity(suggestion.data.entity as Entity);
    } else if (
      suggestion.type === "new_relationship" &&
      suggestion.data.source &&
      suggestion.data.target &&
      suggestion.data.relationship
    ) {
      this.graph.addRelationship({
        id: `${suggestion.data.source}_${suggestion.data.relationship}_${suggestion.data.target}`,
        type: suggestion.data.relationship,
        source: suggestion.data.source,
        target: suggestion.data.target,
        cardinality: suggestion.data.cardinality!,
        confidence: suggestion.confidence,
        observations: 1,
        metadata: { auto_applied: true },
      });
    }
  }

  /**
   * Get related concepts for a given entity type
   */
  getRelatedConcepts(entityType: EntityType): Array<{
    entity: Entity;
    relationship: string;
    description: string;
  }> {
    const results: Array<{
      entity: Entity;
      relationship: string;
      description: string;
    }> = [];

    const entities = this.graph.getEntitiesByType(entityType);

    for (const entity of entities) {
      const relationships = this.graph.getRelationships(entity.id);

      for (const rel of relationships) {
        const related =
          rel.source === entity.id
            ? this.graph.getEntity(rel.target)
            : this.graph.getEntity(rel.source);

        if (related) {
          results.push({
            entity: related,
            relationship: rel.type,
            description: rel.metadata.description || "",
          });
        }
      }
    }

    return results;
  }

  /**
   * Get command suggestions based on context
   */
  getCommandSuggestions(context: OntologyContext): string[] {
    const suggestions: string[] = [];

    if (context.currentView === "workspace") {
      // Check if user is working with drivers
      const hasDrivers = context.activeEntities.some(
        (e) => e.type === EntityType.DRIVER
      );

      if (hasDrivers) {
        suggestions.push(
          "/p [p5] [p50] [p95] - Set driver parameters",
          "/dist [triangular|normal|lognormal] - Set distribution type",
          "/direction [increases|decreases] - Set driver direction",
          "/save - Save driver configuration"
        );
      }

      // Check if user is querying
      const hasQueries = context.recentActions.some((a) =>
        a.includes("query")
      );

      if (hasQueries) {
        suggestions.push(
          "@fermi Ask me anything about forecasting!",
          "Invoke research agents with agent names",
          "/history - View version history"
        );
      }
    }

    return suggestions;
  }

  /**
   * Debug: Get graph statistics
   */
  getStats() {
    return this.graph.getStats();
  }

  /**
   * Debug: Export graph as JSON
   */
  exportGraph(): string {
    return this.graph.toJSON();
  }
}

// Singleton instance
let ontologyInstance: OntologyService | null = null;

export function getOntologyService(): OntologyService {
  if (!ontologyInstance) {
    ontologyInstance = new OntologyService();
    ontologyInstance.initialize();
  }
  return ontologyInstance;
}

// Re-export types for convenience
export * from "./types";
export { CONCEPT_EXPLANATIONS } from "./seed";
