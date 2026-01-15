/**
 * A2A Protocol Demo - Visual Demo Runner
 *
 * This creates a visually appealing terminal demo showing
 * agents discovering each other and communicating via A2A.
 */

// ANSI colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",

  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
};

const c = colors;

// Typing effect for dramatic output
async function typeText(text: string, delay = 30) {
  for (const char of text) {
    process.stdout.write(char);
    await Bun.sleep(delay);
  }
  console.log();
}

// Slow print for readability
async function slowPrint(text: string, delay = 50) {
  console.log(text);
  await Bun.sleep(delay);
}

// Print a box around text
function printBox(title: string, color: string) {
  const width = 60;
  const padding = Math.floor((width - title.length - 2) / 2);
  console.log(color + "╔" + "═".repeat(width) + "╗" + c.reset);
  console.log(color + "║" + " ".repeat(padding) + title + " ".repeat(width - padding - title.length) + "║" + c.reset);
  console.log(color + "╚" + "═".repeat(width) + "╝" + c.reset);
}

// Print a section header
function printSection(title: string) {
  console.log();
  console.log(c.cyan + c.bright + "━".repeat(60) + c.reset);
  console.log(c.cyan + c.bright + "  " + title + c.reset);
  console.log(c.cyan + c.bright + "━".repeat(60) + c.reset);
  console.log();
}

// Print agent message
function printAgentMessage(from: string, to: string, method: string, direction: "send" | "receive") {
  const arrow = direction === "send" ? "──────────────►" : "◄──────────────";
  const color = direction === "send" ? c.yellow : c.green;
  console.log(`  ${c.bright}${from}${c.reset} ${color}${arrow}${c.reset} ${c.bright}${to}${c.reset}`);
  console.log(`  ${c.dim}Method: ${method}${c.reset}`);
}

// Discovered agents storage
interface AgentCard {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  capabilities: { name: string; description: string }[];
}

const discoveredAgents: Map<string, AgentCard> = new Map();

// Discover agent
async function discoverAgent(baseUrl: string): Promise<AgentCard | null> {
  try {
    const response = await fetch(`${baseUrl}/.well-known/agent.json`);
    if (!response.ok) return null;
    const card = await response.json() as AgentCard;
    discoveredAgents.set(card.id, card);
    return card;
  } catch {
    return null;
  }
}

// Send A2A message
async function sendA2A(agentId: string, method: string, params: any, apiKey: string, model: string): Promise<any> {
  const agent = discoveredAgents.get(agentId);
  if (!agent) throw new Error(`Agent not found: ${agentId}`);

  const response = await fetch(agent.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-openrouter-key": apiKey,
      "x-openrouter-model": model,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `${Date.now()}`,
      method,
      params
    })
  });

  const data = await response.json() as any;
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

