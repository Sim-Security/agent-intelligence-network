/**
 * @ain/core - Core A2A Protocol Implementation
 *
 * Zero-cost, BYOK agent-to-agent framework
 */

// Types
export type {
  AgentCard,
  AgentCapability,
  AuthenticationInfo,
  JsonSchema,
  A2AMessage,
  A2AMessageType,
  MessageMetadata,
  Task,
  TaskStatus,
  TaskError,
  A2ARequest,
  A2AResponse,
  A2AError,
} from './types/a2a';

export type {
  BudgetConfig,
  UsageRecord,
  BudgetStatus,
  CostEstimate,
} from './types/budget';

export type {
  ProviderType,
  ProviderConfig,
  LLMRequest,
  LLMResponse,
  ChatMessage,
  ToolDefinition,
  ToolCall,
  BYOKHeaders,
} from './types/provider';

// Protocol utilities
export {
  generateId,
  createMessage,
  createRequest,
  createResponse,
  createErrorResponse,
  createTask,
  updateTaskStatus,
  AgentRegistry,
  MessageRouter,
  A2AErrorCodes,
} from './protocol';

// Budget system
export {
  BudgetGuard,
  getBudgetGuard,
  resetBudgetGuard,
  ModelPricing,
} from './budget';
