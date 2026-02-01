/**
 * UFFP Seed Ontology
 *
 * Initial domain knowledge for the forecasting platform.
 * This gives @fermi a head start in understanding UFFP concepts.
 */

import {
  Entity,
  Relationship,
  EntityType,
  RelationType,
  Cardinality,
} from "./types";

/**
 * Seed entities representing core UFFP concepts
 */
export const SEED_ENTITIES: Entity[] = [
  // Core forecasting entities
  {
    id: "FORECAST",
    type: EntityType.FORECAST,
    attributes: {
      description: "A prediction about a future event with drivers and outcome",
    },
    firstSeen: new Date(),
    lastSeen: new Date(),
    observationCount: 1,
  },
  {
    id: "DRIVER",
    type: EntityType.DRIVER,
    attributes: {
      description: "A factor that influences the forecast outcome",
    },
    firstSeen: new Date(),
    lastSeen: new Date(),
    observationCount: 1,
  },
  {
    id: "EVIDENCE",
    type: EntityType.EVIDENCE,
    attributes: {
      description: "Research or data supporting driver configuration",
    },
    firstSeen: new Date(),
    lastSeen: new Date(),
    observationCount: 1,
  },
  {
    id: "SIMULATION",
    type: EntityType.SIMULATION,
    attributes: {
      description: "Monte Carlo simulation run combining drivers",
    },
    firstSeen: new Date(),
    lastSeen: new Date(),
    observationCount: 1,
  },
  {
    id: "OUTCOME",
    type: EntityType.OUTCOME,
    attributes: {
      description: "The result being forecasted",
    },
    firstSeen: new Date(),
    lastSeen: new Date(),
    observationCount: 1,
  },

  // Configuration entities
  {
    id: "DISTRIBUTION",
    type: EntityType.DISTRIBUTION,
    attributes: {
      description: "Probability distribution (triangular, normal, lognormal)",
    },
    firstSeen: new Date(),
    lastSeen: new Date(),
    observationCount: 1,
  },
  {
    id: "PARAMETER",
    type: EntityType.PARAMETER,
    attributes: {
      description: "Quantile values (p5, p50, p95) defining a distribution",
    },
    firstSeen: new Date(),
    lastSeen: new Date(),
    observationCount: 1,
  },
  {
    id: "METRIC",
    type: EntityType.METRIC,
    attributes: {
      description: "Measurement of forecast quality (Brier score, calibration)",
    },
    firstSeen: new Date(),
    lastSeen: new Date(),
    observationCount: 1,
  },

  // User interaction entities
  {
    id: "USER",
    type: EntityType.USER,
    attributes: {
      description: "The forecaster using the platform",
    },
    firstSeen: new Date(),
    lastSeen: new Date(),
    observationCount: 1,
  },
  {
    id: "AGENT",
    type: EntityType.AGENT,
    attributes: {
      description: "AI agent assisting with research and analysis",
    },
    firstSeen: new Date(),
    lastSeen: new Date(),
    observationCount: 1,
  },
  {
    id: "QUERY",
    type: EntityType.QUERY,
    attributes: {
      description: "User question or request for information",
    },
    firstSeen: new Date(),
    lastSeen: new Date(),
    observationCount: 1,
  },
  {
    id: "COMMAND",
    type: EntityType.COMMAND,
    attributes: {
      description: "Action command like /p, /dist, /save",
    },
    firstSeen: new Date(),
    lastSeen: new Date(),
    observationCount: 1,
  },
  {
    id: "RESEARCH",
    type: EntityType.RESEARCH,
    attributes: {
      description: "Analysis performed by research agents",
    },
    firstSeen: new Date(),
    lastSeen: new Date(),
    observationCount: 1,
  },
];

/**
 * Seed relationships defining how entities relate
 */
