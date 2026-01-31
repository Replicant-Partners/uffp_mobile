import { RESEARCH_AGENT_CONFIGS, RESEARCH_PROMPT_TEMPLATES } from "./config";
import type { AgentConfig, ResearchPromptTemplate } from "./config";

interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ResearchExecution {
  agentId: string;
  promptId: string;
  variables: Record<string, string>;
}

interface ResearchResult {
  id: string;
  timestamp: Date;
  agentId: string;
  promptId: string;
  variables: Record<string, string>;
  prompt: string;
  response: string;
  summary: string;
  keyFindings: string[];
  sources: string[];
  confidence: "high" | "medium" | "low";
  structuredData?: any;
}

/**
 * Execute research using specified agent and prompt template
 */
export async function executeResearch(
  execution: ResearchExecution,
): Promise<ResearchResult> {
  const { agentId, promptId, variables } = execution;
  console.log("Starting research execution:", { agentId, promptId, variables });

  // Find agent config
  const agentConfig = RESEARCH_AGENT_CONFIGS.find((a) => a.id === agentId);
  if (!agentConfig) {
    throw new Error(`Agent not found: ${agentId}`);
  }
  console.log("Found agent config:", agentConfig.name);

  // Find prompt template
  const promptTemplate = RESEARCH_PROMPT_TEMPLATES.find(
    (p) => p.id === promptId,
  );
  if (!promptTemplate) {
    throw new Error(`Prompt template not found: ${promptId}`);
  }
  console.log("Found prompt template:", promptTemplate.name);

  // Fill in template variables
  let filledPrompt = promptTemplate.promptTemplate;
  for (const [key, value] of Object.entries(variables)) {
    filledPrompt = filledPrompt.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  console.log("Filled prompt length:", filledPrompt.length);

  // Execute LLM call
  console.log("Calling LLM...");
  const llmResponse = await callLLM(agentConfig, filledPrompt);
  console.log("LLM response received, length:", llmResponse.content.length);

  // Parse response
  const parsed = parseResearchResponse(llmResponse.content);

  // Generate result
  const result: ResearchResult = {
    id: generateId(),
    timestamp: new Date(),
    agentId,
    promptId,
    variables,
    prompt: filledPrompt,
    response: llmResponse.content,
    summary: parsed.summary,
    keyFindings: parsed.keyFindings,
    sources: parsed.sources,
    confidence: parsed.confidence,
    structuredData: parsed.structuredData,
  };

  return result;
}

/**
 * Call LLM API (Claude or OpenAI)
 */
async function callLLM(
  config: AgentConfig,
  prompt: string,
): Promise<LLMResponse> {
  if (config.provider === "claude") {
    return callClaude(config, prompt);
  } else if (config.provider === "openai") {
    return callOpenAI(config, prompt);
  } else {
    throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

/**
 * Call Claude API
 */
async function callClaude(
  config: AgentConfig,
  prompt: string,
): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: config.systemPrompt || "",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as any;

  return {
    content: data.content[0].text,
    model: data.model,
    usage: {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens,
    },
  };
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  config: AgentConfig,
  prompt: string,
): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const messages: any[] = [];

  if (config.systemPrompt) {
    messages.push({
      role: "system",
      content: config.systemPrompt,
    });
  }

  messages.push({
    role: "user",
    content: prompt,
  });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as any;

  return {
    content: data.choices[0].message.content,
    model: data.model,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
  };
}

/**
 * Parse research response into structured format
 */
function parseResearchResponse(response: string): {
  summary: string;
  keyFindings: string[];
  sources: string[];
  confidence: "high" | "medium" | "low";
  structuredData?: any;
} {
  const lines = response.split("\n");

  let summary = "";
  const keyFindings: string[] = [];
  const sources: string[] = [];
  let confidence: "high" | "medium" | "low" = "medium";

  let currentSection = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect sections
    if (trimmed.startsWith("SUMMARY:")) {
      currentSection = "summary";
      summary = trimmed.replace("SUMMARY:", "").trim();
      continue;
    } else if (trimmed.startsWith("KEY FINDINGS:")) {
      currentSection = "findings";
      continue;
    } else if (trimmed.startsWith("SOURCES:")) {
      currentSection = "sources";
      continue;
    } else if (trimmed.startsWith("CONFIDENCE:")) {
      currentSection = "confidence";
      const confidenceText = trimmed.toLowerCase();
      if (confidenceText.includes("high")) {
        confidence = "high";
      } else if (confidenceText.includes("low")) {
        confidence = "low";
      } else {
        confidence = "medium";
      }
      continue;
    }

    // Parse content based on current section
    if (
      currentSection === "summary" &&
      trimmed &&
      !trimmed.match(/^[A-Z ]+:/)
    ) {
      summary += " " + trimmed;
    } else if (currentSection === "findings" && trimmed) {
      // Match numbered or bulleted findings
      const findingMatch = trimmed.match(/^[\d\-\*\•]\s*(.+)/);
      if (findingMatch) {
        keyFindings.push(findingMatch[1]);
      }
    } else if (currentSection === "sources" && trimmed) {
      // Extract URLs or source descriptions
      const urlMatch = trimmed.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        sources.push(urlMatch[0]);
      } else if (trimmed.startsWith("-") || trimmed.startsWith("•")) {
        sources.push(trimmed.substring(1).trim());
      }
    }
  }

  return {
    summary: summary.trim() || "Research completed successfully",
    keyFindings:
      keyFindings.length > 0 ? keyFindings : ["See full response for details"],
    sources: sources.length > 0 ? sources : ["Multiple sources analyzed"],
    confidence,
  };
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get agent by ID
 */
export function getAgent(agentId: string): AgentConfig | undefined {
  return RESEARCH_AGENT_CONFIGS.find((a) => a.id === agentId);
}

/**
 * Get prompt template by ID
 */
export function getPromptTemplate(
  promptId: string,
): ResearchPromptTemplate | undefined {
  return RESEARCH_PROMPT_TEMPLATES.find((p) => p.id === promptId);
}

/**
 * List all available agents
 */
export function listAgents(): AgentConfig[] {
  return RESEARCH_AGENT_CONFIGS;
}

/**
 * List all available prompt templates
 */
export function listPromptTemplates(): ResearchPromptTemplate[] {
  return RESEARCH_PROMPT_TEMPLATES;
}
