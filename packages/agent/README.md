# @agentxjs/agent

> Event Processing Unit for AI Agent conversations

## Overview

`@agentxjs/agent` provides the **AgentEngine** - a pure event processor that transforms streaming LLM outputs into structured conversation events using the **Mealy Machine** pattern.

**Key Characteristics:**

- **Pure Event Processing** - `(state, input) → (state, outputs)`
- **Independent & Testable** - No dependencies on Runtime infrastructure
- **4-Layer Event System** - Stream → State → Message → Turn
- **Composable Architecture** - Build custom processors from primitives

## Installation

```bash
pnpm add @agentxjs/agent
```

---

## Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                        AgentEngine                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   Driver (event producer)                                     │
│       │                                                       │
│       │ yields StreamEvent                                    │
│       ▼                                                       │
│   ┌─────────────────────────────────────────────────────┐    │
│   │              MealyMachine                           │    │
│   │  (Pure Mealy Machine - stateless transformation)    │    │
│   │                                                      │    │
│   │  StreamEvent → [process] → AgentOutput             │    │
│   │                                                      │    │
│   │  Composes:                                           │    │
│   │  • MessageAssembler  (Stream → Message)             │    │
│   │  • StateTracker      (Stream → State)               │    │
│   │  • TurnTracker       (Message → Turn)               │    │
│   └─────────────────────────────────────────────────────┘    │
│       │                                                       │
│       │ emits AgentOutput                                     │
│       ▼                                                       │
│   Presenter (event consumer)                                  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Key Point**: `AgentEngine` is independent of Runtime (Container, Session, Bus). It can be tested in isolation with mock Driver and Presenter.

---

## Quick Start

### Basic Usage

```typescript
import { createAgent } from "@agentxjs/agent";
import type { AgentDriver, AgentPresenter } from "@agentxjs/types/agent";

// Create a simple driver (produces stream events)
const driver: AgentDriver = {
  name: "SimpleDriver",
  async *receive(message) {
    yield { type: "message_start", timestamp: Date.now(), data: {} };
    yield { type: "text_delta", timestamp: Date.now(), data: { text: "Hello" } };
    yield { type: "text_delta", timestamp: Date.now(), data: { text: " World" } };
    yield { type: "message_stop", timestamp: Date.now(), data: { stopReason: "end_turn" } };
  },
  interrupt() {},
};

// Create a presenter (consumes output events)
const presenter: AgentPresenter = {
  name: "ConsolePresenter",
  present(agentId, output) {
    console.log(output.type, output.data);
  },
};

// Create agent
const agent = createAgent({
  driver,
  presenter,
  context: {
    agentId: "agent_123",
    createdAt: Date.now(),
  },
});

// Subscribe to events
agent.on("text_delta", (e) => {
  process.stdout.write(e.data.text);
});

agent.on("assistant_message", (e) => {
  console.log("\nAssistant:", e.data.content);
});

// Send message
await agent.receive("Hello!");

// Cleanup
await agent.destroy();
```

---

## Core Concepts

### 1. AgentEngine Interface

```typescript
interface AgentEngine {
  readonly agentId: string;
  readonly createdAt: number;
  readonly state: AgentState;
  readonly messageQueue: MessageQueue;

  // Send message
  receive(message: string | UserMessage): Promise<void>;

  // Subscribe to events
  on(handler: AgentEventHandler): Unsubscribe;
  on(handlers: EventHandlerMap): Unsubscribe;
  on(type: string, handler: AgentEventHandler): Unsubscribe;
  on(types: string[], handler: AgentEventHandler): Unsubscribe;

  // React-style subscription
  react(handlers: ReactHandlerMap): Unsubscribe;

  // State changes
  onStateChange(handler: StateChangeHandler): Unsubscribe;

  // Lifecycle
  onReady(handler: () => void): Unsubscribe;
  onDestroy(handler: () => void): Unsubscribe;

  // Control
  interrupt(): void;
  destroy(): Promise<void>;

  // Advanced
  use(middleware: AgentMiddleware): Unsubscribe;
  intercept(interceptor: AgentInterceptor): Unsubscribe;
}
```

### 2. AgentState

Agent state machine:

