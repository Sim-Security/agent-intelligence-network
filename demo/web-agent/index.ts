/**
 * Web Agent - A2A Agent that fetches real web content
 *
 * This agent actually fetches URLs and extracts content.
 * No LLM needed - it does real HTTP requests.
 *
 * SSE endpoint at /events for real-time activity streaming.
 */

const PORT = 4002;
const AGENT_ID = "web-agent";
const AGENT_NAME = "Web Agent";

// SSE clients
const sseClients = new Set<ReadableStreamDefaultController>();

// Emit event to all SSE clients
function emit(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const controller of sseClients) {
    try {
      controller.enqueue(new TextEncoder().encode(payload));
    } catch {
      sseClients.delete(controller);
    }
  }
  // Also log to console with color
  const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);
  console.log(`\x1b[32m[${timestamp}]\x1b[0m \x1b[33m${event}\x1b[0m`, JSON.stringify(data).slice(0, 100));
}

// Agent Card
const agentCard = {
  id: AGENT_ID,
  name: AGENT_NAME,
  description: "Fetches and parses web pages - does REAL HTTP requests",
  version: "1.0.0",
  endpoint: `http://localhost:${PORT}/a2a`,
  eventsEndpoint: `http://localhost:${PORT}/events`,
  capabilities: [
    {
      name: "fetch",
      description: "Fetch a URL and extract text content",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to fetch" }
        },
        required: ["url"]
      }
    },
    {
      name: "headers",
      description: "Get HTTP headers from a URL",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to check" }
        },
        required: ["url"]
      }
    },
    {
      name: "links",
      description: "Extract all links from a page",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to parse" }
        },
        required: ["url"]
      }
    }
  ]
};

// Simple HTML to text conversion
function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// Extract links from HTML
function extractLinks(html: string, baseUrl: string): string[] {
  const linkRegex = /href=["']([^"']+)["']/gi;
  const links: string[] = [];
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1];
    if (href.startsWith("/")) {
      const url = new URL(baseUrl);
      href = `${url.origin}${href}`;
    } else if (!href.startsWith("http")) {
      continue;
    }
    if (!links.includes(href)) {
      links.push(href);
    }
  }

  return links.slice(0, 50);
}

// Get short URL for display
function shortUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname + (parsed.pathname.length > 20 ? parsed.pathname.slice(0, 20) + "..." : parsed.pathname);
  } catch {
    return url.slice(0, 40);
  }
}

// Fetch URL
async function fetchUrl(url: string): Promise<any> {
  emit("processing", { step: "connecting", url: shortUrl(url) });

  try {
    const start = Date.now();
    const response = await fetch(url, {
      headers: {
        "User-Agent": "A2A-Web-Agent/1.0"
      }
    });

    emit("processing", { step: "downloading", status: response.status });

    const html = await response.text();

    emit("processing", { step: "parsing", bytes: html.length });

    const text = htmlToText(html);
    const elapsed = Date.now() - start;

    emit("processing", { step: "complete", timeMs: elapsed, textLength: text.length });

    return {
      url,
      status: response.status,
      contentType: response.headers.get("content-type"),
      fetchTimeMs: elapsed,
      contentLength: html.length,
      textPreview: text.slice(0, 1000),
      truncated: text.length > 1000
    };
  } catch (error) {
    emit("error", { url: shortUrl(url), message: String(error) });
    return { url, error: `Failed to fetch: ${error}` };
  }
}

// Get headers
async function getHeaders(url: string): Promise<any> {
  emit("processing", { step: "head_request", url: shortUrl(url) });

  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "A2A-Web-Agent/1.0"
      }
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    emit("processing", { step: "complete", headerCount: Object.keys(headers).length });

    return {
      url,
      status: response.status,
      statusText: response.statusText,
      headers
    };
  } catch (error) {
    emit("error", { url: shortUrl(url), message: String(error) });
    return { url, error: `Failed to fetch headers: ${error}` };
  }
}

// Extract links
async function getLinks(url: string): Promise<any> {
  emit("processing", { step: "fetching_page", url: shortUrl(url) });

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "A2A-Web-Agent/1.0"
      }
    });

    const html = await response.text();

    emit("processing", { step: "extracting_links", pageSize: html.length });

    const links = extractLinks(html, url);

    emit("processing", { step: "complete", linksFound: links.length });

    return {
      url,
      linkCount: links.length,
      links
    };
  } catch (error) {
    emit("error", { url: shortUrl(url), message: String(error) });
    return { url, error: `Failed to extract links: ${error}` };
  }
}

// Handle A2A requests
async function handleA2A(request: Request): Promise<Response> {
  const body = await request.json() as any;
  const { id, method, params } = body;

  // Emit request received
  emit("request", {
    id,
    method,
    params: { url: params?.url ? shortUrl(params.url) : "none" }
  });

  let result;

  switch (method) {
    case "fetch":
    case "web.fetch":
      result = await fetchUrl(params.url);
      break;

    case "headers":
    case "web.headers":
      result = await getHeaders(params.url);
      break;

    case "links":
    case "web.links":
      result = await getLinks(params.url);
      break;

    default:
      emit("error", { id, message: `Unknown method: ${method}` });
      return Response.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Unknown method: ${method}` }
      });
  }

  // Emit response
  emit("response", {
    id,
    success: !result.error,
    summary: result.error
      ? { error: result.error }
      : { status: result.status, time: result.fetchTimeMs, links: result.linkCount }
  });

  return Response.json({
    jsonrpc: "2.0",
    id,
    result
  });
}

// Server
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

    // SSE Events endpoint
    if (url.pathname === "/events") {
      const stream = new ReadableStream({
        start(controller) {
          sseClients.add(controller);
          // Send initial connection event
          const payload = `event: connected\ndata: ${JSON.stringify({ agent: AGENT_ID, name: AGENT_NAME })}\n\n`;
          controller.enqueue(new TextEncoder().encode(payload));
        },
        cancel(controller) {
          sseClients.delete(controller);
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Agent Card
    if (url.pathname === "/.well-known/agent.json" || url.pathname === "/agent-card") {
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

    // Health
    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json({ status: "ok", agent: AGENT_ID, sseClients: sseClients.size });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  }
});

console.log(`\x1b[32m🌐 Web Agent\x1b[0m running at http://localhost:${PORT}`);
console.log(`   Agent Card: http://localhost:${PORT}/.well-known/agent.json`);
console.log(`   \x1b[33mSSE Events: http://localhost:${PORT}/events\x1b[0m`);
console.log(`   NOTE: This agent does REAL work - actual HTTP requests!`);
console.log();
console.log(`\x1b[2m   Waiting for A2A requests...\x1b[0m`);