export const SEED_RELATIONSHIPS: Relationship[] = [
  // Forecast composition
  {
    id: "FORECAST_has_DRIVER",
    type: RelationType.HAS,
    source: "FORECAST",
    target: "DRIVER",
    cardinality: Cardinality.OneToMany,
    confidence: 1.0,
    observations: 1,
    metadata: {
      description: "A forecast contains multiple drivers",
    },
  },
  {
    id: "FORECAST_has_OUTCOME",
    type: RelationType.HAS,
    source: "FORECAST",
    target: "OUTCOME",
    cardinality: Cardinality.OneToOne,
    confidence: 1.0,
    observations: 1,
    metadata: {
      description: "A forecast predicts one outcome",
    },
  },
  {
    id: "FORECAST_produces_SIMULATION",
    type: RelationType.PRODUCES,
    source: "FORECAST",
    target: "SIMULATION",
    cardinality: Cardinality.OneToMany,
    confidence: 1.0,
    observations: 1,
    metadata: {
      description: "A forecast generates simulations",
    },
  },

  // Driver configuration
  {
    id: "DRIVER_has_DISTRIBUTION",
    type: RelationType.HAS,
    source: "DRIVER",
    target: "DISTRIBUTION",
    cardinality: Cardinality.OneToOne,
    confidence: 1.0,
    observations: 1,
    metadata: {
      description: "Each driver has one probability distribution",
    },
  },
  {
    id: "DRIVER_has_PARAMETER",
    type: RelationType.HAS,
    source: "DRIVER",
    target: "PARAMETER",
    cardinality: Cardinality.OneToMany,
    confidence: 1.0,
    observations: 1,
    metadata: {
      description: "A driver has p5, p50, p95 parameters",
    },
  },
  {
    id: "EVIDENCE_supports_DRIVER",
    type: RelationType.SUPPORTS,
    source: "EVIDENCE",
    target: "DRIVER",
    cardinality: Cardinality.ManyToOne,
    confidence: 1.0,
    observations: 1,
    metadata: {
      description: "Evidence supports driver configuration",
    },
  },

  // Driver interactions
  {
    id: "DRIVER_influences_DRIVER",
    type: RelationType.INFLUENCES,
    source: "DRIVER",
    target: "DRIVER",
    cardinality: Cardinality.ManyToMany,
    confidence: 1.0,
    observations: 1,
    metadata: {
      description: "Drivers can influence each other",
    },
  },
  {
    id: "DRIVER_affects_OUTCOME",
    type: RelationType.AFFECTS,
    source: "DRIVER",
    target: "OUTCOME",
    cardinality: Cardinality.ManyToOne,
    confidence: 1.0,
    observations: 1,
    metadata: {
      description: "Drivers affect the forecast outcome",
    },
  },

  // Simulation and evaluation
  {
    id: "SIMULATION_produces_METRIC",
    type: RelationType.PRODUCES,
    source: "SIMULATION",
    target: "METRIC",
    cardinality: Cardinality.OneToMany,
    confidence: 1.0,
    observations: 1,
    metadata: {
      description: "Simulations generate quality metrics",
    },
  },

  // User actions
  {
    id: "USER_created_FORECAST",
    type: RelationType.CREATED_BY,
    source: "FORECAST",
    target: "USER",
    cardinality: Cardinality.ManyToOne,
    confidence: 1.0,
    observations: 1,
    metadata: {
      description: "Users create forecasts",
    },
  },
  {
    id: "USER_configures_DRIVER",
    type: RelationType.CONFIGURES,
    source: "USER",
    target: "DRIVER",
    cardinality: Cardinality.ManyToMany,
    confidence: 1.0,
    observations: 1,
    metadata: {
      description: "Users configure drivers",
    },
  },
  {
    id: "USER_invokes_AGENT",
    type: RelationType.INVOKES,
    source: "USER",
    target: "AGENT",
    cardinality: Cardinality.ManyToMany,
    confidence: 1.0,
    observations: 1,
    metadata: {
      description: "Users invoke agents for help",
    },
  },
  {
    id: "USER_queries_about_CONCEPT",
    type: RelationType.QUERIES_ABOUT,
    source: "QUERY",
    target: "DRIVER",
    cardinality: Cardinality.ManyToMany,
    confidence: 1.0,
    observations: 1,
    metadata: {
      description: "Users ask questions about concepts",
    },
  },

  // Agent actions
  {
    id: "AGENT_produces_RESEARCH",
    type: RelationType.PRODUCES,
    source: "AGENT",
    target: "RESEARCH",
    cardinality: Cardinality.OneToMany,
    confidence: 1.0,
    observations: 1,
    metadata: {
      description: "Agents generate research",
    },
  },
  {
    id: "RESEARCH_produces_EVIDENCE",
    type: RelationType.PRODUCES,
    source: "RESEARCH",
    target: "EVIDENCE",
    cardinality: Cardinality.OneToMany,
    confidence: 1.0,
    observations: 1,
    metadata: {
      description: "Research produces evidence",
    },
  },
  {
    id: "AGENT_analyzes_DRIVER",
    type: RelationType.ANALYZES,
    source: "AGENT",
    target: "DRIVER",
    cardinality: Cardinality.ManyToMany,
    confidence: 1.0,
    observations: 1,
    metadata: {
      description: "Agents analyze drivers",
    },
  },
];

