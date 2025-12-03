/**
 * SystemBusImpl - Central event bus implementation
 *
 * Pub/Sub event bus for ecosystem communication.
 * All components (Environment, Receptors, etc.) communicate through this bus.
 *
 * @see packages/types/src/ecosystem/SystemBus.ts
 */

import type { SystemBus, BusEvent, BusEventHandler, Unsubscribe } from "@agentxjs/types";
import { Subject, filter } from "rxjs";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("ecosystem/SystemBusImpl");

/**
 * SystemBus implementation using RxJS Subject
 */
export class SystemBusImpl implements SystemBus {
  private readonly subject = new Subject<BusEvent>();
  private isDestroyed = false;

  constructor() {
    logger.debug("SystemBus created");
  }

  /**
   * Emit an event to the bus
   */
  emit(event: BusEvent): void {
    if (this.isDestroyed) {
      logger.warn("Attempted to emit on destroyed bus", { type: event.type });
      return;
    }

    logger.debug("Event emitted", { type: event.type });
    this.subject.next(event);
  }

  /**
   * Subscribe to a specific event type
   */
  on<T extends string>(
    type: T,
    handler: BusEventHandler<BusEvent & { type: T }>
  ): Unsubscribe {
    const subscription = this.subject
      .pipe(filter((event): event is BusEvent & { type: T } => event.type === type))
      .subscribe(handler);

    return () => subscription.unsubscribe();
  }

  /**
   * Subscribe to all events
   */
  onAny(handler: BusEventHandler): Unsubscribe {
    const subscription = this.subject.subscribe(handler);
    return () => subscription.unsubscribe();
  }

  /**
   * Destroy the bus and clean up resources
   */
  destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;
    this.subject.complete();
    logger.debug("SystemBus destroyed");
  }
}
