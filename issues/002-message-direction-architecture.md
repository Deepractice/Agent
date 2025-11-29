# Issue #002: Message Direction Architecture & Event Flow

**Status**: 🔴 Critical (Production Bug)
**Priority**: High
**Created**: 2025-11-17
**Labels**: `architecture`, `bug`, `websocket`, `event-system`

---

## Problem

Message events are being sent in **wrong directions**, causing:

1. **Infinite loops** - `user_message` echoed back to client triggers re-send
2. **Message duplication** - Same message appears 100+ times in UI
3. **Performance issues** - System becomes unresponsive
4. **Architectural confusion** - No clear separation between unidirectional and bidirectional events

### Root Cause

**Server blindly forwards ALL events to WebSocket clients**, including events that originated from the client itself.

```typescript
// WebSocketReactor.ts - WRONG!
export const WebSocketReactor = defineReactor<WebSocketReactorConfig>({
  // ...
  onUserMessage: (e, cfg) => sendEvent(cfg.ws, e), // ❌ Echoes back to client!
  onAssistantMessage: (e, cfg) => sendEvent(cfg.ws, e),
  // ...
});
```

### Symptom Logs

**Server logs show message explosion**:

```
[AgentService.send] Message: 你好
[AgentService.send] Total messages: 1
[AgentService.send] Total messages: 2  // ← Why?!
[AgentService.send] Total messages: 3
[AgentService.send] Total messages: 4
...
[AgentService.send] Total messages: 100+  // ← System freeze
```

**All in 39 milliseconds!** - Clear sign of infinite loop.

---

## Architecture Analysis

### Message Direction Categories

#### 1. **Unidirectional: Client → Server** (Request)

These events originate from client and should **NOT** be echoed back:

| Event                           | Direction           | Current Bug                | Fix                              |
| ------------------------------- | ------------------- | -------------------------- | -------------------------------- |
| `user` (WebSocket message)      | Client → Server     | ✅ Correct                 | Keep                             |
| `user_message` (internal event) | ~~Server → Client~~ | ❌ **WRONG - causes loop** | **Remove from WebSocketReactor** |

**Reason**: Client already knows what it sent - no need for server confirmation.

#### 2. **Unidirectional: Server → Client** (Response)

These events originate from server and should be sent to client:

| Event               | Direction       | Current | Status  |
| ------------------- | --------------- | ------- | ------- |
| `text_delta`        | Server → Client | ✅      | Correct |
| `message_start`     | Server → Client | ✅      | Correct |
| `message_stop`      | Server → Client | ✅      | Correct |
| `assistant_message` | Server → Client | ✅      | Correct |
| `tool_use_message`  | Server → Client | ✅      | Correct |
| `error_message`     | Server → Client | ✅      | Correct |

**Reason**: Client needs these to display AI responses.

#### 3. **Bidirectional Events** (Avoid if possible)

Events that could flow in both directions - **design smell**, should be avoided:

Currently: **None** ✅

---

## Proposed Solution

### Fix 1: Remove `user_message` from WebSocketReactor

```diff
// packages/agentx-framework/src/reactors/WebSocketReactor.ts

export const WebSocketReactor = defineReactor<WebSocketReactorConfig>({
  // ...

  // ==================== Message Layer ====================
- onUserMessage: (e, cfg) => sendEvent(cfg.ws, e),  // ❌ Remove this!
+ // onUserMessage: NOT forwarded - originated from client
  onAssistantMessage: (e, cfg) => sendEvent(cfg.ws, e),
  onToolUseMessage: (e, cfg) => sendEvent(cfg.ws, e),
  onErrorMessage: (e, cfg) => sendEvent(cfg.ws, e),
});
```

**Impact**: Server will no longer echo user messages back to client.

### Fix 2: Client handles user messages locally

```diff
// packages/agentx-ui/src/components/chat/Chat.tsx

const handleSend = async (text: string) => {
  setIsLoading(true);

+ // Add user message to UI immediately (local state)
+ const userMessage: Message = {
+   id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
+   role: "user",
+   content: text,
+   timestamp: Date.now(),
+ };
+ setMessages((prev) => [...prev, userMessage]);

- // Server will echo back via onUserMessage ❌ WRONG!
  await agent.send(text);
};
```

**Impact**: Instant UI feedback + no server round-trip for user messages.

### Fix 3: WebSocketDriver filters event types

