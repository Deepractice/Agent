# @agentxjs/runtime

> Complete Runtime implementation for AI Agents with Claude SDK integration

## Overview

`@agentxjs/runtime` provides the complete runtime infrastructure for AI agents, including:

- **SystemBus** - Event-driven communication backbone
- **Container** - Agent lifecycle management
- **Environment** (Receptor + Effector) - External world interface (Claude SDK)
- **Session** - Message persistence
- **Persistence** - Storage layer (SQLite, Memory)

**Key Features:**

- **Event-Driven Architecture** - All operations via command events
- **Claude SDK Integration** - Production-ready ClaudeEnvironment
- **Pluggable Storage** - SQLite, Memory, or custom backends
- **Type-Safe Commands** - Request/response pattern with full typing
- **Cross-Platform** - Works in Node.js (Browser support via agentxjs)

## Installation

```bash
pnpm add @agentxjs/runtime
```

**Dependencies:**

- `@anthropic-ai/claude-agent-sdk` - Claude API client
- `better-sqlite3` - SQLite database (optional, for persistence)
- `unstorage` - Unified storage layer

---

## Quick Start

### Minimal Setup

```typescript
import { createRuntime } from "@agentxjs/runtime";

// Minimal - uses environment variable ANTHROPIC_API_KEY
const runtime = createRuntime();

// Subscribe to events
runtime.on("text_delta", (e) => {
  console.log(e.data.text);
});

// Create container
const containerRes = await runtime.request("container_create_request", {
  containerId: "my-container",
});

// Run agent
const agentRes = await runtime.request("agent_run_request", {
  containerId: "my-container",
  config: {
    name: "Assistant",
    systemPrompt: "You are a helpful assistant",
  },
});

// Send message
await runtime.request("agent_receive_request", {
  agentId: agentRes.data.agentId,
  content: "Hello!",
});

// Cleanup
await runtime.dispose();
```

### With Configuration

```typescript
import { createRuntime, createPersistence } from "@agentxjs/runtime";

const runtime = createRuntime({
  // LLM configuration
  llm: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseUrl: "https://api.anthropic.com",
  },

  // Persistence
  persistence: createPersistence({
    driver: "sqlite",
    options: {
      filename: "./data.db",
    },
  }),

  // Logger
  logger: {
    level: "info",
    enableTimestamp: true,
  },
});
```

---

## Architecture

### System Overview

```text
┌────────────────────────────────────────────────────────────────┐
│                          Runtime                                │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                    SystemBus                            │  │
│   │  (Central event bus - all communication flows here)     │  │
│   └──────────────────────┬──────────────────────────────────┘  │
│                          │                                      │
│          ┌───────────────┼───────────────┐                      │
│          │               │               │                      │
│          ▼               ▼               ▼                      │
│   ┌─────────────┐  ┌──────────┐  ┌────────────┐                │
│   │Environment  │  │Container │  │Persistence │                │
│   │             │  │          │  │            │                │
│   │ Receptor    │  │  Agent1  │  │  SQLite    │                │
│   │ Effector    │  │  Agent2  │  │  Images    │                │
│   │ (Claude SDK)│  │  Agent3  │  │  Sessions  │                │
│   └─────────────┘  └──────────┘  └────────────┘                │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component       | Role                     | Examples                          |
| --------------- | ------------------------ | --------------------------------- |
| **SystemBus**   | Event distribution       | Emit, subscribe, request/response |
| **Environment** | External world interface | Claude API calls, streaming       |
| **Container**   | Agent lifecycle          | Create, destroy, manage agents    |
| **Session**     | Message persistence      | Save/load conversation history    |
| **Persistence** | Storage backend          | SQLite, Memory, custom            |

---

## SystemBus - Event Backbone

All Runtime operations go through the SystemBus using **command events**.

### Request/Response Pattern

```typescript
// Type-safe request
const response = await runtime.request("container_create_request", {
  containerId: "my-container",
});

// Response is fully typed
console.log(response.data.containerId); // ✓ TypeScript knows this exists
```

### Event Subscription

```typescript
// Subscribe to specific event type
runtime.on("text_delta", (event) => {
  console.log(event.data.text);
});

// Subscribe to multiple types
runtime.on(["message_start", "message_stop"], (event) => {
  console.log(event.type);
});

