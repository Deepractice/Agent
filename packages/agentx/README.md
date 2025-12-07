# agentxjs

> Unified API for AI Agents - Server and Browser

## Overview

`agentxjs` provides a **unified API** for building AI agents that works seamlessly across server (Node.js) and browser environments.

**Key Features:**

- **Unified API** - Same `createAgentX()` function for both server and browser
- **Type-Safe Configuration** - TypeScript discriminates between Source and Mirror modes
- **Docker-Style Lifecycle** - Container → Agent → Image
- **Event-Driven** - Real-time streaming events (text_delta, tool_call, etc.)

## Installation

```bash
pnpm add agentxjs
```

---

## Quick Start

### Server (Source Mode)

```typescript
import { createAgentX } from "agentxjs";

// Minimal - reads ANTHROPIC_API_KEY from environment
const agentx = createAgentX();

// Or with explicit configuration
const agentx = createAgentX({
  apiKey: "sk-ant-...",
  model: "claude-sonnet-4-20250514",
});

// Run an agent
const agent = await agentx.run({ name: "Assistant" });

// Subscribe to events
agent.on("text_delta", (e) => process.stdout.write(e.data.text));

// Send message
await agent.receive("Hello!");

// Cleanup
await agentx.dispose();
```

### Browser (Mirror Mode)

```typescript
import { createAgentX } from "agentxjs";

// Connect to remote server via WebSocket
const agentx = createAgentX({
  serverUrl: "ws://localhost:5200",
  token: "optional-auth-token",
});

// Same API as server!
const agent = await agentx.run({ name: "Assistant" });

agent.on("text_delta", (e) => console.log(e.data.text));

await agent.receive("Hello!");
```

---

## API Design

### Configuration Types

```typescript
// Server-side configuration (Source mode)
interface SourceConfig {
  apiKey?: string; // Default: process.env.ANTHROPIC_API_KEY
  model?: string; // Default: "claude-sonnet-4-20250514"
  baseUrl?: string; // Default: "https://api.anthropic.com"
  persistence?: Persistence;
}

// Browser-side configuration (Mirror mode)
interface MirrorConfig {
  serverUrl: string; // WebSocket URL, e.g., "ws://localhost:5200"
  token?: string; // Authentication token
  headers?: Record<string, string>;
}

// Type discrimination: presence of `serverUrl` determines mode
type AgentXConfig = SourceConfig | MirrorConfig;
```

### Type Guards

```typescript
import { isMirrorConfig, isSourceConfig } from "agentxjs";

const config: AgentXConfig = { serverUrl: "ws://localhost:5200" };

if (isMirrorConfig(config)) {
  // TypeScript knows this is MirrorConfig
  console.log(config.serverUrl);
}

if (isSourceConfig(config)) {
  // TypeScript knows this is SourceConfig
  console.log(config.apiKey);
}
```

### AgentX Interface

```typescript
interface AgentX {
  // Quick start - run agent in default container
  run(config: AgentRunConfig): Promise<Agent>;

  // Container management
  readonly containers: ContainersAPI;

  // Agent management (cross-container)
  readonly agents: AgentsAPI;

  // Image (snapshot) management
  readonly images: ImagesAPI;

  // Cleanup
  dispose(): Promise<void>;
}
```

### Sub-APIs

```typescript
// Container management
interface ContainersAPI {
  create(containerId: string): Promise<Container>;
  get(containerId: string): Container | undefined;
  list(): Container[];
}

// Agent management
interface AgentsAPI {
  run(containerId: string, config: AgentRunConfig): Promise<Agent>;
  get(agentId: string): Agent | undefined;
  list(containerId: string): Agent[];
  destroy(agentId: string): Promise<boolean>;
  destroyAll(containerId: string): Promise<void>;
}

// Image management
interface ImagesAPI {
  snapshot(agent: Agent): Promise<AgentImage>;
  list(): Promise<AgentImage[]>;
  get(imageId: string): Promise<AgentImage | null>;
  delete(imageId: string): Promise<void>;
}
```

### Agent Run Configuration

```typescript
interface AgentRunConfig {
  name: string;
  systemPrompt?: string;
}
```

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                         createAgentX(config)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  config has serverUrl?                                            │
│         │                                                         │
│         ├── YES ──▶ Mirror Mode (Browser)                         │
│         │           - MirrorRuntime                               │
│         │           - WebSocket communication                     │
│         │           - Local state mirrors server                  │
│         │                                                         │
│         └── NO ───▶ Source Mode (Server)                          │
│                     - Runtime                                     │
│                     - Direct LLM access                           │
│                     - Persistence layer                           │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│                        AgentX API                                 │
│                                                                   │
│   agentx.run(config)           Quick start                        │
│   agentx.containers.*          Container lifecycle                │
│   agentx.agents.*              Agent operations                   │
│   agentx.images.*              Snapshot management                │
│   agentx.dispose()             Cleanup                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Source vs Mirror

