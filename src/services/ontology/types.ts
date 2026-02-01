/**
 * UFFP Ontology Types
 *
 * Simplified ontology system adapted from worldview plugin for forecasting domain.
 * Key differences from original:
 * - No ElizaOS dependencies
 * - No vector stores or LLM enrichment (Phase 1 - keep it simple)
 * - Forecasting-specific entities and relationships
 * - Lighter weight for mobile/React Native use
 */

export interface Entity {
  id: string;
  type: EntityType;
  attributes: Record<string, any>;
  firstSeen: Date;
  lastSeen: Date;
  observationCount: number;
}

export enum EntityType {
  // Core forecasting entities
  FORECAST = "FORECAST",
  DRIVER = "DRIVER",
  EVIDENCE = "EVIDENCE",
  SIMULATION = "SIMULATION",
  OUTCOME = "OUTCOME",

  // User interaction entities
  USER = "USER",
  AGENT = "AGENT",
  QUERY = "QUERY",
  COMMAND = "COMMAND",

  // Data entities
  DISTRIBUTION = "DISTRIBUTION",
  PARAMETER = "PARAMETER",
  METRIC = "METRIC",
  RESEARCH = "RESEARCH",
}

export enum RelationType {
  // Composition relationships
  HAS = "has",
  CONTAINS = "contains",
  PART_OF = "part_of",

  // Dependency relationships
  DEPENDS_ON = "depends_on",
  INFLUENCES = "influences",
  AFFECTS = "affects",

  // Attribution relationships
  CREATED_BY = "created_by",
  MODIFIED_BY = "modified_by",
  CONFIGURED_BY = "configured_by",

  // Analysis relationships
  ANALYZES = "analyzes",
  PRODUCES = "produces",
  SUPPORTS = "supports",
  CONTRADICTS = "contradicts",

  // User action relationships
  QUERIES_ABOUT = "queries_about",
  CONFIGURES = "configures",
  VIEWS = "views",
  INVOKES = "invokes",
}

export enum Cardinality {
  OneToOne = "||--||",      // Equivalence (e.g., Driver has one Distribution)
  OneToMany = "||--o{",     // Composition (e.g., Forecast has many Drivers)
  ManyToOne = "}o--||",     // Attribution (e.g., Many Drivers belong to one Forecast)
  ManyToMany = "}o--o{",    // Association (e.g., Drivers influence each other)
}

export interface Relationship {
  id: string;
  type: RelationType;
  source: string;           // entity id
  target: string;           // entity id
  cardinality: Cardinality;
  confidence: number;       // 0-1 confidence score
  observations: number;     // how many times observed
  metadata: Record<string, any>;
}

export interface OntologyState {
  entities: Map<string, Entity>;
  relationships: Map<string, Relationship>;
  version: number;
  lastModified: Date;
}

export interface PatternObservation {
  source: string;
  target: string;
  context: string;
  timestamp: Date;
}

export interface Suggestion {
  type: "new_entity" | "new_relationship" | "modify_cardinality";
  confidence: number;
  reasoning: string;
  data: {
    source?: string;
    target?: string;
    relationship?: RelationType;
    cardinality?: Cardinality;
    entity?: Partial<Entity>;
  };
}

/**
 * Context information for @fermi agent
 */
export interface OntologyContext {
  currentView: "forecast_list" | "workspace" | "simulation" | "evidence";
  activeEntities: Entity[];
  relevantRelationships: Relationship[];
  recentActions: string[];
  suggestedActions: string[];
}

/**
 * Cardinality semantics define how relationships behave
 */
export const CARDINALITY_SEMANTICS: Record<Cardinality, {
  implies: string;
  queryDirection: "bidirectional" | "hierarchical" | "graph_traversal";
  inferenceType: string;
}> = {
  [Cardinality.OneToOne]: {
    implies: "equivalence",
    queryDirection: "bidirectional",
    inferenceType: "identity",
  },
  [Cardinality.OneToMany]: {
    implies: "composition",
    queryDirection: "hierarchical",
    inferenceType: "ownership",
  },
  [Cardinality.ManyToOne]: {
    implies: "attribution",
    queryDirection: "hierarchical",
    inferenceType: "categorization",
  },
  [Cardinality.ManyToMany]: {
    implies: "association",
    queryDirection: "graph_traversal",
    inferenceType: "co-occurrence",
  },
};