```diff
// packages/agentx-framework/src/drivers/WebSocketDriver.ts

ws.addEventListener("message", (event: MessageEvent) => {
  const data = JSON.parse(event.data);

+ // Only handle stream events (ignore echo messages)
+ const streamEventTypes = [
+   "message_start", "text_delta", "message_stop",
+   "text_content_block_start", "text_content_block_stop",
+   // ... other stream events
+ ];
+
+ if (!streamEventTypes.includes(data.type)) {
+   return;  // Ignore non-stream events
+ }

  // Process stream events...
});
```

**Impact**: Client ignores any echoed messages even if server mistakenly sends them.

---

## Data Flow Diagrams

### Before (WRONG - Infinite Loop)

```
┌─────────┐                  ┌─────────┐
│ Client  │                  │ Server  │
└─────────┘                  └─────────┘
     │                            │
     │  1. send("你好")           │
     ├───────────────────────────>│
     │                            │
     │                     2. trigger user_message event
     │                            │
     │  3. user_message event     │
     │<───────────────────────────┤ ❌ Echo back!
     │                            │
  4. onUserMessage()              │
     │                            │
     │  5. send("你好") AGAIN!    │
     ├───────────────────────────>│ ❌ Loop!
     │                            │
     └──> ♾️ INFINITE LOOP        │
```

### After (CORRECT - Unidirectional)

```
┌─────────┐                  ┌─────────┐
│ Client  │                  │ Server  │
└─────────┘                  └─────────┘
     │                            │
     │  1. Add to local UI        │
     │                            │
     │  2. send("你好")           │
     ├───────────────────────────>│
     │                            │
     │                     3. Process & respond
     │                            │
     │  4. text_delta events      │
     │<───────────────────────────┤ ✅ Response only
     │                            │
     │  5. assistant_message      │
     │<───────────────────────────┤ ✅ Response only
     │                            │
     └──> ✅ Clean, no loop       │
```

---

## Design Principles

### 1. **Unidirectional Data Flow**

- Client sends **requests** (user input)
- Server sends **responses** (AI output)
- **No echo/reflection** of requests back to sender

### 2. **Event Ownership**

Each event has a clear **owner** and **direction**:

| Event Type    | Owner  | Direction       |
| ------------- | ------ | --------------- |
| User input    | Client | Client → Server |
| AI responses  | Server | Server → Client |
| Errors        | Server | Server → Client |
| State changes | Server | Server → Client |

### 3. **Separation of Concerns**

**WebSocket Message Types** (Protocol Layer):

- `{ type: "user", message: {...} }` - Client → Server
- `{ type: "clear" }` - Client → Server
- `{ type: "destroy" }` - Client → Server

**Internal Events** (Application Layer):

- `user_message` - Internal to server (NOT sent to client)
- `assistant_message` - Server → Client
- `text_delta` - Server → Client

**Rule**: WebSocket protocol types ≠ Internal event types

---

## Testing Strategy

### Unit Tests

```typescript
describe('WebSocketReactor', () => {
  it('should NOT forward user_message to WebSocket', () => {
    const mockWs = { send: jest.fn() };
    const reactor = WebSocketReactor.create({ ws: mockWs });

    reactor.onUserMessage({ type: 'user_message', data: {...} });

    expect(mockWs.send).not.toHaveBeenCalled();  // ✅ No echo
  });

  it('should forward assistant_message to WebSocket', () => {
    const mockWs = { send: jest.fn() };
    const reactor = WebSocketReactor.create({ ws: mockWs });

    reactor.onAssistantMessage({ type: 'assistant_message', data: {...} });

    expect(mockWs.send).toHaveBeenCalledTimes(1);  // ✅ Forwarded
  });
});
```

### Integration Tests

```typescript
describe("Message Flow", () => {
  it("should handle user message without echo", async () => {
    const client = createTestClient();
    const messages: any[] = [];

    client.on("message", (msg) => messages.push(msg));

    await client.send("你好");
    await wait(100);

    // Should receive only server responses, not echo
    expect(messages).not.toContainEqual(expect.objectContaining({ type: "user_message" }));
    expect(messages).toContainEqual(expect.objectContaining({ type: "assistant_message" }));
  });
});
```

---

## Migration Checklist

- [x] Remove `onUserMessage` from WebSocketReactor
- [x] Update client to add user messages locally
- [x] Add event type filtering in WebSocketDriver
- [ ] Add unit tests for WebSocketReactor
- [ ] Add integration tests for message flow
- [ ] Update documentation
- [ ] Add architecture diagram to docs
- [ ] Review all other event types for correct direction

---

## Related Issues

- #001 - Session Abstraction Design (related to message ownership)

---

## Discussion

**Key Insight from debugging**:

> "我觉得需要提一个 issue，我们需要把这个方向拟清楚，比如 usermessage 就是一个方向对不对"