// Subscribe to all events
runtime.onAny((event) => {
  console.log(event.type, event.data);
});

// Unsubscribe
const unsubscribe = runtime.on("text_delta", handler);
unsubscribe();
```

### Available Commands

#### Container Commands

```typescript
// Create container
const res = await runtime.request("container_create_request", {
  containerId: "my-container",
});

// Destroy container
await runtime.request("container_destroy_request", {
  containerId: "my-container",
});
```

#### Agent Commands

```typescript
// Run agent
const res = await runtime.request("agent_run_request", {
  containerId: "my-container",
  config: {
    name: "Assistant",
    systemPrompt: "You are helpful",
  },
});

// Send message
await runtime.request("agent_receive_request", {
  agentId: res.data.agentId,
  content: "Hello!",
});

// Interrupt agent
await runtime.request("agent_interrupt_request", {
  agentId: res.data.agentId,
});

// Destroy agent
await runtime.request("agent_destroy_request", {
  agentId: res.data.agentId,
});
```

#### Session Commands

```typescript
// Create session
await runtime.request("session_create_request", {
  sessionId: "session_123",
  containerId: "my-container",
  agentId: "agent_123",
});

// Get session
const res = await runtime.request("session_get_request", {
  sessionId: "session_123",
});

// Delete session
await runtime.request("session_delete_request", {
  sessionId: "session_123",
});
```

### Direct Command Emission

For advanced use cases:

```typescript
// Emit command directly (fire and forget)
runtime.emitCommand("agent_receive_request", {
  requestId: "req_123",
  agentId: "agent_123",
  content: "Hello!",
});

// Listen for response
runtime.onCommand("agent_receive_response", (event) => {
  if (event.data.requestId === "req_123") {
    console.log("Response:", event.data);
  },
});
```

---

## Environment - External World Interface

Environment connects Runtime to the external world (Claude API).

### ClaudeEnvironment

Built-in implementation using `@anthropic-ai/claude-agent-sdk`:

```typescript
import { createRuntime } from "@agentxjs/runtime";

const runtime = createRuntime({
  llm: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseUrl: "https://api.anthropic.com",
  },
});
```

### Architecture

```text
┌────────────────────────────────────────────────────────────┐
│                    Environment                              │
├────────────────────────────────────────────────────────────┤
│                                                             │
│   Receptor (Perceives external world → emits to SystemBus) │
│       │                                                     │
│       │  Claude API Streaming Response                      │
│       ▼                                                     │
│   ┌──────────────────────────────────────────────────────┐ │
│   │  Transforms Claude SDK events → DriveableEvent        │ │
│   │  (message_delta, tool_use, etc.)                      │ │
│   └──────────────────────────────────────────────────────┘ │
│       │                                                     │
│       │  emit to SystemBus                                  │
│       ▼                                                     │
│   SystemBus                                                 │
│       │                                                     │
│       │  subscribe                                          │
│       ▼                                                     │
│   Effector (Subscribes to SystemBus → acts on external world)│
│       │                                                     │
│       │  Executes tool calls                                │
│       ▼                                                     │
│   External Tools (MCP, filesystem, etc.)                    │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## Container - Agent Lifecycle

Container manages multiple agents:

```typescript
// Via command events (recommended)
const res = await runtime.request("container_create_request", {
  containerId: "my-container",
});

// Run agents in container
const agent1 = await runtime.request("agent_run_request", {
  containerId: "my-container",
  config: { name: "Agent1" },
});

const agent2 = await runtime.request("agent_run_request", {
  containerId: "my-container",
  config: { name: "Agent2" },
});

// Destroy container (destroys all agents)
await runtime.request("container_destroy_request", {
  containerId: "my-container",
});
```

---

## Persistence - Storage Layer

### Built-in Storage Backends

#### SQLite (Production)

```typescript
import { createRuntime, createPersistence } from "@agentxjs/runtime";

const runtime = createRuntime({
  persistence: createPersistence({
    driver: "sqlite",
    options: {
      filename: "./data.db",
    },
  }),
});
```

#### Memory (Development)

```typescript
const runtime = createRuntime({
  persistence: createPersistence({
    driver: "memory",
  }),
});
```

### Storage Schema

Persistence stores:

