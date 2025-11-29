# AgentX Engine Architecture

This document describes the internal architecture and design decisions of the AgentX Engine.

## Design Philosophy

### Stateless by Design

AgentX Engine is **completely stateless**. This is a deliberate architectural choice that enables:

1. **Horizontal Scaling** - Multiple Engine instances can share the same database
2. **Request Isolation** - Each `receive()` call is independent
3. **Simple Recovery** - No state to recover on crash

```
┌─────────────────────────────────────────────────────────────────────┐
│  Traditional Stateful Design (NOT used)                             │
│                                                                     │
│  Engine {                                                           │
│    state: Map<agentId, State>  ← State stored in memory            │
│  }                                                                  │
│                                                                     │
│  Problem: Cannot scale horizontally, state lost on crash           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  AgentX Stateless Design (used)                                     │
│                                                                     │
│  Engine {                                                           │
│    driver: Driver           ← Configuration, not state             │
│    presenters: Presenter[]  ← Configuration, not state             │
│  }                                                                  │
│                                                                     │
│  receive(agentId, message) {                                       │
│    let state = createInitialState()  ← Local variable!             │
│    for (event of driver(message)) {                                │
│      state = process(state, event)   ← Updated locally             │
│    }                                                                │
│    // state discarded                                               │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### State Classification

| State Type           | Lifetime             | Storage                  | Example                               |
| -------------------- | -------------------- | ------------------------ | ------------------------------------- |
| **Processing State** | Single `receive()`   | Local variable           | `pendingContents`, `currentMessageId` |
| **Business State**   | Persistent           | Database (via Presenter) | Messages, Statistics                  |
| **Configuration**    | Application lifetime | Engine fields            | Driver, Presenters                    |

## Core Components

### 1. AgentEngine

The runtime that orchestrates everything.

```
┌─────────────────────────────────────────────────────────────────────┐
│  AgentEngine                                                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Configuration (immutable)                                   │   │
│  │  - driver: Driver                                           │   │
│  │  - presenters: Presenter[]                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  receive(agentId, message)                                         │
│    │                                                                │
│    ├─→ let state = createInitialState()  // Local!                │
│    │                                                                │
│    ├─→ for await (event of driver(message))                       │
│    │     │                                                          │
│    │     ├─→ present(agentId, event)      // Pass-through         │
│    │     │                                                          │
│    │     ├─→ [state, outputs] = processor(state, event)           │
│    │     │                                                          │
│    │     └─→ for (output of outputs)                              │
│    │           ├─→ present(agentId, output)                       │
│    │           └─→ processReinjected(agentId, state, output)      │
│    │                                                                │
│    └─→ // state discarded                                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Driver

Input adapter that connects to AI SDKs.

```
Driver: (UserMessage) → AsyncIterable<StreamEvent>

┌─────────────────────────────────────────────────────────────────────┐
│  Driver Flow                                                        │
│                                                                     │
│  UserMessage { role: "user", content: "Hello" }                    │
│       │                                                             │
│       ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Driver (async generator)                                    │   │
│  │                                                              │   │
│  │  async function* (message) {                                │   │
│  │    // Call AI SDK                                           │   │
│  │    const stream = await sdk.stream(message);                │   │
│  │                                                              │   │
│  │    // Transform and yield events                            │   │
│  │    for await (const chunk of stream) {                      │   │
│  │      yield transformToStreamEvent(chunk);                   │   │
│  │    }                                                         │   │
│  │  }                                                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│       │                                                             │
│       ▼                                                             │
│  StreamEvents: message_start, text_delta, ..., message_stop        │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Processor (AgentProcessor)

Pure Mealy Machine that transforms events.

```
Processor: (State, Input) → [State, Outputs[]]

┌─────────────────────────────────────────────────────────────────────┐
│  AgentProcessor (Combined)                                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  MessageAssembler                                             │  │
│  │  - Accumulates text_delta → assistant_message                │  │
│  │  - Accumulates tool events → tool_use_message                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  StateMachine                                                 │  │
│  │  - message_start → conversation_start                        │  │
│  │  - text_block_start → conversation_responding                │  │
│  │  - message_stop → conversation_end                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  TurnTracker                                                  │  │
│  │  - Tracks turn start/end                                     │  │
│  │  - Calculates cost, tokens, duration                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Input: StreamEvent | MessageEvent (re-injected)                   │
│  Output: MessageEvent | StateEvent | TurnEvent                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4. Presenter

Output adapter that handles events.

```
Presenter: (agentId, event) → void

┌─────────────────────────────────────────────────────────────────────┐
│  Presenter Types                                                    │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Raw Presenter                                              │    │
│  │  type Presenter = (agentId, event) => void                 │    │
│  │  - Receives ALL events                                      │    │
│  │  - Manual filtering required                                │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Typed Presenters (helpers)                                 │    │
│  │                                                             │    │
│  │  createStreamPresenter(handler)                            │    │
│  │    - Only receives: message_start, text_delta, etc.        │    │
│  │                                                             │    │
│  │  createMessagePresenter(handler)                           │    │
│  │    - Only receives: assistant_message, tool_use_message    │    │
│  │                                                             │    │
│  │  createStatePresenter(handler)                             │    │
│  │    - Only receives: conversation_start, etc.               │    │
│  │                                                             │    │
│  │  createTurnPresenter(handler)                              │    │
│  │    - Only receives: turn_response                          │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Event Flow

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  engine.receive("agent_123", userMessage)                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. Driver produces StreamEvents                                    │
│                                                                     │
│  message_start → text_delta → text_delta → ... → message_stop      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ For each StreamEvent:
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. Pass-through to Presenters                                      │
│                                                                     │
│  StreamPresenter receives: message_start, text_delta, etc.         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. Processor transforms events                                     │
│                                                                     │
│  [newState, outputs] = agentProcessor(state, streamEvent)          │
│                                                                     │
│  Example outputs:                                                   │
│  - message_stop → [assistant_message, conversation_end]            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ For each output:
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. Present outputs                                                 │
│                                                                     │
│  MessagePresenter receives: assistant_message                      │
│  StatePresenter receives: conversation_end                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. Re-inject outputs                                               │
│                                                                     │
│  processReinjected(agentId, state, assistant_message)              │
│                                                                     │
│  This allows TurnTracker to see MessageEvents                      │
│  (TurnTracker listens to assistant_message)                        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6. Recursive processing stops when no more outputs                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Event Layering

```
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 1: Stream (from Driver)                                      │
│                                                                     │
│  message_start → text_delta → text_delta → message_stop            │
│       │              │              │            │                  │
└───────┼──────────────┼──────────────┼────────────┼──────────────────┘
        │              │              │            │
        │              │              │            │  Accumulate
        ▼              ▼              ▼            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 2: Message (assembled)                                       │
