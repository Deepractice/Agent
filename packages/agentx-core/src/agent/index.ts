/**
 * Agent module exports
 *
 * Types/interfaces are re-exported from @deepractice-ai/agentx-types.
 * Implementations and utilities are defined here.
 */

// Re-export types from @deepractice-ai/agentx-types
export type {
  Agent,
  AgentDriver,
  AgentPresenter,
  AgentDefinition,
  AgentContainer,
  AgentContext,
  AgentContextBase,
  AgentOutput,
  AgentLifecycle,
  AgentEventHandler,
  AgentEventType,
  Unsubscribe,
  StateChange,
  StateChangeHandler,
  // Event Bus types
  AgentEventBus as IAgentEventBus,
  EventProducer,
  EventConsumer,
  EventHandler,
  SubscribeOptions,
} from "@deepractice-ai/agentx-types";

// Implementation
export { AgentInstance } from "./AgentInstance";

// State Machine
export { AgentStateMachine } from "./AgentStateMachine";
export type { StateChangeHandler as StateMachineHandler } from "./AgentStateMachine";

// Event Bus implementation
export { AgentEventBus } from "./AgentEventBus";

// Container implementation
export { MemoryAgentContainer } from "./MemoryAgentContainer";

// Context utilities
export { generateAgentId, createAgentContext } from "./AgentContext";
