/**
 * SystemBus - Central event bus for the ecosystem.
 *
 * All components communicate through the SystemBus:
 * - Environment emits EnvironmentEvents (text_chunk, stream_start, etc.)
 * - Agent emits AgentEvents (state changes, messages, etc.)
 * - Session, Container emit their respective events
 *
 * Features:
 * - Type-safe event subscription
 * - Custom filters
 * - Priority-based execution order
 * - One-time subscriptions
 *
 * @example
 * ```typescript
 * const bus = new SystemBusImpl();
 *
 * // Subscribe to specific event type
 * bus.on('text_chunk', (e) => {
 *   console.log('Received text:', e.data.text);
 * });
 *
 * // Subscribe with options
 * bus.on('text_delta', handler, {
 *   filter: (e) => e.agentId === 'agent-1',
 *   priority: 10,
 *   once: true
 * });
 *
 * // Subscribe to all events
 * bus.onAny((e) => {
 *   console.log('Event:', e.type);
 * });
 *
 * // Emit event
 * bus.emit({ type: 'text_chunk', data: { text: 'Hello' } });
 * ```
 */

import type { SystemEvent } from "~/event/base";
import type {
  CommandEventMap,
  CommandRequestType,
  ResponseEventFor,
  RequestDataFor,
} from "~/event/command";
import type { SystemBusProducer } from "./SystemBusProducer";
import type { SystemBusConsumer } from "./SystemBusConsumer";

/**
 * Unsubscribe function type.
 */
export type Unsubscribe = () => void;

/**
 * Event handler function type.
 */
export type BusEventHandler<E extends SystemEvent = SystemEvent> = (event: E) => void;

/**
 * Subscription options for advanced event handling.
 */
export interface SubscribeOptions<E extends SystemEvent = SystemEvent> {
  /**
   * Event filter - only events returning true will trigger the handler.
   * Useful for filtering by agentId, sessionId, etc.
   */
  filter?: (event: E) => boolean;

  /**
   * Priority - higher numbers execute first (default: 0).
   * Useful for ensuring certain handlers run before others.
   */
  priority?: number;

  /**
   * Whether to trigger only once then auto-unsubscribe.
   */
  once?: boolean;
}

/**
 * SystemBus interface - Central event bus for ecosystem communication.
 *
 * Extends both Producer and Consumer interfaces for internal use.
 * External components should use restricted views via asProducer/asConsumer.
 */
export interface SystemBus {
  /**
   * Emit an event to the bus.
   *
   * All subscribed handlers will receive this event.
   *
   * @param event - The event to emit
   */
  emit(event: SystemEvent): void;

  /**
   * Emit multiple events (batch operation).
   *
   * @param events - Array of events to emit
   */
  emitBatch(events: SystemEvent[]): void;

  /**
   * Subscribe to a specific event type.
   *
   * @param type - The event type to listen for
   * @param handler - Callback invoked when event is received
   * @param options - Subscription options (filter, priority, once)
   * @returns Unsubscribe function
   */
  on<T extends string>(
    type: T,
    handler: BusEventHandler<SystemEvent & { type: T }>,
    options?: SubscribeOptions<SystemEvent & { type: T }>
  ): Unsubscribe;

  /**
   * Subscribe to multiple event types.
   *
   * @param types - Array of event types to listen for
   * @param handler - Callback invoked when any matching event is received
   * @param options - Subscription options
   * @returns Unsubscribe function
   */
  on(types: string[], handler: BusEventHandler, options?: SubscribeOptions): Unsubscribe;

  /**
   * Subscribe to all events.
   *
   * @param handler - Callback invoked for every event
   * @param options - Subscription options
   * @returns Unsubscribe function
   */
  onAny(handler: BusEventHandler, options?: SubscribeOptions): Unsubscribe;

  /**
   * Subscribe to an event type once (auto-unsubscribes after first trigger).
   *
   * @param type - Event type to subscribe to
   * @param handler - Callback function
   * @returns Unsubscribe function
   */
  once<T extends string>(type: T, handler: BusEventHandler<SystemEvent & { type: T }>): Unsubscribe;

  /**
   * Subscribe to a CommandEvent with full type safety.
   *
   * @example
   * ```typescript
   * bus.onCommand("container_create_request", (event) => {
   *   event.data.requestId;    // ✓ string
   *   event.data.containerId;  // ✓ string
   * });
   * ```
   *
   * @param type - The command event type
   * @param handler - Callback with fully typed event
   * @returns Unsubscribe function
   */
  onCommand<T extends keyof CommandEventMap>(
    type: T,
    handler: (event: CommandEventMap[T]) => void
  ): Unsubscribe;

  /**
   * Emit a CommandEvent with full type safety.
   *
   * @example
   * ```typescript
   * bus.emitCommand("container_create_request", {
   *   requestId: "req_123",
   *   containerId: "my-container"
   * });
   * ```
   *
   * @param type - The command event type
   * @param data - Event data (type-checked)
   */
  emitCommand<T extends keyof CommandEventMap>(type: T, data: CommandEventMap[T]["data"]): void;

  /**
   * Send a command request and wait for response.
   *
   * Automatically generates requestId, emits request, waits for matching response.
   *
   * @example
   * ```typescript
   * const response = await bus.request("container_create_request", {
   *   containerId: "my-container"
   * });
   * // response is ContainerCreateResponse
   * console.log(response.data.containerId);
   * ```
   *
   * @param type - The request event type
   * @param data - Request data (without requestId)
   * @param timeout - Timeout in milliseconds (default: 30000)
   * @returns Promise of response event
   */
  request<T extends CommandRequestType>(
    type: T,
    data: RequestDataFor<T>,
    timeout?: number
  ): Promise<ResponseEventFor<T>>;

  /**
   * Get a read-only consumer view of the bus.
   *
   * Use this to safely expose event subscription to external code
   * without allowing them to emit events.
   *
   * @example
   * ```typescript
   * class BusDriver {
   *   constructor(consumer: SystemBusConsumer) {
   *     // Can only subscribe, cannot emit
   *     consumer.on('text_delta', ...);
   *   }
   * }
   * ```
   *
   * @returns SystemBusConsumer - Read-only view
   */
  asConsumer(): SystemBusConsumer;

  /**
   * Get a write-only producer view of the bus.
   *
   * Use this to give components the ability to emit events
   * without exposing subscription capabilities.
   *
   * @example
   * ```typescript
   * class ClaudeReceptor {
   *   constructor(producer: SystemBusProducer) {
   *     // Can only emit, cannot subscribe
   *     producer.emit({ type: 'text_delta', ... });
   *   }
   * }
   * ```
   *
   * @returns SystemBusProducer - Write-only view
   */
  asProducer(): SystemBusProducer;

  /**
   * Destroy the bus and clean up resources.
   *
   * All subscriptions will be terminated.
   * After calling destroy():
   * - All subscriptions are removed
   * - New emissions are ignored
   * - New subscriptions are no-ops
   */
  destroy(): void;
}
