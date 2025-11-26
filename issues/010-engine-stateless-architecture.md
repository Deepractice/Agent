# Issue 010: Engine Stateless Architecture with Mealy Machine Pattern

**Status**: In Progress
**Priority**: Critical
**Created**: 2025-01-25
**Updated**: 2025-01-25
**Related**: Issue 009 (predecessor, foundation completed)

## Overview

This issue documents the complete stateless architecture design for `agentx-engine` package using the **Mealy Machine Pattern** - a classic automata theory pattern perfectly suited for stateless event processing.

## Why Mealy Machine?

### The Pattern Match

A **Mealy Machine** is a finite-state machine where outputs depend on both the current state AND the input:

```
Mealy Machine: (state, input) => (state, output)
```

This is **exactly** our pattern:

```typescript
type Processor<TState, TInput, TOutput> = (
  state: Readonly<TState>,
  input: TInput
) => [TState, TOutput[]];
```

### Key Insight: State is Means, Output is Goal

Unlike Redux reducers where state is the goal:

```
Redux:  (state, action) => state    // state IS the goal
```

In Mealy Machine, state is just a means to produce outputs:

```
Mealy:  (state, input) => (state, output)   // output IS the goal, state is accumulator
```

This distinction is crucial for AI agent event processing where we care about emitting events (outputs), not just updating state.

### Industry Comparison

| System            | Pattern        | Signature                               | State Role |
| ----------------- | -------------- | --------------------------------------- | ---------- |
| Redux/Elm         | Reducer        | `(state, action) => state`              | Goal       |
| Kafka Streams     | Processor      | `(state, event) => state`               | Goal       |
| **Mealy Machine** | **Transition** | **`(state, input) => (state, output)`** | **Means**  |
| Our Processor     | Transition     | `(state, input) => [state, outputs]`    | Means      |

## Architecture Design

### Core Package: `@deepractice-ai/agentx-mealy`

A standalone functional Mealy Machine framework with these components:

| Component     | Role                           | Side Effects  |
| ------------- | ------------------------------ | ------------- |
| **Source**    | Input adapter                  | Yes (I/O)     |
| **Processor** | Pure Mealy transition function | No (pure)     |
| **Sink**      | Output adapter                 | Yes (I/O)     |
| **Store**     | State persistence              | Yes (storage) |

### Complete Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    agentx-mealy (Pure Functions)                     │
│                                                                      │
│  Source (input, side effects)                                       │
│      ↓                                                              │
│  Processor (state, input) => [newState, outputs]  (pure function)   │
│      ↓                                                              │
│  Sink (output, side effects)                                        │
│                                                                      │
│  Store ←→ Mealy Runtime (manages state externally)                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               │ Used by
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    agentx-engine (Processors)                        │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                      Processors                             │    │
│  │                                                             │    │
│  │  messageAssemblerProcessor: Processor<MsgState, Stream, Msg>│    │
│  │  stateMachineProcessor:     Processor<SMState, Stream, State>│   │
│  │  turnTrackerProcessor:      Processor<TurnState, Msg, Turn> │    │
│  │                                                             │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                   Processor Combinators                     │    │
│  │                                                             │    │
│  │  combineProcessors({ msg, state, turn })                   │    │
│  │  chainProcessors(streamProcessor, messageProcessor)        │    │
│  │                                                             │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               │ Used by
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    agentx-core (Runtime + State)                     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    Mealy Runtime                            │    │
│  │                                                             │    │
│  │  const mealy = createMealy({                               │    │
│  │    processor: engineProcessor,                             │    │
│  │    store: new MemoryStore(),  // or RedisStore             │    │
│  │    initialState,                                           │    │
│  │    sinks: [sseSink, logSink],                              │    │
│  │  });                                                        │    │
│  │                                                             │    │
│  │  mealy.process(agentId, event);                            │    │
│  │                                                             │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Core Types (agentx-mealy)

### Processor - Pure Mealy Transition Function

```typescript
/**
 * Processor - Core pure function type for Mealy Machine
 *
 * Pattern: (state, input) => [newState, outputs]
 *
 * Key properties:
 * - Pure function (no side effects)
 * - Deterministic (same input → same output)
 * - State is a means (accumulator), outputs are the goal
 */
type Processor<TState, TInput, TOutput> = (
  state: Readonly<TState>,
  input: TInput
) => [TState, TOutput[]];
```

### Source - Input Adapter

```typescript
/**
 * Source - Input interface with side effects
 */
interface Source<TInput, TOutput> {
  name: string;
  receive(input: TInput): AsyncIterable<TOutput>;
  abort?(): void;
  destroy?(): Promise<void>;
}
```

### Sink - Output Adapter

```typescript
/**
 * Sink - Output interface with side effects
 */
interface Sink<TInput> {
  name: string;
  filter?(output: TInput): boolean;
  write(output: TInput): void | Promise<void>;
  destroy?(): Promise<void>;
}
```

### Store - State Persistence

