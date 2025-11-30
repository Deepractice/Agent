# @deepractice-ai/agentx-node

**Node.js Runtime for AgentX** - Contains `NodeRuntime` and `ClaudeDriver`.

## Overview

This package provides the Node.js Runtime for the AgentX platform. It implements the Runtime interface using Claude Agent SDK for AI capabilities.

> **Note**: This is a Node.js-only package. It cannot be used in browsers or edge runtimes.

## Installation

```bash
pnpm add @deepractice-ai/agentx-node
```

## Quick Start

```typescript
import { defineAgent, createAgentX } from "@deepractice-ai/agentx";
import { runtime } from "@deepractice-ai/agentx-node";

// 1. Define agent (business config only)
const MyAgent = defineAgent({
  name: "Assistant",
  systemPrompt: "You are a helpful assistant",
});

// 2. Create platform with runtime
const agentx = createAgentX(runtime);

// 3. Create and use agent
const agent = agentx.agents.create(MyAgent);

agent.on("text_delta", (event) => {
  process.stdout.write(event.data.text);
});

await agent.receive("Hello!");
await agent.destroy();
```

## Environment Variables

NodeRuntime collects configuration from environment variables:

| Variable             | Required | Description                                    |
| -------------------- | -------- | ---------------------------------------------- |
| `ANTHROPIC_API_KEY`  | Yes      | Anthropic API key                              |
| `ANTHROPIC_BASE_URL` | No       | API base URL (default: Anthropic API)          |
| `CLAUDE_MODEL`       | No       | Model name (default: claude-sonnet-4-20250514) |

## API Reference

### `runtime` (Singleton)

Pre-configured NodeRuntime instance, ready to use:

```typescript
import { runtime } from "@deepractice-ai/agentx-node";

const agentx = createAgentX(runtime);
```

### `NodeRuntime`

The Runtime implementation for Node.js:

```typescript
import { NodeRuntime } from "@deepractice-ai/agentx-node";

// Custom runtime instance (if needed)
const myRuntime = new NodeRuntime();
const agentx = createAgentX(myRuntime);
```

**NodeRuntime implements:**

- `container` - MemoryAgentContainer for agent lifecycle
- `createSandbox()` - Creates LocalSandbox (placeholder for future OS + LLM isolation)
- `createDriver()` - Creates ClaudeDriver from AgentDefinition + RuntimeConfig

### `createClaudeDriver` (Advanced)

For advanced use cases where you need direct driver access:

```typescript
import { createClaudeDriver } from "@deepractice-ai/agentx-node";

const driver = createClaudeDriver(definition, context, sandbox, {
  apiKey: "sk-xxx",
  model: "claude-sonnet-4-20250514",
});
```

## Architecture

```text
NodeRuntime
    │
    ├── container: MemoryAgentContainer
    │       └── Manages Agent lifecycle (register, get, remove)
    │
    ├── createSandbox(name)
    │       └── LocalSandbox (OS + LLM resources)
    │
    └── createDriver(definition, context, sandbox)
            └── ClaudeDriver (Claude Agent SDK wrapper)
                    └── Uses sandbox.llm for apiKey/baseUrl
```

## Why Separate Package?

`NodeRuntime` depends on `@anthropic-ai/claude-agent-sdk`, which:

- Spawns child processes (Claude Code CLI)
- Uses Node.js-only APIs (`child_process`, `fs`)
- Cannot run in browsers or edge runtimes

Keeping it separate ensures `@deepractice-ai/agentx` stays platform-agnostic.

## Related Packages

- **[@deepractice-ai/agentx](../agentx)** - Platform API (createAgentX, defineAgent)
- **[@deepractice-ai/agentx-agent](../agentx-agent)** - Agent runtime
- **[@deepractice-ai/agentx-types](../agentx-types)** - Type definitions

## License

MIT
