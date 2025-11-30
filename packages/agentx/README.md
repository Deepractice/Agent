# @deepractice-ai/agentx

> "Define Once, Run Anywhere" - Unified Platform API for AI Agents

## Overview

`@deepractice-ai/agentx` is the **central entry point** for the AgentX platform, providing a complete API for building and managing AI agents across different deployment scenarios.

**Key Characteristics:**

- **"Define Once, Run Anywhere"** - Same AgentDefinition works on Server and Browser
- **Runtime Abstraction** - Platform provides Runtime (NodeRuntime, SSERuntime)
- **Web Standard Based** - Server built on Request/Response API, framework-agnostic
- **Stream-First Transport** - Efficient SSE transmission with client-side reassembly
- **Framework Adapters** - Ready-to-use adapters for Express, Hono, Next.js

## Installation

```bash
pnpm add @deepractice-ai/agentx
```

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        @deepractice-ai/agentx                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │               createAgentX(runtime)                          │    │
│  │                                                              │    │
│  │   NodeRuntime (server)         SSERuntime (browser)          │    │
│  │            │                           │                     │    │
│  │            ▼                           ▼                     │    │
│  │   ┌──────────────┐            ┌──────────────┐              │    │
│  │   │ ClaudeDriver │            │  SSEDriver   │              │    │
│  │   │ LocalSandbox │            │ NoopSandbox  │              │    │
│  │   └──────────────┘            └──────────────┘              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────┐    ┌──────────────────────────────────┐   │
│  │      /server         │    │           /client                 │   │
│  │                      │    │                                   │   │
│  │ createAgentXHandler  │    │  createSSERuntime (browser)       │   │
│  │ SSEConnection        │    │  SSERuntime                       │   │
│  │                      │    │  SSEDriver                        │   │
│  │ /adapters:           │    │                                   │   │
│  │  • express           │    │                                   │   │
│  │  • hono              │    │                                   │   │
│  │  • next              │    │                                   │   │
│  └──────────────────────┘    └──────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Module Reference

### Core API (`/`)

The main entry point for creating AgentX instances.

| Export         | Type     | Description                               |
| -------------- | -------- | ----------------------------------------- |
| `defineAgent`  | Function | Define an agent template                  |
| `createAgentX` | Function | Factory for AgentX instances with Runtime |

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

// 3. Create agent instance
const agent = agentx.agents.create(MyAgent);

// 4. Use agent
await agent.receive("Hello!");
```

#### AgentX Interface

```typescript
interface AgentX {
  readonly runtime: Runtime;
  readonly agents: AgentManager;
}

interface AgentManager {
  create(definition: AgentDefinition): Agent;
  get(agentId: string): Agent | undefined;
  has(agentId: string): boolean;
  destroy(agentId: string): boolean;
  destroyAll(): void;
  list(): Agent[];
}
```

---

### Server Module (`/server`)

HTTP handler and SSE transport for exposing agents over the network.

```typescript
import { createAgentXHandler } from "@deepractice-ai/agentx/server";
```

#### `createAgentXHandler(agentx, options?)`

Creates a framework-agnostic HTTP handler based on Web Standard Request/Response.

```typescript
const handler = createAgentXHandler(agentx, {
  basePath: "/agentx", // URL prefix
  allowDynamicCreation: false, // Enable POST /agents
  allowedDefinitions: [], // Whitelist for dynamic creation
  hooks: {
    onConnect: (agentId, connectionId) => {
      /* SSE connected */
    },
    onDisconnect: (agentId, connectionId) => {
      /* SSE disconnected */
    },
    onMessage: (agentId, message) => {
      /* Message received */
    },
    onError: (agentId, error) => {
      /* Error occurred */
    },
  },
});

// Returns: (request: Request) => Promise<Response>
```

#### HTTP API Endpoints

| Method | Path                         | Description               |
| ------ | ---------------------------- | ------------------------- |
| GET    | `/info`                      | Platform info             |
| GET    | `/health`                    | Health check              |
| GET    | `/agents`                    | List all agents           |
| POST   | `/agents`                    | Create agent (if enabled) |
| GET    | `/agents/:agentId`           | Get agent info            |
| DELETE | `/agents/:agentId`           | Destroy agent             |
| GET    | `/agents/:agentId/sse`       | SSE event stream          |
| POST   | `/agents/:agentId/messages`  | Send message to agent     |
| POST   | `/agents/:agentId/interrupt` | Interrupt processing      |

#### SSE Transport

The server only forwards **Stream Layer events** via SSE:

```text
Server AgentEngine
       │
       ├── text_delta          ─┐
       ├── tool_call            │
       ├── message_start        ├──▶ SSE Stream
       ├── message_stop         │
       └── error               ─┘
                                │
                                ▼
                         Browser Client
                                │
                        AgentEngine (client)
                                │
                        Reassembles:
                        ├── assistant_message
                        ├── tool_call_message
                        └── turn_response
```

---

### Server Adapters (`/server/adapters`)

Ready-to-use adapters for popular HTTP frameworks.

#### Express

```typescript
import { toExpressHandler } from "@deepractice-ai/agentx/server/adapters/express";
import express from "express";

const app = express();
app.use(express.json());
app.use("/agentx", toExpressHandler(handler));
```

#### Hono

```typescript
import { createHonoRoutes } from "@deepractice-ai/agentx/server/adapters/hono";
import { Hono } from "hono";

const app = new Hono();
createHonoRoutes(app, "/agentx", handler);
// or: app.all("/agentx/*", toHonoHandler(handler));
```

#### Next.js App Router

```typescript
// app/agentx/[...path]/route.ts
import { createNextHandler } from "@deepractice-ai/agentx/server/adapters/next";

