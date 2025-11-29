# Issue #001: Session Abstraction Design

**Status**: 📋 Pending
**Priority**: Medium
**Created**: 2025-11-17
**Labels**: `architecture`, `enhancement`, `breaking-change`

---

## Problem

Currently, Agent interface is inconsistent between Client Agent and Server Agent:

### Current Design (Confusing)

```typescript
// Client Agent - has send()
const agent = ClaudeAgent.create({ apiKey });
await agent.initialize();
await agent.send("Hello!"); // ✅ Makes sense

// Server Agent - also has send()?
const server = WebSocketServerAgent.create({ apiKey, ws });
await server.initialize();
await server.send("???"); // ❌ Doesn't make sense - servers don't "send" directly
```

**Issues**:

1. Server Agents don't have direct `send()` - they respond via WebSocket connections
2. No clear Session abstraction - everything is mixed into Agent
3. Client Agent has 1 session, Server Agent has N sessions (one per connection)

---

## Proposed Solution

### Unified Session-based Architecture

```typescript
interface Agent {
  // 1. Initialize
  initialize(): Promise<void>;

  // 2. Session management
  readonly session: Session; // Single session (Client Agent)
  // OR
  getSessions(): Session[]; // Multiple sessions (Server Agent)

  // 3. Cleanup
  destroy(): Promise<void>;
}

interface Session {
  readonly id: string;
  send(message: string): Promise<void>;
  on(event: string, handler: Function): void;
  destroy(): void;
}
```

### Usage Examples

#### Client Agent (Single Session)

```typescript
const agent = ClaudeAgent.create({ apiKey });
await agent.initialize();

const session = agent.session; // SingleSession
await session.send("Hello!");
session.on("assistant_message", (event) => {
  console.log(event.data.content);
});
```

#### Server Agent (Multiple Sessions)

```typescript
const server = WebSocketServerAgent.create({
  apiKey,
  port: 5200, // Server manages its own WebSocket server
});

await server.start(); // or initialize()

// Each WebSocket connection = one Session
server.on("connection", (session) => {
  console.log("New session:", session.id);

  session.on("message", async (msg) => {
    await session.send(msg); // Respond via session
  });

  session.on("close", () => {
    console.log("Session closed:", session.id);
  });
});
```

---

## Benefits

1. **Clear Separation**: Agent (lifecycle) vs Session (communication)
2. **Unified API**: Both client and server use `session.send()`
3. **Multi-session Support**: Server can manage multiple concurrent sessions
4. **Easier Testing**: Mock sessions instead of entire agents

---

## Agent Types Comparison

| Feature  | Client Agent     | Server Agent                      |
| -------- | ---------------- | --------------------------------- |
| Startup  | `initialize()`   | `start()` or `initialize()`       |
| Sessions | 1 session        | N sessions (one per connection)   |
| Sending  | `session.send()` | `session.send()` (per connection) |
| Behavior | Proactive        | Reactive (responds to client)     |

---

## Implementation Notes

### Breaking Changes

- Remove `agent.send()` from Agent interface
- Add `agent.session` or `agent.getSessions()`
- Update all existing agents to use Session abstraction

### Migration Path

1. Add Session interface to `agentx-core`
2. Implement SingleSession for Client Agents
3. Implement MultiSession manager for Server Agents
4. Deprecate direct `agent.send()` with migration guide
5. Update all framework examples and docs

---

## Related

- Current WebSocketServerAgent design requires external `ws` object
- Should WebSocketServerAgent create its own WebSocket server?
- How to handle session lifecycle (timeout, cleanup)?

---

## Discussion

**Key insight from @sean**:

> "我懂了, 这就是 session 的意义, 正常 server 是不会直接 send 的, 是通过 session 去 request response, 那么我们 agent 其实也可以统一成 agent.initialize 后, 有一个 session"

Session is the **universal abstraction** for communication, regardless of agent type.
