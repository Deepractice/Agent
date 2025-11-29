/**
 * Event Type Guards
 *
 * Runtime type guards for event classification.
 */

import type { AgentOutput } from "~/agent/AgentOutput";
import type { StateEventType } from "~/event/state";
import type { StreamEventType } from "~/event/stream";
import type { MessageEventType } from "~/event/message";
import type { TurnEventType } from "~/event/turn";

/**
 * State event type names
 */
const STATE_EVENT_TYPES = new Set([
  "agent_initializing",
  "agent_ready",
  "agent_destroyed",
  "conversation_queued",
  "conversation_start",
  "conversation_thinking",
  "conversation_responding",
  "conversation_end",
  "tool_planned",
  "tool_executing",
  "tool_completed",
  "tool_failed",
  "error_occurred",
]);

/**
 * Message event type names
 */
const MESSAGE_EVENT_TYPES = new Set([
  "user_message",
  "assistant_message",
  "tool_call_message",
  "tool_result_message",
  "error_message",
]);

/**
 * Turn event type names
 */
const TURN_EVENT_TYPES = new Set(["turn_request", "turn_response"]);

/**
 * Check if event is a StateEvent
 */
export function isStateEvent(event: AgentOutput): event is StateEventType {
  return "type" in event && STATE_EVENT_TYPES.has(event.type);
}

/**
 * Check if event is a MessageEvent
 */
export function isMessageEvent(event: AgentOutput): event is MessageEventType {
  return "type" in event && MESSAGE_EVENT_TYPES.has(event.type);
}

/**
 * Check if event is a TurnEvent
 */
export function isTurnEvent(event: AgentOutput): event is TurnEventType {
  return "type" in event && TURN_EVENT_TYPES.has(event.type);
}

/**
 * Check if event is a StreamEvent (not State, Message, or Turn)
 */
export function isStreamEvent(event: AgentOutput): event is StreamEventType {
  return (
    "type" in event &&
    !STATE_EVENT_TYPES.has(event.type) &&
    !MESSAGE_EVENT_TYPES.has(event.type) &&
    !TURN_EVENT_TYPES.has(event.type)
  );
}
