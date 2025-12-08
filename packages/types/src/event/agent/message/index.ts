/**
 * Agent Message Events
 *
 * Complete message events assembled from stream events.
 * Events directly wrap Message objects - no transformation needed.
 * - source: "agent"
 * - category: "message"
 * - intent: "notification"
 */

import type { BaseAgentEvent } from "../BaseAgentEvent";
import type {
  UserMessage,
  AssistantMessage,
  ToolCallMessage,
  ToolResultMessage,
  ErrorMessage,
} from "~/agent/message";

/**
 * Base type for message events
 */
export interface AgentMessageEventBase<T extends string, D>
  extends BaseAgentEvent<T, D, "message"> {}

// ============================================================================
// Message Events
// ============================================================================

/**
 * UserMessageEvent - User sent a message
 * Data: Complete UserMessage object
 */
export interface UserMessageEvent extends AgentMessageEventBase<"user_message", UserMessage> {}

/**
 * AssistantMessageEvent - Assistant response message
 * Data: Complete AssistantMessage object
 */
export interface AssistantMessageEvent
  extends AgentMessageEventBase<"assistant_message", AssistantMessage> {}

/**
 * ToolCallMessageEvent - Tool call message (part of assistant turn)
 * Data: Complete ToolCallMessage object
 */
export interface ToolCallMessageEvent
  extends AgentMessageEventBase<"tool_call_message", ToolCallMessage> {}

/**
 * ToolResultMessageEvent - Tool result message
 * Data: Complete ToolResultMessage object
 */
export interface ToolResultMessageEvent
  extends AgentMessageEventBase<"tool_result_message", ToolResultMessage> {}

/**
 * ErrorMessageEvent - Error message displayed in chat
 * Data: Complete ErrorMessage object
 *
 * Generated when error_received StreamEvent is processed by MealyMachine.
 * Displayed in the chat history so users can see what went wrong.
 */
export interface ErrorMessageEvent extends AgentMessageEventBase<"error_message", ErrorMessage> {}

// ============================================================================
// Union Type
// ============================================================================

/**
 * AgentMessageEvent - All message events
 */
export type AgentMessageEvent =
  | UserMessageEvent
  | AssistantMessageEvent
  | ToolCallMessageEvent
  | ToolResultMessageEvent
  | ErrorMessageEvent;

/**
 * AgentMessageEventType - String literal union
 */
export type AgentMessageEventType = AgentMessageEvent["type"];

/**
 * Type guard: is this a message event?
 */
export function isAgentMessageEvent(event: {
  source?: string;
  category?: string;
}): event is AgentMessageEvent {
  return event.source === "agent" && event.category === "message";
}