**Correct!** Message direction is fundamental to system stability:

1. **User-initiated events** = Client → Server (one-way)
2. **AI responses** = Server → Client (one-way)
3. **Never echo requests back to sender** = Prevents loops

This principle applies to ALL distributed systems, not just our agent framework.

---

## Future Considerations

### Multi-device Sync (Future Feature)

If we need to sync user messages across devices in the future:

**Option 1**: Dedicated sync channel

```typescript
// Separate event type for sync (not echo)
{ type: "message_synced", source: "device-2", message: {...} }
```

**Option 2**: Explicit acknowledgment

```typescript
client.send("你好", { requireAck: true });
// Server responds with ACK, not echo
{ type: "message_ack", messageId: "msg_123", status: "delivered" }
```

**Rule**: Even for sync, **never blindly echo back** - always use distinct event types.

---

## 🔮 Future Direction: Full Reactor-Driven Architecture

**Status**: 💡 Under Consideration
**Updated**: 2025-11-17

### Current Problem with "Local-First" Approach

The current fix (client adds user messages locally) has architectural issues:

**Current Flow**:

```typescript
// Client (UI layer)
const handleSend = async (text: string) => {
  // ❌ UI layer manages state
  const userMessage = { id: generateId(), content: text };
  setMessages((prev) => [...prev, userMessage]);

  await agent.send(text);
};
```

**Problems**:

1. ❌ **UI is not pure presentation** - contains business logic
2. ❌ **Dual ID generation** - client and server generate different IDs
3. ❌ **Multi-device sync difficulties** - each client has its own local state
4. ❌ **Violates Single Source of Truth** - server vs client state divergence
5. ❌ **Inconsistent architecture** - user messages handled differently than assistant messages

### Proposed: Pure Reactor-Driven Architecture

**Core Principle**:

> "前端只是显示层，所有状态变更都通过 Reactor 事件驱动，不管是发送还是接收"

**Ideal Flow**:

```typescript
// Client (pure presentation layer)
const handleSend = async (text: string) => {
  setIsLoading(true);
  await agent.send(text);  // ✅ Only trigger, no state management
  // Wait for onUserMessage callback to add to UI
};

// All state changes driven by Reactor events
onUserMessage(event: UserMessageEvent) {
  const userMsg = event.data;
  setMessages(prev => {
    if (prev.some(m => m.id === userMsg.id)) return prev;
    return [...prev, userMsg];  // ✅ Event-driven state update
  });
  // Important: ONLY add message, never trigger send!
}
```

### Architecture Comparison

#### Before: Local-First (Current Fix)

```
┌─────────────────────────────────────┐
│ Client                              │
│                                     │
│  handleSend()                       │
│    ├─> Add to local state (ID: c1) │ ❌ UI manages state
│    └─> agent.send()                 │
│                                     │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ Server                              │
│                                     │
│  Creates message (ID: s1)           │ ❌ Different ID!
│  Processes...                       │
│  (user_message NOT sent back)       │
│                                     │
└─────────────────────────────────────┘

Result: Client shows (ID: c1), Server has (ID: s1) ❌
```

#### After: Reactor-Driven (Proposed)

```
┌─────────────────────────────────────┐
│ Client                              │
│                                     │
│  handleSend()                       │
│    └─> agent.send()                 │ ✅ Only trigger
│                                     │
│  (waits for event...)               │
│                                     │
│  onUserMessage(event)               │
│    └─> Add event.data to UI         │ ✅ Event-driven
│                                     │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ Server                              │
│                                     │
│  Creates message (ID: s1)           │ ✅ Single source
│  Emits user_message event           │
│  WebSocketReactor forwards          │ ✅ Sent to client
│                                     │
└─────────────────────────────────────┘

Result: Both use (ID: s1) ✅
```

### Benefits of Reactor-Driven Architecture

1. **✅ Pure Presentation Layer**
   - Client UI only renders, never decides
   - All business logic on server
   - Easy to add new client types (mobile, desktop, web)

2. **✅ Single Source of Truth**
   - Server is the only authority
   - Client state always reflects server state
   - No sync issues

3. **✅ Unified ID Management**
   - Server generates all message IDs
   - Consistent across all clients
   - Easier to implement features like "jump to message"

4. **✅ Multi-device Sync Ready**

   ```typescript
   // Device 1: Send message
   await agent.send("你好");

   // Device 2: Automatically receives via WebSocket
   onUserMessage(event) {
     // Same message appears on all devices! ✅
   }
   ```

