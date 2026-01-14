/**
 * A2A Protocol Types
 * Based on Google's Agent-to-Agent protocol specification
 */

// Agent Card - describes an agent's capabilities
export interface AgentCard {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: AgentCapability[];
  endpoint: string;
  authentication?: AuthenticationInfo;
}

export interface AgentCapability {
  name: string;
  description: string;
  inputSchema?: JsonSchema;
  outputSchema?: JsonSchema;
}

export interface AuthenticationInfo {
  type: 'bearer' | 'api-key' | 'none';
  header?: string;
}

// JSON Schema subset for capability definitions
export interface JsonSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  description?: string;
}

// A2A Message Types
export interface A2AMessage {
  id: string;
  type: A2AMessageType;
  from: string;  // Agent ID
  to: string;    // Agent ID
  timestamp: string;
  payload: unknown;
  metadata?: MessageMetadata;
}

export type A2AMessageType =
  | 'task.send'
  | 'task.response'
  | 'task.status'
  | 'task.cancel'
  | 'agent.discover'
  | 'agent.info'
  | 'error';

export interface MessageMetadata {
  conversationId?: string;
  parentMessageId?: string;
  ttl?: number;
  priority?: 'low' | 'normal' | 'high';
}

// Task Types
export interface Task {
  id: string;
  type: string;
  input: unknown;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  result?: unknown;
  error?: TaskError;
}

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface TaskError {
  code: string;
  message: string;
  details?: unknown;
}

// Request/Response for A2A endpoints
export interface A2ARequest {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params?: unknown;
}

export interface A2AResponse {
  jsonrpc: '2.0';
  id: string;
  result?: unknown;
  error?: A2AError;
}

export interface A2AError {
  code: number;
  message: string;
  data?: unknown;
}

// Standard error codes
export const A2AErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // Custom codes
  BUDGET_EXCEEDED: -32000,
  AGENT_NOT_FOUND: -32001,
  TASK_NOT_FOUND: -32002,
  UNAUTHORIZED: -32003,
} as const;
