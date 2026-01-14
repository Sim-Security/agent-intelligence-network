/**
 * A2A Protocol Implementation
 */

import type {
  A2AMessage,
  A2AMessageType,
  A2ARequest,
  A2AResponse,
  A2AError,
  A2AErrorCodes,
  AgentCard,
  Task,
  TaskStatus,
} from '../types/a2a';

export * from '../types/a2a';

// Generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// Create an A2A message
export function createMessage(
  type: A2AMessageType,
  from: string,
  to: string,
  payload: unknown
): A2AMessage {
  return {
    id: generateId(),
    type,
    from,
    to,
    timestamp: new Date().toISOString(),
    payload,
  };
}

// Create a JSON-RPC request
export function createRequest(method: string, params?: unknown): A2ARequest {
  return {
    jsonrpc: '2.0',
    id: generateId(),
    method,
    params,
  };
}

// Create a JSON-RPC response
export function createResponse(id: string, result: unknown): A2AResponse {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

// Create an error response
export function createErrorResponse(
  id: string,
  code: number,
  message: string,
  data?: unknown
): A2AResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message, data },
  };
}

// Task factory
export function createTask(type: string, input: unknown): Task {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    type,
    input,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
}

// Update task status
export function updateTaskStatus(
  task: Task,
  status: TaskStatus,
  result?: unknown,
  error?: { code: string; message: string }
): Task {
  return {
    ...task,
    status,
    updatedAt: new Date().toISOString(),
    result,
    error,
  };
}

// Agent registry for discovery
export class AgentRegistry {
  private agents: Map<string, AgentCard> = new Map();

  register(agent: AgentCard): void {
    this.agents.set(agent.id, agent);
  }

  unregister(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  get(agentId: string): AgentCard | undefined {
    return this.agents.get(agentId);
  }

  list(): AgentCard[] {
    return Array.from(this.agents.values());
  }

  findByCapability(capabilityName: string): AgentCard[] {
    return this.list().filter((agent) =>
      agent.capabilities.some((cap) => cap.name === capabilityName)
    );
  }
}

// Message router
export class MessageRouter {
  private handlers: Map<string, (msg: A2AMessage) => Promise<unknown>> =
    new Map();

  on(
    agentId: string,
    handler: (msg: A2AMessage) => Promise<unknown>
  ): void {
    this.handlers.set(agentId, handler);
  }

  off(agentId: string): void {
    this.handlers.delete(agentId);
  }

  async route(message: A2AMessage): Promise<A2AMessage> {
    const handler = this.handlers.get(message.to);

    if (!handler) {
      return createMessage('error', 'system', message.from, {
        code: 'AGENT_NOT_FOUND',
        message: `Agent ${message.to} not found`,
      });
    }

    try {
      const result = await handler(message);
      return createMessage('task.response', message.to, message.from, result);
    } catch (error) {
      return createMessage('error', message.to, message.from, {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
