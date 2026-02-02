import {
  RESEARCH_COORDINATOR_CONFIG,
  AgentConfig,
  ResearchPromptTemplate,
} from "./config";

export interface ResearchSuggestion {
  agentId: string;
  reason: string;
  confidence: number;
}

export interface MultiAgentRequest {
  agentRequests: Array<{
    agentId: string;
    variables: Record<string, string>;
  }>;
}

export interface AggregatedResults {
  summary: string;
  combinedFindings: string[];
  evidence: any[];
  averageConfidence: number;
  sources: string[];
}

export class ResearchCoordinator {
  static suggestAgents(query: string, domain?: string): ResearchSuggestion[] {
    const suggestions: ResearchSuggestion[] = [];
    const lowerQuery = query.toLowerCase();

    if (
      domain &&
      RESEARCH_COORDINATOR_CONFIG.domainSuggestions[
        domain as keyof typeof RESEARCH_COORDINATOR_CONFIG.domainSuggestions
      ]
    ) {
      const domainAgents =
        RESEARCH_COORDINATOR_CONFIG.domainSuggestions[
          domain as keyof typeof RESEARCH_COORDINATOR_CONFIG.domainSuggestions
        ];
      domainAgents.forEach((agentId: string) => {
        suggestions.push({
          agentId,
          reason: `Relevant for ${domain} domain`,
          confidence: 0.8,
        });
      });
    }

    RESEARCH_COORDINATOR_CONFIG.keywordPatterns.forEach((pattern) => {
      if (pattern.keywords.some((keyword) => lowerQuery.includes(keyword))) {
        pattern.agents.forEach((agentId: string) => {
          if (!suggestions.find((s) => s.agentId === agentId)) {
            suggestions.push({
              agentId,
              reason: `Keywords match: ${pattern.keywords.join(", ")}`,
              confidence: 0.7,
            });
          }
        });
      }
    });

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  static getAvailableAgents(): string[] {
    const domains = Object.keys(
      RESEARCH_COORDINATOR_CONFIG.domainSuggestions,
    ) as Array<keyof typeof RESEARCH_COORDINATOR_CONFIG.domainSuggestions>;
    return domains.flatMap(
      (domain) => RESEARCH_COORDINATOR_CONFIG.domainSuggestions[domain],
    );
  }

  static detectDomain(query: string): string | undefined {
    const lowerQuery = query.toLowerCase();

    if (
      lowerQuery.match(
        /\b(stock|revenue|market cap|price|valuation|finance|financial)\b/,
      )
    ) {
      return "finance";
    }

    if (
      lowerQuery.match(
        /\b(tech|software|launch|feature|technology|app|platform)\b/,
      )
    ) {
      return "technology";
    }

    if (lowerQuery.match(/\b(healthcare|medical|pharma|fda|clinical|drug)\b/)) {
      return "healthcare";
    }

    return undefined;
  }

  static createMultiAgentRequest(
    primaryAgentId: string,
    query: string,
    variables: Record<string, string>,
  ): MultiAgentRequest {
    const domain = this.detectDomain(query);
    const suggested = this.suggestAgents(query, domain);

    const additionalAgents = suggested
      .filter((s) => s.agentId !== primaryAgentId && s.confidence > 0.6)
      .slice(0, 2)
      .map((s) => s.agentId);

    const agentRequests = [
      { agentId: primaryAgentId, variables },
      ...additionalAgents.map((agentId) => ({ agentId, variables })),
    ];

    return { agentRequests };
  }

  static aggregateResults(results: any[]): AggregatedResults {
    if (results.length === 0) {
      return {
        summary: "No research results available",
        combinedFindings: [],
        evidence: [],
        averageConfidence: 0,
        sources: [],
      };
    }

    const allFindings: string[] = [];
    const allEvidence: any[] = [];
    const allSources: string[] = [];
    let totalConfidence = 0;

    results.forEach((result) => {
      if (result.findings) allFindings.push(...result.findings);
      if (result.evidence) allEvidence.push(...result.evidence);
      if (result.sources) allSources.push(...result.sources);
      if (result.confidence) totalConfidence += result.confidence;
    });

    const avgConfidence = totalConfidence / results.length;
    const uniqueSources = Array.from(new Set(allSources));

    const summary = `Completed ${results.length} research agents. Found ${allFindings.length} key insights with ${Math.round(avgConfidence * 100)}% average confidence.`;

    return {
      summary,
      combinedFindings: allFindings,
      evidence: allEvidence,
      averageConfidence: avgConfidence,
      sources: uniqueSources,
    };
  }
}