const handler = createAgentXHandler(agentx);
export const { GET, POST, DELETE } = createNextHandler(handler, {
  basePath: "/agentx",
});
```

---

### Client Module (`/client`)

Browser SDK for connecting to remote AgentX servers using the same API.

```typescript
import { createSSERuntime } from "@deepractice-ai/agentx/client";
```

#### `createSSERuntime(config)`

Creates a browser-compatible Runtime that connects to remote server:

```typescript
import { defineAgent, createAgentX } from "@deepractice-ai/agentx";
import { createSSERuntime } from "@deepractice-ai/agentx/client";

// Same agent definition as server!
const MyAgent = defineAgent({
  name: "Assistant",
  systemPrompt: "You are a helpful assistant",
});

// Create SSE runtime for browser
const runtime = createSSERuntime({
  serverUrl: "http://localhost:5200/agentx",
  agentId: "agent_123", // Connect to existing server-side agent
});

// Same API as server-side!
const agentx = createAgentX(runtime);
const agent = agentx.agents.create(MyAgent);

// Subscribe to events
agent.on("assistant_message", (event) => {
  console.log(event.data.content);
});

await agent.receive("Hello!");
```

**Key Point**: Browser uses the same `defineAgent` + `createAgentX` API.
Only the Runtime differs (`SSERuntime` vs `NodeRuntime`).

---

## Design Decisions

### Why "Define Once, Run Anywhere"?

AgentDefinition contains only business config (name, systemPrompt).
Runtime provides infrastructure (Driver, Sandbox).

| Environment | Runtime     | Driver       | Use Case                    |
| ----------- | ----------- | ------------ | --------------------------- |
| Server      | NodeRuntime | ClaudeDriver | Direct LLM API calls        |
| Browser     | SSERuntime  | SSEDriver    | Connect to server via SSE   |
| Edge        | EdgeRuntime | EdgeDriver   | Cloudflare Workers (future) |

```typescript
// Same agent definition everywhere
const MyAgent = defineAgent({
  name: "Assistant",
  systemPrompt: "You are helpful",
});

// Different runtimes for different environments
const agentx = createAgentX(nodeRuntime); // Server
const agentx = createAgentX(sseRuntime); // Browser
```

### Why Web Standard Request/Response?

The server handler is built on Web Standard APIs instead of Express/Fastify/etc:

1. **Framework Agnostic** - Works with any framework via thin adapters
2. **Edge Compatible** - Runs on Cloudflare Workers, Deno Deploy, etc.
3. **Future Proof** - Web Standards are stable and widely supported
4. **Testable** - Can test handlers without framework boilerplate

```typescript
// The handler is just a function
type AgentXHandler = (request: Request) => Promise<Response>;

// Adapters are thin wrappers
const toExpressHandler = (handler) => (req, res) => {
  const request = toWebRequest(req);
  const response = await handler(request);
  copyToExpressResponse(response, res);
};
```

### Why Stream-Only SSE Transport?

Server forwards only Stream Layer events, not Message/State/Turn events:

1. **Efficient Bandwidth** - Only transmit incremental deltas
2. **Decoupling** - Server doesn't need to know client's event needs
3. **Consistency** - Same AgentEngine code runs on server and client
4. **Flexibility** - Different clients can process events differently

```text
┌─────────────────────────────────────────────────────────────┐
│ WRONG: Server sends assembled messages                       │
│                                                              │
│ Server → [assembled message] → Client                        │
│          (large payload)       (just displays)               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ CORRECT: Server sends stream events                          │
│                                                              │
│ Server → [text_delta, text_delta, ...] → Client.AgentEngine │
│          (small increments)              (reassembles)       │
└─────────────────────────────────────────────────────────────┘
```

### Why Provider Registry?

Built-in dependency injection enables extensibility without coupling:

```typescript
import { LoggerFactoryKey } from "@deepractice-ai/agentx-types";

// Register custom logger
agentx.provide(LoggerFactoryKey, myLoggerFactory);

// Framework resolves internally
const logger = agentx.resolve(LoggerFactoryKey);
```

**Use Cases:**

- Custom logger implementation
- Metrics/telemetry providers
- Storage backends
- Authentication handlers

---

## Package Structure

```text
@deepractice-ai/agentx
├── /                    # Core: createAgentX, agentx singleton
├── /server              # HTTP handler, SSE transport
│   └── /adapters        # Framework adapters
│       ├── /express     # Express.js adapter
│       ├── /hono        # Hono adapter
│       └── /next        # Next.js App Router adapter
└── /client              # Browser/Node.js client SDK
```

---

## Package Dependencies

```text
agentx-types (type definitions)
     ↑
agentx-logger (logging facade)
     ↑
agentx-engine (event processing)
     ↑
agentx-agent (Agent runtime)
     ↑
agentx (this package) ← Platform API + defineAgent
     ↑
agentx-node (NodeRuntime + ClaudeDriver)
     ↑
agentx-ui (React components)
```

---

## Related Packages

| Package                                           | Description                |
| ------------------------------------------------- | -------------------------- |
| [@deepractice-ai/agentx-types](../agentx-types)   | Type definitions           |
| [@deepractice-ai/agentx-agent](../agentx-agent)   | Agent runtime              |
| [@deepractice-ai/agentx-engine](../agentx-engine) | Event processing engine    |
| [@deepractice-ai/agentx-node](../agentx-node)     | NodeRuntime + ClaudeDriver |
| [@deepractice-ai/agentx-logger](../agentx-logger) | Logging facade             |
| [@deepractice-ai/agentx-ui](../agentx-ui)         | React components           |

---

## License

MIT
