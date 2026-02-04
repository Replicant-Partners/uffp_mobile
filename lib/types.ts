// Core forecast types
export interface Forecast {
  id: string;
  userId?: string;

  // Question
  question: string;
  domain?: string;
  timeframe?: string;
  resolutionCriteria: string;

  // Superforecaster methodology
  baseRate?: BaseRate;
  externalView?: ExternalView;
  drivers: Driver[];
  evidence: Evidence[];

  // Outcomes
  probability?: number;
  simulations: Simulation[];

  // Evolution
  currentVersion: number;
  versions: ForecastVersion[];

  // Resolution
  status: "draft" | "active" | "resolved";
  resolvedAt?: Date;
  resolution?: "yes" | "no" | "ambiguous";
  brierScore?: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseRate {
  referenceClass: string;
  successRate: number;
  sampleSize?: number;
  reasoning?: string;
  evidence: Evidence[];
  capturedAt: Date;
}
export interface ExternalView {
  referenceClass: string;
  baseRate?: number;
  reasoning?: string;
  source?: string;
  generatedBy?: "fermi" | "user";
  confidence?: "high" | "medium" | "low";
  updatedAt?: Date | string;
}


export interface Agent {
  id: string;
  name: string; // e.g., 'research_analyst', 'sentiment_monitor'
  query: string; // What to research
  schedule: "daily" | "weekly" | "on-demand";
  threshold?: number; // Alert threshold (0-100)
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  name: string;
  description?: string;
  type: "binary" | "continuous";
  direction: "increases" | "decreases"; // Impact on forecast probability

  // Binary (0-1 range, e.g., 0.5 = 50%)
  probability?: number;

  // Continuous
  p5?: number;
  p50?: number;
  p95?: number;
  distribution?: "normal" | "triangular" | "lognormal";

  // Research configuration & results
  agents: Agent[]; // Configured research tasks (mutable)
  researchResults: ResearchSnapshot[]; // Point-in-time outputs (immutable)

  // Evidence & research
  evidence: Evidence[];

  // AI-generated configuration
  aiRecommendation?: {
    type: "binary" | "continuous";
    direction: "increases" | "decreases";
    distribution?: "normal" | "triangular" | "lognormal";
    reasoning: string;
    examples?: {
      probability?: number;
      p5?: number;
      p50?: number;
      p95?: number;
    };
  };

  // Versioning
  version: { major: number; minor: number };
  versionHistory: DriverVersion[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  resolutionDate?: Date; // Set when driver is expired/resolved
}

export interface Evidence {
  id: string;
  type: "url" | "quote" | "data" | "reasoning";
  content: string;
  source?: string;
  confidence?: "high" | "medium" | "low";

  // Attachment
  attachedTo: "forecast" | "baseRate" | "driver";
  attachedToId: string;

  timestamp: Date;

  // Link preview metadata (for URL evidence)
  linkPreview?: {
    url: string;
    title: string;
    description: string;
    image?: string;
    favicon?: string;
    fetchedAt: string;
    error?: string;
  };
}

export interface ResearchSnapshot {
  id: string;
  agentId: string;
  promptId: string;
  variables: Record<string, string>;

  // Results
  summary: string;
  keyFindings: string[];
  sources: string[];
  confidence: "high" | "medium" | "low";
  fullResponse: string;

  // Cost
  cost: number;
  tokensUsed?: number;

  // Metadata
  executedAt: Date;
  attachedToDriverId?: string;
}

export interface Simulation {
  id: string;
  forecastId: string;

  // Configuration
  iterations: number;
  driverSnapshot: Driver[];

  // Results
  probability: number;
  distribution?: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };

  // Cost
  cost: number;
  runtime: number; // milliseconds

  // Metadata
  executedAt: Date;
}

export interface ForecastVersion {
  version: number;
  probability?: number;

  // Snapshots at this time
  baseRate?: BaseRate;
  drivers: Driver[];
  evidence: Evidence[];
  research: ResearchSnapshot[];

  // Change info
  changeReason?: string;
  changedBy?: "user" | "coach" | "research";

  createdAt: Date;
}

export interface DriverVersion {
  version: number;

  // Values at this time
  probability?: number;
  p5?: number;
  p50?: number;
  p95?: number;

  // Context
  evidence: Evidence[];
  research: ResearchSnapshot[];

  changeReason?: string;
  createdAt: Date;
}

// Coach interactions
export interface CoachConversation {
  id: string;
  forecastId: string;
  context: "initial" | "base_rate" | "drivers" | "evidence" | "review";
  messages: CoachMessage[];
  suggestions: CoachSuggestion[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CoachMessage {
  id: string;
  role: "user" | "coach";
  content: string;
  timestamp: Date;
}

export interface CoachSuggestion {
  id: string;
  type: "driver" | "research" | "evidence" | "baseRate";
  title: string;
  description: string;
  data: any; // Type-specific data
  confidence: number; // 0-1
  applied: boolean;
  appliedAt?: Date;
}

// Auto-extraction results
export interface ExtractionResult {
  question: string;
  domain?: string;
  timeframe?: string;
  suggestedDrivers?: string[];
  suggestedResearch?: string[];
  confidence: number;
}
