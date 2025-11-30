/**
 * ReactHandlerMapper
 *
 * Maps React-style handler names (onXxx) to event type keys.
 * Provides a fluent API for event subscription.
 */

import type { ReactHandlerMap, EventHandlerMap } from "@deepractice-ai/agentx-types";

/**
 * Mapping from ReactHandlerMap keys to EventHandlerMap keys
 */
const REACT_TO_EVENT_MAP: Record<keyof ReactHandlerMap, keyof EventHandlerMap> = {
  // Stream Layer Events
  onMessageStart: "message_start",
  onMessageDelta: "message_delta",
  onMessageStop: "message_stop",
  onTextContentBlockStart: "text_content_block_start",
  onTextDelta: "text_delta",
  onTextContentBlockStop: "text_content_block_stop",
  onToolUseContentBlockStart: "tool_use_content_block_start",
  onInputJsonDelta: "input_json_delta",
  onToolUseContentBlockStop: "tool_use_content_block_stop",
  onToolCall: "tool_call",
  onToolResult: "tool_result",
  // Message Layer Events
  onUserMessage: "user_message",
  onAssistantMessage: "assistant_message",
  onToolCallMessage: "tool_call_message",
  onToolResultMessage: "tool_result_message",
  // Error Layer Events (independent, transportable via SSE)
  onError: "error",
  // Turn Layer Events
  onTurnRequest: "turn_request",
  onTurnResponse: "turn_response",
};

/**
 * Convert ReactHandlerMap to EventHandlerMap
 *
 * @param reactHandlers - React-style handlers (onXxx)
 * @returns Event handler map (event_type keys)
 *
 * @example
 * ```typescript
 * const eventMap = mapReactHandlers({
 *   onTextDelta: (e) => console.log(e.data.text),
 *   onError: (e) => console.error(e.data.error),
 * });
 * // Returns: { text_delta: fn, error_message: fn }
 * ```
 */
export function mapReactHandlers(reactHandlers: ReactHandlerMap): EventHandlerMap {
  const eventHandlerMap: EventHandlerMap = {};

  for (const [reactKey, eventKey] of Object.entries(REACT_TO_EVENT_MAP)) {
    const handler = reactHandlers[reactKey as keyof ReactHandlerMap];
    if (handler) {
      (eventHandlerMap as Record<string, unknown>)[eventKey] = handler;
    }
  }

  return eventHandlerMap;
}

/**
 * Get all supported React handler names
 */
export function getReactHandlerNames(): (keyof ReactHandlerMap)[] {
  return Object.keys(REACT_TO_EVENT_MAP) as (keyof ReactHandlerMap)[];
}

/**
 * Get the event type for a React handler name
 */
export function getEventTypeForReactHandler(
  reactKey: keyof ReactHandlerMap
): keyof EventHandlerMap {
  return REACT_TO_EVENT_MAP[reactKey];
}
