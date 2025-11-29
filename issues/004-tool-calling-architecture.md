# Issue #004: Tool Calling Architecture - Complete System Overview

**Status**: Implemented ✅
**Date**: 2025-11-17
**Related Issues**: #002 (Message Direction), #003 (Claude SDK Error Handling)

## Overview

This document provides a comprehensive overview of the **Tool Calling Architecture** in AgentX Framework. It covers the complete data flow from Claude SDK tool execution to UI display, including all event layers, reactors, and component interactions.

## Table of Contents

1. [Architecture Diagram](#architecture-diagram)
2. [Event Layers](#event-layers)
3. [Data Flow](#data-flow)
4. [Key Components](#key-components)
5. [Design Decisions](#design-decisions)
6. [Code Locations](#code-locations)
7. [Testing Guide](#testing-guide)

---

## Architecture Diagram

### Complete Event Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Claude SDK                                │
│  (Tool execution: type: "user", content: [{ type: "tool_result" }])│
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ClaudeSDKDriver                               │
│  • Transforms SDK messages → Stream events                      │
│  • Emits: tool_call, tool_result                                │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DriverReactor                                 │
│  • Bridges Driver → EventBus                                    │
│  • Forwards all stream events                                   │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EventBus (Pub/Sub)                            │
│  • Central event distribution                                   │
│  • Multiple reactors subscribe                                  │
└───────┬───────────┬─────────────┬───────────────────────────────┘
        │           │             │
        ▼           ▼             ▼
┌──────────┐ ┌─────────────┐ ┌──────────────────┐
│ Message  │ │  Exchange   │ │  WebSocket       │
│Assembler │ │  Tracker    │ │  Reactor         │
└────┬─────┘ └──────┬──────┘ └────┬─────────────┘
     │              │              │
     │              │              ▼
     │              │        ┌──────────────┐
     │              │        │  WebSocket   │
     │              │        │  (Server)    │
     │              │        └──────┬───────┘
     │              │               │
     │              │               ▼
     ▼              ▼         ┌──────────────┐
┌─────────────────────┐      │ WebSocket    │
│ ToolUseMessage      │      │ Driver       │
│ (Message Layer)     │      │ (Browser)    │
└─────────────────────┘      └──────┬───────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │ Chat        │
                              │ Component   │
                              │ (React)     │
                              └─────────────┘
```

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ Stream Layer (Low-Level Delta Events)                       │
├─────────────────────────────────────────────────────────────┤
│ • tool_use_content_block_start                              │
│ • input_json_delta                                          │
│ • tool_use_content_block_stop                               │
│ • tool_call ✨ (High-level: complete call assembled)       │
│ • tool_result ✨ (High-level: execution result)            │
├─────────────────────────────────────────────────────────────┤
│ Purpose: Incremental data transmission during streaming     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ State Layer (Lifecycle & Status)                            │
├─────────────────────────────────────────────────────────────┤
│ • conversation_start / conversation_end                     │
│ • conversation_thinking / conversation_responding           │
│ • tool_planned / tool_executing / tool_completed            │
├─────────────────────────────────────────────────────────────┤
│ Purpose: Track agent lifecycle and execution state          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Message Layer (Complete Messages)                           │
├─────────────────────────────────────────────────────────────┤
│ • user_message                                              │
│ • assistant_message                                         │
│ • tool_use_message ✨ (ToolCall + ToolResult)              │
│ • error_message                                             │
├─────────────────────────────────────────────────────────────┤
│ Purpose: Assembled complete messages for storage/display    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Exchange Layer (Request-Response Pairs)                     │
├─────────────────────────────────────────────────────────────┤
│ • exchange_request                                          │
│ • exchange_response ✨ (Signals entire exchange complete)  │
├─────────────────────────────────────────────────────────────┤
│ Purpose: Track multi-turn agentic conversations             │
└─────────────────────────────────────────────────────────────┘
```

---

## Event Layers

### 1. Stream Layer Events

#### Low-Level Events (Deltas)

**Purpose**: Incremental data during streaming

```typescript
// Tool use starts
tool_use_content_block_start {
  type: "tool_use_content_block_start",
  index: 1,
  data: {
    id: "toolu_01xxx",
    name: "Bash"
  }
}

// Tool input JSON arrives in chunks
input_json_delta {
  type: "input_json_delta",
  index: 1,
  data: {
    partialJson: '{"command"'
  }
}

// Tool use block complete
tool_use_content_block_stop {
  type: "tool_use_content_block_stop",
  index: 1,
  data: { id: "toolu_01xxx" }
}
```

#### High-Level Events (Complete Data)

**Purpose**: Semantic events indicating completion

```typescript
// ✨ Complete tool call (parameters parsed)
tool_call {
  type: "tool_call",
  uuid: "evt_xxx",
  agentId: "agent_xxx",
  timestamp: 1763380200635,
  data: {
    id: "toolu_01xxx",
    name: "Bash",
    input: { command: "ls -la" }  // ← Parsed JSON
  }
}

// ✨ Tool execution result (from Claude SDK)
tool_result {
  type: "tool_result",
  uuid: "evt_yyy",
  agentId: "agent_xxx",
  timestamp: 1763380205000,
  data: {
    toolId: "toolu_01xxx",
    content: "total 88 drwxr-xr-x...",  // ← Actual output
    isError: false
  }
}
```

**Why Both?**

- Low-level events: Granular control, streaming feedback
- High-level events: Clean abstraction, easy to consume

### 2. Message Layer Events

```typescript
// ToolUseMessage: Complete tool usage record
tool_use_message {
  type: "tool_use_message",
  uuid: "msg_xxx",
  agentId: "agent_xxx",
  timestamp: 1763380200635,
  data: {
    id: "msg_xxx",
    role: "tool-use",
    toolCall: {
      type: "tool-call",
      id: "toolu_01xxx",
      name: "Bash",
      input: { command: "ls -la" }
    },
    toolResult: {
      type: "tool-result",
      id: "toolu_01xxx",
      name: "Bash",
      output: {
        type: "text",
        value: "total 88 drwxr-xr-x..."  // ← Updated via tool_result event
      }
    },
    timestamp: 1763380200635
  }
}
```

### 3. Exchange Layer Events

```typescript
// Exchange starts (user sends message)
exchange_request {
  type: "exchange_request",
  exchangeId: "exchange_xxx",
  data: {
    userMessage: { ... },
    requestedAt: 1763380190000
  }
}

// ✨ Exchange completes (including all tool calls)
exchange_response {
  type: "exchange_response",
  exchangeId: "exchange_xxx",
  data: {
    assistantMessage: { ... },
    respondedAt: 1763380210000,
    durationMs: 20000,
    usage: { input: 1000, output: 500 },
    costUsd: 0.015
  }
}
```

**Key**: `exchange_response` is emitted when `stopReason === "end_turn"`, not on `message_stop`.

---

## Data Flow

### Scenario: User Asks "你的目录有什么"

#### Step 1: User Sends Message

```
User types → Chat.handleSend()
  ↓ agent.send("你的目录有什么")
  ↓ WebSocketDriver sends to server
  ↓ WebSocketServer → AgentSession
  ↓ agent.send() → ClaudeSDKDriver
```

#### Step 2: Claude Decides to Use Tool

```
Claude SDK → stream_event (message_start)
  ↓ ClaudeSDKDriver → builder.messageStart()
  ↓ DriverReactor → EventBus.produce()
  ↓ WebSocketReactor → ws.send()
  ↓ Browser receives message_start

Claude SDK → stream_event (content_block_start: tool_use)
  ↓ ClaudeSDKDriver → builder.toolUseContentBlockStart()
  ↓ AgentMessageAssembler starts accumulating

Claude SDK → stream_event (content_block_delta: input_json_delta)
  ↓ ClaudeSDKDriver → builder.inputJsonDelta()
  ↓ AgentMessageAssembler accumulates JSON chunks

Claude SDK → stream_event (content_block_stop)
  ↓ ClaudeSDKDriver → builder.toolUseContentBlockStop()
  ↓ AgentMessageAssembler parses complete JSON
  ↓ Emits tool_call event ✨
  ↓ Emits tool_use_message event
  ↓ WebSocketReactor forwards to browser
  ↓ Chat.onToolUseMessage() adds to UI
```

#### Step 3: Claude SDK Executes Tool

```
Claude SDK internally executes tool (Bash command)
  ↓ Returns type: "user" message
  ↓ Content: [{ type: "tool_result", tool_use_id: "xxx", content: "..." }]

ClaudeSDKDriver receives SDKMessage (type: "user")
  ↓ Extracts tool_result block
  ↓ Emits builder.toolResult(toolId, content, isError) ✨
  ↓ DriverReactor → EventBus.produce()
  ↓ WebSocketReactor → ws.send()
  ↓ Browser receives tool_result event
  ↓ Chat.onToolResult() updates ToolUseMessage.toolResult.output ✨
```

#### Step 4: Claude Generates Final Response

```
Claude SDK → stream_event (content_block_delta: text_delta)
  ↓ ClaudeSDKDriver → builder.textDelta()
  ↓ Chat.onTextDelta() → setStreaming() (shows "AI is typing...")

Claude SDK → stream_event (message_delta: stopReason="end_turn")
  ↓ ClaudeSDKDriver → builder.messageDelta(stopReason)
  ↓ AgentExchangeTracker detects "end_turn"
  ↓ Emits exchange_response ✨
  ↓ Chat.onExchangeResponse() → setIsLoading(false) (hides "Thinking...")

Claude SDK → stream_event (message_stop)
  ↓ AgentMessageAssembler assembles complete assistant message
  ↓ Emits assistant_message event
  ↓ Chat.onAssistantMessage() adds to UI
```

---

## Key Components

### 1. ClaudeSDKDriver

**Location**: `packages/agentx-framework/src/drivers/ClaudeSDKDriver.ts`

**Responsibilities**:

- Transform Claude SDK messages → AgentX Stream events
- Handle `type: "user"` messages containing `tool_result` blocks
- Emit high-level events: `tool_call`, `tool_result`

**Key Code**:

```typescript
// Emit tool_call when processing complete assistant message
async function* processAssistantContent(sdkMsg, builder) {
  for (const block of sdkMsg.message.content) {
    if (block.type === "tool_use") {
      yield builder.toolUseContentBlockStart(block.id, block.name, i);
      yield builder.inputJsonDelta(JSON.stringify(block.input), i);
      yield builder.toolUseContentBlockStop(block.id, i);
      // ✨ High-level event: complete tool call
      yield builder.toolCall(block.id, block.name, block.input);
    }
  }
}

// Extract tool_result from Claude SDK
async function* transformSDKMessages(sdkMessages, builder) {
  for await (const sdkMsg of sdkMessages) {
    if (sdkMsg.type === "user" && Array.isArray(sdkMsg.message.content)) {
      for (const block of sdkMsg.message.content) {
        if (block.type === "tool_result") {
          // ✨ High-level event: tool execution result
          yield builder.toolResult(block.tool_use_id, block.content, block.is_error || false);
        }
      }
    }
  }
}
```

### 2. AgentMessageAssembler

**Location**: `packages/agentx-core/src/AgentMessageAssembler.ts`

**Responsibilities**:

- Accumulate stream deltas → complete messages
- Parse tool input JSON
- Emit `tool_call` event (for streaming scenarios)
- Create `ToolUseMessage` with placeholder result

**Key Code**:

```typescript
private onToolUseContentBlockStop() {
  // Parse accumulated JSON
  const toolInput = JSON.parse(pending.toolInputJson);

  // ✨ Emit high-level tool_call event
  const toolCallEvent: ToolCallEvent = {
    type: "tool_call",
    data: {
      id: pending.toolId,
      name: pending.toolName,
      input: toolInput
    }
  };
  this.context.producer.produce(toolCallEvent);

  // Create ToolUseMessage with empty result (will be filled later)
  const toolUseMessage: ToolUseMessage = {
    id: this.generateId(),
    role: "tool-use",
    toolCall: { type: "tool-call", id, name, input: toolInput },
    toolResult: {
      type: "tool-result",
      id,
      name,
      output: { type: "text", value: "" }  // ← Placeholder
    }
  };

  this.emitMessageEvent({ type: "tool_use_message", data: toolUseMessage });
}
```

### 3. AgentExchangeTracker

**Location**: `packages/agentx-core/src/AgentExchangeTracker.ts`

**Responsibilities**:

- Track request-response exchange pairs
- Detect exchange completion via `stopReason === "end_turn"`
- Emit `exchange_response` event

**Key Code**:

```typescript
private onMessageDelta(event: MessageDeltaEvent) {
  if (!this.pendingExchange) return;

  if (event.data.delta.stopReason) {
    this.pendingExchange.lastStopReason = event.data.delta.stopReason;

    // ✨ Exchange completes when stopReason is "end_turn"
    if (event.data.delta.stopReason === "end_turn") {
      this.completeExchange(event.timestamp);
    }
  }
}

private completeExchange(completedAt: number) {
  const responseEvent: ExchangeResponseEvent = {
    type: "exchange_response",
    exchangeId: this.pendingExchange.exchangeId,
    data: {
      respondedAt: completedAt,
      durationMs: completedAt - this.pendingExchange.requestedAt
    }
  };
  this.emitExchangeEvent(responseEvent);
  this.pendingExchange = null;
}
```

### 4. Chat Component

**Location**: `packages/agentx-ui/src/components/chat/Chat.tsx`

**Responsibilities**:

- Listen to events via `agent.react()`
- Manage UI state (loading, streaming, messages)
- Update `ToolUseMessage.toolResult` on `tool_result` event

**Key Code**:

```typescript
const unsubscribe = agent.react({
  // Add ToolUseMessage when tool call is assembled
  onToolUseMessage(event: ToolUseMessageEvent) {
    setMessages((prev) => [...prev, event.data]);
  },

  // ✨ Update ToolResult when execution completes
  onToolResult(event: ToolResultEvent) {
    const { toolId, content, isError } = event.data;
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.role === "tool-use" && msg.toolCall.id === toolId) {
          return {
            ...msg,
            toolResult: {
              ...msg.toolResult,
              output: {
                type: isError ? "error-text" : "text",
                value: typeof content === "string" ? content : JSON.stringify(content),
              },
            },
          };
        }
        return msg;
      })
    );
  },

  // ✨ Hide loading ONLY when exchange completes (not on assistant_message)
  onExchangeResponse(_event: ExchangeResponseEvent) {
    setIsLoading(false);
    setStreaming("");
  },
});
```

---

## Design Decisions

### 1. Why `tool_call` and `tool_result` Events?

**Problem**: Low-level events (`tool_use_content_block_*`) don't indicate semantic completion.

**Solution**: Add high-level events that signal "tool call is ready" and "tool result is available".

**Benefits**:

- Clean abstraction for consumers (don't need to parse JSON deltas)
- Easy to add middleware (e.g., permission checks before execution)
- Decoupled from streaming implementation details

### 2. Why Use `exchange_response` Instead of `message_stop`?

**Problem**: In agentic flows, there are **multiple** `message_stop` events:

```
First message_stop  ← Tool decision (NOT the end!)
Tool execution...
Second message_stop ← Final response (end of exchange)
```

If we close loading on first `message_stop`, user sees:

```
User: "你的目录有什么"
  ↓ Thinking...
Assistant: (decides to use tool)
  ↓ Loading disappears ❌
[Long pause while tool executes - no feedback!]
  ↓ Tool result appears
Assistant: "这是你的目录内容..."
```

**Solution**: Use `exchange_response` which only emits when `stopReason === "end_turn"`.

**Benefits**:

- Loading indicator stays visible during entire exchange
- User always sees feedback ("Thinking...")
- Semantically correct (exchange = user request + complete response)

### 3. Why Type-Define `StopReason`?

**Problem**: Using raw strings like `"end_turn"`, `"tool_use"` is error-prone.

**Solution**: Create `StopReason` type:

```typescript
export type StopReason =
  | "end_turn" // Natural conversation end
  | "tool_use" // Model wants to use a tool
  | "max_tokens" // Reached token limit
  | "stop_sequence"; // Custom stop sequence
```

**Benefits**:

- TypeScript catches typos at compile time
- Auto-completion in IDEs
- Clear documentation of all possible values

### 4. Why Update `ToolUseMessage` Instead of Creating New Message?

**Problem**: When `tool_result` event arrives, we could:

- Option A: Create a new `ToolResultMessage`
- Option B: Update existing `ToolUseMessage.toolResult`

**Solution**: Option B (update existing).

**Rationale**:

- Tool call + result are semantically **one action** from user's view
- Simpler UI (one expandable component instead of two separate messages)
- Matches Claude's mental model (tool use is atomic)

---

## Code Locations

### Event Definitions

```
packages/agentx-event/src/stream/
├── ToolCallEvent.ts           # High-level: complete tool call
├── ToolResultEvent.ts         # High-level: execution result
├── ToolUseContentBlockStartEvent.ts
├── InputJsonDeltaEvent.ts
└── ToolUseContentBlockStopEvent.ts

packages/agentx-event/src/types/
└── StopReason.ts              # Type-safe stop reasons
```

### Core Logic

```
packages/agentx-core/src/
├── AgentMessageAssembler.ts   # Assemble deltas → messages
├── AgentExchangeTracker.ts    # Track exchange lifecycle
└── driver/
    └── StreamEventBuilder.ts  # Helper to build events
```

### Driver & Reactors

```
packages/agentx-framework/src/
├── drivers/
│   ├── ClaudeSDKDriver.ts     # Claude SDK → Stream events
│   └── WebSocketDriver.ts     # Browser WebSocket client
├── reactors/
│   └── WebSocketReactor.ts    # Forward events to WebSocket
└── defineReactor.ts           # Reactor definition helper
```

### UI Components

```
packages/agentx-ui/src/components/chat/
├── Chat.tsx                   # Main chat component (event handling)
├── ToolUseMessage.tsx         # Display tool call + result
└── parts/
    ├── ToolCallContent.tsx    # Tool call display (collapsible)
    └── ToolResultContent.tsx  # Tool result display (collapsible)
```

---

## Testing Guide

### Manual Testing

1. **Start dev server**:

   ```bash
   pnpm dev
   ```

2. **Send tool-triggering message**:

   ```
   "你的目录有什么"
   "Run ls -la command"
   ```

3. **Expected behavior**:
   - ✅ "Thinking..." appears immediately
   - ✅ "Thinking..." stays visible during tool execution
   - ✅ Tool call appears (collapsed by default)
   - ✅ Tool result shows actual output (not empty)
   - ✅ Final assistant response appears
   - ✅ "Thinking..." disappears after exchange completes

### Debug Logs

**Server logs**:

```
[ClaudeSDKDriver] Processing user message with tool_result
[AgentMessageAssembler] Emitting tool_call event
[AgentExchangeTracker] Captured stop reason: end_turn
[AgentExchangeTracker] Completing exchange: exchange_xxx
```

**Browser console**:

```
[Chat] conversation_start
[Chat] tool_use_message: msg_xxx
[Chat] tool_result: toolu_xxx <actual content>
[Chat] assistant_message: msg_yyy
[Chat] exchange_response - exchange complete
```

### Event Sequence Verification

Use browser DevTools to verify event order:

```javascript
// In Chat.tsx, add debug logs
onToolCall(event) {
  console.log("1. tool_call", event.data.name);
}

onToolUseMessage(event) {
  console.log("2. tool_use_message", event.data.toolCall.name);
}

onToolResult(event) {
  console.log("3. tool_result", event.data.toolId, event.data.content);
}

onExchangeResponse(event) {
  console.log("4. exchange_response - DONE");
}
```

**Expected order**:

```
1. tool_call Bash
2. tool_use_message Bash
3. tool_result toolu_xxx <content>
4. exchange_response - DONE
```

---

## Future Enhancements

### 1. Tool Execution Middleware

Currently, tools are executed by Claude SDK automatically. Future enhancement:

```typescript
// Intercept tool_call event, execute locally
onToolCall(event) {
  const result = await executeToolLocally(event.data.name, event.data.input);

  // Send result back to Claude SDK
  agent.sendToolResult(event.data.id, result);
}
```

### 2. Tool Permission System

```typescript
onToolCall(event) {
  if (needsUserPermission(event.data.name)) {
    // Show UI confirmation dialog
    const approved = await askUserPermission(event.data);

    if (!approved) {
      agent.sendToolResult(event.data.id, {
        type: "execution-denied",
        reason: "User denied permission"
      });
    }
  }
}
```

### 3. Tool Result Caching

```typescript
const toolResultCache = new Map<string, ToolResultOutput>();

onToolCall(event) {
  const cacheKey = `${event.data.name}:${JSON.stringify(event.data.input)}`;

  if (toolResultCache.has(cacheKey)) {
    // Use cached result instead of re-executing
    const cachedResult = toolResultCache.get(cacheKey);
    agent.sendToolResult(event.data.id, cachedResult);
  }
}
```

---

## Summary

The Tool Calling Architecture in AgentX Framework is built on **4 event layers** with clear separation of concerns:

1. **Stream Layer**: Low-level deltas + high-level semantic events (`tool_call`, `tool_result`)
2. **State Layer**: Lifecycle and status tracking
3. **Message Layer**: Complete assembled messages (`ToolUseMessage`)
4. **Exchange Layer**: Multi-turn conversation tracking (`exchange_response`)

**Key Design Principles**:

- **Decoupling**: Each layer has clear responsibilities
- **Type Safety**: TypeScript types for all events and data structures
- **Extensibility**: Easy to add middleware, permission checks, caching
- **Developer Experience**: High-level events hide complexity from consumers

This architecture enables:

- ✅ Real-time streaming with instant feedback
- ✅ Multi-turn agentic conversations
- ✅ Tool execution with result display
- ✅ Clean separation between server and client
- ✅ Easy debugging and monitoring

---

**Related Files**:

- [StopReason.ts](../packages/agentx-event/src/types/StopReason.ts)
- [ToolCallEvent.ts](../packages/agentx-event/src/stream/ToolCallEvent.ts)
- [ToolResultEvent.ts](../packages/agentx-event/src/stream/ToolResultEvent.ts)
- [ClaudeSDKDriver.ts](../packages/agentx-framework/src/drivers/ClaudeSDKDriver.ts)
- [AgentMessageAssembler.ts](../packages/agentx-core/src/AgentMessageAssembler.ts)
- [AgentExchangeTracker.ts](../packages/agentx-core/src/AgentExchangeTracker.ts)
- [Chat.tsx](../packages/agentx-ui/src/components/chat/Chat.tsx)
