/**
 * Scout Service - Standalone A2A Agent
 *
 * This service hosts the Scout agent and exposes:
 * - /.well-known/agent.json - Agent Card for discovery
 * - /a2a - A2A JSON-RPC endpoint
 */

const PORT = 4001;

// Agent Card - describes this agent's capabilities
const agentCard = {
  id: "scout-agent",
  name: "Scout Agent",
  description: "Research and information gathering agent",
  version: "1.0.0",
  endpoint: `http://localhost:${PORT}/a2a`,
  capabilities: [
    {
      name: "search",
      description: "Search for information on a topic",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" }
        },
        required: ["query"]
      }
    },
    {
      name: "monitor",
      description: "Monitor a source for updates",
      inputSchema: {
        type: "object",
        properties: {
          source: { type: "string", description: "URL or source to monitor" }
        },
        required: ["source"]
      }
    }
  ]
};

// Simple LLM call via OpenRouter
async function callLLM(apiKey: string, model: string, system: string, userMessage: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/agent-intelligence-network",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage }
      ],
      max_tokens: 1024
    })
  });

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content ?? "";
}

// Handle A2A requests
async function handleA2A(request: Request): Promise<Response> {
  const apiKey = request.headers.get("x-openrouter-key");
  const model = request.headers.get("x-openrouter-model") ?? "xiaomi/mimo-v2-flash:free";

  if (!apiKey) {
    return Response.json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32003, message: "Missing x-openrouter-key header" }
    }, { status: 401 });
  }

  const body = await request.json() as any;
  const { id, method, params } = body;

  console.log(`[Scout] Received A2A request: ${method}`);

  try {
    let result;

    if (method === "search" || method === "scout.search") {
      const content = await callLLM(
        apiKey,
        model,
        `You are a research scout. Search and find relevant information.
Return findings as JSON: {"findings": [{"title": "...", "summary": "...", "relevance": 0.0-1.0}]}`,
        `Search query: ${params.query}\n\nReturn ONLY valid JSON.`
      );

      try {
        result = JSON.parse(content);
      } catch {
        result = { findings: [{ title: "Research", summary: content, relevance: 0.5 }] };
      }
    } else if (method === "monitor" || method === "scout.monitor") {
      result = { status: "monitoring", source: params.source };
    } else {
      return Response.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Unknown method: ${method}` }
      });
    }

    console.log(`[Scout] Completed: ${method}`);

    return Response.json({
      jsonrpc: "2.0",
      id,
      result
    });

  } catch (error) {
    return Response.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32000, message: String(error) }
    });
  }
}

// Start server
Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*"
        }
      });
    }

    // Agent Card discovery (A2A standard)
    if (url.pathname === "/.well-known/agent.json" || url.pathname === "/agent-card") {
      console.log("[Scout] Agent Card requested");
      return Response.json(agentCard, {
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    // A2A endpoint
    if (url.pathname === "/a2a" && request.method === "POST") {
      const response = await handleA2A(request);
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Health check
    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json({ status: "ok", agent: "scout" });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  }
});

console.log(`🔍 Scout Service running at http://localhost:${PORT}`);
console.log(`   Agent Card: http://localhost:${PORT}/.well-known/agent.json`);
