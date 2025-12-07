/**
 * Agent Message Events
 *
 * Complete message events assembled from stream events.
 * - source: "agent"
 * - category: "message"
 * - intent: "notification"
 */

import type { BaseAgentEvent } from "../BaseAgentEvent";
import type { ContentPart, ToolCallPart, ToolResultPart } from "~/agent/message/parts";

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
 */
export interface UserMessageEvent
  extends AgentMessageEventBase<
    "user_message",
    {
      messageId: string;
      content: string;
      timestamp: number;
    }
  > {}

/**
 * AssistantMessageEvent - Assistant response message
 */
export interface AssistantMessageEvent
  extends AgentMessageEventBase<
    "assistant_message",
    {
      messageId: string;
      content: ContentPart[];
      model?: string;
      stopReason?: string;
      timestamp: number;
    }
  > {}

/**
 * ToolCallMessageEvent - Tool call message (part of assistant turn)
 */
export interface ToolCallMessageEvent
  extends AgentMessageEventBase<
    "tool_call_message",
    {
      messageId: string;
      toolCalls: ToolCallPart[];
      timestamp: number;
    }
  > {}

/**
 * ToolResultMessageEvent - Tool result message
 */
export interface ToolResultMessageEvent
  extends AgentMessageEventBase<
    "tool_result_message",
    {
      messageId: string;
      results: ToolResultPart[];
      timestamp: number;
    }
  > {}

/**
 * ErrorMessageEvent - Error message displayed in chat
 *
 * Generated when error_received StreamEvent is processed by MealyMachine.
 * Displayed in the chat history so users can see what went wrong.
 */
export interface ErrorMessageEvent
  extends AgentMessageEventBase<
    "error_message",
    {
      messageId: string;
      /** Error message (human-readable) */
      content: string;
      /** Error code (e.g., "rate_limit_error", "api_error") */
      errorCode?: string;
      timestamp: number;
    }
  > {}

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
