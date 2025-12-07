# Event System

Deep dive into AgentX's 4-layer event architecture.

## Overview

AgentX uses a hierarchical event system where different event layers serve different purposes:

```
Stream Layer (L1)  →  Real-time incremental updates  →  UI rendering
State Layer (L2)   →  Agent state transitions        →  Loading indicators
Message Layer (L3) →  Complete conversation records  →  Chat history
Turn Layer (L4)    →  Usage analytics                →  Billing, metrics
```

## Layer 1: Stream Events

**Purpose**: Real-time incremental updates during LLM response generation.

**Use cases**: Typewriter effects, progress indicators, live updates.

### Text Streaming

```typescript
agentx.on("message_start", (e) => {
  console.log("Response starting...");
});

agentx.on("text_delta", (e) => {
  // Incremental text - append to build complete response
  process.stdout.write(e.data.text);
});

agentx.on("message_stop", (e) => {
  console.log("\nResponse complete");
  console.log("Stop reason:", e.data.stopReason); // "end_turn" | "max_tokens" | "tool_use"
});
```

### Tool Use Streaming

```typescript
agentx.on("tool_use_start", (e) => {
  console.log(`Tool requested: ${e.data.name}`);
  console.log(`Tool ID: ${e.data.id}`);
});

agentx.on("input_json_delta", (e) => {
  // Incremental JSON input - concatenate to build complete JSON
  process.stdout.write(e.data.delta);
});

agentx.on("tool_use_stop", (e) => {
  console.log("Tool call parameters complete");
  // Full tool call is now available in tool_call_message
});

agentx.on("tool_result", (e) => {
  console.log(`Tool result: ${e.data.output}`);
});
```

### Stream Event Types

| Event Type         | Data                   | Description                   |
| ------------------ | ---------------------- | ----------------------------- |
| `message_start`    | `{}`                   | LLM response begins           |
| `text_delta`       | `{ text: string }`     | Incremental text chunk        |
| `tool_use_start`   | `{ id, name }`         | Tool call begins              |
| `input_json_delta` | `{ delta: string }`    | Tool input chunk              |
| `tool_use_stop`    | `{ id }`               | Tool call parameters complete |
| `tool_result`      | `{ id, name, output }` | Tool execution result         |
| `message_delta`    | `{ usage }`            | Message metadata update       |
| `message_stop`     | `{ stopReason }`       | LLM response complete         |

---

## Layer 2: State Events

**Purpose**: Track agent state transitions and lifecycle.

**Use cases**: Loading indicators, state machines, UI state management.

### Agent State Machine

```
idle → conversation_start → conversation_thinking → conversation_responding
                                                          ↓
                                                    tool_planned
                                                          ↓
                                                    tool_executing
                                                          ↓
                                                    tool_completed
                                                          ↓
                                              conversation_end → idle
```

### Conversation Events

```typescript
agentx.on("conversation_start", (e) => {
  console.log("Conversation started");
  setLoading(true);
});

agentx.on("conversation_thinking", (e) => {
  console.log("Agent is thinking...");
  setStatus("thinking");
});

agentx.on("conversation_responding", (e) => {
  console.log("Agent is responding...");
  setStatus("responding");
});

agentx.on("conversation_end", (e) => {
  console.log("Conversation completed");
  setLoading(false);
});

agentx.on("conversation_interrupted", (e) => {
  console.log("Conversation was interrupted");
  setLoading(false);
});
```

### Tool Events

```typescript
agentx.on("tool_planned", (e) => {
  console.log("Tool planned:", e.data.toolCall.name);
  console.log("Input:", e.data.toolCall.input);
});

agentx.on("tool_executing", (e) => {
  console.log("Executing tool:", e.data.toolCall.name);
  setToolStatus("executing");
});

agentx.on("tool_completed", (e) => {
  console.log("Tool completed:", e.data.toolResult.name);
  console.log("Output:", e.data.toolResult.output);
  setToolStatus("completed");
});

agentx.on("tool_failed", (e) => {
  console.error("Tool failed:", e.data.error);
  setToolStatus("failed");
});
```