│                                                                     │
│                    assistant_message (complete text)                │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               │  Re-inject
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 3: State (transitions)                                       │
│                                                                     │
│  conversation_start → conversation_responding → conversation_end   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Layer 4: Turn (analytics)                                          │
│                                                                     │
│                         turn_response                               │
│                    (cost, tokens, duration)                         │
└─────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── index.ts                    # Public exports
├── AgentEngine.ts              # Main runtime class
├── AgentProcessor.ts           # Combined processor
├── Driver.ts                   # Driver type definition
├── Presenter.ts                # Presenter types and helpers
│
└── internal/                   # Internal processors
    ├── index.ts
    ├── messageAssemblerProcessor.ts
    ├── stateMachineProcessor.ts
    └── turnTrackerProcessor.ts
```

## Key Design Decisions

### 1. Why Stateless?

**Problem**: Traditional stateful engines store agent state in memory.

```typescript
// Stateful (problematic)
class Engine {
  private states = new Map<string, State>();

  process(agentId, event) {
    const state = this.states.get(agentId);
    // ...
  }
}
```

**Issues**:

- Cannot scale horizontally (state not shared)
- State lost on crash
- Memory grows with active agents

**Solution**: State as local variable.

```typescript
// Stateless (AgentX approach)
class AgentEngine {
  async receive(agentId, message) {
    let state = createInitialState(); // Local!
    for await (const event of this.driver(message)) {
      state = this.process(state, event);
    }
    // state discarded, business data persisted by Presenters
  }
}
```

### 2. Why Re-injection?

**Problem**: TurnTracker needs MessageEvents, but it only sees StreamEvents.

```
StreamEvent ──→ TurnTracker ──→ ???
                    │
              Can't see assistant_message!
```

**Solution**: Re-inject Processor outputs back into the system.

```
StreamEvent ──→ Processor ──→ assistant_message
                                    │
                                    ▼ Re-inject
                              TurnTracker ──→ turn_response
```

### 3. Why Typed Presenters?

**Problem**: Handling different event types requires boilerplate.

```typescript
// Without typed presenters
const presenter = (agentId, event) => {
  if (event.type === "assistant_message" || event.type === "tool_use_message") {
    // Handle message
  }
};
```

**Solution**: Helper functions that filter automatically.

```typescript
// With typed presenters
const presenter = createMessagePresenter((agentId, event) => {
  // event is already MessageEventType, fully typed
  saveMessage(agentId, event.data);
});
```

### 4. Why Single Event (not Batch)?

**Problem**: Mealy pattern produces `outputs[]` array.

**Decision**: Presenter receives single events, not arrays.

```typescript
// NOT: presenter(agentId, outputs[])
// YES: presenter(agentId, output)  // Called for each output
```

**Reasons**:

- Simpler Presenter implementation
- Enables re-injection per event
- More natural event-driven model

## Mealy Machine Foundation

AgentX Engine is built on the Mealy Machine pattern from `@deepractice-ai/agentx-mealy`.

```
Mealy Machine: (state, input) => [newState, outputs]

Key Insight: Unlike Redux where state is the goal,
             in Mealy Machine outputs are the goal.
             State is just a means to produce outputs.

┌─────────────────────────────────────────────────────────────────────┐
│  Redux Pattern                                                      │
│  (state, action) => state                                          │
│                                                                     │
│  State IS the goal                                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Mealy Pattern (AgentX)                                             │
│  (state, input) => [state, outputs]                                │
│                                                                     │
│  Outputs ARE the goal, state is accumulator                        │
└─────────────────────────────────────────────────────────────────────┘
```

## Horizontal Scaling Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Load Balancer                               │
│                    (Any routing strategy)                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Engine A      │ │   Engine B      │ │   Engine C      │
│                 │ │                 │ │                 │
│ driver: claude  │ │ driver: claude  │ │ driver: claude  │
│ presenters: ... │ │ presenters: ... │ │ presenters: ... │
│                 │ │                 │ │                 │
│ NO STATE!       │ │ NO STATE!       │ │ NO STATE!       │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Database                                    │
│                                                                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │  SessionStore   │ │   StateStore    │ │ StatisticsStore │       │
│  │  (Messages)     │ │  (AgentState)   │ │ (Cost/Tokens)   │       │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘       │
│                                                                     │
│  Data persisted by Presenters, not Engine                          │
└─────────────────────────────────────────────────────────────────────┘
```

**Constraint**: A single `receive()` call must complete on one Engine instance (Claude API stream is bound to the process). Different requests for the same agentId can go to different Engines.
