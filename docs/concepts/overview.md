# Architecture Overview

AgentX is an event-driven AI Agent framework built on clean separation between the **Agent domain** (pure logic) and **Runtime domain** (infrastructure).

## Two-Domain Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    Agent Domain (Pure Logic)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      AgentEngine                          │  │
│  │                                                            │  │
│  │  Driver (event producer)                                  │  │
│  │      │                                                     │  │
│  │      │ yields StreamEvent                                 │  │
│  │      ▼                                                     │  │
│  │  MealyMachine (pure state machine)                        │  │
│  │      │                                                     │  │
│  │      │ emits AgentOutput                                  │  │
│  │      ▼                                                     │  │
│  │  Presenter (event consumer)                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Independent & Testable - No I/O dependencies                  │
└────────────────────────────────────────────────────────────────┘
                              │
                              │ used by
                              ▼
┌────────────────────────────────────────────────────────────────┐
│              Runtime Domain (Infrastructure)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                       Runtime                             │  │
│  │                          │                                │  │
│  │      ┌───────────────────┼───────────────────┐            │  │
│  │      │                   │                   │            │  │
│  │      ▼                   ▼                   ▼            │  │
│  │  SystemBus          Container          Environment       │  │
│  │      │                   │                   │            │  │
│  │      │                   ▼                   │            │  │
│  │      │               Agent                   │            │  │
│  │      │                   │                   │            │  │
│  │      │         ┌─────────┼─────────┐         │            │  │
│  │      │         │         │         │         │            │  │
│  │      ▼         ▼         ▼         ▼         ▼            │  │
│  │   Events   Session  Sandbox  AgentEngine  Claude SDK     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Complete Lifecycle - Container, Session, Bus, Environment     │
└────────────────────────────────────────────────────────────────┘
```

### Agent Domain

The Agent domain is **independent and testable without I/O**. It can be tested with mock drivers.

| Component        | Responsibility                                                     |
| ---------------- | ------------------------------------------------------------------ |
| **AgentDriver**  | Message processor: `receive(message) → AsyncIterable<StreamEvent>` |
| **AgentEngine**  | Event processing coordinator, state management                     |
| **MealyMachine** | Pure state machine for event assembly                              |
| **Presenter**    | Event consumer interface (side effects)                            |

**Key characteristic**: Uses **lightweight events** with only `{ type, timestamp, data }`.

**Package**: `@agentxjs/agent`

### Runtime Domain

The Runtime domain manages the **complete system lifecycle** with persistence, isolation, and event routing.

| Component       | Responsibility                                            |
| --------------- | --------------------------------------------------------- |
| **Runtime**     | Top-level API, owns SystemBus and Environment             |
| **SystemBus**   | Event routing, subscription, request/response             |
| **Container**   | Isolation boundary, agent registry                        |
| **Agent**       | Complete runtime entity (AgentEngine + Session + Sandbox) |
| **Session**     | Conversation history, message persistence                 |
| **Sandbox**     | Isolated environment (filesystem, MCP tools)              |
| **Environment** | External world interface (Receptor + Effector)            |

**Key characteristic**: Uses **full events** with `{ type, timestamp, data, source, category, intent, context }`.

**Package**: `@agentxjs/runtime`

## Two Event Structures

AgentX has two event structures for different purposes:

```
┌─────────────────────────────────────────────────────────────┐
│                  EngineEvent (Lightweight)                   │
│                                                              │
│  {                                                           │
│    type: "text_delta",                                       │
│    timestamp: 1234567890,                                    │
│    data: { text: "Hello" }                                   │
│  }                                                           │
│                                                              │
│  Used in: AgentEngine (Agent domain)                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Presenter enriches
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   SystemEvent (Full)                         │
│                                                              │
│  {                                                           │
│    type: "text_delta",                                       │
│    timestamp: 1234567890,                                    │
│    data: { text: "Hello" },                                  │
│    source: "agent",                                          │
│    category: "stream",                                       │
│    intent: "notification",                                   │
│    context: {                                                │
│      containerId: "container_123",                           │
│      agentId: "agent_456",                                   │
│      sessionId: "session_789"                                │
│    }                                                         │
│  }                                                           │
│                                                              │
│  Used in: Runtime (Runtime domain)                           │
└─────────────────────────────────────────────────────────────┘
```

**Why two structures?**

- **Agent domain** needs minimal overhead for pure event processing
- **Runtime domain** needs rich metadata for routing, filtering, and debugging

## Event Sources and Categories

SystemEvent uses `source` and `category` for classification:

```
SystemEvent
│
├── source: "environment"
│   ├── category: "stream"      → Streaming from Claude API
│   └── category: "connection"  → Connection status
│
├── source: "agent"
│   ├── category: "stream"      → Real-time incremental (text_delta, tool_call)
│   ├── category: "state"       → State transitions (thinking, responding)
│   ├── category: "message"     → Complete messages (user, assistant, tool)
│   └── category: "turn"        → Analytics (cost, duration, tokens)
│
├── source: "command"
│   ├── category: "request"     → API operations (create, run, send)
│   └── category: "response"    → Operation results
│
├── source: "session"
│   ├── category: "lifecycle"   → Session created, destroyed
│   ├── category: "persist"     → Message persisted
│   └── category: "action"      → Session resumed, forked
│
├── source: "container"
│   └── category: "lifecycle"   → Container created, destroyed
│
└── source: "sandbox"
    ├── category: "workdir"     → File operations
    └── category: "mcp"         → MCP tool operations
