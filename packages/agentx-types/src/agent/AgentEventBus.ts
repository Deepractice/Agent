/**
 * AgentEventBus - Event bus interface for AgentX
 *
 * Provides a pub/sub mechanism for agent events with:
 * - Type-safe event subscription
 * - Custom filters
 * - Priority-based execution order
 * - One-time subscriptions
 *
 * Separates Producer and Consumer roles for better encapsulation:
 * - Producer: Driver, Engine (emit events)
 * - Consumer: UI, Presenter (subscribe to events)
 */

import type { AgentOutput } from "~/agent/AgentOutput";

// ===== Basic Types =====

/**
 * Event handler function type
 */
export type EventHandler<T = AgentOutput> = (event: T) => void;

/**
 * Unsubscribe function returned by subscription methods
 */
export type Unsubscribe = () => void;

/**
 * Subscription options
 */
export interface SubscribeOptions<T = AgentOutput> {
  /**
   * Event filter - only events returning true will trigger the handler
   */
  filter?: (event: T) => boolean;

  /**
   * Priority - higher numbers execute first (default: 0)
   */
  priority?: number;

  /**
   * Whether to trigger only once then auto-unsubscribe
   */
  once?: boolean;
}

// ===== Producer Interface =====

/**
 * EventProducer - Write-only view of the event bus
 *
 * Used by components that produce events:
 * - AgentDriver (StreamEvents)
 * - AgentEngine (StateEvents, MessageEvents)
 */
export interface EventProducer {
  /**
   * Emit a single event to all subscribers
   */
  emit(event: AgentOutput): void;

  /**
   * Emit multiple events (batch operation)
   */
  emitBatch(events: AgentOutput[]): void;
}

// ===== Consumer Interface =====

/**
 * EventConsumer - Read-only view of the event bus
 *
 * Used by components that consume events:
 * - UI components
 * - Presenters
 * - External integrations
 */
export interface EventConsumer {
  /**
   * Subscribe to a specific event type
   *
   * @param type - Event type to subscribe to
   * @param handler - Callback function
   * @param options - Subscription options (filter, priority, once)
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsub = consumer.on('text_delta', (e) => {
   *   console.log(e.data.text);
   * });
   * ```
   */
  on<K extends AgentOutput["type"]>(
    type: K,
    handler: EventHandler<Extract<AgentOutput, { type: K }>>,
    options?: SubscribeOptions
  ): Unsubscribe;

  /**
   * Subscribe to a dynamic event type (less type-safe)
   *
   * @param type - Event type string
   * @param handler - Callback function
   * @param options - Subscription options
   * @returns Unsubscribe function
   */
  on(type: string, handler: EventHandler, options?: SubscribeOptions): Unsubscribe;

  /**
   * Subscribe to multiple event types
   *
   * @param types - Array of event types
   * @param handler - Callback function
   * @param options - Subscription options
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * consumer.on(['text_delta', 'tool_call'], (e) => {
   *   console.log('Event:', e.type);
   * });
   * ```
   */
  on(types: string[], handler: EventHandler, options?: SubscribeOptions): Unsubscribe;

  /**
   * Subscribe to all events
   *
   * @param handler - Callback function receiving all events
   * @param options - Subscription options
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * consumer.onAny((e) => {
   *   logger.debug('Event:', e.type);
   * });
   * ```
   */
  onAny(handler: EventHandler, options?: SubscribeOptions): Unsubscribe;

  /**
   * Subscribe to an event type once (auto-unsubscribes after first trigger)
   *
   * @param type - Event type to subscribe to
   * @param handler - Callback function
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * consumer.once('message_stop', () => {
   *   console.log('First message completed!');
   * });
   * ```
   */
  once<K extends AgentOutput["type"]>(
    type: K,
    handler: EventHandler<Extract<AgentOutput, { type: K }>>
  ): Unsubscribe;
}

// ===== Full EventBus Interface =====

/**
 * AgentEventBus - Full event bus interface
 *
 * Combines Producer and Consumer capabilities.
 * Typically only used internally by AgentInstance.
 *
 * External components should use the restricted views:
 * - `asProducer()` for event emitters
 * - `asConsumer()` for event subscribers
 */
export interface AgentEventBus extends EventProducer, EventConsumer {
  /**
   * Get a read-only consumer view
   *
   * Use this to safely expose event subscription to external code
   * without allowing them to emit events.
   */
  asConsumer(): EventConsumer;

  /**
   * Get a write-only producer view
   *
   * Use this to give drivers/engines the ability to emit events
   * without exposing subscription capabilities.
   */
  asProducer(): EventProducer;

  /**
   * Destroy the event bus and clean up all subscriptions
   *
   * After calling destroy():
   * - All subscriptions are removed
   * - New emissions are ignored
   * - New subscriptions are no-ops
   */
  destroy(): void;
}
