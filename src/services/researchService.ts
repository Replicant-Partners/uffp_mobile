const API_BASE_URL =
  typeof __DEV__ !== "undefined" && __DEV__
    ? "http://localhost:3000"
    : "https://uffp-backend.vercel.app";

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

  // Forecast endpoints
  async parseQuestion(userInput: string): Promise<any> {
    const response = await this.makeRequest("/parse-question", {
      method: "POST",
      body: JSON.stringify({ userInput }),
    });
    return response.json();
  }

  async createForecast(data: {
    userId?: string;
    question: string;
    domain?: string;
    timeframe?: string;
    resolutionCriteria: string;
    privacy?: "private" | "unlisted" | "public" | "organization";
    tags?: string[];
  }): Promise<any> {
    const response = await this.makeRequest("/forecasts?action=create", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async getForecast(forecastId: string): Promise<any> {
    const response = await this.makeRequest(
      `/forecasts?action=get&id=${forecastId}`,
    );
    return response.json();
  }

  async addDriver(
    forecastId: string,
    driver: {
      name: string;
      type: "binary" | "continuous";
      probability?: number;
      p5?: number;
      p50?: number;
      p95?: number;
      distribution?: "normal" | "triangular" | "lognormal";
      direction?: "increases" | "decreases";
      reasoning?: string;
      evidence?: any[];
      researchResults?: any[]; // Backend expects researchResults, not agents
      version?: any;
      versionHistory?: any[];
    },
  ): Promise<any> {
    const response = await this.makeRequest("/forecasts?action=addDriver", {
      method: "POST",
      body: JSON.stringify({ forecastId, driver }),
    });
    return response.json();
  }

  async simulate(forecastId: string, iterations: number = 10000): Promise<any> {
    const response = await this.makeRequest("/forecasts?action=simulate", {
      method: "POST",
      body: JSON.stringify({ forecastId, iterations }),
    });
    return response.json();
  }

  async runSimulation(data: {
    question: string;
    drivers: any[];
  }): Promise<{ probability: number; distribution: any }> {
    const response = await this.makeRequest("/forecasts?action=simulate", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async chatWithCoach(
    message: string,
    context?: {
      forecastId?: string;
      stage?: string;
      conversationHistory?: any[];
      [key: string]: any;
    },
  ): Promise<any> {
    // Extract stage and conversationHistory, rest goes into context
    const { stage, conversationHistory, ...contextData } = context || {};

    const response = await this.makeRequest("/coach/chat", {
      method: "POST",
      body: JSON.stringify({
        stage: stage || "review",
        context: contextData,
        userMessage: message,
        conversationHistory: conversationHistory || [],
      }),
    });
    return response.json();
  }

  async reviewForecast(
    forecastId: string,
    forecast: {
      question: string;
      drivers: any[];
      probability?: number;
    },
  ): Promise<any> {
    const response = await this.makeRequest("/coach/review", {
      method: "POST",
      body: JSON.stringify({ forecastId, forecast }),
    });
    return response.json();
  }

  async decomposeForecast(
    question: string,
    context?: {
      forecastId?: string;
      existingDrivers?: any[];
    },
  ): Promise<any> {
    const response = await this.makeRequest("/coach/decompose", {
      method: "POST",
      body: JSON.stringify({ question, ...context }),
    });
    return response.json();
  }

  // List forecasts
  async listForecasts(params?: {
    userId?: string;
    status?: "draft" | "active" | "resolved";
    limit?: number;
    offset?: number;
  }): Promise<{ forecasts: any[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.userId) queryParams.set("userId", params.userId);
    if (params?.status) queryParams.set("status", params.status);
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.offset) queryParams.set("offset", params.offset.toString());

    const response = await this.makeRequest(
      `/forecasts?action=list&${queryParams.toString()}`,
    );
    return response.json();
  }

  // Update driver
  async updateDriver(
    forecastId: string,
    driverId: string,
    updates: any,
    changeReason?: string,
  ): Promise<any> {
    const response = await this.makeRequest("/forecasts?action=updateDriver", {
      method: "POST",
      body: JSON.stringify({ forecastId, driverId, updates, changeReason }),
    });
    return response.json();
  }

  // Remove driver
  async removeDriver(forecastId: string, driverId: string): Promise<any> {
    const response = await this.makeRequest("/forecasts?action=removeDriver", {
      method: "POST",
      body: JSON.stringify({ forecastId, driverId }),
    });
    return response.json();
  }

  // Add evidence
  async addEvidence(
    forecastId: string,
    evidence: any,
    driverId?: string,
  ): Promise<any> {
    const response = await this.makeRequest("/forecasts?action=addEvidence", {
      method: "POST",
      body: JSON.stringify({ forecastId, evidence, driverId }),
    });
    return response.json();
  }

  // Set base rate
  async setBaseRate(forecastId: string, baseRate: any): Promise<any> {
    const response = await this.makeRequest("/forecasts?action=setBaseRate", {
      method: "POST",
      body: JSON.stringify({ forecastId, baseRate }),
    });
    return response.json();
  }

  // Get user stats
  async getUserStats(userId: string): Promise<any> {
    const response = await this.makeRequest(
      `/forecasts?action=stats&userId=${userId}`,
    );
    return response.json();
  }

  // Get leaderboard
  async getLeaderboard(params?: {
    domain?: string;
    limit?: number;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    queryParams.set("leaderboard", "true");
    if (params?.domain) queryParams.set("domain", params.domain);
    if (params?.limit) queryParams.set("limit", params.limit.toString());

    const response = await this.makeRequest(
      `/forecasts?action=stats&${queryParams.toString()}`,
    );
    return response.json();
  }

  // Update forecast (full update)
  async updateForecast(
    forecastId: string,
    updates: Partial<{
      question: string;
      domain: string;
      timeframe: string;
      resolutionCriteria: string;
      probability: number;
      resolved: boolean;
      actualOutcome: boolean;
    }>,
  ): Promise<any> {
    const response = await this.makeRequest("/forecasts?action=update", {
      method: "POST",
      body: JSON.stringify({ forecastId, updates }),
    });
    return response.json();
  }

  // Resolve forecast (mark outcome and calculate Brier score)
  async resolveForecast(
    forecastId: string,
    actualOutcome: boolean,
  ): Promise<any> {
    const response = await this.makeRequest("/forecasts?action=resolve", {
      method: "POST",
      body: JSON.stringify({
        forecastId,
        actualOutcome,
        resolvedAt: new Date().toISOString(),
      }),
    });
    return response.json();
  }

  // Authentication
  async register(email: string, password: string, name?: string): Promise<any> {
    const response = await this.makeRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    return response.json();
  }

  async login(email: string, password: string): Promise<any> {
    const response = await this.makeRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  }

  async getCurrentUser(token: string): Promise<any> {
    const response = await this.makeRequest("/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.json();
  }

  // Forecast discovery
  async discoverForecasts(params?: {
    tags?: string[];
    domain?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.tags) queryParams.set("tags", params.tags.join(","));
    if (params?.domain) queryParams.set("domain", params.domain);
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.offset) queryParams.set("offset", params.offset.toString());

    const response = await this.makeRequest(
      `/forecasts/discover?${queryParams.toString()}`,
    );
    return response.json();
  }
}

export const researchService = new ResearchService();