### State Event Types

| Event Type                 | Data                | Description             |
| -------------------------- | ------------------- | ----------------------- |
| `conversation_queued`      | `{ queuePosition }` | Message queued          |
| `conversation_start`       | `{}`                | Conversation begins     |
| `conversation_thinking`    | `{}`                | LLM thinking            |
| `conversation_responding`  | `{}`                | LLM generating response |
| `conversation_end`         | `{}`                | Conversation complete   |
| `conversation_interrupted` | `{}`                | User interrupted        |
| `tool_planned`             | `{ toolCall }`      | Tool call ready         |
| `tool_executing`           | `{ toolCall }`      | Tool executing          |
| `tool_completed`           | `{ toolResult }`    | Tool succeeded          |
| `tool_failed`              | `{ error }`         | Tool failed             |
| `error_occurred`           | `{ error }`         | Error occurred          |

---

## Layer 3: Message Events

**Purpose**: Complete, structured conversation records.

**Use cases**: Chat history, persistence, logging.

### Message Types

```typescript
// User message
agentx.on("user_message", (e) => {
  const message = e.data;
  console.log("User:", message.content);
  saveToHistory(message);
});

// Assistant message
agentx.on("assistant_message", (e) => {
  const message = e.data;
  console.log("Assistant:", message.content);
  saveToHistory(message);
});

// Tool call message
agentx.on("tool_call_message", (e) => {
  const message = e.data;
  console.log("Tool call:", message.toolCall.name);
  console.log("Input:", message.toolCall.input);
  saveToHistory(message);
});

// Tool result message
agentx.on("tool_result_message", (e) => {
  const message = e.data;
  console.log("Tool result:", message.toolResult.output);
  saveToHistory(message);
});
```

### Message Structure

```typescript
// UserMessage
{
  id: "msg_user_123",
  role: "user",
  subtype: "user",
  content: "Hello!",
  timestamp: 1234567890,
}

// AssistantMessage
{
  id: "msg_assistant_456",
  role: "assistant",
  subtype: "assistant",
  content: "Hi! How can I help?",
  timestamp: 1234567891,
  usage: {
    inputTokens: 10,
    outputTokens: 20,
  }
}

// ToolCallMessage
{
  id: "msg_tool_call_789",
  role: "assistant",
  subtype: "tool-call",
  toolCall: {
    id: "tool_123",
    name: "get_weather",
    input: { location: "NYC" }
  },
  timestamp: 1234567892,
}

// ToolResultMessage
{
  id: "msg_tool_result_101",
  role: "tool",
  subtype: "tool-result",
  toolResult: {
    id: "tool_123",
    name: "get_weather",
    output: "Sunny, 72°F"
  },
  toolCallId: "tool_123",
  timestamp: 1234567893,
}
```

### Message Event Types

| Event Type            | Data                | Description           |
| --------------------- | ------------------- | --------------------- |
| `user_message`        | `UserMessage`       | User sent message     |
| `assistant_message`   | `AssistantMessage`  | AI completed response |
| `tool_call_message`   | `ToolCallMessage`   | AI requested tool     |
| `tool_result_message` | `ToolResultMessage` | Tool execution result |

---

## Layer 4: Turn Events

**Purpose**: Analytics, metrics, billing.

**Use cases**: Usage tracking, cost calculation, monitoring.

### Turn Tracking

```typescript
agentx.on("turn_request", (e) => {
  console.log("Turn started:", e.data.turnId);
  console.log("User message:", e.data.userMessage.content);
});

agentx.on("turn_response", (e) => {
  console.log("Turn completed:", e.data.turnId);
  console.log("Assistant message:", e.data.assistantMessage.content);
  console.log("Duration:", e.data.durationMs, "ms");

  if (e.data.usage) {
    console.log("Input tokens:", e.data.usage.inputTokens);
    console.log("Output tokens:", e.data.usage.outputTokens);
  }

  if (e.data.costUsd) {
    console.log("Cost:", e.data.costUsd, "USD");
  }
});
```

### Turn Event Structure