```typescript
/**
 * Store - State storage interface
 */
interface Store<T> {
  get(id: string): T | undefined;
  set(id: string, state: T): void;
  delete(id: string): void;
  has(id: string): boolean;
}

// In-memory implementation
class MemoryStore<T> implements Store<T> {
  private states = new Map<string, T>();
  // ...
}
```

### Mealy Runtime

```typescript
/**
 * Mealy - The runtime that orchestrates everything
 */
const mealy = createMealy({
  processor: myProcessor,
  store: new MemoryStore(),
  initialState: { count: 0 },
  sinks: [logSink],
});

// Process input through the Mealy Machine
mealy.process("agent_123", event);
```

## Detailed Design for agentx-engine

### 1. State Types

```typescript
// packages/agentx-engine/src/state/MessageAssemblerState.ts
export interface PendingContent {
  type: "text" | "tool_use";
  index: number;
  textDeltas?: string[];
  toolId?: string;
  toolName?: string;
  toolInputJson?: string;
}

export interface MessageAssemblerState {
  pendingContents: Map<number, PendingContent>;
  currentMessageId: string | null;
  messageStartTime: number | null;
}

export const initialMessageAssemblerState: MessageAssemblerState = {
  pendingContents: new Map(),
  currentMessageId: null,
  messageStartTime: null,
};
```

```typescript
// packages/agentx-engine/src/state/EngineState.ts
export interface EngineState {
  messageAssembler: MessageAssemblerState;
  stateMachine: StateMachineState;
  turnTracker: TurnTrackerState;
}

export const initialEngineState: EngineState = {
  messageAssembler: initialMessageAssemblerState,
  stateMachine: initialStateMachineState,
  turnTracker: initialTurnTrackerState,
};
```

### 2. Processors

```typescript
// packages/agentx-engine/src/processors/messageAssemblerProcessor.ts
import type { Processor } from "@deepractice-ai/agentx-mealy";

export const messageAssemblerProcessor: Processor<
  MessageAssemblerState,
  StreamEventType,
  MessageEventType
> = (state, input) => {
  switch (input.type) {
    case "message_start": {
      return [
        {
          ...state,
          currentMessageId: generateId(),
          messageStartTime: input.timestamp,
          pendingContents: new Map(),
        },
        [],
      ];
    }

    case "text_delta": {
      const newContents = new Map(state.pendingContents);
      const pending = newContents.get(0) || { type: "text", index: 0, textDeltas: [] };
      pending.textDeltas = [...(pending.textDeltas || []), input.data.text];
      newContents.set(0, pending);
      return [{ ...state, pendingContents: newContents }, []];
    }

    case "message_stop": {
      const content = assembleContent(state.pendingContents);
      if (!content.trim()) {
        return [initialMessageAssemblerState, []];
      }

      const assistantMessage: AssistantMessageEvent = {
        type: "assistant_message",
        // ...
      };

      // State resets, OUTPUT is the goal!
      return [initialMessageAssemblerState, [assistantMessage]];
    }

    default:
      return [state, []];
  }
};
```

### 3. Processor Combinators

```typescript
// packages/agentx-engine/src/processors/engineProcessor.ts
import { combineProcessors } from "@deepractice-ai/agentx-mealy";

export const engineProcessor = combineProcessors({
  messageAssembler: messageAssemblerProcessor,
  stateMachine: stateMachineProcessor,
  turnTracker: turnTrackerProcessor,
});
```

## Event Flow

```
User sends message
        │
        ▼
┌───────────────────┐
│ user_message      │ (Input)
└───────┬───────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│                      Mealy.process()                           │
│                                                                │
│   state = store.get(agentId)                                  │
│   [newState, outputs] = processor(state, input)  // PURE!     │
│   store.set(agentId, newState)                                │
│   outputs.forEach(o => sink.write(o))                         │
│   outputs.forEach(o => mealy.process(agentId, o))  // recurse │
│                                                                │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│                      engineProcessor (pure)                    │
│                                                                │
│   messageAssemblerProcessor(state.msg, input)                 │
│       → [newMsgState, []]                                     │
│                                                                │
│   stateMachineProcessor(state.sm, input)                      │
│       → [newSmState, [conversation_start]]   // OUTPUT!       │
│                                                                │
│   turnTrackerProcessor(state.turn, input)                     │
│       → [newTurnState, [turn_request]]       // OUTPUT!       │
│                                                                │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
   Outputs: [conversation_start, turn_request]
        │
        ▼ (recursive process + sink.write)
   ... continue processing ...
```

## Migration Plan

### Phase 1: agentx-mealy Package (COMPLETED)

- [x] Create `@deepractice-ai/agentx-mealy` package
- [x] Define `Processor` type (Mealy transition function)
- [x] Define `Source`, `Sink`, `Store` interfaces
- [x] Implement `MemoryStore`
- [x] Implement `Mealy` runtime class
- [x] Implement combinators (`combineProcessors`, `chainProcessors`, etc.)

### Phase 2: Engine Processors

