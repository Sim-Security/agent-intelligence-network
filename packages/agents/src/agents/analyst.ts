/**
 * Analyst Agent
 * Performs deep analysis on findings from other agents
 */

import { type A2AMessage, type AgentCapability } from '@ain/core';
import { BaseAgent, type AgentConfig } from '../base';

interface AnalystTask {
  type: 'analyze' | 'compare' | 'summarize';
  data: unknown;
  context?: string;
}

interface Analysis {
  summary: string;
  insights: string[];
  recommendations: string[];
  confidence: number;
}

export class AnalystAgent extends BaseAgent {
  protected capabilities: AgentCapability[] = [
    {
      name: 'analyze',
      description: 'Perform deep analysis on provided data',
      inputSchema: {
        type: 'object',
        properties: {
          data: { type: 'object', description: 'Data to analyze' },
          context: { type: 'string', description: 'Additional context' },
        },
        required: ['data'],
      },
    },
    {
      name: 'compare',
      description: 'Compare multiple data points or findings',
      inputSchema: {
        type: 'object',
        properties: {
          data: { type: 'array', description: 'Items to compare' },
        },
        required: ['data'],
      },
    },
    {
      name: 'summarize',
      description: 'Create executive summary of findings',
      inputSchema: {
        type: 'object',
        properties: {
          data: { type: 'object', description: 'Data to summarize' },
        },
        required: ['data'],
      },
    },
  ];

  constructor(config: Omit<AgentConfig, 'id' | 'name' | 'description'>) {
    super({
      ...config,
      id: 'analyst',
      name: 'Analyst Agent',
      description: 'Performs deep analysis and generates insights',
    });
  }

  protected async process(message: A2AMessage): Promise<Analysis> {
    const task = message.payload as AnalystTask;

    switch (task.type) {
      case 'analyze':
        return this.analyze(task.data, task.context);
      case 'compare':
        return this.compare(task.data as unknown[]);
      case 'summarize':
        return this.summarize(task.data);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  private async analyze(data: unknown, context?: string): Promise<Analysis> {
    const response = await this.callLLM({
      system: `You are an expert analyst. Analyze the provided data and extract actionable insights.
Return your analysis as JSON with: summary, insights (array), recommendations (array), confidence (0-1).`,
      messages: [
        {
          role: 'user',
          content: `Analyze this data${context ? ` with context: ${context}` : ''}:

${JSON.stringify(data, null, 2)}

Return ONLY valid JSON:
{"summary": "...", "insights": ["..."], "recommendations": ["..."], "confidence": 0.8}`,
        },
      ],
      maxTokens: 2048,
    });

    return this.parseAnalysis(response.content);
  }

  private async compare(items: unknown[]): Promise<Analysis> {
    const response = await this.callLLM({
      system: `You are an expert analyst. Compare the provided items and identify patterns, differences, and insights.
Return your analysis as JSON with: summary, insights (array), recommendations (array), confidence (0-1).`,
      messages: [
        {
          role: 'user',
          content: `Compare these items:

${JSON.stringify(items, null, 2)}

Return ONLY valid JSON:
{"summary": "...", "insights": ["..."], "recommendations": ["..."], "confidence": 0.8}`,
        },
      ],
      maxTokens: 2048,
    });

    return this.parseAnalysis(response.content);
  }

  private async summarize(data: unknown): Promise<Analysis> {
    const response = await this.callLLM({
      system: `You are an expert analyst. Create an executive summary of the provided data.
Focus on the most important points and actionable takeaways.
Return as JSON with: summary, insights (array), recommendations (array), confidence (0-1).`,
      messages: [
        {
          role: 'user',
          content: `Create an executive summary:

${JSON.stringify(data, null, 2)}

Return ONLY valid JSON:
{"summary": "...", "insights": ["..."], "recommendations": ["..."], "confidence": 0.8}`,
        },
      ],
      maxTokens: 1024,
    });

    return this.parseAnalysis(response.content);
  }

  private parseAnalysis(content: string): Analysis {
    try {
      const parsed = JSON.parse(content);
      return {
        summary: parsed.summary || 'No summary available',
        insights: parsed.insights || [],
        recommendations: parsed.recommendations || [],
        confidence: parsed.confidence || 0.5,
      };
    } catch {
      return {
        summary: content,
        insights: [],
        recommendations: [],
        confidence: 0.3,
      };
    }
  }
}
