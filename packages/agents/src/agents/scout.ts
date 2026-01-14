/**
 * Scout Agent
 * Monitors sources and reports findings to other agents
 */

import { type A2AMessage, type AgentCapability } from '@ain/core';
import { BaseAgent, type AgentConfig } from '../base';

interface ScoutTask {
  type: 'monitor' | 'search';
  source?: string;
  query?: string;
}

interface ScoutResult {
  findings: Finding[];
  source: string;
  timestamp: string;
}

interface Finding {
  title: string;
  summary: string;
  url?: string;
  relevance: number;
}

export class ScoutAgent extends BaseAgent {
  protected capabilities: AgentCapability[] = [
    {
      name: 'monitor',
      description: 'Monitor a source for new content',
      inputSchema: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'URL or source identifier' },
        },
        required: ['source'],
      },
    },
    {
      name: 'search',
      description: 'Search for information on a topic',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
  ];

  constructor(config: Omit<AgentConfig, 'id' | 'name' | 'description'>) {
    super({
      ...config,
      id: 'scout',
      name: 'Scout Agent',
      description: 'Monitors sources and searches for information',
    });
  }

  protected async process(message: A2AMessage): Promise<ScoutResult> {
    const task = message.payload as ScoutTask;

    switch (task.type) {
      case 'monitor':
        return this.monitor(task.source!);
      case 'search':
        return this.search(task.query!);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  private async monitor(source: string): Promise<ScoutResult> {
    // Use LLM to analyze/summarize content from source
    const response = await this.callLLM({
      system: `You are a research scout. Analyze the given source and extract key findings.
Return findings as a JSON array with objects containing: title, summary, relevance (0-1).
Focus on actionable, interesting, or important information.`,
      messages: [
        {
          role: 'user',
          content: `Analyze this source and extract key findings: ${source}

Return ONLY valid JSON in this format:
{"findings": [{"title": "...", "summary": "...", "relevance": 0.8}]}`,
        },
      ],
      maxTokens: 1024,
    });

    try {
      const parsed = JSON.parse(response.content);
      return {
        findings: parsed.findings || [],
        source,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        findings: [
          {
            title: 'Raw analysis',
            summary: response.content,
            relevance: 0.5,
          },
        ],
        source,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async search(query: string): Promise<ScoutResult> {
    const response = await this.callLLM({
      system: `You are a research scout. Based on the query, provide relevant findings and insights.
Return findings as a JSON array with objects containing: title, summary, relevance (0-1).`,
      messages: [
        {
          role: 'user',
          content: `Research query: ${query}

Provide findings in this JSON format:
{"findings": [{"title": "...", "summary": "...", "relevance": 0.8}]}`,
        },
      ],
      maxTokens: 1024,
    });

    try {
      const parsed = JSON.parse(response.content);
      return {
        findings: parsed.findings || [],
        source: `search:${query}`,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        findings: [
          {
            title: 'Search results',
            summary: response.content,
            relevance: 0.5,
          },
        ],
        source: `search:${query}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
