# Issue #005: AgentX Framework Architecture - Complete System Design

**Status**: Living Document 📖
**Date**: 2025-11-17
**Purpose**: Comprehensive architecture guide for AgentX Framework

## Overview

**AgentX Framework** is a modular, event-driven framework for building AI agent applications. It provides a platform-agnostic core with specialized implementations for Node.js and Browser environments.

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Architecture Overview](#architecture-overview)
3. [Core Concepts](#core-concepts)
4. [Package Structure](#package-structure)
5. [Event System](#event-system)
6. [Data Flow](#data-flow)
7. [Platform Abstraction](#platform-abstraction)
8. [Key Design Patterns](#key-design-patterns)
9. [Development Workflow](#development-workflow)

---

## Design Philosophy

### Core Principles

1. **Event-Driven Architecture**
   - Everything is an event (messages, state changes, errors)
   - Loose coupling between components
   - Easy to extend and monitor

2. **Layer Separation**
   - 4 distinct event layers (Stream/State/Message/Exchange)
   - Each layer has clear responsibilities
   - Higher layers consume lower layers

3. **Platform Agnostic**
   - Core logic works everywhere (Node.js, Browser, Edge)
   - Platform-specific code isolated in providers
   - Unified API across platforms

4. **Type Safety First**
   - TypeScript throughout
   - Strict event contracts
   - Compile-time guarantees

5. **Developer Experience**
   - Minimal boilerplate (defineDriver, defineReactor, defineAgent)
   - Intuitive API (agent.send(), agent.react())
   - Clear error messages

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                         │
│                    (Your React/Node.js App)                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AgentX Framework                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    AgentService (Facade)                    │ │
│  │  • agent.send(message)                                     │ │
│  │  • agent.react({ onTextDelta, onToolCall, ... })          │ │
│  │  • agent.clear(), agent.destroy()                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            │                                     │
│         ┌──────────────────┴──────────────────┐                 │
│         │                                     │                 │
│         ▼                                     ▼                 │
│  ┌──────────────┐                    ┌─────────────┐            │
│  │   Driver     │                    │  Reactors   │            │
│  │  (Platform)  │                    │ (Business)  │            │
│  └──────┬───────┘                    └──────┬──────┘            │
│         │                                   │                   │
│         ▼                                   ▼                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      EventBus                            │   │
│  │  • Producer (emit events)                                │   │
│  │  • Consumer (subscribe to events)                        │   │
│  │  • Type-safe pub/sub system                              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                          Monorepo                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📦 agentx-types (Pure Data)                                    │
│     ├─ Message types (UserMessage, AssistantMessage, ...)      │
│     ├─ Content types (TextPart, ImagePart, ToolCallPart, ...)  │
│     └─ MCP types (McpTool, McpResource, ...)                    │
│                                                                  │
│  📦 agentx-event (Event Contracts)                              │
│     ├─ Stream Layer (text_delta, tool_call, tool_result, ...)  │
│     ├─ State Layer (conversation_start, tool_executing, ...)   │
│     ├─ Message Layer (user_message, assistant_message, ...)    │
│     └─ Exchange Layer (exchange_request, exchange_response)     │
│                                                                  │
│  📦 agentx-core (Platform-Agnostic Core)                        │
│     ├─ AgentService (main API)                                  │
│     ├─ EventBus (pub/sub system)                                │
│     ├─ Reactors (MessageAssembler, ExchangeTracker, ...)       │
│     └─ Abstractions (AgentDriver, AgentLogger, ...)             │
│                                                                  │
│  📦 agentx-framework (Define API + Implementations)             │
│     ├─ Define API (defineDriver, defineReactor, defineAgent)   │
│     ├─ Node.js (ClaudeSDKDriver, WebSocketServer, ...)         │
│     └─ Browser (WebSocketDriver, WebSocketBrowserAgent)         │
│                                                                  │
│  📦 agentx-ui (React Components)                                │
│     ├─ Chat (complete chat interface)                          │
│     ├─ ChatMessageList (message rendering)                      │
│     ├─ ToolUseMessage (tool call/result display)               │
│     └─ ErrorMessage (error display)                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Agent

**Definition**: The main interface for interacting with AI models.

**API**:

```typescript
const agent = createAgent({
  driver: ClaudeSDKDriver,
  config: { apiKey: "...", model: "..." },
  reactors: [MessageAssembler, ExchangeTracker, WebSocketReactor],
});

await agent.initialize();

// Send message
await agent.send("Hello");

// React to events
const unsubscribe = agent.react({
  onTextDelta(event) {
    console.log(event.data.text);
  },
  onToolCall(event) {
    console.log(event.data.name);
  },
  onExchangeResponse(event) {
    console.log("Done!");
  },
});

// Cleanup
agent.clear(); // Clear conversation history
agent.destroy(); // Cleanup resources
```

### 2. Driver

**Definition**: Platform-specific implementation that communicates with AI models.

**Responsibilities**:

- Send messages to AI model
- Receive responses (streaming or complete)
- Transform model responses → Stream Layer events

**Implementations**:

- `ClaudeSDKDriver` (Node.js) - Uses @anthropic-ai/claude-agent-sdk
- `WebSocketDriver` (Browser) - Connects to WebSocketServer

**Interface**:

```typescript
interface AgentDriver {
  sendMessage(message: UserMessage | AsyncIterable<UserMessage>): AsyncIterable<StreamEventType>;

  onDestroy?: () => void | Promise<void>;
}
```

**Example**:

```typescript
export const ClaudeSDKDriver = defineDriver({
  name: "ClaudeSDK",

  async *sendMessage(message, config) {
    const prompt = buildPrompt(message);
    const result = query({ prompt, options: buildOptions(config) });

    for await (const sdkMsg of result) {
      yield* transformSDKMessages(sdkMsg, builder);
    }
  },
});
```

### 3. Reactor

**Definition**: Event-driven components that react to events on the EventBus.

**Responsibilities**:

- Listen to events (consumeByType)
- Execute business logic
- Emit new events (produce)

**Types**:

1. **Core Reactors** (in agentx-core):
   - `DriverReactor` - Bridges Driver → EventBus
   - `AgentMessageAssembler` - Assembles Stream deltas → Messages
   - `AgentExchangeTracker` - Tracks exchange lifecycle

2. **Framework Reactors** (in agentx-framework):
   - `WebSocketReactor` - Forwards events to WebSocket clients

**Interface**:

```typescript
interface Reactor {
  readonly id: string;
  readonly name: string;

  initialize(context: ReactorContext): Promise<void>;
  destroy(): Promise<void>;
}

interface ReactorContext {
  agentId: string;
  producer: EventProducer; // Emit events
  consumer: EventConsumer; // Subscribe to events
  logger?: AgentLogger;
}
```

**Example**:

```typescript
export const LoggerReactor = defineReactor({
  name: "Logger",

  onTextDelta(event, config) {
    console.log("[Text]", event.data.text);
  },

  onToolCall(event, config) {
    console.log("[Tool]", event.data.name, event.data.input);
  },
});
```

### 4. EventBus

**Definition**: Central pub/sub system for all events.

**Components**:

- **Producer**: Emit events
- **Consumer**: Subscribe to events

**Features**:

- Type-safe subscriptions
- Support for multiple subscribers
- Automatic cleanup (unsubscribe)

**API**:

```typescript
// Producer (emit events)
producer.produce({
  type: "text_delta",
  uuid: "evt_xxx",
  agentId: "agent_xxx",
  timestamp: Date.now(),
  data: { text: "Hello" },
});

// Consumer (subscribe to events)
const unsubscribe = consumer.consumeByType("text_delta", (event) => {
  console.log(event.data.text);
});

// Cleanup
unsubscribe();
```

---

## Package Structure

### Dependency Graph

```
agentx-ui ──────→ agentx-framework/browser ──→ agentx-core ──→ agentx-event
                                                        ↓
                                                  agentx-types

agentx-framework/server ──→ agentx-core ──→ agentx-event
                                     ↓
                               agentx-types
```

**Principles**:

- Bottom-up: Types → Events → Core → Framework → UI
- No circular dependencies
- Pure types packages (agentx-types, agentx-event) have no dependencies

### Package Responsibilities

#### agentx-types (Pure Data Structures)

**Purpose**: Message and content type definitions

**Exports**:

```typescript
// Messages
export type Message =
  | UserMessage
  | AssistantMessage
  | SystemMessage
  | ToolUseMessage
  | ErrorMessage;

// Content parts
export type ContentPart =
  | TextPart
  | ThinkingPart
  | ImagePart
  | FilePart
  | ToolCallPart
  | ToolResultPart;

// Tool types
export interface ToolCallPart {
  type: "tool-call";
  id: string;
  name: string;
  input: any;
}

export interface ToolResultPart {
  type: "tool-result";
  id: string;
  name: string;
  output: ToolResultOutput;
}
```

**Philosophy**: Pure data, no runtime logic.

#### agentx-event (Event Contracts)

**Purpose**: Event type definitions (API contracts)

**Exports**:

```typescript
// Stream Layer
export type StreamEventType =
  | MessageStartEvent
  | TextDeltaEvent
  | ToolCallEvent
  | ToolResultEvent
  | MessageStopEvent;

// State Layer
export type StateEventType =
  | ConversationStartStateEvent
  | ConversationThinkingStateEvent
  | ToolExecutingStateEvent
  | StreamCompleteStateEvent;

// Message Layer
export type MessageEventType =
  | UserMessageEvent
  | AssistantMessageEvent
  | ToolUseMessageEvent
  | ErrorMessageEvent;

// Exchange Layer
export type ExchangeEventType = ExchangeRequestEvent | ExchangeResponseEvent;

// Union of all events
export type AgentEvent = StreamEventType | StateEventType | MessageEventType | ExchangeEventType;
```

**Philosophy**: Single source of truth for event contracts.

#### agentx-core (Platform-Agnostic Core)

**Purpose**: Core agent logic that works on any platform

**Exports**:

```typescript
// Main API
export { createAgent, AgentService };

// EventBus
export type { EventBus, EventProducer, EventConsumer };

// Abstractions
export type { AgentDriver, AgentLogger, Reactor, ReactorContext };

// Built-in reactors
export { AgentMessageAssembler, AgentExchangeTracker };

// Utilities
export { StreamEventBuilder, LogLevel, LogFormatter };
```

**Key Classes**:

```typescript
export class AgentService {
  constructor(config: any, driver: AgentDriver, reactors: Reactor[], logger?: AgentLogger);

  async initialize(): Promise<void>;
  async send(message: string | UserMessage): Promise<void>;

  react(handlers: {
    onTextDelta?: (event: TextDeltaEvent) => void;
    onToolCall?: (event: ToolCallEvent) => void;
    // ... all event handlers
  }): () => void;

  clear(): void;
  async destroy(): Promise<void>;
}
```

**Philosophy**: Platform-agnostic, testable, reusable.

#### agentx-framework (Define API + Implementations)

**Purpose**: Framework helpers and platform-specific implementations

**Exports**:

```typescript
// ==================== Define API ====================
export { defineDriver, defineReactor, defineAgent, defineConfig };

// ==================== Node.js ====================
export { ClaudeSDKDriver }; // Claude SDK integration
export { createWebSocketServer }; // WebSocket server
export { WebSocketReactor }; // Event forwarding

// ==================== Browser ====================
export { WebSocketDriver }; // WebSocket client
export { WebSocketBrowserAgent }; // Pre-configured agent
```

**Philosophy**: Minimal boilerplate, maximum flexibility.

#### agentx-ui (React Components)

**Purpose**: Reusable React components for chat interfaces

**Exports**:

```typescript
export { Chat }; // Complete chat interface
export { ChatMessageList }; // Message list with auto-scroll
export { ChatInput }; // User input with image upload
export { UserMessage }; // User message display
export { AssistantMessage }; // Assistant message with markdown
export { ToolUseMessage }; // Tool call/result display
export { ErrorMessage }; // Error display
```

**Philosophy**: Storybook-driven, composable, accessible.

---

## Event System

### Four-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Exchange (Request-Response Pairs)                      │
├─────────────────────────────────────────────────────────────────┤
│ Events: exchange_request, exchange_response                     │
│ Purpose: Track multi-turn conversations with metrics            │
│ Emitted by: AgentExchangeTracker                                │
│ Consumed by: UI (loading state), Analytics                      │
└─────────────────────────────────────────────────────────────────┘
                            ▲ consumes
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: Message (Complete Messages)                            │
├─────────────────────────────────────────────────────────────────┤
│ Events: user_message, assistant_message, tool_use_message       │
│ Purpose: Assembled messages for storage/display                 │
│ Emitted by: AgentMessageAssembler, AgentService                 │
│ Consumed by: UI (ChatMessageList), Storage                      │
└─────────────────────────────────────────────────────────────────┘
                            ▲ consumes
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: State (Lifecycle & Status)                             │
├─────────────────────────────────────────────────────────────────┤
│ Events: conversation_start, tool_executing, stream_complete     │
│ Purpose: Track agent state and execution status                 │
│ Emitted by: AgentService, Reactors                              │
│ Consumed by: UI (loading indicators), Monitoring                │
└─────────────────────────────────────────────────────────────────┘
                            ▲ consumes
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Stream (Raw Deltas)                                    │
├─────────────────────────────────────────────────────────────────┤
│ Events: text_delta, tool_call, tool_result, message_stop        │
│ Purpose: Incremental data during streaming                      │
│ Emitted by: Driver (ClaudeSDKDriver, WebSocketDriver)           │
│ Consumed by: Reactors (AgentMessageAssembler)                   │
└─────────────────────────────────────────────────────────────────┘
```

### Event Flow Example

**Scenario**: User sends "Hello"

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Input                                                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. AgentService.send("Hello")                                   │
│    • Creates UserMessage                                        │
│    • Emits user_message (Message Layer)                         │
│    • Calls driver.sendMessage()                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. ClaudeSDKDriver                                              │
│    • Sends to Claude API                                        │
│    • Receives streaming response                                │
│    • Emits Stream Layer events:                                 │
│      - message_start                                            │
│      - text_delta (multiple)                                    │
│      - message_delta (stopReason)                               │
│      - message_stop                                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. DriverReactor                                                │
│    • Listens to driver's AsyncIterable                          │
│    • Forwards Stream events to EventBus                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. AgentMessageAssembler (Reactor)                              │
│    • Subscribes to Stream events                                │
│    • Accumulates text_delta → complete text                     │
│    • Emits assistant_message (Message Layer)                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. AgentExchangeTracker (Reactor)                               │
│    • Subscribes to user_message, message_delta                  │
│    • Tracks exchange timing                                     │
│    • Emits exchange_response when stopReason="end_turn"         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. WebSocketReactor (Framework)                                 │
│    • Subscribes to ALL event types                              │
│    • Forwards events to WebSocket clients                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. Chat Component (UI)                                          │
│    • agent.react({ onTextDelta, onAssistantMessage, ... })     │
│    • Updates UI state (streaming, messages, loading)            │
└─────────────────────────────────────────────────────────────────┘
```

### Event Naming Conventions

**Format**: `{scope}_{object}_{action}`

**Stream Layer**:

- `message_start` - Message streaming starts
- `text_delta` - Text chunk received
- `tool_call` - Complete tool call assembled
- `message_stop` - Message streaming stops

**State Layer**:

- `conversation_start` - Conversation begins
- `tool_executing` - Tool is executing
- `stream_complete` - Stream finished

**Message Layer**:

- `user_message` - User message created
- `assistant_message` - Assistant message created
- `tool_use_message` - Tool usage message created

**Exchange Layer**:

- `exchange_request` - User request received
- `exchange_response` - Complete response ready

---

## Data Flow

### Complete Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         User Input                               │
│                    (Browser / Terminal)                          │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      AgentService                                │
│  • API: send(message)                                            │
│  • Creates UserMessage                                           │
│  • Emits user_message event                                      │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Driver Layer                                │
│  ┌────────────────────┐        ┌──────────────────────┐         │
│  │  ClaudeSDKDriver   │   OR   │  WebSocketDriver     │         │
│  │  (Node.js)         │        │  (Browser)           │         │
│  └────────────────────┘        └──────────────────────┘         │
│  • Sends to AI model                                             │
│  • Receives streaming response                                   │
│  • Emits Stream Layer events                                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      EventBus (Pub/Sub)                          │
│  • Central event distribution                                    │
│  • Type-safe subscriptions                                       │
│  • Multiple reactors subscribe                                   │
└──────┬──────────┬──────────┬──────────┬────────────────────────┘
       │          │          │          │
       ▼          ▼          ▼          ▼
┌──────────┐ ┌────────┐ ┌────────┐ ┌─────────────┐
│ Message  │ │Exchange│ │ State  │ │  WebSocket  │
│Assembler │ │Tracker │ │Manager │ │   Reactor   │
└────┬─────┘ └───┬────┘ └───┬────┘ └──────┬──────┘
     │           │          │             │
     │           │          │             ▼
     │           │          │      ┌─────────────┐
     │           │          │      │  WebSocket  │
     │           │          │      │   Client    │
     │           │          │      └──────┬──────┘
     │           │          │             │
     ▼           ▼          ▼             ▼
┌──────────────────────────────────────────────────────────────────┐
│                         UI Layer                                 │
│  • Chat Component (React)                                        │
│  • agent.react({ onTextDelta, onToolCall, ... })                │
│  • Updates messages, streaming, loading states                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Platform Abstraction

### Node.js Implementation

```
┌──────────────────────────────────────────────────────────────────┐
│                        Node.js Server                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  AgentService                                                    │
│      ↓                                                           │
│  ClaudeSDKDriver (@anthropic-ai/claude-agent-sdk)               │
│      ↓                                                           │
│  EventBus                                                        │
│      ↓                                                           │
│  Reactors:                                                       │
│  ├─ DriverReactor                                                │
│  ├─ AgentMessageAssembler                                        │
│  ├─ AgentExchangeTracker                                         │
│  └─ WebSocketReactor ──→ WebSocket Server ──→ Browser Clients   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Browser Implementation

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser Client                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  AgentService                                                    │
│      ↓                                                           │
│  WebSocketDriver ←──→ WebSocket Connection ←──→ Server          │
│      ↓                                                           │
│  EventBus                                                        │
│      ↓                                                           │
│  Reactors:                                                       │
│  ├─ DriverReactor                                                │
│  ├─ AgentMessageAssembler (local assembly)                       │
│  └─ AgentExchangeTracker (local tracking)                        │
│      ↓                                                           │
│  React Components                                                │
│  └─ Chat.tsx (agent.react())                                     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Key Differences

| Aspect               | Node.js             | Browser                      |
| -------------------- | ------------------- | ---------------------------- |
| **Driver**           | ClaudeSDKDriver     | WebSocketDriver              |
| **AI Communication** | Direct API calls    | Via WebSocket                |
| **Message Assembly** | Server-side         | Client-side                  |
| **Reactors**         | Full set            | Subset (no WebSocketReactor) |
| **Tool Execution**   | Server (Claude SDK) | Server (forwarded)           |

---

## Key Design Patterns

### 1. Define API Pattern

**Problem**: Too much boilerplate when creating drivers/reactors/agents.

**Solution**: Factory functions with minimal configuration.

**Example**:

```typescript
// Instead of implementing full Driver interface...
export const MyDriver = defineDriver({
  name: "MyDriver",

  async *sendMessage(message, config) {
    // Just implement the core logic
    yield { type: "text_delta", data: { text: "Hello" } };
  },
});

// Instead of implementing full Reactor interface...
export const MyReactor = defineReactor({
  name: "MyReactor",

  // Just implement event handlers you care about
  onTextDelta(event, config) {
    console.log(event.data.text);
  },
});
```

### 2. Event-Driven Reactor Pattern

**Problem**: Tight coupling between components.

**Solution**: Reactors subscribe to events, execute logic, emit new events.

**Flow**:

```
Event → Reactor.onEvent() → Business Logic → Emit New Event
```

**Benefits**:

- Loose coupling
- Easy to test (just emit events)
- Easy to extend (add new reactors)

### 3. Layer Separation Pattern

**Problem**: Complex event handling with mixed concerns.

**Solution**: 4 distinct layers, each with clear responsibilities.

**Rules**:

- Lower layers don't know about higher layers
- Higher layers consume lower layers
- Each layer emits events for its level

### 4. Platform Abstraction Pattern

**Problem**: Different platforms (Node.js, Browser) have different capabilities.

**Solution**: Core logic in agentx-core, platform code in agentx-framework.

**Structure**:

```
agentx-core (works everywhere)
    ↓ uses
agentx-framework/node (Node.js specifics)
agentx-framework/browser (Browser specifics)
```

### 5. Single Source of Truth Pattern

**Problem**: Event types defined in multiple places lead to inconsistencies.

**Solution**: All event types defined once in agentx-event.

**Enforcement**:

```typescript
// agentx-event/src/stream/index.ts
export const ALL_STREAM_EVENTS = [
  "message_start",
  "text_delta",
  "tool_call",
  // ...
] as const;

export type StreamEventType = MessageStartEvent | TextDeltaEvent | ToolCallEvent;
// ...
```

TypeScript ensures consistency at compile time.

---

## Development Workflow

### Adding a New Feature

**Example**: Add image support to messages

1. **Define types** (agentx-types):

   ```typescript
   export interface ImagePart {
     type: "image";
     data: string; // base64 or URL
     mediaType: string;
   }
   ```

2. **Add events** (agentx-event):

   ```typescript
   export interface ImageContentBlockStartEvent extends StreamEvent {
     type: "image_content_block_start";
     data: { mediaType: string };
   }
   ```

3. **Update core** (agentx-core):

   ```typescript
   // StreamEventBuilder.ts
   imageContentBlockStart(mediaType: string): ImageContentBlockStartEvent {
     return { type: "image_content_block_start", data: { mediaType } };
   }
   ```

4. **Update driver** (agentx-framework):

   ```typescript
   // ClaudeSDKDriver.ts
   if (block.type === "image") {
     yield builder.imageContentBlockStart(block.source.media_type);
   }
   ```

5. **Update UI** (agentx-ui):

   ```tsx
   // ImageContent.tsx
   export function ImageContent({ data, mediaType }: ImagePartProps) {
     return <img src={data} alt="" />;
   }
   ```

6. **Build and test**:
   ```bash
   pnpm build
   pnpm dev
   ```

### Debugging

**Server-side**:

```typescript
// Add logs in reactor
onTextDelta(event) {
  console.log("[MyReactor] Text:", event.data.text);
}
```

**Browser-side**:

```typescript
// In Chat.tsx
const unsubscribe = agent.react({
  onTextDelta(event) {
    console.log("[Chat] Text delta:", event.data.text);
  },
});
```

**Event tracing**:

```typescript
// Create a debug reactor
const DebugReactor = defineReactor({
  name: "Debug",

  onInit(context) {
    // Subscribe to ALL events
    context.consumer.consume((event) => {
      console.log(`[Event] ${event.type}`, event);
    });
  },
});
```

### Testing Strategy

1. **Unit tests**: Test individual functions (StreamEventBuilder, helpers)
2. **Integration tests**: Test Driver → Reactor → EventBus flow
3. **E2E tests**: Test complete user flow (send message → receive response)
4. **Manual tests**: Use Storybook for UI components

---

## Summary

AgentX Framework is built on:

1. **4-Layer Event System**: Stream → State → Message → Exchange
2. **Platform Abstraction**: Core logic works everywhere, platform code isolated
3. **Event-Driven Architecture**: Loose coupling, easy to extend
4. **Type Safety**: TypeScript throughout, strict contracts
5. **Developer Experience**: Minimal boilerplate, intuitive API

**Key Files**:

- [agentx-types](../packages/agentx-types/) - Data structures
- [agentx-event](../packages/agentx-event/) - Event contracts
- [agentx-core](../packages/agentx-core/) - Platform-agnostic core
- [agentx-framework](../packages/agentx-framework/) - Define API + implementations
- [agentx-ui](../packages/agentx-ui/) - React components

**Related Issues**:

- [#002 Message Direction Architecture](./002-message-direction-architecture.md)
- [#003 Claude SDK Error Handling](./003-claude-sdk-error-handling.md)
- [#004 Tool Calling Architecture](./004-tool-calling-architecture.md)
