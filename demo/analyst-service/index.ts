/**
 * Analyst Service - Standalone A2A Agent
 *
 * This service hosts the Analyst agent and exposes:
 * - /.well-known/agent.json - Agent Card for discovery
 * - /a2a - A2A JSON-RPC endpoint
 */

const PORT = 4002;

// Agent Card - describes this agent's capabilities
const agentCard = {
  id: "analyst-agent",
  name: "Analyst Agent",
  description: "Analysis and insight generation agent",
  version: "1.0.0",
  endpoint: `http://localhost:${PORT}/a2a`,
  capabilities: [
    {
      name: "analyze",
      description: "Perform deep analysis on data",
      inputSchema: {
        type: "object",
        properties: {
          data: { type: "object", description: "Data to analyze" },
          context: { type: "string", description: "Analysis context" }
        },
        required: ["data"]
      }
    },
    {
      name: "summarize",
      description: "Create executive summary",
      inputSchema: {
        type: "object",
        properties: {
          data: { type: "object", description: "Data to summarize" }
        },
        required: ["data"]
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
  const model = request.headers.get("x-openrouter-model") ?? "x-ai/grok-4.1-fast";

  if (!apiKey) {
    return Response.json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32003, message: "Missing x-openrouter-key header" }
    }, { status: 401 });
  }

  const body = await request.json() as any;
  const { id, method, params } = body;

  console.log(`[Analyst] Received A2A request: ${method}`);

  try {
    let result;

    if (method === "analyze" || method === "analyst.analyze") {
      const content = await callLLM(
        apiKey,
        model,
        `You are an expert analyst. Analyze the provided data and extract insights.
Return as JSON: {"summary": "...", "insights": ["..."], "recommendations": ["..."], "confidence": 0.0-1.0}`,
        `Analyze this data${params.context ? ` with context: ${params.context}` : ""}:

${JSON.stringify(params.data, null, 2)}

Return ONLY valid JSON.`
      );

      try {
        result = JSON.parse(content);
      } catch {
        result = { summary: content, insights: [], recommendations: [], confidence: 0.5 };
      }
    } else if (method === "summarize" || method === "analyst.summarize") {
      const content = await callLLM(
        apiKey,
        model,
        `You are an expert analyst. Create a concise executive summary.
Return as JSON: {"summary": "...", "keyPoints": ["..."]}`,
        `Summarize this data:

${JSON.stringify(params.data, null, 2)}

Return ONLY valid JSON.`
      );

      try {
        result = JSON.parse(content);
      } catch {
        result = { summary: content, keyPoints: [] };
      }
    } else {
      return Response.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Unknown method: ${method}` }
      });
    }

    console.log(`[Analyst] Completed: ${method}`);

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
      console.log("[Analyst] Agent Card requested");
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
      return Response.json({ status: "ok", agent: "analyst" });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  }
});

console.log(`📊 Analyst Service running at http://localhost:${PORT}`);
console.log(`   Agent Card: http://localhost:${PORT}/.well-known/agent.json`);
