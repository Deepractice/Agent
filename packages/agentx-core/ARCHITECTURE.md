# AgentX Core Architecture

This document describes the internal architecture and design decisions of AgentX Core.

## Design Philosophy

### Spring IoC Pattern

AgentX Core is modeled after Spring's Inversion of Control container. This provides familiar patterns for enterprise developers:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Spring Framework                     │  AgentX Core                │
├───────────────────────────────────────┼─────────────────────────────┤
│  BeanDefinition                       │  AgentDefinition            │
│  - Static configuration               │  - Static configuration     │
│  - Can be loaded from XML/annotations │  - Can be persisted to DB   │
├───────────────────────────────────────┼─────────────────────────────┤
│  Runtime Properties                   │  AgentConfig                │
│  - @Value, Environment                │  - model, temperature, etc. │
├───────────────────────────────────────┼─────────────────────────────┤
│  Bean Instance                        │  Agent                      │
│  - Managed by container               │  - Managed by container     │
│  - Has lifecycle                      │  - Has lifecycle            │
├───────────────────────────────────────┼─────────────────────────────┤
│  ApplicationContext                   │  AgentContainer             │
│  - Manages bean instances             │  - Manages agent instances  │
│  - getBean(), registerBean()          │  - get(), register()        │
├───────────────────────────────────────┼─────────────────────────────┤
│  BeanFactory.createBean()             │  createAgent()              │
│  - Creates instance from definition   │  - Creates from definition  │
└───────────────────────────────────────┴─────────────────────────────┘
```

### Stateful by Design

Unlike the stateless Engine, Core is **intentionally stateful**:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Engine (Stateless)                                                  │
│                                                                      │
│  - No memory of past requests                                       │
│  - Horizontally scalable                                            │
│  - Processing state lives in local variables                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Core (Stateful)                                                     │
│                                                                      │
│  - Maintains Agent instances in memory                              │
│  - Maintains Session data                                           │
│  - State persisted via repositories                                 │
│  - Typically one instance per process                               │
└─────────────────────────────────────────────────────────────────────┘
```

**Why this split?**

- Engine handles pure event processing (can scale horizontally)
- Core handles identity and lifecycle (process-local)

## Core Components

### 1. CoreContext

Process-level singleton that holds all managers:

```
┌─────────────────────────────────────────────────────────────────────┐
│  CoreContext (Singleton)                                             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  engine: AgentEngine                                         │    │
│  │  - Shared across all agents                                  │    │
│  │  - Stateless event processor                                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  container: AgentContainer                                   │    │
│  │  - Runtime agent instance registry                           │    │
│  │  - Like Spring ApplicationContext                            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  sessionRepository: SessionRepository                        │    │
│  │  - Session persistence                                       │    │
│  │  - Pluggable (memory, database, etc.)                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Initialization:                                                     │
│  initializeCore(engine, { container?, sessionRepository? })         │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. AgentDefinition

Static configuration blueprint (like BeanDefinition):

```
┌─────────────────────────────────────────────────────────────────────┐
│  AgentDefinition                                                     │
│                                                                      │
│  interface AgentDefinition {                                        │
│    name: string;           // Type name (e.g., "Claude")            │
│    driver: Driver;         // AI SDK adapter                        │
│    systemPrompt?: string;  // Base instructions                     │
│    description?: string;   // Human description                     │
│    version?: string;       // Version for tracking                  │
│  }                                                                   │
│                                                                      │
│  Characteristics:                                                    │
│  - Immutable after creation                                         │
│  - Can be serialized (except driver)                                │
│  - One definition → many instances                                  │
│  - Future: AgentRegistry for definition storage                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. AgentConfig

Runtime configuration for a specific instance:

```
┌─────────────────────────────────────────────────────────────────────┐
│  AgentConfig                                                         │
│                                                                      │
│  interface AgentConfig {                                            │
│    agentId?: string;                  // Custom ID                  │
│    model?: string;                    // Model override             │
│    temperature?: number;              // Generation settings        │
│    maxTokens?: number;                //                            │
│    sessionId?: string;                // Associated session         │
│    metadata?: Record<string, unknown>; // Custom data               │
│  }                                                                   │
│                                                                      │
│  Relationship:                                                       │
│                                                                      │
│  AgentDefinition (1) ────→ (N) AgentConfig ────→ (N) Agent         │
│       │                           │                   │              │
│   "Claude"                  temperature: 0.7     agent_123          │
│   "Claude"                  temperature: 0.3     agent_456          │
└─────────────────────────────────────────────────────────────────────┘
```

### 4. Agent