// Main demo
async function runDemo() {
  const apiKey = process.env.OPENROUTER_KEY;
  const model = process.env.MODEL ?? "x-ai/grok-4.1-fast";
  const query = process.argv[2] ?? "What are the benefits of multi-agent AI systems?";

  console.clear();

  // Title
  console.log();
  printBox("A2A PROTOCOL DEMONSTRATION", c.bgCyan + c.bright);
  console.log();
  await Bun.sleep(1000);

  await typeText(`${c.dim}Demonstrating Google's Agent-to-Agent protocol...${c.reset}`, 20);
  await Bun.sleep(500);

  // ═══════════════════════════════════════════════════════════
  // PHASE 1: Discovery
  // ═══════════════════════════════════════════════════════════

  printSection("PHASE 1: AGENT DISCOVERY");

  await typeText(`${c.white}The A2A protocol allows agents to discover each other via Agent Cards.${c.reset}`, 15);
  await typeText(`${c.white}Each agent exposes: ${c.cyan}/.well-known/agent.json${c.reset}`, 15);
  await Bun.sleep(500);

  console.log();
  console.log(`  ${c.yellow}Scanning for agents...${c.reset}`);
  await Bun.sleep(300);

  // Discover Scout
  console.log();
  console.log(`  ${c.dim}GET http://localhost:4001/.well-known/agent.json${c.reset}`);
  await Bun.sleep(500);

  const scout = await discoverAgent("http://localhost:4001");
  if (scout) {
    console.log(`  ${c.green}✓${c.reset} ${c.bright}Discovered: ${scout.name}${c.reset}`);
    console.log(`    ${c.dim}ID: ${scout.id}${c.reset}`);
    console.log(`    ${c.dim}Capabilities: ${scout.capabilities.map(c => c.name).join(", ")}${c.reset}`);
  } else {
    console.log(`  ${c.red}✗ Scout service not found${c.reset}`);
    process.exit(1);
  }

  await Bun.sleep(500);

  // Discover Analyst
  console.log();
  console.log(`  ${c.dim}GET http://localhost:4002/.well-known/agent.json${c.reset}`);
  await Bun.sleep(500);

  const analyst = await discoverAgent("http://localhost:4002");
  if (analyst) {
    console.log(`  ${c.green}✓${c.reset} ${c.bright}Discovered: ${analyst.name}${c.reset}`);
    console.log(`    ${c.dim}ID: ${analyst.id}${c.reset}`);
    console.log(`    ${c.dim}Capabilities: ${analyst.capabilities.map(c => c.name).join(", ")}${c.reset}`);
  } else {
    console.log(`  ${c.red}✗ Analyst service not found${c.reset}`);
    process.exit(1);
  }

  await Bun.sleep(1000);

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: Task Assignment
  // ═══════════════════════════════════════════════════════════

  printSection("PHASE 2: TASK ASSIGNMENT");

  console.log(`  ${c.white}User Query:${c.reset}`);
  console.log(`  ${c.cyan}${c.bright}"${query}"${c.reset}`);
  console.log();

  await Bun.sleep(500);

  console.log(`  ${c.yellow}Orchestrator analyzing task requirements...${c.reset}`);
  await Bun.sleep(800);

  console.log(`  ${c.dim}→ Need "search" capability → Scout Agent${c.reset}`);
  await Bun.sleep(300);
  console.log(`  ${c.dim}→ Need "analyze" capability → Analyst Agent${c.reset}`);
  await Bun.sleep(500);

  console.log();
  console.log(`  ${c.green}Task plan created:${c.reset}`);
  console.log(`    ${c.white}1. Scout researches the topic${c.reset}`);
  console.log(`    ${c.white}2. Analyst synthesizes insights${c.reset}`);

  await Bun.sleep(1000);

  // ═══════════════════════════════════════════════════════════
  // PHASE 3: A2A Communication
  // ═══════════════════════════════════════════════════════════

  printSection("PHASE 3: A2A COMMUNICATION");

  // Step 1: Scout
  console.log(`  ${c.bgBlue}${c.bright} STEP 1: Research ${c.reset}`);
  console.log();

  printAgentMessage("Orchestrator", "Scout Agent", "search", "send");
  console.log();

  console.log(`  ${c.dim}Sending A2A message...${c.reset}`);
  await Bun.sleep(500);

  let searchResults;
  try {
    searchResults = await sendA2A("scout-agent", "search", { query }, apiKey!, model);
    console.log(`  ${c.green}✓ Response received${c.reset}`);
    console.log(`  ${c.dim}Found ${searchResults.findings?.length ?? 0} research findings${c.reset}`);
  } catch (e) {
    console.log(`  ${c.red}✗ Error: ${e}${c.reset}`);
    process.exit(1);
  }

  await Bun.sleep(800);
  console.log();

  // Step 2: Analyst
  console.log(`  ${c.bgMagenta}${c.bright} STEP 2: Analysis ${c.reset}`);
  console.log();

  printAgentMessage("Orchestrator", "Analyst Agent", "analyze", "send");
  console.log(`  ${c.dim}(passing Scout's findings as input)${c.reset}`);
  console.log();

  console.log(`  ${c.dim}Sending A2A message...${c.reset}`);
  await Bun.sleep(500);

  let analysis;
  try {
    analysis = await sendA2A("analyst-agent", "analyze", {
      data: searchResults,
      context: `Original query: ${query}`
    }, apiKey!, model);
    console.log(`  ${c.green}✓ Response received${c.reset}`);
    console.log(`  ${c.dim}Generated ${analysis.insights?.length ?? 0} insights${c.reset}`);
  } catch (e) {
    console.log(`  ${c.red}✗ Error: ${e}${c.reset}`);
    process.exit(1);
  }

  await Bun.sleep(1000);

  // ═══════════════════════════════════════════════════════════
  // PHASE 4: Results
  // ═══════════════════════════════════════════════════════════

  printSection("PHASE 4: COMBINED RESULTS");

  console.log(`  ${c.bright}Summary:${c.reset}`);
  console.log(`  ${c.white}${analysis.summary}${c.reset}`);
  console.log();

  console.log(`  ${c.bright}Key Insights:${c.reset}`);
  for (const insight of (analysis.insights ?? []).slice(0, 3)) {
    console.log(`  ${c.green}•${c.reset} ${insight}`);
  }
  console.log();

  console.log(`  ${c.bright}Recommendations:${c.reset}`);
  for (const rec of (analysis.recommendations ?? []).slice(0, 2)) {
    console.log(`  ${c.cyan}→${c.reset} ${rec}`);
  }

  await Bun.sleep(500);

  // ═══════════════════════════════════════════════════════════
  // Finale
  // ═══════════════════════════════════════════════════════════

  console.log();
  printBox("DEMONSTRATION COMPLETE", c.bgCyan + c.bright);
  console.log();

  console.log(`  ${c.green}✓${c.reset} Two independent agents discovered via A2A protocol`);
  console.log(`  ${c.green}✓${c.reset} Tasks delegated based on capabilities`);
  console.log(`  ${c.green}✓${c.reset} Results chained between agents`);
  console.log(`  ${c.green}✓${c.reset} No shared code or tight coupling`);
  console.log();

  console.log(`  ${c.dim}This is the power of A2A: interoperable agents.${c.reset}`);
  console.log();
}

// Check requirements
if (!process.env.OPENROUTER_KEY) {
  console.error(`${c.red}Error: Set OPENROUTER_KEY environment variable${c.reset}`);
  process.exit(1);
}

runDemo().catch(console.error);
