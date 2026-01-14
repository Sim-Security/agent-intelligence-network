/**
 * A2A Real Work Demo
 *
 * This demo shows agents doing REAL WORK:
 * - File Agent: Actually reads files on disk
 * - Web Agent: Actually fetches URLs
 *
 * NO API KEY NEEDED for basic operations!
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
};

function printBox(title: string, color: string) {
  const width = 60;
  const padding = Math.floor((width - title.length - 2) / 2);
  console.log(color + "╔" + "═".repeat(width) + "╗" + c.reset);
  console.log(color + "║" + " ".repeat(padding) + title + " ".repeat(width - padding - title.length) + "║" + c.reset);
  console.log(color + "╚" + "═".repeat(width) + "╝" + c.reset);
}

function printSection(title: string) {
  console.log();
  console.log(c.cyan + c.bright + "━".repeat(60) + c.reset);
  console.log(c.cyan + c.bright + "  " + title + c.reset);
  console.log(c.cyan + c.bright + "━".repeat(60) + c.reset);
  console.log();
}

// Agent storage
interface AgentCard {
  id: string;
  name: string;
  description: string;
  endpoint: string;
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
  printBox("A2A PROTOCOL - REAL WORK DEMO", c.bgCyan + c.bright);
  console.log();

  console.log(`  ${c.yellow}This demo shows agents doing ACTUAL work:${c.reset}`);
  console.log(`  ${c.dim}• File Agent reads real files on disk${c.reset}`);
  console.log(`  ${c.dim}• Web Agent makes real HTTP requests${c.reset}`);
  console.log(`  ${c.dim}• No LLM/API keys needed for these operations!${c.reset}`);

  await Bun.sleep(1500);

  // ═══════════════════════════════════════════════════════════
  // PHASE 1: Discovery
  // ═══════════════════════════════════════════════════════════

  printSection("PHASE 1: AGENT DISCOVERY");

  console.log(`  ${c.dim}Discovering agents via A2A protocol...${c.reset}`);
  console.log();

  // File Agent
  console.log(`  ${c.dim}GET http://localhost:4001/.well-known/agent.json${c.reset}`);
  await Bun.sleep(300);

  const fileAgent = await discover("http://localhost:4001");
  if (fileAgent) {
    console.log(`  ${c.green}✓${c.reset} ${c.bright}${fileAgent.name}${c.reset}`);
    console.log(`    ${c.dim}Capabilities: ${fileAgent.capabilities.map(c => c.name).join(", ")}${c.reset}`);
  } else {
    console.log(`  ${c.red}✗ File Agent not running. Start it first:${c.reset}`);
    console.log(`    ${c.dim}bun run demo/file-agent/index.ts${c.reset}`);
    process.exit(1);
  }

  await Bun.sleep(300);
  console.log();

  // Web Agent
  console.log(`  ${c.dim}GET http://localhost:4002/.well-known/agent.json${c.reset}`);
  await Bun.sleep(300);

  const webAgent = await discover("http://localhost:4002");
  if (webAgent) {
    console.log(`  ${c.green}✓${c.reset} ${c.bright}${webAgent.name}${c.reset}`);
    console.log(`    ${c.dim}Capabilities: ${webAgent.capabilities.map(c => c.name).join(", ")}${c.reset}`);
  } else {
    console.log(`  ${c.red}✗ Web Agent not running. Start it first:${c.reset}`);
    console.log(`    ${c.dim}bun run demo/web-agent/index.ts${c.reset}`);
    process.exit(1);
  }

  await Bun.sleep(1000);

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: Real Task - Analyze this repo
  // ═══════════════════════════════════════════════════════════

  printSection("PHASE 2: REAL TASK - ANALYZE THIS PROJECT");

  console.log(`  ${c.yellow}Task: Analyze the agent-intelligence-network codebase${c.reset}`);
  console.log();
  console.log(`  ${c.dim}The File Agent will ACTUALLY read files from disk...${c.reset}`);

  await Bun.sleep(800);
  console.log();

  console.log(`  ${c.bgYellow}${c.bright} SENDING A2A MESSAGE ${c.reset}`);
  console.log(`  ${c.bright}Orchestrator${c.reset} ${c.yellow}──────►${c.reset} ${c.bright}File Agent${c.reset}`);
  console.log(`  ${c.dim}Method: analyze${c.reset}`);
  console.log(`  ${c.dim}Params: { path: "${process.cwd()}" }${c.reset}`);
  console.log();

  await Bun.sleep(500);

  const analysis = await sendA2A("file-agent", "analyze", { path: process.cwd() });

  console.log(`  ${c.green}✓ Response received${c.reset}`);
  console.log();
  console.log(`  ${c.bright}Results (REAL DATA from disk):${c.reset}`);
  console.log(`    ${c.cyan}Total files:${c.reset} ${analysis.summary.totalFiles}`);
  console.log(`    ${c.cyan}Total lines:${c.reset} ${analysis.summary.totalLines}`);
  console.log(`    ${c.cyan}Total size:${c.reset} ${analysis.summary.totalSizeKB} KB`);
  console.log();
  console.log(`  ${c.bright}By file type:${c.reset}`);
  for (const [ext, stats] of Object.entries(analysis.byExtension).slice(0, 5) as any) {
    console.log(`    ${c.dim}${ext}:${c.reset} ${stats.count} files, ${stats.lines} lines`);
  }

  await Bun.sleep(1500);

  // ═══════════════════════════════════════════════════════════
  // PHASE 3: Real Task - Fetch GitHub
  // ═══════════════════════════════════════════════════════════

  printSection("PHASE 3: REAL TASK - FETCH WEB CONTENT");

  console.log(`  ${c.yellow}Task: Fetch the A2A protocol spec from GitHub${c.reset}`);
  console.log();
  console.log(`  ${c.dim}The Web Agent will make a REAL HTTP request...${c.reset}`);

  await Bun.sleep(800);
  console.log();

  console.log(`  ${c.bgYellow}${c.bright} SENDING A2A MESSAGE ${c.reset}`);
  console.log(`  ${c.bright}Orchestrator${c.reset} ${c.yellow}──────►${c.reset} ${c.bright}Web Agent${c.reset}`);
  console.log(`  ${c.dim}Method: fetch${c.reset}`);
  console.log(`  ${c.dim}Params: { url: "https://a2aproject.github.io/A2A/" }${c.reset}`);
  console.log();

  await Bun.sleep(500);

  const webResult = await sendA2A("web-agent", "fetch", {
    url: "https://a2aproject.github.io/A2A/"
  });

  console.log(`  ${c.green}✓ Response received${c.reset}`);
  console.log();
  console.log(`  ${c.bright}Results (REAL HTTP response):${c.reset}`);
  console.log(`    ${c.cyan}Status:${c.reset} ${webResult.status}`);
  console.log(`    ${c.cyan}Content-Type:${c.reset} ${webResult.contentType}`);
  console.log(`    ${c.cyan}Fetch time:${c.reset} ${webResult.fetchTimeMs}ms`);
  console.log(`    ${c.cyan}Content length:${c.reset} ${webResult.contentLength} bytes`);
  console.log();
  console.log(`  ${c.bright}Preview:${c.reset}`);
  console.log(`  ${c.dim}${webResult.textPreview?.slice(0, 200)}...${c.reset}`);

  await Bun.sleep(1000);

  // ═══════════════════════════════════════════════════════════
  // Finale
  // ═══════════════════════════════════════════════════════════

  console.log();
  printBox("DEMO COMPLETE", c.bgGreen + c.bright);
  console.log();

  console.log(`  ${c.green}✓${c.reset} Two agents discovered via A2A Agent Cards`);
  console.log(`  ${c.green}✓${c.reset} File Agent analyzed ${analysis.summary.totalFiles} real files`);
  console.log(`  ${c.green}✓${c.reset} Web Agent fetched real web content in ${webResult.fetchTimeMs}ms`);
  console.log(`  ${c.green}✓${c.reset} No LLM or API keys needed for these operations!`);
  console.log();

  console.log(`  ${c.bright}Key insight:${c.reset}`);
  console.log(`  ${c.dim}A2A agents can do real work, not just LLM calls.${c.reset}`);
  console.log(`  ${c.dim}They're services that can be discovered and coordinated.${c.reset}`);
  console.log();
}

main().catch(console.error);
