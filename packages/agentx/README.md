# @deepractice-ai/agentx

**Define, Run, Scale AI Agents** - The Open Source Agent Platform.

## Overview

`@deepractice-ai/agentx` is the unified entry point for the AgentX platform, providing a complete API for building and managing AI agents:

- **Local Mode** - Run agents in-process with full control
- **Remote Mode** - Connect to remote AgentX servers via HTTP/SSE
- **Server** - HTTP handlers for exposing agents (Express, Hono, Next.js)
- **Client** - SDK for browser/Node.js clients

## Installation

```bash
pnpm add @deepractice-ai/agentx
```

## Quick Start

### Local Mode (Default)

```typescript
import { agentx, createAgentX } from "@deepractice-ai/agentx";
import { ClaudeDriver } from "@deepractice-ai/agentx-sdk-claude";

// Use the default singleton
const definition = agentx.agents.define({
  name: "Assistant",
  driver: new ClaudeDriver({ apiKey: process.env.ANTHROPIC_API_KEY }),
});

const agent = agentx.agents.create(definition, {});

// Subscribe to events
agent.on((event) => console.log(event));

// Send message
await agent.receive("Hello!");

// Cleanup
await agent.destroy();
```

### Remote Mode

```typescript
import { createAgentX } from "@deepractice-ai/agentx";

// Connect to remote AgentX server
const remote = createAgentX({
  serverUrl: "http://localhost:5200/agentx",
});

// Get platform info
const info = await remote.platform.getInfo();
console.log(`Connected to ${info.platform} v${info.version}`);

// Create session and interact
const session = await remote.sessions.create("agent_123");
```

## Core API

### `createAgentX(options?)`

Create an AgentX instance. Returns `AgentXLocal` or `AgentXRemote` based on options:

```typescript
// Local mode (default)
const local = createAgentX();
const localWithHandler = createAgentX({
  onError: (agentId, error) => console.error(error),
});

// Remote mode
const remote = createAgentX({
  serverUrl: "http://localhost:5200/agentx",
  headers: { Authorization: "Bearer xxx" },
});
```

### `agentx` (Default Singleton)

Pre-configured local AgentX instance:

```typescript
import { agentx } from "@deepractice-ai/agentx";

// Same as createAgentX() but shared globally
const agent = agentx.agents.create(definition, config);
```

## AgentX API Reference

### Agents Manager (`agentx.agents`)

| Method                       | Description                |
| ---------------------------- | -------------------------- |
| `define(input)`              | Create an agent definition |
| `create(definition, config)` | Create an agent instance   |
| `get(agentId)`               | Get agent by ID            |
| `has(agentId)`               | Check if agent exists      |
| `list()`                     | List all agents            |
| `destroy(agentId)`           | Destroy an agent           |
| `destroyAll()`               | Destroy all agents         |

```typescript
// Define agent
const MyAgent = agentx.agents.define({
  name: "MyAssistant",
  driver: myDriver,
});

// Create instance
const agent = agentx.agents.create(MyAgent, { apiKey: "xxx" });

// Manage
const exists = agentx.agents.has(agent.agentId);
const all = agentx.agents.list();
await agentx.agents.destroy(agent.agentId);
```

### Sessions Manager (`agentx.sessions`)

| Method                 | Description                   |
| ---------------------- | ----------------------------- |
| `create(agentId)`      | Create a session for an agent |
| `get(sessionId)`       | Get session by ID             |
| `listByAgent(agentId)` | List sessions for an agent    |
| `destroy(sessionId)`   | Destroy a session             |

```typescript
// Create session
const session = agentx.sessions.create(agent.agentId);
console.log(session.sessionId, session.agentId);

// List sessions
const sessions = await agentx.sessions.listByAgent(agent.agentId);

// Cleanup
await agentx.sessions.destroy(session.sessionId);
```

### Errors Manager (`agentx.errors`) - Local Only

| Method                   | Description                             |
| ------------------------ | --------------------------------------- |
| `addHandler(handler)`    | Add error handler (returns unsubscribe) |
| `removeHandler(handler)` | Remove error handler                    |

```typescript
// Add global error handler
const unsubscribe = agentx.errors.addHandler({
  handle: (agentId, error, event) => {
    console.error(`[${agentId}] ${error.category}/${error.code}: ${error.message}`);
    // Send to Sentry, alerting, etc.
  },
});

// Remove when done
unsubscribe();
```

### Platform Manager (`remote.platform`) - Remote Only

| Method        | Description              |
| ------------- | ------------------------ |
| `getInfo()`   | Get platform information |
| `getHealth()` | Get health status        |

```typescript
const remote = createAgentX({ serverUrl: "http://localhost:5200/agentx" });

const info = await remote.platform.getInfo();
// { platform: "AgentX", version: "1.0.0", agentCount: 5 }

const health = await remote.platform.getHealth();
// { status: "healthy", timestamp: 1234567890 }
```