```typescript
type AgentState =
  | "idle" // Waiting for user input
  | "thinking" // LLM is thinking
  | "responding" // LLM is generating response
  | "planning_tool" // Generating tool call parameters
  | "awaiting_tool_result"; // Waiting for tool execution

// State transitions
agent.onStateChange(({ prev, current }) => {
  console.log(`State: ${prev} → ${current}`);
});
```

### 3. Event Subscription

Multiple subscription patterns:

```typescript
// 1. Subscribe to specific event type
agent.on("text_delta", (e) => {
  process.stdout.write(e.data.text);
});

// 2. Subscribe to multiple types
agent.on(["message_start", "message_stop"], (e) => {
  console.log(e.type);
});

// 3. Subscribe to all events
agent.on((e) => {
  console.log(e.type);
});

// 4. React-style handlers (camelCase with 'on' prefix)
agent.react({
  onTextDelta: (e) => process.stdout.write(e.data.text),
  onAssistantMessage: (e) => console.log(e.data.content),
  onToolCallMessage: (e) => console.log("Tool:", e.data.toolCall.name),
});

// 5. Batch subscription
agent.on({
  text_delta: (e) => process.stdout.write(e.data.text),
  assistant_message: (e) => console.log(e.data.content),
});
```

### 4. Middleware & Interceptors

```typescript
// Middleware: Intercept incoming messages (before driver)
agent.use(async (message, next) => {
  console.log("User:", message.content);
  return next(message);
});

// Interceptor: Intercept outgoing events (after engine)
agent.intercept((output, next) => {
  console.log("Event:", output.type);
  return next(output);
});
```

---

## 4-Layer Event System

### Layer 1: Stream Events (Real-time)

```typescript
// Text streaming
agent.on("message_start", (e) => {
  /* ... */
});
agent.on("text_delta", (e) => process.stdout.write(e.data.text));
agent.on("message_stop", (e) => {
  /* ... */
});

// Tool use
agent.on("tool_use_start", (e) => {
  /* ... */
});
agent.on("input_json_delta", (e) => {
  /* ... */
});
agent.on("tool_use_stop", (e) => {
  /* ... */
});
```

### Layer 2: State Events

```typescript
// Conversation lifecycle
agent.on("conversation_start", (e) => {
  /* ... */
});
agent.on("conversation_thinking", (e) => {
  /* ... */
});
agent.on("conversation_responding", (e) => {
  /* ... */
});
agent.on("conversation_end", (e) => {
  /* ... */
});

// Tool lifecycle
agent.on("tool_planned", (e) => {
  /* ... */
});
agent.on("tool_executing", (e) => {
  /* ... */
});
agent.on("tool_completed", (e) => {
  /* ... */
});
```

### Layer 3: Message Events

```typescript
// Complete messages
agent.on("user_message", (e) => {
  console.log("User:", e.data.content);
});

agent.on("assistant_message", (e) => {
  console.log("Assistant:", e.data.content);
});

agent.on("tool_call_message", (e) => {
  console.log("Tool Call:", e.data.toolCall.name);
});

agent.on("tool_result_message", (e) => {
  console.log("Tool Result:", e.data.toolResult.output);
});
```

### Layer 4: Turn Events (Analytics)

```typescript
// Turn tracking
agent.on("turn_request", (e) => {
  console.log("Turn started:", e.data.turnId);
});

agent.on("turn_response", (e) => {
  console.log("Turn completed:", {
    duration: e.data.durationMs,
    tokens: e.data.usage,
  });
});
```

---

## MealyMachine - Pure Event Processor

The heart of AgentEngine is the **MealyMachine** - a pure function that transforms events:

```typescript
import { createMealyMachine } from "@agentxjs/agent";

// Create machine
const machine = createMealyMachine();

// Process event
const result = machine.process(
  {
    /* state */
  },
  { type: "text_delta", timestamp: Date.now(), data: { text: "Hi" } }
);

// Result contains:
// - state: Updated state
// - outputs: Generated events (message, state, turn events)
```

### Mealy Machine Pattern

```
(state, input) → (state, outputs)
```

**Key Properties:**

1. **Pure Function** - No side effects, same input → same output
2. **Testable** - No mocks needed, just assertions on outputs
3. **Composable** - Build complex machines from simple processors

### Internal Processors

