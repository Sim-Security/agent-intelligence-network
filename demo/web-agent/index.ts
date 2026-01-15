/**
 * Web Agent - A2A Agent that fetches real web content
 *
 * This agent actually fetches URLs and extracts content.
 * No LLM needed - it does real HTTP requests.
 */

const PORT = 4002;

// Agent Card
const agentCard = {
  id: "web-agent",
  name: "Web Agent",
  description: "Fetches and parses web pages - does REAL HTTP requests",
  version: "1.0.0",
  endpoint: `http://localhost:${PORT}/a2a`,
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
    // Remove scripts and styles
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    // Remove HTML tags
    .replace(/<[^>]+>/g, " ")
    // Decode entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    // Clean whitespace
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
    // Convert relative to absolute
    if (href.startsWith("/")) {
      const url = new URL(baseUrl);
      href = `${url.origin}${href}`;
    } else if (!href.startsWith("http")) {
      continue; // Skip non-http links
    }
    if (!links.includes(href)) {
      links.push(href);
    }
  }

  return links.slice(0, 50); // Limit
}

// Fetch URL
async function fetchUrl(url: string): Promise<any> {
  try {
    const start = Date.now();
    const response = await fetch(url, {
      headers: {
        "User-Agent": "A2A-Web-Agent/1.0"
      }
    });

    const elapsed = Date.now() - start;
    const html = await response.text();
    const text = htmlToText(html);

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
    return { url, error: `Failed to fetch: ${error}` };
  }
}

// Get headers
async function getHeaders(url: string): Promise<any> {
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

    return {
      url,
      status: response.status,
      statusText: response.statusText,
      headers
    };
  } catch (error) {
    return { url, error: `Failed to fetch headers: ${error}` };
  }
}

// Extract links
async function getLinks(url: string): Promise<any> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "A2A-Web-Agent/1.0"
      }
    });

    const html = await response.text();
    const links = extractLinks(html, url);

    return {
      url,
      linkCount: links.length,
      links
    };
  } catch (error) {
    return { url, error: `Failed to extract links: ${error}` };
  }
}

// Handle A2A requests
async function handleA2A(request: Request): Promise<Response> {
  const body = await request.json() as any;
  const { id, method, params } = body;

  console.log(`[Web Agent] ${method} - ${params?.url ?? "no url"}`);

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
      return Response.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Unknown method: ${method}` }
      });
  }

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
      return Response.json({ status: "ok", agent: "web-agent" });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  }
});

console.log(`🌐 Web Agent running at http://localhost:${PORT}`);
console.log(`   Agent Card: http://localhost:${PORT}/.well-known/agent.json`);
console.log(`   NOTE: This agent does REAL work - actual HTTP requests!`);
