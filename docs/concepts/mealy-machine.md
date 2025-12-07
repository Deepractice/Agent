# Mealy Machine Pattern

Understanding the core event processing pattern in AgentX.

## What is a Mealy Machine?

A Mealy Machine is a finite state machine where **outputs depend on both state and input**:

```
(state, input) → (state, outputs)
```

**Key principle**: State is the means, output is the goal.

## Why Mealy Machine?

Traditional approaches mix state management with side effects:

```typescript
// ❌ Traditional (hard to test)
class Agent {
  private state: State;

  async processMessage(message: string) {
    this.state = "thinking";
    const response = await llm.generate(message);
    this.state = "responding";
    this.saveToDatabase(response); // Side effect!
    this.sendToUI(response); // Side effect!
    this.state = "idle";
  }
}
```

Mealy Machine separates concerns:

```typescript
// ✅ Mealy Machine (pure, testable)
function process(state: State, input: Input): { state: State; outputs: Output[] } {
  // Pure function - no side effects
  return {
    state: newState,
    outputs: [event1, event2],
  };
}
```

**Benefits:**

1. **Pure Functions** - No side effects, deterministic
2. **Testable** - No mocks needed, just assert on outputs
3. **Composable** - Build complex from simple
4. **Debuggable** - State transitions are explicit

---

## AgentX Mealy Machine

AgentX uses MealyMachine to transform streaming LLM events into structured conversation events.

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      MealyMachine                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Input: StreamEvent (from Driver)                            │
│      │                                                        │
│      ▼                                                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Processor Pipeline                        │  │
│  │                                                         │  │
│  │  1. MessageAssembler  (Stream → Message)               │  │
│  │       ↓                                                 │  │
│  │  2. StateEventProcessor (Stream → State)               │  │
│  │       ↓                                                 │  │
│  │  3. TurnTracker (Message → Turn)                       │  │
│  └────────────────────────────────────────────────────────┘  │
│      │                                                        │
│      ▼                                                        │
│  Output: AgentOutput (Stream + State + Message + Turn)       │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Example: Processing text_delta

```typescript
// Input
const input = {
  type: "text_delta",
  timestamp: 1234567890,
  data: { text: "Hello" },
};

// State before
const stateBefore = {
  currentMessage: { text: "" },
  agentState: "responding",
};

// Process
const result = machine.process(stateBefore, input);

// State after
result.state = {
  currentMessage: { text: "Hello" }, // Updated
  agentState: "responding",
};

// Outputs
result.outputs = [
  { type: "text_delta", data: { text: "Hello" } }, // Stream layer
  { type: "conversation_responding", data: {} }, // State layer
];
```

---

## Internal Processors

MealyMachine composes three processors:

### 1. MessageAssembler

**Purpose**: Assemble complete messages from streaming chunks.

```
Input:  text_delta, text_delta, text_delta, message_stop
        ↓
Output: assistant_message (with complete text)
```

**Example:**

```typescript
// Stream events in
{ type: "message_start" }
{ type: "text_delta", data: { text: "Hello" } }
{ type: "text_delta", data: { text: " World" } }
{ type: "message_stop", data: { stopReason: "end_turn" } }

// Assembled message out
{
  type: "assistant_message",
  data: {
    id: "msg_123",
    role: "assistant",
    content: "Hello World",  // ← Assembled from deltas
    timestamp: 1234567890,
  }
}
```

### 2. StateEventProcessor

**Purpose**: Generate state transition events.

```
Input:  message_start, text_delta, tool_use_start
        ↓
Output: conversation_start, conversation_thinking, tool_planned
```

**State Transitions:**

```typescript
// Agent state machine
idle → conversation_start → conversation_thinking
  → conversation_responding → tool_planned
  → tool_executing → tool_completed → conversation_end → idle
```

### 3. TurnTracker

**Purpose**: Track request-response cycles with analytics.

```
Input:  user_message, assistant_message
        ↓
Output: turn_request, turn_response (with duration, tokens, cost)
```

**Example:**

```typescript
// Turn tracking
{
  type: "turn_response",
  data: {
    turnId: "turn_123",
    userMessage: { content: "Hello" },
    assistantMessage: { content: "Hi there!" },
    durationMs: 1234,
    usage: {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
    },
    costUsd: 0.0015,
  }
}
```

---

## Building Custom Processors

You can build custom processors for advanced use cases:

```typescript
import { type Processor, type ProcessorResult, combineProcessors } from "@agentxjs/agent";

// Define processor type
type MyState = { count: number };
type MyInput = { type: "increment" } | { type: "decrement" };
type MyOutput = { type: "count_changed"; data: { count: number } };

// Implement processor
const counterProcessor: Processor<MyState, MyInput, MyOutput> = (state, input) => {
  let newCount = state.count;

  if (input.type === "increment") {
    newCount++;
  } else if (input.type === "decrement") {
    newCount--;
  }

  return {
    state: { count: newCount },
    outputs: [
      {
        type: "count_changed",
        timestamp: Date.now(),
        data: { count: newCount },
      },
    ],
  };
};

// Use it
const result = counterProcessor({ count: 0 }, { type: "increment" });
console.log(result.state.count); // 1
console.log(result.outputs); // [{ type: "count_changed", data: { count: 1 } }]
```

### Processor Combinators

```typescript
import { combineProcessors, filterProcessor, mapOutput, withLogging } from "@agentxjs/agent";

// Combine multiple processors
const combined = combineProcessors(
  messageAssemblerProcessor,
  stateEventProcessor,
  turnTrackerProcessor
);

// Filter inputs
const filtered = filterProcessor(myProcessor, (input) => input.type === "text_delta");

// Transform outputs
const mapped = mapOutput(myProcessor, (output) => ({ ...output, timestamp: Date.now() }));

// Add logging
const logged = withLogging(myProcessor, "MyProcessor");
```

---

## Testing Mealy Machines

Pure functions are easy to test:

```typescript
import { createMealyMachine } from "@agentxjs/agent";
import { describe, it, expect } from "vitest";

describe("MealyMachine", () => {
  it("processes text_delta events", () => {
    const machine = createMealyMachine();

    const state = {
      /* initial state */
    };
    const input = {
      type: "text_delta",
      timestamp: Date.now(),
      data: { text: "Hi" },
    };

    const result = machine.process(state, input);

    // Assert on outputs
    expect(result.outputs).toContainEqual({
      type: "text_delta",
      data: { text: "Hi" },
    });

    // Assert on state
    expect(result.state.currentMessage.text).toBe("Hi");
  });
});
```

**No mocks needed** - just pure input/output assertions!

---

## Design Decisions

### Why Pure Functions?

1. **Deterministic** - Same input always produces same output
2. **Testable** - No I/O, no mocks, just assertions
3. **Debuggable** - Easy to replay and inspect
4. **Composable** - Build complex from simple

### Why Separate State and Output?

**State** is internal (means):

- Current message being assembled
- Current agent state
- Pending turn tracking

**Output** is external (goal):

- Events to emit
- Messages to save
- Metrics to track

This separation allows:

- State to evolve independently
- Outputs to be consumed flexibly
- Testing to focus on observable behavior

### Why Composable Processors?

Different concerns need different processors:

- **MessageAssembler** - Text assembly logic
- **StateEventProcessor** - State machine logic
- **TurnTracker** - Analytics logic

Combining them creates the complete MealyMachine without coupling.

---

## Next Steps

- **[Event System](./event-system.md)** - Understand event layers
- **[Agent Package](../packages/agent.md)** - Implementation details
- **[Building Custom Processors](../guides/custom-processors.md)** - Advanced usage