| Aspect        | Source (Server)      | Mirror (Browser) |
| ------------- | -------------------- | ---------------- |
| Runtime       | Runtime              | MirrorRuntime    |
| LLM Access    | Direct API calls     | Via server       |
| Persistence   | Local (SQLite, etc.) | Server-side      |
| Communication | N/A                  | WebSocket events |
| Use Case      | Backend services     | Frontend apps    |

---

## Docker-Style Lifecycle

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Lifecycle Flow                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Container                                                       │
│       │                                                           │
│       │ run(config)                                               │
│       ▼                                                           │
│   Agent (running instance)                                        │
│       │                                                           │
│       │ snapshot()                                                │
│       ▼                                                           │
│   AgentImage (frozen state)                                       │
│       │                                                           │
│       │ resume()                                                  │
│       ▼                                                           │
│   Agent (restored from image)                                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Image Operations

```typescript
// Create snapshot
const agent = await agentx.run({ name: "Assistant" });
await agent.receive("Hello!");
const image = await agentx.images.snapshot(agent);

// Resume from snapshot
const resumedAgent = await image.resume();
// Agent has previous conversation history
```

---

## Event System

### Stream Events (Real-time)

```typescript
agent.on("message_start", (e) => {
  /* Response started */
});
agent.on("text_delta", (e) => console.log(e.data.text));
agent.on("tool_call", (e) => {
  /* Tool being called */
});
agent.on("tool_result", (e) => {
  /* Tool result received */
});
agent.on("message_stop", (e) => {
  /* Response complete */
});
```

### Subscribe to All Events

```typescript
agent.on((event) => {
  console.log(event.type, event.data);
});
```

---

## Advanced Usage

### Container Management

```typescript
// Create named container
const container = await agentx.containers.create("my-container");

// Run agent in container
const agent = await agentx.agents.run("my-container", {
  name: "Assistant",
  systemPrompt: "You are helpful",
});

// List agents in container
const agents = agentx.agents.list("my-container");

// Destroy all agents in container
await agentx.agents.destroyAll("my-container");
```

### Custom Persistence (Source Mode)

```typescript
import { createAgentX } from "agentxjs";
import { createPersistence } from "@agentxjs/persistence";

const agentx = createAgentX({
  apiKey: "sk-ant-...",
  persistence: createPersistence({
    driver: "sqlite",
    path: "./data.db",
  }),
});
```

---

## Design Decisions

### Why Unified `createAgentX`?

Instead of separate `createSource()` and `createMirror()` functions, we use a single `createAgentX()` with type discrimination:

```typescript
// Type system determines mode automatically
createAgentX(); // Source (no serverUrl)
createAgentX({ apiKey: "..." }); // Source (no serverUrl)
createAgentX({ serverUrl: "ws://..." }); // Mirror (has serverUrl)
```

**Benefits:**

- Single import, single function to learn
- TypeScript enforces correct configuration
- Easy refactoring between modes

### Why WebSocket for Mirror?

Mirror mode uses WebSocket (not HTTP/SSE) for bidirectional communication:

1. **Request/Response pattern** - Browser sends commands, server responds
2. **Real-time events** - Server pushes stream events to browser
3. **State synchronization** - Browser maintains local mirror of server state

### Why No `defineAgent`?

Previous versions required:

```typescript
const MyAgent = defineAgent({ name: "Assistant", ... });
agentx.definitions.register(MyAgent);
const image = agentx.images.getMetaImage(MyAgent.name);
const agent = await image.run();
```

New API is simpler:

```typescript
const agent = await agentx.run({ name: "Assistant", ... });
```

The `AgentRunConfig` replaces `AgentDefinition` for most use cases. For advanced scenarios (versioning, derived images), use the Images API directly.

---

## Package Dependencies

```text
@agentxjs/types      Type definitions
       ↑
@agentxjs/common     Logger facade
       ↑
@agentxjs/runtime    Runtime implementation
       ↑
@agentxjs/mirror     MirrorRuntime implementation
       ↑
agentxjs             This package (unified API)
```

---

## License

MIT
