# Agent Intelligence Network (AIN)

A zero-cost, open-source framework for building agent-to-agent (A2A) systems.

**BYOK (Bring Your Own Key)** - You provide your API keys. We never store them.

## Features

- **A2A Protocol** - Implements Google's agent-to-agent communication spec
- **Zero Cost** - Deploys to Cloudflare Workers free tier
- **Budget Guards** - Built-in cost tracking and limits
- **Multi-Provider** - OpenRouter, Anthropic, OpenAI, Ollama (local)
- **Self-Hostable** - Run locally or deploy anywhere

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- API key from OpenRouter (recommended), Anthropic, OpenAI, or local Ollama

### Install

```bash
git clone https://github.com/YOUR_USERNAME/agent-intelligence-network.git
cd agent-intelligence-network
bun install
```

### Run Locally

```bash
cd packages/api
bun run dev
```

### Test with curl

```bash
# Using OpenRouter (recommended - access to all models)
curl -X POST http://localhost:8787/a2a \
  -H "Content-Type: application/json" \
  -H "x-openrouter-key: YOUR_OPENROUTER_KEY" \
  -H "x-openrouter-model: x-ai/grok-4.1-fast" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "scout.search",
    "params": { "query": "latest AI developments" }
  }'
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/agents` | GET | List available agents |
| `/a2a` | POST | A2A JSON-RPC endpoint |
| `/budget` | GET | Current budget status |

## Available Agents

### Scout Agent
Monitors sources and searches for information.

```json
{ "method": "scout.search", "params": { "query": "your query" } }
{ "method": "scout.monitor", "params": { "source": "https://..." } }
```

### Analyst Agent
Performs deep analysis on data.

```json
{ "method": "analyst.analyze", "params": { "data": {...}, "context": "..." } }
{ "method": "analyst.summarize", "params": { "data": {...} } }
```

## BYOK Headers

Pass your API keys via headers (never stored):

| Header | Provider |
|--------|----------|
| `x-openrouter-key` | OpenRouter (access to all models) |
| `x-openrouter-model` | Model to use (e.g., `x-ai/grok-4.1-fast`, `openai/gpt-4o-mini`) |
| `x-anthropic-key` | Anthropic (Claude) |
| `x-openai-key` | OpenAI (GPT) |
| `x-ollama-url` | Ollama (local, e.g., `http://localhost:11434`) |
| `x-budget-limit` | Max cost per session in USD (default: 1.0) |

## Budget Guards

Set cost limits to prevent surprise bills:

```bash
curl -X POST http://localhost:8787/a2a \
  -H "x-anthropic-key: YOUR_KEY" \
  -H "x-budget-limit: 0.50" \
  ...
```

When limit is reached, agents will stop and return an error.

## Deploy to Cloudflare Workers

```bash
cd packages/api
bunx wrangler login
bunx wrangler deploy
```

That's it. Free tier gives you 100,000 requests/day.

## Project Structure

```
agent-intelligence-network/
├── packages/
│   ├── core/       # A2A protocol, types, budget system
│   ├── agents/     # Pre-built agents (Scout, Analyst)
│   ├── api/        # Cloudflare Workers API
│   └── web/        # Dashboard (coming soon)
├── examples/       # Usage examples
├── docs/           # Documentation
├── telos.md        # Project direction and goals
└── README.md
```

## Creating Custom Agents

```typescript
import { BaseAgent, type AgentConfig } from '@ain/agents';
import type { A2AMessage } from '@ain/core';

class MyAgent extends BaseAgent {
  constructor(config: Omit<AgentConfig, 'id' | 'name' | 'description'>) {
    super({
      ...config,
      id: 'my-agent',
      name: 'My Custom Agent',
      description: 'Does something useful',
    });
  }

  protected async process(message: A2AMessage): Promise<unknown> {
    // Your agent logic here
    const response = await this.callLLM({
      system: 'You are a helpful assistant.',
      messages: [{ role: 'user', content: message.payload as string }],
    });
    return { result: response.content };
  }
}
```

## Cost Estimates

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| claude-haiku-3.5 | $0.80 | $4.00 |
| gpt-4o-mini | $0.15 | $0.60 |
| Ollama (local) | $0 | $0 |

A typical session with budget guards rarely exceeds $0.10.

## Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run `bun test`
5. Submit a PR

## License

MIT

## Links

- [Telos (Project Direction)](./telos.md)
- [Google A2A Protocol](https://github.com/google/a2a-spec)
- [Cloudflare Workers](https://workers.cloudflare.com)
