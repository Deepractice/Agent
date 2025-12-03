/**
 * StreamReceptor - Enriches EnvironmentEvents with context
 *
 * Listens to EnvironmentEvents on SystemBus,
 * adds context (agentId, sessionId, containerId),
 * and re-emits them.
 *
 * Event types stay the same - just enriched with context.
 *
 * @see packages/types/src/ecosystem/Receptor.ts
 * @see issues/029-simplified-event-architecture.md
 */

import type {
  Receptor,
  SystemBus,
  Unsubscribe,
  EnvironmentEvent,
  EnvironmentEventType,
} from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("ecosystem/StreamReceptor");

/**
 * Context for enriching events
 */
export interface StreamReceptorContext {
  agentId: string;
  sessionId?: string;
  containerId?: string;
}

/**
 * EnvironmentEvent with context added
 */
export interface ContextualEvent extends EnvironmentEvent {
  agentId?: string;
  sessionId?: string;
  containerId?: string;
}

/**
 * StreamReceptor - Enriches EnvironmentEvents with context
 */
export class StreamReceptor implements Receptor {
  private readonly context: StreamReceptorContext;
  private unsubscribe: Unsubscribe | null = null;

  constructor(context: StreamReceptorContext) {
    this.context = context;
  }

  /**
   * Start listening to SystemBus and enriching events
   */
  start(bus: SystemBus): void {
    logger.debug("StreamReceptor started", { agentId: this.context.agentId });

    // Listen to all events and enrich EnvironmentEvents with context
    this.unsubscribe = bus.onAny((event) => {
      if (this.isEnvironmentEvent(event)) {
        const enrichedEvent: ContextualEvent = {
          ...event,
          agentId: this.context.agentId,
          sessionId: this.context.sessionId,
          containerId: this.context.containerId,
        };
        bus.emit(enrichedEvent);
      }
    });
  }

  /**
   * Stop listening and clean up
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    logger.debug("StreamReceptor stopped", { agentId: this.context.agentId });
  }

  /**
   * Check if event is an EnvironmentEvent (not already enriched)
   */
  private isEnvironmentEvent(event: { type: string }): event is EnvironmentEvent {
    const envTypes: EnvironmentEventType[] = [
      "text_chunk",
      "stream_start",
      "stream_end",
      "interrupted",
      "connected",
      "disconnected",
    ];

    // Only enrich if it's an EnvironmentEvent type AND doesn't have agentId yet
    return envTypes.includes(event.type as EnvironmentEventType) && !("agentId" in event);
  }
}
