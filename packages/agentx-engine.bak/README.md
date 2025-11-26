# @deepractice-ai/agentx-core

**AgentX Core** - Platform-agnostic core engine for building AI agents with event-driven Reactor architecture.

## Overview

AgentX Core is the foundational layer of the AgentX ecosystem, providing a **Reactor-based event-driven architecture** for building AI agents. It's completely platform-agnostic and relies on Driver implementations to connect to specific LLM providers.

### Key Features

- 🔌 **Driver Injection** - Bring your own LLM provider (Claude, OpenAI, etc.)
- ⚡ **Reactor Pattern** - Event-driven architecture with automatic lifecycle management
- 📊 **4-Layer Events** - Stream, State, Message, and Exchange events for different perspectives
- 🎯 **Type-Safe** - Full TypeScript support with strict event types
- 🪶 **Lightweight** - Zero dependencies on specific LLM SDKs
- 🧩 **Agent-as-Driver** - Agents can be composed as Drivers (nested composition)

## Architecture

```
User Code
    ↓
createAgent() [Facade API]
    ↓
AgentService (implements AgentService extends AgentDriver)
    ↓
AgentEngine (orchestration)
    ↓
AgentReactorRegistry
    ├── AgentDriverBridge (Driver → Stream Events)
    ├── AgentStateMachine (Stream → State Events)
    ├── AgentMessageAssembler (Stream → Message Events)
    ├── AgentExchangeTracker (Message → Exchange Events)
    └── User Reactors (custom event handlers)
    ↓
EventBus (RxJS-based communication backbone)
```

### Core Components

#### Facade Layer (`facade/`)

- **`createAgent()`** - Primary API for creating agents (uses mixin pattern)
- Simple, user-friendly interface
- Combines Agent data (from `agentx-types`) with AgentService methods

#### Interfaces (`interfaces/`)

**Service Provider Interfaces (SPI)**:

- **`AgentService`** - User-facing runtime API (extends AgentDriver)
- **`AgentDriver`** - Platform-specific LLM driver contract
- **`AgentReactor`** - Low-level event processor contract
- **`AgentReactorContext`** - Context provided to reactors

**User-Friendly Reactor Interfaces**:

- **`StreamReactor`** - Stream layer event handlers
- **`StateReactor`** - State layer event handlers
- **`MessageReactor`** - Message layer event handlers
- **`ExchangeReactor`** - Exchange layer event handlers

#### Core Implementation (`core/agent/`)

- **`AgentEngine`** - Orchestrates all reactors via ReactorRegistry
- **`AgentServiceImpl`** - Default implementation of AgentService
- **`AgentEventBus`** - RxJS-based event communication
- **`AgentReactorRegistry`** - Manages reactor lifecycle
- **`AgentDriverBridge`** - Connects AgentDriver to EventBus
- **`AgentStateMachine`** - State machine reactor
- **`AgentMessageAssembler`** - Message assembly reactor
- **`AgentExchangeTracker`** - Exchange tracking reactor

#### Utilities (`utils/`)

- **`ReactorAdapter`** - Adapts user-friendly reactor interfaces to AgentReactor
- **`emitError`** - Unified error emission utility
- **`StreamEventBuilder`** - Helper for building stream events

### 4-Layer Event System

AgentX Core generates events at four semantic layers:

1. **Stream Layer** - Real-time incremental data (text deltas, tool calls)
2. **State Layer** - State machine transitions (thinking, responding, executing)
3. **Message Layer** - Complete messages (user/assistant messages)
4. **Exchange Layer** - Request-response pairs with analytics (cost, duration, tokens)

All layers observe the same interaction from different perspectives.

## Installation

```bash
pnpm add @deepractice-ai/agentx-core
```

**Platform-Specific SDKs:**

For most use cases, use a platform-specific SDK instead:

- **Node.js**: `@deepractice-ai/agentx-framework` (includes ClaudeSDKDriver)
- **Browser**: `@deepractice-ai/agentx-framework/browser` (includes WebSocketDriver)

## Quick Start

### Basic Usage with Facade API