Runtime instance with lifecycle:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Agent                                                               │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Identity                                                    │    │
│  │  - agentId: string (unique)                                  │    │
│  │  - definition: AgentDefinition                               │    │
│  │  - config: AgentConfig                                       │    │
│  │  - createdAt: Date                                           │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Lifecycle                                                   │    │
│  │  - lifecycle: "running" | "destroyed"                        │    │
│  │  - state: AgentState (idle, responding, awaiting_tool_result)│    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Methods                                                     │    │
│  │  - receive(message): Promise<void>                           │    │
│  │  - on(handler): Unsubscribe                                  │    │
│  │  - abort(): void                                             │    │
│  │  - interrupt(): void                                         │    │
│  │  - destroy(): Promise<void>                                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Internal                                                    │    │
│  │  - engine: AgentEngine (shared)                              │    │
│  │  - handlers: Set<EventHandler>                               │    │
│  │  - presenter: Presenter (forwards events)                    │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 5. AgentContainer

Runtime instance manager (like ApplicationContext):

```
┌─────────────────────────────────────────────────────────────────────┐
│  AgentContainer                                                      │
│                                                                      │
│  interface AgentContainer {                                         │
│    register(agent: Agent): void;                                    │
│    get(agentId: string): Agent | undefined;                         │
│    has(agentId: string): boolean;                                   │
│    unregister(agentId: string): boolean;                            │
│    getAllIds(): string[];                                           │
│    count(): number;                                                 │
│    clear(): void;                                                   │
│  }                                                                   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  MemoryAgentContainer (Default)                              │    │
│  │                                                              │    │
│  │  agents: Map<string, Agent>                                  │    │
│  │                                                              │    │
│  │  - In-memory storage                                         │    │
│  │  - No persistence                                            │    │
│  │  - Lost on process restart                                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Future: AgentRegistry (for AgentDefinition management)             │
│  - Stores AgentDefinitions (not instances)                          │
│  - Enables: listDefinitions(), getDefinition(name)                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 6. Session

Conversation persistence entity:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Session                                                             │
│                                                                      │
│  interface Session {                                                │
│    sessionId: string;                                               │
│    title?: string;                                                  │
│    agentId?: string;      // Optional 1:1 association               │
│    messages: Message[];                                             │
│    createdAt: Date;                                                 │
│    updatedAt: Date;                                                 │
│  }                                                                   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Message                                                     │    │
│  │                                                              │    │
│  │  interface Message {                                         │    │
│  │    id: string;                                               │    │
│  │    agentId: string;                                          │    │
│  │    role: "user" | "assistant" | "tool" | "error";            │    │
│  │    content: string;                                          │    │
│  │    timestamp: Date;                                          │    │
│  │    metadata?: Record<string, unknown>;                       │    │
│  │  }                                                           │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Operations (pure functions):                                        │
│  - createSession(title): Session                                    │
│  - associateAgent(session, agentId): Session                        │
│  - disassociateAgent(session): Session                              │
│  - addMessage(session, message): Session                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Agent Creation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  createAgent(definition, config)                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. Get CoreContext                                                  │
│     ctx = getContext()                                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. Create Agent instance                                            │
│     agent = new Agent(definition, config, ctx.engine)               │
│                                                                      │
│     - Generate agentId if not provided                              │
│     - Create presenter to forward events                            │
│     - Register presenter to engine                                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. Register in container                                            │
│     ctx.container.register(agent)                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. Return agent                                                     │
│     return agent                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Message Processing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  agent.receive("Hello!")                                             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. Check lifecycle                                                  │
│     if (lifecycle === "destroyed") throw Error                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. Create UserMessage                                               │
│     userMessage = { role: "user", content: "Hello!", ... }          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. Update state                                                     │
│     state = "responding"                                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. Delegate to engine                                               │
│     await engine.receive(agentId, userMessage)                      │
│                                                                      │
│     Engine processes via Driver → Processors → Presenters           │
│     Agent's presenter receives events, forwards to handlers         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. Restore state                                                    │
│     state = "idle"                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Event Forwarding

```
┌─────────────────────────────────────────────────────────────────────┐
│  Engine Event Flow with Agent                                        │
│                                                                      │
│  Engine.receive(agentId, message)                                   │
│       │                                                              │
│       ▼                                                              │
│  Driver produces events                                              │
│       │                                                              │
│       ▼                                                              │
│  Presenters called                                                   │
│       │                                                              │
│       ├─────────────────────────────────────────────────────────┐   │
│       │  Agent's Presenter                                       │   │
│       │                                                          │   │
│       │  presenter = (id, event) => {                           │   │
│       │    if (id === this.agentId) {  // Filter by agentId     │   │
│       │      this.notifyHandlers(event);  // Forward to handlers│   │
│       │      this.updateStateFromEvent(event);  // Update state │   │
│       │    }                                                     │   │
│       │  }                                                       │   │
│       └─────────────────────────────────────────────────────────┘   │
│       │                                                              │
│       ▼                                                              │
│  User's handler receives event                                       │
│       │                                                              │
│       ▼                                                              │
│  agent.on((event) => { ... })                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── index.ts                    # Public exports
├── context.ts                  # CoreContext singleton
├── createAgent.ts              # Functional API
├── getAgent.ts                 # Functional API
├── destroyAgent.ts             # Functional API
│
├── agent/
│   ├── index.ts                # Agent module exports
│   ├── AgentDefinition.ts      # Definition interface
│   ├── AgentConfig.ts          # Config interface + ID generator
│   ├── Agent.ts                # Agent class
│   └── AgentContainer.ts       # Container interface + MemoryAgentContainer
│
└── session/
    ├── index.ts                # Session module exports
    ├── Message.ts              # Message entity + converter
    ├── Session.ts              # Session entity + operations
    └── SessionRepository.ts    # Repository interface + MemorySessionRepository
