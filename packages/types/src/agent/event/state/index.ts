/**
 * Engine State Events (Lightweight)
 *
 * Lightweight state events for AgentEngine internal use.
 * Derived from full AgentStateEvent in @agentxjs/types/event/agent.
 */

import type {
  AgentStateEvent as FullAgentStateEvent,
  ConversationQueuedEvent as FullConversationQueuedEvent,
  ConversationStartEvent as FullConversationStartEvent,
  ConversationThinkingEvent as FullConversationThinkingEvent,
  ConversationRespondingEvent as FullConversationRespondingEvent,
  ConversationEndEvent as FullConversationEndEvent,
  ConversationInterruptedEvent as FullConversationInterruptedEvent,
  ToolPlannedEvent as FullToolPlannedEvent,
  ToolExecutingEvent as FullToolExecutingEvent,
  ToolCompletedEvent as FullToolCompletedEvent,
  ToolFailedEvent as FullToolFailedEvent,
  ErrorOccurredEvent as FullErrorOccurredEvent,
} from "~/event/agent/state";
import type { EngineEvent, ToEngineEvent, ToEngineEventUnion } from "../EngineEvent";

// ============================================================================
// Base Type (for backward compatibility)
// ============================================================================

/**
 * StateEvent - Base type for state events
 * @deprecated Use specific event types instead
 */
export interface StateEvent<T extends string = string, D = unknown> extends EngineEvent<T, D> {}

// ============================================================================
// Lightweight Event Types
// ============================================================================

export type ConversationQueuedEvent = ToEngineEvent<FullConversationQueuedEvent>;
export type ConversationStartEvent = ToEngineEvent<FullConversationStartEvent>;
export type ConversationThinkingEvent = ToEngineEvent<FullConversationThinkingEvent>;
export type ConversationRespondingEvent = ToEngineEvent<FullConversationRespondingEvent>;
export type ConversationEndEvent = ToEngineEvent<FullConversationEndEvent>;
export type ConversationInterruptedEvent = ToEngineEvent<FullConversationInterruptedEvent>;
export type ToolPlannedEvent = ToEngineEvent<FullToolPlannedEvent>;
export type ToolExecutingEvent = ToEngineEvent<FullToolExecutingEvent>;
export type ToolCompletedEvent = ToEngineEvent<FullToolCompletedEvent>;
export type ToolFailedEvent = ToEngineEvent<FullToolFailedEvent>;
export type ErrorOccurredEvent = ToEngineEvent<FullErrorOccurredEvent>;

/**
 * Alias for ErrorOccurredEvent (legacy compatibility)
 */
export type AgentErrorOccurredEvent = ErrorOccurredEvent;

/**
 * AgentStateEvent - All lightweight state events
 */
export type AgentStateEvent = ToEngineEventUnion<FullAgentStateEvent>;

/**
 * Type guard: is this a state event?
 */
export function isStateEvent(event: EngineEvent): event is AgentStateEvent {
  const stateTypes = [
    "conversation_queued",
    "conversation_start",
    "conversation_thinking",
    "conversation_responding",
    "conversation_end",
    "conversation_interrupted",
    "tool_planned",
    "tool_executing",
    "tool_completed",
    "tool_failed",
    "error_occurred",
  ];
  return stateTypes.includes(event.type);
}
