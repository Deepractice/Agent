# Issue 032: Complete Architecture Overview

## Summary

This document provides a comprehensive view of the AgentX architecture, including all components and their relationships.

## Architecture Diagram

```
┌─══════════════════════════════════════════════════════════════════════════════════════════════════┐
║                                                                                                    ║
║                                    EXTERNAL WORLD                                                  ║
║                                                                                                    ║
║    ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐                        ║
║    │   Claude API     │     │  WebSocket/SSE   │     │   User Input     │                        ║
║    │   (Anthropic)    │     │   (Network)      │     │   (Browser/CLI)  │                        ║
║    └────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘                        ║
║             │                        │                        │                                   ║
╚═════════════╪════════════════════════╪════════════════════════╪═══════════════════════════════════╝
              │                        │                        │
              │ perceive               │ perceive               │ perceive
              ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                     │
│                                      ECOSYSTEM                                                      │
│                                                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                     Environment                                               │  │
│  │                                                                                               │  │
│  │   ┌─────────────────────────┐                           ┌─────────────────────────┐          │  │
│  │   │       Receptor          │                           │       Effector          │          │  │
│  │   │                         │                           │                         │          │  │
│  │   │  ┌───────────────────┐  │                           │  ┌───────────────────┐  │          │  │
│  │   │  │  ClaudeReceptor   │  │                           │  │  ClaudeEffector   │  │          │  │
│  │   │  │  (Claude API →    │  │                           │  │  (→ Claude API)   │  │          │  │
│  │   │  │   EnvironmentEvent)│  │                           │  └───────────────────┘  │          │  │
│  │   │  └───────────────────┘  │                           │                         │          │  │
│  │   │  ┌───────────────────┐  │                           │  ┌───────────────────┐  │          │  │
│  │   │  │  NetworkReceptor  │  │                           │  │  NetworkEffector  │  │          │  │
│  │   │  │  (WebSocket →     │  │                           │  │  (→ WebSocket)    │  │          │  │
│  │   │  │   EnvironmentEvent)│  │                           │  └───────────────────┘  │          │  │
│  │   │  └───────────────────┘  │                           │                         │          │  │
│  │   └───────────┬─────────────┘                           └─────────────┬───────────┘          │  │
│  │               │                                                       │                      │  │
│  └───────────────┼───────────────────────────────────────────────────────┼──────────────────────┘  │
│                  │ pipe(bus)                                   subscribe(bus)                      │
│                  │                                                       │                         │
│                  ▼                                                       │                         │
│  ┌───────────────────────────────────────────────────────────────────────┴──────────────────────┐  │
│  │                                                                                               │  │
│  │                                    SystemBus                                                  │  │
│  │                                                                                               │  │
│  │   Events:                                                                                     │  │
│  │   - EnvironmentEvent: text_chunk, stream_start, stream_end, interrupted, connected...        │  │
│  │   - AgentEvent: state (thinking, responding...), message, turn, error                        │  │
│  │   - SessionEvent: session_created, session_resumed... (TODO)                                 │  │
│  │   - ContainerEvent: container_started... (TODO)                                              │  │
│  │                                                                                               │  │
│  └───────────────────────────────────────────────────────────────────────────────────────────────┘  │
│          │                    │                    │                    │                          │
│          │ subscribe          │ subscribe          │ subscribe          │ emit                     │
│          │                    │                    │                    │                          │
│          ▼                    ▼                    ▼                    │                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │                          │
│  │   Logger     │    │   Monitor    │    │   UI API     │              │                          │
│  │  (Subscriber)│    │  (Subscriber)│    │  (Subscriber)│              │                          │
│  └──────────────┘    └──────────────┘    └──────────────┘              │                          │
│                                                                         │                          │
│  ════════════════════════════════════════════════════════════════════════════════════════════════  │
│                                                                         │                          │
│                                       RUNTIME                            │                          │
│                                                                         │                          │
│  ┌──────────────────────────────────────────────────────────────────────┼────────────────────────┐ │
│  │                                Container                             │                        │ │
│  │                                                                      │                        │ │
│  │  ┌────────────────────────────────────────────────────────────────── │ ─────────────────────┐ │ │
│  │  │                           Agent                                   │                      │ │ │
│  │  │                                                                   │                      │ │ │
│  │  │   ┌─────────────────────────────────────────────────────────────┐ │                      │ │ │
│  │  │   │                    AgentEngine                               │ │                      │ │ │
│  │  │   │                                                             │ │                      │ │ │
│  │  │   │   ┌─────────────────┐     connect(bus)                      │ │                      │ │ │
│  │  │   │   │  Mealy Machine  │◄────────────────────────────────────────┘                      │ │ │
│  │  │   │   │                 │                                                                │ │ │
│  │  │   │   │  StreamEvent    │                                                                │ │ │
│  │  │   │   │       ↓         │                                                                │ │ │
│  │  │   │   │  StateEvent     │────────────────────────────────────────────► bus.emit()        │ │ │
│  │  │   │   │  MessageEvent   │                                                                │ │ │
│  │  │   │   │  TurnEvent      │                                                                │ │ │
│  │  │   │   └─────────────────┘                                                                │ │ │
│  │  │   │                                                                                      │ │ │
│  │  │   │   Processors:                                                                        │ │ │
│  │  │   │   - StateEventProcessor (stream → state events)                                      │ │ │
│  │  │   │   - MessageAssemblerProcessor (stream → message events)                              │ │ │
│  │  │   │   - TurnTrackerProcessor (message → turn events)                                     │ │ │
│  │  │   │                                                                                      │ │ │
│  │  │   └──────────────────────────────────────────────────────────────────────────────────────┘ │ │
│  │  │                                                                                            │ │
│  │  │   ┌──────────────────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │   │                        Sandbox                                                        │ │ │
│  │  │   │                                                                                      │ │ │
│  │  │   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │ │ │
│  │  │   │   │  Workspace   │  │     LLM      │  │  MCP Tools   │  │   Browser    │            │ │ │
│  │  │   │   │  (cwd)       │  │  (Provider)  │  │  (Tools)     │  │  (Headless)  │            │ │ │
│  │  │   │   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘            │ │ │
│  │  │   │                                                                                      │ │ │
│  │  │   └──────────────────────────────────────────────────────────────────────────────────────┘ │ │
│  │  │                                                                                            │ │
│  │  │   Other Components:                                                                        │ │
│  │  │   - AgentStateMachine (lifecycle state)                                                    │ │
│  │  │   - MiddlewareChain (input interception)                                                   │ │
│  │  │   - InterceptorChain (output interception)                                                 │ │
│  │  │                                                                                            │ │
│  │  └────────────────────────────────────────────────────────────────────────────────────────────┘ │
│  │                                                                                                 │
│  │  ┌────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │  │                           Session                                                          │ │
│  │  │                                                                                            │ │
│  │  │   - sessionId                                                                              │ │
│  │  │   - Listens to conversation, persists messages                                             │ │
│  │  │   - Supports resume (restore conversation)                                                 │ │
│  │  │                                                                                            │ │
│  │  └────────────────────────────────────────────────────────────────────────────────────────────┘ │
│  │                                                                                                 │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                                  Repository                                                     │ │
│  │                                                                                                 │ │
│  │   - SQLiteRepository (Node.js)                                                                 │ │
│  │   - RemoteRepository (Browser → HTTP API)                                                      │ │
│  │   - Storage: Image, Session, Message, etc.                                                     │ │
│  │                                                                                                 │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘


┌─════════════════════════════════════════════════════════════════════════════════════════════════════┐
║                                                                                                     ║
║                                   APPLICATION LAYER                                                 ║
║                                                                                                     ║
║  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐║
║  │                                        AgentX API                                               │║
║  │                                                                                                 │║
║  │   agentx.definitions    agentx.images    agentx.agents    agentx.sessions                      │║
║  │   ├── register()        ├── build()      ├── run()        ├── create()                         │║
║  │   ├── get()             ├── get()        ├── get()        ├── get()                            │║
║  │   ├── list()            ├── list()       ├── list()       ├── list()                           │║
║  │   └── unregister()      └── delete()     └── destroy()    └── delete()                         │║
║  │                                                                                                 │║
║  └─────────────────────────────────────────────────────────────────────────────────────────────────┘║
║                                                                                                     ║
║  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐                            ║
║  │    Definition      │  │      Image         │  │       User         │                            ║
║  │    (Template)      │  │    (Artifact)      │  │     (Identity)     │                            ║
║  │                    │  │                    │  │                    │                            ║
║  │  - name            │  │  - imageId         │  │  - userId          │                            ║
║  │  - systemPrompt    │  │  - definitionName  │  │  - metadata        │                            ║
║  │  - tools           │  │  - config          │  │                    │                            ║
║  │  - model           │  │  - createdAt       │  │                    │                            ║
║  └────────────────────┘  └────────────────────┘  └────────────────────┘                            ║
║                                                                                                     ║
╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝


┌─════════════════════════════════════════════════════════════════════════════════════════════════════┐
║                                                                                                     ║
║                                    NETWORK LAYER                                                    ║
║                                                                                                     ║
║  ┌──────────────────────────────────────────┐  ┌──────────────────────────────────────────┐        ║
║  │        Application (HTTP)                │  │        Ecosystem (WebSocket)             │        ║
║  │                                          │  │                                          │        ║
║  │   ┌──────────────────────────────────┐   │  │   ┌──────────────────────────────────┐   │        ║
║  │   │  Endpoints (API Contracts)       │   │  │   │  Channel (Bidirectional)         │   │        ║
║  │   │  - /definitions                  │   │  │   │  - WebSocketChannel              │   │        ║
║  │   │  - /images                       │   │  │   │  - SSEChannel                    │   │        ║
║  │   │  - /sessions                     │   │  │   │                                  │   │        ║
║  │   │  - /platform                     │   │  │   │  Events flow:                    │   │        ║
║  │   └──────────────────────────────────┘   │  │   │  Server ←──→ Browser             │   │        ║
║  │                                          │  │   └──────────────────────────────────┘   │        ║
║  └──────────────────────────────────────────┘  └──────────────────────────────────────────┘        ║
║                                                                                                     ║
╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

## Three-Layer Architecture

| Layer       | Ontology  | Protocol  | Content                            |
| ----------- | --------- | --------- | ---------------------------------- |
| Application | Structure | HTTP      | Definition, Image, User            |
| Network     | Relation  | HTTP + WS | Server, Client, Channel, Endpoint  |
| Ecosystem   | Process   | WS Events | Runtime, Container, Session, Agent |

## Component Responsibilities

### Ecosystem Layer

#### Environment (External World Interface)

| Component    | Direction           | Responsibility                                                          |
| ------------ | ------------------- | ----------------------------------------------------------------------- |
| **Receptor** | External → Internal | Perceive external world, convert to EnvironmentEvent, pipe to SystemBus |
| **Effector** | Internal → External | Subscribe to SystemBus, act upon external world                         |

Implementations:

- `ClaudeReceptor` / `ClaudeEffector` - Claude API interaction
- `NetworkReceptor` / `NetworkEffector` - WebSocket/SSE interaction

#### SystemBus (Event Hub)

Central event bus for all ecosystem communication.

Event Types:

- **EnvironmentEvent**: `text_chunk`, `stream_start`, `stream_end`, `interrupted`, `connected`, `disconnected`
- **AgentEvent**: state events, message events, turn events, error events
- **SessionEvent**: `session_created`, `session_resumed` (TODO)
- **ContainerEvent**: `container_started` (TODO)

#### Runtime

| Component       | Responsibility                                                  |
| --------------- | --------------------------------------------------------------- |
| **Container**   | Manages multiple Agents                                         |
| **Agent**       | Single agent instance with Engine + Sandbox                     |
| **AgentEngine** | Mealy Machine event processor, `connect(bus)` to receive events |
| **Sandbox**     | Resource isolation (Workspace, LLM, MCP Tools, Browser)         |
| **Session**     | Conversation persistence and resume                             |
| **Repository**  | Data storage (SQLite / Remote)                                  |

### Application Layer

Static resources managed via HTTP CRUD:

| Resource       | Description                        |
| -------------- | ---------------------------------- |
| **Definition** | Agent template (like Dockerfile)   |
| **Image**      | Built artifact (like Docker Image) |
| **User**       | User identity                      |

### Network Layer

| Sub-layer   | Protocol  | Purpose                       |
| ----------- | --------- | ----------------------------- |
| Application | HTTP      | REST API for static resources |
| Ecosystem   | WebSocket | Real-time event streaming     |

## Data Flow

```
1. External World (Claude API)
        │
        │ SDK Response
        ▼