```typescript
import { createAgent } from "@deepractice-ai/agentx-core";
import { ClaudeDriver } from "@deepractice-ai/agentx-framework";

// Create driver (platform-specific)
const driver = new ClaudeDriver({
  apiKey: process.env.ANTHROPIC_API_KEY,
  sessionId: "my-session",
});

// Create agent using facade API
const agent = createAgent("my-agent", driver, {
  name: "Code Assistant",
  description: "Helps with coding tasks",
});

// Initialize
await agent.initialize();

// Subscribe to events
agent.react({
  onAssistantMessage(event) {
    console.log("Assistant:", event.data.content);
  },
});

// Send message
await agent.send("Hello, how are you?");

// Cleanup
await agent.destroy();
```

### Event Handling

AgentX uses method naming convention for event subscription:

```typescript
agent.react({
  // Stream Layer - Real-time deltas
  onTextDelta(event) {
    process.stdout.write(event.data.text); // Typewriter effect
  },

  // State Layer - State transitions
  onConversationResponding(event) {
    console.log("Agent is responding...");
  },

  // Message Layer - Complete messages
  onAssistantMessage(event) {
    console.log("Complete response:", event.data.content);
  },

  // Exchange Layer - Analytics
  onExchangeResponse(event) {
    console.log(`Cost: $${event.data.costUsd}`);
    console.log(`Duration: ${event.data.durationMs}ms`);
  },
});
```

## Core Concepts

### AgentDriver (SPI)

The `AgentDriver` interface is the **Service Provider Interface** for connecting to LLM providers:

```typescript
interface AgentDriver {
  readonly sessionId: string;
  readonly driverSessionId: string | null;

  // Returns async iterable of Stream events
  sendMessage(messages: UserMessage | AsyncIterable<UserMessage>): AsyncIterable<StreamEventType>;

  abort(): void;
  destroy(): Promise<void>;
}
```

**Driver Implementations:**

- `ClaudeSDKDriver` - Uses `@anthropic-ai/sdk` (Node.js)
- `WebSocketDriver` - Connects to AgentX server (Browser)
- `MockDriver` - For testing

### AgentService (User-Facing API)

`AgentService` is the primary interface users interact with. It **extends AgentDriver**, enabling the Agent-as-Driver pattern:

```typescript
interface AgentService extends AgentDriver {
  readonly id: string;
  readonly agent: Readonly<Agent>;
  readonly messages: ReadonlyArray<Message>;

  initialize(): Promise<void>;
  send(message: string): Promise<void>;
  react(handlers: Record<string, any>): () => void;
  clear(): void;
  exportToSession(): Omit<Session, "id">;

  // Inherited from AgentDriver:
  // sendMessage(), abort(), destroy()
}
```

**Agent-as-Driver Pattern:**
Since `AgentService extends AgentDriver`, any agent instance can be used as a Driver for another agent, enabling powerful nested compositions.

```typescript
// Create inner agent
const innerAgent = createAgent("inner", innerDriver);
await innerAgent.initialize();

// Use innerAgent as Driver for outer agent
const outerAgent = createAgent("outer", innerAgent, {
  reactors: [new MonitoringReactor()],
});
await outerAgent.initialize();

// Request flows through both agents
await outerAgent.send("Hello!");
```

### Reactor Pattern

Reactors are event processors with managed lifecycles:

```typescript
interface AgentReactor {
  readonly id: string;
  readonly name: string;

  initialize(context: AgentReactorContext): void | Promise<void>;
  destroy(): void | Promise<void>;
}

interface AgentReactorContext {
  readonly agentId: string;
  readonly sessionId: string;
  readonly consumer: EventConsumer;
  readonly producer: EventProducer;
}
```

**Built-in Reactors:**

- `AgentDriverBridge` - Connects Driver to EventBus
- `AgentStateMachine` - Generates State events from Stream events
- `AgentMessageAssembler` - Assembles Message events from Stream deltas
- `AgentExchangeTracker` - Tracks request-response pairs

**User-Friendly Reactor Interfaces:**

Instead of implementing `AgentReactor` directly, you can use the 4-layer interfaces:

