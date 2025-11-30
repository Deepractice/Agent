# @deepractice-ai/agentx-engine

**AgentX Engine** - Stateless Event Processing Engine for AI Agents.

## Overview

AgentX Engine is a **completely stateless** runtime for processing AI agent events. It combines a Driver (AI SDK adapter), Processors (event transformers), and Presenters (output handlers) into a unified pipeline.

**Key Design**: Engine holds no state. Intermediate processing state lives in local variables during a single `receive()` call. Business data persistence is handled by Presenters.

## Features

- **Stateless** - Engine can be shared across requests, horizontally scalable
- **Driver Integration** - Connect any AI SDK (Claude, OpenAI, etc.)
- **Typed Presenters** - Type-safe event filtering for Stream/Message/State/Turn events
- **Event Layering** - Stream → Message → State → Turn transformations
- **Re-injection** - Processor outputs are re-injected for event chaining

## Installation

```bash
pnpm add @deepractice-ai/agentx-engine
```

## Quick Start

### Basic Usage

```typescript
import {
  AgentEngine,
  createStreamPresenter,
  createMessagePresenter,
  type Driver,
} from "@deepractice-ai/agentx-engine";

// 1. Define a Driver (connects to AI SDK)
const myDriver: Driver = async function* (message) {
  // Call your AI SDK and yield stream events
  for await (const chunk of aiSDK.stream(message.content)) {
    yield {
      type: "text_delta",
      data: { text: chunk.text },
      // ... other fields
    };
  }
};

// 2. Create Presenters (handle outputs)
const ssePresenter = createStreamPresenter((agentId, event) => {
  // Forward stream events to SSE connection
  sseConnection.send(agentId, event);
});

const dbPresenter = createMessagePresenter((agentId, event) => {
  // Persist messages to database
  database.saveMessage(agentId, event.data);
});

// 3. Create Engine
const engine = new AgentEngine({
  driver: myDriver,
  presenters: [ssePresenter, dbPresenter],
});

// 4. Process messages
await engine.receive("agent_123", {
  role: "user",
  content: "Hello!",
  timestamp: Date.now(),
});
```

### With Claude SDK

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { AgentEngine, type Driver } from "@deepractice-ai/agentx-engine";

const client = new Anthropic();

const claudeDriver: Driver = async function* (message) {
  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: message.content }],
  });

  for await (const event of stream) {
    yield transformToStreamEvent(event); // Transform to AgentX event format
  }
};

const engine = new AgentEngine({
  driver: claudeDriver,
  presenters: [
    /* your presenters */
  ],
});
```

## API Reference

### AgentEngine

The main runtime class.

```typescript
const engine = new AgentEngine({
  driver: myDriver,      // Required: AI SDK adapter
  presenters: [...],     // Optional: Output handlers
});

// Process a message
await engine.receive(agentId, userMessage);
```

### Driver

Input adapter that transforms `UserMessage` into `StreamEvent` stream.

```typescript
type Driver = (message: UserMessage) => AsyncIterable<StreamEventType>;

// Example
const driver: Driver = async function* (message) {
  yield { type: "message_start", ... };
  yield { type: "text_delta", data: { text: "Hello" } };
  yield { type: "message_stop", ... };
};
```

### Presenter

Output adapter that receives processed events.

```typescript
type Presenter = (agentId: string, event: AgentOutput) => void;

// Example
const presenter: Presenter = (agentId, event) => {
  console.log(`[${agentId}] ${event.type}`);
};
```

### Typed Presenters

Type-safe presenters that only receive specific event types:

```typescript
import {
  createStreamPresenter, // Only stream events
  createMessagePresenter, // Only message events
  createStatePresenter, // Only state events
  createTurnPresenter, // Only turn events
} from "@deepractice-ai/agentx-engine";

// Stream presenter - for SSE forwarding
const ssePresenter = createStreamPresenter((agentId, event) => {
  // event is StreamEventType (message_start, text_delta, etc.)
  sseConnection.send(agentId, event);
});

// Message presenter - for UI updates
const uiPresenter = createMessagePresenter((agentId, event) => {
  // event is MessageEventType (assistant_message, etc.)
  setMessages((prev) => [...prev, event.data]);
});

// State presenter - for status updates
const statusPresenter = createStatePresenter((agentId, event) => {
  // event is StateEventType (conversation_start, etc.)
  setStatus(event.type);
});

// Turn presenter - for analytics
const analyticsPresenter = createTurnPresenter((agentId, event) => {
  // event is TurnEventType (turn_response with cost, tokens, etc.)
  trackAnalytics(event.data);
});
```

### Type Guards

Check event types manually:

```typescript
import {
  isStreamEvent,
  isMessageEvent,
  isStateEvent,
  isTurnEvent,
} from "@deepractice-ai/agentx-engine";

const presenter: Presenter = (agentId, event) => {
  if (isStreamEvent(event)) {
    // Handle stream event
  } else if (isMessageEvent(event)) {
    // Handle message event
  }
};
```

## Event Types

### Stream Events (from Driver)

| Event                          | Description           |
| ------------------------------ | --------------------- |
| `message_start`                | AI response started   |
| `text_delta`                   | Text chunk received   |
| `message_stop`                 | AI response completed |
| `tool_use_content_block_start` | Tool call started     |
| `tool_call`                    | Tool call ready       |
| `tool_result`                  | Tool result received  |

### Message Events (assembled)

| Event               | Description          |
| ------------------- | -------------------- |
| `assistant_message` | Complete AI response |
| `tool_use_message`  | Tool call + result   |

### State Events (transitions)

| Event                     | Description        |
| ------------------------- | ------------------ |
| `conversation_start`      | Conversation began |
| `conversation_responding` | AI is responding   |
| `conversation_end`        | Conversation ended |
| `tool_executing`          | Tool is running    |

### Turn Events (analytics)

| Event           | Description               |
| --------------- | ------------------------- |
| `turn_response` | Turn completed with stats |

## Horizontal Scaling

Engine is stateless, enabling horizontal scaling:

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                          │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Engine A      │ │   Engine B      │ │   Engine C      │
│   (stateless)   │ │   (stateless)   │ │   (stateless)   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │    Database     │
                    │   (via Presenters)  │
                    └─────────────────┘
```

- Any Engine instance can handle any `agentId`
- Presenters persist data to shared database
- Same Engine instance can process multiple agents concurrently

## Related Packages

- **[@deepractice-ai/agentx-agent](../agentx-agent)** - Agent runtime (uses this engine)
- **[@deepractice-ai/agentx-types](../agentx-types)** - Event and message type definitions
- **[@deepractice-ai/agentx-logger](../agentx-logger)** - Logging facade

## License

MIT
