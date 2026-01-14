/**
 * Base Agent Class
 * Foundation for all agents in the network
 */

import {
  type AgentCard,
  type AgentCapability,
  type A2AMessage,
  type Task,
  type ProviderConfig,
  type LLMRequest,
  type LLMResponse,
  type BudgetConfig,
  createMessage,
  createTask,
  updateTaskStatus,
  BudgetGuard,
} from '@ain/core';

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  provider: ProviderConfig;
  budget?: Partial<BudgetConfig>;
}

export abstract class BaseAgent {
  readonly id: string;
  readonly name: string;
  readonly description: string;

  protected provider: ProviderConfig;
  protected budget: BudgetGuard;
  protected capabilities: AgentCapability[] = [];

  constructor(config: AgentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.provider = config.provider;
    this.budget = new BudgetGuard(config.budget);
  }

  // Get agent card for discovery
  getCard(): AgentCard {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: '0.1.0',
      capabilities: this.capabilities,
      endpoint: `/agents/${this.id}`,
    };
  }

  // Handle incoming A2A message
  async handleMessage(message: A2AMessage): Promise<A2AMessage> {
    const canProceed = this.budget.canProceed();
    if (!canProceed.allowed) {
      return createMessage('error', this.id, message.from, {
        code: 'BUDGET_EXCEEDED',
        message: canProceed.reason,
      });
    }

    try {
      const result = await this.process(message);
      return createMessage('task.response', this.id, message.from, result);
    } catch (error) {
      return createMessage('error', this.id, message.from, {
        code: 'PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Abstract method - implement in subclasses
  protected abstract process(message: A2AMessage): Promise<unknown>;

  // Call LLM with budget tracking
  protected async callLLM(request: LLMRequest): Promise<LLMResponse> {
    // Estimate cost first
    const estimatedTokens = this.estimateTokens(request);
    const estimate = this.budget.estimateCost(
      this.provider.model,
      estimatedTokens.input,
      estimatedTokens.output
    );

    const canProceed = this.budget.canProceed(estimate.totalCost);
    if (!canProceed.allowed) {
      throw new Error(canProceed.reason);
    }

    // Make the actual LLM call
    const response = await this.invokeLLM(request);

    // Record actual usage
    this.budget.record({
      agentId: this.id,
      model: this.provider.model,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
    });

    return response;
  }

  // Provider-specific LLM invocation
  private async invokeLLM(request: LLMRequest): Promise<LLMResponse> {
    switch (this.provider.type) {
      case 'anthropic':
        return this.callAnthropic(request);
      case 'openai':
        return this.callOpenAI(request);
      case 'openrouter':
        return this.callOpenRouter(request);
      case 'ollama':
        return this.callOllama(request);
      default:
        throw new Error(`Unknown provider: ${this.provider.type}`);
    }
  }

  private async callAnthropic(request: LLMRequest): Promise<LLMResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.provider.apiKey!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.provider.model,
        max_tokens: request.maxTokens ?? this.provider.maxTokens ?? 1024,
        system: request.system,
        messages: request.messages.map((m) => ({
          role: m.role === 'system' ? 'user' : m.role,
          content: m.content,
        })),
      }),
    });

    const data = await response.json() as any;

    return {
      content: data.content?.[0]?.text ?? '',
      model: data.model,
      usage: {
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
      },
      finishReason: data.stop_reason === 'end_turn' ? 'stop' : 'stop',
    };
  }

  private async callOpenAI(request: LLMRequest): Promise<LLMResponse> {
    const messages = request.system
      ? [{ role: 'system' as const, content: request.system }, ...request.messages]
      : request.messages;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.provider.apiKey}`,
      },
      body: JSON.stringify({
        model: this.provider.model,
        max_tokens: request.maxTokens ?? this.provider.maxTokens ?? 1024,
        messages,
      }),
    });

    const data = await response.json() as any;

    return {
      content: data.choices?.[0]?.message?.content ?? '',
      model: data.model,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
      finishReason: 'stop',
    };
  }

  private async callOpenRouter(request: LLMRequest): Promise<LLMResponse> {
    const messages = request.system
      ? [{ role: 'system' as const, content: request.system }, ...request.messages]
      : request.messages;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.provider.apiKey}`,
        'HTTP-Referer': 'https://github.com/agent-intelligence-network',
        'X-Title': 'Agent Intelligence Network',
      },
      body: JSON.stringify({
        model: this.provider.model,
        max_tokens: request.maxTokens ?? this.provider.maxTokens ?? 1024,
        messages,
      }),
    });

    const data = await response.json() as any;

    if (data.error) {
      throw new Error(data.error.message ?? 'OpenRouter API error');
    }

    return {
      content: data.choices?.[0]?.message?.content ?? '',
      model: data.model,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
      finishReason: 'stop',
    };
  }

  private async callOllama(request: LLMRequest): Promise<LLMResponse> {
    const baseUrl = this.provider.baseUrl ?? 'http://localhost:11434';

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.provider.model,
        messages: request.messages,
        stream: false,
      }),
    });

    const data = await response.json() as any;

    return {
      content: data.message?.content ?? '',
      model: this.provider.model,
      usage: {
        inputTokens: data.prompt_eval_count ?? 0,
        outputTokens: data.eval_count ?? 0,
      },
      finishReason: 'stop',
    };
  }

  private estimateTokens(request: LLMRequest): { input: number; output: number } {
    // Rough estimate: ~4 chars per token
    const inputChars = request.messages.reduce(
      (sum, m) => sum + m.content.length,
      request.system?.length ?? 0
    );
    return {
      input: Math.ceil(inputChars / 4),
      output: request.maxTokens ?? 1024,
    };
  }

  // Get budget status
  getBudgetStatus() {
    return this.budget.getStatus();
  }
}