```typescript
import { StreamReactor, MessageReactor, AgentReactorContext } from "@deepractice-ai/agentx-core";

class MyReactor implements MessageReactor {
  // Lifecycle hooks
  onInitialize?(context: AgentReactorContext): void | Promise<void>;
  onDestroy?(): void | Promise<void>;

  // Message layer handlers
  onUserMessage?(event: UserMessageEvent): void;
  onAssistantMessage?(event: AssistantMessageEvent): void;
  onToolUseMessage?(event: ToolUseMessageEvent): void;
  onErrorMessage?(event: ErrorMessageEvent): void;
}

// Wrap with ReactorAdapter before passing to createAgent
import { wrapUserReactor } from "@deepractice-ai/agentx-core";

const agent = createAgent("my-agent", driver, {
  reactors: [wrapUserReactor(new MyReactor())],
});
```

**ReactorAdapter** automatically:

- Detects which layer interface you implemented
- Subscribes to appropriate events
- Manages lifecycle (onInitialize/onDestroy)

### AgentEngine

`AgentEngine` orchestrates all Reactors via `AgentReactorRegistry`:

```typescript
class AgentEngine {
  readonly agentId: string;
  readonly sessionId: string;
  readonly eventBus: AgentEventBus;

  constructor(driver: AgentDriver, config?: EngineConfig);

  async initialize(): Promise<void>; // Initializes all Reactors
  abort(): void;
  async destroy(): Promise<void>; // Destroys all Reactors (reverse order)
}
```

### Error Handling

AgentX Core uses a **unified error handling architecture** where errors from any layer are converted to `error_message` events and propagated through the EventBus.

#### Architecture

```
Error Source (any layer)
    ↓
emitError() utility
    ↓
ErrorMessageEvent → EventBus
    ↓
UI/Subscribers
```

#### Error Categorization

All errors are categorized by:

- **Subtype**: `system` | `agent` | `llm` | `validation` | `unknown`
  - `system` - Infrastructure errors (WebSocket, network)
  - `agent` - Agent logic errors (reactor failures, state errors)
  - `llm` - LLM provider errors (rate limits, API errors)
  - `validation` - Input validation errors
  - `unknown` - Uncategorized errors

- **Severity**: `fatal` | `error` | `warning`
  - `fatal` - Unrecoverable errors
  - `error` - Recoverable errors (default)
  - `warning` - Non-critical issues

#### ErrorMessage Structure

```typescript
interface ErrorMessage {
  id: string;
  role: "error";
  subtype: "system" | "agent" | "llm" | "validation" | "unknown";
  severity: "fatal" | "error" | "warning";
  message: string; // Human-readable error
  code?: string; // Machine-readable code
  details?: unknown; // Additional context
  recoverable?: boolean; // Can the agent continue?
  stack?: string; // Stack trace if available
  timestamp: number;
}
```

#### Subscribing to Errors

```typescript
agent.react({
  onErrorMessage(event) {
    const error = event.data;
    console.error(`[${error.severity}] ${error.subtype}: ${error.message}`);

    if (error.code === "VALIDATION_ERROR") {
      // Handle validation errors
    }

    if (!error.recoverable) {
      // Handle fatal errors
      await agent.destroy();
    }
  },
});
```

## Event Types

### Stream Events

Real-time incremental events during streaming:

- `MessageStartEvent` - Message begins
- `TextDeltaEvent` - Text chunk arrives
- `TextContentBlockStartEvent` / `TextContentBlockStopEvent`
- `ToolUseContentBlockStartEvent` / `ToolUseContentBlockStopEvent`
- `InputJsonDeltaEvent` - Tool input chunk
- `MessageDeltaEvent` - Message metadata delta
- `MessageStopEvent` - Message complete
- `ToolCallEvent` - Complete tool call assembled

### State Events

State machine transitions:

- `AgentInitializingStateEvent` / `AgentReadyStateEvent`
- `ConversationStartStateEvent` / `ConversationEndStateEvent`
- `ConversationThinkingStateEvent` / `ConversationRespondingStateEvent`
- `ToolPlannedStateEvent` / `ToolExecutingStateEvent` / `ToolCompletedStateEvent`
- `StreamStartStateEvent` / `StreamCompleteStateEvent`

### Message Events

Complete messages:

- `UserMessageEvent` - User sent a message
- `AssistantMessageEvent` - Assistant completed response
- `ToolUseMessageEvent` - Tool call + result (unified view)
- `ErrorMessageEvent` - Error occurred

### Exchange Events

Request-response analytics:

- `ExchangeRequestEvent` - User initiated request
- `ExchangeResponseEvent` - Assistant completed response (with cost, duration, tokens)

