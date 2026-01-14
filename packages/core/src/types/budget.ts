/**
 * Budget and Cost Tracking Types
 */

export interface BudgetConfig {
  maxTokensPerSession: number;
  maxCostPerSession: number;  // in USD
  warningThreshold: number;   // 0-1, percentage
  hardStop: boolean;          // Stop agents when limit hit
}

export interface UsageRecord {
  timestamp: string;
  agentId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  taskId?: string;
}

export interface BudgetStatus {
  totalTokens: number;
  totalCost: number;
  remaining: {
    tokens: number;
    cost: number;
  };
  percentUsed: number;
  isWarning: boolean;
  isExceeded: boolean;
  records: UsageRecord[];
}

// Model pricing (per 1M tokens) - updated as of 2026
export const ModelPricing: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-opus-4': { input: 15.0, output: 75.0 },
  'claude-sonnet-4': { input: 3.0, output: 15.0 },
  'claude-haiku-3.5': { input: 0.80, output: 4.0 },
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  // Local (Ollama) - free
  'ollama/*': { input: 0, output: 0 },
};

export interface CostEstimate {
  model: string;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}
