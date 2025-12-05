/**
 * PeerReceptor - Perceives events from Peer upstream, emits to SystemBus
 *
 * Part of PeerEnvironment (browser-side Environment implementation).
 *
 * Responsibilities:
 * - Listen to upstream events from Peer
 * - Forward all events to SystemBus (transparent relay)
 * - Emit connection state events (connected, disconnected, reconnecting)
 *
 * ```
 *   Upstream (Server)
 *        │
 *        ▼ peer.onUpstreamEvent
 *   ┌─────────────┐
 *   │ PeerReceptor│
 *   └──────┬──────┘
 *          │ bus.emit
 *          ▼
 *     SystemBus
 * ```
 */

import type { Peer, Receptor, SystemBus, PeerUnsubscribe } from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("mirror/PeerReceptor");

/**
 * PeerReceptor - Receives from Peer upstream, emits to SystemBus
 */
export class PeerReceptor implements Receptor {
  private readonly peer: Peer;
  private unsubscribes: PeerUnsubscribe[] = [];

  constructor(peer: Peer) {
    this.peer = peer;
    logger.debug("PeerReceptor created");
  }

  /**
   * Connect receptor to SystemBus
   *
   * Starts forwarding upstream events to the bus.
   */
  emit(bus: SystemBus): void {
    logger.debug("PeerReceptor connecting to SystemBus");

    // Forward all upstream events to bus (transparent relay)
    const unsubEvent = this.peer.onUpstreamEvent((event) => {
      logger.debug("Upstream event received", { type: event.type });
      bus.emit(event as { type: string });
    });
    this.unsubscribes.push(unsubEvent);

    // Emit connection state events
    const unsubState = this.peer.onUpstreamStateChange((state) => {
      logger.debug("Upstream state changed", { state });

      // Map peer state to connection event
      const eventType = this.mapStateToEventType(state);
      if (eventType) {
        bus.emit({
          type: eventType,
          timestamp: Date.now(),
          source: "environment",
          category: "connection",
          intent: "notification",
          data: {
            direction: "upstream",
            state,
          },
        });
      }
    });
    this.unsubscribes.push(unsubState);

    logger.info("PeerReceptor connected to SystemBus");
  }

  /**
   * Map peer state to connection event type
   */
  private mapStateToEventType(state: string): string | null {
    switch (state) {
      case "connected":
        return "connected";
      case "disconnected":
        return "disconnected";
      case "reconnecting":
        return "reconnecting";
      default:
        return null;
    }
  }

  /**
   * Disconnect receptor from bus
   */
  dispose(): void {
    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];
    logger.debug("PeerReceptor disposed");
  }
}
