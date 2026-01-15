/**
 * A2A Real-Time SSE Demo
 *
 * This demo subscribes to SSE events from all agents and displays
 * real-time activity as agents communicate.
 *
 * Run agents first:
 *   Terminal 1: bun run demo/file-agent/index.ts
 *   Terminal 2: bun run demo/web-agent/index.ts
 *   Terminal 3: bun run demo/run-sse-demo.ts
 */

// Colors
const c = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  bgCyan: "\x1b[46m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
};

// Agent colors
const agentColors: Record<string, string> = {
  "file-agent": c.cyan,
  "web-agent": c.green,
  "orchestrator": c.yellow,
};

function printBox(title: string, color: string) {
  const width = 70;
  const padding = Math.floor((width - title.length - 2) / 2);
  console.log(color + "╔" + "═".repeat(width) + "╗" + c.reset);
  console.log(color + "║" + " ".repeat(padding) + title + " ".repeat(width - padding - title.length) + "║" + c.reset);
  console.log(color + "╚" + "═".repeat(width) + "╝" + c.reset);
}

function printSection(title: string) {
  console.log();
  console.log(c.magenta + c.bright + "─".repeat(70) + c.reset);
  console.log(c.magenta + c.bright + "  " + title + c.reset);
  console.log(c.magenta + c.bright + "─".repeat(70) + c.reset);
  console.log();
}

function timestamp(): string {
  return new Date().toISOString().split("T")[1].slice(0, 12);
}

// Format agent event for display
function formatEvent(agent: string, event: string, data: any): string {
  const color = agentColors[agent] || c.dim;
  const icon = agent === "file-agent" ? "📁" : agent === "web-agent" ? "🌐" : "🎯";
  const ts = c.dim + timestamp() + c.reset;
  const agentLabel = color + c.bright + agent.padEnd(12) + c.reset;

  let eventDisplay = "";
  switch (event) {
    case "connected":
      eventDisplay = `${c.green}●${c.reset} Connected`;
      break;
    case "request":
      eventDisplay = `${c.yellow}◄${c.reset} REQUEST  ${c.bright}${data.method}${c.reset}`;
      if (data.params?.path) eventDisplay += ` path=${data.params.path}`;
      if (data.params?.url) eventDisplay += ` url=${data.params.url}`;
      break;
    case "processing":
      eventDisplay = `${c.blue}⟳${c.reset} ${data.step}`;
      if (data.filesFound) eventDisplay += ` (${data.filesFound} files)`;
      if (data.currentDir) eventDisplay += ` in ${data.currentDir}`;
      if (data.bytes) eventDisplay += ` (${data.bytes} bytes)`;
      if (data.status) eventDisplay += ` status=${data.status}`;
      break;
    case "response":
      const status = data.success ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
      eventDisplay = `${c.green}►${c.reset} RESPONSE ${status}`;
      if (data.summary?.totalFiles) eventDisplay += ` ${data.summary.totalFiles} files`;
      if (data.summary?.totalLines) eventDisplay += `, ${data.summary.totalLines} lines`;
      if (data.summary?.time) eventDisplay += ` in ${data.summary.time}ms`;
      break;
    case "error":
      eventDisplay = `${c.red}✗${c.reset} ERROR: ${data.message}`;
      break;
    default:
      eventDisplay = `${event}: ${JSON.stringify(data).slice(0, 50)}`;
  }

  return `  ${ts}  ${icon} ${agentLabel}  ${eventDisplay}`;
}

// Subscribe to agent SSE stream
async function subscribeToAgent(agentId: string, url: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok || !response.body) {
      console.log(`  ${c.red}✗${c.reset} Failed to connect to ${agentId}: ${response.status}`);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let currentEvent = "";
      let currentData = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7);
        } else if (line.startsWith("data: ")) {
          currentData = line.slice(6);
        } else if (line === "" && currentEvent && currentData) {
          try {
            const data = JSON.parse(currentData);
            console.log(formatEvent(agentId, currentEvent, data));
          } catch {}
          currentEvent = "";
          currentData = "";
        }
      }
    }
  } catch (error) {
    console.log(`  ${c.red}✗${c.reset} SSE connection failed for ${agentId}: ${error}`);
  }
}

// Agent storage
interface AgentCard {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  eventsEndpoint?: string;
  capabilities: { name: string; description: string }[];
}

const agents: Map<string, AgentCard> = new Map();

// Discover agent
async function discover(url: string): Promise<AgentCard | null> {
  try {
    const res = await fetch(`${url}/.well-known/agent.json`);
    if (!res.ok) return null;
    const card = await res.json() as AgentCard;
    agents.set(card.id, card);
    return card;
  } catch {
    return null;
  }
}

// Send A2A message
async function sendA2A(agentId: string, method: string, params: any): Promise<any> {
  const agent = agents.get(agentId);
  if (!agent) throw new Error(`Agent not found: ${agentId}`);

  const res = await fetch(agent.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now().toString(), method, params })
  });

  const data = await res.json() as any;
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

