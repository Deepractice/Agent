# Issue 012: Core Package DDD Refactoring

**Status**: Planning
**Priority**: High
**Created**: 2025-01-26
**Related**: Issue 010 (Engine Stateless), Issue 011 (Distributed Architecture)

## Overview

This issue documents the complete DDD (Domain-Driven Design) refactoring plan for `agentx-core` package. The goal is to adapt the core package to the new stateless engine architecture while providing a clean, domain-driven API.

## Background

### Current Problems

The current `agentx-core` package has type errors because it depends on deleted exports from the old engine:

- `AgentDriver`, `AgentContext`, `EngineConfig` - removed
- `agentService` singleton - removed
- `AgentReactor`, `EventConsumer`, `Unsubscribe` - removed
- `MessageReactor` interface - removed

### New Engine Architecture

The new `agentx-engine` is completely stateless:

- `Driver`: Input adapter (UserMessage → StreamEvents)
- `Processor`: Pure Mealy transition function
- `Presenter`: Output adapter (events → external systems/persistence)
- `AgentEngine`: Stateless runtime (can be shared across requests)

## Design Decisions

### 1. Core Package Responsibilities

```
agentx-engine (stateless)     agentx-core (stateful)
├── Pure event processing     ├── Integrate engine
├── No business data          ├── Manage state (via Stores)
└── Shared across requests    └── Manage lifecycle
```

### 2. Two Domains

Core package manages two independent domains:

```
Agent Domain (运行时)              Session Domain (史书)
├── AgentDefinition (聚合根)       ├── Session (聚合根)
├── AgentInstance (实体)           ├── Message (实体)
├── AgentConfig (值对象)           └── SessionService (领域服务)
└── AgentService (领域服务)

关系：Session 关联 AgentInstance（记录谁说了什么）
      AgentInstance 不关联 Session（只管执行）
```

### 3. Agent Domain Details

**AgentDefinition (Aggregate Root)** - What an Agent is

```typescript
interface AgentDefinition {
  name: string;
  description?: string;
  version?: string;
  driver: Driver;
}
```

**AgentConfig (Value Object)** - Configuration for creating instance

```typescript
interface AgentConfig {
  // Configuration options for instance creation
  // To be defined as needed
}
```

**AgentInstance (Entity)** - Runtime instance

```typescript
interface AgentInstance {
  // Properties
  readonly agentId: string;
  readonly state: AgentState;

  // Core methods
  receive(message: UserMessage): Promise<void>;
  abort(): void; // System/error abort
  interrupt(): void; // User interrupt
  destroy(): Promise<void>;

  // Event subscription
  on(handler: (event: AgentEvent) => void): Unsubscribe;
}
```

**Key Design**:

- `receive()` instead of `send()` - from Agent's perspective
- `abort()` vs `interrupt()` - different semantics (system vs user)
- `on()` provides single event subscription point (framework layer can provide friendlier API like `onTextDelta`, `onMessage`, etc.)

### 4. Session Domain Details

**Session (Aggregate Root)** - Historical record (like a chronicle)

```typescript
interface Session {
  sessionId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}
```

**Message (Entity)** - A record in the chronicle

```typescript
interface Message {
  id: string;
  agentId: string; // Which Agent produced this
  role: "user" | "assistant" | "tool" | "error";
  content: ContentPart[];
  timestamp: number;
}
```

**Session's Value**:

- Independent from specific Agent
- Can be reused by multiple Agents
- Provides data for edge features (history, search, analysis, export)
- Like a "chronicle" - records what happened

**Example Use Case**:

```
Agent A (Claude) has a conversation → recorded to Session
                ↓
Agent B (GPT) wants to continue → reads from Session
                ↓
Agent B creates new AgentInstance with Session's history
```

### 5. Relationship Between Domains

```
AgentInstance (执行者)          Session (史书)
├── Only executes               ├── Records who said what
└── Doesn't care about Session  └── Associates with Agent via Message.agentId

AgentInstance 1:1 Session (at runtime)
But Session can be reused by different Agents over time
```

