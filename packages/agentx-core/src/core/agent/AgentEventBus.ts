/**
 * AgentEventBus Implementation
 *
 * RxJS-based implementation of the EventBus interface.
 * Implements producer-consumer pattern for event-driven communication.
 */

import { Subject, type Observable, type Subscription } from "rxjs";
import { filter } from "rxjs/operators";
import type { EventBus, EventProducer, EventConsumer, Unsubscribe, AgentEventType } from "@deepractice-ai/agentx-event";

/**
 * RxJS-based EventBus implementation
 */
export class AgentEventBus implements EventBus {
  private events$ = new Subject<AgentEventType>();
  private closed = false;

  createProducer(): EventProducer {
    if (this.closed) {
      throw new Error("[AgentEventBus] Cannot create producer: bus is closed");
    }
    return new RxJSEventProducer(this.events$, () => this.closed);
  }

  createConsumer(): EventConsumer {
    if (this.closed) {
      throw new Error("[AgentEventBus] Cannot create consumer: bus is closed");
    }
    return new RxJSEventConsumer(this.events$.asObservable(), () => this.closed);
  }

  close(): void {
    if (!this.closed) {
      this.closed = true;
      this.events$.complete();
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
      console.warn("[EventProducer] Cannot produce event: bus is closed", event.type);
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
          console.error("[EventConsumer] Handler error:", error, "for event:", event.type);
          // Don't rethrow - keep the event stream alive
        }
      },
      error: (error: Error) => console.error("[EventConsumer] Stream error:", error),
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
            console.error("[EventConsumer] Handler error:", error, "for event:", event.type);
            // Don't rethrow - keep the event stream alive
          }
        },
        error: (error: Error) => console.error("[EventConsumer] Stream error:", error),
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
            console.error("[EventConsumer] Handler error:", error, "for event:", event.type);
            // Don't rethrow - keep the event stream alive
          }
        },
        error: (error: Error) => console.error("[EventConsumer] Stream error:", error),
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
