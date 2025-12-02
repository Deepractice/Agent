# agentxjs

> "Define Once, Run Anywhere" - Unified Platform API for AI Agents

## Overview

`agentxjs` is the **central entry point** for the AgentX platform, providing a complete API for building and managing AI agents across different deployment scenarios.

**Key Characteristics:**

- **"Define Once, Run Anywhere"** - Same AgentDefinition works on Server and Browser
- **Docker-Style Layered Architecture** - Definition → Image → Agent lifecycle
- **Runtime Abstraction** - Platform provides Runtime (NodeRuntime, SSERuntime)
- **Web Standard Based** - Server built on Request/Response API, framework-agnostic
- **Stream-First Transport** - Efficient SSE transmission with client-side reassembly
- **Framework Adapters** - Ready-to-use adapters for Express, Hono, Next.js

## Installation

```bash
pnpm add agentxjs
```

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                            agentxjs                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                  createAgentX(runtime)                       │    │
│  │                                                              │    │
│  │   NodeRuntime (server)           SSERuntime (browser)        │    │
│  │           │                              │                   │    │
│  │           ▼                              ▼                   │    │
│  │   ┌──────────────┐              ┌───────────────────┐       │    │
│  │   │ ClaudeDriver │              │    SSEDriver      │       │    │
│  │   │ LocalSandbox │              │ RemoteContainer   │       │    │
│  │   │ SQLiteRepo   │              │ RemoteRepository  │       │    │
│  │   └──────────────┘              └───────────────────┘       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     AgentX Platform API                       │   │
│  │                                                               │   │
│  │   agentx.definitions  - Register agent templates              │   │
│  │   agentx.images       - Build/manage agent snapshots          │   │
│  │   agentx.agents       - Query running agents                  │   │
│  │   agentx.sessions     - User-facing session management        │   │
│  │   agentx.errors       - Platform-level error handling         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────┐    ┌──────────────────────────────────┐   │
│  │      /server         │    │           /client                 │   │
│  │                      │    │                                   │   │
│  │ createAgentXHandler  │    │  sseRuntime (browser)             │   │
│  │ SSEConnection        │    │  SSERuntime                       │   │
│  │                      │    │  SSEDriver                        │   │
│  │ /adapters:           │    │  RemoteContainer                  │   │
│  │  • express           │    │  RemoteRepository                 │   │
│  │  • hono              │    │                                   │   │
│  │  • next              │    │                                   │   │
│  └──────────────────────┘    └──────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Docker-Style Layered Architecture

AgentX uses a Docker-inspired lifecycle for agent management:

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     Docker-Style Lifecycle                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Definition (template)                                              │
│        │                                                             │
│        │ register                                                    │
│        ▼                                                             │
│   DefinitionManager + (auto-create MetaImage)                        │
│        │                                                             │
│        │ build (optional: create DerivedImage)                       │
│        ▼                                                             │
│   ImageManager (MetaImage or DerivedImage snapshot)                  │
│        │                                                             │
│        │ run                                                         │
│        ▼                                                             │
│   Container (creates Agent from Image)                               │
│        │                                                             │
│        │ runtime                                                     │
│        ▼                                                             │
│   Agent (running instance)                                           │
│        │                                                             │
│        │ user action                                                 │
│        ▼                                                             │
│   SessionManager (wrap for UI/external)                              │
│        │                                                             │
│        ▼                                                             │
│   Session (external view with metadata: title, userId)               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Principle**: Definition cannot directly become Agent. Must go through Image first.

---

## Module Reference

### Core API (`/`)

The main entry point for creating AgentX instances.

| Export         | Type     | Description                              |
| -------------- | -------- | ---------------------------------------- |
| `defineAgent`  | Function | Define an agent template                 |
| `createAgentX` | Function | Factory for AgentX platform with Runtime |
| `sseRuntime`   | Function | Create browser SSE runtime               |

