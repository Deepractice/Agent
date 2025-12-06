/**
 * Agent State Events
 *
 * Events that trigger AgentState transitions.
 * - source: "agent"
 * - category: "state"
 * - intent: "notification"
 *
 * Note: These are events that AFFECT state, not "state" themselves.
 */

import type { BaseAgentEvent } from "../BaseAgentEvent";

/**
 * Base type for state events
 */
export interface AgentStateEventBase<T extends string, D>
  extends BaseAgentEvent<T, D, "state"> {}

// ============================================================================
// Conversation Events
// ============================================================================

/**
 * ConversationQueuedEvent - Message queued for processing
 */
export interface ConversationQueuedEvent extends AgentStateEventBase<"conversation_queued", {
  messageId: string;
}> {}

/**
 * ConversationStartEvent - Conversation started
 */
export interface ConversationStartEvent extends AgentStateEventBase<"conversation_start", {
  messageId: string;
}> {}

/**
 * ConversationThinkingEvent - Agent is thinking
 */
export interface ConversationThinkingEvent extends AgentStateEventBase<"conversation_thinking", Record<string, never>> {}

/**
 * ConversationRespondingEvent - Agent is responding
 */
export interface ConversationRespondingEvent extends AgentStateEventBase<"conversation_responding", Record<string, never>> {}

/**
 * ConversationEndEvent - Conversation ended
 */
export interface ConversationEndEvent extends AgentStateEventBase<"conversation_end", {
  reason: "completed" | "interrupted" | "error";
}> {}

/**
 * ConversationInterruptedEvent - Conversation interrupted
 */
export interface ConversationInterruptedEvent extends AgentStateEventBase<"conversation_interrupted", {
  reason: string;
}> {}

// ============================================================================
// Tool Events
// ============================================================================

/**
 * ToolPlannedEvent - Tool use planned
 */
export interface ToolPlannedEvent extends AgentStateEventBase<"tool_planned", {
  toolId: string;
  toolName: string;
}> {}

/**
 * ToolExecutingEvent - Tool is executing
 */
export interface ToolExecutingEvent extends AgentStateEventBase<"tool_executing", {
  toolId: string;
  toolName: string;
  input: Record<string, unknown>;
}> {}

/**
 * ToolCompletedEvent - Tool execution completed
 */
export interface ToolCompletedEvent extends AgentStateEventBase<"tool_completed", {
  toolId: string;
  toolName: string;
  result: unknown;
}> {}

/**
 * ToolFailedEvent - Tool execution failed
 */
export interface ToolFailedEvent extends AgentStateEventBase<"tool_failed", {
  toolId: string;
  toolName: string;
  error: string;
}> {}

// ============================================================================
// Error Events
// ============================================================================

/**
 * ErrorOccurredEvent - Error occurred during processing
 */
export interface ErrorOccurredEvent extends AgentStateEventBase<"error_occurred", {
  code: string;
  message: string;
  recoverable: boolean;
  category?: string;
}> {}

// ============================================================================
// Union Type
// ============================================================================

/**
 * AgentStateEvent - All state events
 */
export type AgentStateEvent =
  // Conversation
  | ConversationQueuedEvent
  | ConversationStartEvent
  | ConversationThinkingEvent
  | ConversationRespondingEvent
  | ConversationEndEvent
  | ConversationInterruptedEvent
  // Tool
  | ToolPlannedEvent
  | ToolExecutingEvent
  | ToolCompletedEvent
  | ToolFailedEvent
  // Error
  | ErrorOccurredEvent;

/**
 * AgentStateEventType - String literal union
 */
export type AgentStateEventType = AgentStateEvent["type"];

/**
 * Type guard: is this a state event?
 */
export function isAgentStateEvent(event: { source?: string; category?: string }): event is AgentStateEvent {
  return event.source === "agent" && event.category === "state";
}