2. Receptor (ClaudeReceptor)
        │
        │ Convert to EnvironmentEvent (text_chunk, stream_start...)
        │ pipe(bus)
        ▼
3. SystemBus
        │
        │ subscribe (EnvironmentEvent)
        ▼
4. AgentEngine.connect(bus)
        │
        │ Built-in driver logic, filter events
        ▼
5. Mealy Machine (Process)
        │
        │ StreamEvent → StateEvent, MessageEvent, TurnEvent
        ▼
6. Agent emit to SystemBus (AgentEvent)
        │
        ▼
7. External Subscribers (UI, Logger, Monitor...)
```

## Key Design Decisions

### 1. Receptor/Effector for External World Only

- **Receptor**: Only for perceiving **external world** (Claude API, Network)
- **Effector**: Only for acting upon **external world**
- **Internal components**: Directly use `bus.emit()`, no Receptor wrapper needed

### 2. Driver Built into Engine

Driver logic is fixed and built into `AgentEngine.connect(bus)`:

- Subscribes to EnvironmentEvents from SystemBus
- Filters events needed by Mealy Machine
- No separate Driver class needed

### 3. Receptor API

```typescript
interface Receptor {
  pipe(bus: SystemBus): void; // Renamed from emit() for clarity
}

interface Effector {
  subscribe(bus: SystemBus): void;
}
```

### 4. Internal Components Use Bus Directly

```typescript
// SessionManager - internal component
class SessionManager {
  constructor(private bus: SystemBus) {}

