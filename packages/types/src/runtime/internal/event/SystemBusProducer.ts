/**
 * SystemBusProducer - Write-only view of SystemBus
 *
 * Used by components that produce events:
 * - Effector (emits DriveableEvents from Claude API)
 * - Receptor (emits stream events)
 * - Agent (emits state/message events)
 *
 * Producer can only emit events, cannot subscribe.
 * This prevents accidental event loops and clarifies data flow.
 *
 * @example
 * ```typescript
 * class Effector {
 *   constructor(private producer: SystemBusProducer) {}
 *
 *   async sendMessage(message: UserMessage) {
 *     // Can only emit, cannot subscribe
 *     this.producer.emit({
 *       type: "message_start",
 *       source: "environment",
 *       category: "stream",
 *       ...
 *     });
 *   }
 * }
 * ```
 */

import type { SystemEvent } from "~/event/base";
import type { CommandEventMap } from "~/event/command";

/**
 * SystemBusProducer interface - Write-only view
 *
 * Components receiving this interface can only emit events,
 * preventing them from creating event loops by subscribing.
 */
export interface SystemBusProducer {
  /**
   * Emit a single event to the bus
   *
   * @param event - The event to emit
   */
  emit(event: SystemEvent): void;

  /**
   * Emit multiple events (batch operation)
   *
   * @param events - Array of events to emit
   */
  emitBatch(events: SystemEvent[]): void;

  /**
   * Emit a typed command event
   *
   * @param type - The command event type
   * @param data - Event data (type-checked)
   */
  emitCommand<T extends keyof CommandEventMap>(type: T, data: CommandEventMap[T]["data"]): void;
}
