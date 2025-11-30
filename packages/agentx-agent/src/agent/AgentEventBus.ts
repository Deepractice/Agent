/**
 * AgentEventBus - RxJS-based implementation
 *
 * Implements the AgentEventBus interface from @deepractice-ai/agentx-types.
 *
 * Features:
 * - Type-safe event subscription
 * - Custom filters
 * - Priority-based execution order
 * - One-time subscriptions
 * - Producer/Consumer role separation
 */

import { Subject } from "rxjs";
import { filter as rxFilter, take } from "rxjs/operators";
import type {
  AgentEventBus as IAgentEventBus,
  EventProducer,
  EventConsumer,
  EventHandler,
  SubscribeOptions,
  Unsubscribe,
  AgentOutput,
} from "@deepractice-ai/agentx-types";
import { createLogger } from "@deepractice-ai/agentx-logger";

const logger = createLogger("core/AgentEventBus");

/**
 * Internal subscription record (supports priority sorting)
 */
interface SubscriptionRecord {
  id: number;
  priority: number;
  handler: EventHandler;
  unsubscribe: Unsubscribe;
}

/**
 * AgentEventBus - Local in-process implementation
 *
 * Uses RxJS Subject internally for powerful event processing.
 * Provides clean separation between Producer and Consumer roles.
 *
 * @example
 * ```typescript
 * const eventBus = new AgentEventBus();
 *
 * // Subscribe to events
 * eventBus.on('text_delta', (e) => console.log(e.data.text));
 *
 * // With filter and priority
 * eventBus.on('tool_call', handler, {
 *   filter: (e) => e.data.name === 'Bash',
 *   priority: 10
 * });
 *
 * // Emit events
 * eventBus.emit({ type: 'text_delta', ... });
 *
 * // Get restricted views
 * const producer = eventBus.asProducer(); // can only emit
 * const consumer = eventBus.asConsumer(); // can only subscribe
 * ```
 */
export class AgentEventBus implements IAgentEventBus {
  private readonly subject = new Subject<AgentOutput>();
  private readonly typeSubscriptions = new Map<string, SubscriptionRecord[]>();
  private readonly globalSubscriptions: SubscriptionRecord[] = [];
  private nextId = 0;
  private isDestroyed = false;

  // Cached views
  private producerView: EventProducer | null = null;
  private consumerView: EventConsumer | null = null;

  // ===== Producer Methods =====

  emit(event: AgentOutput): void {
    if (this.isDestroyed) {
      logger.warn("Emit called on destroyed EventBus", { eventType: event.type });
      return;
    }

    this.subject.next(event);
  }

  emitBatch(events: AgentOutput[]): void {
    for (const event of events) {
      this.emit(event);
    }
  }

  // ===== Consumer Methods =====

  on<K extends AgentOutput["type"]>(
    type: K,
    handler: EventHandler<Extract<AgentOutput, { type: K }>>,
    options?: SubscribeOptions
  ): Unsubscribe;
  on(type: string, handler: EventHandler, options?: SubscribeOptions): Unsubscribe;
  on(types: string[], handler: EventHandler, options?: SubscribeOptions): Unsubscribe;
  on(
    typeOrTypes: string | string[],
    handler: EventHandler,
    options: SubscribeOptions = {}
  ): Unsubscribe {
    if (this.isDestroyed) {
      logger.warn("Subscribe called on destroyed EventBus");
      return () => {};
    }

    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
    const unsubscribes: Unsubscribe[] = [];

    for (const type of types) {
      const unsub = this.subscribeToType(type, handler, options);
      unsubscribes.push(unsub);
    }

    return () => unsubscribes.forEach((u) => u());
  }

  onAny(handler: EventHandler, options: SubscribeOptions = {}): Unsubscribe {
    if (this.isDestroyed) {
      logger.warn("Subscribe called on destroyed EventBus");
      return () => {};
    }

    return this.subscribeGlobal(handler, options);
  }

  once<K extends AgentOutput["type"]>(
    type: K,
    handler: EventHandler<Extract<AgentOutput, { type: K }>>
  ): Unsubscribe {
    return this.on(type, handler, { once: true });
  }

  // ===== View Methods =====

