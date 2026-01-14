# Agent Intelligence Network (AIN) - Telos

> A Telos Context File defining the purpose, direction, and measures of success for this project.

---

## Mission

Provide a zero-cost, open-source framework for building agent-to-agent (A2A) systems that are actually useful, not just demos.

---

## Vision

A world where anyone can spin up coordinated AI agents without vendor lock-in, surprise bills, or infrastructure complexity.

---

## Core Problems We Solve

| Problem | How We Address It |
|---------|-------------------|
| **A2A is intimidating** | Simple, well-documented protocol implementation with clear examples |
| **Agent systems are expensive** | BYOK model + budget guards + cost-aware architecture |
| **Demos don't translate to production** | Stateless, deployable-anywhere design from day one |
| **Fragmented agent ecosystems** | Open protocol following Google's A2A spec |

---

## Goals

### Primary Goals

1. **Zero operational cost** - Project owner pays nothing when deployed
2. **BYOK (Bring Your Own Key)** - Users provide their own LLM API keys
3. **Actually useful** - Not a toy demo, but a tool people use
4. **Educational** - Clear implementation of A2A protocol for learning

### Secondary Goals

1. Open source community adoption
2. Reference implementation for A2A in TypeScript/Bun ecosystem
3. Integration with existing AI infrastructure tools

---

## Non-Goals

- Building yet another agent framework (we implement A2A, not invent it)
- Competing with enterprise agent platforms
- Supporting every LLM provider on day one
- Building a hosted SaaS (this is self-host / BYOK only)

---

## Strategies

### 1. Simplicity First
Start with 2 agents. Make them work well. Resist complexity until it's earned.

### 2. Cost Transparency
Every LLM call should be trackable. Users should never be surprised by costs.

### 3. Progressive Enhancement
- Works with just API keys (minimal setup)
- Optional: local models via Ollama
- Optional: persistent storage
- Optional: web dashboard

### 4. Documentation as Feature
If it's not documented, it doesn't exist. Every component gets clear docs.

---

## Key Performance Indicators (KPIs)

| KPI | Target | Measurement |
|-----|--------|-------------|
| **Time to First Agent** | < 5 minutes | From clone to running agent |
| **Deployment Cost** | $0 | Cloudflare Workers free tier |
| **Documentation Coverage** | 100% | All public APIs documented |
| **Test Coverage** | > 80% | Core package tests |
| **GitHub Stars** | 100+ (6 months) | Community interest signal |

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Language** | TypeScript | Type safety, broad adoption |
| **Runtime** | Bun | Fast, modern, good DX |
| **Package Manager** | Bun | Workspace support, speed |
| **API Hosting** | Cloudflare Workers | Free tier, global edge |
| **Web UI** | Minimal (vanilla or Preact) | Keep bundle small |
| **Protocol** | Google A2A Spec | Open standard, interoperability |
| **Testing** | Bun test | Built-in, fast |

---

## Architecture Principles

1. **Stateless by default** - No database required for core functionality
2. **Keys never stored** - BYOK keys passed per-request, never persisted
3. **Fail gracefully** - Budget exceeded? Pause, don't crash
4. **Observable** - All agent communication loggable/debuggable
5. **Self-hostable** - Docker or bare metal, user's choice

---

## Agent Roster (Initial)

| Agent | Role | A2A Capabilities |
|-------|------|------------------|
| **Orchestrator** | Routes tasks, discovers agents | `tasks/send`, `agents/discover` |
| **Scout** | Monitors sources for changes | `tasks/receive`, `data/report` |
| **Analyst** | Deep research on topics | `tasks/receive`, `research/query` |
| **Writer** | Formats and synthesizes reports | `tasks/receive`, `content/generate` |

---

## Success Criteria

### MVP (v0.1.0)
- [ ] Two agents communicating via A2A protocol
- [ ] BYOK working with Anthropic + OpenAI
- [ ] Budget guard functional
- [ ] Deployable to Cloudflare Workers
- [ ] Basic documentation

### v0.2.0
- [ ] Web dashboard showing agent activity
- [ ] Ollama support for local models
- [ ] 3+ working agents
- [ ] Example use cases documented

### v1.0.0
- [ ] Full A2A protocol compliance
- [ ] Comprehensive test suite
- [ ] Production deployment guide
- [ ] Community contributions accepted

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A2A spec changes | Medium | Medium | Abstract protocol layer, easy to update |
| Scope creep | High | High | Telos keeps us focused, MVP-first |
| Cloudflare free tier limits | Low | Medium | Self-host option available |
| Low adoption | Medium | Low | Built for personal use first |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-14 | BYOK model | Zero cost to maintainer, user owns their keys |
| 2026-01-14 | Cloudflare Workers | Free tier, stateless fits our model |
| 2026-01-14 | Bun + TypeScript | Stack preference, modern tooling |
| 2026-01-14 | Start with 2 agents | Simplicity first, prove A2A works |

---

## Resources

- [Google A2A Protocol Spec](https://github.com/google/a2a-spec)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Bun Documentation](https://bun.sh/docs)

---

*Last Updated: 2026-01-14*
