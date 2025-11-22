/**
 * RxJSEventBus Implementation
 *
 * RxJS-based implementation of the EventBus interface.
 * Implements producer-consumer pattern for event-driven communication.
 */

import { Subject, type Observable, type Subscription } from "rxjs";
import { filter } from "rxjs/operators";
import type {
  EventBus,
  EventProducer,
  EventConsumer,
  Unsubscribe,
} from "@deepractice-ai/agentx-engine";
import type { AgentEventType } from "@deepractice-ai/agentx-event";
import { createLogger } from "@deepractice-ai/agentx-logger";

const logger = createLogger("core/agent/RxJSEventBus");

/**
 * RxJS-based EventBus implementation
 */
export class RxJSEventBus implements EventBus {
  private events$ = new Subject<AgentEventType>();
  private closed = false;

  createProducer(): EventProducer {
    if (this.closed) {
      logger.error("Cannot create producer: bus is closed");
      throw new Error("[RxJSEventBus] Cannot create producer: bus is closed");
    }
    logger.debug("Producer created");
    return new RxJSEventProducer(this.events$, () => this.closed);
  }

  createConsumer(): EventConsumer {
    if (this.closed) {
      logger.error("Cannot create consumer: bus is closed");
      throw new Error("[RxJSEventBus] Cannot create consumer: bus is closed");
    }
    logger.debug("Consumer created");
    return new RxJSEventConsumer(this.events$.asObservable(), () => this.closed);
  }

  close(): void {
    if (!this.closed) {
      this.closed = true;
      this.events$.complete();

      // Log with stack trace to understand who is closing the bus
      const stack = new Error().stack;
      logger.warn("EventBus closed", {
        stack: stack?.split("\n").slice(1, 6).join("\n"), // First 5 frames
      });
    }
  }

  isClosed(): boolean {
    return this.closed;
  }
}

/**
 * RxJS-based EventProducer implementation
 */
class RxJSEventProducer implements EventProducer {
  constructor(
    private subject: Subject<AgentEventType>,
    private isBusClosed: () => boolean
  ) {}

  produce(event: AgentEventType): void {
    if (this.isBusClosed()) {
      logger.warn("Cannot produce event: bus is closed", { eventType: event.type });
      return;
    }
    this.subject.next(event);
  }

  isActive(): boolean {
    return !this.isBusClosed();
  }
}

/**
 * RxJS-based EventConsumer implementation
 */
class RxJSEventConsumer implements EventConsumer {
  private subscriptions: Subscription[] = [];

  constructor(
    private events$: Observable<AgentEventType>,
    private isBusClosed: () => boolean
  ) {}

  consume(handler: (event: AgentEventType) => void): Unsubscribe {
    const subscription = this.events$.subscribe({
      next: (event) => {
        try {
          handler(event);
        } catch (error) {
          logger.error("Handler error in consume", {
            eventType: event.type,
            error: error instanceof Error ? error.message : String(error),
          });
          // Don't rethrow - keep the event stream alive
        }
      },
      error: (error: Error) => {
        logger.error("Stream error in consume", { error: error.message });
      },
    });

    this.subscriptions.push(subscription);
    return () => {
      subscription.unsubscribe();
      this.subscriptions = this.subscriptions.filter((s) => s !== subscription);
    };
  }

  consumeByType<T extends AgentEventType>(
    type: T["type"],
    handler: (event: T) => void
  ): Unsubscribe {
    const subscription = this.events$
      .pipe(filter((event): event is T => event.type === type))
      .subscribe({
        next: (event) => {
          try {
            handler(event);
          } catch (error) {
            logger.error("Handler error in consumeByType", {
              eventType: event.type,
              error: error instanceof Error ? error.message : String(error),
            });
            // Don't rethrow - keep the event stream alive
          }
        },
        error: (error: Error) => {
          logger.error("Stream error in consumeByType", {
            eventType: type,
            error: error.message,
          });
        },
      });

    this.subscriptions.push(subscription);
    return () => {
      subscription.unsubscribe();
      this.subscriptions = this.subscriptions.filter((s) => s !== subscription);
    };
  }

  consumeByTypes<T extends AgentEventType["type"]>(
    types: T[],
    handler: (event: Extract<AgentEventType, { type: T }>) => void
  ): Unsubscribe {
    const typeSet = new Set(types);
    const subscription = this.events$
      .pipe(
        filter((event): event is Extract<AgentEventType, { type: T }> =>
          typeSet.has(event.type as T)
        )
      )
      .subscribe({
        next: (event) => {
          try {
            handler(event);
          } catch (error) {
            logger.error("Handler error in consumeByTypes", {
              eventType: event.type,
              error: error instanceof Error ? error.message : String(error),
            });
            // Don't rethrow - keep the event stream alive
          }
        },
        error: (error: Error) => {
          logger.error("Stream error in consumeByTypes", {
            types,
            error: error.message,
          });
        },
      });

    this.subscriptions.push(subscription);
    return () => {
      subscription.unsubscribe();
      this.subscriptions = this.subscriptions.filter((s) => s !== subscription);
    };
  }

  isActive(): boolean {
    return !this.isBusClosed();
  }
}