### 6. DDD Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Application Layer (对外接口 - 函数式 API)               │
│                                                          │
│  startAgent(def, message) → AgentInstance               │
│  resumeAgent(agentId) → AgentInstance                   │
│  destroyAgent(agentId) → void                           │
│                                                          │
│  Coordinates Agent + Session domains                     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Domain Layer (领域层)                                   │
│                                                          │
│  Agent Domain               Session Domain               │
│  ├── AgentDefinition       ├── Session                  │
│  ├── AgentInstance         ├── Message                  │
│  ├── AgentConfig           └── SessionService           │
│  └── AgentService                                        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Infrastructure Layer (基础设施层)                       │
│                                                          │
│  AgentRepository          SessionRepository              │
│  ├── Interface            ├── Interface                 │
│  └── MemoryImpl           └── MemoryImpl                │
│      (future: PostgresImpl)   (future: PostgresImpl)    │
└─────────────────────────────────────────────────────────┘
```

### 7. Naming Conventions

| Concept             | Naming                                                |
| ------------------- | ----------------------------------------------------- |
| Domain Service      | `XxxService` (e.g., `AgentService`, `SessionService`) |
| Application Service | Functions (e.g., `startAgent()`, `resumeAgent()`)     |
| Repository          | `XxxRepository` (e.g., `AgentRepository`)             |
| Aggregate Root      | Domain name (e.g., `AgentDefinition`, `Session`)      |
| Entity              | Domain name (e.g., `AgentInstance`, `Message`)        |

## File Structure

```
packages/agentx-core/src/
├── application/
│   ├── startAgent.ts           # Start new conversation
│   ├── resumeAgent.ts          # Resume existing conversation
│   ├── destroyAgent.ts         # Destroy agent
│   ├── getAgent.ts             # Get agent instance
│   └── index.ts                # Export all functions
│
├── domain/
│   ├── agent/
│   │   ├── AgentDefinition.ts  # Aggregate Root
│   │   ├── AgentInstance.ts    # Entity
│   │   ├── AgentConfig.ts      # Value Object
│   │   ├── AgentService.ts     # Domain Service
│   │   └── index.ts
│   │
│   └── session/
│       ├── Session.ts          # Aggregate Root
│       ├── Message.ts          # Entity
│       ├── SessionService.ts   # Domain Service
│       └── index.ts
│
├── infrastructure/
│   ├── AgentRepository.ts      # Interface
│   ├── SessionRepository.ts    # Interface
│   └── memory/
│       ├── MemoryAgentRepository.ts
│       └── MemorySessionRepository.ts
│
└── index.ts                    # Public API exports
```

## Implementation Plan

### Phase 1: Clean Up

1. [ ] Remove old files (AgentInstance.ts, SessionStore.ts, AgentRegistry.ts)
2. [ ] Update package.json dependencies

### Phase 2: Domain Layer

1. [ ] Create Agent domain entities
   - [ ] AgentDefinition.ts
   - [ ] AgentInstance.ts
   - [ ] AgentConfig.ts
   - [ ] AgentService.ts
2. [ ] Create Session domain entities
   - [ ] Session.ts
   - [ ] Message.ts
   - [ ] SessionService.ts

### Phase 3: Infrastructure Layer

1. [ ] Define repository interfaces
   - [ ] AgentRepository.ts
   - [ ] SessionRepository.ts
2. [ ] Implement memory repositories
   - [ ] MemoryAgentRepository.ts
   - [ ] MemorySessionRepository.ts

### Phase 4: Application Layer

1. [ ] Implement application functions
   - [ ] startAgent.ts
   - [ ] resumeAgent.ts
   - [ ] destroyAgent.ts
   - [ ] getAgent.ts

### Phase 5: Integration

1. [ ] Update index.ts exports
2. [ ] Update dependent packages (agentx-framework)
3. [ ] Write tests
4. [ ] Update documentation

## Usage Example

```typescript
import { startAgent, resumeAgent, destroyAgent } from "@deepractice-ai/agentx-core";

// Define an agent
const claudeAgent: AgentDefinition = {
  name: "Claude Assistant",
  driver: claudeDriver,
};

// Start new conversation
const agent = await startAgent(claudeAgent, "Hello!");

// Runtime operations
await agent.receive({ role: "user", content: "Help me write code" });
agent.on((event) => console.log(event));

// User interrupts
agent.interrupt();

// Resume later
const agent2 = await resumeAgent(agent.agentId);

// Clean up
await destroyAgent(agent.agentId);
```

## Success Criteria

- [ ] Core package compiles without type errors
- [ ] DDD structure is clear and maintainable
- [ ] Agent domain properly separated from Session domain
- [ ] Application layer provides simple function-based API
- [ ] Infrastructure layer allows easy swap of implementations
- [ ] Integration with agentx-engine works correctly
- [ ] All tests pass

## References

- Issue 010: Engine Stateless Architecture
- Issue 011: Distributed Architecture Design
- Domain-Driven Design by Eric Evans
