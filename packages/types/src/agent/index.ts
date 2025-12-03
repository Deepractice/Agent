/**
 * Agent Contract Layer
 *
 * All interfaces and types defining the Agent system contracts.
 * Implementation is in agentxjs-core.
 *
 * ## Design Decision: Contract-First Architecture
 *
 * Types package defines contracts, implementation packages implement them.
 * This separation enables:
 * - Multiple implementations of the same contract
 * - Cross-package type safety without circular dependencies
 * - Clear API boundaries between packages
 *
 * ## Core Abstractions
 *
 * ```text
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    Agent Architecture                          │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                                                                 │
 * │  User Input                                                     │
 * │      │                                                          │
 * │      ▼                                                          │
 * │  ┌─────────────────┐                                            │
 * │  │   Middleware    │  ← Intercept incoming messages             │
 * │  └────────┬────────┘                                            │
 * │           ▼                                                     │
 * │  ┌─────────────────┐                                            │
 * │  │     Driver      │  ← Process message, yield StreamEvents     │
 * │  └────────┬────────┘                                            │
 * │           ▼                                                     │
 * │  ┌─────────────────┐                                            │
 * │  │     Engine      │  ← Mealy Machine: Stream → State/Message   │
 * │  └────────┬────────┘                                            │
 * │           ▼                                                     │
 * │  ┌─────────────────┐                                            │
 * │  │   Interceptor   │  ← Intercept outgoing events               │
 * │  └────────┬────────┘                                            │
 * │           ▼                                                     │
 * │  ┌─────────────────┐                                            │
 * │  │    EventBus     │  ← Distribute to subscribers               │
 * │  └────────┬────────┘                                            │
 * │           ▼                                                     │
 * │  ┌─────────────────┐                                            │
 * │  │    Presenter    │  ← Side effects (logging, webhooks)        │
 * │  └─────────────────┘                                            │
 * │                                                                 │
 * └─────────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Design Decision: Agent-as-Driver Pattern
 *
 * Agent implements the same interface as Driver, enabling composition:
 *
 * ```typescript
 * const agentA = createAgent({ driver: ClaudeDriver });
 * const agentB = createAgent({ driver: agentA }); // Agent as driver!
 * const agentC = createAgent({ driver: agentB }); // Chain continues!
 * ```
 *
 * This allows:
 * - Unlimited nesting of agents
 * - Each layer can add middleware, interceptors, presenters
 * - Clean separation of concerns
 *
 * ## Design Decision: Middleware vs Interceptor
 *
 * | Aspect      | Middleware            | Interceptor              |
 * |-------------|----------------------|--------------------------|
 * | Direction   | Incoming (before)    | Outgoing (after)         |
 * | Input       | UserMessage          | AgentOutput (events)     |
 * | Use Case    | Rate limit, auth     | Filter, transform events |
 * | Can Block   | Yes (don't call next)| Yes (don't call next)    |
 */

// Core interface
export type {
  Agent,
  StateChange,
  StateChangeHandler,
  EventHandlerMap,
  ReactHandlerMap,
} from "./Agent";

// Driver & Presenter
export type { AgentDriver } from "./AgentDriver";
export type { AgentPresenter } from "./AgentPresenter";

// Config & Definition
export type { AgentConfig } from "./AgentConfig";
// AgentDefinition moved to ~/definition, re-export for backwards compatibility
export type { AgentDefinition } from "~/environment/definition";

// Context
export type { AgentContext } from "./AgentContext";

// Output
export type { AgentOutput } from "./AgentOutput";

// Lifecycle & State
export type { AgentLifecycle } from "./AgentLifecycle";

// Event handling
export type { AgentEventHandler, Unsubscribe } from "./AgentEventHandler";

// Middleware & Interceptor
export type { AgentMiddleware, AgentMiddlewareNext } from "./AgentMiddleware";
export type { AgentInterceptor, AgentInterceptorNext } from "./AgentInterceptor";

// Event Bus
export type {
  EventHandler,
  SubscribeOptions,
  EventProducer,
  EventConsumer,
  AgentEventBus,
} from "./AgentEventBus";