/**
 * Knowledge base for @fermi coach - explanations of key concepts
 */
export const CONCEPT_EXPLANATIONS: Record<string, string> = {
  // Distribution types
  triangular: `Triangular distribution: Best for most forecasting scenarios. You provide min (p5), most likely (p50), and max (p95). Values between these points are sampled with higher probability near p50. Use when you have clear bounds and a best guess.`,

  normal: `Normal (Gaussian) distribution: Bell curve centered on mean (p50). Symmetrical - equally likely to be above or below the mean. Rare in forecasting because real-world outcomes often have skew. Use only when truly symmetric uncertainty.`,

  lognormal: `Lognormal distribution: Can't be negative, has long right tail. Good for things that grow multiplicatively (stock prices, project timelines, population). Use when values can't go below zero and there's potential for large upside.`,

  // Parameters
  p5: `p5 (5th percentile): You're 95% confident the true value is ABOVE this. Only 5% chance it's lower. This is your pessimistic bound, not worst-case scenario.`,

  p50: `p50 (50th percentile / median): Your best guess. 50% chance above, 50% chance below. In triangular distribution, this is the "most likely" value where the peak is.`,

  p95: `p95 (95th percentile): You're 95% confident the true value is BELOW this. Only 5% chance it's higher. This is your optimistic bound, not best-case scenario.`,

  // Direction
  increases: `Direction "increases": Higher values of this driver make the outcome MORE likely. Example: "Higher marketing spend increases sales" - as marketing $ goes up, sales probability goes up.`,

  decreases: `Direction "decreases": Higher values of this driver make the outcome LESS likely. Example: "Higher interest rates decrease home sales" - as rates go up, sales probability goes down.`,

  // Evidence
  evidence: `Evidence supports your driver configuration. Research agents find data, studies, expert opinions. Strong evidence = higher confidence in your estimates. Conflicting evidence = you may need wider bounds.`,

  // Simulation
  simulation: `Monte Carlo simulation: Randomly samples each driver's distribution thousands of times, combines them per your formula, generates outcome distribution. Shows you the full range of possibilities, not just a single number.`,

  // Metrics
  brier_score: `Brier score: Measures forecast accuracy after outcomes resolve. Score of 0 = perfect, 0.25 = coin flip, 0.5 = completely wrong. Lower is better. Only available after you record actual outcomes.`,

  // Commands
  "/p": `Command /p: Set parameters. Usage: "/p 10 50 90" sets p5=10, p50=50, p95=90. Quick way to configure your driver's distribution values.`,

  "/dist": `Command /dist: Set distribution type. Usage: "/dist triangular" or "/dist normal" or "/dist lognormal". Changes how uncertainty is modeled.`,

  "/direction": `Command /direction: Set how driver affects outcome. Usage: "/direction increases" or "/direction decreases". Tells simulation whether higher values help or hurt.`,

  "/save": `Command /save: Save your driver configuration. Commits your changes to the forecast. Always save after making changes or they'll be lost.`,
};
