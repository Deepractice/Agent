# Issue 015: AgentX Frontend Developer Experience Improvements

**Status**: Open
**Priority**: High
**Created**: 2025-11-27
**Related**: Issue 014 (Client API Issues)

## Overview

This issue documents frontend developer experience (DX) improvements needed for the new `@deepractice-ai/agentx` API. While the architecture is well-designed, the current API is optimized for "library developers" rather than "application developers".

The goal is to make frontend integration as simple as:

```typescript
const { messages, streaming, send } = useAgent(definition, config);
```

Instead of the current verbose pattern:

```typescript
const agentx = createAgentX();
const def = agentx.agents.define({...});
const agent = agentx.agents.create(def, {});
const unsub1 = agent.on("text_delta", ...);
const unsub2 = agent.on("assistant_message", ...);
// ... more subscriptions and state management
```

---

## Critical Issues (P0)

### 1. Event Subscription Lacks Type Safety

**Problem:**

```typescript
agent.on("text_delta", (event) => {
  // event type is AgentOutput, not TextDeltaEvent
  // Manual assertion required
  const e = event as TextDeltaEvent;
  setStreaming((prev) => prev + e.data.text);
});
```

TypeScript cannot infer the specific event type from the string literal.

**Expected:**

```typescript
agent.on("text_delta", (event) => {
  // event is automatically typed as TextDeltaEvent
  setStreaming((prev) => prev + event.data.text);
});
```

**Solution:**
Add generic overloads to the `on` method:

```typescript
// In Agent interface (agentx-types)
interface Agent {
  // Type-safe overloads
  on(type: "text_delta", handler: (event: TextDeltaEvent) => void): Unsubscribe;
  on(type: "assistant_message", handler: (event: AssistantMessageEvent) => void): Unsubscribe;
  on(type: "tool_use_message", handler: (event: ToolUseMessageEvent) => void): Unsubscribe;
  on(type: "error_message", handler: (event: ErrorMessageEvent) => void): Unsubscribe;
  on(type: "message_start", handler: (event: MessageStartEvent) => void): Unsubscribe;
  on(type: "message_stop", handler: (event: MessageStopEvent) => void): Unsubscribe;
  // ... other event types

  // Fallback for custom/unknown types
  on(type: string, handler: AgentEventHandler): Unsubscribe;
  on(types: string[], handler: AgentEventHandler): Unsubscribe;
  on(handler: AgentEventHandler): Unsubscribe;
}
```

**Files to Change:**

- `packages/agentx-types/src/agent/Agent.ts`
- `packages/agentx-core/src/agent/AgentInstance.ts`

---

### 2. No State Change Subscription

**Problem:**

```typescript
// Current: only synchronous getter
const status = agent.state; // Returns current value

// Frontend needs reactive updates
// No way to subscribe to state changes
```

Frontend needs to display agent status (thinking, responding, idle, etc.) reactively.

**Current Workaround:**

```typescript
// Infer state from events - fragile and incomplete
agent.on("message_start", () => setStatus("responding"));
agent.on("message_stop", () => setStatus("idle"));
agent.on("tool_call", () => setStatus("awaiting_tool_result"));
// Easy to miss states, duplicates internal logic
```

**Expected:**

```typescript
agent.onStateChange((state: AgentState) => {
  setStatus(state);
});
```

**Solution:**
Add `onStateChange` method to Agent interface:

```typescript
// In Agent interface
interface Agent {
  // Existing
  readonly state: AgentState;

  // New
  onStateChange(handler: (state: AgentState) => void): Unsubscribe;
}
```

**Implementation:**

```typescript
// In AgentInstance
private readonly stateChangeHandlers: Set<(state: AgentState) => void> = new Set();

onStateChange(handler: (state: AgentState) => void): Unsubscribe {
  this.stateChangeHandlers.add(handler);
  return () => this.stateChangeHandlers.delete(handler);
}

// In updateStateFromEvent(), add:
private updateStateFromEvent(event: AgentOutput): void {
  const oldState = this._state;
  // ... existing state update logic ...

  if (this._state !== oldState) {
    for (const handler of this.stateChangeHandlers) {
      handler(this._state);
    }
  }
}
```

