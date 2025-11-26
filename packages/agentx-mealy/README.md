# @deepractice-ai/agentx-prism

**Prism** - Stateless Event Processing Framework for AgentX

## Overview

Prism is a pure functional event processing framework inspired by:

- Redux/Elm (Reducer pattern)
- Kafka Streams (Aggregator)
- Apache Flink (ProcessFunction)

Like light passing through a prism, events enter, are **refracted**, and emerge as new events.

```
       Event (Light)
           │
           ▼
       ┌───────┐
       │ Prism │  ← Refract Function (折射)
       └───────┘
           │
     ┌─────┼─────┐
     ▼     ▼     ▼
   Output Events (Spectrum)
```

## Core Concepts

### Refract (折射)

A **Refract** is a pure function that takes state and an event, returning new state and output events:

```typescript
type Refract<TState, TInput, TOutput> = (
  state: Readonly<TState>,
  event: TInput
) => [TState, TOutput[]];
```

**Key properties:**

- Pure function (no side effects)
- Deterministic (same input → same output)
- Stateless (state is passed in, not held internally)

### StateStore

**StateStore** abstracts state persistence:

```typescript
interface StateStore<T> {
  get(id: string): T | undefined;
  set(id: string, state: T): void;
  delete(id: string): void;
  has(id: string): boolean;
}
```

**Implementations:**

- `InMemoryStateStore` - For development/testing
- `RedisStateStore` - For production (future)
- `PostgresStateStore` - For persistence (future)

### Prism

**Prism** is the runtime engine that orchestrates everything:

```typescript
const prism = createPrism({
  refract: myRefract,
  stateStore: new InMemoryStateStore(),
  initialState: { count: 0 },
  onOutput: (id, event) => {
    // Handle output events (e.g., send to SSE)
  },
});

prism.dispatch("agent_123", event);
```

## Usage

### Basic Example

```typescript
import { defineRefract, createPrism, InMemoryStateStore } from "@deepractice-ai/agentx-prism";

// 1. Define state type
interface CounterState {
  count: number;
}

// 2. Define event types
type CounterEvent =
  | { type: "increment" }
  | { type: "decrement" }
  | { type: "count_changed"; count: number };

// 3. Define refract
const counterRefract = defineRefract<CounterState, CounterEvent, CounterEvent>({
  name: "Counter",
  initialState: () => ({ count: 0 }),
  refract: (state, event) => {
    switch (event.type) {
      case "increment": {
        const newCount = state.count + 1;
        return [{ count: newCount }, [{ type: "count_changed", count: newCount }]];
      }
      case "decrement": {
        const newCount = state.count - 1;
        return [{ count: newCount }, [{ type: "count_changed", count: newCount }]];
      }
      default:
        return [state, []];
    }
  },
});

// 4. Create prism
const prism = createPrism({
  refract: counterRefract.refract,
  stateStore: new InMemoryStateStore(),
  initialState: counterRefract.initialState(),
  onOutput: (id, event) => {
    console.log(`[${id}]`, event);
  },
});

// 5. Dispatch events
prism.dispatch("user_1", { type: "increment" });
// Output: [user_1] { type: 'count_changed', count: 1 }

prism.dispatch("user_1", { type: "increment" });
// Output: [user_1] { type: 'count_changed', count: 2 }

console.log(prism.getState("user_1"));
// { count: 2 }
```

### Combining Refracts

```typescript
import { combineRefracts, combineInitialStates } from "@deepractice-ai/agentx-prism";

interface CombinedState {
  message: MessageState;
  stateMachine: StateMachineState;
  turnTracker: TurnState;
}

const combinedRefract = combineRefracts<CombinedState, AgentEvent, AgentEvent>({
  message: messageRefract,
  stateMachine: stateMachineRefract,
  turnTracker: turnTrackerRefract,
});

const initialState = combineInitialStates({
  message: () => initialMessageState,
  stateMachine: () => initialStateMachineState,
  turnTracker: () => initialTurnState,
});
```

## Why Prism?

### vs EventBus/Reactor Pattern

| Aspect       | EventBus             | Prism                 |
| ------------ | -------------------- | --------------------- |
| State        | Internal to handlers | External (StateStore) |
| Side effects | emit() calls         | Return values         |
| Testing      | Requires mocking     | Direct function calls |
| Debugging    | Scattered state      | Centralized state     |
| Performance  | Pub/sub overhead     | Direct function calls |

### Benefits

1. **Pure Functions** - Easy to test, reason about, and debug
2. **Stateless** - Engine can be shared across sessions
3. **Pluggable State** - Swap in-memory for Redis/Postgres
4. **Type Safe** - Full TypeScript support
5. **Composable** - Build complex pipelines from simple refracts

## API Reference

### Types

- `Refract<TState, TInput, TOutput>` - Core pure function type
- `RefractDefinition<TState, TInput, TOutput>` - Refract with metadata
- `StateStore<T>` - State persistence interface
- `PrismConfig<TState, TEvent>` - Prism configuration
- `DispatchResult<TState, TEvent>` - Result of dispatch

### Functions

- `defineRefract(def)` - Create a refract definition
- `createPrism(config)` - Create a Prism instance
- `combineRefracts(refracts)` - Combine multiple refracts
- `combineInitialStates(states)` - Combine initial states
- `chainRefracts(...refracts)` - Chain refracts sequentially
- `filterRefract(predicate, refract)` - Filter events
- `mapOutput(refract, mapper)` - Map output events
- `withLogging(refract, name)` - Add logging

### Classes

- `Prism<TState, TEvent>` - The runtime engine
- `InMemoryStateStore<T>` - In-memory state storage

## Terminology

| Term           | Meaning                                                     |
| -------------- | ----------------------------------------------------------- |
| **Prism**      | The engine/runtime that processes events                    |
| **Refract**    | Pure function that transforms state (like light refracting) |
| **StateStore** | Where state is persisted between refracts                   |
| **Dispatch**   | Send an event into the prism for processing                 |

## License

MIT
