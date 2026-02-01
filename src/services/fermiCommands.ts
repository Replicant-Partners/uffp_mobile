/**
 * @fermi Command Registry
 *
 * Defines all commands that work in the @fermi chat interface.
 * Commands are context-aware and can be executed or show as suggestions.
 */

export type CommandContext =
  | "forecast_list" // No active forecast
  | "forecast_active" // Forecast open, no driver config
  | "driver_config" // Configuring a driver
  | "agent_config" // Configuring an agent
  | "simulation_results" // After running simulation
  | "any"; // Works in any context

export interface Command {
  name: string;
  syntax: string;
  description: string;
  contexts: CommandContext[];
  category: "forecast" | "driver" | "agent" | "help" | "system";
  examples: string[];
  execute: (args: string[], state: any) => Promise<CommandResult>;
}

export interface CommandResult {
  success: boolean;
  message: string;
  suggestions?: CommandSuggestion[];
  updateState?: any;
}

export interface CommandSuggestion {
  command: string;
  description: string;
  clickable: boolean;
}

/**
 * Command Registry - all available commands
 */
export const COMMANDS: Record<string, Command> = {
  // Help system
  help: {
    name: "help",
    syntax: "/-h or /help [command]",
    description: "Show all commands or help for specific command",
    contexts: ["any"],
    category: "help",
    examples: ["/-h", "/help", "/help /p"],
    execute: async (args, state) => {
      if (args.length > 0) {
        // Help for specific command
        const cmdName = args[0].replace("/", "");
        const cmd = COMMANDS[cmdName];
        if (cmd) {
          return {
            success: true,
            message: `📖 ${cmd.syntax}\n\n${cmd.description}\n\n✨ Examples:\n${cmd.examples.map((e) => `  ${e}`).join("\n")}\n\n📍 Valid in: ${cmd.contexts.join(", ")}`,
          };
        } else {
          return {
            success: false,
            message: `Command '${args[0]}' not found. Type /-h to see all commands.`,
          };
        }
      }

      // Show all commands grouped by category
      const { context } = state;
      const available = Object.values(COMMANDS).filter(
        (cmd) => cmd.contexts.includes("any") || cmd.contexts.includes(context),
      );

      const byCategory: Record<string, Command[]> = {};
      available.forEach((cmd) => {
        if (!byCategory[cmd.category]) byCategory[cmd.category] = [];
        byCategory[cmd.category].push(cmd);
      });

      let message = `📚 Available Commands (context: ${context})\n\n`;

      for (const [category, cmds] of Object.entries(byCategory)) {
        message += `**${category.toUpperCase()}**\n`;
        cmds.forEach((cmd) => {
          message += `  ${cmd.syntax} - ${cmd.description}\n`;
        });
        message += "\n";
      }

      message += `💡 Tip: Click any command to use it, or type /help <command> for details`;

      return { success: true, message };
    },
  },

  // Forecast commands
  question: {
    name: "question",
    syntax: "/question <your forecast question>",
    description: "Start a new forecast",
    contexts: ["forecast_list", "any"],
    category: "forecast",
    examples: ["/question Will AMD stock reach $200 by end of 2025?"],
    execute: async (args, state) => {
      const question = args.join(" ");
      if (!question) {
        return {
          success: false,
          message: "Please provide a forecast question",
          suggestions: [
            {
              command: "/question Will X happen by Y?",
              description: "Template for time-bound forecast",
              clickable: false,
            },
          ],
        };
      }

      return {
        success: true,
        message: `Great question! I created your forecast.\n\nLet's break this down into drivers - what key factors will influence this outcome?`,
        updateState: { question },
        suggestions: [
          {
            command: "/driver Market size",
            description: "Add first driver",
            clickable: true,
          },
        ],
      };
    },
  },

  list: {
    name: "list",
    syntax: "/list [all|active|expired]",
    description: "Show your forecasts",
    contexts: ["any"],
    category: "forecast",
    examples: ["/list", "/list active"],
    execute: async (args, state) => {
      const filter = args[0] || "all";
      return {
        success: true,
        message: `📊 Showing ${filter} forecasts...`,
        updateState: { showList: true, filter },
      };
    },
  },

  simulate: {
    name: "simulate",
    syntax: "/simulate",
    description: "Run Monte Carlo simulation",
    contexts: ["forecast_active"],
    category: "forecast",
    examples: ["/simulate"],
    execute: async (args, state) => {
      const { drivers } = state;
      if (!drivers || drivers.length === 0) {
        return {
          success: false,
          message: "❌ No drivers configured. Add drivers first.",
          suggestions: [
            {
              command: "/driver <name>",
              description: "Add a driver",
              clickable: false,
            },
          ],
        };
      }

      return {
        success: true,
        message: `Excellent! Running Monte Carlo simulation with your ${drivers.length} driver(s). This might take a moment...`,
        updateState: { runSimulation: true },
      };
    },
  },

  // Driver configuration commands
  driver: {
    name: "driver",
    syntax: "/driver <name>",
    description: "Add or configure a driver",
    contexts: ["forecast_active"],
    category: "driver",
    examples: ["/driver Market size", "/driver Adoption rate"],
    execute: async (args, state) => {
      const name = args.join(" ");
      if (!name) {
        return {
          success: false,
          message: "Please provide a driver name",
        };
      }

      return {
        success: true,
        message: `Nice! Let's configure "${name}".\n\nFirst, give me your best guess for the range - what are your pessimistic (p5), likely (p50), and optimistic (p95) estimates?`,
        updateState: { configureDriver: name },
        suggestions: [
          {
            command: "/p 10 50 90",
            description: "Set parameter values",
            clickable: true,
          },
          {
            command: "/dist triangular",
            description: "Set distribution",
            clickable: true,
          },
        ],
      };
    },
  },

  p: {
    name: "p",
    syntax: "/p <p5> <p50> <p95>",
    description: "Set driver parameters (percentiles)",
    contexts: ["driver_config"],
    category: "driver",
    examples: ["/p 10 50 90", "/p 100 500 2000"],
    execute: async (args, state) => {
      if (args.length !== 3) {
        return {
          success: false,
          message: "Usage: /p <p5> <p50> <p95>\nExample: /p 10 50 90",
        };
      }

      const [p5, p50, p95] = args.map(Number);

      if (isNaN(p5) || isNaN(p50) || isNaN(p95)) {
        return { success: false, message: "Values must be numbers" };
      }

      if (p5 >= p50) {
        return { success: false, message: `p5 (${p5}) must be < p50 (${p50})` };
      }

      if (p50 >= p95) {
        return {
          success: false,
          message: `p50 (${p50}) must be < p95 (${p95})`,
        };
      }

      return {
        success: true,
        message: `Got it! I set your estimates:\n• ${p5} (pessimistic)\n• ${p50} (most likely)\n• ${p95} (optimistic)\n\nThese look good - nice range of uncertainty!`,
        updateState: { p5, p50, p95 },
        suggestions: [
          {
            command: "/dist triangular",
            description: "Set distribution type",
            clickable: true,
          },
          {
            command: "/direction increases",
            description: "Set how this affects outcome",
            clickable: true,
          },
        ],
      };
    },
  },

  dist: {
    name: "dist",
    syntax: "/dist <triangular|normal|lognormal>",
    description: "Set probability distribution type",
    contexts: ["driver_config"],
    category: "driver",
    examples: ["/dist triangular", "/dist lognormal"],
    execute: async (args, state) => {
      const dist = args[0];
      const valid = ["triangular", "normal", "lognormal"];

      if (!valid.includes(dist)) {
        return {
          success: false,
          message: `Distribution must be one of: ${valid.join(", ")}`,
          suggestions: valid.map((d) => ({
            command: `/dist ${d}`,
            description:
              d === "triangular"
                ? "Most common (min, mode, max)"
                : d === "normal"
                  ? "Bell curve (symmetric)"
                  : "Can't be negative, long tail",
            clickable: true,
          })),
        };
      }

      const explanations = {
        triangular: "Best for most forecasts. Clear min/mode/max.",
        normal: "Symmetric bell curve. Rare in forecasting.",
        lognormal: "Can't be negative, has long right tail. Good for growth.",
      };

      return {
        success: true,
        message: `Perfect! Using ${dist} distribution. ${explanations[dist as keyof typeof explanations]}`,
        updateState: { distribution: dist },
        suggestions: [
          {
            command: "/direction increases",
            description: "Set effect on outcome",
            clickable: true,
          },
          {
            command: "/save",
            description: "Save this driver",
            clickable: true,
          },
        ],
      };
    },
  },

  direction: {
    name: "direction",
    syntax: "/direction <increases|decreases>",
    description: "Set how driver affects outcome probability",
    contexts: ["driver_config"],
    category: "driver",
    examples: ["/direction increases", "/direction decreases"],
    execute: async (args, state) => {
      const dir = args[0];

      if (dir !== "increases" && dir !== "decreases") {
        return {
          success: false,
          message: "Direction must be 'increases' or 'decreases'",
          suggestions: [
            {
              command: "/direction increases",
              description: "Higher value → MORE likely",
              clickable: true,
            },
            {
              command: "/direction decreases",
              description: "Higher value → LESS likely",
              clickable: true,
            },
          ],
        };
      }

      const explanation =
        dir === "increases"
          ? "Higher values of this driver make the outcome MORE likely"
          : "Higher values of this driver make the outcome LESS likely";

      return {
        success: true,
        message: `Great! This driver ${dir} the outcome probability. ${explanation}`,
        updateState: { direction: dir },
        suggestions: [
          {
            command: "/save",
            description: "Save this driver",
            clickable: true,
          },
        ],
      };
    },
  },

  save: {
    name: "save",
    syntax: "/save",
    description: "Save current configuration",
    contexts: ["driver_config", "agent_config"],
    category: "driver",
    examples: ["/save"],
    execute: async (args, state) => {
      return {
        success: true,
        message: `All set! Driver saved successfully.\n\nReady to add more drivers or run your simulation?`,
        updateState: { save: true },
        suggestions: [
          {
            command: "/driver <name>",
            description: "Add another driver",
            clickable: false,
          },
          {
            command: "/simulate",
            description: "Run simulation",
            clickable: true,
          },
        ],
      };
    },
  },

  cancel: {
    name: "cancel",
    syntax: "/cancel",
    description: "Cancel current configuration",
    contexts: ["driver_config", "agent_config"],
    category: "system",
    examples: ["/cancel"],
    execute: async (args, state) => {
      return {
        success: true,
        message: "✓ Cancelled",
        updateState: { cancel: true },
      };
    },
  },
};