```

| Source        | Categories                   | Description                               |
| ------------- | ---------------------------- | ----------------------------------------- |
| `agent`       | stream, state, message, turn | Agent internal events (4-layer)           |
| `command`     | request, response            | API operations (request/response pattern) |
| `environment` | stream, connection           | External world (Claude SDK)               |
| `session`     | lifecycle, persist, action   | Session operations                        |
| `container`   | lifecycle                    | Container operations                      |
| `sandbox`     | workdir, mcp                 | Sandbox resources                         |

## Four-Layer Event System

Agent events follow a 4-layer hierarchy, each serving different consumers:

```
┌─────────────────────────────────────────────────────────────┐
│  L1: Stream Layer (Real-time incremental)                   │
│  ─────────────────────────────────────────────────────────  │
│  message_start → text_delta → text_delta → tool_use_start  │
│  → input_json_delta → tool_use_stop → tool_result          │
│  → message_stop                                             │
│                                                             │
│  Purpose: Real-time UI updates (typewriter effect)          │
│  Category: stream                                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ MealyMachine assembles
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  L2: State Layer (State transitions)                        │
│  ─────────────────────────────────────────────────────────  │
│  conversation_start → conversation_thinking                 │
│  → conversation_responding → tool_planned                   │
│  → tool_executing → tool_completed → conversation_end       │
│                                                             │
│  Purpose: Loading indicators, state machines                 │
│  Category: state                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ MealyMachine assembles
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  L3: Message Layer (Complete messages)                      │
│  ─────────────────────────────────────────────────────────  │
│  user_message → assistant_message → tool_call_message       │
│  → tool_result_message                                       │
│                                                             │
│  Purpose: Chat history, persistence                          │
│  Category: message                                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ MealyMachine tracks
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  L4: Turn Layer (Analytics)                                 │
│  ─────────────────────────────────────────────────────────  │
│  turn_request → turn_response                               │
│  (duration, tokens, cost)                                    │
│                                                             │
│  Purpose: Billing, monitoring, analytics                     │
│  Category: turn                                              │
└─────────────────────────────────────────────────────────────┘
```

| Layer       | Category | Purpose                       | Consumers                          |
| ----------- | -------- | ----------------------------- | ---------------------------------- |
| **Stream**  | stream   | Real-time incremental updates | UI typewriter effect               |
| **State**   | state    | Agent state transitions       | Loading indicators, state machines |
| **Message** | message  | Complete conversation records | Chat history, persistence          |
| **Turn**    | turn     | Usage metrics and analytics   | Billing, monitoring                |

## Command Event Pattern

All API operations use **request/response** events with correlation IDs:

```
┌─────────────┐                                    ┌──────────┐
│   Client    │                                    │ Runtime  │
└─────────────┘                                    └──────────┘
      │                                                  │
      │ request("container_create_request", { ... })    │
      │──────────────────────────────────────────────────▶│
      │                                                  │
      │   { type: "container_create_request",            │
      │     requestId: "req_123",                        │
      │     data: { containerId: "my-container" } }      │
      │                                                  │
      │                              [Container created] │
      │                                                  │
      │   { type: "container_create_response",           │
      │     requestId: "req_123",                        │
      │◀──────────────────────────────────────────────────│
      │     data: { containerId: "my-container" } }      │
      │                                                  │
      │ return response                                  │
      │                                                  │
```

Request types and their responses:

| Request                    | Response                    | Description          |
| -------------------------- | --------------------------- | -------------------- |
| `container_create_request` | `container_create_response` | Create container     |
| `agent_run_request`        | `agent_run_response`        | Run agent            |
| `agent_receive_request`    | `agent_receive_response`    | Send message         |
| `agent_interrupt_request`  | `agent_interrupt_response`  | Interrupt agent      |
| `agent_destroy_request`    | `agent_destroy_response`    | Destroy agent        |
| `image_snapshot_request`   | `image_snapshot_response`   | Create snapshot      |
| `image_resume_request`     | `image_resume_response`     | Resume from snapshot |

## Package Dependencies

```
@agentxjs/types
  (Type definitions - zero dependencies)
       │
       ▼
@agentxjs/common
  (Logger facade - shared infrastructure)
       │
       ▼
@agentxjs/agent
  (AgentEngine - pure event processor with MealyMachine)
       │
       ▼
@agentxjs/runtime
  (Runtime - Container, Session, Bus, Environment, Claude SDK)
       │
       ▼
agentxjs
  (Unified API - local/remote modes)
       │
       ▼
@agentxjs/ui
  (React components - Storybook)
```

## Next Steps

- **[Event System](./event-system.md)** - Deep dive into the four-layer event system
- **[Lifecycle](./lifecycle.md)** - Agent lifecycle management (run, stop, resume, destroy)
- **[Mealy Machine](./mealy-machine.md)** - The core state machine pattern
