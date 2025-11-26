/**
 * Presenter - Output adapter for AgentX Engine
 *
 * A Presenter receives processor outputs and presents them to external systems.
 * This is the business-specific version of Mealy's Sink type.
 *
 * Pattern: (agentId, output) => void | Promise<void>
 *
 * Key Design:
 * - Single output per call (not array) for sequential processing
 * - Outputs are re-injected into the system for event chaining
 * - Type-safe helpers for filtering specific event types
 *
 * Layering:
 * - Mealy Layer: Sink<TOutput[]> (generic, batch)
 * - Engine Layer: Presenter (single output, sequential)
 * - Framework Layer: definePresenter() (adds lifecycle, config)
 *
 * @example
 * ```typescript
 * // Raw presenter - handle all output types
 * const rawPresenter: Presenter = (id, output) => {
 *   if (output.type === "text_delta") {
 *     process.stdout.write(output.data.text);
 *   }
 * };
 *
 * // Type-safe presenter - only stream events
 * const ssePresenter = createStreamPresenter((id, event) => {
 *   sseConnection.send(id, event);
 * });
 *
 * // Type-safe presenter - only message events
 * const uiPresenter = createMessagePresenter((id, event) => {
 *   setMessages(prev => [...prev, event.data]);
 * });
 * ```
 */

import type {
  StreamEventType,
  StateEventType,
  MessageEventType,
  TurnEventType,
} from "@deepractice-ai/agentx-event";

// ===== Output Type =====

/**
 * All possible output types from AgentProcessor
 *
 * Includes:
 * - StreamEventType: Pass-through raw stream events
 * - StateEventType: State machine transitions
 * - MessageEventType: Assembled messages
 * - TurnEventType: Turn analytics
 */
export type AgentOutput = StreamEventType | StateEventType | MessageEventType | TurnEventType;

// ===== Base Presenter =====

/**
 * Presenter - Presents single output to external systems
 *
 * Unlike Mealy's Sink which receives batches, Presenter receives
 * one output at a time for sequential processing.
 */
export type Presenter = (agentId: string, output: AgentOutput) => void | Promise<void>;

// ===== Typed Presenters =====

/**
 * StreamPresenter - Only receives raw stream events
 */
export type StreamPresenter = (agentId: string, event: StreamEventType) => void | Promise<void>;

/**
 * StatePresenter - Only receives state transition events
 */
export type StatePresenter = (agentId: string, event: StateEventType) => void | Promise<void>;

/**
 * MessagePresenter - Only receives assembled message events
 */
export type MessagePresenter = (agentId: string, event: MessageEventType) => void | Promise<void>;

/**
 * TurnPresenter - Only receives turn analytics events
 */
export type TurnPresenter = (agentId: string, event: TurnEventType) => void | Promise<void>;

// ===== Type Guards =====

/**
 * Stream event types for filtering
 */
const STREAM_EVENT_TYPES = new Set([
  "message_start",
  "message_delta",
  "message_stop",
  "text_content_block_start",
  "text_delta",
  "text_content_block_stop",
  "tool_use_content_block_start",
  "input_json_delta",
  "tool_use_content_block_stop",
  "tool_call",
  "tool_result",
]);

/**
 * State event types for filtering
 */
const STATE_EVENT_TYPES = new Set([
  "agent_initializing",
  "agent_ready",
  "agent_destroyed",
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
 * Message event types for filtering
 */
const MESSAGE_EVENT_TYPES = new Set([
  "user_message",
  "assistant_message",
  "tool_use_message",
  "error_message",
]);

/**
 * Turn event types for filtering
 */
const TURN_EVENT_TYPES = new Set(["turn_request", "turn_response"]);

export function isStreamEvent(output: AgentOutput): output is StreamEventType {
  return STREAM_EVENT_TYPES.has(output.type);
}

export function isStateEvent(output: AgentOutput): output is StateEventType {
  return STATE_EVENT_TYPES.has(output.type);
}

export function isMessageEvent(output: AgentOutput): output is MessageEventType {
  return MESSAGE_EVENT_TYPES.has(output.type);
}

export function isTurnEvent(output: AgentOutput): output is TurnEventType {
  return TURN_EVENT_TYPES.has(output.type);
}

// ===== Helper Functions =====

/**
 * Create a Presenter that only receives stream events
 *
 * @example
 * ```typescript
 * const ssePresenter = createStreamPresenter((id, event) => {
 *   // event is StreamEventType, fully typed
 *   sseConnection.send(id, event);
 * });
 * ```
 */
export function createStreamPresenter(handler: StreamPresenter): Presenter {
  return (agentId, output) => {
    if (isStreamEvent(output)) {
      return handler(agentId, output);
    }
  };
}

/**
 * Create a Presenter that only receives state events
 *
 * @example
 * ```typescript
 * const statePresenter = createStatePresenter((id, event) => {
 *   // event is StateEventType, fully typed
 *   updateUIState(event);
 * });
 * ```
 */
export function createStatePresenter(handler: StatePresenter): Presenter {
  return (agentId, output) => {
    if (isStateEvent(output)) {
      return handler(agentId, output);
    }
  };
}

/**
 * Create a Presenter that only receives message events
 *
 * @example
 * ```typescript
 * const uiPresenter = createMessagePresenter((id, event) => {
 *   // event is MessageEventType, fully typed
 *   setMessages(prev => [...prev, event.data]);
 * });
 * ```
 */
export function createMessagePresenter(handler: MessagePresenter): Presenter {
  return (agentId, output) => {
    if (isMessageEvent(output)) {
      return handler(agentId, output);
    }
  };
}

/**
 * Create a Presenter that only receives turn events
 *
 * @example
 * ```typescript
 * const analyticsPresenter = createTurnPresenter((id, event) => {
 *   // event is TurnEventType, fully typed
 *   trackAnalytics(event.data);
 * });
 * ```
 */
export function createTurnPresenter(handler: TurnPresenter): Presenter {
  return (agentId, output) => {
    if (isTurnEvent(output)) {
      return handler(agentId, output);
    }
  };
}

// ===== Presenter Definition =====

/**
 * PresenterDefinition - Named Presenter with metadata
 *
 * Use this when you need to identify presenters by name.
 */
export interface PresenterDefinition {
  /**
   * Unique name for this presenter
   */
  name: string;

  /**
   * Optional description
   */
  description?: string;

  /**
   * The presenter function
   */
  presenter: Presenter;
}
