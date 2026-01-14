# A2A Protocol Demo - Video Script

## Pre-Recording Setup

Make sure you're in the project directory:
```bash
cd ~/agent-intelligence-network
```

## Recording Steps

### Scene 1: Introduction (Show this markdown or the repo)

**Voiceover script:**
> "Today we're demonstrating Google's Agent-to-Agent protocol, or A2A.
> A2A is a standard that allows AI agents from different systems to discover
> and communicate with each other - like HTTP for AI agents."

---

### Scene 2: Show the Architecture

**Voiceover script:**
> "We have two independent agent services - a Scout agent for research,
> and an Analyst agent for insights. They run on different ports and have
> no shared code. The only way they communicate is through the A2A protocol."

**Show in terminal:**
```bash
# Show the directory structure
ls demo/
```

---

### Scene 3: Start the Agent Services

**Voiceover script:**
> "First, let's start our two agent services. Each one exposes an Agent Card
> at a well-known URL that describes its capabilities."

**Terminal 1 - Start Scout:**
```bash
bun run demo/scout-service/index.ts
```

**Terminal 2 - Start Analyst:**
```bash
bun run demo/analyst-service/index.ts
```

---

### Scene 4: Show Agent Cards (Optional)

**Voiceover script:**
> "Let's look at an Agent Card. This is how agents advertise their capabilities."

```bash
curl -s http://localhost:4001/.well-known/agent.json | jq
```

---

### Scene 5: Run the Demo

**Voiceover script:**
> "Now let's run the orchestrator. It will discover the agents,
> figure out which one can handle each part of the task,
> and coordinate them via A2A messages."

**Terminal 3:**
```bash
OPENROUTER_KEY=your-key bun run demo/run-demo.ts "What are the benefits of multi-agent AI systems?"
```

---

### Scene 6: Explain What Happened

**Voiceover script:**
> "What just happened? The orchestrator discovered both agents by fetching
> their Agent Cards. It saw that Scout has a 'search' capability and Analyst
> has an 'analyze' capability. It sent an A2A message to Scout to research
> the topic, then passed those findings to Analyst for synthesis.
>
> The key point: these agents could be running anywhere - different servers,
> different companies, different frameworks. As long as they speak A2A,
> they can work together."

---

### Scene 7: Closing

**Voiceover script:**
> "That's the A2A protocol - a standard for agent interoperability.
> Check out the repo to try it yourself. Link in the description."

---

## Quick Commands for Recording

```bash
# Terminal 1
cd ~/agent-intelligence-network
bun run demo/scout-service/index.ts

# Terminal 2
cd ~/agent-intelligence-network
bun run demo/analyst-service/index.ts

# Terminal 3 (main demo)
cd ~/agent-intelligence-network
OPENROUTER_KEY=sk-or-v1-xxx bun run demo/run-demo.ts "What are the benefits of multi-agent AI systems?"
```

## Tips for Recording

1. Use a clean terminal with large font
2. Dark theme looks better on video
3. Pause between commands so viewers can read
4. The demo takes ~30 seconds to run (LLM calls)
5. You can speed up the video in editing if needed