  asConsumer(): EventConsumer {
    if (!this.consumerView) {
      this.consumerView = {
        on: this.on.bind(this),
        onAny: this.onAny.bind(this),
        once: this.once.bind(this),
      };
    }
    return this.consumerView;
  }

  asProducer(): EventProducer {
    if (!this.producerView) {
      this.producerView = {
        emit: this.emit.bind(this),
        emitBatch: this.emitBatch.bind(this),
      };
    }
    return this.producerView;
  }

  // ===== Lifecycle =====

  destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    // Clean up all type subscriptions
    for (const records of this.typeSubscriptions.values()) {
      for (const record of records) {
        record.unsubscribe();
      }
    }
    this.typeSubscriptions.clear();

    // Clean up global subscriptions
    for (const record of this.globalSubscriptions) {
      record.unsubscribe();
    }
    this.globalSubscriptions.length = 0;

    // Complete the subject
    this.subject.complete();

    logger.debug("EventBus destroyed");
  }

  // ===== Private Methods =====

  private subscribeToType(
    type: string,
    handler: EventHandler,
    options: SubscribeOptions
  ): Unsubscribe {
    const { filter, priority = 0, once = false } = options;
    const id = this.nextId++;

    // Build RxJS pipeline
    let observable = this.subject.pipe(rxFilter((e: AgentOutput) => e.type === type));

    if (filter) {
      observable = observable.pipe(rxFilter(filter));
    }

    if (once) {
      observable = observable.pipe(take(1));
    }

    // Create subscription with priority-aware handler
    const subscription = observable.subscribe({
      next: (event: AgentOutput) => {
        this.executeWithPriority(type, event, handler, id);
      },
    });

    const unsubscribe = () => {
      subscription.unsubscribe();
      const records = this.typeSubscriptions.get(type);
      if (records) {
        const idx = records.findIndex((r) => r.id === id);
        if (idx !== -1) records.splice(idx, 1);
      }
    };

    // Store subscription record
    if (!this.typeSubscriptions.has(type)) {
      this.typeSubscriptions.set(type, []);
    }

    const record: SubscriptionRecord = { id, priority, handler, unsubscribe };
    const records = this.typeSubscriptions.get(type)!;
    records.push(record);

    // Sort by priority (higher first)
    records.sort((a, b) => b.priority - a.priority);

    return unsubscribe;
  }

  private subscribeGlobal(handler: EventHandler, options: SubscribeOptions): Unsubscribe {
    const { filter, priority = 0, once = false } = options;
    const id = this.nextId++;

    let observable = this.subject.asObservable();

    if (filter) {
      observable = observable.pipe(rxFilter(filter));
    }

    if (once) {
      observable = observable.pipe(take(1));
    }

    const subscription = observable.subscribe({
      next: (event: AgentOutput) => {
        this.executeGlobalWithPriority(event, handler, id);
      },
    });

    const unsubscribe = () => {
      subscription.unsubscribe();
      const idx = this.globalSubscriptions.findIndex((r) => r.id === id);
      if (idx !== -1) this.globalSubscriptions.splice(idx, 1);
    };

    const record: SubscriptionRecord = { id, priority, handler, unsubscribe };
    this.globalSubscriptions.push(record);
    this.globalSubscriptions.sort((a, b) => b.priority - a.priority);

    return unsubscribe;
  }

  /**
   * Execute handler respecting priority order for typed subscriptions
   */
  private executeWithPriority(
    type: string,
    event: AgentOutput,
    handler: EventHandler,
    handlerId: number
  ): void {
    const records = this.typeSubscriptions.get(type) || [];
    const record = records.find((r) => r.id === handlerId);

    if (record) {
      try {
        handler(event);
      } catch (error) {
        logger.error("Event handler error", { eventType: type, error });
      }
    }
  }

  /**
   * Execute handler respecting priority order for global subscriptions
   */
  private executeGlobalWithPriority(
    event: AgentOutput,
    handler: EventHandler,
    handlerId: number
  ): void {
    const record = this.globalSubscriptions.find((r) => r.id === handlerId);

    if (record) {
      try {
        handler(event);
      } catch (error) {
        logger.error("Global event handler error", { eventType: event.type, error });
      }
    }
  }
}
