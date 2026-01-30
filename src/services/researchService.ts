const API_BASE_URL = __DEV__
  ? "http://localhost:3000"
  : "https://uffp-backend-1gorlhp50-ivan-5553s-projects.vercel.app";

export interface ResearchRequest {
  agentId: string;
  promptId: string;
  variables: Record<string, string>;
}

export interface ResearchResult {
  id: string;
  timestamp: string;
  agentId: string;
  promptId: string;
  variables: Record<string, string>;
  prompt: string;
  response: string;
  summary: string;
  keyFindings: string[];
  sources: string[];
  confidence: "high" | "medium" | "low";
}

export interface ScheduledResearch {
  id: string;
  agentId: string;
  promptId: string;
  variables: Record<string, string>;
  frequency: "daily" | "weekly" | "monthly";
  enabled: boolean;
  lastRun?: string;
  nextRun: string;
  userId?: string;
}

class ResearchService {
  private async makeRequest(
    endpoint: string,
    options?: RequestInit,
  ): Promise<Response> {
    const url = `${API_BASE_URL}/api${endpoint}`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error || `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    return response;
  }

  async executeResearch(
    request: ResearchRequest,
  ): Promise<{ result: ResearchResult }> {
    const response = await this.makeRequest("/agents/execute", {
      method: "POST",
      body: JSON.stringify(request),
    });

    return response.json();
  }

  async getResearchResults(
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ results: ResearchResult[] }> {
    const response = await this.makeRequest(
      `/research/results?limit=${limit}&offset=${offset}`,
    );
    return response.json();
  }

  async getResearchResult(id: string): Promise<{ result: ResearchResult }> {
    const response = await this.makeRequest(`/research/results?id=${id}`);
    return response.json();
  }

  async scheduleResearch(
    agentId: string,
    promptId: string,
    frequency: "daily" | "weekly" | "monthly",
    variables: Record<string, string>,
    enabled: boolean = true,
  ): Promise<{ scheduledResearch: ScheduledResearch }> {
    const response = await this.makeRequest("/research/schedule", {
      method: "POST",
      body: JSON.stringify({
        agentId,
        promptId,
        frequency,
        variables,
        enabled,
      }),
    });

    return response.json();
  }

  async getScheduledResearch(): Promise<{ scheduled: ScheduledResearch[] }> {
    const response = await this.makeRequest("/research/schedule");
    return response.json();
  }

  async getPromptTemplates(): Promise<{ prompts: any[] }> {
    const response = await this.makeRequest("/prompts/templates");
    return response.json();
  }
}

export const researchService = new ResearchService();