```typescript
import { defineAgent, createAgentX } from "agentxjs";
import { nodeRuntime } from "@agentxjs/node-runtime";

// 1. Define agent (business config only)
const MyAgent = defineAgent({
  name: "Assistant",
  description: "A helpful assistant",
  systemPrompt: "You are a helpful assistant",
});

// 2. Create platform with runtime
const agentx = createAgentX(nodeRuntime());

// 3. Register definition (creates MetaImage automatically)
agentx.definitions.register(MyAgent);

// 4. Run agent from image
const metaImage = agentx.images.getMetaImage(MyAgent.name);
const agent = await agentx.images.run(metaImage.id);

// 5. Use agent
await agent.receive("Hello!");
```

#### AgentX Interface

```typescript
interface AgentX {
  readonly runtime: Runtime;
  readonly definitions: DefinitionManager;
  readonly images: ImageManager;
  readonly agents: AgentManager;
  readonly sessions: SessionManager;
  readonly errors: ErrorManager;
}

interface DefinitionManager {
  register(definition: AgentDefinition): void;
  get(name: string): AgentDefinition | undefined;
  has(name: string): boolean;
  list(): AgentDefinition[];
  unregister(name: string): boolean;
}

interface ImageManager {
  get(imageId: string): AgentImage | undefined;
  getMetaImage(definitionName: string): AgentImage | undefined;
  list(): AgentImage[];
  listByDefinition(definitionName: string): AgentImage[];
  exists(imageId: string): boolean;
  delete(imageId: string): boolean;
  run(imageId: string): Promise<Agent>;
}

interface AgentManager {
  get(agentId: string): Agent | undefined;
  has(agentId: string): boolean;
  list(): Agent[];
  destroy(agentId: string): boolean;
  destroyAll(): void;
}

interface SessionManager {
  create(imageId: string, options?: SessionOptions): Promise<Session>;
  get(sessionId: string): Session | undefined;
  list(): Session[];
  listByImage(imageId: string): Session[];
  listByUser(userId: string): Session[];
  destroy(sessionId: string): boolean;
  destroyByImage(imageId: string): boolean;
  destroyAll(): void;
}

interface ErrorManager {
  handle(error: AgentError): void;
  addHandler(handler: ErrorHandler): void;
  removeHandler(handler: ErrorHandler): void;
}
```

#### Session Interface

```typescript
interface Session {
  readonly id: string;
  readonly imageId: string;
  readonly agent: Agent;

  // Resume from previous state
  resume(): Promise<void>;

  // Fork session with copied message history
  fork(): Promise<Session>;

  // Auto-subscribe and persist messages
  collect(): Unsubscribe;

  // Get persisted conversation history
  getMessages(): Promise<Message[]>;

  // Update session metadata
  setTitle(title: string): Promise<void>;
}
```

---

### Server Module (`/server`)

HTTP handler and SSE transport for exposing agents over the network.

```typescript
import { createAgentXHandler } from "agentxjs/server";
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

| Method | Path                            | Description            |
| ------ | ------------------------------- | ---------------------- |
| GET    | `/info`                         | Platform info          |
| GET    | `/health`                       | Health check           |
| GET    | `/definitions`                  | List all definitions   |
| GET    | `/definitions/:name`            | Get definition by name |
| POST   | `/definitions`                  | Register definition    |
| DELETE | `/definitions/:name`            | Unregister definition  |
| GET    | `/images`                       | List all images        |
| GET    | `/images/:imageId`              | Get image by ID        |
| POST   | `/images/:imageId/run`          | Run agent from image   |
| DELETE | `/images/:imageId`              | Delete image           |
| GET    | `/agents`                       | List all agents        |
| GET    | `/agents/:agentId`              | Get agent info         |
| DELETE | `/agents/:agentId`              | Destroy agent          |
| GET    | `/agents/:agentId/sse`          | SSE event stream       |
| POST   | `/agents/:agentId/messages`     | Send message to agent  |
| POST   | `/agents/:agentId/interrupt`    | Interrupt processing   |
| GET    | `/sessions`                     | List all sessions      |
| GET    | `/sessions/:sessionId`          | Get session by ID      |
| POST   | `/sessions`                     | Create session         |
| POST   | `/sessions/:sessionId/resume`   | Resume session         |
| POST   | `/sessions/:sessionId/fork`     | Fork session           |
| GET    | `/sessions/:sessionId/messages` | Get session messages   |
| DELETE | `/sessions/:sessionId`          | Destroy session        |

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
import { toExpressHandler } from "agentxjs/server/adapters/express";
import express from "express";

const app = express();
app.use(express.json());
app.use("/agentx", toExpressHandler(handler));
```