5. **✅ Consistent Architecture**
   - User messages handled exactly like assistant messages
   - All messages flow through Reactor
   - Predictable, testable, maintainable

6. **✅ Event-Driven = Flux/Redux Pattern**
   ```
   UI Trigger → Action → Server → Event → State Update → UI Render
   ```

### Trade-offs

**Cons**:

- ⚠️ **Network latency** - User sees message after server round-trip (~50-200ms)
- ⚠️ **Loading state needed** - Must show "sending..." feedback

**Mitigation**:

```typescript
const handleSend = async (text: string) => {
  setIsLoading(true); // Show loading indicator
  setOptimisticMessage(text); // Optional: show grayed-out preview

  await agent.send(text);

  // Server will trigger onUserMessage
  // Loading cleared when event arrives
};
```

**Pros outweigh cons** for:

- Multi-user applications
- Multi-device sync
- Offline-first apps (future)
- Audit trails
- Long-term maintainability

### Root Cause of Previous Loop

**IMPORTANT**: The infinite loop was NOT caused by "server echoing user_message"!

**Real root cause**:

1. ✅ **Persistent WebSocket + repeated event listener binding** (Fixed)
2. ❌ ~~Server echoing caused loop~~ (This was NOT the issue)

**Proof**:

- Multiple `addEventListener("message")` on same WebSocket
- Each handler triggered for every message
- Exponential growth: 1, 2, 4, 8, 16... listeners

**Fix**:

```typescript
// Use global single handler + message queues
function setupGlobalMessageHandler(ws: WebSocket) {
  if ((ws as any).__hasGlobalHandler) return; // ✅ Only once

  ws.addEventListener("message", globalHandler);
  (ws as any).__hasGlobalHandler = true;
}
```

**Conclusion**:

> Server can safely send `user_message` back to client, as long as WebSocketDriver doesn't re-trigger send.

### Implementation Plan

**Phase 1: Restore Reactor-Driven Flow** (Recommended for next iteration)

1. **Restore** `onUserMessage` in WebSocketReactor

   ```diff
   // WebSocketReactor.ts
   - // onUserMessage: NOT forwarded
   + onUserMessage: (e, cfg) => sendEvent(cfg.ws, e),  // ✅ Restore
   ```

2. **Remove** local message adding in client

   ```diff
   // Chat.tsx
   const handleSend = async (text: string) => {
   - const userMessage = { ... };
   - setMessages(prev => [...prev, userMessage]);
     await agent.send(text);
   }
   ```

3. **Restore** `onUserMessage` callback in client

   ```diff
   // Chat.tsx
   + onUserMessage(event: UserMessageEvent) {
   +   setMessages(prev => {
   +     if (prev.some(m => m.id === event.data.id)) return prev;
   +     return [...prev, event.data];
   +   });
   + }
   ```

4. **Add** loading states for UX

   ```typescript
   const handleSend = async (text: string) => {
     setIsLoading(true);
     setSendingMessage(text);  // Optional preview
     await agent.send(text);
   };

   onUserMessage(event) {
     setMessages(prev => [...prev, event.data]);
     setIsLoading(false);
     setSendingMessage(null);
   }
   ```

**Phase 2: Enhanced UX** (Future)

- Optimistic UI updates (show grayed-out message immediately)
- Retry on failure
- Offline queue
- Multi-device sync

### Decision Criteria

**Choose Local-First if**:

- ❌ Single-user, single-device only
- ❌ Never need message sync
- ❌ Don't care about consistent IDs
- ❌ Willing to maintain dual state logic

**Choose Reactor-Driven if** (✅ Recommended):

- ✅ Multi-user or multi-device support
- ✅ Need server as source of truth
- ✅ Want consistent architecture
- ✅ Event-driven patterns preferred
- ✅ Long-term maintainability matters

### Recommendation

**Adopt Full Reactor-Driven Architecture** for:

1. **Architectural consistency** - Same pattern for all messages
2. **Future-proofing** - Multi-device sync ready
3. **Simplicity** - UI is pure presentation
4. **Testability** - Clear event flow
5. **Maintainability** - Single source of truth

**Migration**: Can implement in Phase 2, after current bug is stable.

---

## References

- WebSocketReactor: `packages/agentx-framework/src/reactors/WebSocketReactor.ts`
- WebSocketDriver: `packages/agentx-framework/src/drivers/WebSocketDriver.ts`
- Chat Component: `packages/agentx-ui/src/components/chat/Chat.tsx`
- Debug Logs: Terminal output from 2025-11-17 debugging session
- Related Pattern: Flux Architecture (Facebook)
- Related Pattern: Redux Single Source of Truth
