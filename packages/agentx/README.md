# @deepractice-ai/agentx

**Define, Run, Scale AI Agents** - The Open Source Agent Platform.

## Overview

`@deepractice-ai/agentx` is the main entry point for the AgentX platform, providing:

- **Core** - `defineAgent()`, `createAgent()`, `agentx` singleton
- **Server** - HTTP handlers for exposing agents over SSE/WebSocket
- **Client** - SDK for connecting to remote agents
- **Adapters** - Framework integrations (Express, Hono, Next.js)

## Installation

```bash
pnpm add @deepractice-ai/agentx
```

## Quick Start

### 1. Define an Agent

```typescript
import { defineAgent } from "@deepractice-ai/agentx";

const MyAgent = defineAgent({
  name: "Assistant",
  driver: claudeDriver,
  configSchema: {
    apiKey: { type: "string", required: true },
    model: { type: "string", default: "claude-sonnet-4-20250514" },
  },
});
```

### 2. Create and Use

```typescript
import { createAgent } from "@deepractice-ai/agentx";

const agent = createAgent(MyAgent, {
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Subscribe to events
agent.on((event) => console.log(event));

// Send message
await agent.receive("Hello!");

// Cleanup
await agent.destroy();
```

### 3. Expose via HTTP (Server)

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

### 4. Connect from Client

```typescript
import { AgentXClient } from "@deepractice-ai/agentx/client";

const client = new AgentXClient({ baseUrl: "http://localhost:3000/agentx" });
const agent = await client.connect("agent_123");

agent.on((event) => console.log(event));
await agent.receive("Hello from client!");
```

## Package Structure

```
@deepractice-ai/agentx
├── /              # Core: defineAgent, createAgent, agentx
├── /server        # Server handlers and SSE transport
├── /server/adapters
│   ├── /express   # Express adapter
│   ├── /hono      # Hono adapter
│   └── /next      # Next.js App Router adapter
└── /client        # Client SDK
```

## API Reference

### Core (`@deepractice-ai/agentx`)

#### `defineAgent(options)`

Create an agent definition:

```typescript
const MyAgent = defineAgent({
  name: "MyAgent",
  description: "Optional description",
  driver: myDriver,
  configSchema: {
    apiKey: { type: "string", required: true },
    model: { type: "string", default: "claude-sonnet-4-20250514" },
    temperature: { type: "number" },
    debug: { type: "boolean", default: false },
  },
});
```

#### `createAgent(definition, config)`

Create an agent instance:

```typescript
const agent = createAgent(MyAgent, {
  apiKey: "sk-xxx",
  model: "claude-sonnet-4-20250514",
});
```

#### `agentx` (Default Singleton)

Global AgentX instance for convenience:

```typescript
import { agentx, createAgent, getAgent, destroyAgent } from "@deepractice-ai/agentx";

const agent = createAgent(MyAgent, config);  // Uses default agentx
const found = getAgent(agent.agentId);
await destroyAgent(agent.agentId);
```

### Server (`@deepractice-ai/agentx/server`)

#### `createAgentXHandler(agentx, options?)`

Create a framework-agnostic HTTP handler:

```typescript
import { createAgentXHandler } from "@deepractice-ai/agentx/server";

const handler = createAgentXHandler(agentx, {
  basePath: "/agentx",
  allowDynamicCreation: false,
  hooks: {
    onConnect: (agentId, connectionId) => console.log("Connected:", agentId),
    onDisconnect: (agentId, connectionId) => console.log("Disconnected:", agentId),
    onMessage: (agentId, message) => console.log("Message:", message),
    onError: (agentId, error) => console.error("Error:", error),
  },
});
```

#### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/info` | GET | Platform info |
| `/health` | GET | Health check |
| `/agents` | GET | List agents |
| `/agents` | POST | Create agent (if enabled) |
| `/agents/:agentId` | GET | Get agent info |
| `/agents/:agentId` | DELETE | Destroy agent |
| `/agents/:agentId/sse` | GET | SSE connection |
| `/agents/:agentId/messages` | POST | Send message |
| `/agents/:agentId/interrupt` | POST | Interrupt response |

### Framework Adapters

#### Express

```typescript
import { toExpressHandler } from "@deepractice-ai/agentx/server/adapters/express";

app.use("/agentx", toExpressHandler(handler));
```

#### Hono

```typescript
import { toHonoHandler } from "@deepractice-ai/agentx/server/adapters/hono";

// Simple catch-all
app.all("/agentx/*", toHonoHandler(handler));

// Or with explicit routes
import { createHonoRoutes } from "@deepractice-ai/agentx/server/adapters/hono";
app.route("/agentx", createHonoRoutes(handler, Hono));
```

#### Next.js App Router

```typescript
// app/api/agentx/[...path]/route.ts
import { createNextHandler } from "@deepractice-ai/agentx/server/adapters/next";

const handler = createAgentXHandler(agentx, {
  basePath: "/api/agentx",
});

export const { GET, POST, DELETE } = createNextHandler(handler);
export const dynamic = "force-dynamic";
```

### Client (`@deepractice-ai/agentx/client`)

#### `AgentXClient`

Full-featured client:

```typescript
import { AgentXClient } from "@deepractice-ai/agentx/client";

const client = new AgentXClient({
  baseUrl: "http://localhost:3000/agentx",
});

// List available agents
const agents = await client.listAgents();

// Connect to an agent
const agent = await client.connect("agent_123");

// Use like a local agent
agent.on((event) => console.log(event));
await agent.receive("Hello!");
await agent.interrupt();
```

#### `connectAgent(options)`

Quick connect helper:

```typescript
import { connectAgent } from "@deepractice-ai/agentx/client";

const agent = await connectAgent({
  baseUrl: "http://localhost:3000/agentx",
  agentId: "agent_123",
});

agent.on((event) => console.log(event));
await agent.receive("Hello!");
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Application                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ defineAgent │    │ createAgent │    │   agentx    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            ▼                                 │
│                    ┌─────────────┐                          │
│                    │    Agent    │                          │
│                    └─────────────┘                          │
│                            │                                 │
│         ┌──────────────────┼──────────────────┐             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Server    │    │   Events    │    │   Client    │     │
│  │  (HTTP/SSE) │    │  (Stream)   │    │   (SDK)     │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                                    ▲              │
│         └────────────────────────────────────┘              │
│                     Network (SSE)                           │
└─────────────────────────────────────────────────────────────┘
```

## Event Flow

Server only forwards **Stream Events** (efficient). Client reconstructs higher-level events:

```
Server → SSE → Client
         │
         ├── message_start
         ├── text_delta
         ├── text_content_block_stop
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

## Related Packages

- **[@deepractice-ai/agentx-core](../agentx-core)** - Agent lifecycle and container
- **[@deepractice-ai/agentx-engine](../agentx-engine)** - Event processing engine
- **[@deepractice-ai/agentx-types](../agentx-types)** - Type definitions
- **[@deepractice-ai/agentx-sdk-claude](../agentx-sdk-claude)** - Claude driver

## License

MIT
