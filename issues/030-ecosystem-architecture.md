# Issue 030: Ecosystem Complete Architecture

## Summary

This document describes the complete Ecosystem architecture based on Systems Theory, including internal structure and cross-ecosystem communication.

## Core Concept

**Ecosystem** is a self-contained system that:

1. Receives external stimuli via **Environment**
2. Processes events through **SystemBus**
3. Drives **Agent** via **Driver**
4. Exposes events to external consumers via **Receptor**

## Single Ecosystem Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Ecosystem                                       │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                           SystemBus                                     │ │
│  │                   (EnvironmentEvent Hub)                                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│       ▲                       │                           │                  │
│       │ emit                  │ subscribe                 │ subscribe        │
│       │                       │                           │                  │
│  ┌────┴────────────┐          │                   ┌───────┴───────┐         │
│  │   Environment   │          │                   │    Driver     │         │
│  │                 │          │                   │               │         │
│  │ Produces raw    │          │                   │ Filters       │         │
│  │ EnvironmentEvent│          │                   │ EnvironmentEvent        │
│  │                 │          │                   │ for Agent     │         │
│  │ Implementations:│          │                   └───────┬───────┘         │
│  │ - ClaudeEnv     │          │                           │                  │
│  │ - RemoteEnv     │          │                           │                  │
│  └─────────────────┘          │                           ▼                  │
│                               │     ┌─────────────────────────────────────┐ │
│                               │     │             Runtime                  │ │
│                               │     │  ┌─────────┐ ┌─────────┐ ┌────────┐ │ │
│                               │     │  │  Agent  │ │ Session │ │Container│ │ │
│                               │     │  │  Mealy  │ │         │ │        │ │ │
│                               │     │  │ Machine │ │         │ │        │ │ │
│                               │     │  └────┬────┘ └────┬────┘ └───┬────┘ │ │
│                               │     │       │          │          │       │ │
│                               │     └───────│──────────│──────────│───────┘ │
│                               │             │          │          │         │
│                               │             │ events   │ events   │ events  │
│                               │             ▼          ▼          ▼         │
│                               │     ┌─────────────────────────────────────┐ │
│                               │     │            Receptors                 │ │
│                               │     │  ┌─────────────┐ ┌────────────────┐ │ │
│                               └────►│  │AgentReceptor│ │SessionReceptor │ │ │
│                                     │  │             │ │                │ │ │
│                                     │  │ Listens to  │ │ Listens to     │ │ │
│                                     │  │ Agent events│ │ Session events │ │ │
│                                     │  └──────┬──────┘ └───────┬────────┘ │ │
│                                     │         │                │          │ │
│                                     └─────────│────────────────│──────────┘ │
│                                               │                │            │
└───────────────────────────────────────────────│────────────────│────────────┘
                                                │                │
                                                ▼                ▼
                                        ┌─────────────────────────────┐
                                        │     External Consumers      │
                                        │  - UI Components            │
                                        │  - Network Transport        │
                                        │  - Logging/Monitoring       │
                                        │  - Another Ecosystem        │
                                        └─────────────────────────────┘
```

## Cross-Ecosystem Communication (Isomorphic Architecture)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Ecosystem A (Node.js Server)                         │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                           SystemBus                                     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│       ▲                       │                           │                  │
│       │ emit                  │ subscribe                 │ subscribe        │
│       │                       │                           │                  │
│  ┌────┴────────────┐          │                   ┌───────┴───────┐         │
│  │   Environment   │          │                   │    Driver     │         │
│  │  (ClaudeEnv)    │          │                   │               │         │
│  │                 │          │                   │ Claude SDK    │         │
│  │ - Anthropic API │          │                   │ → Agent       │         │
│  │ - MCP Servers   │          │                   └───────┬───────┘         │
│  └─────────────────┘          │                           │                  │
│                               │                           ▼                  │
│                               │     ┌─────────────────────────────────────┐ │
│                               │     │             Runtime                  │ │
│                               │     │  ┌─────────┐ ┌─────────┐ ┌────────┐ │ │
│                               │     │  │  Agent  │ │ Session │ │Container│ │ │
│                               │     │  └────┬────┘ └────┬────┘ └───┬────┘ │ │
│                               │     └───────│──────────│──────────│───────┘ │
│                               │             │          │          │         │
│                               │             ▼          ▼          ▼         │
│                               │     ┌─────────────────────────────────────┐ │
│                               └────►│            Receptors                 │ │
│                                     │  AgentReceptor  │  SessionReceptor  │ │
│                                     └────────┬────────┴─────────┬─────────┘ │
│                                              │                  │           │
└──────────────────────────────────────────────│──────────────────│───────────┘
                                               │                  │
                                               ▼                  ▼
                                       ┌─────────────────────────────┐
                                       │   EnvironmentEvent Output   │
                                       │   (Receptor API)            │
                                       └──────────────┬──────────────┘
                                                      │
                                                      │ Network Transport
                                                      │ (SSE / WebSocket)
                                                      │
                                                      │ EnvironmentEvent
                                                      ▼
                                       ┌──────────────┴──────────────┐
                                       │   EnvironmentEvent Input    │
                                       │   (RemoteEnvironment)       │
                                       └──────────────┬──────────────┘
                                                      │
┌─────────────────────────────────────────────────────│───────────────────────┐
│                         Ecosystem B (Browser)       │                        │
│                                                     │                        │
│  ┌──────────────────────────────────────────────────│─────────────────────┐ │
│  │                           SystemBus              │                      │ │
│  └──────────────────────────────────────────────────│─────────────────────┘ │
│       ▲                       │                     │         │              │
│       │ emit                  │ subscribe           │         │ subscribe    │
│       │                       │                     │         │              │
│  ┌────┴────────────┐          │                     │ ┌───────┴───────┐     │
│  │   Environment   │          │                     │ │    Driver     │     │
│  │  (RemoteEnv)    │◄─────────┼─────────────────────┘ │               │     │
│  │                 │          │                       │ Filters       │     │
│  │ - SSE Client    │          │                       │ EnvironmentEvent    │
│  │ - WebSocket     │          │                       │ for Agent     │     │
│  │                 │          │                       └───────┬───────┘     │
│  │ Receives events │          │                               │              │
│  │ from network    │          │                               ▼              │
│  └─────────────────┘          │     ┌─────────────────────────────────────┐ │
│                               │     │             Runtime                  │ │
│                               │     │  ┌─────────┐ ┌─────────┐ ┌────────┐ │ │
│                               │     │  │  Agent  │ │ Session │ │Container│ │ │
│                               │     │  │ (Proxy) │ │ (Proxy) │ │ (Proxy)│ │ │
│                               │     │  └────┬────┘ └────┬────┘ └───┬────┘ │ │
│                               │     └───────│──────────│──────────│───────┘ │
│                               │             │          │          │         │
│                               │             ▼          ▼          ▼         │
│                               │     ┌─────────────────────────────────────┐ │
│                               └────►│            Receptors                 │ │
│                                     │  AgentReceptor  │  SessionReceptor  │ │
│                                     └────────┬────────┴─────────┬─────────┘ │
│                                              │                  │           │
└──────────────────────────────────────────────│──────────────────│───────────┘
                                               │                  │
                                               ▼                  ▼
                                       ┌─────────────────────────────┐
                                       │         UI Layer            │
                                       │  - React Components         │
                                       │  - State Management         │
                                       └─────────────────────────────┘
```

