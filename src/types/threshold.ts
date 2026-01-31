/**
 * Threshold/Tripwire System
 * Detects evidence patterns and suggests parameter adjustments
 */

export type ThresholdType = "incremental" | "uncertainty" | "binary_flip";

export interface Threshold {
  id: string;
  driverId: string;
  type: ThresholdType;
  description: string;
  
  // Trigger conditions
  trigger: {
    type: "research_value" | "evidence_count" | "contradiction_detected" | "event_confirmed";
    operator?: ">" | "<" | "=" | "contains";
    value?: number | string;
    field?: string; // Which field in research result to check
  };
  
  // Suggested adjustment when triggered
  adjustment: {
    type: "nudge_p50" | "widen_range" | "narrow_range" | "flip_probability";
    parameters?: {
      p5?: { from: number; to: number };
      p50?: { from: number; to: number };
      p95?: { from: number; to: number };
      probability?: { from: number; to: number };
    };
    reasoning: string;
  };
  
  // Status
  status: "active" | "triggered" | "applied" | "dismissed";
  triggeredAt?: string;
  triggeredBy?: string; // Evidence ID or research result ID
  appliedAt?: string;
}

export interface ThresholdSuggestion {
  thresholdId: string;
  driverId: string;
  driverName: string;
  type: ThresholdType;
  reasoning: string;
  
  // Current values
  current: {
    type: "continuous" | "binary";
    p5?: number;
    p50?: number;
    p95?: number;
    probability?: number;
  };
  
  // Suggested new values
  suggested: {
    p5?: number;
    p50?: number;
    p95?: number;
    probability?: number;
  };
  
  // Evidence that triggered this
  evidence: {
    type: "research" | "manual" | "external";
    summary: string;
    source: string;
    timestamp: string;
  };
}

// Examples of common thresholds
export const THRESHOLD_TEMPLATES = {
  incremental_positive: {
    type: "incremental" as ThresholdType,
    description: "Sales/metrics trending above forecast",
    trigger: {
      type: "research_value" as const,
      operator: ">" as const,
      field: "metric_value",
    },
    adjustment: {
      type: "nudge_p50" as const,
      reasoning: "Incremental positive data suggests higher median outcome",
    },
  },
  
  incremental_negative: {
    type: "incremental" as ThresholdType,
    description: "Sales/metrics trending below forecast",
    trigger: {
      type: "research_value" as const,
      operator: "<" as const,
      field: "metric_value",
    },
    adjustment: {
      type: "nudge_p50" as const,
      reasoning: "Incremental negative data suggests lower median outcome",
    },
  },
  
  contradiction_detected: {
    type: "uncertainty" as ThresholdType,
    description: "Contradictory evidence increases uncertainty",
    trigger: {
      type: "contradiction_detected" as const,
    },
    adjustment: {
      type: "widen_range" as const,
      reasoning: "Conflicting signals suggest we should widen our confidence interval",
    },
  },
  
  convergence_detected: {
    type: "uncertainty" as ThresholdType,
    description: "Multiple sources agree, reducing uncertainty",
    trigger: {
      type: "evidence_count" as const,
      operator: ">" as const,
      value: 3,
    },
    adjustment: {
      type: "narrow_range" as const,
      reasoning: "Multiple confirming sources allow us to narrow our range",
    },
  },
  
  event_confirmed: {
    type: "binary_flip" as ThresholdType,
    description: "Key event has occurred",
    trigger: {
      type: "event_confirmed" as const,
    },
    adjustment: {
      type: "flip_probability" as const,
      reasoning: "Event confirmed - adjust probability to near certainty",
    },
  },
};
