/**
 * LLM Provider Types (BYOK)
 */

export type ProviderType = 'anthropic' | 'openai' | 'openrouter' | 'ollama';

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;  // Not needed for Ollama
  baseUrl?: string; // Override for self-hosted
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMRequest {
  messages: ChatMessage[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'tool_use' | 'max_tokens';
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

// Headers for BYOK - keys passed per-request
export interface BYOKHeaders {
  'x-anthropic-key'?: string;
  'x-openai-key'?: string;
  'x-openrouter-key'?: string;
  'x-openrouter-model'?: string; // e.g., "anthropic/claude-3-haiku"
  'x-ollama-url'?: string;
}
