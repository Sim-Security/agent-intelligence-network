# A2A Protocol Demo

This demo shows the real power of A2A: **agents discovering and talking to each other**.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Orchestrator  │     │   File Agent    │     │   Web Agent     │
│   (CLI Script)  │     │  (Port: 4001)   │     │  (Port: 4002)   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ 1. GET /.well-known/agent.json               │
         │──────────────────────►│                       │
         │◄──────────────────────│                       │
         │         Agent Card    │                       │
         │                       │                       │
         │ 2. Subscribe to SSE   │                       │
         │═══════════════════════│                       │
         │     /events stream    │                       │
         │                       │                       │
         │ 3. POST /a2a {method: "analyze"}             │
         │──────────────────────►│                       │
         │    ◄─SSE: request─────│                       │
         │    ◄─SSE: processing──│                       │
         │    ◄─SSE: response────│                       │
         │◄──────────────────────│                       │
         │       Analysis result │                       │
         │                                               │
         │ 4. POST /a2a {method: "fetch"}               │
         │──────────────────────────────────────────────►│
         │                      ◄─SSE: request───────────│
         │                      ◄─SSE: processing────────│
         │                      ◄─SSE: response──────────│
         │◄──────────────────────────────────────────────│
         │                                  Web content  │
         ▼                                               │
    Real-time activity visible!                          │
```

## Available Demos

### 1. Cross-Network Demo (THE REAL VALUE)

Shows A2A calling **external agents you didn't build**, hosted by other organizations.

```bash
bun run demo/run-cross-network-demo.ts
```

**What you'll see:**
- Fetches 100+ agents from the public A2A registry
- Discovers agents on Render.com, Lifie.ai, and other platforms
- Calls real AI agents across the internet
- No API keys needed - public A2A services

**This is why A2A matters:** Not your agents talking to your agents, but your agents talking to ANYONE's agents.

---

### 2. Real-Time SSE Demo

Shows agents doing **real work** with **live activity streaming** via SSE.

**Terminal 1 - File Agent:**
```bash
bun run demo/file-agent/index.ts
```

**Terminal 2 - Web Agent:**
```bash
bun run demo/web-agent/index.ts
```

**Terminal 3 - Run Demo:**
```bash
bun run demo/run-sse-demo.ts
```

**What you'll see:**
- Real-time activity feed as agents process requests
- File Agent actually reads files from disk
- Web Agent actually makes HTTP requests
- No LLM/API keys needed!

### 2. Basic Real-Work Demo

A simpler demo without SSE streaming.

```bash
# Start agents first (as above), then:
bun run demo/run-real-demo.ts
```

## Agent Endpoints

Each agent exposes:

| Endpoint | Description |
|----------|-------------|
| `/.well-known/agent.json` | Agent Card (A2A discovery) |
| `/a2a` | JSON-RPC endpoint for messages |
| `/events` | SSE stream for real-time activity |
| `/health` | Health check |

## SSE Events

Agents emit these events:

| Event | Description |
|-------|-------------|
| `connected` | SSE client connected |
| `request` | A2A request received |
| `processing` | Work in progress (with status) |
| `response` | Response being sent |
| `error` | Error occurred |

## File Agent Capabilities

- `list` - List files in a directory
- `read` - Read file contents
- `analyze` - Analyze a codebase (count files, lines, languages)

## Web Agent Capabilities

- `fetch` - Fetch URL and extract text
- `headers` - Get HTTP headers
- `links` - Extract all links from a page

## Key Insights

1. **A2A agents do real work** - Not just LLM wrappers
2. **SSE enables observability** - Watch agents in real-time
3. **Agent Cards enable discovery** - Any agent, anywhere
4. **JSON-RPC is simple** - Standard protocol, easy to implement