## Advanced Usage

### Custom Reactors

```typescript
import { MessageReactor, wrapUserReactor } from "@deepractice-ai/agentx-core";

class AnalyticsReactor implements MessageReactor {
  onAssistantMessage(event) {
    // Track analytics
  }

  onErrorMessage(event) {
    // Track errors
  }
}

const agent = createAgent("my-agent", driver, {
  reactors: [wrapUserReactor(new AnalyticsReactor())],
});
```

### Direct EventBus Access

```typescript
const agent = createAgent("my-agent", driver);
await agent.initialize();

// Access internal engine (not recommended for normal use)
const consumer = agent.eventBus?.createConsumer();

consumer?.consumeByType("text_delta", (event) => {
  console.log(event.data.text);
});
```

### Message History

```typescript
const agent = createAgent("my-agent", driver);

await agent.send("Hello");
await agent.send("How are you?");

// Access message history
console.log(agent.messages);
// [
//   { role: "user", content: "Hello", ... },
//   { role: "assistant", content: "Hi there!", ... },
//   { role: "user", content: "How are you?", ... },
//   { role: "assistant", content: "I'm doing well!", ... }
// ]

// Export to session format
const session = agent.exportToSession();

// Clear history
agent.clear();
```

## API Reference

### createAgent (Facade API)

```typescript
function createAgent(id: string, driver: AgentDriver, options?: CreateAgentOptions): AgentInstance;

interface CreateAgentOptions {
  reactors?: AgentReactor[];
  name?: string;
  description?: string;
  tags?: string[];
  version?: string;
  metadata?: Record<string, unknown>;
}

// AgentInstance = Agent data + AgentService methods (via mixin)
type AgentInstance = Agent & AgentService;
```

### AgentService

```typescript
interface AgentService extends AgentDriver {
  readonly id: string;
  readonly agent: Readonly<Agent>;
  readonly messages: ReadonlyArray<Message>;

  initialize(): Promise<void>;
  send(message: string): Promise<void>;
  react(handlers: Record<string, Function>): () => void;
  clear(): void;
  exportToSession(): Omit<Session, "id">;
  destroy(): Promise<void>;

  // Inherited from AgentDriver:
  readonly sessionId: string;
  readonly driverSessionId: string | null;
  sendMessage(messages: UserMessage | AsyncIterable<UserMessage>): AsyncIterable<StreamEventType>;
  abort(): void;
}
```

### AgentEngine

```typescript
class AgentEngine {
  readonly agentId: string;
  readonly sessionId: string;
  readonly eventBus: AgentEventBus;

  constructor(driver: AgentDriver, config?: EngineConfig);

  initialize(): Promise<void>;
  abort(): void;
  destroy(): Promise<void>;
}
```

### EngineConfig

```typescript
interface EngineConfig {
  reactors?: AgentReactor[];
}
```

### ReactorAdapter (Utility)

```typescript
// Wrap user-friendly reactor interfaces
function wrapUserReactor(userReactor: UserReactor): AgentReactor;

type UserReactor = StreamReactor | StateReactor | MessageReactor | ExchangeReactor;

// Or use specific adapters
class StreamReactorAdapter extends BaseReactorAdapter {}
class StateReactorAdapter extends BaseReactorAdapter {}
class MessageReactorAdapter extends BaseReactorAdapter {}
class ExchangeReactorAdapter extends BaseReactorAdapter {}
```

## Design Principles

1. **Platform Agnostic** - Core has no dependencies on specific LLM SDKs
2. **Driver Injection** - Platform-specific logic lives in Drivers
3. **Event-Driven** - Everything flows through EventBus
4. **Reactor Pattern** - Managed lifecycle for all event processors
5. **Layered Events** - Multiple perspectives on the same interaction
6. **Type Safety** - Strict TypeScript types throughout
7. **Separation of Concerns** - Core only handles business logic, no logging
8. **Agent-as-Driver** - Agents can be composed as nested Drivers

## Related Packages

- **[@deepractice-ai/agentx-types](../agentx-types)** - Message, content, and agent types
- **[@deepractice-ai/agentx-event](../agentx-event)** - Event type definitions
- **[@deepractice-ai/agentx-framework](../agentx-framework)** - Full-featured framework with drivers and reactors

## License

MIT
