/**
 * Engine Message Events (Lightweight)
 *
 * Lightweight message events for AgentEngine internal use.
 * Derived from full AgentMessageEvent in @agentxjs/types/event/agent.
 */

import type {
  AgentMessageEvent as FullAgentMessageEvent,
  UserMessageEvent as FullUserMessageEvent,
  AssistantMessageEvent as FullAssistantMessageEvent,
  ToolCallMessageEvent as FullToolCallMessageEvent,
  ToolResultMessageEvent as FullToolResultMessageEvent,
  ErrorMessageEvent as FullErrorMessageEvent,
} from "~/event/agent/message";
import type { EngineEvent, ToEngineEvent, ToEngineEventUnion } from "../EngineEvent";

// Re-export parts (they're not events, just types)
export type { ContentPart, ToolCallPart, ToolResultPart } from "../../message/parts";

// ============================================================================
// Base Type (for backward compatibility)
// ============================================================================

/**
 * MessageEvent - Base type for message events
 * @deprecated Use specific event types instead
 */
export interface MessageEvent<T extends string = string, D = unknown> extends EngineEvent<T, D> {}

// ============================================================================
// Lightweight Event Types
// ============================================================================

export type UserMessageEvent = ToEngineEvent<FullUserMessageEvent>;
export type AssistantMessageEvent = ToEngineEvent<FullAssistantMessageEvent>;
export type ToolCallMessageEvent = ToEngineEvent<FullToolCallMessageEvent>;
export type ToolResultMessageEvent = ToEngineEvent<FullToolResultMessageEvent>;
export type ErrorMessageEvent = ToEngineEvent<FullErrorMessageEvent>;

/**
 * AgentMessageEvent - All lightweight message events
 */
export type AgentMessageEvent = ToEngineEventUnion<FullAgentMessageEvent>;

/**
 * Type guard: is this a message event?
 */
export function isMessageEvent(event: EngineEvent): event is AgentMessageEvent {
  const messageTypes = [
    "user_message",
    "assistant_message",
    "tool_call_message",
    "tool_result_message",
    "error_message",
  ];
  return messageTypes.includes(event.type);
}