// Main demo
async function main() {
  console.clear();
  console.log();
  printBox("A2A PROTOCOL - REAL-TIME SSE DEMO", c.bgMagenta + c.bright);
  console.log();

  console.log(`  ${c.yellow}This demo shows REAL-TIME agent activity via SSE:${c.reset}`);
  console.log(`  ${c.dim}• Watch as agents receive requests${c.reset}`);
  console.log(`  ${c.dim}• See processing steps in real-time${c.reset}`);
  console.log(`  ${c.dim}• Observe responses being sent${c.reset}`);
  console.log();

  // ═══════════════════════════════════════════════════════════
  // PHASE 1: Discovery
  // ═══════════════════════════════════════════════════════════

  printSection("PHASE 1: AGENT DISCOVERY");

  // File Agent
  console.log(`  ${c.dim}GET http://localhost:4001/.well-known/agent.json${c.reset}`);
  const fileAgent = await discover("http://localhost:4001");
  if (fileAgent) {
    console.log(`  ${c.green}✓${c.reset} ${c.cyan}${fileAgent.name}${c.reset}`);
    console.log(`    ${c.dim}Capabilities: ${fileAgent.capabilities.map(c => c.name).join(", ")}${c.reset}`);
    console.log(`    ${c.dim}SSE: ${fileAgent.eventsEndpoint}${c.reset}`);
  } else {
    console.log(`  ${c.red}✗ File Agent not running. Start it first:${c.reset}`);
    console.log(`    ${c.dim}bun run demo/file-agent/index.ts${c.reset}`);
    process.exit(1);
  }

  console.log();

  // Web Agent
  console.log(`  ${c.dim}GET http://localhost:4002/.well-known/agent.json${c.reset}`);
  const webAgent = await discover("http://localhost:4002");
  if (webAgent) {
    console.log(`  ${c.green}✓${c.reset} ${c.green}${webAgent.name}${c.reset}`);
    console.log(`    ${c.dim}Capabilities: ${webAgent.capabilities.map(c => c.name).join(", ")}${c.reset}`);
    console.log(`    ${c.dim}SSE: ${webAgent.eventsEndpoint}${c.reset}`);
  } else {
    console.log(`  ${c.red}✗ Web Agent not running. Start it first:${c.reset}`);
    console.log(`    ${c.dim}bun run demo/web-agent/index.ts${c.reset}`);
    process.exit(1);
  }

  await Bun.sleep(1000);

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: Subscribe to SSE streams
  // ═══════════════════════════════════════════════════════════

  printSection("PHASE 2: CONNECTING TO SSE STREAMS");

  console.log(`  ${c.dim}Subscribing to agent event streams...${c.reset}`);
  console.log();

  // Start SSE subscriptions in background
  subscribeToAgent("file-agent", "http://localhost:4001/events");
  subscribeToAgent("web-agent", "http://localhost:4002/events");

  await Bun.sleep(500);

  // ═══════════════════════════════════════════════════════════
  // PHASE 3: Send requests and watch real-time activity
  // ═══════════════════════════════════════════════════════════

  printSection("PHASE 3: LIVE ACTIVITY FEED");

  console.log(`  ${c.yellow}Sending requests - watch the real-time activity below:${c.reset}`);
  console.log();
  console.log(c.dim + "─".repeat(70) + c.reset);
  console.log();

  await Bun.sleep(500);

  // Task 1: Analyze codebase
  console.log(`  ${c.bgYellow}${c.bright} ORCHESTRATOR ${c.reset} Sending: ${c.bright}analyze${c.reset} to File Agent`);
  console.log();

  const analysis = await sendA2A("file-agent", "analyze", { path: process.cwd() });

  await Bun.sleep(500);
  console.log();

  // Task 2: Fetch web page
  console.log(`  ${c.bgYellow}${c.bright} ORCHESTRATOR ${c.reset} Sending: ${c.bright}fetch${c.reset} to Web Agent`);
  console.log();

  const webResult = await sendA2A("web-agent", "fetch", {
    url: "https://a2aproject.github.io/A2A/"
  });

  await Bun.sleep(500);
  console.log();

  // Task 3: List files
  console.log(`  ${c.bgYellow}${c.bright} ORCHESTRATOR ${c.reset} Sending: ${c.bright}list${c.reset} to File Agent`);
  console.log();

  await sendA2A("file-agent", "list", { path: process.cwd() + "/demo" });

  await Bun.sleep(500);
  console.log();

  // Task 4: Extract links
  console.log(`  ${c.bgYellow}${c.bright} ORCHESTRATOR ${c.reset} Sending: ${c.bright}links${c.reset} to Web Agent`);
  console.log();

  await sendA2A("web-agent", "links", {
    url: "https://github.com/google/a2a-spec"
  });

  await Bun.sleep(1000);

  // ═══════════════════════════════════════════════════════════
  // Finale
  // ═══════════════════════════════════════════════════════════

  console.log();
  console.log(c.dim + "─".repeat(70) + c.reset);
  console.log();
  printBox("DEMO COMPLETE", c.bgGreen + c.bright);
  console.log();

  console.log(`  ${c.green}✓${c.reset} Real-time SSE activity streaming demonstrated`);
  console.log(`  ${c.green}✓${c.reset} File Agent analyzed ${analysis.summary.totalFiles} files`);
  console.log(`  ${c.green}✓${c.reset} Web Agent fetched page in ${webResult.fetchTimeMs}ms`);
  console.log(`  ${c.green}✓${c.reset} All agent activity visible in real-time`);
  console.log();

  console.log(`  ${c.bright}Key insight:${c.reset}`);
  console.log(`  ${c.dim}SSE streams let you observe agent behavior as it happens,${c.reset}`);
  console.log(`  ${c.dim}enabling dashboards, debugging, and transparency.${c.reset}`);
  console.log();

  process.exit(0);
}

main().catch(console.error);