#### Hono

```typescript
import { createHonoRoutes } from "agentxjs/server/adapters/hono";
import { Hono } from "hono";

const app = new Hono();
createHonoRoutes(app, "/agentx", handler);
// or: app.all("/agentx/*", toHonoHandler(handler));
```

#### Next.js App Router

```typescript
// app/agentx/[...path]/route.ts
import { createNextHandler } from "agentxjs/server/adapters/next";

const handler = createAgentXHandler(agentx);
export const { GET, POST, DELETE } = createNextHandler(handler, {
  basePath: "/agentx",
});
```

---

### Client Module (`/client`)

Browser SDK for connecting to remote AgentX servers using the same API.

```typescript
import { sseRuntime } from "agentxjs/client";
```

#### `sseRuntime(config)`

Creates a browser-compatible Runtime that connects to remote server:

```typescript
import { defineAgent, createAgentX } from "agentxjs";
import { sseRuntime } from "agentxjs/client";

// Same agent definition as server!
const MyAgent = defineAgent({
  name: "Assistant",
  systemPrompt: "You are a helpful assistant",
});

// Create SSE runtime for browser
const runtime = sseRuntime({
  serverUrl: "http://localhost:5200/agentx",
  headers: { Authorization: "Bearer xxx" }, // Optional: for HTTP requests
  sseParams: { token: "xxx" }, // Optional: for SSE auth via query string
});

// Same API as server-side!
const agentx = createAgentX(runtime);

// Register definition (syncs with server)
agentx.definitions.register(MyAgent);

// Run agent
const metaImage = agentx.images.getMetaImage(MyAgent.name);
const agent = await agentx.images.run(metaImage.id);

// Subscribe to events
agent.on("assistant_message", (event) => {
  console.log(event.data.content);
});

await agent.receive("Hello!");
```

**Key Point**: Browser uses the same `defineAgent` + `createAgentX` API.
Only the Runtime differs (`sseRuntime` vs `nodeRuntime`).

#### Browser Runtime Components

| Component          | Description                                         |
| ------------------ | --------------------------------------------------- |
| `SSERuntime`       | Browser runtime implementation                      |
| `RemoteContainer`  | Calls server to create agents, caches locally       |
| `RemoteRepository` | HTTP-based persistence (noop for saveMessage)       |
| `SSEDriver`        | EventSource-based driver with persistent connection |
| `BrowserLogger`    | Styled console logging for browser                  |

---

## Design Decisions

### Why Docker-Style Architecture?

The Definition → Image → Agent flow mirrors Docker's Dockerfile → Image → Container:

1. **Definition** = Template (like Dockerfile)
2. **Image** = Frozen snapshot (like Docker image)
3. **Agent** = Running instance (like Docker container)
4. **Session** = User-facing wrapper (like Docker compose service)

**Benefits:**

- Versioning: Create derived images with different configs
- Rollback: Return to previous image versions
- Consistency: Same image produces same behavior
- Separation: Business config (definition) vs runtime state (image)

### Why Five Managers?

| Manager     | Scope    | Responsibility                           |
| ----------- | -------- | ---------------------------------------- |
| definitions | Platform | Template registry (register, get, list)  |
| images      | Platform | Snapshot management (build, list, run)   |
| agents      | Platform | Running agent query (get, list, destroy) |
| sessions    | Platform | User-facing wrapper (create, resume)     |
| errors      | Platform | Centralized error handling               |

