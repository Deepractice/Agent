# Issue 034: Session-Agent Architecture Design

## Background

When implementing `RuntimeAPI`, we need to clarify the relationship between Session and Agent:

- Should Session be created before Agent?
- Should Agent be created before Session?
- How to handle the timing issue of event collection?

## Industry Research

### OpenAI Assistants API

```
Assistant (static definition)
    ↓
Thread (session container, created first)
    ↓
Run (execution within Thread)
```

**Key Points**:

- **Thread before Run** - Create Thread first, then execute Run within Thread
- Thread is a persistent session container storing all messages
- Run is a single execution with state machine pattern (queued → in_progress → completed)
- Recommended **one thread per user**

### LangGraph

```
State (shared state)
    ↓
Agent (execution node)
    ↓
Checkpointer (auto persistence)
```

**Key Points**:

- **State first** - Central state object, all nodes read/write
- Built-in persistence with automatic checkpointing
- No explicit Session concept, uses thread_id to distinguish sessions
- Supports interrupt and resume

### Vercel AI SDK

```
ChatStore (state container)
    ↓
useChat (hook manages lifecycle)
    ↓
Messages (UI/Model separation)
```

**Key Points**:

- **UIMessage vs ModelMessage** separation
- State can be managed externally (Zustand/Redux)
- Chat instance doesn't own state, state managed by external Store

## Options Analysis

| Option                                        | Pros                                                                    | Cons                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **A: Session before Agent**                   | No timing issues; Follows OpenAI pattern; Session can be pre-configured | Slightly complex API; Requires two steps                             |
| **B: Agent before Session**                   | Simple API; Agent is pure                                               | Timing issues; May lose events                                       |
| **C: Create simultaneously, bind internally** | User only cares about Agent; Internal timing handling                   | Complex implementation; Agent and Session coupled                    |
| **D: Externalize state (LangGraph style)**    | Agent completely pure; State can be managed arbitrarily                 | Major architecture change; User needs to understand state management |

## Decision: Option A (OpenAI Style)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  AgentX API Layer (RuntimeAPI)                              │
│                                                             │
│  run(imageId) {                                             │
│    session = createSession(imageId)  // auto create         │
│    agent = createAgent(session)                             │
│    session.collect(agent)            // auto bind           │
│    return agent                      // user gets Agent     │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Agent Layer (pure)                                         │
│                                                             │
│  - receive(message)                                         │
│  - on(handler)                                              │
│  - state                                                    │
│  - Does NOT know about Session                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Session Layer (recording)                                  │
│                                                             │
│  - Listens to Agent events                                  │
│  - Persists messages to Persistence                         │
│  - Provides resume() / fork()                               │
└─────────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Agent is Pure** - Only handles conversation, no recording concern
2. **Session is Transparent** - Handled automatically by outer layer, user can be unaware
3. **API Layer Combines Both** - `run()` encapsulates collaboration between Agent and Session

### User Perspective

```typescript
// Simple usage - one step
const agent = await agentx.runtime.run(imageId);
agent.on("text_delta", (e) => console.log(e.data.text));
await agent.receive("Hello!");
// Session auto-created, auto-recording, user doesn't need to care

// Advanced usage - need to operate Session
const session = await agentx.runtime.createSession(imageId);
const agent = await session.resume();
// ... conversation ...
await session.setTitle("API Design Discussion");
const forked = await session.fork();
```

### Timing Guarantee

```typescript
async run(imageId) {
  // 1. Create Session first (ensure recorder is ready)
  const session = await this.createSession(imageId);

  // 2. Then create Agent
  const agent = this.createAgent(image);

  // 3. Bind collection (Session is ready at this point)
  session.collect(agent);

  // 4. Return
  return agent;
}
```

**Session exists before Agent**, ensuring:

- Session is ready to listen
- Agent is immediately monitored after creation
- No events are lost

## Rationale

1. **OpenAI validated pattern** - Thread → Run has been used at scale
2. **No timing issues** - Agent created only after Session is ready
3. **Agent stays pure** - Doesn't know Session exists
4. **Flexibility** - User can choose `run()` for one-step, or `createSession()` + `resume()` for separate operations

## References

- [OpenAI Assistants API Threads Guide](https://dzone.com/articles/openai-assistants-api-threads-guide)
- [Building LangGraph: Designing an Agent Runtime from first principles](https://blog.langchain.com/building-langgraph/)
- [LangGraph: How to manage conversation history](https://langchain-ai.github.io/langgraphjs/how-tos/manage-conversation-history/)
- [AI SDK 5 - Vercel](https://vercel.com/blog/ai-sdk-5)
- [Vercel AI SDK v5 Internals - State Management](https://dev.to/yigit-konur/vercel-ai-sdk-v5-internals-part-4-decoupling-client-server-state-management-and-message-1lb1)
