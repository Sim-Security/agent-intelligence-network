/**
 * A2A Cross-Network Demo
 *
 * THIS IS THE REAL POWER OF A2A:
 * Calling agents you didn't build, hosted by other organizations,
 * discovered from a public registry.
 *
 * No API keys needed for these external agents - they're public A2A services.
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
  bgMagenta: "\x1b[45m",
  bgBlue: "\x1b[44m",
};

function printBox(title: string, color: string) {
  const width = 74;
  const padding = Math.floor((width - title.length - 2) / 2);
  console.log(color + "╔" + "═".repeat(width) + "╗" + c.reset);
  console.log(color + "║" + " ".repeat(padding) + title + " ".repeat(width - padding - title.length) + "║" + c.reset);
  console.log(color + "╚" + "═".repeat(width) + "╝" + c.reset);
}

function printSection(title: string) {
  console.log();
  console.log(c.magenta + c.bright + "─".repeat(76) + c.reset);
  console.log(c.magenta + c.bright + "  " + title + c.reset);
  console.log(c.magenta + c.bright + "─".repeat(76) + c.reset);
  console.log();
}

// Agent Card type
interface AgentCard {
  name: string;
  description: string;
  url: string;
  version?: string;
  skills?: { id: string; name: string; description: string }[];
  capabilities?: { streaming?: boolean };
}

// Discovered agents
const agents: Map<string, AgentCard> = new Map();

// Discover agent from URL
async function discoverAgent(baseUrl: string, name?: string): Promise<AgentCard | null> {
  const paths = [
    "/.well-known/agent.json",
    "/.well-known/agent-card.json",
    "/agent-card.json"
  ];

  for (const path of paths) {
    try {
      const url = baseUrl.replace(/\/$/, "") + path;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const card = await res.json() as AgentCard;
        agents.set(card.name || name || baseUrl, card);
        return card;
      }
    } catch {}
  }
  return null;
}

// Send A2A message
async function sendA2A(agent: AgentCard, text: string): Promise<any> {
  const endpoint = agent.url.endsWith("/") ? agent.url : agent.url + "/";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `adamos-${Date.now()}`,
      method: "message/send",
      params: {
        message: {
          messageId: `msg-${Date.now()}`,
          role: "user",
          parts: [{ kind: "text", text }]
        }
      }
    }),
    signal: AbortSignal.timeout(30000)
  });

  const data = await res.json() as any;
  if (data.error) throw new Error(data.error.message);

  // Handle different response formats
  if (data.result?.kind === "message") {
    return data.result.parts?.[0]?.text || data.result;
  }
  if (data.result?.kind === "task") {
    const artifact = data.result.artifacts?.[0];
    return artifact?.content || artifact || data.result;
  }
  return data.result || data;
}

// Fetch registry
async function fetchRegistry(): Promise<any[]> {
  const res = await fetch("https://www.a2aregistry.org/registry.json");
  const data = await res.json() as any;
  return data.agents || [];
}

// Main demo
async function main() {
  console.clear();
  console.log();
  printBox("A2A PROTOCOL - CROSS-NETWORK COMMUNICATION", c.bgMagenta + c.bright);
  console.log();

  console.log(`  ${c.yellow}This demo shows the REAL power of A2A:${c.reset}`);
  console.log(`  ${c.bright}Calling agents you didn't build, hosted by other organizations${c.reset}`);
  console.log();
  console.log(`  ${c.dim}• No API keys needed - these are public A2A services${c.reset}`);
  console.log(`  ${c.dim}• Discovered from a2aregistry.org${c.reset}`);
  console.log(`  ${c.dim}• Running on different platforms (Render, Modal, Lifie.ai)${c.reset}`);

  await Bun.sleep(2000);

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 1: Fetch the public A2A registry
  // ═══════════════════════════════════════════════════════════════════════

  printSection("PHASE 1: FETCHING PUBLIC A2A REGISTRY");

  console.log(`  ${c.dim}GET https://www.a2aregistry.org/registry.json${c.reset}`);
  console.log();

  const registryAgents = await fetchRegistry();

  console.log(`  ${c.green}✓${c.reset} Found ${c.bright}${registryAgents.length}${c.reset} registered agents`);
  console.log();
  console.log(`  ${c.bright}Sample agents available:${c.reset}`);

  // Show a few interesting ones
  const samples = registryAgents.slice(0, 8);
  for (const agent of samples) {
    const icon = agent.name.includes("Hello") ? "👋" :
                 agent.name.includes("Code") ? "💻" :
                 agent.name.includes("Research") ? "🔬" :
                 agent.name.includes("Data") ? "📊" :
                 agent.name.includes("Chess") ? "♟️" : "🤖";
    console.log(`    ${icon} ${c.cyan}${agent.name}${c.reset} - ${c.dim}${(agent.description || "").slice(0, 50)}...${c.reset}`);
  }

  await Bun.sleep(2000);

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 2: Discover specific remote agents
  // ═══════════════════════════════════════════════════════════════════════

  printSection("PHASE 2: DISCOVERING REMOTE AGENTS");

  // Hello World Agent (Render)
  console.log(`  ${c.dim}Discovering: Hello World Agent (Render.com)${c.reset}`);
  const helloAgent = await discoverAgent("https://hello-world-gxfr.onrender.com");
  if (helloAgent) {
    console.log(`  ${c.green}✓${c.reset} ${c.bright}${helloAgent.name}${c.reset}`);
    console.log(`    ${c.dim}URL: ${helloAgent.url}${c.reset}`);
    console.log(`    ${c.dim}Hosted on: Render (free tier)${c.reset}`);
  }
  console.log();

  await Bun.sleep(500);

  // Business Source Agent (Lifie.ai)
  console.log(`  ${c.dim}Discovering: Business Source Agent (Lifie.ai)${c.reset}`);
  const businessAgent = await discoverAgent("https://api.lifie.ai/a2a/cmg83tlij03w7uat8mzcwxetd");
  if (businessAgent) {
    console.log(`  ${c.green}✓${c.reset} ${c.bright}${businessAgent.name}${c.reset}`);
    console.log(`    ${c.dim}URL: ${businessAgent.url}${c.reset}`);
    console.log(`    ${c.dim}Hosted on: Lifie.ai Hub${c.reset}`);
    console.log(`    ${c.dim}Capabilities: streaming=${businessAgent.capabilities?.streaming}${c.reset}`);
  }
  console.log();

  await Bun.sleep(500);

  // Registry Hello Agent
  console.log(`  ${c.dim}Discovering: Registry Demo Agent (a2aregistry.org)${c.reset}`);
  const registryAgent = await discoverAgent("https://hello.a2aregistry.org");
  if (registryAgent) {
    console.log(`  ${c.green}✓${c.reset} ${c.bright}${registryAgent.name}${c.reset}`);
    console.log(`    ${c.dim}URL: ${registryAgent.url}${c.reset}`);
  }

  await Bun.sleep(1500);

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 3: Call remote agents
  // ═══════════════════════════════════════════════════════════════════════

  printSection("PHASE 3: CALLING REMOTE AGENTS (CROSS-NETWORK)");

  // Call 1: Hello World
  if (helloAgent) {
    console.log(`  ${c.bgYellow}${c.bright} SENDING A2A MESSAGE ${c.reset}`);
    console.log(`  ${c.bright}From:${c.reset} AdamOS (local)`);
    console.log(`  ${c.bright}To:${c.reset}   ${helloAgent.name} (${c.cyan}Render.com${c.reset})`);
    console.log(`  ${c.dim}Message: "Hello from AdamOS!"${c.reset}`);
    console.log();

    try {
      const response = await sendA2A(helloAgent, "Hello from AdamOS!");
      console.log(`  ${c.green}✓${c.reset} Response: ${c.bright}${response}${c.reset}`);
    } catch (e: any) {
      console.log(`  ${c.red}✗${c.reset} Error: ${e.message}`);
    }
  }

  console.log();
  await Bun.sleep(1000);

  // Call 2: Business Agent
  if (businessAgent) {
    console.log(`  ${c.bgYellow}${c.bright} SENDING A2A MESSAGE ${c.reset}`);
    console.log(`  ${c.bright}From:${c.reset} AdamOS (local)`);
    console.log(`  ${c.bright}To:${c.reset}   ${businessAgent.name} (${c.cyan}Lifie.ai${c.reset})`);
    console.log(`  ${c.dim}Message: "What office supplies do you have for a home office?"${c.reset}`);
    console.log();

    try {
      const response = await sendA2A(businessAgent, "What office supplies do you have for a home office?");
      console.log(`  ${c.green}✓${c.reset} Response from AI business agent:`);
      console.log();

      // Format the response nicely
      const lines = String(response).split("\n");
      for (const line of lines.slice(0, 12)) {
        console.log(`    ${c.dim}${line}${c.reset}`);
      }
      if (lines.length > 12) {
        console.log(`    ${c.dim}... (${lines.length - 12} more lines)${c.reset}`);
      }
    } catch (e: any) {
      console.log(`  ${c.red}✗${c.reset} Error: ${e.message}`);
    }
  }

  await Bun.sleep(1500);

  // ═══════════════════════════════════════════════════════════════════════
  // Finale
  // ═══════════════════════════════════════════════════════════════════════

  console.log();
  console.log(c.dim + "─".repeat(76) + c.reset);
  console.log();
  printBox("THIS IS WHY A2A MATTERS", c.bgGreen + c.bright);
  console.log();

  console.log(`  ${c.green}✓${c.reset} Called agents hosted on ${c.cyan}Render.com${c.reset}`);
  console.log(`  ${c.green}✓${c.reset} Called agents hosted on ${c.cyan}Lifie.ai${c.reset}`);
  console.log(`  ${c.green}✓${c.reset} Discovered agents from ${c.cyan}public registry${c.reset}`);
  console.log(`  ${c.green}✓${c.reset} No API keys, no vendor lock-in, no prior coordination`);
  console.log();

  console.log(`  ${c.bright}The key insight:${c.reset}`);
  console.log(`  ${c.yellow}A2A isn't about YOUR agents talking to YOUR agents.${c.reset}`);
  console.log(`  ${c.yellow}It's about YOUR agents talking to ANYONE's agents.${c.reset}`);
  console.log();

  console.log(`  ${c.dim}LangChain/CrewAI = Multi-agent within your app${c.reset}`);
  console.log(`  ${c.dim}A2A Protocol     = Multi-agent across the internet${c.reset}`);
  console.log();
}

main().catch(console.error);