```typescript
// TurnRequestEvent
{
  type: "turn_request",
  data: {
    turnId: "turn_123",
    userMessage: { ... },
    startedAt: 1234567890,
  }
}

// TurnResponseEvent
{
  type: "turn_response",
  data: {
    turnId: "turn_123",
    userMessage: { ... },
    assistantMessage: { ... },
    durationMs: 1234,
    usage: {
      inputTokens: 100,
      outputTokens: 200,
      totalTokens: 300,
    },
    costUsd: 0.0015,
    startedAt: 1234567890,
    completedAt: 1234569124,
  }
}
```

### Turn Event Types

| Event Type      | Data                                          | Description    |
| --------------- | --------------------------------------------- | -------------- |
| `turn_request`  | `{ turnId, userMessage, startedAt }`          | Turn started   |
| `turn_response` | `{ turnId, ..., durationMs, usage, costUsd }` | Turn completed |

---

## Event Subscription Patterns

### 1. Subscribe to Specific Event

```typescript
const unsubscribe = agentx.on("text_delta", (e) => {
  console.log(e.data.text);
});

// Later: unsubscribe
unsubscribe();
```

### 2. Subscribe to Multiple Events

```typescript
agentx.on(["message_start", "message_stop"], (e) => {
  console.log(e.type);
});
```

### 3. Subscribe to All Events

```typescript
agentx.onAny((e) => {
  console.log(`[${e.type}]`, e.data);
});
```

### 4. Subscribe with Filters

```typescript
agentx.on(
  "text_delta",
  (e) => {
    console.log(e.data.text);
  },
  {
    filter: (e) => e.context?.agentId === "agent_123",
  }
);
```

### 5. Subscribe with Priority

```typescript
agentx.on("message_start", handler1, { priority: 10 }); // Runs first
agentx.on("message_start", handler2, { priority: 5 }); // Runs second
agentx.on("message_start", handler3); // Runs last (priority: 0)
```

### 6. One-time Subscription

```typescript
agentx.once("conversation_end", () => {
  console.log("First conversation completed");
});
```

---

## Practical Examples

### Building a Chat UI

```typescript
// State management
let isThinking = false;
let currentResponse = "";

// Stream text
agentx.on("text_delta", (e) => {
  currentResponse += e.data.text;
  updateUI(currentResponse);
});

// Loading indicator
agentx.on("conversation_start", () => {
  isThinking = true;
  showLoader();
});

agentx.on("conversation_end", () => {
  isThinking = false;
  hideLoader();
  currentResponse = "";
});

// Save history
agentx.on("assistant_message", (e) => {
  saveMessage(e.data);
});
```

### Usage Tracking

```typescript
const usageStats = {
  totalTokens: 0,
  totalCost: 0,
  turnCount: 0,
};

agentx.on("turn_response", (e) => {
  if (e.data.usage) {
    usageStats.totalTokens += e.data.usage.totalTokens;
  }
  if (e.data.costUsd) {
    usageStats.totalCost += e.data.costUsd;
  }
  usageStats.turnCount++;

  console.log("Stats:", usageStats);
});
```

### Tool Execution Logging

```typescript
const toolLogs: any[] = [];

agentx.on("tool_planned", (e) => {
  toolLogs.push({
    name: e.data.toolCall.name,
    input: e.data.toolCall.input,
    status: "pending",
    timestamp: Date.now(),
  });
});

agentx.on("tool_completed", (e) => {
  const log = toolLogs.find((l) => l.name === e.data.toolResult.name);
  if (log) {
    log.status = "completed";
    log.output = e.data.toolResult.output;
    log.duration = Date.now() - log.timestamp;
  }
});

agentx.on("tool_failed", (e) => {
  const log = toolLogs.find((l) => l.status === "pending");
  if (log) {
    log.status = "failed";
    log.error = e.data.error;
  }
});
```

---

## Next Steps

- **[Lifecycle Management](./lifecycle.md)** - Agent lifecycle (run, stop, resume)
- **[Mealy Machine](./mealy-machine.md)** - Event processing internals
- **[Event Subscription Guide](../guides/events.md)** - Practical patterns
