# Issue 014: AgentX Client API Design Issues

**Status**: Resolved (P0), Open (P1/P2)
**Priority**: High
**Created**: 2025-11-26
**Updated**: 2025-11-26
**Related**: Issue 013 (Framework Redesign)

## Overview

This issue documents API design problems discovered during agentx-ui integration review. These issues prevent proper frontend integration and violate the original architecture design documented in CLAUDE.md.

## Solution Implemented (P0)

### Core Insight: Client Should Be an Agent

The fundamental solution is that the **Client should use the same `agentx` stack as the Server**. This means:

1. Create an `SSEDriver` that bridges SSE push to async generator pull
2. Use standard `agentx.createAgent()` with `SSEDriver`
3. `AgentEngine` automatically handles event assembly

### New Architecture

```
┌─ Server ───────────────────────────────────────────┐
│  AgentInstance + AgentEngine                        │
│       ↓                                            │
│  SSETransport (forwards Stream Events)             │
└────────────────────────────────────────────────────┘
                    ↓ SSE (Stream Events)
┌─ Client ───────────────────────────────────────────┐
│  AgentInstance + AgentEngine (same as server!)     │
│       │                                            │
│       ├─ SSEDriver receives Stream Events          │
│       ↓                                            │
│  AgentEngine.process() → Assembles events          │
│       ↓                                            │
│  emit: assistant_message, tool_use_message, etc.   │
└────────────────────────────────────────────────────┘
```

### New Client API

```typescript
import { createRemoteAgent } from "@deepractice-ai/agentx/client";

// Simple: Create remote agent
const agent = createRemoteAgent({
  serverUrl: "http://localhost:5200/agentx",
  agentId: "agent_123",
});

// Subscribe to ASSEMBLED events
agent.on((event) => {
  // ✅ assistant_message
  // ✅ tool_use_message
  // ✅ text_delta
  // ✅ error_message
  console.log(event);
});

await agent.receive("Hello!");
```

### Files Changed

- `packages/agentx/src/client/SSEDriver.ts` - New SSE driver
- `packages/agentx/src/client/createRemoteAgent.ts` - Factory function
- `packages/agentx/src/client/AgentXClient.ts` - Updated to use new pattern
- `packages/agentx/src/client/index.ts` - Updated exports
- `packages/agentx/src/client/types.ts` - Cleaned up

---

## Critical Issues (P0) - RESOLVED

### 1. Client Does Not Assemble Message Events - ✅ RESOLVED

**Problem:**
Server only forwards Stream Events (`text_delta`, `tool_call`, etc.) via SSE, but `RemoteAgent` directly emits these raw events without assembling them into Message Events.

**Solution Implemented:**
Client now uses the full `agentx` stack with `SSEDriver`. `AgentEngine.process()` automatically assembles Stream events into Message events.

---

### 2. State Events Not Forwarded - ✅ RESOLVED

**Problem:**
`SSETransport` only forwards Stream events, not State events.

**Solution Implemented:**
Client-side `AgentEngine` derives state from Stream events (via `AgentInstance.updateStateFromEvent()`). No need to forward State events through SSE.

---

## High Priority Issues (P1)

### 3. Error Events Not Handled - ✅ RESOLVED

**Problem:**
SSE event listener doesn't include `error_message` type.

**Solution Implemented:**
`SSEDriver` now includes `error_message` in the event types list. Errors flow through the same `AgentEngine` processing path.

---

### 4. Missing Connection State Change Event - Open

**Problem:**
No way to subscribe to SSE connection state changes (connecting, connected, error, etc.)

**Impact:**

- Frontend cannot reactively update UI when connection state changes

**Note:**
With the new architecture, this is less critical since errors propagate through the event system. However, for better UX (showing connection indicators), we may want to add:

```typescript
agent.onConnectionStateChange?.(handler);
```

This can be addressed in a future iteration.

---

## Medium Priority Issues (P2)

### 5. `receive` Naming Not Intuitive

**Problem:**

```typescript
agent.receive(message); // Sends message TO the Agent
```