  createSession(): Session {
    const session = new Session();

    // Direct emit to bus
    this.bus.emit({
      type: "session_created",
      data: { sessionId: session.id },
    });

    return session;
  }
}
```

## Package Structure

```
packages/
├── types/              # @agentxjs/types - Type definitions
│   ├── application/    # Definition, Image, User, Error, Logger
│   ├── network/        # Endpoint, Channel, Server
│   └── ecosystem/      # Environment, Receptor, Effector, SystemBus, Agent, Session
│
├── common/             # @agentxjs/common - Logger facade
├── engine/             # @agentxjs/engine - Mealy Machine processor
├── agent/              # @agentxjs/agent - Agent runtime
├── agentx/             # agentxjs - Platform API
│
├── node-ecosystem/     # @agentxjs/node-ecosystem - Node.js implementation
│   ├── ClaudeEnvironment (ClaudeReceptor + ClaudeEffector)
│   ├── SQLiteRepository
│   ├── EnvLLMProvider
│   └── SystemBusImpl
│
├── remote-ecosystem/   # @agentxjs/remote-ecosystem - Browser implementation
│   ├── NetworkEnvironment (NetworkReceptor + NetworkEffector)
│   └── SystemBusImpl
│
├── network/            # @agentxjs/network - Transport layer
│   ├── WebSocketChannel
│   └── SSEChannel
│
└── ui/                 # @agentxjs/ui - React components
```

## Related Issues

- Issue 027: Systems Theory Agent-Environment
- Issue 028: Reactor Pattern SystemBus Architecture
- Issue 029: Simplified Event Architecture
- Issue 030: Ecosystem Architecture
- Issue 031: Code Review Collaboration Mode