## Define API

### `defineAgent(options)`

Create a reusable agent definition with config schema validation:

```typescript
import { defineAgent } from "@deepractice-ai/agentx";

const MyAgent = defineAgent({
  name: "Assistant",
  description: "A helpful AI assistant",
  driver: claudeDriver,
  configSchema: {
    apiKey: { type: "string", required: true },
    model: { type: "string", default: "claude-sonnet-4-20250514" },
    temperature: { type: "number" },
    debug: { type: "boolean", default: false },
  },
});

// Type-safe config
const agent = agentx.agents.create(MyAgent, {
  apiKey: "sk-xxx", // Required
  model: "claude-opus-4-20250514", // Optional, has default
});
```

### Config Schema Types

```typescript
type FieldType = "string" | "number" | "boolean";

interface FieldDefinition {
  type: FieldType;
  required?: boolean;
  default?: any;
  description?: string;
}
```

## Server Integration

### HTTP Handler

```typescript
import { agentx } from "@deepractice-ai/agentx";
import { createAgentXHandler } from "@deepractice-ai/agentx/server";
import { toExpressHandler } from "@deepractice-ai/agentx/server/adapters/express";
import express from "express";

const handler = createAgentXHandler(agentx);
const app = express();

app.use(express.json());
app.use("/agentx", toExpressHandler(handler));
app.listen(3000);
```

### Framework Adapters

```typescript
// Express
import { toExpressHandler } from "@deepractice-ai/agentx/server/adapters/express";
app.use("/agentx", toExpressHandler(handler));

// Hono
import { toHonoHandler } from "@deepractice-ai/agentx/server/adapters/hono";
app.all("/agentx/*", toHonoHandler(handler));

// Next.js App Router
import { createNextHandler } from "@deepractice-ai/agentx/server/adapters/next";
export const { GET, POST, DELETE } = createNextHandler(handler);
```

### API Endpoints

| Endpoint                    | Method | Description    |
| --------------------------- | ------ | -------------- |
| `/info`                     | GET    | Platform info  |
| `/health`                   | GET    | Health check   |
| `/agents`                   | GET    | List agents    |
| `/agents/:agentId`          | GET    | Get agent info |
| `/agents/:agentId`          | DELETE | Destroy agent  |
| `/agents/:agentId/sse`      | GET    | SSE connection |
| `/agents/:agentId/messages` | POST   | Send message   |

## Client SDK

```typescript
import { AgentXClient } from "@deepractice-ai/agentx/client";

const client = new AgentXClient({
  baseUrl: "http://localhost:3000/agentx",
});

// List available agents
const agents = await client.listAgents();

// Connect to an agent via SSE
const agent = await client.connect("agent_123");

// Use like a local agent
agent.on((event) => console.log(event));
await agent.receive("Hello!");
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      createAgentX()                          │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                   │
│    AgentXLocal           │         AgentXRemote             │
│    ┌──────────────┐      │         ┌──────────────┐         │
│    │ agents       │      │         │ agents       │         │
│    │ sessions     │      │         │ sessions     │         │
│    │ errors       │      │         │ platform     │         │
│    └──────────────┘      │         └──────────────┘         │
│           │              │                │                  │
│    In-Process            │          HTTP/SSE                 │
│                          │                │                  │
└──────────────────────────┴────────────────┼──────────────────┘
                                            │
                                            ▼
                                   ┌────────────────┐
                                   │  AgentX Server │
                                   └────────────────┘
```

## Event Flow

Server forwards **Stream Events** efficiently. Client reconstructs higher-level events:

```
Server → SSE → Client
         │
         ├── message_start
         ├── text_delta
         ├── tool_use_content_block_start
         ├── tool_result
         └── message_stop
                │
                ▼
         Client AgentEngine
                │
                ├── Assembles → assistant_message
                ├── Assembles → tool_use_message
                └── Tracks   → turn_complete
```

## Package Structure

```
@deepractice-ai/agentx
├── /              # Core: createAgentX, agentx, defineAgent
├── /server        # Server handlers and SSE transport
├── /server/adapters
│   ├── /express   # Express adapter
│   ├── /hono      # Hono adapter
│   └── /next      # Next.js App Router adapter
└── /client        # Client SDK
```

## Related Packages

| Package                                                   | Description                   |
| --------------------------------------------------------- | ----------------------------- |
| [@deepractice-ai/agentx-core](../agentx-core)             | Agent lifecycle and container |
| [@deepractice-ai/agentx-engine](../agentx-engine)         | Event processing engine       |
| [@deepractice-ai/agentx-types](../agentx-types)           | Type definitions              |
| [@deepractice-ai/agentx-sdk-claude](../agentx-sdk-claude) | Claude driver                 |
| [@deepractice-ai/agentx-logger](../agentx-logger)         | Logging facade                |

## License

MIT
