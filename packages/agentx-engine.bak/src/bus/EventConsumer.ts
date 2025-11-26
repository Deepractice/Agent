/**
 * Event Consumer Interface
 *
 * Consumes events from the EventBus.
 * Any component (Agent, Provider, UI) can be a consumer.
 */

import type { AgentEventType } from "@deepractice-ai/agentx-event";

/**
 * Unsubscribe function returned by consume methods
 */
export type Unsubscribe = () => void;

export interface EventConsumer {
  /**
   * Consume all events from the bus
   *
   * @param handler - Callback to handle events
   * @returns Unsubscribe function
   */
  consume(handler: (event: AgentEventType) => void): Unsubscribe;

  /**
   * Consume events of a specific type
   *
   * @param type - Event type to filter
   * @param handler - Callback to handle typed events
   * @returns Unsubscribe function
   */
  consumeByType<T extends AgentEventType["type"]>(
    type: T,
    handler: (event: Extract<AgentEventType, { type: T }>) => void
  ): Unsubscribe;

  /**
   * Consume events of multiple types
   *
   * @param types - Array of event types to filter
   * @param handler - Callback to handle typed events
   * @returns Unsubscribe function
   */
  consumeByTypes<T extends AgentEventType["type"]>(
    types: T[],
    handler: (event: Extract<AgentEventType, { type: T }>) => void
  ): Unsubscribe;

  /**
   * Check if the consumer is still active
   */
  isActive(): boolean;
}
