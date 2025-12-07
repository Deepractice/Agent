# AgentX

AgentX is the unified high-level API for AI Agents. It provides a simple, consistent interface that works the same way in both local and remote modes.

## Architecture

```
Local Mode                          Remote Mode
─────────────────────────────────────────────────────────
AgentX                              AgentX
  │                                   │
  └── Runtime (embedded)              └── WebSocket ──→ Server
        │                                                │
        └── LLM, Storage                                 └── Runtime
```

## Quick Start

```typescript
import { createAgentX } from "agentxjs";

// Create AgentX (local mode by default)
const agentx = await createAgentX();

// Create a container
const containerRes = await agentx.request("container_create_request", {
  containerId: "my-container",
});

// Run an agent
const agentRes = await agentx.request("agent_run_request", {
  containerId: "my-container",
  config: {
    name: "Assistant",
    systemPrompt: "You are a helpful assistant.",
  },
});

// Subscribe to streaming text
agentx.on("text_delta", (e) => {
  process.stdout.write(e.data.text);
});

// Send a message
await agentx.request("agent_receive_request", {
  agentId: agentRes.data.agentId,
  content: "Hello!",
});

// Cleanup
await agentx.dispose();
```

## Configuration

### Local Mode

Run AgentX with an embedded runtime, connecting directly to the LLM API.

```typescript
const agentx = await createAgentX({
  llm: {
    apiKey: "sk-ant-...", // Default: process.env.ANTHROPIC_API_KEY
    baseUrl: "https://api.anthropic.com",
    model: "claude-sonnet-4-20250514",
  },
  storage: {
    driver: "sqlite", // memory | fs | sqlite | postgresql | ...
    path: "./data.db",
  },
});
```

### Remote Mode

Connect to a remote AgentX server via WebSocket.

```typescript
const agentx = await createAgentX({
  server: "ws://localhost:5200",
});
```

## API Reference

### Core Methods

#### `request(type, data, timeout?)`

Send a command request and wait for the response.

```typescript
const res = await agentx.request("container_create_request", {
  containerId: "my-container",
});
console.log(res.data.containerId);
```

Available request types:

| Request Type               | Description                 |
| -------------------------- | --------------------------- |
| `container_create_request` | Create a new container      |
| `agent_run_request`        | Run an agent in a container |
| `agent_receive_request`    | Send a message to an agent  |
| `agent_stop_request`       | Stop an agent               |
| `agent_destroy_request`    | Destroy an agent            |

#### `on(type, handler)`

Subscribe to events.

```typescript
const unsubscribe = agentx.on("text_delta", (e) => {
  process.stdout.write(e.data.text);
});

// Later: stop listening
unsubscribe();
```

Common event types:

| Event Type           | Description                |
| -------------------- | -------------------------- |
| `text_delta`         | Incremental text output    |
| `message_start`      | Streaming message begins   |
| `message_stop`       | Streaming message ends     |
| `assistant_message`  | Complete assistant message |
| `tool_call_message`  | Tool call message          |
| `conversation_start` | Conversation started       |
| `conversation_end`   | Conversation ended         |

#### `onCommand(type, handler)`

Subscribe to command events with full type safety.

```typescript
agentx.onCommand("container_create_response", (e) => {
  console.log("Container created:", e.data.containerId);
});
```

#### `emitCommand(type, data)`

Emit a command event directly. Use `request()` for most cases.

```typescript
agentx.emitCommand("agent_receive_request", {
  requestId: "req_123",
  agentId: "agent_456",
  content: "Hello!",
});
```

### Server Methods (Local Mode Only)

#### `listen(port, host?)`

Start listening for remote connections.

```typescript
await agentx.listen(5200);
console.log("Server running on ws://localhost:5200");
```

#### `close()`

Stop listening for remote connections.

```typescript
await agentx.close();
```

### Lifecycle

#### `dispose()`

Dispose AgentX and release all resources.

```typescript
await agentx.dispose();
```

## Storage Drivers

| Driver       | Description                         | Config                  |
| ------------ | ----------------------------------- | ----------------------- |
| `memory`     | In-memory (default, non-persistent) | -                       |
| `fs`         | File system                         | `path: "./data"`        |
| `sqlite`     | SQLite database                     | `path: "./data.db"`     |
| `postgresql` | PostgreSQL                          | `url: "postgres://..."` |
| `mysql`      | MySQL                               | `url: "mysql://..."`    |
| `mongodb`    | MongoDB                             | `url: "mongodb://..."`  |
| `redis`      | Redis                               | `url: "redis://..."`    |

## Complete Example

```typescript
import { createAgentX } from "agentxjs";

async function main() {
  // Create AgentX with SQLite storage
  const agentx = await createAgentX({
    storage: { driver: "sqlite", path: "./chat.db" },
  });

  // Create container
  await agentx.request("container_create_request", {
    containerId: "main",
  });

  // Run agent
  const { data: agent } = await agentx.request("agent_run_request", {
    containerId: "main",
    config: {
      name: "Claude",
      systemPrompt: "You are a helpful coding assistant.",
    },
  });

  // Subscribe to events
  agentx.on("text_delta", (e) => process.stdout.write(e.data.text));
  agentx.on("conversation_end", () => console.log("\n--- Done ---"));

  // Chat
  await agentx.request("agent_receive_request", {
    agentId: agent.agentId,
    content: "Write a hello world in TypeScript",
  });

  // Cleanup
  await agentx.dispose();
}

main();
```

## Related

- [Event System](./event.md) - Event types and patterns
- [Runtime](./runtime.md) - Lower-level runtime API
- [Agent](./agent.md) - Agent engine internals
