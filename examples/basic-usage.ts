/**
 * Basic A2A Usage Example
 *
 * Run with: bun run examples/basic-usage.ts
 */

import { ScoutAgent, AnalystAgent } from '@ain/agents';
import { createMessage, MessageRouter, AgentRegistry } from '@ain/core';

// Configuration - set your API key here or via environment
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!ANTHROPIC_KEY && !OPENAI_KEY) {
  console.error('Set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable');
  process.exit(1);
}

// Choose provider based on available key
const provider = ANTHROPIC_KEY
  ? { type: 'anthropic' as const, apiKey: ANTHROPIC_KEY, model: 'claude-haiku-3.5' }
  : { type: 'openai' as const, apiKey: OPENAI_KEY!, model: 'gpt-4o-mini' };

// Create agents with budget limits
const scout = new ScoutAgent({
  provider,
  budget: { maxCostPerSession: 0.10 }, // 10 cents max
});

const analyst = new AnalystAgent({
  provider,
  budget: { maxCostPerSession: 0.10 },
});

// Set up message router
const router = new MessageRouter();
router.on('scout', (msg) => scout.handleMessage(msg).then((r) => r.payload));
router.on('analyst', (msg) => analyst.handleMessage(msg).then((r) => r.payload));

// Set up agent registry
const registry = new AgentRegistry();
registry.register(scout.getCard());
registry.register(analyst.getCard());

async function main() {
  console.log('Available agents:', registry.list().map((a) => a.name));

  // Step 1: Scout searches for information
  console.log('\n--- Scout searching for AI news ---');
  const scoutMessage = createMessage('task.send', 'user', 'scout', {
    type: 'search',
    query: 'latest developments in AI agents and multi-agent systems',
  });

  const scoutResponse = await router.route(scoutMessage);
  console.log('Scout findings:', JSON.stringify(scoutResponse.payload, null, 2));

  // Step 2: Analyst analyzes the findings
  console.log('\n--- Analyst analyzing findings ---');
  const analystMessage = createMessage('task.send', 'scout', 'analyst', {
    type: 'analyze',
    data: scoutResponse.payload,
    context: 'Focus on practical applications and trends',
  });

  const analystResponse = await router.route(analystMessage);
  console.log('Analysis:', JSON.stringify(analystResponse.payload, null, 2));

  // Show budget status
  console.log('\n--- Budget Status ---');
  console.log('Scout budget:', scout.getBudgetStatus());
  console.log('Analyst budget:', analyst.getBudgetStatus());
}

main().catch(console.error);