**Files to Change:**

- `packages/agentx-types/src/agent/Agent.ts`
- `packages/agentx-core/src/agent/AgentInstance.ts`

---

## High Priority Issues (P1)

### 3. Subscription Management is Verbose

**Problem:**

```typescript
useEffect(() => {
  const unsub1 = agent.on("text_delta", handleDelta);
  const unsub2 = agent.on("assistant_message", handleMessage);
  const unsub3 = agent.on("tool_use_message", handleTool);
  const unsub4 = agent.on("error_message", handleError);

  return () => {
    unsub1();
    unsub2();
    unsub3();
    unsub4();
  };
}, [agent]);
```

Every frontend project repeats this boilerplate.

**Expected:**

```typescript
// Option A: Object-based subscription
const unsub = agent.on({
  text_delta: handleDelta,
  assistant_message: handleMessage,
  tool_use_message: handleTool,
  error_message: handleError,
});

return () => unsub();

// Option B: React hook (see P1-4)
const { messages, streaming } = useAgentEvents(agent);
```

**Solution A - Batch Subscription:**

```typescript
// In Agent interface
interface EventHandlerMap {
  text_delta?: (event: TextDeltaEvent) => void;
  assistant_message?: (event: AssistantMessageEvent) => void;
  tool_use_message?: (event: ToolUseMessageEvent) => void;
  error_message?: (event: ErrorMessageEvent) => void;
  // ... other events
}

interface Agent {
  on(handlers: EventHandlerMap): Unsubscribe;
}
```

**Files to Change:**

- `packages/agentx-types/src/agent/Agent.ts`
- `packages/agentx-core/src/agent/AgentInstance.ts`

---

### 4. Missing React Hooks Package

**Problem:**
Every React project using agentx must implement:

1. State management for messages, streaming, errors
2. Event subscription and cleanup
3. Agent lifecycle management

This is ~50-100 lines of boilerplate per project.

**Expected:**

```typescript
// @deepractice-ai/agentx-react

import { useAgentX, useAgent } from "@deepractice-ai/agentx-react";

function ChatPage() {
  // Hook manages all state and subscriptions
  const {
    agent,
    messages,
    streaming,
    status,
    errors,
    send,
    interrupt,
    isLoading
  } = useAgent(definition, config);

  return (
    <div>
      {messages.map(m => <Message key={m.id} {...m} />)}
      {streaming && <StreamingMessage text={streaming} />}
      <Input onSend={send} disabled={isLoading} />
    </div>
  );
}
```

**Solution:**
Create new package `@deepractice-ai/agentx-react`:

