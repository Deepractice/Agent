/**
 * Agent - Runtime instance interface
 *
 * Defines the contract for an Agent instance.
 * Implementation is in core (AgentInstance).
 *
 * Lifecycle:
 * - running: Active, can receive messages
 * - destroyed: Removed from memory, cannot be used
 *
 * API:
 * - receive(message): Send message to agent
 * - on(handler): Subscribe to all events
 * - on(type, handler): Subscribe to specific event type
 * - on(types, handler): Subscribe to multiple event types
 * - abort(): System/error forced stop
 * - interrupt(): User-initiated stop
 * - destroy(): Clean up resources
 */

import type { UserMessage } from "~/message";
import type { AgentState } from "~/AgentState";
import type { AgentDefinition } from "./AgentDefinition";
import type { AgentContext } from "./AgentContext";
import type { AgentLifecycle } from "./AgentLifecycle";
import type { AgentEventHandler, Unsubscribe } from "./AgentEventHandler";

// Stream Layer Events
import type {
  MessageStartEvent,
  MessageDeltaEvent,
  MessageStopEvent,
  TextContentBlockStartEvent,
  TextDeltaEvent,
  TextContentBlockStopEvent,
  ToolUseContentBlockStartEvent,
  InputJsonDeltaEvent,
  ToolUseContentBlockStopEvent,
  ToolCallEvent,
  ToolResultEvent,
} from "~/event/stream";

// Message Layer Events
import type {
  UserMessageEvent,
  AssistantMessageEvent,
  ToolUseMessageEvent,
  ErrorMessageEvent,
} from "~/event/message";

// Turn Layer Events
import type { TurnRequestEvent, TurnResponseEvent } from "~/event/turn";

/**
 * State change event payload
 */
export interface StateChange {
  prev: AgentState;
  current: AgentState;
}

/**
 * State change handler type
 */
export type StateChangeHandler = (change: StateChange) => void;

/**
 * Agent interface - Runtime instance contract
 */
export interface Agent {
  /**
   * Unique agent instance ID
   */
  readonly agentId: string;

  /**
   * Agent definition (static config)
   */
  readonly definition: AgentDefinition;

  /**
   * Agent context (runtime config)
   */
  readonly context: AgentContext;

  /**
   * Creation timestamp
   */
  readonly createdAt: number;

  /**
   * Current lifecycle state
   */
  readonly lifecycle: AgentLifecycle;

  /**
   * Current conversation state
   */
  readonly state: AgentState;

  /**
   * Receive a message from user
   *
   * @param message - String content or UserMessage object
   */
  receive(message: string | UserMessage): Promise<void>;

  /**
   * Subscribe to all events
   */
  on(handler: AgentEventHandler): Unsubscribe;

  // ===== Type-safe overloads for Stream Layer Events =====
  on(type: "message_start", handler: (event: MessageStartEvent) => void): Unsubscribe;
  on(type: "message_delta", handler: (event: MessageDeltaEvent) => void): Unsubscribe;
  on(type: "message_stop", handler: (event: MessageStopEvent) => void): Unsubscribe;
  on(type: "text_content_block_start", handler: (event: TextContentBlockStartEvent) => void): Unsubscribe;
  on(type: "text_delta", handler: (event: TextDeltaEvent) => void): Unsubscribe;
  on(type: "text_content_block_stop", handler: (event: TextContentBlockStopEvent) => void): Unsubscribe;
  on(type: "tool_use_content_block_start", handler: (event: ToolUseContentBlockStartEvent) => void): Unsubscribe;
  on(type: "input_json_delta", handler: (event: InputJsonDeltaEvent) => void): Unsubscribe;
  on(type: "tool_use_content_block_stop", handler: (event: ToolUseContentBlockStopEvent) => void): Unsubscribe;
  on(type: "tool_call", handler: (event: ToolCallEvent) => void): Unsubscribe;
  on(type: "tool_result", handler: (event: ToolResultEvent) => void): Unsubscribe;

  // ===== Type-safe overloads for Message Layer Events =====
  on(type: "user_message", handler: (event: UserMessageEvent) => void): Unsubscribe;
  on(type: "assistant_message", handler: (event: AssistantMessageEvent) => void): Unsubscribe;
  on(type: "tool_use_message", handler: (event: ToolUseMessageEvent) => void): Unsubscribe;
  on(type: "error_message", handler: (event: ErrorMessageEvent) => void): Unsubscribe;

  // ===== Type-safe overloads for Turn Layer Events =====
  on(type: "turn_request", handler: (event: TurnRequestEvent) => void): Unsubscribe;
  on(type: "turn_response", handler: (event: TurnResponseEvent) => void): Unsubscribe;

  /**
   * Subscribe to specific event type by name (fallback for custom/unknown types)
   * @param type - Event type string
   */
  on(type: string, handler: AgentEventHandler): Unsubscribe;

  /**
   * Subscribe to multiple event types by name
   * @param types - Array of event type strings
   */
  on(types: string[], handler: AgentEventHandler): Unsubscribe;

  /**
   * Subscribe to state changes
   *
   * @param handler - Callback receiving { prev, current } state change
   * @returns Unsubscribe function
   */
  onStateChange(handler: StateChangeHandler): Unsubscribe;

  /**
   * Abort - System/error forced stop
   */
  abort(): void;

  /**
   * Interrupt - User-initiated stop
   */
  interrupt(): void;

  /**
   * Destroy - Clean up resources
   */
  destroy(): Promise<void>;
}