```

## Key Design Decisions

### 1. Why Spring Pattern?

**Problem**: Managing agent instances requires lifecycle handling, dependency injection, and instance lookup.

**Solution**: Adopt proven patterns from Spring IoC:

```typescript
// Spring-like API feels natural to enterprise developers
const agent = createAgent(definition, config);  // Like context.getBean()
const agent2 = getAgent(agentId);               // Like context.getBean(id)
await destroyAgent(agentId);                    // Like context.close()
```

### 2. Why Separate Definition and Config?

**Problem**: Some configuration is static (shared), some is per-instance.

**Solution**: Two-level configuration:

```typescript
// Definition: Shared across instances
const definition: AgentDefinition = {
  name: "Claude",
  driver: claudeDriver,
  systemPrompt: "You are helpful.",
};

// Config: Per-instance
const agent1 = createAgent(definition, { temperature: 0.7 });
const agent2 = createAgent(definition, { temperature: 0.3 });
```

### 3. Why AgentContainer vs AgentRegistry?

**Problem**: Confusing naming for different responsibilities.

**Solution**: Clear separation:

```
AgentContainer (current)
- Manages runtime Agent instances
- Like Docker Container, Spring ApplicationContext
- In-memory, process-local

AgentRegistry (future)
- Manages AgentDefinition templates
- Like service registry, schema registry
- Can be persisted, shared across processes
```

### 4. Why Session-Agent 1:1?

**Problem**: How should sessions relate to agents?

**Decision**: One session can be associated with one agent at a time.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Options Considered:                                                 │
│                                                                      │
│  1:N (Session has many Agents)                                      │
│  - Complex: Which agent responds?                                   │
│  - Rejected                                                          │
│                                                                      │
│  N:1 (Many Sessions share one Agent)                                │
│  - Problematic: Agent state shared across sessions                  │
│  - Rejected                                                          │
│                                                                      │
│  1:1 (Session has one Agent)  ← CHOSEN                              │
│  - Clear ownership                                                   │
│  - Simple mental model                                              │
│  - Agent can be re-associated                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 5. Why Simplified Lifecycle?

**Problem**: How many lifecycle states?

**Decision**: Start simple, add as needed.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Considered: created → running → suspended → destroyed              │
│                                                                      │
│  Chosen: running → destroyed                                        │
│                                                                      │
│  Reasons:                                                            │
│  - "created" is redundant (just call constructor)                   │
│  - "suspended" can be added later if needed                         │
│  - YAGNI: Don't add complexity before it's needed                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Engine Integration

Core wraps Engine to provide identity and lifecycle:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Relationship: Core wraps Engine                                     │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Core (Stateful)                                             │    │
│  │                                                              │    │
│  │  - Agent lifecycle (running/destroyed)                       │    │
│  │  - Agent identity (agentId)                                  │    │
│  │  - Session persistence                                       │    │
│  │  - Event subscription per agent                              │    │
│  │                                                              │    │
│  │  ┌───────────────────────────────────────────────────────┐  │    │
│  │  │  Engine (Stateless)                                    │  │    │
│  │  │                                                        │  │    │
│  │  │  - Event processing                                    │  │    │
│  │  │  - Driver invocation                                   │  │    │
│  │  │  - Message assembly                                    │  │    │
│  │  │  - State machine                                       │  │    │
│  │  └───────────────────────────────────────────────────────┘  │    │
│  │                                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Engine is shared across all agents in one process                  │
│  Each agent adds a presenter to filter events by agentId            │
└─────────────────────────────────────────────────────────────────────┘
```

## Future Considerations

### AgentRegistry

For managing AgentDefinitions (not instances):

```typescript
// Future API
const registry = getAgentRegistry();

// Register definition
registry.register({
  name: "Claude",
  driver: claudeDriver,
  systemPrompt: "...",
});

// List available definitions
const definitions = registry.list(); // ["Claude", "GPT4", ...]

// Create instance from registered definition
const agent = createAgentByName("Claude", { temperature: 0.7 });
```

### Persistence

For surviving process restarts:

```typescript
// Future: Persistent container
const container = new PostgresAgentContainer(db);

// Agents can be restored after restart
const agent = getAgent("agent_123"); // Loaded from DB
```

### Clustering

For multi-process deployment:

```typescript
// Future: Distributed container
const container = new RedisAgentContainer(redis);

// Agents visible across processes
const agent = getAgent("agent_123"); // May be on another node
```