- **Images** - Agent snapshots with conversation history
- **Containers** - Container metadata
- **Sessions** - Message history per agent

```typescript
// Save agent image
const image = await runtime.request("image_snapshot_request", {
  agentId: "agent_123",
});

// Resume from image
const agent = await runtime.request("image_resume_request", {
  imageId: image.data.imageId,
});
```

---

## Advanced Usage

### Custom Persistence Backend

```typescript
import { type StorageDriver } from "@agentxjs/runtime";

const customDriver: StorageDriver = {
  async getItem(key) {
    // Fetch from your backend
  },
  async setItem(key, value) {
    // Save to your backend
  },
  async removeItem(key) {
    // Delete from your backend
  },
  async getKeys(base) {
    // List keys with prefix
  },
  async clear() {
    // Clear all data
  },
};

const runtime = createRuntime({
  persistence: createPersistence({
    driver: customDriver,
  }),
});
```

### Event Filtering

```typescript
// Filter events by agent
runtime.on(
  "text_delta",
  (event) => {
    console.log(event.data.text);
  },
  {
    filter: (event) => event.context?.agentId === "agent_123",
  }
);

// Priority execution
runtime.on("message_stop", handler, {
  priority: 10, // Higher priority runs first
});

// One-time subscription
runtime.once("agent_created", (event) => {
  console.log("Agent created:", event.data.agentId);
});
```

---

## Testing

Runtime is designed for easy testing:

```typescript
import { createRuntime, createPersistence } from "@agentxjs/runtime";
import { describe, it, expect } from "vitest";

describe("Runtime", () => {
  it("creates and runs agent", async () => {
    const runtime = createRuntime({
      llm: {
        apiKey: "test-key",
      },
      persistence: createPersistence({ driver: "memory" }),
    });

    // Create container
    const containerRes = await runtime.request("container_create_request", {
      containerId: "test-container",
    });

    expect(containerRes.data.containerId).toBe("test-container");

    // Run agent
    const agentRes = await runtime.request("agent_run_request", {
      containerId: "test-container",
      config: { name: "TestAgent" },
    });

    expect(agentRes.data.name).toBe("TestAgent");

    await runtime.dispose();
  });
});
```

---

## Design Decisions

### Why Event-Driven?

Event-driven architecture enables:

1. **Decoupling** - Components communicate via events, not direct calls
2. **Extensibility** - Add new components without modifying existing ones
3. **Testability** - Mock events instead of entire components
4. **Observability** - All operations are visible as events

### Why SystemBus?

SystemBus provides:

1. **Single Source of Truth** - All communication flows through one point
2. **Type Safety** - Commands are fully typed
3. **Request/Response** - Async operations with correlation IDs
4. **Priority/Filtering** - Advanced subscription options

### Why Separate Environment?

Environment abstraction allows:

1. **Multiple Backends** - Claude, OpenAI, local models
2. **Testing** - Mock Environment in tests
3. **Cross-Platform** - Different implementations for Node.js, Browser
4. **Clear Boundary** - External world vs. internal logic

---

## Configuration Reference

```typescript
interface RuntimeConfig {
  // LLM configuration
  llm?: {
    apiKey?: string; // Default: process.env.ANTHROPIC_API_KEY
    baseUrl?: string; // Default: "https://api.anthropic.com"
  };

  // Persistence
  persistence?: Persistence;

  // Logger
  logger?: {
    level?: LogLevel;
    enableTimestamp?: boolean;
    enableColor?: boolean;
  };
}
```

---

## Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Optional
ANTHROPIC_BASE_URL=https://api.anthropic.com  # Custom endpoint
LOG_LEVEL=info                                  # debug, info, warn, error
```

---

## Package Dependencies

```text
@agentxjs/types        Type definitions
       ↑
@agentxjs/common       Logger facade
       ↑
@agentxjs/agent        AgentEngine
       ↑
@agentxjs/runtime      This package (Runtime + Environment + Persistence)
       ↑
agentxjs               High-level unified API
```

---

## Related Packages

- **[@agentxjs/types](../types)** - Type definitions
- **[@agentxjs/common](../common)** - Logger facade
- **[@agentxjs/agent](../agent)** - AgentEngine
- **[agentxjs](../agentx)** - High-level unified API

---

## License

MIT