From user's perspective, they are "sending" a message, not "receiving" one. The naming is from Agent's viewpoint, not user's.

**Suggestion:**

```typescript
agent.send(message); // More intuitive
// or
agent.chat(message); // Even more friendly
```

---

### 6. `abort()` vs `interrupt()` Distinction Unnecessary for Frontend

**Problem:**

```typescript
abort(): void;     // System/error forced stop
interrupt(): void; // User-initiated stop
```

From UI perspective, user only has one "Stop" button. This distinction exposes internal implementation details.

**Suggestion:**
Expose single method:

```typescript
stop(): void  // or cancel(): void
```

---

### 7. `connect()` Inconsistent Return Type

**Problem:**

```typescript
connect(): void              // Synchronous, no feedback
reconnect(): Promise<void>   // Asynchronous
```

Frontend doesn't know if `connect()` succeeded or failed.

**Suggestion:**

```typescript
connect(): Promise<void>
// or provide callback
connect(options?: { onConnected?: () => void; onError?: (error: Error) => void }): void
```

---

### 8. EventSource Headers Parameter Ignored

**Problem:**

```typescript
// SSEClientTransport.ts
constructor(
  url: string,
  _headers: Record<string, string> = {}, // Note: EventSource doesn't support custom headers
  ...
```

Parameter is accepted but not used. Misleading API.

**Impact:**

- Auth tokens cannot be passed via headers
- API suggests feature that doesn't work

**Solution:**
Either:

1. Remove the parameter and document auth via cookies/URL params
2. Use `fetch` + ReadableStream instead of EventSource (supports headers)

---

### 9. Agent Creation Flow Too Complex

**Current Flow:**

```typescript
const client = new AgentXClient({ baseUrl: "/agentx" });
const created = await client.createAgent({ definition: "claude" });
const agent = await client.connect(created.agentId);
agent.on((event) => ...);
```

**Problem:**

- 4 steps for most common use case
- Need to know `definition` name (coupling to server config)

**Suggestion:**
Provide simplified API for common cases:

```typescript
// One-liner for simple use
const agent = await AgentXClient.quickStart({
  baseUrl: "/agentx",
  // Optional: definition, config
});
```

---

### 10. Message ID Generated on Both Sides

**Problem:**

- Server generates message ID in `createAgentXHandler.ts:356`
- Frontend also generates ID in `Chat.tsx:111`

**Impact:**

- Cannot implement optimistic updates
- Cannot track message lifecycle across client/server

**Solution:**
Either:

1. Client generates ID, server uses it
2. Server echoes back client-generated ID
3. Document the expected behavior

---

## Summary

| Priority | Issue                                  | Status                            |
| -------- | -------------------------------------- | --------------------------------- |
| **P0**   | Client doesn't assemble Message Events | ✅ Resolved                       |
| **P0**   | State Events not forwarded             | ✅ Resolved                       |
| **P1**   | Error Events not handled               | ✅ Resolved                       |
| **P1**   | No connection state subscription       | Open (lower priority now)         |
| **P2**   | `receive` naming                       | Open                              |
| **P2**   | `abort`/`interrupt` distinction        | Open                              |
| **P2**   | `connect()` return type                | N/A (removed RemoteAgent)         |
| **P2**   | Headers param ignored                  | Open (documented limitation)      |
| **P2**   | Complex creation flow                  | ✅ Resolved (`createRemoteAgent`) |
| **P2**   | Duplicate message ID                   | Open                              |

## Next Steps

1. ~~**Immediate (P0)**: Implement client-side event assembly~~ ✅ Done
2. ~~**Short-term (P1)**: Add error events~~ ✅ Done
3. **Future**: Connection state subscription, API naming improvements

## References

- CLAUDE.md: Cross-platform Architecture section
- packages/agentx/src/client/SSEDriver.ts - New driver implementation
- packages/agentx/src/client/createRemoteAgent.ts - Factory function
- packages/agentx/src/client/AgentXClient.ts - Updated client
