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
import type { AgentMiddleware } from "./AgentMiddleware";
import type { AgentInterceptor } from "./AgentInterceptor";

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
  ToolCallMessageEvent,
  ToolResultMessageEvent,
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
 * Event handler map for batch subscription
 *
 * Usage:
 * ```typescript
 * agent.on({
 *   text_delta: (event) => console.log(event.data.text),
 *   assistant_message: (event) => setMessages(prev => [...prev, event.data]),
 *   error_message: (event) => setError(event.data),
 * });
 * ```
 */
export interface EventHandlerMap {
  // Stream Layer Events
  message_start?: (event: MessageStartEvent) => void;
  message_delta?: (event: MessageDeltaEvent) => void;
  message_stop?: (event: MessageStopEvent) => void;
  text_content_block_start?: (event: TextContentBlockStartEvent) => void;
  text_delta?: (event: TextDeltaEvent) => void;
  text_content_block_stop?: (event: TextContentBlockStopEvent) => void;
  tool_use_content_block_start?: (event: ToolUseContentBlockStartEvent) => void;
  input_json_delta?: (event: InputJsonDeltaEvent) => void;
  tool_use_content_block_stop?: (event: ToolUseContentBlockStopEvent) => void;
  tool_call?: (event: ToolCallEvent) => void;
  tool_result?: (event: ToolResultEvent) => void;

  // Message Layer Events
  user_message?: (event: UserMessageEvent) => void;
  assistant_message?: (event: AssistantMessageEvent) => void;
  tool_call_message?: (event: ToolCallMessageEvent) => void;
  tool_result_message?: (event: ToolResultMessageEvent) => void;
  error_message?: (event: ErrorMessageEvent) => void;

  // Turn Layer Events
  turn_request?: (event: TurnRequestEvent) => void;
  turn_response?: (event: TurnResponseEvent) => void;
}

/**
 * React-style handler map for fluent event subscription
 *
 * Usage:
 * ```typescript
 * agent.react({
 *   onTextDelta: (event) => console.log(event.data.text),
 *   onAssistantMessage: (event) => setMessages(prev => [...prev, event.data]),
 *   onError: (event) => setError(event.data),
 * });
 * ```
 */
export interface ReactHandlerMap {
  // Stream Layer Events
  onMessageStart?: (event: MessageStartEvent) => void;
  onMessageDelta?: (event: MessageDeltaEvent) => void;
  onMessageStop?: (event: MessageStopEvent) => void;
  onTextContentBlockStart?: (event: TextContentBlockStartEvent) => void;
  onTextDelta?: (event: TextDeltaEvent) => void;
  onTextContentBlockStop?: (event: TextContentBlockStopEvent) => void;
  onToolUseContentBlockStart?: (event: ToolUseContentBlockStartEvent) => void;
  onInputJsonDelta?: (event: InputJsonDeltaEvent) => void;
  onToolUseContentBlockStop?: (event: ToolUseContentBlockStopEvent) => void;
  onToolCall?: (event: ToolCallEvent) => void;
  onToolResult?: (event: ToolResultEvent) => void;

  // Message Layer Events
  onUserMessage?: (event: UserMessageEvent) => void;
  onAssistantMessage?: (event: AssistantMessageEvent) => void;
  onToolCallMessage?: (event: ToolCallMessageEvent) => void;
  onToolResultMessage?: (event: ToolResultMessageEvent) => void;
  onError?: (event: ErrorMessageEvent) => void;

  // Turn Layer Events
  onTurnRequest?: (event: TurnRequestEvent) => void;
  onTurnResponse?: (event: TurnResponseEvent) => void;
}

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

  /**
   * Batch subscribe to multiple event types with type-safe handlers
   *
   * @example
   * ```typescript
   * const unsub = agent.on({
   *   text_delta: (event) => setStreaming(prev => prev + event.data.text),
   *   assistant_message: (event) => setMessages(prev => [...prev, event.data]),
   *   error_message: (event) => setError(event.data),
   * });
   *
   * // Cleanup
   * unsub();
   * ```
   */
  on(handlers: EventHandlerMap): Unsubscribe;

  // ===== Type-safe overloads for Stream Layer Events =====
  on(type: "message_start", handler: (event: MessageStartEvent) => void): Unsubscribe;
  on(type: "message_delta", handler: (event: MessageDeltaEvent) => void): Unsubscribe;
  on(type: "message_stop", handler: (event: MessageStopEvent) => void): Unsubscribe;
  on(
    type: "text_content_block_start",
    handler: (event: TextContentBlockStartEvent) => void
  ): Unsubscribe;
  on(type: "text_delta", handler: (event: TextDeltaEvent) => void): Unsubscribe;
  on(
    type: "text_content_block_stop",
    handler: (event: TextContentBlockStopEvent) => void
  ): Unsubscribe;
  on(
    type: "tool_use_content_block_start",
    handler: (event: ToolUseContentBlockStartEvent) => void
  ): Unsubscribe;
  on(type: "input_json_delta", handler: (event: InputJsonDeltaEvent) => void): Unsubscribe;
  on(
    type: "tool_use_content_block_stop",
    handler: (event: ToolUseContentBlockStopEvent) => void
  ): Unsubscribe;
  on(type: "tool_call", handler: (event: ToolCallEvent) => void): Unsubscribe;
  on(type: "tool_result", handler: (event: ToolResultEvent) => void): Unsubscribe;

  // ===== Type-safe overloads for Message Layer Events =====
  on(type: "user_message", handler: (event: UserMessageEvent) => void): Unsubscribe;
  on(type: "assistant_message", handler: (event: AssistantMessageEvent) => void): Unsubscribe;
  on(type: "tool_call_message", handler: (event: ToolCallMessageEvent) => void): Unsubscribe;
  on(type: "tool_result_message", handler: (event: ToolResultMessageEvent) => void): Unsubscribe;
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
   * React-style fluent event subscription
   *
   * @example
   * ```typescript
   * const unsub = agent.react({
   *   onTextDelta: (event) => setStreaming(prev => prev + event.data.text),
   *   onAssistantMessage: (event) => setMessages(prev => [...prev, event.data]),
   *   onError: (event) => setError(event.data),
   * });
   *
   * // Cleanup
   * unsub();
   * ```
   */
  react(handlers: ReactHandlerMap): Unsubscribe;

  /**
   * Subscribe to agent ready event
   *
   * Called when agent lifecycle becomes 'running'.
   * If already running, handler is called immediately.
   *
   * @returns Unsubscribe function
   */
  onReady(handler: () => void): Unsubscribe;

  /**
   * Subscribe to agent destroy event
   *
   * Called when agent lifecycle becomes 'destroyed'.
   *
   * @returns Unsubscribe function
   */
  onDestroy(handler: () => void): Unsubscribe;

  /**
   * Add middleware to intercept incoming messages (receive side)
   *
   * @example
   * ```typescript
   * agent.use(async (message, next) => {
   *   console.log('[Before]', message.content);
   *   await next(message);
   *   console.log('[After]');
   * });
   * ```
   *
   * @returns Unsubscribe function to remove the middleware
   */
  use(middleware: AgentMiddleware): Unsubscribe;

  /**
   * Add interceptor to intercept outgoing events (event side)
   *
   * @example
   * ```typescript
   * agent.intercept((event, next) => {
   *   console.log('Event:', event.type);
   *   next(event);
   * });
   * ```
   *
   * @returns Unsubscribe function to remove the interceptor
   */
  intercept(interceptor: AgentInterceptor): Unsubscribe;

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
