/**
 * File Agent - A2A Agent that does REAL work
 *
 * This agent actually reads and analyzes files on disk.
 * No LLM needed for basic operations - it does real work.
 */

import { readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const PORT = 4001;

// Agent Card
const agentCard = {
  id: "file-agent",
  name: "File Agent",
  description: "Reads and analyzes files - does REAL work, not just LLM calls",
  version: "1.0.0",
  endpoint: `http://localhost:${PORT}/a2a`,
  capabilities: [
    {
      name: "list",
      description: "List files in a directory",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path" }
        },
        required: ["path"]
      }
    },
    {
      name: "read",
      description: "Read contents of a file",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path" }
        },
        required: ["path"]
      }
    },
    {
      name: "analyze",
      description: "Analyze a codebase - count files, lines, languages",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path" }
        },
        required: ["path"]
      }
    }
  ]
};

// Real file operations
async function listFiles(dirPath: string): Promise<any> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const files = [];

    for (const entry of entries.slice(0, 50)) { // Limit for safety
      const fullPath = join(dirPath, entry.name);
      const stats = await stat(fullPath).catch(() => null);

      files.push({
        name: entry.name,
        type: entry.isDirectory() ? "directory" : "file",
        size: stats?.size ?? 0,
        extension: entry.isFile() ? extname(entry.name) : null
      });
    }

    return {
      path: dirPath,
      count: files.length,
      files
    };
  } catch (error) {
    return { error: `Failed to list directory: ${error}` };
  }
}

async function readFile(filePath: string): Promise<any> {
  try {
    const file = Bun.file(filePath);
    const exists = await file.exists();

    if (!exists) {
      return { error: "File not found" };
    }

    const stats = await stat(filePath);
    const content = await file.text();
    const lines = content.split("\n");

    return {
      path: filePath,
      size: stats.size,
      lines: lines.length,
      preview: lines.slice(0, 20).join("\n"),
      truncated: lines.length > 20
    };
  } catch (error) {
    return { error: `Failed to read file: ${error}` };
  }
}

async function analyzeCodebase(dirPath: string): Promise<any> {
  const stats = {
    totalFiles: 0,
    totalLines: 0,
    totalSize: 0,
    byExtension: {} as Record<string, { count: number; lines: number; size: number }>,
    largestFiles: [] as { path: string; lines: number; size: number }[]
  };

  async function walk(dir: string) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip hidden and node_modules
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          const ext = extname(entry.name) || "(no ext)";
          const fileStats = await stat(fullPath).catch(() => null);
          if (!fileStats) continue;

          let lineCount = 0;
          try {
            const content = await Bun.file(fullPath).text();
            lineCount = content.split("\n").length;
          } catch {}

          stats.totalFiles++;
          stats.totalLines += lineCount;
          stats.totalSize += fileStats.size;

          if (!stats.byExtension[ext]) {
            stats.byExtension[ext] = { count: 0, lines: 0, size: 0 };
          }
          stats.byExtension[ext].count++;
          stats.byExtension[ext].lines += lineCount;
          stats.byExtension[ext].size += fileStats.size;

          stats.largestFiles.push({ path: fullPath, lines: lineCount, size: fileStats.size });
        }
      }
    } catch {}
  }

  await walk(dirPath);

  // Sort and limit largest files
  stats.largestFiles.sort((a, b) => b.lines - a.lines);
  stats.largestFiles = stats.largestFiles.slice(0, 5);

  return {
    path: dirPath,
    summary: {
      totalFiles: stats.totalFiles,
      totalLines: stats.totalLines,
      totalSizeKB: Math.round(stats.totalSize / 1024)
    },
    byExtension: stats.byExtension,
    largestFiles: stats.largestFiles
  };
}

// Handle A2A requests
async function handleA2A(request: Request): Promise<Response> {
  const body = await request.json() as any;
  const { id, method, params } = body;

  console.log(`[File Agent] ${method} - ${params?.path ?? "no path"}`);

  let result;

  switch (method) {
    case "list":
    case "file.list":
      result = await listFiles(params.path);
      break;

    case "read":
    case "file.read":
      result = await readFile(params.path);
      break;

    case "analyze":
    case "file.analyze":
      result = await analyzeCodebase(params.path);
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
      return Response.json({ status: "ok", agent: "file-agent" });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  }
});

console.log(`📁 File Agent running at http://localhost:${PORT}`);
console.log(`   Agent Card: http://localhost:${PORT}/.well-known/agent.json`);
console.log(`   NOTE: This agent does REAL work - no LLM needed!`);
