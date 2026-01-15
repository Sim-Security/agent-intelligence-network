/**
 * Agent Intelligence Network - Cloudflare Workers API
 *
 * BYOK (Bring Your Own Key) - API keys passed via headers, never stored
 */

import {
  type A2ARequest,
  type A2AResponse,
  type BYOKHeaders,
  type ProviderConfig,
  createResponse,
  createErrorResponse,
  AgentRegistry,
  MessageRouter,
  A2AErrorCodes,
  getBudgetGuard,
} from '@ain/core';

import { ScoutAgent, AnalystAgent } from '@ain/agents';

// Types for Cloudflare Workers
interface Env {
  // No secrets - BYOK model
}

// CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, x-anthropic-key, x-openai-key, x-openrouter-key, x-openrouter-model, x-ollama-url, x-budget-limit',
};

// Extract BYOK headers
function extractKeys(headers: Headers): BYOKHeaders {
  return {
    'x-anthropic-key': headers.get('x-anthropic-key') ?? undefined,
    'x-openai-key': headers.get('x-openai-key') ?? undefined,
    'x-openrouter-key': headers.get('x-openrouter-key') ?? undefined,
    'x-openrouter-model': headers.get('x-openrouter-model') ?? undefined,
    'x-ollama-url': headers.get('x-ollama-url') ?? undefined,
  };
}

// Build provider config from headers
function buildProviderConfig(keys: BYOKHeaders): ProviderConfig | null {
  // OpenRouter first - most flexible option
  if (keys['x-openrouter-key']) {
    return {
      type: 'openrouter',
      apiKey: keys['x-openrouter-key'],
      model: keys['x-openrouter-model'] ?? 'x-ai/grok-4.1-fast', // Default model
    };
  }
  if (keys['x-anthropic-key']) {
    return {
      type: 'anthropic',
      apiKey: keys['x-anthropic-key'],
      model: 'claude-haiku-3.5', // Default to cheapest
    };
  }
  if (keys['x-openai-key']) {
    return {
      type: 'openai',
      apiKey: keys['x-openai-key'],
      model: 'gpt-4o-mini', // Default to cheapest
    };
  }
  if (keys['x-ollama-url']) {
    return {
      type: 'ollama',
      baseUrl: keys['x-ollama-url'],
      model: 'llama3.2', // Common default
    };
  }
  return null;
}

// Main request handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Health check
      if (path === '/' || path === '/health') {
        return jsonResponse({ status: 'ok', version: '0.1.0' });
      }

      // Agent discovery
      if (path === '/agents' && request.method === 'GET') {
        return handleAgentDiscovery();
      }

      // A2A JSON-RPC endpoint
      if (path === '/a2a' && request.method === 'POST') {
        return handleA2ARequest(request);
      }

      // Budget status
      if (path === '/budget' && request.method === 'GET') {
        return handleBudgetStatus();
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (error) {
      console.error('Request error:', error);
      return jsonResponse(
        { error: error instanceof Error ? error.message : 'Internal error' },
        500
      );
    }
  },
};

// Handler functions
function handleAgentDiscovery(): Response {
  const agents = [
    {
      id: 'scout',
      name: 'Scout Agent',
      description: 'Monitors sources and searches for information',
      capabilities: ['monitor', 'search'],
    },
    {
      id: 'analyst',
      name: 'Analyst Agent',
      description: 'Performs deep analysis and generates insights',
      capabilities: ['analyze', 'compare', 'summarize'],
    },
  ];

  return jsonResponse({ agents });
}

async function handleA2ARequest(request: Request): Promise<Response> {
  const keys = extractKeys(request.headers);
  const provider = buildProviderConfig(keys);

  if (!provider) {
    return jsonResponse(
      createErrorResponse(
        'unknown',
        A2AErrorCodes.UNAUTHORIZED,
        'No API key provided. Include x-openrouter-key, x-anthropic-key, x-openai-key, or x-ollama-url header.'
      ),
      401
    );
  }

  // Parse budget limit from header
  const budgetLimit = parseFloat(
    request.headers.get('x-budget-limit') ?? '1.0'
  );

  const body = (await request.json()) as A2ARequest;

  // Validate JSON-RPC format
  if (body.jsonrpc !== '2.0' || !body.method) {
    return jsonResponse(
      createErrorResponse(body.id ?? 'unknown', A2AErrorCodes.INVALID_REQUEST, 'Invalid JSON-RPC request'),
      400
    );
  }

  // Route to appropriate handler
  const result = await routeA2AMethod(body, provider, budgetLimit);
  return jsonResponse(result);
}

async function routeA2AMethod(
  request: A2ARequest,
  provider: ProviderConfig,
  budgetLimit: number
): Promise<A2AResponse> {
  const { method, params, id } = request;

  // Create agents with user's provider config
  const scout = new ScoutAgent({ provider, budget: { maxCostPerSession: budgetLimit } });
  const analyst = new AnalystAgent({ provider, budget: { maxCostPerSession: budgetLimit } });

  switch (method) {
    case 'scout.monitor':
      const monitorResult = await scout.handleMessage({
        id: id,
        type: 'task.send',
        from: 'api',
        to: 'scout',
        timestamp: new Date().toISOString(),
        payload: { type: 'monitor', source: (params as any)?.source },
      });
      return createResponse(id, monitorResult.payload);

    case 'scout.search':
      const searchResult = await scout.handleMessage({
        id: id,
        type: 'task.send',
        from: 'api',
        to: 'scout',
        timestamp: new Date().toISOString(),
        payload: { type: 'search', query: (params as any)?.query },
      });
      return createResponse(id, searchResult.payload);

    case 'analyst.analyze':
      const analyzeResult = await analyst.handleMessage({
        id: id,
        type: 'task.send',
        from: 'api',
        to: 'analyst',
        timestamp: new Date().toISOString(),
        payload: { type: 'analyze', data: (params as any)?.data, context: (params as any)?.context },
      });
      return createResponse(id, analyzeResult.payload);

    case 'analyst.summarize':
      const summarizeResult = await analyst.handleMessage({
        id: id,
        type: 'task.send',
        from: 'api',
        to: 'analyst',
        timestamp: new Date().toISOString(),
        payload: { type: 'summarize', data: (params as any)?.data },
      });
      return createResponse(id, summarizeResult.payload);

    default:
      return createErrorResponse(id, A2AErrorCodes.METHOD_NOT_FOUND, `Unknown method: ${method}`);
  }
}

function handleBudgetStatus(): Response {
  const budget = getBudgetGuard();
  return jsonResponse(budget.getStatus());
}

// Helper to create JSON responses with CORS
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}