**Key Principle**: AgentManager only queries. Creation happens via `images.run()` or `sessions.create()`.

### Why "Define Once, Run Anywhere"?

AgentDefinition contains only business config (name, systemPrompt).
Runtime provides infrastructure (Driver, Sandbox).

| Environment | Runtime       | Driver       | Use Case                    |
| ----------- | ------------- | ------------ | --------------------------- |
| Server      | `nodeRuntime` | ClaudeDriver | Direct LLM API calls        |
| Browser     | `sseRuntime`  | SSEDriver    | Connect to server via SSE   |
| Edge        | EdgeRuntime   | EdgeDriver   | Cloudflare Workers (future) |

```typescript
// Same agent definition everywhere
const MyAgent = defineAgent({
  name: "Assistant",
  systemPrompt: "You are helpful",
});

// Different runtimes for different environments
const agentx = createAgentX(nodeRuntime()); // Server
const agentx = createAgentX(sseRuntime({ serverUrl })); // Browser
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
┌─────────────────────────────────────────────────────────────────┐
│ WRONG: Server sends assembled messages                           │
│                                                                  │
│ Server → [assembled message] → Client                            │
│          (large payload)       (just displays)                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ CORRECT: Server sends stream events                              │
│                                                                  │
│ Server → [text_delta, text_delta, ...] → Client.AgentEngine     │
│          (small increments)              (reassembles)           │
└─────────────────────────────────────────────────────────────────┘
```

### Why RemoteRepository noop for saveMessage?

Browser's `RemoteRepository.saveMessage()` is intentionally a noop:

1. Server-side `SessionCollector` persists messages
2. Prevents duplicate persistence (both server and client saving)
3. Browser only reads messages via HTTP GET

---

## Package Structure

```text
agentxjs/src/
├── AgentX.ts                    # Core platform factory
├── defineAgent.ts               # Agent definition helper
├── index.ts                     # Main entry point
├── managers/                    # Platform-level managers
│   ├── agent/                   # AgentManager (query running agents)
│   ├── definition/              # DefinitionManager (agent templates)
│   ├── image/                   # ImageManager (agent snapshots)
│   ├── session/                 # SessionManager (user-facing wrapper)
│   ├── error/                   # ErrorManager (error handling)
│   └── remote/                  # Remote platform utilities
├── runtime/                     # Runtime implementations
│   └── sse/                     # Browser SSE runtime
│       ├── SSERuntime.ts        # Main runtime + RemoteContainer
│       ├── SSEDriver.ts         # Browser SSE driver
│       ├── logger/              # BrowserLogger
│       └── repository/          # RemoteRepository
└── server/                      # Server-side HTTP handler
    ├── createAgentXHandler.ts   # Framework-agnostic handler
    ├── SSEServerTransport.ts    # SSE transport
    └── adapters/                # Framework adapters
        ├── express.ts
        ├── hono.ts
        └── next.ts
```

---

## Package Dependencies

```text
agentx-types (type definitions)
     ↑
agentx-common (logging facade)
     ↑
agentx-engine (event processing)
     ↑
agentx-agent (Agent runtime)
     ↑
agentx (this package) ← Platform API + defineAgent + sseRuntime
     ↑
agentx-runtime (NodeRuntime + ClaudeDriver)
     ↑
agentx-ui (React components)
```

---

## Related Packages

| Package                                     | Description                |
| ------------------------------------------- | -------------------------- |
| [@agentxjs/types](../agentx-types)          | Type definitions           |
| [@agentxjs/agent](../agentx-agent)          | Agent runtime              |
| [@agentxjs/engine](../agentx-engine)        | Event processing engine    |
| [@agentxjs/node-runtime](../agentx-runtime) | NodeRuntime + ClaudeDriver |
| [@agentxjs/common](../agentx-common)        | Logging facade             |
| [@agentxjs/ui](../agentx-ui)                | React components           |

---

## License

MIT
