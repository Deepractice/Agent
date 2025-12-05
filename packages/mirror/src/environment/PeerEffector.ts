/**
 * PeerEffector - Subscribes from SystemBus, sends to Peer
 *
 * Part of PeerEnvironment (browser-side Environment implementation).
 *
 * Responsibilities:
 * - Subscribe to all SystemBus events
 * - Broadcast events to downstream connections (when acting as relay)
 * - Forward events from downstream to upstream (transparent relay)
 * - Emit connection state events for downstream connections
 *
 * ```
 *     SystemBus
 *        │
 *        │ bus.onAny
 *        ▼
 *   ┌─────────────┐
 *   │ PeerEffector│
 *   └──────┬──────┘
 *          │ peer.broadcast (downstream)
 *          │ peer.sendUpstream
 *          ▼
 *   Downstream/Upstream
 * ```
 */

import type { Peer, Effector, SystemBus, PeerUnsubscribe, DownstreamConnection } from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("mirror/PeerEffector");

/**
 * PeerEffector - Subscribes from SystemBus, sends to Peer
 */
export class PeerEffector implements Effector {
  private readonly peer: Peer;
  private unsubscribes: PeerUnsubscribe[] = [];
  private busUnsubscribe: (() => void) | null = null;

  constructor(peer: Peer) {
    this.peer = peer;
    logger.debug("PeerEffector created");
  }

  /**
   * Subscribe effector to SystemBus
   *
   * Starts forwarding bus events to peer connections.
   */
  subscribe(bus: SystemBus): void {
    logger.debug("PeerEffector subscribing to SystemBus");

    // Broadcast all bus events to downstream (if listening)
    this.busUnsubscribe = bus.onAny((event) => {
      if (this.peer.downstreamState === "listening") {
        logger.debug("Broadcasting to downstream", { type: event.type });
        this.peer.broadcast(event as any);
      }
    });

    // Handle downstream connections
    const unsubConn = this.peer.onDownstreamConnection((connection) => {
      this.setupDownstreamConnection(connection, bus);
    });
    this.unsubscribes.push(unsubConn);

    // Emit downstream server state changes
    const unsubState = this.peer.onDownstreamStateChange((state) => {
      logger.debug("Downstream state changed", { state });

      bus.emit({
        type: "connection_state",
        timestamp: Date.now(),
        source: "environment",
        category: "connection",
        intent: "notification",
        data: {
          direction: "downstream",
          state,
        },
      });
    });
    this.unsubscribes.push(unsubState);

    logger.info("PeerEffector subscribed to SystemBus");
  }

  /**
   * Setup handlers for a downstream connection
   */
  private setupDownstreamConnection(connection: DownstreamConnection, bus: SystemBus): void {
    logger.debug("Setting up downstream connection", { connectionId: connection.id });

    // Forward events from downstream to upstream (transparent relay)
    const unsubEvent = connection.onEvent((event) => {
      if (this.peer.upstreamState === "connected") {
        logger.debug("Forwarding to upstream", { type: event.type, connectionId: connection.id });
        this.peer.sendUpstream(event);
      }
    });

    // Emit connection state events
    const unsubState = connection.onStateChange((state) => {
      bus.emit({
        type: "downstream_connection_state",
        timestamp: Date.now(),
        source: "environment",
        category: "connection",
        intent: "notification",
        data: {
          connectionId: connection.id,
          state,
        },
      });
    });

    // Clean up when connection closes
    const cleanup = connection.onStateChange((state) => {
      if (state === "disconnected") {
        unsubEvent();
        unsubState();
        cleanup();
      }
    });
  }

  /**
   * Disconnect effector from bus
   */
  dispose(): void {
    if (this.busUnsubscribe) {
      this.busUnsubscribe();
      this.busUnsubscribe = null;
    }

    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];

    logger.debug("PeerEffector disposed");
  }
}
