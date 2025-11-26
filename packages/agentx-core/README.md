# @deepractice-ai/agentx-core

**AgentX Core** - Agent Lifecycle and Session Management for AI Agents.

## Overview

AgentX Core provides the **stateful layer** on top of the stateless Engine. It manages Agent instances (like Spring's ApplicationContext manages Beans) and Session persistence.

**Key Design**: Core follows the Spring IoC pattern where `AgentDefinition` is like `BeanDefinition`, `Agent` is like a Bean instance, and `AgentContainer` is like `ApplicationContext`.

## Features

- **Spring-like Architecture** - Familiar patterns for Java developers
- **Agent Lifecycle** - `running` / `destroyed` state management
- **Session Management** - Message persistence with agent association
- **Functional API** - Simple `createAgent()`, `getAgent()`, `destroyAgent()` functions
- **Type-safe Events** - Subscribe to agent events with type safety

## Installation

```bash
pnpm add @deepractice-ai/agentx-core
```

## Quick Start

### Basic Usage

```typescript
import {
  initializeCore,
  createAgent,
  getAgent,
  destroyAgent,
} from "@deepractice-ai/agentx-core";
import { AgentEngine } from "@deepractice-ai/agentx-engine";

// 1. Initialize core (once per process)
const engine = new AgentEngine({ driver: myDriver });
initializeCore(engine);

// 2. Create an agent
const agent = createAgent(
  { name: "Claude", driver: claudeDriver },  // Definition
  { model: "claude-sonnet-4-20250514" }       // Config
);

// 3. Subscribe to events
agent.on((event) => {
  if (event.type === "text_delta") {
    process.stdout.write(event.data.text);
  }
});

// 4. Send a message
await agent.receive("Hello!");

// 5. Clean up
await destroyAgent(agent.agentId);
```

### With Sessions

```typescript
import {
  createSession,
  associateAgent,
  addMessage,
  createMessage,
} from "@deepractice-ai/agentx-core";

// Create a session
let session = createSession("My Chat");

// Associate with an agent
session = associateAgent(session, agent.agentId);

// Add messages
const userMsg = createMessage(agent.agentId, "user", "Hello!");
session = addMessage(session, userMsg);

const assistantMsg = createMessage(agent.agentId, "assistant", "Hi there!");
session = addMessage(session, assistantMsg);

console.log(session.messages.length); // 2
```

## API Reference

### Context Management

Initialize the core before using any agent APIs:

```typescript
import { initializeCore, getContext, isInitialized, resetContext } from "@deepractice-ai/agentx-core";

// Initialize (required once per process)
initializeCore(engine, {
  container: customContainer,           // Optional: custom AgentContainer
  sessionRepository: customRepository,  // Optional: custom SessionRepository
});

// Check initialization
if (isInitialized()) {
  const ctx = getContext();
  console.log(ctx.container.count()); // Number of active agents
}

// Reset (for testing)
resetContext();
```

### Agent Definition

Static configuration that describes an agent type:

```typescript
interface AgentDefinition {
  name: string;           // Agent type name
  driver: Driver;         // AI SDK adapter
  systemPrompt?: string;  // System instructions
  description?: string;   // Human-readable description
  version?: string;       // Version identifier
}

// Example
const definition: AgentDefinition = {
  name: "CodeAssistant",
  driver: claudeDriver,
  systemPrompt: "You are a helpful coding assistant.",
  version: "1.0.0",
};
```

### Agent Config

Runtime configuration for a specific agent instance:

```typescript
interface AgentConfig {
  agentId?: string;                  // Custom ID (auto-generated if not provided)
  model?: string;                    // Model override
  temperature?: number;              // Temperature setting
  maxTokens?: number;                // Max tokens
  sessionId?: string;                // Associated session
  metadata?: Record<string, unknown>; // Custom metadata
}

// Example
const config: AgentConfig = {
  agentId: "agent_customer_support_1",
  model: "claude-sonnet-4-20250514",
  temperature: 0.7,
};
```

### Agent

Runtime instance with lifecycle management:

```typescript
const agent = createAgent(definition, config);

// Properties
agent.agentId;    // Unique identifier
agent.lifecycle;  // "running" | "destroyed"
agent.state;      // "idle" | "responding" | "awaiting_tool_result"
agent.createdAt;  // Creation timestamp

// Methods
await agent.receive("Hello!");           // Send message
const unsubscribe = agent.on(handler);   // Subscribe to events
agent.abort();                           // Force stop (system/error)
agent.interrupt();                       // User-initiated stop
await agent.destroy();                   // Clean up
```

### Functional API

Simple functions for agent management:

```typescript
import {
  createAgent,
  getAgent,
  hasAgent,
  getAllAgentIds,
  getAgentCount,
  destroyAgent,
  destroyAllAgents,
} from "@deepractice-ai/agentx-core";

// Create
const agent = createAgent(definition, config);

// Query
const agent2 = getAgent("agent_123");           // Get by ID
const exists = hasAgent("agent_123");           // Check existence
const ids = getAllAgentIds();                   // List all IDs
const count = getAgentCount();                  // Total count

// Destroy
await destroyAgent("agent_123");                // Destroy one
await destroyAllAgents();                       // Destroy all
```

### Session Management

```typescript
import {
  createSession,
  associateAgent,
  disassociateAgent,
  addMessage,
  createMessage,
} from "@deepractice-ai/agentx-core";

// Create session
let session = createSession("Chat Title");

// Agent association (one-to-one)
session = associateAgent(session, "agent_123");
session = disassociateAgent(session);

// Add messages
const message = createMessage(
  "agent_123",    // agentId
  "user",         // role: "user" | "assistant" | "tool" | "error"
  "Hello!"        // content
);
session = addMessage(session, message);
```

## Agent Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│  Agent Lifecycle                                                     │
│                                                                      │
│  createAgent()                                                       │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                      RUNNING                                 │    │
│  │                                                              │    │
│  │  States:                                                     │    │
│  │  ┌─────────┐  receive()  ┌────────────┐  tool_call  ┌─────┐ │    │
│  │  │  idle   │ ─────────→  │ responding │ ─────────→  │await│ │    │
│  │  └─────────┘  ←─────────  └────────────┘  ←─────────  │tool│ │    │
│  │       ▲       message_stop       ▲       tool_result └─────┘ │    │
│  │       │                          │                           │    │
│  │       └──────────────────────────┘                           │    │
│  │              abort() / interrupt()                           │    │
│  └─────────────────────────────────────────────────────────────┘    │
│       │                                                              │
│       │ destroy()                                                    │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     DESTROYED                                │    │
│  │                                                              │    │
│  │  - Removed from AgentContainer                               │    │
│  │  - Cannot receive messages                                   │    │
│  │  - Event handlers cleared                                    │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Spring IoC Pattern

AgentX Core follows patterns familiar to Spring developers:

| Spring Concept     | AgentX Core Equivalent | Description                    |
| ------------------ | ---------------------- | ------------------------------ |
| BeanDefinition     | AgentDefinition        | Static configuration blueprint |
| Runtime Config     | AgentConfig            | Instance-specific settings     |
| Bean               | Agent                  | Runtime instance               |
| ApplicationContext | AgentContainer         | Instance lifecycle manager     |
| BeanFactory        | createAgent()          | Instance creation              |

```
┌─────────────────────────────────────────────────────────────────────┐
│  Spring IoC Pattern in AgentX                                        │
│                                                                      │
│  ┌─────────────────────┐                                            │
│  │  AgentDefinition    │ ← Static, can be persisted                 │
│  │  - name             │                                            │
│  │  - driver           │                                            │
│  │  - systemPrompt     │                                            │
│  └─────────────────────┘                                            │
│           │                                                          │
│           │ + AgentConfig (runtime settings)                        │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  AgentContainer (like ApplicationContext)                    │    │
│  │                                                              │    │
│  │  agents: Map<agentId, Agent>                                │    │
│  │                                                              │    │
│  │  register(agent)     → Add to container                     │    │
│  │  get(agentId)        → Retrieve instance                    │    │
│  │  unregister(agentId) → Remove from container                │    │
│  └─────────────────────────────────────────────────────────────┘    │
│           │                                                          │
│           │ createAgent(definition, config)                         │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────┐                                            │
│  │  Agent              │ ← Runtime instance                         │
│  │  - agentId          │                                            │
│  │  - lifecycle        │                                            │
│  │  - state            │                                            │
│  │  - receive()        │                                            │
│  │  - on()             │                                            │
│  └─────────────────────┘                                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Session-Agent Relationship

Sessions and Agents have an independent lifecycle with optional one-to-one association:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Session-Agent Relationship                                          │
│                                                                      │
│  ┌───────────────────────┐     ┌───────────────────────┐            │
│  │  Session              │     │  Agent                │            │
│  │  - sessionId          │     │  - agentId            │            │
│  │  - title              │     │  - lifecycle          │            │
│  │  - messages[]         │     │  - state              │            │
│  │  - agentId? ──────────┼────→│                       │            │
│  │                       │     │                       │            │
│  │  Independent lifecycle│     │  Independent lifecycle│            │
│  └───────────────────────┘     └───────────────────────┘            │
│                                                                      │
│  associateAgent(session, agentId)   → session.agentId = agentId     │
│  disassociateAgent(session)         → session.agentId = undefined   │
│                                                                      │
│  Note: Agent destruction does NOT auto-delete session               │
│        Session can be re-associated with new agent                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Related Packages

- **[@deepractice-ai/agentx-engine](../agentx-engine)** - Stateless event processing engine
- **[@deepractice-ai/agentx-event](../agentx-event)** - Event type definitions
- **[@deepractice-ai/agentx-types](../agentx-types)** - Message type definitions

## License

MIT
