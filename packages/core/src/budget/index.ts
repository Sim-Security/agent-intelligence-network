/**
 * Budget Guard System
 * Tracks token usage and enforces cost limits
 */

import type {
  BudgetConfig,
  BudgetStatus,
  UsageRecord,
  CostEstimate,
  ModelPricing,
} from '../types/budget';

export * from '../types/budget';

const DEFAULT_PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4': { input: 15.0, output: 75.0 },
  'claude-sonnet-4': { input: 3.0, output: 15.0 },
  'claude-haiku-3.5': { input: 0.80, output: 4.0 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
};

export class BudgetGuard {
  private config: BudgetConfig;
  private records: UsageRecord[] = [];

  constructor(config: Partial<BudgetConfig> = {}) {
    this.config = {
      maxTokensPerSession: config.maxTokensPerSession ?? 100_000,
      maxCostPerSession: config.maxCostPerSession ?? 1.0,
      warningThreshold: config.warningThreshold ?? 0.8,
      hardStop: config.hardStop ?? true,
    };
  }

  // Estimate cost before making a call
  estimateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): CostEstimate {
    const pricing = this.getPricing(model);
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return {
      model,
      inputTokens,
      outputTokens,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    };
  }

  // Record usage after a call
  record(usage: Omit<UsageRecord, 'timestamp' | 'estimatedCost'>): UsageRecord {
    const estimate = this.estimateCost(
      usage.model,
      usage.inputTokens,
      usage.outputTokens
    );

    const record: UsageRecord = {
      ...usage,
      timestamp: new Date().toISOString(),
      estimatedCost: estimate.totalCost,
    };

    this.records.push(record);
    return record;
  }

  // Check if we can proceed with an operation
  canProceed(estimatedCost?: number): { allowed: boolean; reason?: string } {
    const status = this.getStatus();

    if (status.isExceeded && this.config.hardStop) {
      return {
        allowed: false,
        reason: `Budget exceeded: $${status.totalCost.toFixed(4)} / $${this.config.maxCostPerSession}`,
      };
    }

    if (estimatedCost && status.totalCost + estimatedCost > this.config.maxCostPerSession) {
      return {
        allowed: false,
        reason: `Operation would exceed budget: $${(status.totalCost + estimatedCost).toFixed(4)} > $${this.config.maxCostPerSession}`,
      };
    }

    return { allowed: true };
  }

  // Get current budget status
  getStatus(): BudgetStatus {
    const totalTokens = this.records.reduce(
      (sum, r) => sum + r.inputTokens + r.outputTokens,
      0
    );
    const totalCost = this.records.reduce((sum, r) => sum + r.estimatedCost, 0);
    const percentUsed = totalCost / this.config.maxCostPerSession;

    return {
      totalTokens,
      totalCost,
      remaining: {
        tokens: this.config.maxTokensPerSession - totalTokens,
        cost: this.config.maxCostPerSession - totalCost,
      },
      percentUsed,
      isWarning: percentUsed >= this.config.warningThreshold,
      isExceeded: totalCost >= this.config.maxCostPerSession,
      records: [...this.records],
    };
  }

  // Reset budget (new session)
  reset(): void {
    this.records = [];
  }

  // Update config
  configure(config: Partial<BudgetConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private getPricing(model: string): { input: number; output: number } {
    // Check for exact match
    if (DEFAULT_PRICING[model]) {
      return DEFAULT_PRICING[model];
    }

    // Check for Ollama (free)
    if (model.startsWith('ollama/') || model.includes('local')) {
      return { input: 0, output: 0 };
    }

    // Default to a conservative estimate
    console.warn(`Unknown model pricing for ${model}, using conservative estimate`);
    return { input: 10.0, output: 30.0 };
  }
}

// Singleton for easy access
let defaultGuard: BudgetGuard | null = null;

export function getBudgetGuard(config?: Partial<BudgetConfig>): BudgetGuard {
  if (!defaultGuard) {
    defaultGuard = new BudgetGuard(config);
  }
  return defaultGuard;
}

export function resetBudgetGuard(): void {
  defaultGuard = null;
}
