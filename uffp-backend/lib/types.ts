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

export interface Driver {
  id: string;
  name: string;
  description?: string;
  type: "binary" | "continuous";

  // Binary
  probability?: number;

  // Continuous
  p5?: number;
  p50?: number;
  p95?: number;
  distribution?: "normal" | "triangular" | "lognormal";

  // Evidence & research
  evidence: Evidence[];
  researchResults: ResearchSnapshot[];

  // Evolution
  currentVersion: number;
  versions: DriverVersion[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
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
    histogram?: number[]; // Probability density per bin
    bins?: number; // Number of bins in histogram
  };

  // Cost
  cost: number;
  runtime: number; // milliseconds

  // Metadata
  executedAt: Date;
  reasonForRun?: string; // e.g., "Initial simulation", "After adding driver X", "After research update"
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