1. [ ] Add agentx-mealy dependency to agentx-engine
2. [ ] Create state type definitions
3. [ ] Implement `messageAssemblerProcessor`
4. [ ] Implement `stateMachineProcessor`
5. [ ] Implement `turnTrackerProcessor`
6. [ ] Create `engineProcessor` using `combineProcessors`
7. [ ] Unit tests for each processor

### Phase 3: Integration

1. [ ] Integrate Mealy runtime with AgentService in agentx-core
2. [ ] Create Sinks for SSE, logging, etc.
3. [ ] Remove old Reactor classes
4. [ ] Integration tests

### Phase 4: Cleanup & Optimization

1. [ ] Remove old Reactor code from agentx-engine
2. [ ] Update documentation
3. [ ] Performance benchmarks
4. [ ] Memory usage comparison

## Files Structure

### agentx-mealy (COMPLETED)

```
packages/agentx-mealy/
├── src/
│   ├── Processor.ts      # Core Mealy transition function type
│   ├── Source.ts         # Input adapter interface
│   ├── Sink.ts           # Output adapter interface
│   ├── Store.ts          # State storage + MemoryStore
│   ├── Mealy.ts          # Runtime orchestrator
│   ├── combinators.ts    # Function combinators
│   └── index.ts          # Exports
├── package.json
└── tsconfig.json
```

### agentx-engine (TODO)

```
packages/agentx-engine/
├── src/
│   ├── state/
│   │   ├── MessageAssemblerState.ts
│   │   ├── StateMachineState.ts
│   │   ├── TurnTrackerState.ts
│   │   ├── EngineState.ts
│   │   └── index.ts
│   ├── processors/
│   │   ├── messageAssemblerProcessor.ts
│   │   ├── stateMachineProcessor.ts
│   │   ├── turnTrackerProcessor.ts
│   │   ├── engineProcessor.ts
│   │   └── index.ts
│   └── index.ts
└── package.json
```

## Benefits

### 1. True Stateless Engine

```
Before: engine holds state internally (Reactor pattern)
After:  engine is pure functions, state is external (Mealy pattern)
```

### 2. Easy Testing

```typescript
// Pure functions are trivial to test
test('text_delta accumulates text', () => {
  const state = initialMessageAssemblerState;
  const input = { type: 'text_delta', data: { text: 'hello' } };

  const [newState, outputs] = messageAssemblerProcessor(state, input);

  expect(newState.pendingContents.get(0).textDeltas).toEqual(['hello']);
  expect(outputs).toEqual([]);  // No output yet, accumulating
});

test('message_stop emits assistant_message', () => {
  const state = { ...initialState, pendingContents: /* with text */ };
  const input = { type: 'message_stop' };

  const [newState, outputs] = messageAssemblerProcessor(state, input);

  expect(newState).toEqual(initialMessageAssemblerState);  // Reset
  expect(outputs[0].type).toBe('assistant_message');  // OUTPUT is the goal!
});
```

### 3. Memory Efficiency

```
Before: 1000 sessions = 1000 × Reactor instances = ~5GB
After:  1000 sessions = 1000 × state objects = ~100MB
        (Processors are shared pure functions, only data is per-session)
```

### 4. Horizontal Scaling Ready

```typescript
// State can be stored externally
class RedisStore<T> implements Store<T> {
  async get(id: string): Promise<T | undefined> {
    const data = await this.redis.get(id);
    return data ? JSON.parse(data) : undefined;
  }
  // ...
}
```

### 5. Time-Travel Debugging (Future)

```typescript
// Every state transition can be recorded
const history: Array<{ state: EngineState; input: Event; outputs: Event[] }> = [];

// Replay any sequence of events
function replay(events: Event[]) {
  let state = initialEngineState;
  for (const event of events) {
    const [newState, outputs] = engineProcessor(state, event);
    state = newState;
  }
  return state;
}
```

## Success Criteria

- [x] `agentx-mealy` package created with Mealy Machine pattern
- [ ] `agentx-engine` contains ONLY pure Processor functions
- [ ] All state stored externally via Store interface
- [ ] Each processor has unit tests
- [ ] Memory usage reduced by 50x in multi-session scenarios
- [ ] Existing functionality preserved (all integration tests pass)
- [ ] Documentation updated

## Progress Log

### 2025-01-22: Phase 0 Foundation

- [x] Created globalEventBus singleton
- [x] Created AgentService singleton
- [x] Refactored AgentInstance class

### 2025-01-25: Architecture Redesign

- [x] Identified Reactor pattern limitations for stateless design
- [x] Explored naming options (Reducer, Kafka-style, Neural)
- [x] Discovered Mealy Machine as perfect pattern match
- [x] Key insight: "State is means, output is goal" (unlike Redux)
- [x] Created `@deepractice-ai/agentx-mealy` package
- [x] Implemented all core components (Processor, Source, Sink, Store, Mealy, combinators)
- [ ] Phase 2: Engine Processors (pending)

## References

- [Mealy Machine (Wikipedia)](https://en.wikipedia.org/wiki/Mealy_machine)
- [Finite-state machine](https://en.wikipedia.org/wiki/Finite-state_machine)
- George H. Mealy, "A Method for Synthesizing Sequential Circuits", 1955
