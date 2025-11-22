/**
 * Event Bus Interface
 *
 * Message broker that connects producers and consumers.
 * Implements producer-consumer pattern for single-agent scenarios.
 * Can be extended to publish-subscribe for multi-agent scenarios.
 */

import type { EventProducer } from "./EventProducer";
import type { EventConsumer } from "./EventConsumer";

export interface EventBus {
  /**
   * Create a producer to send events to the bus
   *
   * @returns EventProducer instance
   */
  createProducer(): EventProducer;

  /**
   * Create a consumer to receive events from the bus
   *
   * @returns EventConsumer instance
   */
  createConsumer(): EventConsumer;

  /**
   * Close the event bus
   * - Completes all active streams
   * - Prevents new producers/consumers from being created
   * - Existing producers/consumers become inactive
   */
  close(): void;

  /**
   * Check if the bus is closed
   */
  isClosed(): boolean;
}
