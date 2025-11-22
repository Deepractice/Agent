/**
 * @deepractice-ai/agentx-engine
 *
 * Runtime engine for AgentX ecosystem - Core event processing and state management
 */

// ==================== Core Agent Runtime ====================
// NOTE: AgentService has been moved to @deepractice-ai/agentx-core
export type { EngineConfig } from "./AgentEngine";
export { AgentEngine } from "./AgentEngine";

// ==================== Interfaces (SPI Contracts) ====================
// EventBus interfaces (moved from agentx-event)
export type { EventBus } from "./bus/EventBus";
export type { EventProducer } from "./bus/EventProducer";
export type { EventConsumer, Unsubscribe } from "./bus/EventConsumer";

// Driver interface
export type { AgentDriver } from "./AgentDriver";

// Agent reactor and context
export type { AgentReactor, AgentReactorContext } from "./AgentReactor";
export type { AgentContext } from "./AgentContext";

// 4-Layer Reactor interfaces (user-friendly)
export type { StreamReactor } from "./StreamReactor";
export type { StateReactor } from "./StateReactor";
export type { MessageReactor } from "./MessageReactor";
export type { TurnReactor } from "./TurnReactor";

// ==================== Utilities ====================
// Stream event building utility
export { StreamEventBuilder } from "./StreamEventBuilder";

// Error emission utility
export { emitError } from "./emitError";

// Reactor adapters - convert layer interfaces to AgentReactor
export {
  StreamReactorAdapter,
  StateReactorAdapter,
  MessageReactorAdapter,
  TurnReactorAdapter,
  createReactorAdapter,
  type ReactorAdapter,
} from "./ReactorAdapter";
