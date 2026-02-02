/**
 * Schema Validator
 *
 * Validates forecast data against schema rules to ensure consistency.
 * Based on findings from docs/SCHEMA_ANALYSIS.md
 */

import type {
  Forecast,
  Driver,
  Agent,
  ResearchSnapshot,
  Evidence,
} from "../../lib/types";

export interface ValidationError {
  entity: string;
  entityId: string;
  field: string;
  rule: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate a complete forecast with all its nested data
 */
export function validateForecast(forecast: Forecast): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate forecast-level fields
  validateForecastFields(forecast, errors, warnings);

  // Validate all drivers
  if (forecast.drivers) {
    forecast.drivers.forEach((driver) => {
      validateDriver(driver, forecast, errors, warnings);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate forecast-level fields
 */
function validateForecastFields(
  forecast: Forecast,
  errors: ValidationError[],
  warnings: ValidationError[],
): void {
  // Rule: Forecast must have required fields
  if (!forecast.id) {
    errors.push({
      entity: "Forecast",
      entityId: "unknown",
      field: "id",
      rule: "REQUIRED_FIELD",
      message: "Forecast must have an id",
      severity: "error",
    });
  }

  if (!forecast.question) {
    errors.push({
      entity: "Forecast",
      entityId: forecast.id || "unknown",
      field: "question",
      rule: "REQUIRED_FIELD",
      message: "Forecast must have a question",
      severity: "error",
    });
  }

  // Rule: Probability must be in 0-1 range if set
  if (forecast.probability !== undefined && forecast.probability !== null) {
    if (forecast.probability < 0 || forecast.probability > 1) {
      errors.push({
        entity: "Forecast",
        entityId: forecast.id,
        field: "probability",
        rule: "PROBABILITY_RANGE",
        message: `Forecast probability must be 0-1, got ${forecast.probability}`,
        severity: "error",
      });
    }
  }

  // Rule: ID format validation
  if (forecast.id && !isValidId(forecast.id)) {
    warnings.push({
      entity: "Forecast",
      entityId: forecast.id,
      field: "id",
      rule: "ID_FORMAT",
      message: `Forecast ID should use nanoid format with prefix (fct_), got ${forecast.id}`,
      severity: "warning",
    });
  }
}

/**
 * Validate a driver and its nested data
 */
function validateDriver(
  driver: Driver,
  forecast: Forecast,
  errors: ValidationError[],
  warnings: ValidationError[],
): void {
  // Rule: Driver must have required fields
  if (!driver.id) {
    errors.push({
      entity: "Driver",
      entityId: "unknown",
      field: "id",
      rule: "REQUIRED_FIELD",
      message: "Driver must have an id",
      severity: "error",
    });
    return; // Can't continue validation without ID
  }

  if (!driver.name) {
    errors.push({
      entity: "Driver",
      entityId: driver.id,
      field: "name",
      rule: "REQUIRED_FIELD",
      message: "Driver must have a name",
      severity: "error",
    });
  }

  if (!driver.type) {
    errors.push({
      entity: "Driver",
      entityId: driver.id,
      field: "type",
      rule: "REQUIRED_FIELD",
      message: "Driver must have a type",
      severity: "error",
    });
  }

  // Rule: Type must be valid
  if (driver.type && !["binary", "continuous"].includes(driver.type)) {
    errors.push({
      entity: "Driver",
      entityId: driver.id,
      field: "type",
      rule: "VALID_TYPE",
      message: `Driver type must be 'binary' or 'continuous', got ${driver.type}`,
      severity: "error",
    });
  }

  if (!driver.direction) {
    errors.push({
      entity: "Driver",
      entityId: driver.id,
      field: "direction",
      rule: "REQUIRED_FIELD",
      message: "Driver must have a direction",
      severity: "error",
    });
  }

  // Rule: Direction must be valid
  if (
    driver.direction &&
    !["increases", "decreases"].includes(driver.direction)
  ) {
    errors.push({
      entity: "Driver",
      entityId: driver.id,
      field: "direction",
      rule: "VALID_DIRECTION",
      message: `Driver direction must be 'increases' or 'decreases', got ${driver.direction}`,
      severity: "error",
    });
  }

  // Rule: Binary drivers require probability
  if (driver.type === "binary") {
    if (driver.probability === undefined || driver.probability === null) {
      errors.push({
        entity: "Driver",
        entityId: driver.id,
        field: "probability",
        rule: "BINARY_REQUIRES_PROBABILITY",
        message: "Binary drivers must have a probability value",
        severity: "error",
      });
    } else if (driver.probability < 0 || driver.probability > 1) {
      errors.push({
        entity: "Driver",
        entityId: driver.id,
        field: "probability",
        rule: "PROBABILITY_RANGE",
        message: `Binary driver probability must be 0-1, got ${driver.probability}`,
        severity: "error",
      });
    }
  }

  // Rule: Continuous drivers require distribution parameters
  if (driver.type === "continuous") {
    if (!driver.distribution) {
      errors.push({
        entity: "Driver",
        entityId: driver.id,
        field: "distribution",
        rule: "CONTINUOUS_REQUIRES_DISTRIBUTION",
        message: "Continuous drivers must have a distribution",
        severity: "error",
      });
    }

    if (driver.distribution === "triangular") {
      if (
        driver.p5 === undefined ||
        driver.p50 === undefined ||
        driver.p95 === undefined
      ) {
        errors.push({
          entity: "Driver",
          entityId: driver.id,
          field: "distribution",
          rule: "TRIANGULAR_REQUIRES_PERCENTILES",
          message: "Triangular distribution requires p5, p50, and p95",
          severity: "error",
        });
      }
    }
  }

  // Rule: ID format validation
  if (!isValidId(driver.id)) {
    warnings.push({
      entity: "Driver",
      entityId: driver.id,
      field: "id",
      rule: "ID_FORMAT",
      message: `Driver ID should use nanoid format with prefix (drv_), got ${driver.id}`,
      severity: "warning",
    });
  }

  // Rule: Version field validation
  if (!driver.version) {
    errors.push({
      entity: "Driver",
      entityId: driver.id,
      field: "version",
      rule: "REQUIRED_FIELD",
      message: "Driver must have a version field",
      severity: "error",
    });
  } else {
    if (
      typeof driver.version.major !== "number" ||
      typeof driver.version.minor !== "number"
    ) {
      errors.push({
        entity: "Driver",
        entityId: driver.id,
        field: "version",
        rule: "INVALID_VERSION_FORMAT",
        message: "Driver version must have numeric major and minor fields",
        severity: "error",
      });
    }
    if (driver.version.major < 1 || driver.version.minor < 0) {
      errors.push({
        entity: "Driver",
        entityId: driver.id,
        field: "version",
        rule: "INVALID_VERSION_NUMBER",
        message: "Driver version major must be >= 1, minor must be >= 0",
        severity: "error",
      });
    }
  }

  // Rule: versionHistory must be an array
  if (!Array.isArray(driver.versionHistory)) {
    errors.push({
      entity: "Driver",
      entityId: driver.id,
      field: "versionHistory",
      rule: "INVALID_TYPE",
      message: "Driver versionHistory must be an array",
      severity: "error",
    });
  }

  // Rule: aiRecommendation validation (if present)
  if (driver.aiRecommendation) {
    if (!driver.aiRecommendation.type || !driver.aiRecommendation.direction) {
      warnings.push({
        entity: "Driver",
        entityId: driver.id,
        field: "aiRecommendation",
        rule: "INCOMPLETE_AI_RECOMMENDATION",
        message: "AI recommendation should have type and direction",
        severity: "warning",
      });
    }
  }

  // Rule: resolutionDate validation (if present)
  if (driver.resolutionDate) {
    if (
      !(driver.resolutionDate instanceof Date) &&
      typeof driver.resolutionDate !== "string"
    ) {
      warnings.push({
        entity: "Driver",
        entityId: driver.id,
        field: "resolutionDate",
        rule: "INVALID_DATE_FORMAT",
        message: "Driver resolutionDate should be a Date object or ISO string",
        severity: "warning",
      });
    }
  }

  // Validate agents
  if (driver.agents) {
    driver.agents.forEach((agent) => {
      validateAgent(agent, driver, errors, warnings);
    });
  }

  // Validate research results
  if (driver.researchResults) {
    driver.researchResults.forEach((research) => {
      validateResearchSnapshot(research, driver, errors, warnings);
    });
  }

  // Validate evidence
  if (driver.evidence) {
    driver.evidence.forEach((evidence) => {
      validateEvidence(evidence, driver, errors, warnings);
    });
  }

  // Rule: Check for orphaned research (researchResults with invalid agentId)
  if (driver.researchResults && driver.agents) {
    const agentIds = new Set(driver.agents.map((a) => a.id));
    driver.researchResults.forEach((research) => {
      if (research.agentId && !agentIds.has(research.agentId)) {
        warnings.push({
          entity: "ResearchSnapshot",
          entityId: research.id || "unknown",
          field: "agentId",
          rule: "ORPHANED_RESEARCH",
          message: `Research result references non-existent agent: ${research.agentId}`,
          severity: "warning",
        });
      }
    });
  }
}

/**
 * Validate an agent
 */
function validateAgent(
  agent: Agent,
  driver: Driver,
  errors: ValidationError[],
  warnings: ValidationError[],
): void {
  if (!agent.id) {
    errors.push({
      entity: "Agent",
      entityId: "unknown",
      field: "id",
      rule: "REQUIRED_FIELD",
      message: `Agent in driver ${driver.id} must have an id`,
      severity: "error",
    });
    return;
  }

  if (!agent.name) {
    errors.push({
      entity: "Agent",
      entityId: agent.id,
      field: "name",
      rule: "REQUIRED_FIELD",
      message: "Agent must have a name",
      severity: "error",
    });
  }

  if (!agent.query) {
    errors.push({
      entity: "Agent",
      entityId: agent.id,
      field: "query",
      rule: "REQUIRED_FIELD",
      message: "Agent must have a query",
      severity: "error",
    });
  }

  if (!agent.schedule) {
    errors.push({
      entity: "Agent",
      entityId: agent.id,
      field: "schedule",
      rule: "REQUIRED_FIELD",
      message: "Agent must have a schedule",
      severity: "error",
    });
  }

  // Rule: Schedule must be valid
  if (
    agent.schedule &&
    !["daily", "weekly", "on-demand"].includes(agent.schedule)
  ) {
    errors.push({
      entity: "Agent",
      entityId: agent.id,
      field: "schedule",
      rule: "VALID_SCHEDULE",
      message: `Agent schedule must be 'daily', 'weekly', or 'on-demand', got ${agent.schedule}`,
      severity: "error",
    });
  }

  // Rule: ID format validation
  if (!isValidId(agent.id)) {
    warnings.push({
      entity: "Agent",
      entityId: agent.id,
      field: "id",
      rule: "ID_FORMAT",
      message: `Agent ID should use nanoid format with prefix (agt_), got ${agent.id}`,
      severity: "warning",
    });
  }
}

/**
 * Validate a research snapshot
 */
function validateResearchSnapshot(
  research: ResearchSnapshot,
  driver: Driver,
  errors: ValidationError[],
  warnings: ValidationError[],
): void {
  if (!research.id) {
    errors.push({
      entity: "ResearchSnapshot",
      entityId: "unknown",
      field: "id",
      rule: "REQUIRED_FIELD",
      message: `Research snapshot in driver ${driver.id} must have an id`,
      severity: "error",
    });
    return;
  }

  if (!research.agentId) {
    warnings.push({
      entity: "ResearchSnapshot",
      entityId: research.id,
      field: "agentId",
      rule: "REQUIRED_FIELD",
      message: "Research snapshot should reference an agent",
      severity: "warning",
    });
  }

  // Rule: ID format validation
  if (!isValidId(research.id)) {
    warnings.push({
      entity: "ResearchSnapshot",
      entityId: research.id,
      field: "id",
      rule: "ID_FORMAT",
      message: `Research ID should use nanoid format with prefix (res_), got ${research.id}`,
      severity: "warning",
    });
  }

  // Rule: attachedToDriverId should match parent driver
  if (
    research.attachedToDriverId &&
    research.attachedToDriverId !== driver.id
  ) {
    errors.push({
      entity: "ResearchSnapshot",
      entityId: research.id,
      field: "attachedToDriverId",
      rule: "DRIVER_REFERENCE_MISMATCH",
      message: `Research snapshot attachedToDriverId (${research.attachedToDriverId}) doesn't match parent driver (${driver.id})`,
      severity: "error",
    });
  }
}

/**
 * Validate evidence
 */
function validateEvidence(
  evidence: Evidence,
  driver: Driver,
  errors: ValidationError[],
  warnings: ValidationError[],
): void {
  if (!evidence.id) {
    errors.push({
      entity: "Evidence",
      entityId: "unknown",
      field: "id",
      rule: "REQUIRED_FIELD",
      message: `Evidence in driver ${driver.id} must have an id`,
      severity: "error",
    });
    return;
  }

  if (!evidence.content) {
    errors.push({
      entity: "Evidence",
      entityId: evidence.id,
      field: "content",
      rule: "REQUIRED_FIELD",
      message: "Evidence must have content",
      severity: "error",
    });
  }

  if (!evidence.type) {
    errors.push({
      entity: "Evidence",
      entityId: evidence.id,
      field: "type",
      rule: "REQUIRED_FIELD",
      message: "Evidence must have a type",
      severity: "error",
    });
  }

  // Validate type is one of the allowed values
  if (
    evidence.type &&
    !["url", "quote", "data", "reasoning"].includes(evidence.type)
  ) {
    errors.push({
      entity: "Evidence",
      entityId: evidence.id,
      field: "type",
      rule: "VALID_TYPE",
      message: `Evidence type must be 'url', 'quote', 'data', or 'reasoning', got ${evidence.type}`,
      severity: "error",
    });
  }

  if (!evidence.attachedTo) {
    errors.push({
      entity: "Evidence",
      entityId: evidence.id,
      field: "attachedTo",
      rule: "REQUIRED_FIELD",
      message: "Evidence must specify what it is attached to",
      severity: "error",
    });
  }

  if (!evidence.attachedToId) {
    errors.push({
      entity: "Evidence",
      entityId: evidence.id,
      field: "attachedToId",
      rule: "REQUIRED_FIELD",
      message: "Evidence must have an attachedToId",
      severity: "error",
    });
  }

  // Rule: ID format validation
  if (!isValidId(evidence.id)) {
    warnings.push({
      entity: "Evidence",
      entityId: evidence.id,
      field: "id",
      rule: "ID_FORMAT",
      message: `Evidence ID should use nanoid format with prefix (evd_), got ${evidence.id}`,
      severity: "warning",
    });
  }

  // Rule: URL format validation if type is 'url'
  if (
    evidence.type === "url" &&
    evidence.content &&
    !isValidUrl(evidence.content)
  ) {
    warnings.push({
      entity: "Evidence",
      entityId: evidence.id,
      field: "content",
      rule: "URL_FORMAT",
      message: `Evidence with type 'url' has invalid URL: ${evidence.content}`,
      severity: "warning",
    });
  }
}

/**
 * Check if an ID follows the new nanoid format with prefix
 * Accepts both old format (for backwards compatibility) and new format
 */
function isValidId(id: string): boolean {
  // New format: prefix_nanoid (e.g., drv_V1StGXR8_Z5j)
  const newFormat = /^[a-z]{3}_[A-Za-z0-9_-]+$/;

  // If it matches new format, it's valid
  if (newFormat.test(id)) {
    return true;
  }

  // Old formats are warnings, not errors (for backwards compatibility)
  return false;
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format validation results for display
 */
export function formatValidationResults(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push("✅ Schema validation passed!");
  } else {
    lines.push("❌ Schema validation failed");
  }

  if (result.errors.length > 0) {
    lines.push("");
    lines.push(`Errors (${result.errors.length}):`);
    result.errors.forEach((err) => {
      lines.push(
        `  - [${err.entity}:${err.entityId}] ${err.field}: ${err.message}`,
      );
    });
  }

  if (result.warnings.length > 0) {
    lines.push("");
    lines.push(`Warnings (${result.warnings.length}):`);
    result.warnings.forEach((warn) => {
      lines.push(
        `  - [${warn.entity}:${warn.entityId}] ${warn.field}: ${warn.message}`,
      );
    });
  }

  return lines.join("\n");
}
