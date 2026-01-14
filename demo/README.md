# A2A Protocol Demo

This demo shows the real power of A2A: **agents discovering and talking to each other**.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Orchestrator  │     │  Scout Service  │     │ Analyst Service │
│   (Port: CLI)   │     │  (Port: 4001)   │     │  (Port: 4002)   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ 1. GET /.well-known/agent.json               │
         │──────────────────────►│                       │
         │◄──────────────────────│                       │
         │         Agent Card    │                       │
         │                       │                       │
         │ 2. GET /.well-known/agent.json               │
         │──────────────────────────────────────────────►│
         │◄──────────────────────────────────────────────│
         │                                  Agent Card   │
         │                                               │
         │ 3. POST /a2a {method: "search"}              │
         │──────────────────────►│                       │
         │◄──────────────────────│                       │
         │      Search results   │                       │
         │                                               │
         │ 4. POST /a2a {method: "analyze", data: ...}  │
         │──────────────────────────────────────────────►│
         │◄──────────────────────────────────────────────│
         │                                  Analysis     │
         │                                               │
         ▼                                               │
    Combined Result                                      │
```

## Running the Demo

### 1. Start the Agent Services

In terminal 1:
```bash
bun run demo/scout-service/index.ts
```

In terminal 2:
```bash
bun run demo/analyst-service/index.ts
```

### 2. Run the Orchestrator

In terminal 3:
```bash
OPENROUTER_KEY=your-key bun run demo/orchestrator/index.ts "Your research query"
```

## What You'll See

1. **Discovery Phase**: Orchestrator fetches Agent Cards from each service
2. **Capability Matching**: Finds agents that can "search" and "analyze"
3. **A2A Communication**: Sends JSON-RPC messages between services
4. **Result Chaining**: Scout's output becomes Analyst's input

## The A2A Protocol in Action

Each service exposes:
- `/.well-known/agent.json` - Agent Card (capabilities, endpoint)
- `/a2a` - JSON-RPC endpoint for messages

This means:
- Services can be deployed ANYWHERE
- Any A2A-compliant agent can join the network
- Discovery is automatic via Agent Cards
