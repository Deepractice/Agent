/**
 * Agent Contract Layer
 *
 * All interfaces and types defining the Agent system contracts.
 * Implementation is in @deepractice-ai/agentx-core.
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
export type { AgentDriver, DriverClass } from "./AgentDriver";
export type { AgentPresenter } from "./AgentPresenter";

// Definition & Container
export type { AgentDefinition } from "./AgentDefinition";
export type { AgentContainer } from "./AgentContainer";

// Context
export type { AgentContext, AgentContextBase } from "./AgentContext";

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
