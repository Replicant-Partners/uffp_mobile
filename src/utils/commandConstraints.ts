/**
 * Command Constraints Validator
 *
 * Defines and validates context-specific constraints for commands.
 * Prevents commands from running in invalid states (e.g., /query outside agent config).
 */

export interface CommandConstraint {
  command: string;
  requiredState?: {
    agentBeingConfigured?: boolean;
    driverBeingConfigured?: boolean;
    activeForecast?: boolean;
  };
  forbiddenState?: {
    agentBeingConfigured?: boolean;
    driverBeingConfigured?: boolean;
  };
  description: string;
  errorMessage: string;
}

/**
 * All command constraints
 */
export const COMMAND_CONSTRAINTS: CommandConstraint[] = [
  {
    command: "/query",
    requiredState: {
      agentBeingConfigured: true,
    },
    description: "/query requires an agent to be in configuration (not saved yet)",
    errorMessage: "❌ /query is only for configuring new agents.\n\nTo run an existing agent: /run @agent_name",
  },
  {
    command: "/schedule",
    requiredState: {
      agentBeingConfigured: true,
    },
    description: "/schedule requires an agent to be in configuration (not saved yet)",
    errorMessage: "❌ /schedule is only for configuring new agents.\n\nTo modify an existing agent, remove and re-add it.",
  },
  {
    command: "/threshold",
    requiredState: {
      agentBeingConfigured: true,
    },
    description: "/threshold requires an agent to be in configuration",
    errorMessage: "❌ /threshold is only for configuring new agents.",
  },
  {
    command: "/save",
    requiredState: {
      driverBeingConfigured: true,
    },
    description: "/save requires a driver to be in configuration",
    errorMessage: "❌ No driver being configured. Start driver config first with /driver <name>",
  },
  {
    command: "/p",
    requiredState: {
      driverBeingConfigured: true,
    },
    description: "/p (p-values) requires a driver to be in configuration",
    errorMessage: "❌ No driver being configured. Start driver config first with /driver <name>",
  },
  {
    command: "/probability",
    requiredState: {
      driverBeingConfigured: true,
    },
    description: "/probability requires a driver to be in configuration",
    errorMessage: "❌ No driver being configured. Start driver config first with /driver <name>",
  },
  {
    command: "/type",
    requiredState: {
      driverBeingConfigured: true,
    },
    description: "/type requires a driver to be in configuration",
    errorMessage: "❌ No driver being configured. Start driver config first with /driver <name>",
  },
  {
    command: "/direction",
    requiredState: {
      driverBeingConfigured: true,
    },
    description: "/direction requires a driver to be in configuration",
    errorMessage: "❌ No driver being configured. Start driver config first with /driver <name>",
  },
  {
    command: "/dist",
    requiredState: {
      driverBeingConfigured: true,
    },
    description: "/dist requires a driver to be in configuration",
    errorMessage: "❌ No driver being configured. Start driver config first with /driver <name>",
  },
  {
    command: "/evidence",
    requiredState: {
      driverBeingConfigured: true,
    },
    description: "/evidence requires a driver to be in configuration",
    errorMessage: "❌ No driver being configured. Start driver config first with /driver <name>",
  },
  {
    command: "/simulate",
    requiredState: {
      activeForecast: true,
    },
    description: "/simulate requires an active forecast",
    errorMessage: "❌ No active forecast. Type /question first.",
  },
  {
    command: "/base-rate",
    requiredState: {
      activeForecast: true,
    },
    description: "/base-rate requires an active forecast",
    errorMessage: "❌ No active forecast. Type /question first.",
  },
];

/**
 * Application state for constraint validation
 */
export interface AppState {
  agentBeingConfigured: any | null;
  driverBeingConfigured: any | null;
  activeForecast: any | null;
}

/**
 * Validate if a command can run in the current state
 */
export function validateCommandConstraints(
  command: string,
  state: AppState
): { valid: boolean; error?: string; constraint?: CommandConstraint } {
  // Extract base command (e.g., "/query" from "/query something")
  const baseCommand = command.split(" ")[0];

  // Find constraint for this command
  const constraint = COMMAND_CONSTRAINTS.find(c => c.command === baseCommand);

  if (!constraint) {
    // No constraint defined - command is allowed
    return { valid: true };
  }

  // Check required state
  if (constraint.requiredState) {
    if (constraint.requiredState.agentBeingConfigured) {
      if (!state.agentBeingConfigured || !state.agentBeingConfigured.name) {
        return {
          valid: false,
          error: constraint.errorMessage,
          constraint,
        };
      }
    }

    if (constraint.requiredState.driverBeingConfigured) {
      if (!state.driverBeingConfigured) {
        return {
          valid: false,
          error: constraint.errorMessage,
          constraint,
        };
      }
    }

    if (constraint.requiredState.activeForecast) {
      if (!state.activeForecast) {
        return {
          valid: false,
          error: constraint.errorMessage,
          constraint,
        };
      }
    }
  }

  // Check forbidden state
  if (constraint.forbiddenState) {
    if (constraint.forbiddenState.agentBeingConfigured) {
      if (state.agentBeingConfigured && state.agentBeingConfigured.name) {
        return {
          valid: false,
          error: constraint.errorMessage,
          constraint,
        };
      }
    }

    if (constraint.forbiddenState.driverBeingConfigured) {
      if (state.driverBeingConfigured) {
        return {
          valid: false,
          error: constraint.errorMessage,
          constraint,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Get all constraints for a command
 */
export function getCommandConstraints(command: string): CommandConstraint | undefined {
  const baseCommand = command.split(" ")[0];
  return COMMAND_CONSTRAINTS.find(c => c.command === baseCommand);
}

/**
 * Get all commands with a specific constraint type
 */
export function getCommandsRequiringState(
  stateKey: keyof NonNullable<CommandConstraint["requiredState"]>
): CommandConstraint[] {
  return COMMAND_CONSTRAINTS.filter(
    c => c.requiredState && c.requiredState[stateKey]
  );
}
