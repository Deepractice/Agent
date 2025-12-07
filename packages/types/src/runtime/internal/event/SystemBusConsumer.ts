/**
 * SystemBusConsumer - Read-only view of SystemBus
 *
 * Used by components that consume events:
 * - BusDriver (subscribes to DriveableEvents)
 * - UI components (subscribes to display events)
 * - Presenters (subscribes to forward events)
 *
 * Consumer can only subscribe to events, cannot emit.
 * This prevents accidental event emission and clarifies data flow.
 *
 * @example
 * ```typescript
 * class BusDriver {
 *   constructor(private consumer: SystemBusConsumer) {}
 *
 *   async *receive(message: UserMessage) {
 *     // Can only subscribe, cannot emit
 *     this.consumer.on('message_start', (event) => {
 *       console.log('Received:', event.type);
 *     });
 *   }
 * }
 * ```
 */

import type { SystemEvent } from "~/event/base";
import type {
  CommandEventMap,
  CommandRequestType,
  ResponseEventFor,
  RequestDataFor,
} from "~/event/command";

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * Event handler function type
 */
export type BusEventHandler<E extends SystemEvent = SystemEvent> = (event: E) => void;

/**
 * Subscription options for advanced event handling
 */
export interface SubscribeOptions<E extends SystemEvent = SystemEvent> {
  /**
   * Event filter - only events returning true will trigger the handler
   * Useful for filtering by agentId, sessionId, etc.
   */
  filter?: (event: E) => boolean;

  /**
   * Priority - higher numbers execute first (default: 0)
   * Useful for ensuring certain handlers run before others
   */
  priority?: number;

  /**
   * Whether to trigger only once then auto-unsubscribe
   */
  once?: boolean;
}

/**
 * SystemBusConsumer interface - Read-only view
 *
 * Components receiving this interface can only subscribe to events,
 * preventing them from emitting events.
 */
export interface SystemBusConsumer {
  /**
   * Subscribe to a specific event type
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
   * Subscribe to multiple event types
   *
   * @param types - Array of event types to listen for
   * @param handler - Callback invoked when any matching event is received
   * @param options - Subscription options
   * @returns Unsubscribe function
   */
  on(types: string[], handler: BusEventHandler, options?: SubscribeOptions): Unsubscribe;

  /**
   * Subscribe to all events
   *
   * @param handler - Callback invoked for every event
   * @param options - Subscription options
   * @returns Unsubscribe function
   */
  onAny(handler: BusEventHandler, options?: SubscribeOptions): Unsubscribe;

  /**
   * Subscribe to an event type once (auto-unsubscribes after first trigger)
   *
   * @param type - Event type to subscribe to
   * @param handler - Callback function
   * @returns Unsubscribe function
   */
  once<T extends string>(type: T, handler: BusEventHandler<SystemEvent & { type: T }>): Unsubscribe;

  /**
   * Subscribe to a CommandEvent with full type safety
   *
   * @example
   * ```typescript
   * consumer.onCommand("container_create_request", (event) => {
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
   * Send a command request and wait for response
   *
   * Automatically generates requestId, emits request, waits for matching response.
   *
   * @example
   * ```typescript
   * const response = await consumer.request("container_create_request", {
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
}