```typescript
// packages/agentx-react/src/index.ts

export function useAgentX(options?: AgentXOptions): AgentX {
  const [agentx] = useState(() => createAgentX(options));
  useEffect(() => {
    return () => {
      agentx.agents.destroyAll();
    };
  }, []);
  return agentx;
}

export interface UseAgentResult {
  agent: Agent | null;
  messages: Message[];
  streaming: string;
  status: AgentState;
  errors: ErrorMessage[];
  send: (text: string) => Promise<void>;
  interrupt: () => void;
  isLoading: boolean;
}

export function useAgent(
  agentx: AgentX,
  definition: AgentDefinition,
  config: Record<string, unknown>
): UseAgentResult {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState("");
  const [status, setStatus] = useState<AgentState>("idle");
  const [errors, setErrors] = useState<ErrorMessage[]>([]);

  useEffect(() => {
    const newAgent = agentx.agents.create(definition, config);
    setAgent(newAgent);

    const unsub = newAgent.on({
      text_delta: (e) => setStreaming((prev) => prev + e.data.text),
      assistant_message: (e) => {
        setStreaming("");
        setMessages((prev) => [...prev, e.data]);
      },
      tool_use_message: (e) => setMessages((prev) => [...prev, e.data]),
      error_message: (e) => {
        setStreaming("");
        setErrors((prev) => [...prev, e.data]);
      },
    });

    const unsubState = newAgent.onStateChange(setStatus);

    return () => {
      unsub();
      unsubState();
      newAgent.destroy();
    };
  }, [agentx, definition, config]);

  const send = useCallback(
    async (text: string) => {
      if (!agent) return;
      setErrors([]);
      const userMsg = {
        id: `msg_${Date.now()}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      await agent.receive(text);
    },
    [agent]
  );

  const interrupt = useCallback(() => {
    agent?.interrupt();
  }, [agent]);

  return {
    agent,
    messages,
    streaming,
    status,
    errors,
    send,
    interrupt,
    isLoading: status === "responding" || status === "awaiting_tool_result",
  };
}
```

**Files to Create:**

- `packages/agentx-react/package.json`
- `packages/agentx-react/src/index.ts`
- `packages/agentx-react/src/useAgentX.ts`
- `packages/agentx-react/src/useAgent.ts`
- `packages/agentx-react/src/useSession.ts`
- `packages/agentx-react/src/AgentXProvider.tsx`

---

## Medium Priority Issues (P2)

### 5. `receive()` Semantics Unclear for Frontend

**Problem:**

```typescript
await agent.receive(text);
```

Questions from frontend developer:

1. When does this Promise resolve? After all events emitted?
2. Error thrown here AND via `error_message` event - double handling?
3. Should I await this, or is fire-and-forget okay?

**Current Behavior:**

- Resolves when entire response completes
- Throws if error occurs (also emits error_message)
- Blocks until done

**Frontend Expectation:**
Usually want fire-and-forget: send message, update UI via events.

**Suggestion:**

```typescript
interface Agent {
  // Existing - blocking, for advanced use
  receive(message: string | UserMessage): Promise<void>;

  // New - fire-and-forget, errors only via events
  send(message: string | UserMessage): void;
}
```

**Implementation:**

```typescript
send(message: string | UserMessage): void {
  this.receive(message).catch(() => {
    // Error already emitted via error_message event
    // Swallow to prevent unhandled rejection
  });
}
```

**Files to Change:**

- `packages/agentx-types/src/agent/Agent.ts`
- `packages/agentx-core/src/agent/AgentInstance.ts`

---

### 6. Session Has No Practical Functionality

**Problem:**

```typescript
interface Session {
  sessionId: string;
  agentId: string;
  createdAt: number;
}
```

Session is just an ID container. No actual functionality.

**Frontend Questions:**

- How to associate messages with a session?
- How to restore conversation from a session?
- How to switch between sessions?
- Where is message history stored?

**Expected:**

```typescript
interface Session {
  sessionId: string;
  agentId: string;
  createdAt: number;

  // Functionality
  messages: Message[];
  send(text: string): Promise<void>;
  loadHistory(): Promise<Message[]>;
}
```

**Note:** This requires broader architectural decisions about persistence and may be out of scope for immediate iteration.

**Suggested Approach:**

1. Document current Session limitations
2. Plan Session v2 with message history support
3. Consider integration with persistence layer

---

## Summary

| Priority | Issue                           | Impact | Effort |
| -------- | ------------------------------- | ------ | ------ |
| **P0**   | Type-safe event subscription    | High   | Low    |
| **P0**   | State change subscription       | High   | Low    |
| **P1**   | Batch subscription API          | Medium | Low    |
| **P1**   | React Hooks package             | High   | Medium |
| **P2**   | `send()` fire-and-forget method | Medium | Low    |
| **P2**   | Session functionality           | High   | High   |

---

## Implementation Plan

### Phase 1: Core API Improvements (P0)

1. Add type-safe `on()` overloads
2. Add `onStateChange()` method
3. Update AgentInstance implementation

### Phase 2: Developer Experience (P1)

4. Add batch subscription `on(handlers)`
5. Create `@deepractice-ai/agentx-react` package

### Phase 3: Convenience (P2)

6. Add `send()` method
7. Document Session roadmap

---

## References

- Issue 014: Client API Issues
- `packages/agentx-types/src/agent/Agent.ts` - Agent interface
- `packages/agentx-core/src/agent/AgentInstance.ts` - Implementation
- `packages/agentx-ui/src/components/chat/Chat.tsx` - Current frontend usage
