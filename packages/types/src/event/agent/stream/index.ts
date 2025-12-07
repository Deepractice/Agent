/**
 * Agent Stream Events
 *
 * Real-time streaming events from LLM.
 * - source: "agent"
 * - category: "stream"
 * - intent: "notification"
 *
 * Note: These have same event types as DriveableEvent (environment/stream),
 * but with full SystemEvent structure (source, category, intent, context).
 */

import type { BaseAgentEvent } from "../BaseAgentEvent";

/**
 * Base type for stream events
 */
export interface AgentStreamEventBase<T extends string, D>
  extends BaseAgentEvent<T, D, "stream"> {}

// ============================================================================
// Stop Reason
// ============================================================================

/**
 * Stop reason for message completion
 */
export type StopReason = "end_turn" | "max_tokens" | "stop_sequence" | "tool_use";

// ============================================================================
// Message Lifecycle Events
// ============================================================================

/**
 * AgentMessageStartEvent - Streaming message begins
 */
export interface AgentMessageStartEvent extends AgentStreamEventBase<"message_start", {
  messageId: string;
  model: string;
}> {}

/**
 * AgentMessageDeltaEvent - Message-level updates (usage info)
 */
export interface AgentMessageDeltaEvent extends AgentStreamEventBase<"message_delta", {
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}> {}

/**
 * AgentMessageStopEvent - Streaming message completes
 */
export interface AgentMessageStopEvent extends AgentStreamEventBase<"message_stop", {
  stopReason?: StopReason;
}> {}

// ============================================================================
// Text Content Events
// ============================================================================

/**
 * AgentTextDeltaEvent - Incremental text output
 */
export interface AgentTextDeltaEvent extends AgentStreamEventBase<"text_delta", {
  text: string;
}> {}

// ============================================================================
// Tool Use Events
// ============================================================================

/**
 * AgentToolUseStartEvent - Tool use block started
 */
export interface AgentToolUseStartEvent extends AgentStreamEventBase<"tool_use_start", {
  toolCallId: string;
  toolName: string;
}> {}

/**
 * AgentInputJsonDeltaEvent - Incremental tool input JSON
 */
export interface AgentInputJsonDeltaEvent extends AgentStreamEventBase<"input_json_delta", {
  partialJson: string;
}> {}

/**
 * AgentToolUseStopEvent - Tool use block completed
 */
export interface AgentToolUseStopEvent extends AgentStreamEventBase<"tool_use_stop", {
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
}> {}

/**
 * AgentToolResultEvent - Tool execution result
 */
export interface AgentToolResultEvent extends AgentStreamEventBase<"tool_result", {
  toolCallId: string;
  result: unknown;
  isError?: boolean;
}> {}

// ============================================================================
// Error Events
// ============================================================================

/**
 * AgentErrorReceivedEvent - Error received from environment
 *
 * Processed by MealyMachine to produce:
 * - error_occurred (StateEvent)
 * - error_message (MessageEvent)
 */
export interface AgentErrorReceivedEvent extends AgentStreamEventBase<"error_received", {
  /** Error message (human-readable) */
  message: string;
  /** Error code (e.g., "rate_limit_error", "api_error") */
  errorCode?: string;
}> {}

// ============================================================================
// Union Type
// ============================================================================

/**
 * AgentStreamEvent - All stream events
 */
export type AgentStreamEvent =
  | AgentMessageStartEvent
  | AgentMessageDeltaEvent
  | AgentMessageStopEvent
  | AgentTextDeltaEvent
  | AgentToolUseStartEvent
  | AgentInputJsonDeltaEvent
  | AgentToolUseStopEvent
  | AgentToolResultEvent
  | AgentErrorReceivedEvent;

/**
 * AgentStreamEventType - String literal union
 */
export type AgentStreamEventType = AgentStreamEvent["type"];

/**
 * Type guard: is this a stream event?
 */
export function isAgentStreamEvent(event: { source?: string; category?: string }): event is AgentStreamEvent {
  return event.source === "agent" && event.category === "stream";
}