## Event Flow

### EnvironmentEvent Types

```typescript
// Raw events from external world
type EnvironmentEventType =
  | "text_chunk" // Text fragment from LLM
  | "stream_start" // Stream begins
  | "stream_end" // Stream ends
  | "interrupted" // Stream interrupted
  | "connected" // Connection established
  | "disconnected"; // Connection lost
```

### Data Flow

1. **Environment** produces raw EnvironmentEvent
2. **SystemBus** distributes events to subscribers
3. **Driver** filters events and feeds Agent's Mealy Machine
4. **Agent/Session/Container** process and produce internal events
5. **Receptor** listens to Runtime components, exposes API to external consumers
6. **External Consumer** receives events (UI renders, Network transmits, etc.)

### Cross-Ecosystem Flow

```
Ecosystem A                    Network                    Ecosystem B
    │                            │                            │
    │  Receptor outputs          │                            │
    │  EnvironmentEvent  ───────►│ SSE/WebSocket              │
    │                            │ transmission   ───────────►│ RemoteEnvironment
    │                            │                            │ receives as
    │                            │                            │ EnvironmentEvent
    │                            │                            │
    │                            │                            │ Same processing
    │                            │                            │ as local
```

## Key Principles

### 1. Isomorphic Architecture

- Server and Browser use identical Ecosystem structure
- Only Environment implementation differs (Claude vs Remote)
- "Define Once, Run Anywhere"

### 2. Separation of Concerns

- **Environment**: External world interface (input)
- **Driver**: Event filtering for Agent (processing)
- **Receptor**: Event exposure to consumers (output)
- **SystemBus**: Event distribution hub (infrastructure)

### 3. EnvironmentEvent as Universal Protocol

- Single event type for all external communication
- Network-transportable
- Cross-ecosystem compatible

### 4. Receptor as API Gateway

- Listens to Runtime internals (Agent, Session, Container)
- Also subscribes to SystemBus for EnvironmentEvent
- Provides clean API for external consumption
- Enables cross-ecosystem communication

## Component Responsibilities

| Component   | Input                             | Output           | Responsibility           |
| ----------- | --------------------------------- | ---------------- | ------------------------ |
| Environment | External world (LLM, Network)     | EnvironmentEvent | Produce raw events       |
| SystemBus   | EnvironmentEvent                  | EnvironmentEvent | Distribute events        |
| Driver      | EnvironmentEvent                  | Filtered events  | Select events for Agent  |
| Agent       | Filtered events                   | AgentEvent       | Mealy Machine processing |
| Receptor    | Runtime events + EnvironmentEvent | API              | Expose to external       |

## Implementation Packages

- `@agentxjs/types` - Type definitions
- `@agentxjs/node-ecosystem` - Node.js Ecosystem (ClaudeEnvironment)
- `@agentxjs/remote-ecosystem` - Browser Ecosystem (RemoteEnvironment)
- `@agentxjs/network` - Transport layer (SSE, WebSocket)

## Related Issues

- Issue 027: Systems Theory Agent-Environment
- Issue 028: Reactor Pattern SystemBus Architecture
- Issue 029: Simplified Event Architecture
