/**
 * Orchestrator - Discovers and coordinates A2A agents
 *
 * This demonstrates the power of A2A:
 * 1. Discovers agents via their Agent Cards
 * 2. Sends A2A messages to coordinate work
 * 3. Chains agent outputs together
 */

// Agent registry - discovered agents
interface AgentCard {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  capabilities: { name: string; description: string }[];
}

const discoveredAgents: Map<string, AgentCard> = new Map();

// Discover an agent by fetching its Agent Card
async function discoverAgent(baseUrl: string): Promise<AgentCard | null> {
  try {
    const response = await fetch(`${baseUrl}/.well-known/agent.json`);
    if (!response.ok) return null;

    const card = await response.json() as AgentCard;
    discoveredAgents.set(card.id, card);
    console.log(`✅ Discovered: ${card.name} (${card.id})`);
    console.log(`   Capabilities: ${card.capabilities.map(c => c.name).join(", ")}`);
    return card;
  } catch (error) {
    console.log(`❌ Failed to discover agent at ${baseUrl}`);
    return null;
  }
}

// Send A2A message to an agent
async function sendA2AMessage(
  agentId: string,
  method: string,
  params: any,
  apiKey: string,
  model: string
): Promise<any> {
  const agent = discoveredAgents.get(agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  console.log(`\n📤 Sending A2A message to ${agent.name}`);
  console.log(`   Method: ${method}`);

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

  if (data.error) {
    console.log(`   ❌ Error: ${data.error.message}`);
    throw new Error(data.error.message);
  }

  console.log(`   ✅ Received response from ${agent.name}`);
  return data.result;
}

// Find an agent with a specific capability
function findAgentWithCapability(capability: string): AgentCard | null {
  for (const agent of discoveredAgents.values()) {
    if (agent.capabilities.some(c => c.name === capability)) {
      return agent;
    }
  }
  return null;
}

// Main orchestration flow
async function orchestrate(query: string, apiKey: string, model: string) {
  console.log("\n" + "=".repeat(60));
  console.log("🎯 ORCHESTRATING: " + query);
  console.log("=".repeat(60));

  // Step 1: Find agent that can search
  const searchAgent = findAgentWithCapability("search");
  if (!searchAgent) {
    throw new Error("No agent with 'search' capability found");
  }

  // Step 2: Send A2A message to Scout
  console.log(`\n📋 Step 1: Research via ${searchAgent.name}`);
  const searchResults = await sendA2AMessage(
    searchAgent.id,
    "search",
    { query },
    apiKey,
    model
  );

  console.log(`   Found ${searchResults.findings?.length ?? 0} findings`);

  // Step 3: Find agent that can analyze
  const analyzeAgent = findAgentWithCapability("analyze");
  if (!analyzeAgent) {
    throw new Error("No agent with 'analyze' capability found");
  }

  // Step 4: Send A2A message to Analyst with Scout's findings
  console.log(`\n📋 Step 2: Analysis via ${analyzeAgent.name}`);
  const analysis = await sendA2AMessage(
    analyzeAgent.id,
    "analyze",
    {
      data: searchResults,
      context: `Original query: ${query}`
    },
    apiKey,
    model
  );

  // Final result
  console.log("\n" + "=".repeat(60));
  console.log("✨ ORCHESTRATION COMPLETE");
  console.log("=".repeat(60));

  return {
    query,
    agentsUsed: [searchAgent.name, analyzeAgent.name],
    searchResults,
    analysis
  };
}

// Main
async function main() {
  const apiKey = process.env.OPENROUTER_KEY;
  const model = process.env.MODEL ?? "x-ai/grok-4.1-fast";
  const query = process.argv[2] ?? "What are the latest developments in AI agents?";

  if (!apiKey) {
    console.error("❌ Set OPENROUTER_KEY environment variable");
    process.exit(1);
  }

  console.log("🔎 A2A Agent Discovery");
  console.log("=".repeat(60));

  // Discover agents at known locations
  await discoverAgent("http://localhost:4001"); // Scout
  await discoverAgent("http://localhost:4002"); // Analyst

  if (discoveredAgents.size < 2) {
    console.error("\n❌ Need at least 2 agents running. Start the services first:");
    console.error("   bun run demo/scout-service/index.ts");
    console.error("   bun run demo/analyst-service/index.ts");
    process.exit(1);
  }

  // Run orchestration
  const result = await orchestrate(query, apiKey, model);

  console.log("\n📊 FINAL RESULT:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