/**
 * Get commands valid in current context
 */
export function getAvailableCommands(context: CommandContext): Command[] {
  return Object.values(COMMANDS).filter(
    (cmd) => cmd.contexts.includes("any") || cmd.contexts.includes(context),
  );
}

/**
 * Parse and execute a command
 */
export async function executeCommand(
  input: string,
  context: CommandContext,
  state: any,
): Promise<CommandResult> {
  const trimmed = input.trim();

  // Check if it's a command
  if (!trimmed.startsWith("/")) {
    return {
      success: false,
      message:
        "Commands start with /. Try /-h for help, or ask me anything in natural language!",
    };
  }

  // Parse command and arguments
  const parts = trimmed.slice(1).split(/\s+/);
  const cmdName = parts[0];
  const args = parts.slice(1);

  // Special case: /-h is alias for /help
  const resolvedName = cmdName === "-h" ? "help" : cmdName;

  // Find command
  const cmd = COMMANDS[resolvedName];

  if (!cmd) {
    return {
      success: false,
      message: `Unknown command: /${cmdName}\nType /-h to see all commands`,
    };
  }

  // Check if command is valid in current context
  if (!cmd.contexts.includes("any") && !cmd.contexts.includes(context)) {
    return {
      success: false,
      message: `Command /${cmdName} not available in context: ${context}\n\nValid in: ${cmd.contexts.join(", ")}\n\nType /-h to see available commands`,
    };
  }

  // Execute command
  try {
    return await cmd.execute(args, { ...state, context });
  } catch (error) {
    return {
      success: false,
      message: `Error executing /${cmdName}: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
