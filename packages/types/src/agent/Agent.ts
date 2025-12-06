/**
 * AgentEngine - Event Processing Unit
 *
 * AgentEngine is a logical processing unit that coordinates:
 * - Driver: Event producer (LLM interaction)
 * - MealyMachine: Event assembler (pure Mealy Machine)
 * - Presenter: Event consumer (side effects)
 *
 * ```text
 * Driver (event producer)
 *     ↓ Stream Events
 *   AgentEngine (logical processor)
 *     - MealyMachine: event assembly
 *     - State: state management
 *     ↓ Processed Events
 * Presenter (event consumer)
 * ```
 *
 * AgentEngine is independent of Runtime system (Container, Session, Bus).
 * It can be tested in isolation with mock Driver and Presenter.
 *
 * Note: This is distinct from runtime/Agent which is the complete runtime entity
 * with LLM, Sandbox, Session, and lifecycle management (stop/resume).
 *
 * API:
 * - receive(message): Send message to agent
 * - on(handler): Subscribe to events
 * - interrupt(): User-initiated stop
 * - destroy(): Clean up resources
 */

import type { UserMessage } from "./message";
import type { AgentState } from "./AgentState";
import type { AgentEventHandler, Unsubscribe } from "./internal/AgentEventHandler";
import type { AgentMiddleware } from "./internal/AgentMiddleware";
import type { AgentInterceptor } from "./internal/AgentInterceptor";
import type { AgentOutput } from "./AgentOutput";
import type { MessageQueue } from "./MessageQueue";

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
 * Generic handler map - concrete event types are defined in runtime/event.
 * AgentEngine package is independent of specific event type definitions.
 *
 * Usage:
 * ```typescript
 * engine.on({
 *   text_delta: (event) => console.log(event.data.text),
 *   assistant_message: (event) => setMessages(prev => [...prev, event.data]),
 * });
 * ```
 */
export type EventHandlerMap = Record<string, ((event: AgentOutput) => void) | undefined>;

/**
 * React-style handler map for fluent event subscription
 *
 * Generic handler map - concrete event types are defined in runtime/event.
 * AgentEngine package is independent of specific event type definitions.
 *
 * Usage:
 * ```typescript
 * engine.react({
 *   onTextDelta: (event) => console.log(event.data.text),
 *   onAssistantMessage: (event) => setMessages(prev => [...prev, event.data]),
 * });
 * ```
 */
export type ReactHandlerMap = Record<string, ((event: AgentOutput) => void) | undefined>;

/**
 * AgentEngine interface - Event Processing Unit
 *
 * Core responsibilities:
 * - State management (AgentState)
 * - Event subscription and distribution
 * - Middleware/Interceptor chain
 */
export interface AgentEngine {
  /**
   * Unique agent instance ID
   */
  readonly agentId: string;

  /**
   * Creation timestamp
   */
  readonly createdAt: number;

  /**
   * Current conversation state
   */
  readonly state: AgentState;

  /**
   * Message queue for pending messages
   */
  readonly messageQueue: MessageQueue;

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
   * Batch subscribe to multiple event types
   */
  on(handlers: EventHandlerMap): Unsubscribe;

  /**
   * Subscribe to specific event type by name
   */
  on(type: string, handler: AgentEventHandler): Unsubscribe;

  /**
   * Subscribe to multiple event types by name
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
   */
  react(handlers: ReactHandlerMap): Unsubscribe;

  /**
   * Subscribe to agent ready event
   *
   * Called when agent is ready to receive messages.
   * If already ready, handler is called immediately.
   */
  onReady(handler: () => void): Unsubscribe;

  /**
   * Subscribe to agent destroy event
   *
   * Called when agent is destroyed.
   */
  onDestroy(handler: () => void): Unsubscribe;

  /**
   * Add middleware to intercept incoming messages (receive side)
   */
  use(middleware: AgentMiddleware): Unsubscribe;

  /**
   * Add interceptor to intercept outgoing events (event side)
   */
  intercept(interceptor: AgentInterceptor): Unsubscribe;

  /**
   * Interrupt - User-initiated stop
   *
   * Stops the current operation gracefully.
   * The agent will return to idle state.
   */
  interrupt(): void;

  /**
   * Destroy - Clean up resources
   */
  destroy(): Promise<void>;
}
