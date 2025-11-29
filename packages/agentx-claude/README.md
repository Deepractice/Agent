# @deepractice-ai/agentx-claude

**Claude Driver for AgentX** - Node.js only.

## Overview

This package provides `ClaudeDriver`, which wraps `@anthropic-ai/claude-agent-sdk` for use with AgentX.

> **Note**: This is a Node.js-only package. It cannot be used in browsers or edge runtimes.

## Installation

```bash
pnpm add @deepractice-ai/agentx-claude
```

## Usage

```typescript
import { defineAgent, createAgent } from "@deepractice-ai/agentx";
import { ClaudeDriver } from "@deepractice-ai/agentx-claude";

const MyAgent = defineAgent({
  name: "Assistant",
  driver: ClaudeDriver,
  configSchema: {
    apiKey: { type: "string", required: true },
    model: { type: "string", default: "claude-sonnet-4-20250514" },
  },
});

const agent = createAgent(MyAgent, {
  apiKey: process.env.ANTHROPIC_API_KEY,
});

agent.on((event) => console.log(event));
await agent.receive("Hello!");
await agent.destroy();
```

## Configuration

`ClaudeDriver` supports all options from `@anthropic-ai/claude-agent-sdk`:

| Option            | Type     | Description                                                     |
| ----------------- | -------- | --------------------------------------------------------------- |
| `apiKey`          | string   | Anthropic API key                                               |
| `baseUrl`         | string   | API base URL                                                    |
| `model`           | string   | Model name (default: claude-sonnet-4-20250514)                  |
| `cwd`             | string   | Working directory for file operations                           |
| `systemPrompt`    | string   | System prompt                                                   |
| `maxTurns`        | number   | Maximum conversation turns                                      |
| `permissionMode`  | string   | Permission mode (default, acceptEdits, bypassPermissions, plan) |
| `mcpServers`      | object   | MCP server configurations                                       |
| `allowedTools`    | string[] | Allowed tool names                                              |
| `disallowedTools` | string[] | Disallowed tool names                                           |

See [Claude Agent SDK documentation](https://github.com/anthropics/claude-agent-sdk) for full options.

## Why Separate Package?

`ClaudeDriver` depends on `@anthropic-ai/claude-agent-sdk`, which:

- Spawns child processes (Claude Code CLI)
- Uses Node.js-only APIs (`child_process`, `fs`)
- Cannot run in browsers or edge runtimes

Keeping it separate ensures `@deepractice-ai/agentx` stays platform-agnostic.

## License

MIT