MealyMachine composes three processors:

1. **MessageAssembler** - Assembles complete messages from stream chunks
2. **StateEventProcessor** - Generates state transition events
3. **TurnTracker** - Tracks request-response cycles

```typescript
import {
  messageAssemblerProcessor,
  stateEventProcessor,
  turnTrackerProcessor,
} from "@agentxjs/agent";

// These are exported for advanced use cases (custom machines)
```

---

## Building Custom Processors

For advanced use cases, you can build custom event processors:

```typescript
import {
  type Processor,
  type ProcessorResult,
  combineProcessors,
  filterProcessor,
  mapOutput,
} from "@agentxjs/agent";

// Define custom processor
const myProcessor: Processor<MyState, MyInput, MyOutput> = (state, input) => {
  // Process input, update state, emit outputs
  return {
    state: updatedState,
    outputs: [output1, output2],
  };
};

// Combine with built-in processors
const combined = combineProcessors(messageAssemblerProcessor, myProcessor);

// Add filters
const filtered = filterProcessor(myProcessor, (input) => input.type === "text_delta");

// Transform outputs
const mapped = mapOutput(myProcessor, (output) => ({ ...output, extra: true }));
```

### Processor Combinators

```typescript
// Combine multiple processors
combineProcessors(p1, p2, p3);

// Combine initial states
combineInitialStates(s1, s2, s3);

// Chain processors (output of p1 → input of p2)
chainProcessors(p1, p2);

// Filter inputs
filterProcessor(p, (input) => input.type === "text_delta");

// Map outputs
mapOutput(p, (output) => ({ ...output, extra: true }));

// Add logging
withLogging(p, "MyProcessor");

// Identity (pass-through)
identityProcessor;
```

---

## Testing

AgentEngine is designed for easy testing:

```typescript
import { createAgent } from "@agentxjs/agent";
import { describe, it, expect } from "vitest";

describe("AgentEngine", () => {
  it("processes text deltas", async () => {
    const events: any[] = [];

    const driver = {
      name: "TestDriver",
      async *receive() {
        yield { type: "message_start", timestamp: Date.now(), data: {} };
        yield { type: "text_delta", timestamp: Date.now(), data: { text: "Hi" } };
        yield { type: "message_stop", timestamp: Date.now(), data: {} };
      },
      interrupt() {},
    };

    const presenter = {
      name: "TestPresenter",
      present: (id, output) => events.push(output),
    };

    const agent = createAgent({
      driver,
      presenter,
      context: { agentId: "test", createdAt: Date.now() },
    });

    await agent.receive("Hello");

    // Assert events
    expect(events).toMatchObject([
      { type: "conversation_start" },
      { type: "message_start" },
      { type: "text_delta", data: { text: "Hi" } },
      { type: "message_stop" },
      { type: "assistant_message" },
      { type: "conversation_end" },
    ]);

    await agent.destroy();
  });
});
```

---

## Design Decisions

### Why Mealy Machine?

The Mealy Machine pattern offers:

1. **Pure Functions** - Testable without mocks
2. **Deterministic** - Same input → same output
3. **Composable** - Build complex from simple
4. **State is Means** - Output is the goal

### Why Independent from Runtime?

AgentEngine is separate from Runtime (Container, Session, Bus) to:

1. **Test in Isolation** - No Runtime infrastructure needed
2. **Reusable** - Same engine works in Node.js, Browser, Edge
3. **Clear Boundaries** - Event processing vs. lifecycle management

### Why 4 Layers?

Each layer serves different consumers:

- **Stream** - UI (typewriter effect)
- **State** - State machines, loading indicators
- **Message** - Chat history, persistence
- **Turn** - Analytics, billing

---

## Package Dependencies

```text
@agentxjs/types       Type definitions
       ↑
@agentxjs/common      Logger facade
       ↑
@agentxjs/agent       This package (event processing)
       ↑
@agentxjs/runtime     Runtime layer (Container, Session, Bus)
```

---

## Related Packages

- **[@agentxjs/types](../types)** - Type definitions
- **[@agentxjs/common](../common)** - Logger facade
- **[@agentxjs/runtime](../runtime)** - Runtime implementation
- **[agentxjs](../agentx)** - High-level API

---

## License

MIT
